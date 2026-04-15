/**
 * Tests for the /ready readiness module (Phase 1.3).
 *
 * We don't exercise the HTTP endpoint — that's integration territory. Here
 * we pin the per-check behavior so regressions show up on a fast loop.
 *
 * Why these assertions matter:
 *   - `ready: true iff every required check is ok` is the contract that
 *     load balancers depend on. If this flips, we take ourselves out of
 *     rotation for dumb reasons (or stay in rotation while broken).
 *   - `skipped` checks must not flip `ready` to false — otherwise a dev
 *     env without DATABASE_URL would report not-ready and break local loops.
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  checkSbert, checkPostgres, checkStore, buildReport,
} from '../../src/lib/health/readiness.js';

describe('readiness.buildReport', () => {
  it('is ready when all required checks are ok', () => {
    const r = buildReport([
      { name: 'a', status: 'ok', latency_ms: 5, required: true },
      { name: 'b', status: 'ok', latency_ms: 7, required: true },
    ]);
    expect(r.ready).toBe(true);
    expect(r.timestamp).toMatch(/T.*Z$/);
  });

  it('is not ready when any required check is down', () => {
    const r = buildReport([
      { name: 'a', status: 'ok', latency_ms: 5, required: true },
      { name: 'b', status: 'down', latency_ms: 7, required: true },
    ]);
    expect(r.ready).toBe(false);
  });

  it('ignores non-required failures', () => {
    const r = buildReport([
      { name: 'a', status: 'ok', latency_ms: 5, required: true },
      { name: 'legacy-mongo', status: 'down', latency_ms: 7, required: false },
    ]);
    expect(r.ready).toBe(true);
  });

  it('treats `skipped` on required checks as not-ok', () => {
    // Conservative default: if a dep is required but we skipped it, we
    // shouldn't claim ready. The /ready handler arranges `required: false`
    // on skipped checks so this state is reachable only by mistake — but
    // if it happens, we fail closed.
    const r = buildReport([
      { name: 'pg', status: 'skipped', latency_ms: 0, required: true },
    ]);
    expect(r.ready).toBe(false);
  });
});

describe('readiness.checkStore', () => {
  it('returns ok when probe resolves', async () => {
    const c = await checkStore(async () => ['seed']);
    expect(c.status).toBe('ok');
    expect(c.required).toBe(true);
    expect(c.latency_ms).toBeGreaterThanOrEqual(0);
  });

  it('returns down when probe throws', async () => {
    const c = await checkStore(async () => {
      throw new Error('disk full');
    });
    expect(c.status).toBe('down');
    expect(c.detail).toContain('disk full');
  });

  it('returns down when probe exceeds timeout', async () => {
    const c = await checkStore(
      () => new Promise((r) => setTimeout(r, 200)),
      { timeoutMs: 20 },
    );
    expect(c.status).toBe('down');
  });
});

describe('readiness.checkPostgres', () => {
  it('skipped when no probe provided', async () => {
    const c = await checkPostgres(undefined);
    expect(c.status).toBe('skipped');
    expect(c.required).toBe(false);
  });

  it('ok when probe resolves', async () => {
    const c = await checkPostgres(async () => 1);
    expect(c.status).toBe('ok');
    expect(c.required).toBe(true);
  });

  it('down when probe rejects', async () => {
    const c = await checkPostgres(async () => {
      throw new Error('ECONNREFUSED');
    });
    expect(c.status).toBe('down');
    expect(c.detail).toContain('ECONNREFUSED');
  });
});

describe('readiness.checkSbert', () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('skipped when SBERT_URL unset', async () => {
    const c = await checkSbert(undefined);
    expect(c.status).toBe('skipped');
    expect(c.required).toBe(false);
  });

  it('ok when sidecar returns healthy', async () => {
    globalThis.fetch = vi.fn(async () =>
      new Response(JSON.stringify({ status: 'ok', model: 'mini', dim: 384 }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    ) as any;
    const c = await checkSbert('http://sbert:8000');
    expect(c.status).toBe('ok');
    expect(c.required).toBe(true);
    expect(c.detail).toContain('model=mini');
    expect(c.detail).toContain('dim=384');
  });

  it('down when sidecar returns non-2xx', async () => {
    globalThis.fetch = vi.fn(async () =>
      new Response('bad', { status: 500 }),
    ) as any;
    const c = await checkSbert('http://sbert:8000');
    expect(c.status).toBe('down');
  });

  it('strips trailing slash from SBERT_URL', async () => {
    const calls: string[] = [];
    globalThis.fetch = vi.fn(async (url: any) => {
      calls.push(String(url));
      return new Response(JSON.stringify({ status: 'ok', model: 'm', dim: 1 }), {
        status: 200,
      });
    }) as any;
    await checkSbert('http://sbert:8000/');
    expect(calls[0]).toBe('http://sbert:8000/health');
  });

  it('respects timeoutMs', async () => {
    globalThis.fetch = vi.fn(
      (_url, init: any) =>
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () => {
            reject(new Error('aborted'));
          });
        }),
    ) as any;
    const c = await checkSbert('http://sbert:8000', { timeoutMs: 20 });
    expect(c.status).toBe('down');
  });
});
