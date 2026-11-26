import crypto from 'node:crypto';
import dotenv from 'dotenv';

dotenv.config();

// Ephemeral in-memory fallback secrets prevent insecure hardcoded fallback strings
// when running locally without a populated .env file.
const runtimeAccessSecret = crypto.randomBytes(64).toString('hex');
const runtimeRefreshSecret = crypto.randomBytes(64).toString('hex');

/**
 * Centralized environment configuration for the C-Grade backend.
 */
export const env = {
  PORT: Number(process.env.PORT) || 5000,
  NODE_ENV: process.env.NODE_ENV || 'development',
  MONGODB_URI: process.env.MONGODB_URI || '',
  CLIENT_URL: process.env.CLIENT_URL || 'http://localhost:3000',
  APP_URL: process.env.APP_URL || '',
  JWT_ACCESS_SECRET: process.env.JWT_ACCESS_SECRET || runtimeAccessSecret,
  JWT_REFRESH_SECRET:
    process.env.JWT_REFRESH_SECRET || process.env.JWT_REFRESH_TOKEN || runtimeRefreshSecret,
  TMDB_API_KEY: process.env.TMDB_API_KEY || '',
  GMAIL_USER: process.env.GMAIL_USER || '',
  GMAIL_APP_PASSWORD: process.env.GMAIL_APP_PASSWORD || '',
};
