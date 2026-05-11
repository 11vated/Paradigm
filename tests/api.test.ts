/**
 * API Endpoint Tests — Core endpoints
 * Tests seed CRUD, operations, and validation endpoints
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';

const API_URL = 'http://localhost:3000/api';

describe('API Endpoints', () => {
  let testSeedId: string;

  describe('GET /api/health', () => {
    it('returns healthy status', async () => {
      const response = await fetch(`${API_URL}/health`);
      const data = await response.json();
      expect(response.status).toBe(200);
      expect(data.status).toBe('ok');
    });
  });

  describe('GET /api/domains', () => {
    it('returns all 27 domains', async () => {
      const response = await fetch(`${API_URL}/domains`);
      const data = await response.json();
      expect(response.status).toBe(200);
      expect(data.domains).toBeDefined();
      expect(data.domains.length).toBeGreaterThanOrEqual(27);
    });
  });

  describe('GET /api/gene-types', () => {
    it('returns all 17 gene types', async () => {
      const response = await fetch(`${API_URL}/gene-types`);
      const data = await response.json();
      expect(response.status).toBe(200);
      expect(data.types).toBeDefined();
      expect(Object.keys(data.types).length).toBe(17);
    });
  });

  describe('POST /api/seeds', () => {
    it('creates a seed with valid domain', async () => {
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
      if (!testSeedId) return; // Skip if no test seed

      const response = await fetch(`${API_URL}/seeds/${testSeedId}/lineage`);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.seed_id).toBe(testSeedId);
      expect(data.lineage).toBeDefined();
      expect(Array.isArray(data.lineage)).toBe(true);
    });

    it('returns 404 for invalid seed', async () => {
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
      if (!testSeedId) return; // Skip if no test seed

      const response = await fetch(`${API_URL}/seeds/${testSeedId}/descendants`);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.seed_id).toBe(testSeedId);
      expect(data.descendants).toBeDefined();
      expect(Array.isArray(data.descendants)).toBe(true);
    });

    it('returns 404 for invalid seed', async () => {
      const response = await fetch(`${API_URL}/seeds/invalid-id/descendants`);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Seed not found');
    });
  });

  describe('POST /api/seeds/:id/mutate', () => {
    it('mutates seed successfully', async () => {
      if (!testSeedId) return; // Skip if no test seed

      const response = await fetch(`${API_URL}/seeds/${testSeedId}/mutate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rate: 0.1 }),
      });

      const data = await response.json();
      expect(response.status).toBe(200);
      expect(data.$name).toContain('(Mutated)');
      expect(data.$lineage.operation).toBe('mutate');
      expect(data.$lineage.parents).toContain(expect.any(String));
    });
  });

  describe('POST /api/seeds/breed', () => {
    it('breeds two seeds', async () => {
      // Create two parent seeds first
      const parent1 = await fetch(`${API_URL}/seeds`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          domain: 'character',
          name: 'Parent 1',
          genes: { size: { type: 'scalar', value: 0.5 } },
        }),
      }).then((r) => r.json());

      const parent2 = await fetch(`${API_URL}/seeds`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          domain: 'character',
          name: 'Parent 2',
          genes: { size: { type: 'scalar', value: 0.8 } },
        }),
      }).then((r) => r.json());

      const response = await fetch(`${API_URL}/seeds/breed`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          parent_a_id: parent1.id,
          parent_b_id: parent2.id,
        }),
      });

      const child = await response.json();
      expect(response.status).toBe(200);
      expect(child.$name).toContain('×');
      expect(child.$lineage.operation).toBe('breed');
      expect(child.$lineage.parents).toHaveLength(2);
      expect(child.$lineage.parent_ids).toContain(parent1.id);
      expect(child.$lineage.parent_ids).toContain(parent2.id);
    });

    it('returns 404 for missing parent', async () => {
      const response = await fetch(`${API_URL}/seeds/breed`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          parent_a_id: 'invalid-id',
          parent_b_id: 'invalid-id',
        }),
      });

      const data = await response.json();
      expect(response.status).toBe(404);
      expect(data.detail).toContain('not found');
    });
  });
});
