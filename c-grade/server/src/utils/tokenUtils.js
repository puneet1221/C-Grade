import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';

export const REFRESH_COOKIE_NAME = 'cgrade_rt';

/**
 * Generates a short-lived Access JWT (15 minutes).
 * @param {{ id: string, role: string, username: string }} payload
 * @returns {string}
 */
export function signAccessToken(payload) {
  return jwt.sign(
    { sub: payload.id, role: payload.role, username: payload.username },
    env.JWT_ACCESS_SECRET,
    { expiresIn: '15m' }
  );
}

/**
 * Generates a Refresh JWT (7 days standard, 30 days with Remember Me).
 * @param {{ id: string, rememberMe?: boolean }} payload
 * @returns {string}
 */
export function signRefreshToken(payload) {
  const expiresIn = payload.rememberMe ? '30d' : '7d';
  return jwt.sign(
    { sub: payload.id, rememberMe: Boolean(payload.rememberMe), jti: crypto.randomUUID() },
    env.JWT_REFRESH_SECRET,
    { expiresIn }
  );
}

/**
 * Verifies an Access JWT and returns decoded claims.
 * @param {string} token
 * @returns {{ sub: string, role: string, username: string }}
 */
export function verifyAccessToken(token) {
  return jwt.verify(token, env.JWT_ACCESS_SECRET);
}

/**
 * Verifies a Refresh JWT and returns decoded claims.
 * @param {string} token
 * @returns {{ sub: string, rememberMe?: boolean, jti: string }}
 */
export function verifyRefreshToken(token) {
  return jwt.verify(token, env.JWT_REFRESH_SECRET);
}

/**
 * Computes a deterministic SHA-256 hex digest for storing refresh or reset tokens safely.
 * @param {string} rawToken
 * @returns {string}
 */
export function hashToken(rawToken) {
  return crypto.createHash('sha256').update(String(rawToken)).digest('hex');
}

/**
 * Generates a cryptographically random 32-byte reset token and its SHA-256 hash.
 * @returns {{ rawToken: string, tokenHash: string, expiresAt: Date }}
 */
export function createPasswordResetToken() {
  const rawToken = crypto.randomBytes(32).toString('hex');
  const tokenHash = hashToken(rawToken);
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
  return { rawToken, tokenHash, expiresAt };
}

/**
 * Generates a cryptographically random 6-digit email verification code and its SHA-256 hash.
 * @returns {{ code: string, otpHash: string, expiresAt: Date }}
 */
export function createEmailVerificationOtp() {
  const code = crypto.randomInt(100000, 1000000).toString();
  const otpHash = hashToken(code);
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
  return { code, otpHash, expiresAt };
}

/**
 * Performs a constant-time comparison between two hex-encoded SHA-256 hashes.
 * @param {string} hashA
 * @param {string} hashB
 * @returns {boolean}
 */
export function safeCompareHashes(hashA, hashB) {
  if (!hashA || !hashB || hashA.length !== hashB.length) return false;
  return crypto.timingSafeEqual(Buffer.from(hashA, 'utf8'), Buffer.from(hashB, 'utf8'));
}

/**
 * Computes cookie options compatible with both HTTPS iframe previews and local HTTP dev.
 * @param {import('express').Request} req
 * @param {number} [maxAgeMs]
 */
export function getRefreshCookieOptions(req, maxAgeMs) {
  const forwardedProto = req.headers['x-forwarded-proto'];
  const isHttps = req.secure || forwardedProto === 'https';

  const base = {
    httpOnly: true,
    path: '/api/v1/auth',
    secure: isHttps,
    sameSite: isHttps ? 'none' : 'lax',
  };

  if (isHttps) {
    // Required for third-party iframe previews in modern Chromium
    base.partitioned = true;
  }

  if (typeof maxAgeMs === 'number') {
    base.maxAge = maxAgeMs;
  }

  return base;
}
