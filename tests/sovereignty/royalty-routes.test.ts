/**
 * Royalty HTTP routes — Doctrine v2 Part VIII.17 v1.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import express, { type Express } from 'express';
import type { AddressInfo } from 'node:net';
import type { Server } from 'node:http';
import { registerRoyaltyRoutes } from '../../src/server/routes/royalty';

describe('Doctrine v2 Part VIII.17 — royalty HTTP routes', () => {
  let app: Express;
  let server: Server;
  let baseUrl: string;

  async function getJson(path: string): Promise<{ status: number; body: any }> {
    const r = await fetch(baseUrl + path);
    return { status: r.status, body: await r.json() };
  }
  async function postJson(path: string, body: unknown): Promise<{ status: number; body: any }> {
    const r = await fetch(baseUrl + path, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });
    return { status: r.status, body: await r.json() };
  }

  beforeAll(async () => {
    app = express();
    app.use(express.json());
    registerRoyaltyRoutes(app);
    server = await new Promise<Server>((resolve) => {
      const s = app.listen(0, () => resolve(s));
    });
    const addr = server.address() as AddressInfo;
    baseUrl = `http://127.0.0.1:${addr.port}`;
  });

  afterAll(async () => {
    await new Promise<void>((resolve, reject) => server.close((err) => (err ? reject(err) : resolve())));
  });

  it('GET /api/royalty/example returns a stable worked example', async () => {
    const r = await getJson('/api/royalty/example');
    expect(r.status).toBe(200);
    expect(r.body.lineage.length).toBe(4);
    expect(r.body.result.totalCents).toBe(10_000);
    expect(r.body.result.manifest).toMatch(/^[0-9a-f]{64}$/);
  });

  it('POST /api/royalty/compute computes a depth-3 waterfall', async () => {
    const lineage = [
      { seedId: 'A', authorAddress: '0xA', parents: ['B'] },
      { seedId: 'B', authorAddress: '0xB', parents: ['C'] },
      { seedId: 'C', authorAddress: '0xC', parents: [] },
    ];
    const r = await postJson('/api/royalty/compute', {
      seedId: 'A',
      saleAmountCents: 10_000,
      lineage,
    });
    expect(r.status).toBe(200);
    expect(r.body.totalCents).toBe(10_000);
    const ancestors = r.body.splits.filter((s: { role: string }) => s.role === 'ancestor');
    expect(ancestors.length).toBe(2);
    expect(r.body.manifest).toMatch(/^[0-9a-f]{64}$/);
  });

  it('POST /api/royalty/compute rejects missing fields with 400', async () => {
    const a = await postJson('/api/royalty/compute', {});
    expect(a.status).toBe(400);

    const b = await postJson('/api/royalty/compute', { seedId: 'X', saleAmountCents: 1000, lineage: [] });
    expect(b.status).toBe(400);
    expect(b.body.error).toMatch(/lineage must include the root/);

    const c = await postJson('/api/royalty/compute', { seedId: 'X', saleAmountCents: -1, lineage: [{ seedId: 'X', authorAddress: '0x', parents: [] }] });
    expect(c.status).toBe(400);
  });

  it('POST /api/royalty/compute manifest is deterministic across two POSTs', async () => {
    const payload = {
      seedId: 'A',
      saleAmountCents: 49_999,
      lineage: [
        { seedId: 'A', authorAddress: '0xA', parents: ['B'] },
        { seedId: 'B', authorAddress: '0xB', parents: ['C'] },
        { seedId: 'C', authorAddress: '0xC', parents: [] },
      ],
    };
    const r1 = await postJson('/api/royalty/compute', payload);
    const r2 = await postJson('/api/royalty/compute', payload);
    expect(r1.body.manifest).toBe(r2.body.manifest);
    expect(JSON.stringify(r1.body.splits)).toBe(JSON.stringify(r2.body.splits));
  });
});
