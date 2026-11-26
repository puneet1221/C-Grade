import { AppError } from '../utils/AppError.js';

/**
 * Validates req.body against a Zod schema and replaces req.body with parsed data.
 * Strips unknown keys to prevent mass-assignment or operator injection.
 * @param {import('zod').ZodSchema} schema
 * @returns {import('express').RequestHandler}
 */
export function validateBody(schema) {
  return function validateMiddleware(req, _res, next) {
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      const details = parsed.error.issues.map((issue) => ({
        field: issue.path.join('.'),
        message: issue.message,
      }));
      return next(new AppError(details[0]?.message || 'Validation failed', 400, details));
    }
    req.body = parsed.data;
    return next();
  };
}
