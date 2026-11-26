import { User } from '../models/User.js';
import { AppError } from '../utils/AppError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { verifyAccessToken } from '../utils/tokenUtils.js';

/**
 * Extracts a Bearer token from Authorization header if present.
 * @param {import('express').Request} req
 * @returns {string | null}
 */
function extractBearerToken(req) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return null;
  }
  return header.slice(7).trim() || null;
}

/**
 * Enforces valid Access JWT authentication and attaches req.user.
 */
export const protect = asyncHandler(async (req, _res, next) => {
  const token = extractBearerToken(req);
  if (!token) {
    throw new AppError('Authentication required. Please sign in.', 401);
  }

  let decoded;
  try {
    decoded = verifyAccessToken(token);
  } catch {
    throw new AppError('Session expired or invalid token.', 401);
  }

  const user = await User.findById(decoded.sub).select('-passwordHash');
  if (!user) {
    throw new AppError('User account no longer exists.', 401);
  }

  req.user = user;
  next();
});

/**
 * Attaches req.user when a valid Bearer token is present, without blocking anonymous requests.
 */
export const optionalAuth = asyncHandler(async (req, _res, next) => {
  const token = extractBearerToken(req);
  if (!token) {
    return next();
  }
  try {
    const decoded = verifyAccessToken(token);
    const user = await User.findById(decoded.sub).select('-passwordHash');
    if (user) {
      req.user = user;
    }
  } catch {
    // Ignore expired optional tokens so public endpoints remain accessible
  }
  return next();
});
