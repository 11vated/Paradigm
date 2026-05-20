/**
 * Friend API integration tests.
 *
 * Same skip-without-server pattern as the rest of tests/api.test.ts.
 * Tests the wire-level contract of the three /api/v1/friend/* routes.
 */

import { describe, it, expect, beforeAll } from 'vitest';

const BASE_URL = 'http://localhost:3000';
const API = `${BASE_URL}/api/v1/friend`;

let serverReady = false;

describe('Friend API — /api/v1/friend/*', () => {
  beforeAll(async () => {
    try {
      const res = await fetch(`${BASE_URL}/health`, {
        signal: AbortSignal.timeout(2000),
      });
      serverReady = res.ok;
    } catch {
      serverReady = false;
    }
  });

  describe('POST /generate', () => {
    it('returns a deterministic FriendSeed + artifact', async () => {
      if (!serverReady) return;
      const res = await fetch(`${API}/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ seed: 'api-test-genesis' }),
      });
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.friendSeed).toBeDefined();
      expect(json.artifact).toBeDefined();
      expect(json.friendSeed.id).toMatch(/^[0-9a-f]{16}$/);
      expect(json.artifact.phenotype.portraitSvg.startsWith('<svg')).toBe(true);
    });

    it('two requests with the same seed return identical friendSeeds', async () => {
      if (!serverReady) return;
      const body = JSON.stringify({ seed: 'reproducible-via-http' });
      const opts = {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
      };
      const r1 = await fetch(`${API}/generate`, opts);
      const r2 = await fetch(`${API}/generate`, opts);
      const j1 = await r1.json();
      const j2 = await r2.json();
      expect(j1.friendSeed).toEqual(j2.friendSeed);
    });

    it('rejects request with missing seed (Zod validation)', async () => {
      if (!serverReady) return;
      const res = await fetch(`${API}/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      expect(res.status).toBeGreaterThanOrEqual(400);
      expect(res.status).toBeLessThan(500);
    });

    it('respects archetypeBias', async () => {
      if (!serverReady) return;
      const res = await fetch(`${API}/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          seed: 'archetype-test-seed',
          archetypeBias: 'petite',
        }),
      });
      const json = await res.json();
      expect(json.friendSeed.genes.body.archetype).toBe('petite');
    });
  });

  describe('POST /breed', () => {
    it('produces a deterministic child', async () => {
      if (!serverReady) return;
      const body = JSON.stringify({
        parentA: 'breed-parent-A',
        parentB: 'breed-parent-B',
        salt: 'child-1',
      });
      const opts = {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
      };
      const r1 = await fetch(`${API}/breed`, opts);
      const r2 = await fetch(`${API}/breed`, opts);
      const j1 = await r1.json();
      const j2 = await r2.json();
      expect(j1.friendSeed.seedHash).toBe(j2.friendSeed.seedHash);
      expect(j1.parents.a.seedHash).toBe(j2.parents.a.seedHash);
      expect(j1.friendSeed.derivation.generation).toBe(1);
    });

    it('child inherits a name from one of its parents', async () => {
      if (!serverReady) return;
      const res = await fetch(`${API}/breed`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          parentA: 'breed-name-A',
          parentB: 'breed-name-B',
        }),
      });
      const json = await res.json();
      const names = [json.parents.a.name, json.parents.b.name];
      expect(names).toContain(json.friendSeed.name);
    });
  });

  describe('POST /mutate', () => {
    it('produces a deterministic mutation given parent+magnitude+salt', async () => {
      if (!serverReady) return;
      const body = JSON.stringify({
        parent: 'mutate-source',
        magnitude: 0.25,
        salt: 'attempt-1',
      });
      const opts = {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
      };
      const r1 = await fetch(`${API}/mutate`, opts);
      const r2 = await fetch(`${API}/mutate`, opts);
      const j1 = await r1.json();
      const j2 = await r2.json();
      expect(j1.friendSeed.seedHash).toBe(j2.friendSeed.seedHash);
      expect(j1.friendSeed.derivation.operator).toBe('mutate');
    });

    it('rejects magnitude > 1', async () => {
      if (!serverReady) return;
      const res = await fetch(`${API}/mutate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ parent: 'x', magnitude: 1.5 }),
      });
      expect(res.status).toBeGreaterThanOrEqual(400);
      expect(res.status).toBeLessThan(500);
    });
  });
});
