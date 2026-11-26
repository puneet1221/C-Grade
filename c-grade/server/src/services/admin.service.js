import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { Comment } from '../models/Comment.js';
import { DiaryItem } from '../models/DiaryItem.js';
import { Movie } from '../models/Movie.js';
import { MovieList } from '../models/MovieList.js';
import { PendingRegistration } from '../models/PendingRegistration.js';
import { Review } from '../models/Review.js';
import { User } from '../models/User.js';
import { buildSuspensionDate } from '../utils/accountStatus.js';
import { AppError } from '../utils/AppError.js';
import { sanitizeUser } from './auth.service.js';
import { recalculateMovieRatings } from './review.service.js';

const SALT_ROUNDS = 12;

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Returns platform KPIs for the Admin console.
 */
export async function getAdminStats() {
  const [totalUsers, totalMovies, totalReviews, flaggedCount] = await Promise.all([
    User.countDocuments(),
    Movie.countDocuments(),
    Review.countDocuments({ status: { $ne: 'removed' } }),
    Review.countDocuments({ status: 'flagged' }),
  ]);

  return {
    totalUsers,
    totalMovies,
    totalReviews,
    flaggedCount,
  };
}

/**
 * Lists flagged and removed reviews with reporter details for Admin moderation.
 */
export async function getFlaggedReviews() {
  return Review.find({ $or: [{ status: 'flagged' }, { 'reports.0': { $exists: true } }] })
    .populate('author', 'name username email role')
    .populate('movie', 'title slug posterUrl')
    .populate('reports.user', 'name username')
    .sort({ updatedAt: -1 })
    .lean();
}

/**
 * Dismisses reports (restoring 'active') or soft-removes a violating review ('removed'),
 * then atomically recalculates the movie's rating stats.
 */
export async function moderateReview(reviewId, action) {
  const review = await Review.findById(reviewId);
  if (!review) {
    throw new AppError('Review not found.', 404);
  }

  if (action === 'dismiss') {
    review.status = 'active';
    review.reports = [];
  } else if (action === 'remove') {
    review.status = 'removed';
  } else {
    throw new AppError('Invalid moderation action.', 400);
  }

  await review.save();
  await recalculateMovieRatings(review.movie);

  return review;
}

/**
 * Lists user accounts for the Admin console with optional search, role, and status filters.
 */
export async function listUsers({ q = '', role = '', status = '', page = 1, limit = 30 }) {
  const filter = {};
  const trimmedQuery = String(q || '').trim();
  if (trimmedQuery) {
    const regex = new RegExp(escapeRegex(trimmedQuery), 'i');
    filter.$or = [{ name: regex }, { username: regex }, { email: regex }];
  }

  if (role && ['user', 'critic', 'admin'].includes(role)) {
    filter.role = role;
  }

  if (status && ['active', 'suspended', 'blocked'].includes(status)) {
    if (status === 'active') {
      filter.$and = filter.$and || [];
      filter.$and.push({ $or: [{ status: 'active' }, { status: { $exists: false } }] });
    } else {
      filter.status = status;
    }
  }

  const safePage = Math.max(1, Number(page) || 1);
  const safeLimit = Math.min(100, Math.max(1, Number(limit) || 30));
  const skip = (safePage - 1) * safeLimit;

  const [users, total] = await Promise.all([
    User.find(filter)
      .select('-passwordHash -refreshTokenHash -passwordResetTokenHash -passwordResetExpires')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(safeLimit)
      .lean(),
    User.countDocuments(filter),
  ]);

  return {
    users,
    total,
    page: safePage,
    pages: Math.max(1, Math.ceil(total / safeLimit)),
  };
}

/**
 * Creates a verified account directly from the Admin Console (defaulting to role='admin').
 */
export async function createPrivilegedUser({ name, username, email, password, role = 'admin', bio = '' }) {
  const normalizedEmail = email.toLowerCase();
  const normalizedUsername = username.toLowerCase();

  const existing = await User.findOne({
    $or: [{ email: normalizedEmail }, { username: normalizedUsername }],
  });

  if (existing) {
    if (existing.email === normalizedEmail) {
      throw new AppError('An account with that email already exists.', 409);
    }
    throw new AppError('That @username is already taken.', 409);
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  const user = await User.create({
    name,
    username: normalizedUsername,
    email: normalizedEmail,
    passwordHash,
    role,
    bio: bio || '',
    isEmailVerified: true,
    status: 'active',
  });

  await PendingRegistration.deleteMany({
    $or: [{ email: normalizedEmail }, { username: normalizedUsername }],
  });

  return sanitizeUser(user);
}

/**
 * Updates a user's moderation status (active, suspended, or blocked) and revokes active sessions on restriction.
 */
export async function updateUserStatus({ targetUserId, actingAdminId, status, suspendDays = null, reason = '' }) {
  if (!mongoose.isValidObjectId(targetUserId)) {
    throw new AppError('Invalid user ID.', 400);
  }

  if (String(targetUserId) === String(actingAdminId)) {
    throw new AppError('You cannot block or suspend your own admin account.', 400);
  }

  const user = await User.findById(targetUserId).select('+refreshTokenHash');
  if (!user) {
    throw new AppError('User account not found.', 404);
  }

  user.status = status;

  if (status === 'active') {
    user.suspendedUntil = null;
    user.moderationReason = '';
  } else if (status === 'suspended') {
    user.suspendedUntil = buildSuspensionDate(suspendDays);
    user.moderationReason = reason || '';
    user.refreshTokenHash = null;
  } else if (status === 'blocked') {
    user.suspendedUntil = null;
    user.moderationReason = reason || '';
    user.refreshTokenHash = null;
  }

  await user.save();
  return sanitizeUser(user);
}

/**
 * Permanently deletes a user account and cleans up their reviews, comments, diary logs,
 * curated lists, likes, and social graph references, then recalculates affected movie ratings.
 */
export async function deleteUserAccount({ targetUserId, actingAdminId }) {
  if (!mongoose.isValidObjectId(targetUserId)) {
    throw new AppError('Invalid user ID.', 400);
  }

  if (String(targetUserId) === String(actingAdminId)) {
    throw new AppError('You cannot delete your own admin account.', 400);
  }

  const user = await User.findById(targetUserId);
  if (!user) {
    throw new AppError('User account not found.', 404);
  }

  const userReviews = await Review.find({ author: user._id }).select('_id movie').lean();
  const reviewIds = userReviews.map((r) => r._id);
  const affectedMovieIds = [...new Set(userReviews.map((r) => r.movie.toString()))];

  await Promise.all([
    Comment.deleteMany({
      $or: [{ author: user._id }, ...(reviewIds.length ? [{ review: { $in: reviewIds } }] : [])],
    }),
    Review.deleteMany({ author: user._id }),
    Review.updateMany(
      { likes: user._id, likesCount: { $gt: 0 } },
      { $pull: { likes: user._id }, $inc: { likesCount: -1 } }
    ),
    Review.updateMany(
      { likes: user._id, likesCount: { $lte: 0 } },
      { $pull: { likes: user._id } }
    ),
    DiaryItem.deleteMany({ user: user._id }),
    MovieList.deleteMany({ owner: user._id }),
    MovieList.updateMany(
      { likes: user._id, likesCount: { $gt: 0 } },
      { $pull: { likes: user._id }, $inc: { likesCount: -1 } }
    ),
    MovieList.updateMany(
      { likes: user._id, likesCount: { $lte: 0 } },
      { $pull: { likes: user._id } }
    ),
    User.updateMany(
      { $or: [{ followers: user._id }, { following: user._id }] },
      { $pull: { followers: user._id, following: user._id } }
    ),
  ]);

  await User.deleteOne({ _id: user._id });

  if (affectedMovieIds.length > 0) {
    await Promise.all(affectedMovieIds.map((movieId) => recalculateMovieRatings(movieId)));
  }

  return {
    deletedUserId: String(targetUserId),
    username: user.username,
  };
}
