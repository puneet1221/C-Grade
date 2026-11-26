import { createComment, deleteComment, getReviewComments } from '../services/comment.service.js';
import { sendSuccess } from '../utils/ApiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';

/**
 * GET /api/v1/reviews/:reviewId/comments
 */
export const listReviewComments = asyncHandler(async (req, res) => {
  const comments = await getReviewComments(req.params.reviewId);
  return sendSuccess(res, 200, 'Comments retrieved.', { comments });
});

/**
 * POST /api/v1/reviews/:reviewId/comments
 */
export const postComment = asyncHandler(async (req, res) => {
  const comment = await createComment(req.params.reviewId, req.user._id, req.body);
  return sendSuccess(res, 201, 'Comment posted.', { comment });
});

/**
 * DELETE /api/v1/comments/:id
 */
export const removeComment = asyncHandler(async (req, res) => {
  const result = await deleteComment(req.params.id, req.user);
  return sendSuccess(res, 200, 'Comment removed.', result);
});
