/**
 * AGENT TOOL SYSTEM TESTS
 *
 * Determinism tests for the agent tool system.
 * Verifies that same inputs produce same outputs (key invariant).
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { executeTool, getAvailableTools } from '../../src/lib/agent/tools';
import { InferenceTier } from '../../src/lib/agent/types';
import type { ToolContext } from '../../src/lib/agent/types';

async function execAndAccumulate(toolName: string, params: any, ctx: ToolContext): Promise<any> {
  const result = await executeTool(toolName, params, ctx);
  if (result.seedsCreated) {
    ctx.seeds.push(...result.seedsCreated);
  }
  return result;
}

function makeTestContext(seeds: any[] = []): ToolContext {
  return {
    seeds,
    plan: { query: 'test', intent: 'create_seed' as any, steps: [], currentStep: 0, status: 'planning' },
    memory: [],
    agentConfig: {
      persona: 'architect',
      name: 'Test Agent',
      temperature: 0.3,
      reasoningDepth: 0.5,
      explorationRate: 0.2,
      confidenceThreshold: 0.7,
      verbosity: 0.5,
      autonomy: 0.3,
      creativityBias: 0.4,
      maxSteps: 10,
      memoryWindow: 25,
      domainWeights: new Array(27).fill(1 / 27),
      geneWeights: new Array(17).fill(1 / 17),
      tools: { web_browse: false, file_write: false, fork_agent: false, delegate: false },
      systemPrompt: 'Test prompt.',
    },
  };
}

describe('Agent Tool System - Determinism', () => {
  describe('create_seed', () => {
    it('should produce identical results for identical inputs', async () => {
      const ctx = makeTestContext();

      const result1 = await executeTool('create_seed', {
        domain: 'character',
        name: 'TestHero',
        genes: {
          strength: { type: 'scalar', value: 0.8 },
          agility: { type: 'scalar', value: 0.5 },
          archetype: { type: 'categorical', value: 'warrior' },
        },
      }, ctx);

      const result2 = await executeTool('create_seed', {
        domain: 'character',
        name: 'TestHero',
        genes: {
          strength: { type: 'scalar', value: 0.8 },
          agility: { type: 'scalar', value: 0.5 },
          archetype: { type: 'categorical', value: 'warrior' },
        },
      }, ctx);

      expect(result1.success).toBe(true);
      expect(result2.success).toBe(true);

      const seed1 = result1.data?.seed;
      const seed2 = result2.data?.seed;

      // Same domain, name, hash
      expect(seed1.$domain).toBe(seed2.$domain);
      expect(seed1.$name).toBe(seed2.$name);
      expect(seed1.$hash).toBe(seed2.$hash);

      // Same fitness (derived from deterministic RNG)
      expect(seed1.$fitness?.overall).toBe(seed2.$fitness?.overall);

      // Same genes
      expect(seed1.genes).toEqual(seed2.genes);

      // NOTE: IDs differ because they use a deterministic counter
      // (each tool call increments the counter)
      expect(seed1.id).not.toBe(seed2.id);
    });

    it('should produce different results for different genes', async () => {
      const ctx = makeTestContext();

      const result1 = await executeTool('create_seed', {
        domain: 'character',
        name: 'HeroA',
        genes: { strength: { type: 'scalar', value: 0.9 } },
      }, ctx);

      const result2 = await executeTool('create_seed', {
        domain: 'character',
        name: 'HeroB',
        genes: { strength: { type: 'scalar', value: 0.3 } },
      }, ctx);

      expect(result1.data?.seed.$hash).not.toBe(result2.data?.seed.$hash);
    });

    it('should produce deterministic gene values for same RNG salt', async () => {
      const ctx = makeTestContext();

      // Run three times - fitness should be same for same inputs
      const r1 = await executeTool('create_seed', {
        domain: 'music',
        name: 'Melody',
        genes: { tempo: { type: 'scalar', value: 0.5 }, key: { type: 'categorical', value: 'C' } },
      }, ctx);

      const r2 = await executeTool('create_seed', {
        domain: 'music',
        name: 'Melody',
        genes: { tempo: { type: 'scalar', value: 0.5 }, key: { type: 'categorical', value: 'C' } },
      }, ctx);

      const r3 = await executeTool('create_seed', {
        domain: 'music',
        name: 'Melody',
        genes: { tempo: { type: 'scalar', value: 0.5 }, key: { type: 'categorical', value: 'C' } },
      }, ctx);

      expect(r1.data?.seed.$fitness?.overall).toBe(r2.data?.seed.$fitness?.overall);
      expect(r2.data?.seed.$fitness?.overall).toBe(r3.data?.seed.$fitness?.overall);
    });
  });

  describe('mutate_seed', () => {
    it('should produce identical mutations for identical inputs', async () => {
      const ctx = makeTestContext();

      // Create a seed first
      const createResult = await executeTool('create_seed', {
        domain: 'character',
        name: 'BaseHero',
        genes: { strength: { type: 'scalar', value: 0.5 } },
      }, ctx);

      const seed = createResult.data?.seed;

      // Mutate twice with same parameters
      const ctx1 = makeTestContext([seed]);
      const ctx2 = makeTestContext([seed]);

      const r1 = await executeTool('mutate_seed', { seedIndex: 0, rate: 0.5 }, ctx1);
      const r2 = await executeTool('mutate_seed', { seedIndex: 0, rate: 0.5 }, ctx2);

      expect(r1.success).toBe(true);
      expect(r2.success).toBe(true);

      // Same hash → same content
      expect(r1.data?.seed.$hash).toBe(r2.data?.seed.$hash);
    });
  });

  describe('breed_seeds', () => {
    it('should produce identical offspring for identical parents', async () => {
      let seeds: any[] = [];

      // Create two parent seeds and accumulate them
      const rA = await executeTool('create_seed', {
        domain: 'character', name: 'ParentA',
        genes: { strength: { type: 'scalar', value: 0.8 }, color: { type: 'categorical', value: 'red' } },
      }, makeTestContext());
      if (rA.seedsCreated) seeds.push(...rA.seedsCreated);

      const rB = await executeTool('create_seed', {
        domain: 'character', name: 'ParentB',
        genes: { strength: { type: 'scalar', value: 0.3 }, color: { type: 'categorical', value: 'blue' } },
      }, makeTestContext());
      if (rB.seedsCreated) seeds.push(...rB.seedsCreated);

      // Breed twice
      const ctx1 = makeTestContext([...seeds]);
      const ctx2 = makeTestContext([...seeds]);

      const r1 = await executeTool('breed_seeds', { indexA: 0, indexB: 1 }, ctx1);
      const r2 = await executeTool('breed_seeds', { indexA: 0, indexB: 1 }, ctx2);

      expect(r1.success).toBe(true);
      expect(r2.success).toBe(true);

      // Offspring should have same hash
      expect(r1.data?.seed.$hash).toBe(r2.data?.seed.$hash);
    });
  });

  describe('evolve_seeds', () => {
    it('should produce identical populations for identical inputs', async () => {
      let seeds: any[] = [];

      const rCreate = await executeTool('create_seed', {
        domain: 'character', name: 'EvolveBase',
        genes: { strength: { type: 'scalar', value: 0.5 } },
      }, makeTestContext());
      if (rCreate.seedsCreated) seeds.push(...rCreate.seedsCreated);

      const ctx1 = makeTestContext([...seeds]);
      const ctx2 = makeTestContext([...seeds]);


      const r1 = await executeTool('evolve_seeds', { seedIndex: 0, populationSize: 3 }, ctx1);
      const r2 = await executeTool('evolve_seeds', { seedIndex: 0, populationSize: 3 }, ctx2);

      expect(r1.success).toBe(true);
      expect(r2.success).toBe(true);

      const pop1 = r1.data?.population;
      const pop2 = r2.data?.population;

      expect(pop1.length).toBe(pop2.length);
      for (let i = 0; i < pop1.length; i++) {
        // Same hash → same content (deterministic)
        expect(pop1[i].$hash).toBe(pop2[i].$hash);
        expect(pop1[i].$fitness?.overall).toBe(pop2[i].$fitness?.overall);
      }
    });
  });

  describe('tool registry', () => {
    it('should have all expected kernel tools', () => {
      const tools = getAvailableTools({ web_browse: false, file_write: false, fork_agent: false, delegate: false });
      const expectedTools = [
        'create_seed', 'mutate_seed', 'breed_seeds', 'compose_seed',
        'grow_seed', 'evolve_seeds', 'compute_distance', 'find_path',
        'query_knowledge', 'execute_gspl',
      ];

      for (const name of expectedTools) {
        expect(tools.has(name)).toBe(true);
      }
    });
  });
});
