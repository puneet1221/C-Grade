import { Movie } from '../models/Movie.js';
import { Review } from '../models/Review.js';
import { User } from '../models/User.js';
import { AppError } from '../utils/AppError.js';
import { recalculateMovieRatings } from './review.service.js';

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
