import { Router } from 'express';
import { removeComment } from '../controllers/comment.controller.js';
import { protect } from '../middlewares/auth.js';

const router = Router();

/**
 * Comment deletion route.
 */
router.delete('/:id', protect, removeComment);

export default router;
