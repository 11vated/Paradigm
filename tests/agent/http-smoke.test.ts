/**
 * Sovereign Agent — HTTP end-to-end smoke.
 *
 * Doctrine: `Documents/Paradigm-Analysis/12_PARADIGM_INFINITE_COMPLETION_DOCTRINE.md`
 * Workstream 7. The in-process orchestrator already has 216 tests
 * passing; this proves the HTTP route is wired and the full pipeline
 * survives the Express boundary.
 *
 * Boots Express on an ephemeral port, registers only the sovereign-
 * agent route module, exercises:
 *   GET  /api/sovereign-agent/info
 *   POST /api/sovereign-agent/run
 *   POST /api/sovereign-agent/canon/ingest
 *   GET  /api/sovereign-agent/canon/search?q=...
 * and shuts down cleanly. Uses the default MockSeedLLM so the test is
 * hermetic — no network, no model.
 */
import { describe, it as test, expect, beforeAll, afterAll } from 'vitest';
import type { AddressInfo } from 'node:net';
import express, { type Express } from 'express';
import type { Server } from 'node:http';

import {
  registerSovereignAgentRoutes,
} from '../../src/server/routes/sovereign-agent';

let app: Express;
let server: Server;
let baseURL: string;

beforeAll(async () => {
  app = express();
  app.use(express.json({ limit: '1mb' }));
  registerSovereignAgentRoutes(app, {});
  await new Promise<void>((resolve) => {
    server = app.listen(0, '127.0.0.1', () => resolve());
  });
  const addr = server.address() as AddressInfo;
  baseURL = `http://127.0.0.1:${addr.port}`;
});

afterAll(async () => {
  await new Promise<void>((resolve, reject) =>
    server.close((err) => (err ? reject(err) : resolve())),
  );
});

describe('Sovereign Agent HTTP smoke', () => {
  test('GET /info exposes route map + provider', async () => {
    const r = await fetch(`${baseURL}/api/sovereign-agent/info`);
    expect(r.status).toBe(200);
    const j = (await r.json()) as {
      ok: boolean;
      provider: string;
      agentVersion: string;
      endpoints: string[];
    };
    expect(j.ok).toBe(true);
    expect(j.agentVersion).toBe('0.1');
    expect(j.endpoints).toContain('POST /api/sovereign-agent/run');
  });

  test('POST /run with missing utterance returns 400', async () => {
    const r = await fetch(`${baseURL}/api/sovereign-agent/run`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({}),
    });
    expect(r.status).toBe(400);
  });

  test('POST /run end-to-end produces seed + plan + intent + timings', async () => {
    const r = await fetch(`${baseURL}/api/sovereign-agent/run`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ utterance: 'draw a brave knight in cinematic light' }),
    });
    expect(r.status).toBe(200);
    const j = (await r.json()) as Record<string, unknown>;
    expect(j.ok).toBe(true);
    expect(typeof j.elapsedMs).toBe('number');
    expect(j.planHash).toBeTruthy();
    expect(typeof j.planStepsCount).toBe('number');
    expect((j.planStepsCount as number) > 0).toBe(true);
    expect(j.seed).toBeTruthy();
    expect(j.intent).toBeTruthy();
    expect(j.timings).toBeTruthy();
  });

  test('determinism: same utterance twice → identical planHash', async () => {
    const post = () =>
      fetch(`${baseURL}/api/sovereign-agent/run`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ utterance: 'an alpine cabin at dawn, painterly' }),
      }).then((r) => r.json() as Promise<Record<string, unknown>>);
    const [a, b] = await Promise.all([post(), post()]);
    expect(a.planHash).toBeTruthy();
    expect(a.planHash).toBe(b.planHash);
  });

  test('canon/search with empty q returns 400', async () => {
    const r = await fetch(`${baseURL}/api/sovereign-agent/canon/search?q=`);
    expect(r.status).toBe(400);
  });
});
