import {
  createReview,
  deleteReview,
  getMovieReviews,
  reportReview,
  toggleReviewLike,
  updateReview,
} from '../services/review.service.js';
import { sendSuccess } from '../utils/ApiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';

/**
 * GET /api/v1/movies/:movieId/reviews
 */
export const listMovieReviews = asyncHandler(async (req, res) => {
  const { reviews, meta } = await getMovieReviews(req.params.movieId, req.query);
  return sendSuccess(res, 200, 'Reviews retrieved.', { reviews }, meta);
});

/**
 * POST /api/v1/movies/:movieId/reviews
 */
export const postMovieReview = asyncHandler(async (req, res) => {
  const result = await createReview(req.params.movieId, req.user._id, req.body);
  return sendSuccess(res, 201, 'Review published.', result);
});

/**
 * PATCH /api/v1/reviews/:id
 */
export const patchReview = asyncHandler(async (req, res) => {
  const result = await updateReview(req.params.id, req.user, req.body);
  return sendSuccess(res, 200, 'Review updated.', result);
});

/**
 * DELETE /api/v1/reviews/:id
 */
export const removeReview = asyncHandler(async (req, res) => {
  const result = await deleteReview(req.params.id, req.user);
  return sendSuccess(res, 200, 'Review deleted.', result);
});

/**
 * POST /api/v1/reviews/:id/like
 */
export const likeReview = asyncHandler(async (req, res) => {
  const result = await toggleReviewLike(req.params.id, req.user._id);
  return sendSuccess(res, 200, result.liked ? 'Marked helpful.' : 'Helpful vote removed.', result);
});

/**
 * POST /api/v1/reviews/:id/report
 */
export const flagReview = asyncHandler(async (req, res) => {
  const result = await reportReview(req.params.id, req.user._id, req.body.reason);
  return sendSuccess(res, 200, 'Report submitted for moderation review.', result);
});
