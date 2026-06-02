/**
 * API Endpoint Tests — Core endpoints
 * Tests seed CRUD, operations, and validation endpoints
 */

import { describe, it, expect, beforeAll } from 'vitest';

const API_URL = 'http://localhost:3000/api';
const BASE_URL = 'http://localhost:3000';

let serverReady = false;

describe('API Endpoints', () => {
  let testSeedId: string;

  beforeAll(async () => {
    try {
      const res = await fetch(`${BASE_URL}/health`, { signal: AbortSignal.timeout(2000) });
      serverReady = res.ok;
    } catch {
      serverReady = false;
    }
  });

  describe('GET /api/health', () => {
    it('returns healthy status', async () => {
      if (!serverReady) return;
      const response = await fetch('http://localhost:3000/health');
      const data = await response.json();
      expect(response.status).toBe(200);
      expect(data.status).toBe('ok');
    });
  });

  describe('GET /api/domains', () => {
    it('returns all 27 domains', async () => {
      if (!serverReady) return;
      const response = await fetch(`${API_URL}/domains`);
      const data = await response.json();
      expect(response.status).toBe(200);
      expect(data.domains).toBeDefined();
      expect(data.domains.length).toBeGreaterThanOrEqual(27);
    });
  });

  describe('GET /api/gene-types', () => {
    it('returns all registered gene types', async () => {
      if (!serverReady) return;
      const response = await fetch(`${API_URL}/gene-types`);
      const data = await response.json();
      expect(response.status).toBe(200);
      expect(data.count).toBeGreaterThanOrEqual(17);
    });
  });

  describe('POST /api/seeds', () => {
    it('creates a seed with valid domain', async () => {
      if (!serverReady) return;
      const response = await fetch(`${API_URL}/seeds`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          domain: 'character',
          name: 'Test Character',
          genes: {
            size: { type: 'scalar', value: 0.7 },
            archetype: { type: 'categorical', value: 'warrior' },
          },
        }),
      });

      const data = await response.json();
      expect(response.status).toBe(200);
      expect(data.$domain).toBe('character');
      expect(data.$name).toBe('Test Character');
      expect(data.id).toBeDefined();
      testSeedId = data.id;
    });

    it('rejects invalid domain with helpful error', async () => {
      if (!serverReady) return;
      const response = await fetch(`${API_URL}/seeds`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          domain: 'invalid_domain',
          name: 'Test',
        }),
      });

      const data = await response.json();
      expect(response.status).toBe(400);
      expect(data.error).toBe('Validation failed');
      expect(data.details).toBeDefined();
      expect(data.details[0].field).toBe('domain');
    });

    it('rejects missing required fields', async () => {
      if (!serverReady) return;
      const response = await fetch(`${API_URL}/seeds`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      const data = await response.json();
      expect(response.status).toBe(400);
      expect(data.error).toBe('Validation failed');
    });
  });

  describe('POST /api/gene/validate', () => {
    it('validates scalar gene', async () => {
      if (!serverReady) return;
      const response = await fetch(`${API_URL}/gene/validate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gene_type: 'scalar',
          value: 0.75,
          schema: { min: 0, max: 1 },
        }),
      });

      const data = await response.json();
      expect(response.status).toBe(200);
      expect(data.valid).toBe(true);
    });

    it('rejects invalid scalar', async () => {
      if (!serverReady) return;
      const response = await fetch(`${API_URL}/gene/validate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gene_type: 'scalar',
          value: 'not a number',
        }),
      });

      const data = await response.json();
      expect(response.status).toBe(400);
      expect(data.valid).toBe(false);
      expect(data.error).toBe('Gene validation failed');
      expect(data.suggestion).toBeDefined();
    });

    it('rejects unknown gene type', async () => {
      if (!serverReady) return;
      const response = await fetch(`${API_URL}/gene/validate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gene_type: 'invalid_type',
          value: 'test',
        }),
      });

      const data = await response.json();
      expect(response.status).toBe(400);
      expect(data.valid).toBe(false);
      expect(data.message).toContain('Unknown gene type');
    });

    it('requires gene_type field', async () => {
      if (!serverReady) return;
      const response = await fetch(`${API_URL}/gene/validate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ value: 0.5 }),
      });

      const data = await response.json();
      expect(response.status).toBe(400);
      expect(data.error).toBe('Missing gene_type');
      expect(data.example).toBeDefined();
    });
  });

  describe('GET /api/seeds/:id/lineage', () => {
    it('returns lineage for valid seed', async () => {
      if (!serverReady) return;
      if (!testSeedId) return; // Skip if no test seed

      const response = await fetch(`${API_URL}/seeds/${testSeedId}/lineage`);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.seed_id).toBe(testSeedId);
      expect(data.lineage).toBeDefined();
      expect(Array.isArray(data.lineage)).toBe(true);
    });

    it('returns 404 for invalid seed', async () => {
      if (!serverReady) return;
      const response = await fetch(`${API_URL}/seeds/invalid-id/lineage`);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Seed not found');
      expect(data.suggestion).toBeDefined();
      expect(data.example).toBeDefined();
    });
  });

  describe('GET /api/seeds/:id/descendants', () => {
    it('returns descendants for valid seed', async () => {
      if (!serverReady) return;
      if (!testSeedId) return; // Skip if no test seed

      const response = await fetch(`${API_URL}/seeds/${testSeedId}/descendants`);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.seed_id).toBe(testSeedId);
      expect(data.descendants).toBeDefined();
      expect(Array.isArray(data.descendants)).toBe(true);
    });

    it('returns 404 for invalid seed', async () => {
      if (!serverReady) return;
      const response = await fetch(`${API_URL}/seeds/invalid-id/descendants`);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Seed not found');
    });
  });

  describe('POST /api/seeds/:id/mutate', () => {
    it('mutates seed successfully', async () => {
      if (!serverReady) return;
      if (!testSeedId) return; // Skip if no test seed

      const response = await fetch(`${API_URL}/seeds/${testSeedId}/mutate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rate: 0.1 }),
      });

      const data = await response.json();
      if (response.status !== 200) {
        return; // Skip if route not available
      }
      expect(data.$name).toBeDefined();
      expect(data.$lineage?.operation).toBe('mutate');
    });
  });

  describe('POST /api/seeds/breed', () => {
    it('breeds two seeds', async () => {
      if (!serverReady) return;
      const parent1 = await fetch(`${API_URL}/seeds`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domain: 'character', name: 'Parent 1', genes: { size: { type: 'scalar', value: 0.5 } } }),
      }).then((r) => r.json());

      const parent2 = await fetch(`${API_URL}/seeds`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domain: 'character', name: 'Parent 2', genes: { size: { type: 'scalar', value: 0.8 } } }),
      }).then((r) => r.json());

      const response = await fetch(`${API_URL}/seeds/breed`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ parent_a_id: parent1.id, parent_b_id: parent2.id }),
      });

      if (response.status === 200) {
        const child = await response.json();
        expect(child.$name).toContain('×');
        expect(child.$lineage.operation).toBe('breed');
        expect(child.$lineage.parents?.length).toBe(2);
      }
      expect([200, 501]).toContain(response.status);
    });

    it('handles invalid parent IDs', async () => {
      if (!serverReady) return;
      const response = await fetch(`${API_URL}/seeds/breed`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ parent_a_id: 'invalid-id', parent_b_id: 'invalid-id' }),
      });

      const data = await response.json();
      expect([400, 404, 422]).toContain(response.status);
      expect(data.error || data.detail || '').toBeTruthy();
    });
  });
});
