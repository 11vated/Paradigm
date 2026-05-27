/**
 * License HTTP routes — Doctrine v2 Part VIII.18 v1.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import express, { type Express } from 'express';
import type { AddressInfo } from 'node:net';
import type { Server } from 'node:http';
import { registerLicenseRoutes } from '../../src/server/routes/license';

describe('Doctrine v2 Part VIII.18 — license HTTP routes', () => {
  let app: Express;
  let server: Server;
  let baseUrl: string;

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
    registerLicenseRoutes(app);
    server = await new Promise<Server>((resolve) => {
      const s = app.listen(0, () => resolve(s));
    });
    const addr = server.address() as AddressInfo;
    baseUrl = `http://127.0.0.1:${addr.port}`;
  });

  afterAll(async () => {
    await new Promise<void>((resolve, reject) => server.close((err) => (err ? reject(err) : resolve())));
  });

  it('POST /api/license/build returns a structurally valid license', async () => {
    const r = await postJson('/api/license/build', {
      type: 'commercial-royalty',
      custodian: '0xA',
      royaltyBp: 1000,
    });
    expect(r.status).toBe(200);
    expect(r.body.license.schema).toBe('https://paradigm.ai/schema/seed-license/v1');
    expect(r.body.license.manifest).toMatch(/^[0-9a-f]{64}$/);
  });

  it('POST /api/license/evaluate honors the verdict matrix', async () => {
    const build = await postJson('/api/license/build', { type: 'noncommercial', custodian: '0xA' });
    const license = build.body.license;
    const view = await postJson('/api/license/evaluate', { license, intendedUse: 'view' });
    expect(view.status).toBe(200);
    expect(view.body.allowed).toBe(true);
    const commerce = await postJson('/api/license/evaluate', { license, intendedUse: 'commercial-resale' });
    expect(commerce.body.allowed).toBe(false);
    expect(commerce.body.reason).toMatch(/noncommercial/);
  });

  it('POST /api/license/evaluate rejects malformed payloads', async () => {
    const a = await postJson('/api/license/evaluate', {});
    expect(a.status).toBe(400);
    const b = await postJson('/api/license/evaluate', { license: { type: 'attribution' }, intendedUse: 'view' });
    expect(b.status).toBe(400);
    const buildR = await postJson('/api/license/build', { type: 'public-domain', custodian: '0xA' });
    const c = await postJson('/api/license/evaluate', { license: buildR.body.license, intendedUse: 'pirate' });
    expect(c.status).toBe(400);
  });

  it('POST /api/license/build rejects unknown type', async () => {
    const r = await postJson('/api/license/build', { type: 'megacommercial', custodian: '0xA' });
    expect(r.status).toBe(400);
  });

  it('POST /api/license/build rejects missing custodian', async () => {
    const r = await postJson('/api/license/build', { type: 'attribution' });
    expect(r.status).toBe(400);
  });

  it('round trip: build then evaluate produces a stable manifest in the response', async () => {
    const build = await postJson('/api/license/build', {
      type: 'commercial-royalty', custodian: '0xZ', royaltyBp: 250,
      attribution: { required: true, canonicalLine: 'by Z' },
    });
    const e = await postJson('/api/license/evaluate', { license: build.body.license, intendedUse: 'commercial-resale' });
    expect(e.body.manifest).toBe(build.body.license.manifest);
    expect(e.body.royaltyBp).toBe(250);
  });
});
