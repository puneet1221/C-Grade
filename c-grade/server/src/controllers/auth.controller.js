import { env } from '../config/env.js';
import {
  changeUserPassword,
  loginUser,
  logoutUser,
  refreshSession,
  registerUser,
  requestPasswordReset,
  resendVerificationCode,
  resetUserPassword,
  sanitizeUser,
  verifyEmailAndCreateUser,
} from '../services/auth.service.js';
import { sendSuccess } from '../utils/ApiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { getRefreshCookieOptions, REFRESH_COOKIE_NAME } from '../utils/tokenUtils.js';

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

/**
 * POST /api/v1/auth/register
 * Sends a 6-digit email verification code before creating the user account.
 */
export const register = asyncHandler(async (req, res) => {
  const origin = req.headers.origin || env.APP_URL || env.CLIENT_URL;
  const result = await registerUser({ ...req.body, clientBaseUrl: origin });
  return sendSuccess(
    res,
    202,
    'Verification code sent to your email. Enter the code to create your account.',
    result
  );
});

/**
 * POST /api/v1/auth/verify-email
 * Verifies the 6-digit OTP, creates the User document, sets refresh cookie, and returns Access JWT.
 */
export const verifyEmail = asyncHandler(async (req, res) => {
  const { user, accessToken, refreshToken } = await verifyEmailAndCreateUser(req.body);
  res.cookie(REFRESH_COOKIE_NAME, refreshToken, getRefreshCookieOptions(req, SEVEN_DAYS_MS));
  return sendSuccess(res, 201, 'Email verified and account created successfully.', {
    user,
    accessToken,
  });
});

/**
 * POST /api/v1/auth/resend-verification
 * Re-sends a fresh 6-digit verification code after cooldown.
 */
export const resendVerification = asyncHandler(async (req, res) => {
  const origin = req.headers.origin || env.APP_URL || env.CLIENT_URL;
  const result = await resendVerificationCode({ email: req.body.email, clientBaseUrl: origin });
  return sendSuccess(res, 200, 'A new verification code has been sent to your email.', result);
});

/**
 * POST /api/v1/auth/login
 * Authenticates via email or @username and sets refresh cookie (7d or 30d).
 */
export const login = asyncHandler(async (req, res) => {
  const { user, accessToken, refreshToken, rememberMe } = await loginUser(req.body);
  const maxAge = rememberMe ? THIRTY_DAYS_MS : SEVEN_DAYS_MS;
  res.cookie(REFRESH_COOKIE_NAME, refreshToken, getRefreshCookieOptions(req, maxAge));
  return sendSuccess(res, 200, 'Signed in successfully.', { user, accessToken });
});

/**
 * POST /api/v1/auth/logout
 * Revokes stored refresh token hash and clears the refresh cookie.
 */
export const logout = asyncHandler(async (req, res) => {
  const rawToken = req.cookies?.[REFRESH_COOKIE_NAME];
  await logoutUser(rawToken);
  res.clearCookie(REFRESH_COOKIE_NAME, getRefreshCookieOptions(req));
  return sendSuccess(res, 200, 'Signed out successfully.');
});

/**
 * POST /api/v1/auth/refresh
 * Silently rotates the HttpOnly refresh token into a fresh Access JWT.
 */
export const refresh = asyncHandler(async (req, res) => {
  const rawToken = req.cookies?.[REFRESH_COOKIE_NAME];
  const { user, accessToken, refreshToken, rememberMe } = await refreshSession(rawToken);
  const maxAge = rememberMe ? THIRTY_DAYS_MS : SEVEN_DAYS_MS;
  res.cookie(REFRESH_COOKIE_NAME, refreshToken, getRefreshCookieOptions(req, maxAge));
  return sendSuccess(res, 200, 'Session refreshed.', { user, accessToken });
});

/**
 * GET /api/v1/auth/session
 * Quietly checks for an active HttpOnly refresh cookie on initial page load
 * without emitting 401 console errors for anonymous visitors.
 */
export const getSession = asyncHandler(async (req, res) => {
  const rawToken = req.cookies?.[REFRESH_COOKIE_NAME];
  if (!rawToken) {
    return sendSuccess(res, 200, 'No active session.', {
      authenticated: false,
      user: null,
      accessToken: null,
    });
  }
  try {
    const { user, accessToken, refreshToken, rememberMe } = await refreshSession(rawToken);
    const maxAge = rememberMe ? THIRTY_DAYS_MS : SEVEN_DAYS_MS;
    res.cookie(REFRESH_COOKIE_NAME, refreshToken, getRefreshCookieOptions(req, maxAge));
    return sendSuccess(res, 200, 'Session restored.', {
      authenticated: true,
      user,
      accessToken,
    });
  } catch {
    res.clearCookie(REFRESH_COOKIE_NAME, getRefreshCookieOptions(req));
    return sendSuccess(res, 200, 'No active session.', {
      authenticated: false,
      user: null,
      accessToken: null,
    });
  }
});

/**
 * POST /api/v1/auth/forgot-password
 * Sends a 15-minute reset link via Gmail SMTP while preventing user enumeration.
 */
export const forgotPassword = asyncHandler(async (req, res) => {
  const origin = req.headers.origin || env.APP_URL || env.CLIENT_URL;
  await requestPasswordReset({ email: req.body.email, clientBaseUrl: origin });
  return sendSuccess(
    res,
    200,
    'If an account matches that email, a password reset link has been sent (valid for 15 minutes).'
  );
});

/**
 * POST /api/v1/auth/reset-password/:token
 * Verifies the reset token, updates password, and revokes existing sessions.
 */
export const resetPassword = asyncHandler(async (req, res) => {
  await resetUserPassword({ rawToken: req.params.token, newPassword: req.body.password });
  res.clearCookie(REFRESH_COOKIE_NAME, getRefreshCookieOptions(req));
  return sendSuccess(res, 200, 'Password reset successfully. You can now sign in.');
});

/**
 * GET /api/v1/auth/me
 * Returns the authenticated user's profile.
 */
export const getMe = asyncHandler(async (req, res) => {
  await req.user.populate('favoriteMovies', 'title slug posterUrl releaseDate averageRating');
  return sendSuccess(res, 200, 'Current user fetched.', { user: sanitizeUser(req.user) });
});

/**
 * PATCH /api/v1/auth/change-password
 * Changes the authenticated user's password and rotates tokens.
 */
export const changePassword = asyncHandler(async (req, res) => {
  const { user, accessToken, refreshToken } = await changeUserPassword({
    userId: req.user._id,
    currentPassword: req.body.currentPassword,
    newPassword: req.body.newPassword,
  });
  res.cookie(REFRESH_COOKIE_NAME, refreshToken, getRefreshCookieOptions(req, SEVEN_DAYS_MS));
  return sendSuccess(res, 200, 'Password updated successfully.', { user, accessToken });
});
