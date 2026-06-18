/**
 * Rate Limiting Tests
 * 
 * Tests for rate limiting middleware to prevent abuse and DoS attacks
 * Covers request counting, window expiration, and Redis fallback
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createRateLimiter } from '../../src/lib/auth/rate-limit.js';

// Mock Express request/response/next
function createMockReq(ip: string = '127.0.0.1') {
  return { ip };
}

function createMockRes() {
  const res: any = {
    statusCode: 200,
    headers: {} as Record<string, string>,
    status(code: number) {
      res.statusCode = code;
      return res;
    },
    json(data: any) {
      res.jsonData = data;
      return res;
    },
    setHeader(name: string, value: string) {
      res.headers[name] = value;
      return res;
    },
  };
  return res;
}

function createMockNext() {
  let called = false;
  const next = () => { called = true; };
  (next as any).wasCalled = () => called;
  return next as any;
}

describe('Rate Limiting', () => {
  describe('Basic Rate Limiting', () => {
    it('allows requests under the limit', async () => {
      const limiter = createRateLimiter({ limit: 5, windowMs: 60000 });
      const req = createMockReq('192.168.1.1');
      
      // Make 5 requests (all should pass)
      for (let i = 0; i < 5; i++) {
        const res = createMockRes();
        const next = createMockNext();
        
        await limiter(req as any, res as any, next);
        
        expect(next.wasCalled()).toBe(true);
        expect(res.statusCode).toBe(200);
      }
    });

    it('blocks requests over the limit', async () => {
      const limiter = createRateLimiter({ limit: 3, windowMs: 60000 });
      const req = createMockReq('192.168.1.2');
      
      let blockedCount = 0;
      
      // Make 10 requests (first 3 should pass, rest should be blocked)
      for (let i = 0; i < 10; i++) {
        const res = createMockRes();
        const next = createMockNext();
        
        await limiter(req as any, res as any, next);
        
        if (res.statusCode === 429) {
          blockedCount++;
        }
      }
      
      expect(blockedCount).toBeGreaterThan(0);
      expect(blockedCount).toBeLessThanOrEqual(7); // At least some blocked
    });

    it('returns 429 status code when rate limited', async () => {
      const limiter = createRateLimiter({ limit: 2, windowMs: 60000 });
      const req = createMockReq('192.168.1.3');
      
      // Exhaust the limit
      for (let i = 0; i < 2; i++) {
        await limiter(req as any, createMockRes() as any, createMockNext());
      }
      
      // Next request should be blocked
      const res = createMockRes();
      const next = createMockNext();
      await limiter(req as any, res as any, next);
      
      expect(res.statusCode).toBe(429);
      expect(next.wasCalled()).toBe(false);
    });

    it('includes error message in rate limit response', async () => {
      const limiter = createRateLimiter({ limit: 1, windowMs: 60000 });
      const req = createMockReq('192.168.1.4');
      
      // Exhaust limit
      await limiter(req as any, createMockRes() as any, createMockNext());
      
      // Get blocked response
      const res = createMockRes();
      await limiter(req as any, res as any, createMockNext());
      
      expect(res.jsonData).toBeTruthy();
      expect(res.jsonData.error).toBe('Too Many Requests');
      expect(res.jsonData.message).toContain('Rate limit exceeded');
    });

    it('includes Retry-After header when rate limited', async () => {
      const limiter = createRateLimiter({ limit: 1, windowMs: 60000 });
      const req = createMockReq('192.168.1.5');
      
      // Exhaust limit
      await limiter(req as any, createMockRes() as any, createMockNext());
      
      // Get blocked response
      const res = createMockRes();
      await limiter(req as any, res as any, createMockNext());
      
      expect(res.headers['Retry-After']).toBeTruthy();
      expect(parseInt(res.headers['Retry-After'])).toBeGreaterThan(0);
    });
  });

  describe('IP-Based Tracking', () => {
    it('tracks requests per IP address', async () => {
      const limiter = createRateLimiter({ limit: 2, windowMs: 60000 });
      
      const ip1 = '192.168.1.10';
      const ip2 = '192.168.1.11';
      
      // IP1 makes 2 requests (should pass)
      for (let i = 0; i < 2; i++) {
        const req = createMockReq(ip1);
        const res = createMockRes();
        const next = createMockNext();
        await limiter(req as any, res as any, next);
        expect(next.wasCalled()).toBe(true);
      }
      
      // IP2 makes 2 requests (should also pass - different IP)
      for (let i = 0; i < 2; i++) {
        const req = createMockReq(ip2);
        const res = createMockRes();
        const next = createMockNext();
        await limiter(req as any, res as any, next);
        expect(next.wasCalled()).toBe(true);
      }
      
      // IP1 makes another request (should be blocked)
      const req1 = createMockReq(ip1);
      const res1 = createMockRes();
      const next1 = createMockNext();
      await limiter(req1 as any, res1 as any, next1);
      expect(res1.statusCode).toBe(429);
    });

    it('handles missing IP address', async () => {
      const limiter = createRateLimiter({ limit: 5, windowMs: 60000 });
      const req = createMockReq(undefined as any);
      const res = createMockRes();
      const next = createMockNext();
      
      await limiter(req as any, res as any, next);
      
      // Should not crash, should use fallback key
      expect(next.wasCalled()).toBe(true);
    });
  });

  describe('Time Window', () => {
    it('resets count after window expires', async () => {
      const windowMs = 100; // 100ms window for testing
      const limiter = createRateLimiter({ limit: 2, windowMs });
      const req = createMockReq('192.168.1.20');
      
      // Exhaust limit
      for (let i = 0; i < 2; i++) {
        await limiter(req as any, createMockRes() as any, createMockNext());
      }
      
      // Should be blocked
      const res1 = createMockRes();
      await limiter(req as any, res1 as any, createMockNext());
      expect(res1.statusCode).toBe(429);
      
      // Wait for window to expire
      await new Promise(resolve => setTimeout(resolve, windowMs + 50));
      
      // Should be allowed again
      const res2 = createMockRes();
      const next2 = createMockNext();
      await limiter(req as any, res2 as any, next2);
      expect(next2.wasCalled()).toBe(true);
    });

    it('uses sliding window (not fixed window)', async () => {
      const windowMs = 200;
      const limiter = createRateLimiter({ limit: 3, windowMs });
      const req = createMockReq('192.168.1.21');
      
      // Make 3 requests over time
      await limiter(req as any, createMockRes() as any, createMockNext());
      await new Promise(resolve => setTimeout(resolve, 50));
      await limiter(req as any, createMockRes() as any, createMockNext());
      await new Promise(resolve => setTimeout(resolve, 50));
      await limiter(req as any, createMockRes() as any, createMockNext());
      
      // Should be blocked (3 requests in window)
      const res1 = createMockRes();
      await limiter(req as any, res1 as any, createMockNext());
      expect(res1.statusCode).toBe(429);
      
      // Wait for first request to expire
      await new Promise(resolve => setTimeout(resolve, 150));
      
      // Should be allowed (oldest request expired)
      const res2 = createMockRes();
      const next2 = createMockNext();
      await limiter(req as any, res2 as any, next2);
      expect(next2.wasCalled()).toBe(true);
    });
  });

  describe('Configuration', () => {
    it('respects custom limit', async () => {
      const limiter = createRateLimiter({ limit: 10, windowMs: 60000 });
      const req = createMockReq('192.168.1.30');
      
      // Make 10 requests (all should pass)
      for (let i = 0; i < 10; i++) {
        const res = createMockRes();
        const next = createMockNext();
        await limiter(req as any, res as any, next);
        expect(next.wasCalled()).toBe(true);
      }
      
      // 11th request should be blocked
      const res = createMockRes();
      await limiter(req as any, res as any, createMockNext());
      expect(res.statusCode).toBe(429);
    });

    it('respects custom window', async () => {
      const windowMs = 50;
      const limiter = createRateLimiter({ limit: 1, windowMs });
      const req = createMockReq('192.168.1.31');
      
      // First request
      await limiter(req as any, createMockRes() as any, createMockNext());
      
      // Second request (should be blocked)
      const res1 = createMockRes();
      await limiter(req as any, res1 as any, createMockNext());
      expect(res1.statusCode).toBe(429);
      
      // Wait for window
      await new Promise(resolve => setTimeout(resolve, windowMs + 10));
      
      // Should be allowed
      const res2 = createMockRes();
      const next2 = createMockNext();
      await limiter(req as any, res2 as any, next2);
      expect(next2.wasCalled()).toBe(true);
    });

    it('uses custom key prefix', async () => {
      const limiter1 = createRateLimiter({ limit: 1, windowMs: 60000, keyPrefix: 'api:' });
      const limiter2 = createRateLimiter({ limit: 1, windowMs: 60000, keyPrefix: 'auth:' });
      const req = createMockReq('192.168.1.32');
      
      // Exhaust limiter1
      await limiter1(req as any, createMockRes() as any, createMockNext());
      
      // limiter2 should still allow (different prefix)
      const res = createMockRes();
      const next = createMockNext();
      await limiter2(req as any, res as any, next);
      expect(next.wasCalled()).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    it('handles concurrent requests from same IP', async () => {
      const limiter = createRateLimiter({ limit: 5, windowMs: 60000 });
      const req = createMockReq('192.168.1.40');
      
      // Make 10 concurrent requests
      const promises = Array.from({ length: 10 }, () => {
        const res = createMockRes();
        const next = createMockNext();
        return limiter(req as any, res as any, next).then(() => res);
      });
      
      const results = await Promise.all(promises);
      const blocked = results.filter(r => r.statusCode === 429).length;
      const allowed = results.filter(r => r.statusCode === 200).length;
      
      // Should allow ~5 and block ~5
      expect(allowed).toBeGreaterThan(0);
      expect(blocked).toBeGreaterThan(0);
      expect(allowed + blocked).toBe(10);
    });

    it('handles very high limits', async () => {
      const limiter = createRateLimiter({ limit: 1000, windowMs: 60000 });
      const req = createMockReq('192.168.1.41');
      
      // Make 100 requests (all should pass)
      for (let i = 0; i < 100; i++) {
        const res = createMockRes();
        const next = createMockNext();
        await limiter(req as any, res as any, next);
        expect(next.wasCalled()).toBe(true);
      }
    });

    it('handles very short windows', async () => {
      const limiter = createRateLimiter({ limit: 2, windowMs: 10 });
      const req = createMockReq('192.168.1.42');
      
      // Make 2 requests
      await limiter(req as any, createMockRes() as any, createMockNext());
      await limiter(req as any, createMockRes() as any, createMockNext());
      
      // Should be blocked
      const res1 = createMockRes();
      await limiter(req as any, res1 as any, createMockNext());
      expect(res1.statusCode).toBe(429);
      
      // Wait for window
      await new Promise(resolve => setTimeout(resolve, 20));
      
      // Should be allowed
      const res2 = createMockRes();
      const next2 = createMockNext();
      await limiter(req as any, res2 as any, next2);
      expect(next2.wasCalled()).toBe(true);
    });
  });

  describe('In-Memory Fallback', () => {
    it('works without Redis connection', async () => {
      // Rate limiter should fall back to in-memory storage
      const limiter = createRateLimiter({ limit: 3, windowMs: 60000 });
      const req = createMockReq('192.168.1.50');
      
      // Make requests
      for (let i = 0; i < 3; i++) {
        const res = createMockRes();
        const next = createMockNext();
        await limiter(req as any, res as any, next);
        expect(next.wasCalled()).toBe(true);
      }
      
      // Should be blocked
      const res = createMockRes();
      await limiter(req as any, res as any, createMockNext());
      expect(res.statusCode).toBe(429);
    });
  });
});

// Made with Bob
