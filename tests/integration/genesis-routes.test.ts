/**
 * Genesis HTTP routes — Doctrine v2 Part XII v1.
 *
 * Exercises the full hero loop over HTTP, on an ephemeral-port Express
 * server. Verifies permalink round-trip, fork chain, and lineage
 * resolution across multiple generations.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import express, { type Express } from 'express';
import type { AddressInfo } from 'node:net';
import type { Server } from 'node:http';
import { registerGenesisRoutes } from '../../src/server/routes/genesis';

describe('Doctrine v2 Part XII — genesis HTTP routes', () => {
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
    registerGenesisRoutes(app);
    await new Promise<void>((resolve) => {
      server = app.listen(0, () => resolve());
    });
    const port = (server.address() as AddressInfo).port;
    baseUrl = `http://127.0.0.1:${port}`;
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  it('GET /api/genesis/health returns ok', async () => {
    const r = await get('/api/genesis/health');
    expect(r.status).toBe(200);
    const body = await r.json();
    expect(body.ok).toBe(true);
    expect(body.sampleHash).toMatch(/^[0-9a-f]{64}$/);
  });

  it('POST /api/genesis with token returns deterministic package', async () => {
    const a = await (await postJson('/api/genesis', { sessionToken: 'fixed-test-token' })).json();
    const b = await (await postJson('/api/genesis', { sessionToken: 'fixed-test-token' })).json();
    expect(a.seed.$hash).toBe(b.seed.$hash);
    expect(a.permalink).toBe(b.permalink);
  });

  it('POST /api/genesis without token gives a fresh one', async () => {
    const a = await (await postJson('/api/genesis', {})).json();
    const b = await (await postJson('/api/genesis', {})).json();
    expect(a.sessionToken).not.toBe(b.sessionToken);
    expect(a.seed.$hash).not.toBe(b.seed.$hash);
  });

  it('GET /api/genesis/:shortHash resolves a stored permalink', async () => {
    const created = await (await postJson('/api/genesis', { sessionToken: 'permalink-A' })).json();
    const shortHash = created.seed.$hash.slice(0, 16);
    const r = await get(`/api/genesis/${shortHash}`);
    expect(r.status).toBe(200);
    const fetched = await r.json();
    expect(fetched.seed.$hash).toBe(created.seed.$hash);
    expect(Array.isArray(fetched.lineage)).toBe(true);
  });

  it('GET /api/genesis/:shortHash returns 404 for unknown hash', async () => {
    const r = await get('/api/genesis/' + '0'.repeat(16));
    expect(r.status).toBe(404);
  });

  it('GET /api/genesis/:shortHash rejects malformed hashes', async () => {
    const r = await get('/api/genesis/not-a-hash!!');
    expect(r.status).toBe(400);
  });

  it('POST /fork creates a child with parent in lineage', async () => {
    const parent = await (await postJson('/api/genesis', { sessionToken: 'parent-A' })).json();
    const shortHash = parent.seed.$hash.slice(0, 16);
    const r = await postJson(`/api/genesis/${shortHash}/fork`, { forkerToken: 'child-A' });
    expect(r.status).toBe(201);
    const child = await r.json();
    expect(child.seed.$lineage.parents).toEqual([parent.seed.$hash]);
    expect(child.parent.$hash).toBe(parent.seed.$hash);
  });

  it('lineage walks back to the root through fetched permalinks', async () => {
    const root = await (await postJson('/api/genesis', { sessionToken: 'lineage-root' })).json();
    const mid = await (await postJson(`/api/genesis/${root.seed.$hash.slice(0, 16)}/fork`, { forkerToken: 'lineage-mid' })).json();
    const leaf = await (await postJson(`/api/genesis/${mid.seed.$hash.slice(0, 16)}/fork`, { forkerToken: 'lineage-leaf' })).json();
    const fetched = await (await get(`/api/genesis/${leaf.seed.$hash.slice(0, 16)}`)).json();
    expect(fetched.lineage.length).toBe(3); // leaf + mid + root
    const seedIds = fetched.lineage.map((n: { seedId: string }) => n.seedId);
    expect(seedIds).toContain(root.seed.$hash);
    expect(seedIds).toContain(mid.seed.$hash);
    expect(seedIds).toContain(leaf.seed.$hash);
  });

  it('fork from non-existent parent returns 404', async () => {
    const r = await postJson(`/api/genesis/${'f'.repeat(16)}/fork`, { forkerToken: 'orphan' });
    expect(r.status).toBe(404);
  });
});
