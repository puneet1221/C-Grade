import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import mongoSanitize from 'express-mongo-sanitize';
import helmet from 'helmet';
import { env } from './config/env.js';
import { errorHandler } from './middlewares/errorHandler.js';
import { apiLimiter } from './middlewares/rateLimiter.js';
import v1Routes from './routes/index.js';
import { AppError } from './utils/AppError.js';

/**
 * Configures and exports the Express application instance without binding a port,
 * enabling reuse across standalone server.js, AI Studio runner, and tests.
 */
export function createApp() {
  const app = express();

  app.set('trust proxy', 1);

  // Allow iframe embedding, external media assets, and YouTube embed Referer verification
  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginEmbedderPolicy: false,
      frameguard: false,
      referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
    })
  );

  const allowedOrigins = new Set(
    [env.CLIENT_URL, env.APP_URL, 'http://localhost:3000', 'http://localhost:5173'].filter(Boolean)
  );

  app.use(
    cors({
      origin(origin, callback) {
        if (
          !origin ||
          allowedOrigins.has(origin) ||
          /^https:\/\/[a-z0-9-]+\.(?:[a-z0-9-]+\.)?run\.app$/i.test(origin) ||
          /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(origin)
        ) {
          return callback(null, true);
        }
        return callback(new AppError('Origin not allowed by CORS policy.', 403));
      },
      credentials: true,
    })
  );

  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));
  app.use(cookieParser());
  app.use(mongoSanitize());

  app.use('/api/v1', apiLimiter, v1Routes);

  app.use('/api/*', (req, _res, next) => {
    next(new AppError(`API route not found: ${req.originalUrl}`, 404));
  });

  app.use(errorHandler);

  return app;
}
