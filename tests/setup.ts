// Test setup file - runs before all tests
import { beforeAll, afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';
import '@testing-library/jest-dom';

beforeAll(() => {
  // Set test environment variables
  process.env.JWT_SECRET = 'test-secret-key-12345';
  process.env.NODE_ENV = 'test';
  process.env.REDIS_URL = ''; // Disable Redis for tests
  
  // Setup global window mock
  (global as any).window = {
    ethereum: undefined,
  };
});

afterEach(() => {
  cleanup();
  // Reset window.ethereum
  (global as any).window = {
    ethereum: undefined,
  };
});
