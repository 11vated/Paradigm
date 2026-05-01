/**
 * Unit tests for the GSPL Agent v2 architecture
 * Validates: multi-step reasoning, tool system, memory, inference fallback,
 * agent seed creation/breeding/evolution/composition, plan execution
 */
import { describe, it, expect, beforeEach } from 'vitest';
import {
  ParadigmAgent,
  parseQuery, buildPlan, executePlan, buildResponse, buildHelpResponse,
  AGENT_TOOLS, executeTool, getAvailableTools,
  AgentMemory,
  InferenceTier, INTENT_TIER,
} from '../../src/lib/agent/index.js';
import type { AgentConfig, ParsedQuery } from '../../src/lib/agent/index.js';
import type { ToolContext } from '../../src/lib/agent/types.js';

// ─── QUERY PARSER ──────────────────────────────────────────────────────────

describe('Query Parser (v2)', () => {
  it('detects multi-step queries with "then"', () => {
    const r = parseQuery('create a character seed then mutate it then grow');
    expect(r.intent).toBe('multi_step');
    expect(r.entities.steps).toBeDefined();
    expect(r.entities.steps!.length).toBeGreaterThanOrEqual(2);
  });

  it('detects multi-step queries with "and then"', () => {
    const r = parseQuery('make a music seed and then evolve it');
    expect(r.intent).toBe('multi_step');
  });

  it('single operation does NOT classify as multi_step', () => {
    const r = parseQuery('create a character seed');
    expect(r.intent).not.toBe('multi_step');
    expect(r.intent).toBe('create_seed');
  });

  it('extracts domain entities', () => {
    const r = parseQuery('compose to sprite domain');
    expect(r.entities.domain).toBeDefined();
  });

  it('extracts quoted seed names', () => {
    const r = parseQuery('create a character seed called "Warlock"');
    expect(r.entities.seedName).toBe('Warlock');
  });

  it('extracts mutation rate', () => {
    const r = parseQuery('mutate this seed rate: 0.3');
    expect(r.entities.mutationRate).toBe(0.3);
  });

  it('extracts population size', () => {
    const r = parseQuery('evolve population 8');
    expect(r.entities.populationSize).toBe(8);
  });

  it('classifies GSPL code blocks with high confidence', () => {
    const r = parseQuery('seed "Dragon" in character { strength: 90 }');
    expect(r.intent).toBe('parse_gspl');
    expect(r.confidence).toBeGreaterThanOrEqual(0.9);
  });

  it('classifies compare/distance queries', () => {
    const r = parseQuery('compare these two seeds');
    expect(r.intent).toBe('compare_seeds');
  });

  it('classifies web search queries', () => {
    const r = parseQuery('search the web for pixel art tutorials');
    expect(r.intent).toBe('web_search');
  });

  it('assigns correct inference tiers', () => {
    expect(INTENT_TIER.list_domains).toBe(InferenceTier.KERNEL);
    expect(INTENT_TIER.create_seed).toBe(InferenceTier.FAST);
    expect(INTENT_TIER.compose_seed).toBe(InferenceTier.STANDARD);
    expect(INTENT_TIER.multi_step).toBe(InferenceTier.DEEP);
  });

  it('returns confidence score between 0 and 1', () => {
    const r = parseQuery('create a character seed');
    expect(r.confidence).toBeGreaterThan(0);
    expect(r.confidence).toBeLessThanOrEqual(1);
  });
});

// ─── PLAN BUILDER ──────────────────────────────────────────────────────────

describe('Plan Builder', () => {
  it('builds single-step plan for create_seed', () => {
    const parsed = parseQuery('create a character seed called "Hero"');
    const plan = buildPlan(parsed, []);
    expect(plan.steps.length).toBe(1);
    expect(plan.steps[0].operation).toBe('create_seed');
    expect(plan.status).toBe('executing');
  });

  it('builds single-step plan for mutate_seed', () => {
    const parsed = parseQuery('mutate this seed');
    const plan = buildPlan(parsed, []);
    expect(plan.steps.length).toBe(1);
    expect(plan.steps[0].operation).toBe('mutate_seed');
  });

  it('builds multi-step plan from chained query', () => {
    const parsed = parseQuery('create a character seed then mutate it then grow it');
    expect(parsed.intent).toBe('multi_step');
    const plan = buildPlan(parsed, []);
    expect(plan.steps.length).toBeGreaterThanOrEqual(2);
    // Each step after the first should depend on the previous
    for (let i = 1; i < plan.steps.length; i++) {
      expect(plan.steps[i].dependsOn.length).toBeGreaterThan(0);
    }
  });

  it('builds plan for evolve_seed with population params', () => {
    const parsed = parseQuery('evolve with population 6');
    const plan = buildPlan(parsed, []);
    expect(plan.steps[0].operation).toBe('evolve_seeds');
    expect(plan.steps[0].params.populationSize).toBe(6);
  });

  it('builds plan for compose_seed with target domain', () => {
    const parsed = parseQuery('compose to sprite');
    const plan = buildPlan(parsed, []);
    expect(plan.steps[0].operation).toBe('compose_seed');
  });

  it('builds plan for find_composition_path', () => {
    const parsed = parseQuery('find path from character to fullgame');
    const plan = buildPlan(parsed, []);
    expect(plan.steps[0].operation).toBe('find_path');
  });
});

// ─── TOOL SYSTEM ───────────────────────────────────────────────────────────

describe('Tool System', () => {
  it('has 10 kernel tools registered', () => {
    // Phase 0: registry grew to include execute_gspl alongside the original 9.
    expect(AGENT_TOOLS.size).toBe(10);
  });

  it('all kernel tools have required properties', () => {
    for (const [name, tool] of AGENT_TOOLS) {
      expect(tool.name).toBe(name);
      expect(tool.description.length).toBeGreaterThan(0);
      expect(tool.category).toBe('kernel');
      expect(typeof tool.execute).toBe('function');
      expect(tool.parameters).toBeDefined();
    }
  });

  const makeToolContext = (seeds: any[] = []): ToolContext => ({
    seeds,
    memory: [],
    agentConfig: {
      persona: 'architect', name: 'Test Agent', temperature: 0.3,
      reasoningDepth: 0.5, explorationRate: 0.2, confidenceThreshold: 0.7,
      verbosity: 0.5, autonomy: 0.3, creativityBias: 0.4,
      maxSteps: 10, memoryWindow: 25,
      domainWeights: new Array(27).fill(1 / 27),
      geneWeights: new Array(17).fill(1 / 17),
      tools: { web_browse: false, file_write: false, fork_agent: false, delegate: false },
      systemPrompt: 'test',
    },
  });

  it('create_seed tool produces a valid seed', async () => {
    const result = await executeTool('create_seed', {
      domain: 'character', name: 'ToolTestHero',
      genes: { strength: { type: 'scalar', value: 0.8 } },
    }, makeToolContext());
    expect(result.success).toBe(true);
    expect(result.seedsCreated).toBeDefined();
    expect(result.seedsCreated![0].$domain).toBe('character');
    expect(result.seedsCreated![0].$name).toBe('ToolTestHero');
    expect(result.seedsCreated![0].id).toBeDefined();
    expect(result.seedsCreated![0].$hash).toBeDefined();
  });

  it('mutate_seed tool mutates from context', async () => {
    const seed = {
      id: 'mut-tool', $domain: 'character', $name: 'MutTarget',
      $hash: 'muthash', $lineage: { generation: 1, operation: 'test' },
      $fitness: { overall: 0.5 },
      genes: { core_power: { type: 'scalar', value: 0.5 }, stability: { type: 'scalar', value: 0.6 } },
    };
    const result = await executeTool('mutate_seed', { seedIndex: -1, rate: 0.5 }, makeToolContext([seed]));
    expect(result.success).toBe(true);
    expect(result.seedsCreated![0].$lineage.operation).toBe('agent_mutate');
  });

  it('mutate_seed fails with no seeds', async () => {
    const result = await executeTool('mutate_seed', { seedIndex: -1, rate: 0.15 }, makeToolContext([]));
    expect(result.success).toBe(false);
  });

  it('breed_seeds tool crossovers two seeds', async () => {
    const seedA = {
      id: 'breedA', $domain: 'character', $name: 'ParentA',
      $hash: 'hashA', $lineage: { generation: 1, operation: 'test' },
      $fitness: { overall: 0.6 },
      genes: { core_power: { type: 'scalar', value: 0.8 } },
    };
    const seedB = {
      id: 'breedB', $domain: 'character', $name: 'ParentB',
      $hash: 'hashB', $lineage: { generation: 1, operation: 'test' },
      $fitness: { overall: 0.4 },
      genes: { core_power: { type: 'scalar', value: 0.2 } },
    };
    const result = await executeTool('breed_seeds', { indexA: 0, indexB: 1 }, makeToolContext([seedA, seedB]));
    expect(result.success).toBe(true);
    expect(result.seedsCreated![0].$lineage.operation).toBe('agent_breed');
    expect(result.seedsCreated![0].$lineage.parents).toContain('hashA');
    expect(result.seedsCreated![0].$lineage.parents).toContain('hashB');
  });

  it('breed_seeds fails with less than 2 seeds', async () => {
    const seed = {
      id: 'only', $domain: 'character', $name: 'Lonely',
      $hash: 'lonely', $lineage: { generation: 0, operation: 'test' },
      $fitness: { overall: 0.5 }, genes: {},
    };
    const result = await executeTool('breed_seeds', { indexA: -2, indexB: -1 }, makeToolContext([seed]));
    expect(result.success).toBe(false);
  });

  it('evolve_seeds tool produces ranked population', async () => {
    const seed = {
      id: 'evo', $domain: 'character', $name: 'Evolver',
      $hash: 'evohash', $lineage: { generation: 1, operation: 'test' },
      $fitness: { overall: 0.5 },
      genes: { core_power: { type: 'scalar', value: 0.5 } },
    };
    const result = await executeTool('evolve_seeds', { seedIndex: -1, populationSize: 5 }, makeToolContext([seed]));
    expect(result.success).toBe(true);
    expect(result.seedsCreated!.length).toBe(5);
    // Verify sorted by fitness descending
    for (let i = 0; i < result.seedsCreated!.length - 1; i++) {
      expect(result.seedsCreated![i].$fitness.overall)
        .toBeGreaterThanOrEqual(result.seedsCreated![i + 1].$fitness.overall);
    }
  });

  it('compute_distance tool measures genetic distance', async () => {
    const seedA = {
      id: 'dA', $domain: 'character', $name: 'A',
      $hash: 'dA', $lineage: { generation: 0, operation: 'test' },
      $fitness: { overall: 0.5 },
      genes: { core_power: { type: 'scalar', value: 0.1 } },
    };
    const seedB = {
      id: 'dB', $domain: 'character', $name: 'B',
      $hash: 'dB', $lineage: { generation: 0, operation: 'test' },
      $fitness: { overall: 0.5 },
      genes: { core_power: { type: 'scalar', value: 0.9 } },
    };
    const result = await executeTool('compute_distance', { indexA: 0, indexB: 1 }, makeToolContext([seedA, seedB]));
    expect(result.success).toBe(true);
    expect(result.data.averageDistance).toBeGreaterThan(0);
    expect(result.data.geneCount).toBe(1);
  });

  it('find_path tool finds composition path', async () => {
    const result = await executeTool('find_path', { source: 'character', target: 'sprite' }, makeToolContext());
    expect(result.success).toBe(true);
    expect(result.data.path.length).toBeGreaterThan(0);
  });

  it('query_knowledge tool returns results', async () => {
    const result = await executeTool('query_knowledge', { query: 'character domain' }, makeToolContext());
    expect(result.success).toBe(true);
    expect(result.data.results.length).toBeGreaterThan(0);
  });

  it('executeTool returns error for unknown tool', async () => {
    const result = await executeTool('nonexistent_tool', {}, makeToolContext());
    expect(result.success).toBe(false);
    expect(result.message).toContain('Unknown tool');
  });

  it('getAvailableTools returns all kernel tools', () => {
    const available = getAvailableTools({});
    expect(available.size).toBe(10);
    for (const [, tool] of available) {
      expect(tool.category).toBe('kernel');
    }
  });
});

// ─── MEMORY SYSTEM ─────────────────────────────────────────────────────────

describe('Agent Memory', () => {
  let memory: AgentMemory;

  beforeEach(() => {
    memory = new AgentMemory(5);
  });

  it('starts empty', () => {
    expect(memory.size).toBe(0);
    expect(memory.turnCount).toBe(0);
  });

  it('tracks user messages', () => {
    memory.addUserMessage('create a seed', ['hash1']);
    expect(memory.size).toBe(1);
    expect(memory.turnCount).toBe(1);
  });

  it('tracks agent responses', () => {
    memory.addUserMessage('test query');
    memory.addAgentResponse('response text', 'create_seed', ['newhash']);
    expect(memory.size).toBe(2);
    expect(memory.turnCount).toBe(1); // turn increments on user message only
  });

  it('sliding window trims old entries', () => {
    // maxEntries=5, so max storage = 10 (5*2)
    for (let i = 0; i < 8; i++) {
      memory.addUserMessage(`query ${i}`);
      memory.addAgentResponse(`response ${i}`, 'help');
    }
    // Should be trimmed to <= 10
    expect(memory.size).toBeLessThanOrEqual(10);
  });

  it('formatForPrompt returns recent context', () => {
    memory.addUserMessage('first query');
    memory.addAgentResponse('first response', 'help');
    memory.addUserMessage('second query');
    memory.addAgentResponse('second response', 'create_seed');
    const formatted = memory.formatForPrompt(500);
    expect(formatted).toContain('first query');
    expect(formatted).toContain('second response');
  });

  it('getRecentSeedHashes tracks seeds', () => {
    memory.addUserMessage('make a seed', ['existing_hash']);
    memory.addAgentResponse('created seed', 'create_seed', ['new_hash']);
    const { referenced, created } = memory.getRecentSeedHashes();
    expect(referenced.has('existing_hash')).toBe(true);
    expect(created.has('new_hash')).toBe(true);
  });

  it('getRecentIntents returns agent intents in order', () => {
    memory.addUserMessage('q1');
    memory.addAgentResponse('r1', 'create_seed');
    memory.addUserMessage('q2');
    memory.addAgentResponse('r2', 'mutate_seed');
    const intents = memory.getRecentIntents();
    expect(intents).toEqual(['create_seed', 'mutate_seed']);
  });

  it('clear resets everything', () => {
    memory.addUserMessage('test');
    memory.addAgentResponse('resp', 'help');
    memory.clear();
    expect(memory.size).toBe(0);
    expect(memory.turnCount).toBe(0);
  });

  it('setMaxEntries adjusts window size', () => {
    memory.setMaxEntries(2);
    for (let i = 0; i < 5; i++) {
      memory.addUserMessage(`q${i}`);
      memory.addAgentResponse(`r${i}`, 'help');
    }
    expect(memory.size).toBeLessThanOrEqual(4); // 2 * 2
  });
});

// ─── AGENT SEED CREATION & COMPOSITION ──────────────────────────────────────

describe('Agent Seed Operations', () => {
  const agent = new ParadigmAgent();

  it('creates an agent domain seed', async () => {
    const r = await agent.process('create an agent seed');
    expect(r.success).toBe(true);
    expect(r.data?.seed || r.data?.seeds?.[0]).toBeDefined();
    const seed = r.data?.seed || r.data?.seeds?.[0];
    expect(seed.$domain).toBe('agent');
  });

  it('agent seed has rich genes (not just 3 generic)', async () => {
    const r = await agent.process('create an agent seed called "Nova"');
    expect(r.success).toBe(true);
    const seed = r.data?.seed || r.data?.seeds?.[0];
    const geneCount = Object.keys(seed.genes).length;
    expect(geneCount).toBeGreaterThan(5); // should have persona, temperature, etc.
  });

  it('agent seed has unique ID', async () => {
    const r1 = await agent.process('create an agent seed');
    const r2 = await agent.process('create an agent seed');
    const seed1 = r1.data?.seed || r1.data?.seeds?.[0];
    const seed2 = r2.data?.seed || r2.data?.seeds?.[0];
    // IDs use crypto.randomUUID so they're always unique
    expect(seed1.id).not.toBe(seed2.id);
  });

  it('character seed has rich genes from template', async () => {
    const r = await agent.process('create a character seed called "Warrior"');
    expect(r.success).toBe(true);
    const seed = r.data?.seed || r.data?.seeds?.[0];
    expect(seed.$domain).toBe('character');
    const genes = Object.keys(seed.genes);
    // Character template has archetype, strength, agility, intelligence, size, palette, personality + core genes
    expect(genes.length).toBeGreaterThanOrEqual(7);
  });

  it('music seed has rich genes from template', async () => {
    const r = await agent.process('create a music seed');
    expect(r.success).toBe(true);
    const seed = r.data?.seed || r.data?.seeds?.[0];
    expect(seed.$domain).toBe('music');
    const genes = Object.keys(seed.genes);
    expect(genes.length).toBeGreaterThanOrEqual(5);
  });
});

// ─── HELP RESPONSE ─────────────────────────────────────────────────────────

describe('Help Response (v2)', () => {
  it('buildHelpResponse returns v2 capabilities', () => {
    const r = buildHelpResponse();
    expect(r.success).toBe(true);
    expect(r.intent).toBe('help');
    expect(r.data?.commands.length).toBeGreaterThanOrEqual(10);
    expect(r.data?.capabilities.domains).toBe(27);
    expect(r.data?.capabilities.geneTypes).toBe(17);
    expect(r.data?.capabilities.functorBridges).toBe(12);
  });
});

// ─── INTEGRATED AGENT (ParadigmAgent) ──────────────────────────────────────

describe('ParadigmAgent v2 integration', () => {
  const agent = new ParadigmAgent();

  it('process() returns timing data', async () => {
    const r = await agent.process('list domains');
    expect(r.timing).toBeDefined();
    expect(r.timing!.totalMs).toBeGreaterThanOrEqual(0);
  });

  it('process() returns suggestions for create_seed', async () => {
    const r = await agent.process('create a character seed');
    expect(r.suggestions).toBeDefined();
    expect(r.suggestions!.length).toBeGreaterThan(0);
  });

  it('getStats() returns comprehensive stats', () => {
    const stats = agent.getStats();
    expect(stats.config).toBeDefined();
    expect(stats.domainsKnown).toBe(27);
    expect(stats.geneTypesKnown).toBe(17);
    expect(stats.toolsAvailable).toBe(10);
    expect(stats.memorySize).toBeGreaterThanOrEqual(0);
  });

  it('loadConfig() updates agent configuration', () => {
    const custom: AgentConfig = {
      persona: 'artist', name: 'Custom Agent', temperature: 0.8,
      reasoningDepth: 0.9, explorationRate: 0.5, confidenceThreshold: 0.3,
      verbosity: 0.8, autonomy: 0.9, creativityBias: 0.9,
      maxSteps: 20, memoryWindow: 10,
      domainWeights: new Array(27).fill(1 / 27),
      geneWeights: new Array(17).fill(1 / 17),
      tools: { web_browse: true, file_write: false, fork_agent: false, delegate: false },
      systemPrompt: 'Custom prompt.',
    };
    const customAgent = new ParadigmAgent();
    customAgent.loadConfig(custom);
    const stats = customAgent.getStats();
    expect(stats.config.persona).toBe('artist');
    expect(stats.config.temperature).toBe(0.8);
  });

  it('gracefully handles unknown queries via knowledge base', async () => {
    const r = await agent.process('tell me about the scalar gene type');
    expect(r.success).toBe(true);
    expect(r.message.length).toBeGreaterThan(0);
  });

  it('tracks memory across sequential calls', async () => {
    const a = new ParadigmAgent();
    await a.process('list domains');
    await a.process('create a character seed');
    const stats = a.getStats();
    expect(stats.memoryTurns).toBe(2);
    expect(stats.memorySize).toBeGreaterThanOrEqual(4); // 2 user + 2 agent entries
  });
});

// ─── PLAN EXECUTION (async) ────────────────────────────────────────────────

describe('Plan Execution (async)', () => {
  it('executes a single-step plan', async () => {
    const parsed = parseQuery('create a character seed called "AsyncHero"');
    const plan = buildPlan(parsed, []);
    const ctx: ToolContext = {
      seeds: [],
      memory: [],
      agentConfig: {
        persona: 'architect', name: 'Test', temperature: 0.3,
        reasoningDepth: 0.5, explorationRate: 0.2, confidenceThreshold: 0.7,
        verbosity: 0.5, autonomy: 0.3, creativityBias: 0.4,
        maxSteps: 10, memoryWindow: 25,
        domainWeights: new Array(27).fill(1 / 27),
        geneWeights: new Array(17).fill(1 / 17),
        tools: { web_browse: false, file_write: false, fork_agent: false, delegate: false },
        systemPrompt: 'test',
      },
    };
    const result = await executePlan(plan, ctx);
    expect(result.status).toBe('completed');
    expect(result.steps[0].status).toBe('completed');
    expect(result.steps[0].result.seedsCreated.length).toBe(1);
  });

  it('buildResponse creates proper AgentResponse from completed plan', async () => {
    const parsed = parseQuery('create a character seed');
    const plan = buildPlan(parsed, []);
    const ctx: ToolContext = {
      seeds: [], memory: [],
      agentConfig: {
        persona: 'architect', name: 'Test', temperature: 0.3,
        reasoningDepth: 0.5, explorationRate: 0.2, confidenceThreshold: 0.7,
        verbosity: 0.5, autonomy: 0.3, creativityBias: 0.4,
        maxSteps: 10, memoryWindow: 25,
        domainWeights: new Array(27).fill(1 / 27),
        geneWeights: new Array(17).fill(1 / 17),
        tools: { web_browse: false, file_write: false, fork_agent: false, delegate: false },
        systemPrompt: 'test',
      },
    };
    const completed = await executePlan(plan, ctx);
    const response = buildResponse(completed, parsed, Date.now() - 10);
    expect(response.success).toBe(true);
    expect(response.intent).toBe('create_seed');
    expect(response.message.length).toBeGreaterThan(0);
    expect(response.suggestions).toBeDefined();
  });
});
