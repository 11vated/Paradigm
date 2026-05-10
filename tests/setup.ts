// Test setup file - runs before all tests
import { beforeAll } from 'vitest';

beforeAll(() => {
  // Set test environment variables
  process.env.JWT_SECRET = 'test-secret-key-12345';
  process.env.NODE_ENV = 'test';
  process.env.REDIS_URL = ''; // Disable Redis for tests
});
