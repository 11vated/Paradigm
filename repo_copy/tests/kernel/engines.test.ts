/**
 * Unit tests for the 27 domain engines
 * Validates: engine registry, growSeed dispatch, output structure
 */
import { describe, it, expect } from 'vitest';
import { ENGINES, growSeed, getAllDomains } from '../../src/lib/kernel/engines.js';

describe('Domain Engines', () => {
  describe('registry', () => {
    it('has exactly 27 engines', () => {
      expect(getAllDomains().length).toBe(27);
    });

    it('getAllDomains returns string array', () => {
      const domains = getAllDomains();
      for (const d of domains) {
        expect(typeof d).toBe('string');
        expect(d.length).toBeGreaterThan(0);
      }
    });

    it('contains critical domains', () => {
      const domains = getAllDomains();
      const critical = ['character', 'sprite', 'music', 'visual2d', 'procedural', 'fullgame', 'physics', 'narrative', 'geometry3d', 'agent'];
      for (const c of critical) {
        expect(domains).toContain(c);
      }
    });
  });

  describe('growSeed', () => {
    const baseSeed = (domain: string) => ({
      id: 'test-id',
      $domain: domain,
      $name: 'Test Seed',
      $lineage: { generation: 1, operation: 'test' },
      $hash: 'abc123',
      $fitness: { overall: 0.5 },
      genes: {
        core_power: { type: 'scalar', value: 0.7 },
        stability: { type: 'scalar', value: 0.5 },
        complexity: { type: 'scalar', value: 0.4 },
      },
    });

    it('returns an object for every domain', () => {
      for (const domain of getAllDomains()) {
        const seed = baseSeed(domain);
        const result = growSeed(seed);
        expect(result).toBeDefined();
        expect(typeof result).toBe('object');
      }
    });

    it('character engine produces character artifact', () => {
      const seed = {
        ...baseSeed('character'),
        genes: {
          ...baseSeed('character').genes,
          archetype: { type: 'categorical', value: 'warrior' },
          strength: { type: 'scalar', value: 0.8 },
          agility: { type: 'scalar', value: 0.6 },
          intelligence: { type: 'scalar', value: 0.3 },
        },
      };
      const result = growSeed(seed);
      expect(result).toBeDefined();
    });

    it('music engine produces music artifact', () => {
      const seed = {
        ...baseSeed('music'),
        genes: {
          ...baseSeed('music').genes,
          tempo: { type: 'scalar', value: 0.6 },
          key: { type: 'categorical', value: 'C' },
          scale: { type: 'categorical', value: 'major' },
        },
      };
      const result = growSeed(seed);
      expect(result).toBeDefined();
    });

    it('handles seeds with minimal genes', () => {
      const seed = {
        id: 'minimal',
        $domain: 'character',
        $name: 'Minimal',
        $lineage: { generation: 0, operation: 'test' },
        $hash: 'min',
        $fitness: { overall: 0.1 },
        genes: {},
      };
      // Should not throw even with empty genes
      expect(() => growSeed(seed)).not.toThrow();
    });

    it('agent engine produces agent config artifact', () => {
      const seed = {
        ...baseSeed('agent'),
        genes: {
          persona: { type: 'categorical', value: 'architect' },
          temperature: { type: 'scalar', value: 0.7 },
          reasoning_depth: { type: 'scalar', value: 0.8 },
          exploration_rate: { type: 'scalar', value: 0.3 },
          confidence_threshold: { type: 'scalar', value: 0.6 },
          verbosity: { type: 'scalar', value: 0.5 },
          autonomy: { type: 'scalar', value: 0.7 },
          creativity_bias: { type: 'scalar', value: 0.4 },
          max_reasoning_steps: { type: 'scalar', value: 0.5 },
          context_window: { type: 'scalar', value: 0.6 },
          domain_focus: { type: 'vector', value: new Array(27).fill(0).map((_, i) => i === 0 ? 1 : 0) },
          gene_expertise: { type: 'vector', value: new Array(17).fill(0).map((_, i) => i === 0 ? 1 : 0) },
          tool_permissions: { type: 'struct', value: { create: true, mutate: true, breed: true, compose: true, grow: true, evolve: true, compute_distance: true, find_path: true, query_knowledge: true } },
        },
      };
      const result = growSeed(seed);
      expect(result).toBeDefined();
      expect(result.config).toBeDefined();
      expect(result.render_hints?.mode).toBe('chat_interface');
    });

    it('returns different results for different gene values', () => {
      const seedA = {
        ...baseSeed('character'),
        $name: 'WeakOne',
        genes: { core_power: { type: 'scalar', value: 0.1 }, archetype: { type: 'categorical', value: 'rogue' } },
      };
      const seedB = {
        ...baseSeed('character'),
        $name: 'StrongOne',
        genes: { core_power: { type: 'scalar', value: 0.9 }, archetype: { type: 'categorical', value: 'warrior' } },
      };
      const resultA = JSON.stringify(growSeed(seedA));
      const resultB = JSON.stringify(growSeed(seedB));
      expect(resultA).not.toEqual(resultB);
    });
  });
});
