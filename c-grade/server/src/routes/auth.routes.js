import { Router } from 'express';
import {
  changePassword,
  forgotPassword,
  getMe,
  getSession,
  login,
  logout,
  refresh,
  register,
  resendVerification,
  resetPassword,
  verifyEmail,
} from '../controllers/auth.controller.js';
import { protect } from '../middlewares/auth.js';
import { authLimiter } from '../middlewares/rateLimiter.js';
import { validateBody } from '../middlewares/validate.js';
import {
  changePasswordSchema,
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
  resendVerificationSchema,
  resetPasswordSchema,
  verifyEmailSchema,
} from '../validators/auth.validator.js';

const router = Router();

/**
 * Auth routes: email-verified registration, sign-in, silent refresh, logout, and password recovery.
 */
router.post('/register', authLimiter, validateBody(registerSchema), register);
router.post('/verify-email', authLimiter, validateBody(verifyEmailSchema), verifyEmail);
router.post(
  '/resend-verification',
  authLimiter,
  validateBody(resendVerificationSchema),
  resendVerification
);
router.post('/login', authLimiter, validateBody(loginSchema), login);
router.post('/logout', logout);
router.post('/refresh', refresh);
router.get('/session', getSession);
router.post('/forgot-password', authLimiter, validateBody(forgotPasswordSchema), forgotPassword);
router.post('/reset-password/:token', authLimiter, validateBody(resetPasswordSchema), resetPassword);
router.get('/me', protect, getMe);
router.patch('/change-password', protect, validateBody(changePasswordSchema), changePassword);

export default router;
