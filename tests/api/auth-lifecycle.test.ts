/**
 * Integration tests for the full authentication lifecycle:
 * JWT token issuance, refresh, revocation, RBAC, and rate limiting.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import {
  registerUser, loginUser, verifyTokenRaw, requireAuth, optionalAuth,
  refreshAccessToken, revokeToken, requireRole, createRateLimiter,
} from '../../src/lib/auth/index.js';
import fs from 'fs';
import path from 'path';

const USERS_FILE = path.join(process.cwd(), 'data', 'users.json');

function clearUsers() {
  try { if (fs.existsSync(USERS_FILE)) fs.unlinkSync(USERS_FILE); } catch {}
}

// ─── Token Lifecycle ────────────────────────────────────────────────────────

describe('Auth Token Lifecycle', () => {
  beforeEach(clearUsers);

  it('register returns access + refresh tokens', () => {
    const result = registerUser('lifecycle_user', 'password123');
    expect(result).toHaveProperty('token');
    expect(result).toHaveProperty('refreshToken');
    expect(result).toHaveProperty('expiresIn');
    if ('token' in result) {
      expect(typeof result.token).toBe('string');
      expect(typeof result.refreshToken).toBe('string');
    }
  });

  it('login returns access + refresh tokens', () => {
    registerUser('loginlife', 'password123');
    const result = loginUser('loginlife', 'password123');
    expect(result).toHaveProperty('token');
    expect(result).toHaveProperty('refreshToken');
  });

  it('access token is verifiable', () => {
    const result = registerUser('verify_user', 'password123');
    if ('token' in result) {
      const payload = verifyTokenRaw(result.token);
      expect(payload).toBeTruthy();
      expect(payload!.username).toBe('verify_user');
      expect(payload!.type).toBe('access');
    }
  });

  it('refresh token generates new token pair', () => {
    const result = registerUser('refresh_user', 'password123');
    if ('refreshToken' in result) {
      const refreshed = refreshAccessToken(result.refreshToken);
      expect(refreshed).not.toHaveProperty('error');
      if ('token' in refreshed) {
        expect(refreshed.token).not.toBe(result.token);
        expect(refreshed.refreshToken).toBeTruthy();
        // New access token should be valid
        const payload = verifyTokenRaw(refreshed.token);
        expect(payload).toBeTruthy();
      }
    }
  });

  it('refresh token is single-use (rotation)', () => {
    const result = registerUser('rotate_user', 'password123');
    if ('refreshToken' in result) {
      // First refresh succeeds
      const first = refreshAccessToken(result.refreshToken);
      expect(first).not.toHaveProperty('error');

      // Second refresh with same token fails (already consumed)
      const second = refreshAccessToken(result.refreshToken);
      expect(second).toHaveProperty('error');
    }
  });

  it('revokeToken invalidates access token', () => {
    const result = registerUser('revoke_user', 'password123');
    if ('token' in result) {
      // Token is valid before revocation
      expect(verifyTokenRaw(result.token)).toBeTruthy();

      // Revoke it
      revokeToken(result.token);

      // Now it should be invalid
      expect(verifyTokenRaw(result.token)).toBeNull();
    }
  });
});

// ─── RBAC (Role-Based Access Control) ────────────────────────────────────────

describe('RBAC - requireRole', () => {
  beforeEach(clearUsers);

  it('first registered user gets admin role', () => {
    const result = registerUser('admin1', 'password123');
    if ('user' in result) {
      expect(result.user.role).toBe('admin');
    }
  });

  it('subsequent users get user role', () => {
    registerUser('admin_first', 'pass1');
    const result = registerUser('regular_user', 'pass2');
    if ('user' in result) {
      expect(result.user.role).toBe('user');
    }
  });

  it('requireRole middleware allows matching role', () => {
    const middleware = requireRole('admin');
    const req: any = { user: { role: 'admin', sub: 'test' } };
    const res: any = { status: () => ({ json: () => {} }) };
    let called = false;
    middleware(req, res, () => { called = true; });
    expect(called).toBe(true);
  });

  it('requireRole middleware blocks non-matching role', () => {
    const middleware = requireRole('admin');
    const req: any = { user: { role: 'user', sub: 'test' } };
    let statusCode = 0;
    const res: any = {
      status: (code: number) => {
        statusCode = code;
        return { json: () => {} };
      },
    };
    let called = false;
    middleware(req, res, () => { called = true; });
    expect(called).toBe(false);
    expect(statusCode).toBe(403);
  });

  it('requireRole accepts multiple roles', () => {
    const middleware = requireRole('admin', 'moderator');
    const req: any = { user: { role: 'moderator', sub: 'test' } };
    const res: any = { status: () => ({ json: () => {} }) };
    let called = false;
    middleware(req, res, () => { called = true; });
    expect(called).toBe(true);
  });
});

// ─── requireAuth Middleware ──────────────────────────────────────────────────

describe('requireAuth Middleware', () => {
  beforeEach(clearUsers);

  it('passes with valid Bearer token', () => {
    const result = registerUser('auth_mid', 'password123');
    if ('token' in result) {
      const req: any = {
        headers: { authorization: `Bearer ${result.token}` },
        get(name: string) { return this.headers[name.toLowerCase()]; },
      };
      const res: any = { status: () => ({ json: () => {} }) };
      let called = false;
      requireAuth(req, res, () => { called = true; });
      expect(called).toBe(true);
      expect(req.user).toBeTruthy();
      expect(req.user.username).toBe('auth_mid');
    }
  });

  it('rejects request without token', () => {
    const req: any = {
      headers: {},
      get(name: string) { return this.headers[name.toLowerCase()]; },
    };
    let statusCode = 0;
    const res: any = {
      status: (code: number) => {
        statusCode = code;
        return { json: () => {} };
      },
    };
    let called = false;
    requireAuth(req, res, () => { called = true; });
    expect(called).toBe(false);
    expect(statusCode).toBe(401);
  });

  it('rejects invalid token', () => {
    const req: any = {
      headers: { authorization: 'Bearer totally.invalid.token' },
      get(name: string) { return this.headers[name.toLowerCase()]; },
    };
    let statusCode = 0;
    const res: any = {
      status: (code: number) => {
        statusCode = code;
        return { json: () => {} };
      },
    };
    let called = false;
    requireAuth(req, res, () => { called = true; });
    expect(called).toBe(false);
    expect(statusCode).toBe(401);
  });
});

// ─── optionalAuth Middleware ─────────────────────────────────────────────────

describe('optionalAuth Middleware', () => {
  beforeEach(clearUsers);

  it('attaches user when token is present', () => {
    const result = registerUser('opt_user', 'password123');
    if ('token' in result) {
      const req: any = {
        headers: { authorization: `Bearer ${result.token}` },
        get(name: string) { return this.headers[name.toLowerCase()]; },
      };
      const res: any = {};
      let called = false;
      optionalAuth(req, res, () => { called = true; });
      expect(called).toBe(true);
      expect(req.user).toBeTruthy();
    }
  });

  it('continues without user when no token', () => {
    const req: any = {
      headers: {},
      get(name: string) { return this.headers[name.toLowerCase()]; },
    };
    const res: any = {};
    let called = false;
    optionalAuth(req, res, () => { called = true; });
    expect(called).toBe(true);
    expect(req.user).toBeUndefined();
  });
});

// ─── Rate Limiter ────────────────────────────────────────────────────────────

describe('Rate Limiter', () => {
  it('tracks per-IP limits', () => {
    const limiter = createRateLimiter(60000, 3);
    const results: boolean[] = [];

    for (let i = 0; i < 5; i++) {
      let blocked = false;
      limiter(
        { ip: '1.2.3.4' } as any,
        {
          status: (code: number) => {
            if (code === 429) blocked = true;
            return { json: () => {} };
          },
          setHeader: () => {},
        } as any,
        () => {},
      );
      results.push(blocked);
    }

    // First 3 should pass, rest should be blocked
    expect(results[0]).toBe(false);
    expect(results[1]).toBe(false);
    expect(results[2]).toBe(false);
    expect(results[3]).toBe(true);
    expect(results[4]).toBe(true);
  });
});
