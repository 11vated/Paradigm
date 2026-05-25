import { describe, it as test, expect, beforeAll, afterAll } from 'vitest';
import express from 'express';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import type { Server } from 'node:http';
import { registerUniverseRoutes } from '../../src/server/routes/universe';

const TMP_ROOT = path.join(os.tmpdir(), 'paradigm-universe-http-' + Date.now());

let server: Server;
let baseUrl: string;

beforeAll(async () => {
  fs.mkdirSync(TMP_ROOT, { recursive: true });
  const app = express();
  app.use(express.json());
  const optionalAuth = (_req: any, _res: any, next: any) => next();
  const log = () => {};
  registerUniverseRoutes(app, { optionalAuth, log, universesRoot: TMP_ROOT });
  await new Promise<void>((resolve) => {
    server = app.listen(0, '127.0.0.1', () => {
      const port = (server.address() as any).port;
      baseUrl = `http://127.0.0.1:${port}`;
      resolve();
    });
  });
});

afterAll(async () => {
  await new Promise<void>((resolve) => server.close(() => resolve()));
  fs.rmSync(TMP_ROOT, { recursive: true, force: true });
});

describe('/api/universe', () => {
  test('POST /plan returns a deterministic plan', async () => {
    const body = { prompt: 'a luminous tarot deck dungeon' };
    const r1 = await fetch(`${baseUrl}/api/universe/plan`, {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body),
    });
    expect(r1.status).toBe(200);
    const j1 = await r1.json() as any;
    expect(j1.plan).toBeDefined();
    expect(j1.archetype).toMatch(/^[a-z0-9-]+$/);
    expect(j1.validation.ok).toBe(true);
    expect(Array.isArray(j1.plan.nodes)).toBe(true);
    expect(j1.plan.nodes.length).toBeGreaterThan(0);
    const r2 = await fetch(`${baseUrl}/api/universe/plan`, {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body),
    });
    const j2 = await r2.json() as any;
    expect(j2.plan.rootSeedHash).toBe(j1.plan.rootSeedHash);
    expect(j2.plan.nodes.map((n: any) => n.id)).toEqual(j1.plan.nodes.map((n: any) => n.id));
  });

  test('POST /plan rejects empty prompt', async () => {
    const r = await fetch(`${baseUrl}/api/universe/plan`, {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ prompt: '' }),
    });
    expect(r.status).toBe(400);
  });

  test('POST /grow runs the plan and returns a manifest', async () => {
    const r = await fetch(`${baseUrl}/api/universe/grow`, {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ prompt: 'a tiny serene meditation room', continueOnError: true }),
    });
    expect(r.status).toBe(200);
    const j = await r.json() as any;
    expect(j.manifest).toBeDefined();
    expect(typeof j.outputRoot).toBe('string');
    expect(Array.isArray(j.manifest.nodes)).toBe(true);
    expect(j.manifest.archetype).toMatch(/^[a-z0-9-]+$/);
  }, 60000);

  test('POST /grow rejects empty prompt', async () => {
    const r = await fetch(`${baseUrl}/api/universe/grow`, {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({}),
    });
    expect(r.status).toBe(400);
  });
});
