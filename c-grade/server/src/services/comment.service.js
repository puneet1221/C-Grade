import { Comment } from '../models/Comment.js';
import { Review } from '../models/Review.js';
import { AppError } from '../utils/AppError.js';

/**
 * Returns 1-level nested comment threads for a review.
 */
export async function getReviewComments(reviewId) {
  const comments = await Comment.find({ review: reviewId })
    .populate('author', 'name username avatarUrl role')
    .sort({ createdAt: 1 })
    .lean();

  const topLevel = [];
  const repliesByParent = new Map();

  for (const comment of comments) {
    if (!comment.parentComment) {
      topLevel.push({ ...comment, replies: [] });
    } else {
      const parentKey = comment.parentComment.toString();
      if (!repliesByParent.has(parentKey)) {
        repliesByParent.set(parentKey, []);
      }
      repliesByParent.get(parentKey).push(comment);
    }
  }

  for (const root of topLevel) {
    root.replies = repliesByParent.get(root._id.toString()) || [];
  }

  return topLevel;
}

/**
 * Adds a comment or 1-level nested reply to a review.
 */
export async function createComment(reviewId, authorId, { body, parentComment }) {
  const review = await Review.findById(reviewId);
  if (!review || review.status === 'removed') {
    throw new AppError('Review not found.', 404);
  }

  let resolvedParent = null;
  if (parentComment) {
    const parent = await Comment.findById(parentComment);
    if (!parent || parent.review.toString() !== reviewId.toString()) {
      throw new AppError('Parent comment not found on this review.', 404);
    }
    // Enforce max 1-level nesting by flattening replies-to-replies onto the root parent
    resolvedParent = parent.parentComment ? parent.parentComment : parent._id;
  }

  const comment = await Comment.create({
    review: reviewId,
    author: authorId,
    body,
    parentComment: resolvedParent,
  });

  return Comment.findById(comment._id).populate('author', 'name username avatarUrl role').lean();
}

/**
 * Deletes a comment (author or admin only) along with its direct replies.
 */
export async function deleteComment(commentId, user) {
  const comment = await Comment.findById(commentId);
  if (!comment) {
    throw new AppError('Comment not found.', 404);
  }

  if (comment.author.toString() !== user._id.toString() && user.role !== 'admin') {
    throw new AppError('You can only delete your own comments.', 403);
  }

  await Promise.all([
    Comment.findByIdAndDelete(commentId),
    Comment.deleteMany({ parentComment: commentId }),
  ]);

  return { deleted: true, id: commentId };
}
