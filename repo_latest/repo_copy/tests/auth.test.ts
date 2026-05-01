/**
 * Unit tests for JWT auth, password hashing, and rate limiting
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { registerUser, loginUser, createRateLimiter } from '../src/lib/auth/index.js';
import fs from 'fs';
import path from 'path';

// Clean up user data between tests
const USERS_FILE = path.join(process.cwd(), 'data', 'users.json');

function clearUsers() {
  try {
    if (fs.existsSync(USERS_FILE)) fs.unlinkSync(USERS_FILE);
  } catch {}
}

describe('Auth Module', () => {
  describe('registerUser', () => {
    beforeEach(clearUsers);

    it('registers a new user and returns token', () => {
      const result = registerUser('testuser', 'password123');
      expect(result).not.toHaveProperty('error');
      expect(result).toHaveProperty('token');
      expect(result).toHaveProperty('user');
      if ('user' in result) {
        expect(result.user.username).toBe('testuser');
        expect(result.user.role).toBe('admin'); // first user is admin
      }
    });

    it('rejects duplicate username', () => {
      registerUser('dupe', 'pass1');
      const result = registerUser('dupe', 'pass2');
      expect(result).toHaveProperty('error');
    });

    it('second user gets user role', () => {
      registerUser('admin1', 'pass');
      const result = registerUser('user2', 'pass');
      if ('user' in result) {
        expect(result.user.role).toBe('user');
      }
    });
  });

  describe('loginUser', () => {
    beforeEach(clearUsers);

    it('logs in with correct credentials', () => {
      registerUser('logintest', 'mypassword');
      const result = loginUser('logintest', 'mypassword');
      expect(result).toHaveProperty('token');
      expect(result).not.toHaveProperty('error');
    });

    it('rejects wrong password', () => {
      registerUser('logintest2', 'correct');
      const result = loginUser('logintest2', 'wrong');
      expect(result).toHaveProperty('error');
    });

    it('rejects non-existent user', () => {
      const result = loginUser('nobody', 'pass');
      expect(result).toHaveProperty('error');
    });
  });

  describe('createRateLimiter', () => {
    it('allows requests under the limit', () => {
      const limiter = createRateLimiter(60000, 5);
      // Simulate 5 requests from same IP
      const mockReq = { ip: '127.0.0.1' };
      const mockRes = {
        status: (code: number) => ({ json: () => {} }),
      };
      let blocked = false;
      const mockNext = () => {};

      for (let i = 0; i < 5; i++) {
        let wasBlocked = false;
        const res = {
          status: (code: number) => {
            if (code === 429) wasBlocked = true;
            return { json: () => {} };
          },
        };
        limiter(mockReq as any, res as any, mockNext);
        if (wasBlocked) blocked = true;
      }
      expect(blocked).toBe(false);
    });

    it('blocks requests over the limit', () => {
      const limiter = createRateLimiter(60000, 3);
      const mockReq = { ip: '192.168.1.1' };
      let blockedCount = 0;

      for (let i = 0; i < 10; i++) {
        let wasBlocked = false;
        const res = {
          status: (code: number) => {
            if (code === 429) wasBlocked = true;
            return { json: () => {} };
          },
        };
        limiter(mockReq as any, res as any, () => {});
        if (wasBlocked) blockedCount++;
      }
      expect(blockedCount).toBeGreaterThan(0);
    });

    it('allows different IPs independently', () => {
      const limiter = createRateLimiter(60000, 2);

      // Max out IP A
      for (let i = 0; i < 3; i++) {
        limiter({ ip: '10.0.0.1' } as any, { status: () => ({ json: () => {} }) } as any, () => {});
      }

      // IP B should still work
      let bBlocked = false;
      limiter(
        { ip: '10.0.0.2' } as any,
        { status: (code: number) => { if (code === 429) bBlocked = true; return { json: () => {} }; } } as any,
        () => {},
      );
      expect(bBlocked).toBe(false);
    });
  });
});
