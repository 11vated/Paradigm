/**
 * Production Security Middleware
 * 
 * Implements comprehensive security headers for production deployment.
 * Based on OWASP security best practices and forensic analysis recommendations.
 * 
 * Phase 12.1: Production CSP Headers
 * Date: 2026-06-18
 */

import type { Request, Response, NextFunction } from 'express';

/**
 * Content Security Policy configuration
 * 
 * Note: Three.js and WebGPU require 'unsafe-eval' for shader compilation.
 * This is a known limitation of WebGL/WebGPU and cannot be avoided.
 * The risk is mitigated by:
 * 1. All user code runs through SafeGeneExecutor validation
 * 2. No user-provided scripts are executed directly
 * 3. CSP restricts script sources to 'self' only
 */
const CSP_DIRECTIVES = {
  development: {
    'default-src': ["'self'"],
    'script-src': ["'self'", "'unsafe-inline'", "'unsafe-eval'"], // Dev: HMR needs unsafe-inline
    'style-src': ["'self'", "'unsafe-inline'"],
    'img-src': ["'self'", 'data:', 'blob:', 'https:'],
    'connect-src': ["'self'", 'ws:', 'wss:', 'https:'],
    'font-src': ["'self'", 'data:'],
    'frame-ancestors': ["'none'"],
    'base-uri': ["'self'"],
    'form-action': ["'self'"],
  },
  production: {
    'default-src': ["'self'"],
    'script-src': ["'self'", "'unsafe-eval'"], // Three.js/WebGPU requirement
    'style-src': ["'self'", "'unsafe-inline'"], // Radix UI inline styles
    'img-src': ["'self'", 'data:', 'blob:'],
    'connect-src': ["'self'", 'wss:', 'https:'],
    'font-src': ["'self'", 'data:'],
    'frame-ancestors': ["'none'"],
    'base-uri': ["'self'"],
    'form-action': ["'self'"],
    'upgrade-insecure-requests': [],
  },
};

/**
 * Build CSP header string from directives
 */
function buildCSP(directives: Record<string, string[]>): string {
  return Object.entries(directives)
    .map(([key, values]) => {
      if (values.length === 0) return key;
      return `${key} ${values.join(' ')}`;
    })
    .join('; ');
}

/**
 * Production security headers middleware
 * 
 * Applies comprehensive security headers in production mode.
 * In development, uses relaxed CSP to support HMR and debugging.
 */
export function productionSecurityHeaders(req: Request, res: Response, next: NextFunction): void {
  const isProd = process.env.NODE_ENV === 'production';
  
  // Content Security Policy
  const cspDirectives = isProd ? CSP_DIRECTIVES.production : CSP_DIRECTIVES.development;
  res.setHeader('Content-Security-Policy', buildCSP(cspDirectives));
  
  // Prevent clickjacking
  res.setHeader('X-Frame-Options', 'DENY');
  
  // Prevent MIME type sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');
  
  // Referrer policy
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // Permissions policy (restrict dangerous features)
  res.setHeader(
    'Permissions-Policy',
    'geolocation=(), microphone=(), camera=(), payment=(), usb=()'
  );
  
  // Strict Transport Security (HTTPS only in production)
  if (isProd) {
    res.setHeader(
      'Strict-Transport-Security',
      'max-age=31536000; includeSubDomains; preload'
    );
  }
  
  // X-XSS-Protection (legacy, but doesn't hurt)
  res.setHeader('X-XSS-Protection', '1; mode=block');
  
  next();
}

/**
 * CORS configuration for production
 * 
 * Restricts cross-origin requests to trusted domains only.
 */
export function productionCORS(req: Request, res: Response, next: NextFunction): void {
  const isProd = process.env.NODE_ENV === 'production';
  
  if (isProd) {
    const allowedOrigins = (process.env.ALLOWED_ORIGINS || '').split(',').filter(Boolean);
    const origin = req.headers.origin;
    
    if (origin && allowedOrigins.includes(origin)) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Access-Control-Allow-Credentials', 'true');
    }
  } else {
    // Development: allow all origins
    res.setHeader('Access-Control-Allow-Origin', '*');
  }
  
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  // Handle preflight
  if (req.method === 'OPTIONS') {
    res.sendStatus(204);
    return;
  }
  
  next();
}

/**
 * Rate limiting headers
 * 
 * Adds rate limit information to response headers for client visibility.
 */
export function rateLimitHeaders(limit: number, remaining: number, reset: number) {
  return (req: Request, res: Response, next: NextFunction): void => {
    res.setHeader('X-RateLimit-Limit', limit.toString());
    res.setHeader('X-RateLimit-Remaining', remaining.toString());
    res.setHeader('X-RateLimit-Reset', reset.toString());
    next();
  };
}

/**
 * Security audit logging
 * 
 * Logs security-relevant events for monitoring and incident response.
 */
export function securityAuditLog(event: string, details: Record<string, any>) {
  const timestamp = new Date().toISOString();
  const logEntry = {
    timestamp,
    event,
    ...details,
  };
  
  // In production, this should go to a security log aggregator
  if (process.env.NODE_ENV === 'production') {
    console.log('[SECURITY]', JSON.stringify(logEntry));
  } else {
    console.log('[SECURITY]', event, details);
  }
}

/**
 * Request sanitization
 * 
 * Sanitizes request inputs to prevent injection attacks.
 */
export function sanitizeRequest(req: Request, res: Response, next: NextFunction): void {
  // Remove null bytes from all string inputs
  const sanitizeValue = (value: any): any => {
    if (typeof value === 'string') {
      return value.replace(/\0/g, '');
    }
    if (Array.isArray(value)) {
      return value.map(sanitizeValue);
    }
    if (value && typeof value === 'object') {
      return Object.fromEntries(
        Object.entries(value).map(([k, v]) => [k, sanitizeValue(v)])
      );
    }
    return value;
  };
  
  if (req.body) {
    req.body = sanitizeValue(req.body);
  }
  if (req.query) {
    req.query = sanitizeValue(req.query);
  }
  if (req.params) {
    req.params = sanitizeValue(req.params);
  }
  
  next();
}

/**
 * Apply all security middleware
 * 
 * Convenience function to apply all security middleware at once.
 */
export function applySecurityMiddleware(app: any): void {
  app.use(productionSecurityHeaders);
  app.use(productionCORS);
  app.use(sanitizeRequest);
  
  console.log('[SECURITY] Security middleware applied');
}

// Made with Bob
