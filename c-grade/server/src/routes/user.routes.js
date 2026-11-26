import { Router } from 'express';
import { followUser, getMyFeed, getUserProfile, updateProfile } from '../controllers/user.controller.js';
import { optionalAuth, protect } from '../middlewares/auth.js';
import { validateBody } from '../middlewares/validate.js';
import { updateProfileSchema } from '../validators/user.validator.js';

const router = Router();

/**
 * Cinephile profile, social follow graph, and activity feed routes.
 */
router.get('/feed', protect, getMyFeed);
router.patch('/users/me', protect, validateBody(updateProfileSchema), updateProfile);
router.get('/users/:username', optionalAuth, getUserProfile);
router.post('/users/:id/follow', protect, followUser);

export default router;
