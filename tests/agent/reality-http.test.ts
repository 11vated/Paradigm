/**
 * Reality HTTP — end-to-end smoke for POST /api/reality/{channels,render,batch}.
 */
import { describe, it as test, expect, beforeAll, afterAll } from 'vitest';
import express from 'express';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import type { Server } from 'node:http';
import { registerRealityRoutes } from '../../src/server/routes/reality';

const TMP_ROOT = path.join(os.tmpdir(), 'paradigm-reality-http-' + Date.now());
let server: Server;
let baseUrl: string;

beforeAll(async () => {
  fs.mkdirSync(TMP_ROOT, { recursive: true });
  const app = express();
  app.use(express.json());
  const optionalAuth = (_req: any, _res: any, next: any) => next();
  const log = () => {};
  registerRealityRoutes(app, { optionalAuth, log, outputRoot: TMP_ROOT });
  await new Promise<void>((resolve) => {
    server = app.listen(0, '127.0.0.1', () => {
      const addr = server.address() as { port: number };
      baseUrl = `http://127.0.0.1:${addr.port}`;
      resolve();
    });
  });
});

afterAll(async () => {
  await new Promise<void>((resolve) => server.close(() => resolve()));
  try { fs.rmSync(TMP_ROOT, { recursive: true, force: true }); } catch {}
});

describe('reality HTTP', () => {
  test('GET /channels returns 12 unseen channels + 9 dimensions', async () => {
    const r = await fetch(`${baseUrl}/api/reality/channels`);
    expect(r.status).toBe(200);
    const data = await r.json() as { channels: string[]; dimensions: number[] };
    expect(data.channels.length).toBe(12);
    expect(data.dimensions.length).toBe(9);
    expect(data.channels).toContain('quantum-wavefunction');
    expect(data.channels).toContain('gravitational');
  });

  test('POST /render rejects unknown channel', async () => {
    const r = await fetch(`${baseUrl}/api/reality/render`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ channel: 'taste' }),
    });
    expect(r.status).toBe(400);
    const data = await r.json() as { error: string; valid: string[] };
    expect(data.error).toContain('unknown channel');
    expect(data.valid.length).toBe(12);
  });

  test('POST /render returns a field artifact for electromagnetic-visible', async () => {
    const r = await fetch(`${baseUrl}/api/reality/render`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: 'render visible-light EM field of a fluorescent room',
        channel: 'electromagnetic-visible',
        dimensions: 3,
      }),
    });
    expect(r.status).toBe(200);
    const data = await r.json() as { seed: { hash: string; channel: string }; artifact: { primaryPath: string } };
    expect(data.seed.channel).toBe('electromagnetic-visible');
    expect(data.artifact.primaryPath).toBeTruthy();
    expect(fs.existsSync(data.artifact.primaryPath)).toBe(true);
  });

  test('POST /batch renders multiple channels', async () => {
    const r = await fetch(`${baseUrl}/api/reality/batch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: 'magnetar across the EM spectrum',
        channels: ['electromagnetic-radio', 'electromagnetic-xray'],
      }),
    });
    expect(r.status).toBe(200);
    const data = await r.json() as { count: number; artifacts: { primaryPath: string }[] };
    expect(data.count).toBe(2);
    expect(data.artifacts.length).toBe(2);
    for (const a of data.artifacts) {
      expect(fs.existsSync(a.primaryPath)).toBe(true);
    }
  });
});
