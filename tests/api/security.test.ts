/**
 * Integration tests for security middleware and OpenAPI specification.
 * Tests CORS headers, security headers, request IDs, and spec completeness.
 */
import { describe, it, expect } from 'vitest';
import { OPENAPI_SPEC, swaggerUIHTML } from '../../src/lib/openapi/spec.js';
import { corsMiddleware, securityHeaders, requestId } from '../../src/lib/security/middleware.js';

// ─── Mock Express req/res/next for middleware testing ────────────────────────

function mockReq(overrides: Record<string, any> = {}): any {
  return {
    method: 'GET',
    headers: {},
    get(name: string) { return this.headers[name.toLowerCase()]; },
    ...overrides,
  };
}

function mockRes(): any {
  const res: any = {
    _headers: {} as Record<string, string>,
    _status: 200,
    _ended: false,
    _body: null,
    setHeader(name: string, val: string) { res._headers[name.toLowerCase()] = val; return res; },
    getHeader(name: string) { return res._headers[name.toLowerCase()]; },
    removeHeader(name: string) { delete res._headers[name.toLowerCase()]; },
    status(code: number) { res._status = code; return res; },
    end() { res._ended = true; },
    json(data: any) { res._body = data; res._ended = true; },
  };
  // Alias set → setHeader for compatibility
  res.set = res.setHeader;
  return res;
}

// ─── CORS Middleware ─────────────────────────────────────────────────────────

describe('CORS Middleware', () => {
  const cors = corsMiddleware({ origins: ['http://localhost:3000', 'http://localhost:5173'] });

  it('sets Access-Control-Allow-Origin for allowed origin', () => {
    const req = mockReq({ headers: { origin: 'http://localhost:3000' } });
    const res = mockRes();
    let called = false;
    cors(req, res, () => { called = true; });
    expect(res._headers['access-control-allow-origin']).toBe('http://localhost:3000');
    expect(called).toBe(true);
  });

  it('does not set CORS header for disallowed origin', () => {
    const req = mockReq({ headers: { origin: 'http://evil.com' } });
    const res = mockRes();
    let called = false;
    cors(req, res, () => { called = true; });
    expect(res._headers['access-control-allow-origin']).toBeUndefined();
    expect(called).toBe(true);
  });

  it('handles OPTIONS preflight', () => {
    const req = mockReq({
      method: 'OPTIONS',
      headers: { origin: 'http://localhost:5173' },
    });
    const res = mockRes();
    cors(req, res, () => {});
    expect(res._status).toBe(204);
    expect(res._ended).toBe(true);
    expect(res._headers['access-control-allow-methods']).toBeTruthy();
  });

  it('sets Allow-Credentials header', () => {
    const req = mockReq({ headers: { origin: 'http://localhost:3000' } });
    const res = mockRes();
    cors(req, res, () => {});
    expect(res._headers['access-control-allow-credentials']).toBe('true');
  });
});

// ─── Security Headers ───────────────────────────────────────────────────────

describe('Security Headers Middleware', () => {
  const headers = securityHeaders();

  it('sets X-Content-Type-Options', () => {
    const req = mockReq();
    const res = mockRes();
    headers(req, res, () => {});
    expect(res._headers['x-content-type-options']).toBe('nosniff');
  });

  it('sets X-Frame-Options', () => {
    const req = mockReq();
    const res = mockRes();
    headers(req, res, () => {});
    expect(res._headers['x-frame-options']).toBe('SAMEORIGIN');
  });

  it('sets Strict-Transport-Security', () => {
    const req = mockReq();
    const res = mockRes();
    headers(req, res, () => {});
    expect(res._headers['strict-transport-security']).toContain('max-age=');
  });

  it('sets Referrer-Policy', () => {
    const req = mockReq();
    const res = mockRes();
    headers(req, res, () => {});
    expect(res._headers['referrer-policy']).toBe('strict-origin-when-cross-origin');
  });

  it('removes X-Powered-By', () => {
    const req = mockReq();
    const res = mockRes();
    res.setHeader('x-powered-by', 'Express');
    headers(req, res, () => {});
    expect(res._headers['x-powered-by']).toBeUndefined();
  });
});

// ─── Request ID ──────────────────────────────────────────────────────────────

describe('Request ID Middleware', () => {
  const rid = requestId();

  it('generates a request ID when none provided', () => {
    const req = mockReq();
    const res = mockRes();
    rid(req, res, () => {});
    expect(res._headers['x-request-id']).toBeTruthy();
    expect(typeof res._headers['x-request-id']).toBe('string');
  });

  it('preserves existing X-Request-Id header', () => {
    const req = mockReq({ headers: { 'x-request-id': 'custom-id-123' } });
    const res = mockRes();
    rid(req, res, () => {});
    expect(res._headers['x-request-id']).toBe('custom-id-123');
  });
});

// ─── OpenAPI Specification ──────────────────────────────────────────────────

describe('OpenAPI Specification', () => {
  it('has correct version', () => {
    expect(OPENAPI_SPEC.openapi).toBe('3.1.0');
  });

  it('has correct API title', () => {
    expect(OPENAPI_SPEC.info.title).toBe('Paradigm Absolute API');
  });

  it('has version 2.0.0', () => {
    expect(OPENAPI_SPEC.info.version).toBe('2.0.0');
  });

  it('defines bearer auth security scheme', () => {
    const scheme = OPENAPI_SPEC.components.securitySchemes.bearerAuth;
    expect(scheme.type).toBe('http');
    expect(scheme.scheme).toBe('bearer');
    expect(scheme.bearerFormat).toBe('JWT');
  });

  it('defines Seed schema with all required properties', () => {
    const seedSchema = OPENAPI_SPEC.components.schemas.Seed;
    expect(seedSchema.properties.id).toBeTruthy();
    expect(seedSchema.properties.$domain).toBeTruthy();
    expect(seedSchema.properties.$name).toBeTruthy();
    expect(seedSchema.properties.$lineage).toBeTruthy();
    expect(seedSchema.properties.$hash).toBeTruthy();
    expect(seedSchema.properties.$fitness).toBeTruthy();
    expect(seedSchema.properties.genes).toBeTruthy();
  });

  it('lists all 27 domains in Seed schema', () => {
    const domains = OPENAPI_SPEC.components.schemas.Seed.properties.$domain.enum;
    expect(domains).toHaveLength(27);
    expect(domains).toContain('character');
    expect(domains).toContain('agent');
    expect(domains).toContain('fullgame');
    expect(domains).toContain('cinematic');
  });

  it('defines PaginatedSeeds schema', () => {
    const paginated = OPENAPI_SPEC.components.schemas.PaginatedSeeds;
    expect(paginated.properties.seeds).toBeTruthy();
    expect(paginated.properties.pagination).toBeTruthy();
  });

  it('defines Error schema', () => {
    const err = OPENAPI_SPEC.components.schemas.Error;
    expect(err.properties.error).toBeTruthy();
    expect(err.properties.details).toBeTruthy();
  });

  // ── Route Coverage ─────────────────────────────────────────────────────

  const expectedPaths = [
    '/auth/register', '/auth/login', '/auth/refresh', '/auth/logout',
    '/seeds', '/seeds/{id}', '/seeds/generate',
    '/seeds/{id}/mutate', '/seeds/{id}/evolve', '/seeds/breed',
    '/seeds/{id}/compose', '/seeds/{id}/grow',
    '/agent/query',
    '/seeds/{id}/sign', '/seeds/{id}/mint',
    '/domains', '/gene-types', '/engines', '/composition/graph',
  ];

  for (const path of expectedPaths) {
    it(`documents path ${path}`, () => {
      expect(OPENAPI_SPEC.paths[path]).toBeTruthy();
    });
  }

  it('auth endpoints have correct HTTP methods', () => {
    expect(OPENAPI_SPEC.paths['/auth/register'].post).toBeTruthy();
    expect(OPENAPI_SPEC.paths['/auth/login'].post).toBeTruthy();
    expect(OPENAPI_SPEC.paths['/auth/refresh'].post).toBeTruthy();
    expect(OPENAPI_SPEC.paths['/auth/logout'].post).toBeTruthy();
  });

  it('seed list supports GET and POST', () => {
    expect(OPENAPI_SPEC.paths['/seeds'].get).toBeTruthy();
    expect(OPENAPI_SPEC.paths['/seeds'].post).toBeTruthy();
  });

  it('protected endpoints have security requirement', () => {
    const protectedPaths = [
      ['/seeds', 'post'],
      ['/seeds/{id}', 'delete'],
      ['/seeds/generate', 'post'],
      ['/seeds/{id}/mutate', 'post'],
      ['/seeds/{id}/evolve', 'post'],
      ['/seeds/breed', 'post'],
      ['/seeds/{id}/compose', 'post'],
      ['/seeds/{id}/grow', 'post'],
      ['/seeds/{id}/sign', 'post'],
      ['/seeds/{id}/mint', 'post'],
      ['/auth/logout', 'post'],
    ] as const;

    for (const [path, method] of protectedPaths) {
      const endpoint = OPENAPI_SPEC.paths[path]?.[method];
      expect(endpoint?.security, `${method.toUpperCase()} ${path} should require auth`).toBeTruthy();
    }
  });

  it('metadata endpoints do not require auth', () => {
    expect((OPENAPI_SPEC.paths['/domains'].get as any).security).toBeUndefined();
    expect((OPENAPI_SPEC.paths['/gene-types'].get as any).security).toBeUndefined();
    expect((OPENAPI_SPEC.paths['/engines'].get as any).security).toBeUndefined();
  });
});

// ─── Swagger UI HTML ─────────────────────────────────────────────────────────

describe('Swagger UI HTML', () => {
  it('generates valid HTML', () => {
    const html = swaggerUIHTML('/api-docs');
    expect(html).toContain('<!DOCTYPE html>');
    expect(html).toContain('<div id="swagger-ui">');
    expect(html).toContain('swagger-ui-bundle.min.js');
  });

  it('uses the provided spec URL', () => {
    const html = swaggerUIHTML('/my/custom/spec');
    expect(html).toContain("url: '/my/custom/spec'");
  });

  it('includes CDN stylesheet', () => {
    const html = swaggerUIHTML('/api-docs');
    expect(html).toContain('swagger-ui.min.css');
  });
});
