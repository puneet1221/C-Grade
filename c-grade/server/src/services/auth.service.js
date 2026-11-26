import bcrypt from 'bcryptjs';
import {
  sendEmailVerificationCode,
  sendPasswordResetEmail,
  sendWelcomeEmail,
} from '../config/mailer.js';
import { PendingRegistration } from '../models/PendingRegistration.js';
import { User } from '../models/User.js';
import { AppError } from '../utils/AppError.js';
import {
  createEmailVerificationOtp,
  createPasswordResetToken,
  hashToken,
  safeCompareHashes,
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} from '../utils/tokenUtils.js';

const SALT_ROUNDS = 12;

/**
 * Strips sensitive credential fields before returning a user object to clients.
 * @param {import('mongoose').Document | Record<string, any>} userDoc
 */
export function sanitizeUser(userDoc) {
  const obj = typeof userDoc.toObject === 'function' ? userDoc.toObject() : { ...userDoc };
  delete obj.passwordHash;
  delete obj.refreshTokenHash;
  delete obj.passwordResetTokenHash;
  delete obj.passwordResetExpires;
  return obj;
}

/**
 * Starts signup by hashing the password into a temporary PendingRegistration
 * and emailing a 10-minute 6-digit verification code. The User account is NOT
 * created until the email code is verified.
 */
export async function registerUser({ name, username, email, password, avatarUrl, clientBaseUrl }) {
  const normalizedEmail = email.toLowerCase();
  const normalizedUsername = username.toLowerCase();

  const existing = await User.findOne({
    $or: [{ email: normalizedEmail }, { username: normalizedUsername }],
  });

  if (existing) {
    if (existing.email === normalizedEmail) {
      throw new AppError('An account with that email already exists.', 409);
    }
    throw new AppError('That @username is already taken.', 409);
  }

  const usernameReserved = await PendingRegistration.findOne({
    username: normalizedUsername,
    email: { $ne: normalizedEmail },
    expiresAt: { $gt: new Date() },
  });
  if (usernameReserved) {
    throw new AppError('That @username is temporarily reserved pending email verification.', 409);
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  const { code, otpHash, expiresAt } = createEmailVerificationOtp();
  const resendAvailableAt = new Date(Date.now() + 60 * 1000);

  await PendingRegistration.findOneAndUpdate(
    { email: normalizedEmail },
    {
      name,
      username: normalizedUsername,
      email: normalizedEmail,
      passwordHash,
      avatarUrl: avatarUrl || '',
      otpHash,
      attempts: 0,
      resendAvailableAt,
      expiresAt,
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  const base = (clientBaseUrl || '').replace(/\/$/, '');
  const verifyUrl = `${base}/verify-email?email=${encodeURIComponent(normalizedEmail)}&code=${encodeURIComponent(code)}`;

  try {
    await sendEmailVerificationCode({
      to: normalizedEmail,
      name,
      code,
      verifyUrl,
    });
  } catch (err) {
    await PendingRegistration.deleteOne({ email: normalizedEmail });
    throw new AppError(
      `Unable to send verification email: ${err.message || 'SMTP delivery failed.'}`,
      502
    );
  }

  return {
    pendingVerification: true,
    email: normalizedEmail,
    expiresInMinutes: 10,
    resendAfterSeconds: 60,
  };
}

/**
 * Verifies the 6-digit email OTP, creates the User record in MongoDB,
 * issues Access + Refresh tokens, and dispatches the Welcome email.
 */
export async function verifyEmailAndCreateUser({ email, code }) {
  const normalizedEmail = email.toLowerCase();
  const pending = await PendingRegistration.findOne({ email: normalizedEmail }).select(
    '+passwordHash +otpHash'
  );

  if (!pending || pending.expiresAt <= new Date()) {
    if (pending) {
      await PendingRegistration.deleteOne({ _id: pending._id });
    }
    throw new AppError('Verification code has expired or was not found. Please sign up again.', 400);
  }

  if (pending.attempts >= 5) {
    throw new AppError('Too many incorrect attempts. Please request a new verification code.', 429);
  }

  const incomingHash = hashToken(String(code).trim());
  if (!safeCompareHashes(incomingHash, pending.otpHash)) {
    pending.attempts += 1;
    await pending.save();
    const remaining = Math.max(0, 5 - pending.attempts);
    throw new AppError(
      remaining > 0
        ? `Invalid verification code. ${remaining} attempt(s) remaining.`
        : 'Too many incorrect attempts. Please request a new verification code.',
      400
    );
  }

  const existing = await User.findOne({
    $or: [{ email: pending.email }, { username: pending.username }],
  });
  if (existing) {
    await PendingRegistration.deleteOne({ _id: pending._id });
    throw new AppError(
      existing.email === pending.email
        ? 'An account with that email already exists.'
        : 'That @username is already taken.',
      409
    );
  }

  const user = await User.create({
    name: pending.name,
    username: pending.username,
    email: pending.email,
    passwordHash: pending.passwordHash,
    avatarUrl: pending.avatarUrl || '',
    role: 'user',
    isEmailVerified: true,
  });

  await PendingRegistration.deleteOne({ _id: pending._id });

  const accessToken = signAccessToken({
    id: user._id.toString(),
    role: user.role,
    username: user.username,
  });
  const refreshToken = signRefreshToken({ id: user._id.toString(), rememberMe: false });
  user.refreshTokenHash = hashToken(refreshToken);
  await user.save();

  sendWelcomeEmail({ to: user.email, name: user.name, username: user.username }).catch((err) => {
    console.warn('[Mailer] Welcome email skipped:', err.message);
  });

  return { user: sanitizeUser(user), accessToken, refreshToken, rememberMe: false };
}

/**
 * Generates and dispatches a fresh 6-digit email verification code for a pending signup.
 */
export async function resendVerificationCode({ email, clientBaseUrl }) {
  const normalizedEmail = email.toLowerCase();
  const pending = await PendingRegistration.findOne({ email: normalizedEmail });

  if (!pending) {
    throw new AppError('No pending registration found for that email. Please sign up again.', 404);
  }

  if (pending.resendAvailableAt && pending.resendAvailableAt > new Date()) {
    const waitSec = Math.ceil((pending.resendAvailableAt.getTime() - Date.now()) / 1000);
    throw new AppError(`Please wait ${waitSec}s before requesting a new verification code.`, 429);
  }

  const { code, otpHash, expiresAt } = createEmailVerificationOtp();
  pending.otpHash = otpHash;
  pending.expiresAt = expiresAt;
  pending.attempts = 0;
  pending.resendAvailableAt = new Date(Date.now() + 60 * 1000);
  await pending.save();

  const base = (clientBaseUrl || '').replace(/\/$/, '');
  const verifyUrl = `${base}/verify-email?email=${encodeURIComponent(normalizedEmail)}&code=${encodeURIComponent(code)}`;

  await sendEmailVerificationCode({
    to: normalizedEmail,
    name: pending.name,
    code,
    verifyUrl,
  });

  return {
    email: normalizedEmail,
    expiresInMinutes: 10,
    resendAfterSeconds: 60,
  };
}

/**
 * Authenticates a user by email or @username and issues Access + Refresh tokens.
 */
export async function loginUser({ identifier, password, rememberMe = false }) {
  const normalized = identifier.trim().toLowerCase().replace(/^@/, '');

  const user = await User.findOne({
    $or: [{ email: normalized }, { username: normalized }],
  }).select('+passwordHash');

  if (!user) {
    throw new AppError('Invalid credentials. Please check your email/username and password.', 401);
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    throw new AppError('Invalid credentials. Please check your email/username and password.', 401);
  }

  const accessToken = signAccessToken({ id: user._id.toString(), role: user.role, username: user.username });
  const refreshToken = signRefreshToken({ id: user._id.toString(), rememberMe });

  user.refreshTokenHash = hashToken(refreshToken);
  await user.save();

  return { user: sanitizeUser(user), accessToken, refreshToken, rememberMe };
}

/**
 * Rotates a valid Refresh Token from an HttpOnly cookie into fresh Access + Refresh tokens.
 */
export async function refreshSession(rawRefreshToken) {
  if (!rawRefreshToken) {
    throw new AppError('Refresh token missing.', 401);
  }

  let decoded;
  try {
    decoded = verifyRefreshToken(rawRefreshToken);
  } catch {
    throw new AppError('Refresh session expired. Please sign in again.', 401);
  }

  const user = await User.findById(decoded.sub).select('+refreshTokenHash');
  if (!user || !user.refreshTokenHash) {
    throw new AppError('Session revoked. Please sign in again.', 401);
  }

  const incomingHash = hashToken(rawRefreshToken);
  if (incomingHash !== user.refreshTokenHash) {
    // Reuse detection: invalidate active token if mismatch occurs
    user.refreshTokenHash = null;
    await user.save();
    throw new AppError('Refresh token mismatch. Please sign in again.', 401);
  }

  const rememberMe = Boolean(decoded.rememberMe);
  const accessToken = signAccessToken({ id: user._id.toString(), role: user.role, username: user.username });
  const newRefreshToken = signRefreshToken({ id: user._id.toString(), rememberMe });

  user.refreshTokenHash = hashToken(newRefreshToken);
  await user.save();

  return { user: sanitizeUser(user), accessToken, refreshToken: newRefreshToken, rememberMe };
}

/**
 * Revokes the stored refresh token hash in MongoDB on logout.
 */
export async function logoutUser(rawRefreshToken) {
  if (!rawRefreshToken) return;
  try {
    const decoded = verifyRefreshToken(rawRefreshToken);
    await User.findByIdAndUpdate(decoded.sub, { $set: { refreshTokenHash: null } });
  } catch {
    // Clearing the browser cookie still proceeds cleanly if token was already expired
  }
}

/**
 * Searches the database for a registered user by email first; if found, generates
 * a 15-minute SHA-256 hashed password reset token and sends a Gmail SMTP email.
 */
export async function requestPasswordReset({ email, clientBaseUrl }) {
  const normalizedEmail = String(email || '').trim().toLowerCase();
  const user = await User.findOne({ email: normalizedEmail });
  if (!user) {
    throw new AppError('User is not registered with this email address.', 404);
  }

  const { rawToken, tokenHash, expiresAt } = createPasswordResetToken();
  user.passwordResetTokenHash = tokenHash;
  user.passwordResetExpires = expiresAt;
  await user.save();

  const resetUrl = `${clientBaseUrl.replace(/\/$/, '')}/reset-password/${rawToken}`;
  await sendPasswordResetEmail({
    to: user.email,
    name: user.name,
    resetUrl,
  });

  return { dispatched: true };
}

/**
 * Validates a password reset token, updates passwordHash, and revokes existing refresh sessions.
 */
export async function resetUserPassword({ rawToken, newPassword }) {
  const tokenHash = hashToken(rawToken);
  const user = await User.findOne({
    passwordResetTokenHash: tokenHash,
    passwordResetExpires: { $gt: new Date() },
  }).select('+passwordResetTokenHash +passwordResetExpires +refreshTokenHash');

  if (!user) {
    throw new AppError('Password reset link is invalid or has expired.', 400);
  }

  user.passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
  user.passwordResetTokenHash = null;
  user.passwordResetExpires = null;
  user.refreshTokenHash = null;
  await user.save();

  return { reset: true };
}

/**
 * Updates the authenticated user's password after verifying currentPassword.
 */
export async function changeUserPassword({ userId, currentPassword, newPassword }) {
  const user = await User.findById(userId).select('+passwordHash');
  if (!user) {
    throw new AppError('User not found.', 404);
  }

  const valid = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!valid) {
    throw new AppError('Current password is incorrect.', 400);
  }

  user.passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
  const accessToken = signAccessToken({ id: user._id.toString(), role: user.role, username: user.username });
  const refreshToken = signRefreshToken({ id: user._id.toString(), rememberMe: false });
  user.refreshTokenHash = hashToken(refreshToken);
  await user.save();

  return { user: sanitizeUser(user), accessToken, refreshToken };
}
