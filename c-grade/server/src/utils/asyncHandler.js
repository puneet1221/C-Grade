/**
 * Wraps async Express route handlers and forwards rejected promises to next(err).
 * @param {Function} fn
 * @returns {import('express').RequestHandler}
 */
export function asyncHandler(fn) {
  return function wrappedHandler(req, res, next) {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
