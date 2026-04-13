/**
 * Paradigm Absolute — Native GSPL Agent v2
 *
 * A reasoning-engine agent built on the GSPL kernel.
 * The agent IS a GSPL seed (domain "agent") — breedable, evolvable,
 * composable, and sovereign.
 *
 * Architecture:
 *  1. Query Parser     — intent classification + entity extraction + multi-step detection
 *  2. Plan Builder     — decomposes queries into atomic kernel operations
 *  3. Plan Executor    — runs each step through the typed tool system
 *  4. Inference Client — three-tier local model routing (optional, graceful degradation)
 *  5. Memory Manager   — sliding-window conversation context
 *  6. Tool System      — 9 kernel tools + extensible permissions
 *
 * The agent ALWAYS works without models (Tier 0 = deterministic kernel).
 * Models (Tiers 1-3) enhance quality when available.
 *
 * ZERO external AI dependency. ZERO stubs. ZERO placeholders.
 */
import crypto from 'crypto';
import {
  Xoshiro256StarStar, rngFromHash,
  GENE_TYPES, validateGene, mutateGene, crossoverGene, distanceGene, getGeneTypeInfo,
  ENGINES, growSeed, getAllDomains,
  getFunctor, findCompositionPath, composeSeed, getCompositionGraph,
} from '../kernel/index.js';

import { InferenceTier, INTENT_TIER } from './types.js';
import type {
  AgentIntent, AgentResponse, AgentConfig, ParsedQuery,
  ReasoningPlan, ToolContext, InferenceResponse,
} from './types.js';
import { parseQuery, buildPlan, executePlan, buildResponse, buildHelpResponse } from './reasoning.js';
import { AGENT_TOOLS, executeTool, getAvailableTools } from './tools.js';
import { AgentMemory } from './memory.js';
import { getInferenceClient, LocalInferenceClient } from './inference.js';

// ─── DEFAULT AGENT CONFIG ───────────────────────────────────────────────────

const DEFAULT_AGENT_CONFIG: AgentConfig = {
  persona: 'architect',
  name: 'Paradigm Agent',
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
  systemPrompt: 'You are the Paradigm GSPL Agent — a reasoning system built into the deterministic creative kernel. You create, mutate, breed, compose, evolve, and grow seeds across 27 domains using 17 gene types and 12 functor bridges.',
};

// ─── KNOWLEDGE BASE ─────────────────────────────────────────────────────────

interface KnowledgeEntry {
  category: string;
  key: string;
  content: string;
  keywords: string[];
}

class KnowledgeBase {
  private entries: KnowledgeEntry[] = [];

  constructor() {
    this.buildFromKernel();
  }

  private static readonly DOMAIN_DESCRIPTIONS: Record<string, string> = {
    character: 'Generates RPG characters with archetype, stats (strength, agility, hp), visual appearance (body proportions, color palette), and personality traits.',
    sprite: 'Generates 2D pixel art sprites with configurable resolution (8-128px), palette size, primary/secondary colors via HSL, and bilateral/radial symmetry.',
    music: 'Generates musical compositions with tempo (60-200 BPM), key, scale, time signature, timbre characteristics, and melody preview sequences.',
    visual2d: 'Generates 2D generative art with style, complexity-driven layer count, color palette, and composition layout.',
    procedural: 'Generates procedural terrain with Perlin noise octaves, persistence, scale, biome type, and 256px heightmaps.',
    fullgame: 'Generates complete game designs with genre, difficulty curves, level progression, enemy types, boss encounters, world biomes, and exploration factors.',
    animation: 'Generates skeletal/keyframe animations with frame count, FPS, easing curves, amplitude-based keyframe generation, and blend modes.',
    geometry3d: 'Generates 3D meshes with primitive types, subdivision levels, vertex estimates, PBR materials (roughness, metalness), and bounding boxes.',
    narrative: 'Generates stories with structure (hero\'s journey, five-act, nonlinear), tone-driven themes, cast sizing, subplot complexity, word estimates, and pacing.',
    ui: 'Generates UI component layouts with grid systems, theme palettes (dark/light), spacing, border radius, and responsive configuration.',
    physics: 'Generates physics simulations with gravity, friction, elasticity, body count, collision detection strategies, and integrator selection (Verlet/SPH).',
    audio: 'Generates sound effects and synthesis with waveform type, frequency, ADSR envelopes, harmonic count, and filter configuration.',
    ecosystem: 'Generates ecosystems with species count, trophic levels, interaction types (predation, symbiosis), carrying capacity, and extinction risk.',
    game: 'Generates game mechanics with rule complexity, decision points per turn, player count, balance factors, and win condition sets.',
    alife: 'Generates cellular automata with rule sets (Conway, Wireworld, Brian\'s Brain), grid size, neighborhood types, and birth/survival rules.',
    shader: 'Generates GLSL shaders with technique (raymarching, path tracing), iteration count, epsilon precision, uniform definitions, and texture slots.',
    particle: 'Generates particle systems with emitter types, spawn rates, lifetime, velocity, gravity, drag, additive blending, and size curves.',
    typography: 'Generates typeface specs with style, weight ranges, x-height, contrast, cap height metrics, glyph counts, and OpenType feature sets.',
    architecture: 'Generates buildings with architectural style, floor count, height calculations, footprint, window ratios, roof types, and structural engineering.',
    vehicle: 'Generates vehicles with propulsion type, top speed, mass, acceleration, drag coefficient, range, and power output.',
    furniture: 'Generates parametric furniture with type-specific dimensions, material weight calculations, comfort scores, and durability ratings.',
    fashion: 'Generates garments with fabric properties (warmth, drape, breathability), silhouette, seasonal layering, and construction details.',
    robotics: 'Generates robots with DOF calculations, sensor suites, payload capacity, battery life, and autonomy levels (SLAM/waypoint/teleoperated).',
    circuit: 'Generates electronic circuits with component nodes, connections, PCB layout dimensions, trace widths, power consumption, and frequency specs.',
    food: 'Generates recipes with cuisine, flavor profiles (sweet/salty/umami/sour/bitter), ingredient counts, prep/cook times, and calorie estimates.',
    choreography: 'Generates dance sequences with style-specific movements, tempo, formations, phrase structure, energy curves, and stage spatial mapping.',
    agent: 'Generates AI agent configurations with persona, temperature, reasoning depth, domain focus weights, gene expertise vectors, tool permissions, and dynamic system prompts.',
  };

  private buildFromKernel() {
    // Index all domains with rich, engine-derived descriptions
    const domains = getAllDomains();
    for (const domain of domains) {
      const desc = KnowledgeBase.DOMAIN_DESCRIPTIONS[domain] ||
        `The "${domain}" domain is one of ${domains.length} creative domains in Paradigm.`;
      this.entries.push({
        category: 'domain',
        key: domain,
        content: `${domain} domain: ${desc} Seeds can be created, mutated, bred, composed, and grown.`,
        keywords: [domain, 'domain', 'engine', 'create', 'seed', 'grow'],
      });
    }

    // Index all gene types
    for (const geneType of Object.keys(GENE_TYPES)) {
      const info = getGeneTypeInfo(geneType);
      this.entries.push({
        category: 'gene_type',
        key: geneType,
        content: `Gene type "${geneType}" supports operations: validate, mutate, crossover, distance. ${
          geneType === 'scalar' ? 'Holds a single numeric value [0,1].' :
          geneType === 'categorical' ? 'Holds a discrete category string.' :
          geneType === 'vector' ? 'Holds a numeric array.' :
          geneType === 'expression' ? 'Holds a mathematical expression string.' :
          geneType === 'struct' ? 'Holds a key-value object.' :
          geneType === 'array' ? 'Holds an ordered list of values.' :
          geneType === 'graph' ? 'Holds nodes and edges.' :
          geneType === 'topology' ? 'Holds a topological manifold descriptor.' :
          geneType === 'temporal' ? 'Holds keyframe animation data.' :
          geneType === 'regulatory' ? 'Holds gene-regulation network weights.' :
          geneType === 'field' ? 'Holds a continuous field defined by basis functions.' :
          geneType === 'symbolic' ? 'Holds a symbolic expression tree (S-expression).' :
          geneType === 'quantum' ? 'Holds quantum state amplitudes (normalized).' :
          geneType === 'gematria' ? 'Holds numeric encoding of text.' :
          geneType === 'resonance' ? 'Holds harmonic overtone data.' :
          geneType === 'dimensional' ? 'Holds multi-dimensional coordinates.' :
          geneType === 'sovereignty' ? 'Holds cryptographic ownership proof (immutable).' :
          'Custom gene type.'
        }`,
        keywords: [geneType, 'gene', 'type', 'validate', 'mutate', 'crossover'],
      });
    }

    // Index composition graph
    const graph = getCompositionGraph();
    for (const edge of graph.edges) {
      this.entries.push({
        category: 'functor',
        key: edge.functor,
        content: `Functor "${edge.functor}" transforms seeds from "${edge.source}" domain to "${edge.target}" domain.`,
        keywords: [edge.source, edge.target, edge.functor, 'compose', 'transform', 'bridge', 'functor'],
      });
    }

    // Index GSPL syntax
    this.entries.push({
      category: 'syntax',
      key: 'gspl_seed_declaration',
      content: 'GSPL seed syntax: seed "Name" in domain { gene_name: value }. Scalar values are numbers, categorical values are quoted strings, vectors are arrays in brackets.',
      keywords: ['gspl', 'syntax', 'seed', 'declare', 'create', 'write', 'code'],
    });

    this.entries.push({
      category: 'syntax',
      key: 'gspl_operations',
      content: 'GSPL operations: mutate(seed, rate), breed(seedA, seedB), compose(seed, targetDomain), evolve(seed, populationSize), grow(seed). All operations are deterministic via xoshiro256**.',
      keywords: ['gspl', 'operation', 'mutate', 'breed', 'compose', 'evolve', 'grow'],
    });

    // Index agent-specific knowledge
    this.entries.push({
      category: 'domain',
      key: 'agent_domain',
      content: 'The "agent" domain (27th) grows seeds into runnable agent configurations. Agent seeds have genes for persona, temperature, reasoning depth, domain focus, tool permissions, and memory window. They can be bred, mutated, evolved, and composed to character or narrative domains.',
      keywords: ['agent', 'persona', 'reasoning', 'tool', 'ai', 'assistant', 'intelligence'],
    });
  }

  search(query: string, limit: number = 5): KnowledgeEntry[] {
    const queryLower = query.toLowerCase();
    const queryWords = queryLower.split(/\s+/).filter(w => w.length > 2);

    const scored: { entry: KnowledgeEntry; score: number }[] = [];

    for (const entry of this.entries) {
      let score = 0;
      for (const word of queryWords) {
        for (const kw of entry.keywords) {
          if (kw.includes(word) || word.includes(kw)) score += 3;
        }
        if (entry.content.toLowerCase().includes(word)) score += 1;
        if (entry.key.toLowerCase().includes(word)) score += 5;
      }
      if (score > 0) scored.push({ entry, score });
    }

    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, limit).map(s => s.entry);
  }

  getDomains(): string[] {
    return this.entries.filter(e => e.category === 'domain').map(e => e.key);
  }

  getGeneTypes(): string[] {
    return this.entries.filter(e => e.category === 'gene_type').map(e => e.key);
  }
}

// ─── PARADIGM AGENT v2 ─────────────────────────────────────────────────────

export class ParadigmAgent {
  private kb: KnowledgeBase;
  private memory: AgentMemory;
  private config: AgentConfig;
  private inferenceClient: LocalInferenceClient;

  constructor(config?: Partial<AgentConfig>) {
    this.kb = new KnowledgeBase();
    this.config = { ...DEFAULT_AGENT_CONFIG, ...config };
    this.memory = new AgentMemory(this.config.memoryWindow);
    this.inferenceClient = getInferenceClient();
  }

  /**
   * Process a natural language or GSPL query.
   * This is the main entry point — backward-compatible with v1 API.
   */
  async process(query: string, context?: { seeds?: any[] }): Promise<AgentResponse> {
    const startTime = Date.now();
    const seeds = context?.seeds || [];

    // Record in memory
    this.memory.addUserMessage(query, seeds.map(s => s.$hash).filter(Boolean));

    // Parse the query
    const parsed = parseQuery(query);

    // Special cases that don't need planning
    if (parsed.intent === 'help') {
      const response = buildHelpResponse();
      this.memory.addAgentResponse(response.message, response.intent);
      return response;
    }

    if (parsed.intent === 'list_domains') {
      const domains = getAllDomains();
      const response: AgentResponse = {
        success: true, intent: 'list_domains', tier: InferenceTier.KERNEL,
        message: `${domains.length} domains: ${domains.join(', ')}`,
        data: { domains, count: domains.length },
        timing: { parseMs: 0, planMs: 0, executeMs: Date.now() - startTime, totalMs: Date.now() - startTime },
      };
      this.memory.addAgentResponse(response.message, response.intent);
      return response;
    }

    if (parsed.intent === 'list_gene_types') {
      const types = Object.keys(GENE_TYPES);
      const response: AgentResponse = {
        success: true, intent: 'list_gene_types', tier: InferenceTier.KERNEL,
        message: `${types.length} gene types: ${types.join(', ')}`,
        data: { types, count: types.length },
        timing: { parseMs: 0, planMs: 0, executeMs: Date.now() - startTime, totalMs: Date.now() - startTime },
      };
      this.memory.addAgentResponse(response.message, response.intent);
      return response;
    }

    if (parsed.intent === 'describe_domain') {
      const domain = parsed.entities.domain;
      if (domain) {
        const graph = getCompositionGraph();
        const outgoing = graph.edges.filter(e => e.source === domain);
        const incoming = graph.edges.filter(e => e.target === domain);
        const entries = this.kb.search(domain, 3);
        const response: AgentResponse = {
          success: true, intent: 'describe_domain', tier: InferenceTier.KERNEL,
          message: entries[0]?.content || `Domain "${domain}".`,
          data: { domain, composesTo: outgoing.map(e => e.target), composesFrom: incoming.map(e => e.source), functors: outgoing.map(e => ({ target: e.target, functor: e.functor })) },
          timing: { parseMs: 0, planMs: 0, executeMs: Date.now() - startTime, totalMs: Date.now() - startTime },
        };
        this.memory.addAgentResponse(response.message, response.intent);
        return response;
      }
    }

    if (parsed.intent === 'describe_gene_type') {
      const gt = parsed.entities.geneType;
      if (gt && GENE_TYPES[gt]) {
        const entries = this.kb.search(gt, 1);
        const response: AgentResponse = {
          success: true, intent: 'describe_gene_type', tier: InferenceTier.KERNEL,
          message: entries[0]?.content || `Gene type "${gt}".`,
          data: { geneType: gt, info: getGeneTypeInfo(gt) },
          timing: { parseMs: 0, planMs: 0, executeMs: Date.now() - startTime, totalMs: Date.now() - startTime },
        };
        this.memory.addAgentResponse(response.message, response.intent);
        return response;
      }
    }

    // Build and execute plan synchronously (for backward compat)
    const plan = buildPlan(parsed, seeds);

    // Synchronous execution — executePlan is async but kernel tools are sync
    // We wrap in a resolved promise pattern for compatibility
    const completedPlan = plan;
    const toolContext: ToolContext = {
      seeds,
      plan,
      memory: this.memory.getContext(),
      agentConfig: this.config,
    };

    // Execute plan synchronously by running each step
    const mutableSeeds = [...seeds];
    for (let i = 0; i < plan.steps.length; i++) {
      const step = plan.steps[i];
      plan.currentStep = i;
      step.status = 'running';

      // Kernel tools are synchronous internally (wrapped in async)
      const tool = AGENT_TOOLS.get(step.operation);
      if (tool) {
        try {
          // Call execute with synchronous context
          const ctx: ToolContext = { ...toolContext, seeds: mutableSeeds };
          // Since kernel tools don't actually await anything, we can extract the result
          // by building the result synchronously
          const result = await tool.execute(step.params, ctx);

          step.status = 'completed';
          step.result = result;
          if (result?.seedsCreated) mutableSeeds.push(...result.seedsCreated);
        } catch (e: any) {
          step.status = 'failed';
          step.error = e.message;
          plan.status = 'failed';
          break;
        }
      } else {
        step.status = 'completed';
        step.result = this.executeFallback(step.operation, step.params, mutableSeeds);
        if (step.result?.seedsCreated) mutableSeeds.push(...step.result.seedsCreated);
      }
    }

    if (!plan.steps.some(s => s.status === 'failed')) {
      plan.status = 'completed';
    }

    const response = buildResponse(plan, parsed, startTime);

    // If unknown intent and no plan results, fall back to knowledge base
    if (!response.success && parsed.intent === 'unknown') {
      const kbResults = this.kb.search(query, 3);
      if (kbResults.length > 0) {
        response.success = true;
        response.message = kbResults.map(r => r.content).join(' ');
        response.data = { retrieved: kbResults.map(r => ({ category: r.category, key: r.key })) };
        response.suggestions = ['help', 'list domains', 'create a character seed'];
      }
    }

    // Record response in memory
    const createdHashes = (response.data?.seeds || []).map((s: any) => s.$hash).filter(Boolean);
    this.memory.addAgentResponse(response.message, response.intent, createdHashes);

    return response;
  }

  /**
   * Process query asynchronously (supports LLM enhancement).
   * Use this for WebSocket/streaming responses.
   */
  async processAsync(query: string, context?: { seeds?: any[] }): Promise<AgentResponse> {
    const startTime = Date.now();
    const seeds = context?.seeds || [];

    this.memory.addUserMessage(query, seeds.map(s => s.$hash).filter(Boolean));

    const parsed = parseQuery(query);

    // Special cases
    if (parsed.intent === 'help') return buildHelpResponse();

    // Build plan
    const plan = buildPlan(parsed, seeds);

    // Execute asynchronously (supports model-enhanced tools)
    const toolContext: ToolContext = {
      seeds,
      plan,
      memory: this.memory.getContext(),
      agentConfig: this.config,
    };

    const completedPlan = await executePlan(plan, toolContext);
    const response = buildResponse(completedPlan, parsed, startTime);

    // Enhance with LLM if available and intent warrants it
    if (parsed.tier >= InferenceTier.FAST) {
      const enhanced = await this.enhanceResponse(query, response, parsed.tier);
      if (enhanced) return enhanced;
    }

    const createdHashes = (response.data?.seeds || []).map((s: any) => s.$hash).filter(Boolean);
    this.memory.addAgentResponse(response.message, response.intent, createdHashes);

    return response;
  }

  /**
   * Load an agent configuration from a grown agent seed.
   */
  loadConfig(config: AgentConfig): void {
    this.config = config;
    this.memory.setMaxEntries(config.memoryWindow);
  }

  /**
   * Get current agent stats.
   */
  getStats(): Record<string, any> {
    return {
      config: this.config,
      memorySize: this.memory.size,
      memoryTurns: this.memory.turnCount,
      inferenceAvailable: this.inferenceClient.maxAvailableTier(),
      domainsKnown: getAllDomains().length,
      geneTypesKnown: Object.keys(GENE_TYPES).length,
      toolsAvailable: AGENT_TOOLS.size,
    };
  }

  // ── Private ───────────────────────────────────────────────────────────────

  /**
   * Fallback synchronous execution for tools (when promise pattern fails).
   * This mirrors the original v1 agent behavior for each operation.
   */
  private executeFallback(operation: string, params: Record<string, any>, seeds: any[]): any {
    switch (operation) {
      case 'create_seed': {
        const domain = params.domain || 'character';
        const name = params.name || `New ${domain} seed`;
        const genes = params.genes || {};
        const rng = rngFromHash(name + domain + Date.now());
        const seed = {
          id: crypto.randomUUID(),
          $domain: domain,
          $name: name,
          $lineage: { generation: 0, operation: 'agent_create' },
          $hash: crypto.createHash('sha256').update(JSON.stringify(genes)).digest('hex'),
          $fitness: { overall: 0.3 + rng.nextF64() * 0.4 },
          genes,
        };
        return { success: true, message: `Created "${name}" in domain "${domain}".`, data: { seed }, seedsCreated: [seed] };
      }

      case 'mutate_seed': {
        const idx = params.seedIndex < 0 ? seeds.length + params.seedIndex : params.seedIndex;
        const target = seeds[idx];
        if (!target) return { success: false, message: 'No seed to mutate.', data: null };
        const rate = params.rate || 0.15;
        const rng = rngFromHash((target.$hash || '') + 'mutate' + Date.now());
        const newGenes: Record<string, any> = {};
        let mc = 0;
        for (const [k, g] of Object.entries(target.genes || {}) as [string, any][]) {
          if (rng.nextF64() < rate && g.type && GENE_TYPES[g.type]) {
            newGenes[k] = { type: g.type, value: mutateGene(g.type, g.value, rate, rng) };
            mc++;
          } else {
            newGenes[k] = JSON.parse(JSON.stringify(g));
          }
        }
        const mutated = {
          ...target, id: crypto.randomUUID(),
          $name: `${target.$name} (Mutated)`,
          $lineage: { generation: (target.$lineage?.generation || 0) + 1, operation: 'agent_mutate', parents: [target.$hash] },
          $hash: crypto.createHash('sha256').update(JSON.stringify(newGenes)).digest('hex'),
          $fitness: { overall: Math.min(1, Math.max(0, (target.$fitness?.overall || 0.5) + (rng.nextF64() * 0.2 - 0.1))) },
          genes: newGenes,
        };
        return { success: true, message: `Mutated "${target.$name}" — ${mc} gene(s) changed.`, data: { seed: mutated }, seedsCreated: [mutated] };
      }

      case 'breed_seeds': {
        const idxA = params.indexA < 0 ? seeds.length + params.indexA : params.indexA;
        const idxB = params.indexB < 0 ? seeds.length + params.indexB : params.indexB;
        const parentA = seeds[idxA];
        const parentB = seeds[idxB];
        if (!parentA || !parentB) return { success: false, message: 'Need at least 2 seeds to breed.', data: null };
        const rng = rngFromHash((parentA.$hash || '') + (parentB.$hash || '') + Date.now());
        const newGenes: Record<string, any> = {};
        const allKeys = new Set([...Object.keys(parentA.genes || {}), ...Object.keys(parentB.genes || {})]);
        for (const key of allKeys) {
          const gA = (parentA.genes || {})[key];
          const gB = (parentB.genes || {})[key];
          if (gA && gB && gA.type === gB.type && GENE_TYPES[gA.type]) {
            newGenes[key] = { type: gA.type, value: crossoverGene(gA.type, gA.value, gB.value, rng) };
          } else if (gA) {
            newGenes[key] = JSON.parse(JSON.stringify(gA));
          } else if (gB) {
            newGenes[key] = JSON.parse(JSON.stringify(gB));
          }
        }
        const child = {
          id: crypto.randomUUID(), $domain: parentA.$domain,
          $name: `${parentA.$name} × ${parentB.$name}`,
          $lineage: { generation: Math.max(parentA.$lineage?.generation || 0, parentB.$lineage?.generation || 0) + 1, operation: 'agent_breed', parents: [parentA.$hash, parentB.$hash] },
          $hash: crypto.createHash('sha256').update(JSON.stringify(newGenes)).digest('hex'),
          $fitness: { overall: ((parentA.$fitness?.overall || 0.5) + (parentB.$fitness?.overall || 0.5)) / 2 },
          genes: newGenes,
        };
        return { success: true, message: `Bred "${parentA.$name}" × "${parentB.$name}".`, data: { seed: child }, seedsCreated: [child] };
      }

      case 'compose_seed': {
        const cidx = params.seedIndex < 0 ? seeds.length + params.seedIndex : params.seedIndex;
        const csrc = seeds[cidx];
        if (!csrc) return { success: false, message: 'No seed to compose.', data: null };
        const composed = composeSeed(csrc, params.targetDomain);
        if (!composed) return { success: false, message: `No composition path from "${csrc.$domain}" to "${params.targetDomain}".`, data: null };
        composed.id = crypto.randomUUID();
        const path = findCompositionPath(csrc.$domain || '', params.targetDomain);
        return { success: true, message: `Composed "${csrc.$name}" to ${params.targetDomain}.`, data: { seed: composed, path }, seedsCreated: [composed] };
      }

      case 'grow_seed': {
        const gidx = params.seedIndex < 0 ? seeds.length + params.seedIndex : params.seedIndex;
        const gtarget = seeds[gidx];
        if (!gtarget) return { success: false, message: 'No seed to grow.', data: null };
        try {
          const artifact = growSeed(gtarget);
          return { success: true, message: `Grew "${gtarget.$name}" in domain "${gtarget.$domain}".`, data: { artifact } };
        } catch (e: any) {
          return { success: false, message: `Grow failed: ${e.message}`, data: null };
        }
      }

      case 'evolve_seeds': {
        const eidx = params.seedIndex < 0 ? seeds.length + params.seedIndex : params.seedIndex;
        const etarget = seeds[eidx];
        if (!etarget) return { success: false, message: 'No seed to evolve.', data: null };
        const popSize = Math.min(params.populationSize || 4, 20);
        const population: any[] = [];
        for (let i = 0; i < popSize; i++) {
          const rng = rngFromHash((etarget.$hash || '') + `evolve_${i}_${Date.now()}`);
          const rate = 0.1 + rng.nextF64() * 0.3;
          const newGenes: Record<string, any> = {};
          for (const [k, g] of Object.entries(etarget.genes || {}) as [string, any][]) {
            if (rng.nextF64() < rate && g.type && GENE_TYPES[g.type]) {
              newGenes[k] = { type: g.type, value: mutateGene(g.type, g.value, rate, rng) };
            } else {
              newGenes[k] = JSON.parse(JSON.stringify(g));
            }
          }
          population.push({
            id: crypto.randomUUID(), $domain: etarget.$domain,
            $name: `${etarget.$name} (Gen ${i + 1})`,
            $lineage: { generation: (etarget.$lineage?.generation || 0) + 1, operation: 'agent_evolve', parents: [etarget.$hash] },
            $hash: crypto.createHash('sha256').update(JSON.stringify(newGenes) + i).digest('hex'),
            $fitness: { overall: Math.min(1, Math.max(0, (etarget.$fitness?.overall || 0.5) + (rng.nextF64() * 0.4 - 0.2))) },
            genes: newGenes,
          });
        }
        population.sort((a, b) => (b.$fitness?.overall || 0) - (a.$fitness?.overall || 0));
        return { success: true, message: `Evolved "${etarget.$name}" — ${popSize} variants.`, data: { population, best: population[0] }, seedsCreated: population };
      }

      case 'compute_distance': {
        const dA = params.indexA < 0 ? seeds.length + params.indexA : params.indexA;
        const dB = params.indexB < 0 ? seeds.length + params.indexB : params.indexB;
        const sA = seeds[dA]; const sB = seeds[dB];
        if (!sA || !sB) return { success: false, message: 'Need two seeds to compare.', data: null };
        const distances: Record<string, number> = {};
        let total = 0; let count = 0;
        const keys = new Set([...Object.keys(sA.genes || {}), ...Object.keys(sB.genes || {})]);
        for (const key of keys) {
          const gA = (sA.genes || {})[key]; const gB = (sB.genes || {})[key];
          if (gA && gB && gA.type === gB.type && GENE_TYPES[gA.type]) {
            const d = distanceGene(gA.type, gA.value, gB.value);
            distances[key] = d; total += d; count++;
          } else { distances[key] = 1.0; total += 1.0; count++; }
        }
        const avg = count > 0 ? total / count : 0;
        return { success: true, message: `Distance: ${avg.toFixed(4)}`, data: { distances, averageDistance: +avg.toFixed(4), geneCount: count } };
      }

      case 'find_path': {
        const path = findCompositionPath(params.source, params.target);
        if (!path) return { success: false, message: `No path from "${params.source}" to "${params.target}".`, data: null };
        return { success: true, message: `Path found: ${path.length} hop(s).`, data: { path, hops: path.length } };
      }

      case 'query_knowledge': {
        const results = this.kb.search(params.query || '', 3);
        return {
          success: results.length > 0,
          message: results.length > 0 ? results.map(r => r.content).join(' ') : 'I didn\'t understand that. Try "help" for available commands.',
          data: { results },
        };
      }

      default:
        return { success: false, message: `Unknown operation: ${operation}`, data: null };
    }
  }

  /**
   * Optionally enhance a response with LLM-generated content.
   */
  private async enhanceResponse(
    query: string,
    baseResponse: AgentResponse,
    preferredTier: InferenceTier,
  ): Promise<AgentResponse | null> {
    try {
      const client = getInferenceClient();
      if (client.maxAvailableTier() === InferenceTier.KERNEL) return null;

      const result = await client.generate({
        prompt: `User asked: "${query}"\n\nKernel response: ${baseResponse.message}\n\nProvide a more detailed, helpful explanation:`,
        systemPrompt: this.config.systemPrompt,
        maxTokens: 256,
        temperature: this.config.temperature,
      }, preferredTier);

      if (result.text) {
        return {
          ...baseResponse,
          message: baseResponse.message + '\n\n' + result.text,
          data: { ...baseResponse.data, llm_enhanced: true, model: result.model, tier: result.tier },
        };
      }
    } catch {
      // LLM unavailable — fall back to deterministic response
    }

    return null;
  }
}

// ─── LLM ENHANCEMENT (backward-compatible export) ───────────────────────────

/**
 * If the llm-inference service is running (LLM_INFERENCE_URL env set),
 * this function enhances agent responses with LLM-generated content.
 * Falls back gracefully — never blocks the deterministic agent.
 *
 * @deprecated Use agent.processAsync() instead for integrated LLM enhancement.
 */
export async function enhanceWithLLM(query: string, baseResponse: any): Promise<any> {
  const client = getInferenceClient();
  if (client.maxAvailableTier() === InferenceTier.KERNEL) return baseResponse;

  try {
    const result = await client.generate({
      prompt: `User asked: "${query}"\n\nKernel response: ${baseResponse.message}\n\nProvide a more detailed, helpful explanation:`,
      maxTokens: 256,
      temperature: 0.7,
    }, InferenceTier.FAST);

    if (result.text) {
      return {
        ...baseResponse,
        message: baseResponse.message + '\n\n' + result.text,
        data: { ...baseResponse.data, llm_enhanced: true },
      };
    }
  } catch {
    // Silent fallback
  }

  return baseResponse;
}

// ─── EXPORTS ────────────────────────────────────────────────────────────────

export { parseQuery, buildPlan, executePlan, buildResponse, buildHelpResponse } from './reasoning.js';
export { AGENT_TOOLS, executeTool, getAvailableTools } from './tools.js';
export { AgentMemory } from './memory.js';
export { LocalInferenceClient, getInferenceClient } from './inference.js';
export { InferenceTier, INTENT_TIER } from './types.js';
export type { AgentIntent, AgentResponse, AgentConfig, ParsedQuery, ReasoningPlan } from './types.js';

// ─── SINGLETON ──────────────────────────────────────────────────────────────

export const agent = new ParadigmAgent();
