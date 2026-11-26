import { Router } from 'express';
import { adminModerateReview, adminReports, adminStats } from '../controllers/admin.controller.js';
import { protect } from '../middlewares/auth.js';
import { requireRole } from '../middlewares/roleGuard.js';
import { validateBody } from '../middlewares/validate.js';
import { moderateReviewSchema } from '../validators/review.validator.js';

const router = Router();

/**
 * Admin-only KPIs and review moderation routes.
 */
router.use(protect, requireRole('admin'));

router.get('/stats', adminStats);
router.get('/reports', adminReports);
router.patch('/reviews/:id/moderate', validateBody(moderateReviewSchema), adminModerateReview);

export default router;
