/**
 * Zero-dependency CORS and security header middleware.
 * Replaces cors + helmet npm packages — consistent with the project's
 * "zero external dependency for core" philosophy.
 */
import type { Request, Response, NextFunction } from 'express';

// ═══════════════════════════════════════════════════════════════════════════
// CORS MIDDLEWARE
// ═══════════════════════════════════════════════════════════════════════════

export interface CorsOptions {
  origins: string[];           // Allowed origins ('*' for any)
  methods?: string[];          // Allowed methods
  allowedHeaders?: string[];   // Allowed request headers
  exposedHeaders?: string[];   // Headers exposed to browser
  credentials?: boolean;       // Allow credentials (cookies, auth)
  maxAge?: number;             // Preflight cache (seconds)
}

const DEFAULT_CORS: CorsOptions = {
  origins: [
    'http://localhost:3000',
    'http://localhost:5173',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:5173',
  ],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['X-Request-Id'],
  credentials: true,
  maxAge: 86400,
};

export function corsMiddleware(opts: Partial<CorsOptions> = {}) {
  const config = { ...DEFAULT_CORS, ...opts };

  return (req: Request, res: Response, next: NextFunction) => {
    const origin = req.headers.origin || '';

    // Check if origin is allowed
    const allowed = config.origins.includes('*') || config.origins.includes(origin);
    if (allowed && origin) {
      res.setHeader('Access-Control-Allow-Origin', origin);
    }

    if (config.credentials) {
      res.setHeader('Access-Control-Allow-Credentials', 'true');
    }

    if (config.exposedHeaders?.length) {
      res.setHeader('Access-Control-Expose-Headers', config.exposedHeaders.join(', '));
    }

    // Handle preflight
    if (req.method === 'OPTIONS') {
      if (config.methods?.length) {
        res.setHeader('Access-Control-Allow-Methods', config.methods.join(', '));
      }
      if (config.allowedHeaders?.length) {
        res.setHeader('Access-Control-Allow-Headers', config.allowedHeaders.join(', '));
      }
      if (config.maxAge) {
        res.setHeader('Access-Control-Max-Age', String(config.maxAge));
      }
      res.status(204).end();
      return;
    }

    next();
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// SECURITY HEADERS MIDDLEWARE (equivalent to helmet defaults)
// ═══════════════════════════════════════════════════════════════════════════

export function securityHeaders() {
  return (_req: Request, res: Response, next: NextFunction) => {
    // Prevent MIME type sniffing
    res.setHeader('X-Content-Type-Options', 'nosniff');

    // Prevent clickjacking
    res.setHeader('X-Frame-Options', 'DENY');

    // XSS protection (legacy browsers)
    res.setHeader('X-XSS-Protection', '0');

    // Strict transport security (HTTPS)
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');

    // Referrer policy
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

    // Content security policy
    res.setHeader('Content-Security-Policy',
      "default-src 'self'; " +
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'; " +
      "style-src 'self' 'unsafe-inline'; " +
      "img-src 'self' data: blob:; " +
      "font-src 'self' data:; " +
      "connect-src 'self' ws://localhost:* wss://localhost:*; " +
      "worker-src 'self' blob:; " +
      "frame-ancestors 'none';"
    );

    // Remove powered-by header
    res.removeHeader('X-Powered-By');

    // Permissions policy
    res.setHeader('Permissions-Policy',
      'camera=(), microphone=(), geolocation=(), payment=()'
    );

    // Cross-origin policies
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
    res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');

    next();
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// REQUEST ID MIDDLEWARE
// ═══════════════════════════════════════════════════════════════════════════

export function requestId() {
  return (req: Request, res: Response, next: NextFunction) => {
    const id = req.headers['x-request-id'] as string || crypto.randomUUID();
    (req as any).requestId = id;
    res.setHeader('X-Request-Id', id);
    next();
  };
}

import crypto from 'crypto';
