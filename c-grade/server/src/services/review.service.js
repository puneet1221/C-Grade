import { Comment } from '../models/Comment.js';
import { DiaryItem } from '../models/DiaryItem.js';
import { Movie } from '../models/Movie.js';
import { Review } from '../models/Review.js';
import { AppError } from '../utils/AppError.js';
import { computeRatingStats, isMovieReleased } from '../utils/ratingStats.js';

/**
 * Atomically recalculates Movie.averageRating, ratingsCount, and ratingDistribution
 * from all active reviews in MongoDB.
 * @param {import('mongoose').Types.ObjectId | string} movieId
 */
export async function recalculateMovieRatings(movieId) {
  const activeReviews = await Review.find({ movie: movieId, status: 'active' }).select('rating').lean();
  const ratings = activeReviews.map((r) => r.rating);
  const stats = computeRatingStats(ratings);

  await Movie.findByIdAndUpdate(movieId, {
    $set: {
      averageRating: stats.averageRating,
      ratingsCount: stats.ratingsCount,
      ratingDistribution: stats.ratingDistribution,
    },
  });

  return stats;
}

/**
 * Fetches paginated, sorted reviews for a movie with author profiles and comment counts.
 */
export async function getMovieReviews(movieId, query = {}) {
  const page = Math.max(1, Number(query.page) || 1);
  const limit = Math.min(50, Math.max(1, Number(query.limit) || 10));

  const sortMap = {
    helpful: { likesCount: -1, createdAt: -1 },
    newest: { createdAt: -1 },
    highest: { rating: -1, createdAt: -1 },
    lowest: { rating: 1, createdAt: -1 },
  };
  const sortOption = sortMap[query.sort] || sortMap.helpful;

  const filter = { movie: movieId, status: { $ne: 'removed' } };

  const [reviews, total] = await Promise.all([
    Review.find(filter)
      .populate('author', 'name username avatarUrl role')
      .sort(sortOption)
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    Review.countDocuments(filter),
  ]);

  const reviewIds = reviews.map((r) => r._id);
  const commentCounts = await Comment.aggregate([
    { $match: { review: { $in: reviewIds } } },
    { $group: { _id: '$review', count: { $sum: 1 } } },
  ]);

  const countMap = new Map(commentCounts.map((c) => [c._id.toString(), c.count]));
  const enriched = reviews.map((r) => ({
    ...r,
    commentsCount: countMap.get(r._id.toString()) || 0,
  }));

  return {
    reviews: enriched,
    meta: {
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    },
  };
}

/**
 * Creates a review for a film, logs it to the user's diary as watched, and updates movie stats.
 */
export async function createReview(movieId, authorId, payload) {
  const movie = await Movie.findById(movieId);
  if (!movie) {
    throw new AppError('Film not found.', 404);
  }

  if (!isMovieReleased(movie)) {
    throw new AppError('Reviews cannot be submitted before a film is released.', 400);
  }

  const existing = await Review.findOne({ movie: movieId, author: authorId });
  if (existing) {
    throw new AppError('You have already reviewed this film. Edit your existing review instead.', 409);
  }

  const review = await Review.create({
    movie: movieId,
    author: authorId,
    rating: payload.rating,
    title: payload.title || '',
    body: payload.body,
    tags: payload.tags || [],
    containsSpoilers: Boolean(payload.containsSpoilers),
    watchedDate: payload.watchedDate ? new Date(payload.watchedDate) : new Date(),
    isRewatch: Boolean(payload.isRewatch),
  });

  // Sync watch diary entry when a user logs a watched review
  await DiaryItem.findOneAndUpdate(
    { user: authorId, movie: movieId },
    {
      $set: {
        status: 'watched',
        watchedAt: review.watchedDate,
      },
      $inc: { rewatchCount: payload.isRewatch ? 1 : 0 },
    },
    { upsert: true, setDefaultsOnInsert: true }
  );

  const stats = await recalculateMovieRatings(movieId);
  const populated = await Review.findById(review._id).populate('author', 'name username avatarUrl role').lean();

  return { review: { ...populated, commentsCount: 0 }, stats };
}

/**
 * Updates an existing review (author or admin only) and recalculates movie rating stats.
 */
export async function updateReview(reviewId, user, payload) {
  const review = await Review.findById(reviewId);
  if (!review) {
    throw new AppError('Review not found.', 404);
  }

  if (review.author.toString() !== user._id.toString() && user.role !== 'admin') {
    throw new AppError('You can only edit your own reviews.', 403);
  }

  const allowedFields = ['rating', 'title', 'body', 'tags', 'containsSpoilers', 'watchedDate', 'isRewatch'];
  for (const field of allowedFields) {
    if (payload[field] !== undefined) {
      review[field] = field === 'watchedDate' ? new Date(payload[field]) : payload[field];
    }
  }

  await review.save();
  const stats = await recalculateMovieRatings(review.movie);
  const populated = await Review.findById(review._id).populate('author', 'name username avatarUrl role').lean();

  return { review: populated, stats };
}

/**
 * Deletes a review and associated comments (author or admin only) and recalculates movie stats.
 */
export async function deleteReview(reviewId, user) {
  const review = await Review.findById(reviewId);
  if (!review) {
    throw new AppError('Review not found.', 404);
  }

  if (review.author.toString() !== user._id.toString() && user.role !== 'admin') {
    throw new AppError('You can only delete your own reviews.', 403);
  }

  const movieId = review.movie;
  await Promise.all([Review.findByIdAndDelete(reviewId), Comment.deleteMany({ review: reviewId })]);
  const stats = await recalculateMovieRatings(movieId);

  return { deleted: true, movieId, stats };
}

/**
 * Toggles Helpful/Like status on a review for the authenticated user.
 */
export async function toggleReviewLike(reviewId, userId) {
  const review = await Review.findById(reviewId);
  if (!review) {
    throw new AppError('Review not found.', 404);
  }

  const alreadyLiked = review.likes.some((id) => id.toString() === userId.toString());
  if (alreadyLiked) {
    review.likes = review.likes.filter((id) => id.toString() !== userId.toString());
  } else {
    review.likes.push(userId);
  }
  review.likesCount = review.likes.length;
  await review.save();

  return {
    liked: !alreadyLiked,
    likesCount: review.likesCount,
  };
}

/**
 * Flags a review for Admin moderation inspection.
 */
export async function reportReview(reviewId, userId, reason) {
  const review = await Review.findById(reviewId);
  if (!review) {
    throw new AppError('Review not found.', 404);
  }

  const alreadyReported = review.reports.some((r) => r.user.toString() === userId.toString());
  if (alreadyReported) {
    throw new AppError('You have already reported this review.', 409);
  }

  review.reports.push({ user: userId, reason });
  if (review.status === 'active') {
    review.status = 'flagged';
  }
  await review.save();

  return { reported: true, status: review.status };
}
