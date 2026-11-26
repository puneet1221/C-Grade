import { AppError } from '../utils/AppError.js';

/**
 * Restricts route access to users whose role matches one of the permitted roles.
 * @param {...('user'|'critic'|'admin')} allowedRoles
 * @returns {import('express').RequestHandler}
 */
export function requireRole(...allowedRoles) {
  return function roleMiddleware(req, _res, next) {
    if (!req.user) {
      return next(new AppError('Authentication required.', 401));
    }
    if (!allowedRoles.includes(req.user.role)) {
      return next(new AppError('You do not have permission to perform this action.', 403));
    }
    return next();
  };
}
