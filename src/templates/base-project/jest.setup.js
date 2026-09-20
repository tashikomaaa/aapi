/**
 * Jest setup file
 * Runs before every test file.
 *
 * Spins up an in-memory MongoDB so the generated model/resolver tests can run
 * without a local database. If `mongodb-memory-server` is not installed, it
 * falls back to MONGODB_URI_TEST (or MONGODB_URI) from the environment.
 */

import { afterAll, afterEach, beforeAll } from '@jest/globals';
import dotenv from 'dotenv';
import mongoose from 'mongoose';

// Load test environment variables
dotenv.config({ path: '.env.test' });

process.env.NODE_ENV = 'test';

let mongoServer;

beforeAll(async () => {
  let uri = process.env.MONGODB_URI_TEST || process.env.MONGODB_URI;

  try {
    const { MongoMemoryServer } = await import('mongodb-memory-server');
    mongoServer = await MongoMemoryServer.create();
    uri = mongoServer.getUri();
  } catch {
    if (!uri) {
      throw new Error(
        'No test database available. Install mongodb-memory-server (npm i -D mongodb-memory-server) ' +
          'or set MONGODB_URI_TEST in .env.test'
      );
    }
  }

  await mongoose.connect(uri);
});

afterEach(async () => {
  if (mongoose.connection.readyState !== 1) return;

  const collections = Object.values(mongoose.connection.collections);
  await Promise.all(collections.map((collection) => collection.deleteMany({})));
});

afterAll(async () => {
  await mongoose.disconnect();
  if (mongoServer) {
    await mongoServer.stop();
  }
});
