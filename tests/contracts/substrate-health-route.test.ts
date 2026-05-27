/**
 * Substrate Health route smoke tests — Doctrine v2 Part XV.3 / Phase 1.
 *
 * Exercises the registered routes against a real express app instance
 * without booting the full server. Verifies that:
 *   - GET /api/substrate/health returns the snapshot schema
 *   - GET /api/substrate/health/strata includes declarations and coverageIndex
 *   - POST /api/substrate/health/report validates input and rings the buffer
 *   - GET /api/substrate/health/reports returns the rung reports
 */
import { describe, it, expect } from 'vitest';
import express from 'express';
import { registerSubstrateHealthRoutes } from '../../src/server/routes/substrate-health';

function makeApp(): express.Express {
  const app = express();
  app.use(express.json());
  registerSubstrateHealthRoutes(app);
  return app;
}

async function call(
  app: express.Express,
  method: 'GET' | 'POST',
  path: string,
  body?: unknown,
): Promise<{ status: number; body: unknown }> {
  // Drive the express app via a fake req/res pair to avoid the network.
  return new Promise((resolve, reject) => {
    const req: any = {
      method,
      url: path,
      originalUrl: path,
      headers: { 'content-type': 'application/json' },
      body: body ?? {},
    };
    const chunks: Buffer[] = [];
    let statusCode = 200;
    const res: any = {
      setHeader: () => {},
      getHeader: () => undefined,
      writeHead: (s: number) => { statusCode = s; },
      status(code: number) { statusCode = code; return res; },
      json(payload: unknown) {
        const buf = Buffer.from(JSON.stringify(payload));
        chunks.push(buf);
        resolve({ status: statusCode, body: payload });
      },
      send(payload: unknown) {
        if (typeof payload === 'string') chunks.push(Buffer.from(payload));
        else if (Buffer.isBuffer(payload)) chunks.push(payload);
        else chunks.push(Buffer.from(JSON.stringify(payload)));
        resolve({ status: statusCode, body: payload });
      },
      end(payload?: unknown) {
        if (payload !== undefined) {
          if (typeof payload === 'string') chunks.push(Buffer.from(payload));
          else if (Buffer.isBuffer(payload)) chunks.push(payload);
        }
        const text = Buffer.concat(chunks).toString('utf8');
        try { resolve({ status: statusCode, body: text ? JSON.parse(text) : null }); }
        catch { resolve({ status: statusCode, body: text }); }
      },
      on: () => {},
    };
    try { (app as any).handle(req, res, (err: unknown) => err ? reject(err) : resolve({ status: 404, body: null })); }
    catch (e) { reject(e); }
  });
}

describe('Doctrine v2 Part XV.3 — Substrate Health Dashboard routes', () => {
  const app = makeApp();

  it('GET /api/substrate/health returns the snapshot', async () => {
    const { status, body } = await call(app, 'GET', '/api/substrate/health');
    expect(status).toBe(200);
    const b = body as Record<string, unknown>;
    expect(b.doctrineVersion).toBe('v2');
    expect(b.metrics).toBeDefined();
    expect(b.strata).toBeDefined();
  });

  it('GET /api/substrate/health/strata includes declarations + coverageIndex', async () => {
    const { status, body } = await call(app, 'GET', '/api/substrate/health/strata');
    expect(status).toBe(200);
    const b = body as Record<string, unknown>;
    expect(Array.isArray(b.strata)).toBe(true);
    expect(Array.isArray(b.declarations)).toBe(true);
    expect(b.coverageIndex).toBeDefined();
    const idx = b.coverageIndex as Record<string, { count: number; contracts: string[] }>;
    expect(Object.keys(idx).sort()).toEqual([
      'culture', 'field', 'form', 'mind', 'motion', 'sound', 'story', 'time', 'world',
    ]);
  });

  it('POST /api/substrate/health/report accepts well-formed reports', async () => {
    const { status, body } = await call(app, 'POST', '/api/substrate/health/report', {
      source: 'vitest',
      runId: 'test-1',
      metrics: { determinism_violations: 0, preflight_all_passed: 1 },
    });
    expect(status).toBe(202);
    expect((body as Record<string, unknown>).accepted).toBe(true);
  });

  it('POST rejects bad payload', async () => {
    const r1 = await call(app, 'POST', '/api/substrate/health/report', { source: 'vitest' });
    expect(r1.status).toBe(400);
    const r2 = await call(app, 'POST', '/api/substrate/health/report', { source: 'vitest', metrics: { bad: 'string' } });
    expect(r2.status).toBe(400);
  });

  it('GET /api/substrate/health/reports returns the rung reports newest-first', async () => {
    await call(app, 'POST', '/api/substrate/health/report', {
      source: 'vitest', runId: 'rung-1', metrics: { x: 1 },
    });
    await call(app, 'POST', '/api/substrate/health/report', {
      source: 'vitest', runId: 'rung-2', metrics: { x: 2 },
    });
    const { status, body } = await call(app, 'GET', '/api/substrate/health/reports');
    expect(status).toBe(200);
    const b = body as { count: number; reports: Array<{ runId: string }> };
    expect(b.count).toBeGreaterThanOrEqual(2);
    // Newest first: most recent runIds in the ring should be at the front.
    const ids = b.reports.map((r) => r.runId);
    const lastIdx = ids.indexOf('rung-2');
    const prevIdx = ids.indexOf('rung-1');
    expect(lastIdx).toBeGreaterThanOrEqual(0);
    expect(prevIdx).toBeGreaterThan(lastIdx);
  });
});
