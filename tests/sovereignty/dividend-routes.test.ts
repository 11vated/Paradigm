/**
 * Civilizational Dividend HTTP routes — Doctrine v2 Part VIII.19 v1.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import express, { type Express } from 'express';
import type { AddressInfo } from 'node:net';
import type { Server } from 'node:http';
import { registerDividendRoutes } from '../../src/server/routes/dividend';

describe('Doctrine v2 Part VIII.19 — dividend HTTP routes', () => {
  let app: Express;
  let server: Server;
  let baseUrl: string;

  async function get(path: string): Promise<Response> {
    return fetch(`${baseUrl}${path}`);
  }
  async function postJson(path: string, body: unknown): Promise<Response> {
    return fetch(`${baseUrl}${path}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });
  }

  beforeAll(async () => {
    app = express();
    app.use(express.json());
    registerDividendRoutes(app);
    await new Promise<void>((r) => { server = app.listen(0, () => r()); });
    baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  });
  afterAll(async () => { await new Promise<void>((r) => server.close(() => r())); });

  const fakeSale = {
    schema: 'https://paradigm.ai/schema/lineage-royalty/v1',
    seedId: 'seed-a',
    saleAmountCents: 10000,
    totalCents: 10000,
    remainderCents: 0,
    manifest: 'manifest-abc',
    splits: [
      { address: 'alice', role: 'author', depth: 0, cents: 9500, percentageBp: 9500 },
      { address: 'platform', role: 'platform', depth: 0, cents: 500, percentageBp: 500 },
    ],
  };

  it('health endpoint returns ok', async () => {
    const r = await get('/api/dividend/health');
    expect(r.status).toBe(200);
    const body = await r.json();
    expect(body.ok).toBe(true);
  });

  it('POST /epoch creates an epoch', async () => {
    const r = await postJson('/api/dividend/epoch', { epochId: 'route-test-1' });
    expect(r.status).toBe(201);
    const body = await r.json();
    expect(body.epochId).toBe('route-test-1');
    expect(body.status).toBe('open');
  });

  it('POST /epoch requires epochId', async () => {
    const r = await postJson('/api/dividend/epoch', {});
    expect(r.status).toBe(400);
  });

  it('GET /epoch/:id retrieves an epoch', async () => {
    await postJson('/api/dividend/epoch', { epochId: 'route-test-2' });
    const r = await get('/api/dividend/epoch/route-test-2');
    expect(r.status).toBe(200);
    const body = await r.json();
    expect(body.epoch.epochId).toBe('route-test-2');
    expect(body.distribution).toBeNull();
  });

  it('GET /epoch/:id returns 404 for unknown id', async () => {
    const r = await get('/api/dividend/epoch/does-not-exist');
    expect(r.status).toBe(404);
  });

  it('full lifecycle: open → add → close', async () => {
    await postJson('/api/dividend/epoch', { epochId: 'lifecycle', dividendBp: 200 });
    const add = await postJson('/api/dividend/epoch/lifecycle/add', { sale: fakeSale });
    expect(add.status).toBe(200);
    const close = await (await postJson('/api/dividend/epoch/lifecycle/close', {})).json();
    expect(close.epoch.status).toBe('closed');
    expect(close.distribution.poolCents).toBe(200); // 2% of 10000
    expect(close.distribution.payouts[0].address).toBe('alice');
  });

  it('add to unknown epoch returns 404', async () => {
    const r = await postJson('/api/dividend/epoch/missing/add', { sale: fakeSale });
    expect(r.status).toBe(404);
  });

  it('add with invalid sale shape returns 400', async () => {
    await postJson('/api/dividend/epoch', { epochId: 'invalid-sale' });
    const r = await postJson('/api/dividend/epoch/invalid-sale/add', { sale: { foo: 'bar' } });
    expect(r.status).toBe(400);
  });

  it('close twice returns 400', async () => {
    await postJson('/api/dividend/epoch', { epochId: 'close-twice' });
    await postJson('/api/dividend/epoch/close-twice/close', {});
    const r = await postJson('/api/dividend/epoch/close-twice/close', {});
    expect(r.status).toBe(400);
  });
});
