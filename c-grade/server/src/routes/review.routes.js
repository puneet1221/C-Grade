import { Router } from 'express';
import { listReviewComments, postComment } from '../controllers/comment.controller.js';
import { flagReview, likeReview, patchReview, removeReview } from '../controllers/review.controller.js';
import { protect } from '../middlewares/auth.js';
import { validateBody } from '../middlewares/validate.js';
import { createCommentSchema, reportReviewSchema, updateReviewSchema } from '../validators/review.validator.js';

const router = Router();

/**
 * Review mutation, engagement, reporting, and nested comment routes.
 */
router.patch('/:id', protect, validateBody(updateReviewSchema), patchReview);
router.delete('/:id', protect, removeReview);
router.post('/:id/like', protect, likeReview);
router.post('/:id/report', protect, validateBody(reportReviewSchema), flagReview);

router.get('/:reviewId/comments', listReviewComments);
router.post('/:reviewId/comments', protect, validateBody(createCommentSchema), postComment);

export default router;
