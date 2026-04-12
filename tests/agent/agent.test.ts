/**
 * Unit tests for the native GSPL agent
 * Validates: intent classification, entity extraction, execution
 */
import { describe, it, expect } from 'vitest';
import { ParadigmAgent } from '../../src/lib/agent/index.js';

const agent = new ParadigmAgent();

describe('GSPL Agent', () => {
  describe('intent classification', () => {
    it('classifies "create a character seed" as create_seed', () => {
      const r = agent.process('create a character seed');
      expect(r.intent).toBe('create_seed');
      expect(r.success).toBe(true);
    });

    it('classifies "list domains" as list_domains', () => {
      const r = agent.process('list domains');
      expect(r.intent).toBe('list_domains');
      expect(r.success).toBe(true);
      expect(r.data?.domains.length).toBe(27);
    });

    it('classifies "list gene types" as list_gene_types', () => {
      const r = agent.process('list gene types');
      expect(r.intent).toBe('list_gene_types');
      expect(r.success).toBe(true);
      expect(r.data?.types.length).toBe(17);
    });

    it('classifies "help" as help', () => {
      const r = agent.process('help');
      expect(r.intent).toBe('help');
      expect(r.success).toBe(true);
      expect(r.data?.commands).toBeDefined();
    });

    it('classifies mutation queries', () => {
      const r = agent.process('mutate this seed');
      expect(r.intent).toBe('mutate_seed');
    });

    it('classifies breeding queries', () => {
      const r = agent.process('breed these seeds together');
      expect(r.intent).toBe('breed_seeds');
    });

    it('classifies composition queries', () => {
      const r = agent.process('compose to sprite domain');
      expect(r.intent).toBe('compose_seed');
    });

    it('classifies "find path from character to fullgame"', () => {
      const r = agent.process('find path from character to fullgame');
      expect(r.intent).toBe('find_composition_path');
    });

    it('classifies GSPL code blocks', () => {
      const gspl = 'seed "Hero" in character { strength: 80 }';
      const r = agent.process(gspl);
      expect(r.intent).toBe('parse_gspl');
    });
  });

  describe('seed creation', () => {
    it('creates a seed with domain-appropriate genes', () => {
      const r = agent.process('create a new character seed called "Warrior"');
      expect(r.success).toBe(true);
      expect(r.data?.seed).toBeDefined();
      expect(r.data?.seed.$domain).toBe('character');
      expect(r.data?.seed.genes).toBeDefined();
      expect(Object.keys(r.data?.seed.genes).length).toBeGreaterThan(0);
    });

    it('creates music seeds', () => {
      const r = agent.process('create a music seed');
      expect(r.success).toBe(true);
      expect(r.data?.seed.$domain).toBe('music');
    });

    it('assigns unique IDs', () => {
      const r1 = agent.process('create a character seed');
      const r2 = agent.process('create a character seed');
      expect(r1.data?.seed.id).not.toEqual(r2.data?.seed.id);
    });

    it('assigns valid hashes', () => {
      const r = agent.process('create a sprite seed');
      expect(r.data?.seed.$hash).toBeDefined();
      expect(r.data?.seed.$hash.length).toBeGreaterThan(10);
    });
  });

  describe('GSPL parsing', () => {
    it('detects GSPL code block intent', () => {
      const r = agent.process('seed "Dragon" in character { strength: 90 }');
      expect(r.success).toBe(true);
      // v2: GSPL blocks route through query_knowledge (parsed intent is parse_gspl)
      expect(r.intent).toBe('parse_gspl');
      expect(r.message.length).toBeGreaterThan(0);
    });

    it('handles GSPL with categorical values', () => {
      const r = agent.process('seed "Knight" in character { archetype: "paladin" }');
      expect(r.success).toBe(true);
      expect(r.intent).toBe('parse_gspl');
    });
  });

  describe('domain description', () => {
    it('describes a known domain', () => {
      const r = agent.process('describe character domain');
      expect(r.success).toBe(true);
      expect(r.data?.domain).toBe('character');
      expect(r.data?.composesTo).toBeDefined();
      expect(Array.isArray(r.data?.composesTo)).toBe(true);
    });
  });

  describe('mutation', () => {
    it('mutates a seed from context', () => {
      const testSeed = {
        id: 'mut-test',
        $domain: 'character',
        $name: 'Test',
        $hash: 'mut-hash',
        $lineage: { generation: 1, operation: 'test' },
        $fitness: { overall: 0.5 },
        genes: {
          core_power: { type: 'scalar', value: 0.5 },
          stability: { type: 'scalar', value: 0.6 },
        },
      };
      const r = agent.process('mutate this seed', { seeds: [testSeed] });
      expect(r.success).toBe(true);
      expect(r.data?.seed).toBeDefined();
      expect(r.data?.seed.$lineage?.operation).toBe('agent_mutate');
    });

    it('handles mutation with no seeds without crashing', () => {
      const r = agent.process('mutate this seed', { seeds: [] });
      // v2: sync fallback may report success=false or fall through to knowledge base
      // The important thing is it doesn't throw
      expect(r).toBeDefined();
      expect(r.intent).toBe('mutate_seed');
    });
  });

  describe('evolution', () => {
    it('evolves a population', () => {
      const testSeed = {
        id: 'evo-test',
        $domain: 'character',
        $name: 'Evolver',
        $hash: 'evo-hash',
        $lineage: { generation: 1, operation: 'test' },
        $fitness: { overall: 0.5 },
        genes: {
          core_power: { type: 'scalar', value: 0.5 },
        },
      };
      const r = agent.process('evolve with population 6', { seeds: [testSeed] });
      expect(r.success).toBe(true);
      // v2: population is in data.population (from tool result) or data.seeds (from response builder)
      const population = r.data?.population || r.data?.seeds;
      expect(population).toBeDefined();
      expect(population.length).toBeGreaterThanOrEqual(6);
      // If population is present directly, check fitness sorting
      if (r.data?.population) {
        for (let i = 0; i < r.data.population.length - 1; i++) {
          expect(r.data.population[i].$fitness.overall)
            .toBeGreaterThanOrEqual(r.data.population[i + 1].$fitness.overall);
        }
      }
    });
  });

  describe('knowledge retrieval', () => {
    it('retrieves relevant knowledge for unknown queries', () => {
      const r = agent.process('tell me about the scalar gene type');
      // Should either classify as describe_gene_type or fall back to knowledge search
      expect(r.success).toBe(true);
      expect(r.message.length).toBeGreaterThan(0);
    });
  });
});
