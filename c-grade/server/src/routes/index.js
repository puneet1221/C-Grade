import { Router } from 'express';
import adminRoutes from './admin.routes.js';
import authRoutes from './auth.routes.js';
import commentRoutes from './comment.routes.js';
import diaryRoutes from './diary.routes.js';
import listRoutes from './list.routes.js';
import movieRoutes from './movie.routes.js';
import reviewRoutes from './review.routes.js';
import userRoutes from './user.routes.js';

const router = Router();

/**
 * Mounts all C-Grade REST API v1 resource routers.
 */
router.get('/health', (_req, res) => {
  res.json({ success: true, message: 'C-Grade API v1 is healthy', data: { status: 'ok' } });
});

router.use('/auth', authRoutes);
router.use('/movies', movieRoutes);
router.use('/reviews', reviewRoutes);
router.use('/comments', commentRoutes);
router.use('/diary', diaryRoutes);
router.use('/lists', listRoutes);
router.use('/admin', adminRoutes);
router.use('/', userRoutes);

export default router;
