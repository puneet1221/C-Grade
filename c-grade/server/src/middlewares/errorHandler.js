import { env } from '../config/env.js';

/**
 * Centralized Express error-handling middleware translating operational,
 * Mongoose, and validation errors into C-Grade's standardized JSON envelope.
 * @param {Error & { statusCode?: number, code?: number, keyValue?: object, errors?: unknown }} err
 * @param {import('express').Request} _req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} _next
 */
export function errorHandler(err, _req, res, _next) {
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal server error';
  let errors = err.errors;

  if (err.name === 'CastError') {
    statusCode = 400;
    message = 'Invalid resource identifier format.';
  } else if (err.code === 11000) {
    statusCode = 409;
    const duplicateField = Object.keys(err.keyValue || {})[0] || 'field';
    message = `An account or record with that ${duplicateField} already exists.`;
  } else if (err.name === 'ValidationError' && err.errors) {
    statusCode = 400;
    const firstKey = Object.keys(err.errors)[0];
    message = err.errors[firstKey]?.message || 'Validation failed.';
  } else if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Authentication session expired or invalid.';
  }

  if (statusCode >= 500 && env.NODE_ENV !== 'test') {
    console.error('[ServerError]', err);
  }

  const payload = {
    success: false,
    message,
    data: null,
  };

  if (errors !== undefined) {
    payload.errors = errors;
  }

  return res.status(statusCode).json(payload);
}
