/**
 * Commons routes — public corpus browser substrate
 * (Doctrine v2 Part VIII.14).
 *
 * Exit-gate-adjacent: every seed in the public corpus is browsable
 * by domain, provenance, and free-text search; paginates cleanly;
 * individual seeds resolve their full body.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import express, { type Express } from 'express';
import type { AddressInfo } from 'node:net';
import type { Server } from 'node:http';
import { registerCommonsRoutes } from '../../src/server/routes/commons';

describe('Doctrine v2 Part VIII.14 — public commons routes', () => {
  let app: Express;
  let server: Server;
  let baseUrl: string;

  async function get(path: string): Promise<{ status: number; body: any }> {
    const r = await fetch(baseUrl + path);
    let body: unknown = null;
    try { body = await r.json(); } catch { /* non-JSON response */ }
    return { status: r.status, body };
  }

  beforeAll(async () => {
    app = express();
    registerCommonsRoutes(app);
    server = await new Promise<Server>((resolve) => {
      const s = app.listen(0, () => resolve(s));
    });
    const addr = server.address() as AddressInfo;
    baseUrl = `http://127.0.0.1:${addr.port}`;
  });

  afterAll(async () => {
    await new Promise<void>((resolve, reject) => server.close((err) => (err ? reject(err) : resolve())));
  });

  it('GET /api/commons/stats exposes corpus totals + domain breakdown', async () => {
    const r = await get('/api/commons/stats');
    expect(r.status).toBe(200);
    expect(r.body.schema).toBe('https://paradigm.ai/schema/commons-stats/v1');
    expect(r.body.total).toBeGreaterThan(900); // Phase 2 raised commons to ~1030
    expect(r.body.curated).toBeGreaterThan(0);
    expect(r.body.generated).toBeGreaterThan(0);
    expect(Array.isArray(r.body.domains)).toBe(true);
    expect(r.body.domains.length).toBeGreaterThan(20);
    // Sorted descending by count.
    for (let i = 1; i < r.body.domains.length; i++) {
      expect(r.body.domains[i].count).toBeLessThanOrEqual(r.body.domains[i - 1].count);
    }
  });

  it('GET /api/commons paginates with default pageSize=24', async () => {
    const r = await get('/api/commons');
    expect(r.status).toBe(200);
    expect(r.body.page).toBe(0);
    expect(r.body.pageSize).toBe(24);
    expect(r.body.items.length).toBeLessThanOrEqual(24);
    expect(r.body.totalPages).toBeGreaterThan(1);
    expect(r.body.hasMore).toBe(true);
  });

  it('GET /api/commons honors domain filter', async () => {
    const r = await get('/api/commons?domain=music&pageSize=100');
    expect(r.status).toBe(200);
    expect(r.body.items.length).toBeGreaterThan(0);
    for (const item of r.body.items) {
      expect(item.domain).toBe('music');
    }
  });

  it('GET /api/commons honors provenance filter', async () => {
    const r = await get('/api/commons?provenance=curated&pageSize=50');
    expect(r.status).toBe(200);
    expect(r.body.items.length).toBeGreaterThan(0);
    for (const item of r.body.items) {
      expect(item.provenance).toBe('curated');
    }
  });

  it('GET /api/commons honors free-text search', async () => {
    const r = await get('/api/commons?q=agent&pageSize=20');
    expect(r.status).toBe(200);
    expect(r.body.items.length).toBeGreaterThan(0);
  });

  it('GET /api/commons sortBy=fitness returns descending', async () => {
    const r = await get('/api/commons?sortBy=fitness&pageSize=50');
    expect(r.status).toBe(200);
    for (let i = 1; i < r.body.items.length; i++) {
      const prev = r.body.items[i - 1].fitness ?? 0;
      const cur = r.body.items[i].fitness ?? 0;
      expect(cur).toBeLessThanOrEqual(prev);
    }
  });

  it('GET /api/commons/seeds/:id returns full seed body for a real entry', async () => {
    const list = await get('/api/commons?pageSize=1');
    const firstId = list.body.items[0]?.id;
    expect(firstId).toBeTruthy();
    const seed = await get(`/api/commons/seeds/${firstId}`);
    expect(seed.status).toBe(200);
    expect(seed.body.schema).toBe('https://paradigm.ai/schema/commons-seed/v1');
    expect(seed.body.entry.id).toBe(firstId);
    expect(typeof seed.body.seed).toBe('object');
  });

  it('GET /api/commons/seeds/:id rejects malformed ids', async () => {
    const r = await get('/api/commons/seeds/..%2Fetc%2Fpasswd');
    expect(r.status).toBe(400);
  });

  it('GET /api/commons/seeds/:id returns 404 for missing ids', async () => {
    const r = await get('/api/commons/seeds/does-not-exist-zzz');
    expect(r.status).toBe(404);
  });

  it('paging is stable: page N + page N+1 are disjoint', async () => {
    const a = await get('/api/commons?page=0&pageSize=10&sortBy=name');
    const b = await get('/api/commons?page=1&pageSize=10&sortBy=name');
    const aIds = new Set(a.body.items.map((i: { id: string }) => i.id));
    for (const item of b.body.items) {
      expect(aIds.has(item.id)).toBe(false);
    }
  });
});
