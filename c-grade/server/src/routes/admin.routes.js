import { Router } from 'express';
import {
  adminCreateUser,
  adminDeleteUser,
  adminListUsers,
  adminModerateReview,
  adminReports,
  adminStats,
  adminUpdateUserStatus,
} from '../controllers/admin.controller.js';
import { protect } from '../middlewares/auth.js';
import { requireRole } from '../middlewares/roleGuard.js';
import { validateBody } from '../middlewares/validate.js';
import { createAdminUserSchema, updateUserStatusSchema } from '../validators/admin.validator.js';
import { moderateReviewSchema } from '../validators/review.validator.js';

const router = Router();

/**
 * Admin-only KPIs, user management, and review moderation routes.
 */
router.use(protect, requireRole('admin'));

router.get('/stats', adminStats);
router.get('/reports', adminReports);
router.patch('/reviews/:id/moderate', validateBody(moderateReviewSchema), adminModerateReview);

router.get('/users', adminListUsers);
router.post('/users', validateBody(createAdminUserSchema), adminCreateUser);
router.patch('/users/:id/status', validateBody(updateUserStatusSchema), adminUpdateUserStatus);
router.delete('/users/:id', adminDeleteUser);

export default router;
