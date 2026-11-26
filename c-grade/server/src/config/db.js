import fs from 'node:fs';
import path from 'node:path';
import mongoose from 'mongoose';
import { env } from './env.js';

let memoryServer = null;

/**
 * Connects Mongoose to MONGODB_URI when configured, or falls back to an
 * embedded local MongoDB instance via mongodb-memory-server so the full
 * Mongoose ODM works out-of-the-box without manual database setup.
 * @returns {Promise<import('mongoose').Connection>}
 */
export async function connectDB() {
  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  let uri = env.MONGODB_URI;

  if (!uri) {
    const { MongoMemoryServer } = await import('mongodb-memory-server');
    const dbPath = path.resolve(process.cwd(), '.mongodb-data');
    fs.mkdirSync(dbPath, { recursive: true });

    memoryServer = await MongoMemoryServer.create({
      instance: {
        dbName: 'c-grade',
        dbPath,
        storageEngine: 'wiredTiger',
      },
    });
    uri = memoryServer.getUri('c-grade');
    console.log('[DB] Using embedded local MongoDB instance');
  }

  await mongoose.connect(uri);
  console.log('[DB] Connected to MongoDB');
  return mongoose.connection;
}

/**
 * Gracefully closes Mongoose and any embedded MongoDB process.
 */
export async function disconnectDB() {
  await mongoose.disconnect();
  if (memoryServer) {
    await memoryServer.stop();
    memoryServer = null;
  }
}
