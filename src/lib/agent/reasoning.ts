/**
 * Paradigm Absolute — Multi-Step Reasoning Engine
 *
 * The heart of the GSPL agent. Replaces the regex-based dispatcher
 * with a Parse → Plan → Execute → Reflect → Respond loop.
 *
 * Key properties:
 * - Deterministic kernel operations are ALWAYS available (Tier 0)
 * - Models enhance planning and generation (Tiers 1-3)
 * - Graceful degradation: no model → same behavior as original agent
 * - Multi-step: "evolve, pick best, compose to sprite, grow" works
 * - Tool-based: every operation goes through the typed tool system
 */

import {
  GENE_TYPES, getAllDomains, getCompositionGraph, getGeneTypeInfo,
  rngFromHash,
} from '../kernel/index.js';
import { InferenceTier, INTENT_TIER } from './types.js';
import type {
  AgentIntent, ParsedQuery, ReasoningPlan, PlanStep,
  AgentResponse, AgentConfig, ToolContext,
} from './types.js';
import { AGENT_TOOLS, executeTool } from './tools.js';
import { AgentMemory } from './memory.js';
import { getInferenceClient } from './inference.js';

// ─── CONSTANTS ──────────────────────────────────────────────────────────────

const GENE_TYPE_SET = new Set(Object.keys(GENE_TYPES));

// Domain-specific gene templates for rich seed creation
const DOMAIN_GENE_TEMPLATES: Record<string, Record<string, { type: string; generate: (rng: any) => any }>> = {
  character: {
    archetype: { type: 'categorical', generate: (rng) => rng.nextChoice(['warrior', 'mage', 'rogue', 'paladin', 'ranger', 'bard', 'dark_knight']) },
    strength: { type: 'scalar', generate: (rng) => rng.nextF64() },
    agility: { type: 'scalar', generate: (rng) => rng.nextF64() },
    intelligence: { type: 'scalar', generate: (rng) => rng.nextF64() },
    size: { type: 'scalar', generate: (rng) => 0.3 + rng.nextF64() * 0.7 },
    palette: { type: 'vector', generate: (rng) => [rng.nextF64(), rng.nextF64(), rng.nextF64()] },
    personality: { type: 'categorical', generate: (rng) => rng.nextChoice(['brave', 'cunning', 'wise', 'fierce', 'calm', 'chaotic']) },
  },
  music: {
    tempo: { type: 'scalar', generate: (rng) => 0.2 + rng.nextF64() * 0.6 },
    key: { type: 'categorical', generate: (rng) => rng.nextChoice(['C', 'D', 'E', 'F', 'G', 'A', 'B']) },
    scale: { type: 'categorical', generate: (rng) => rng.nextChoice(['major', 'minor', 'dorian', 'pentatonic', 'blues', 'mixolydian']) },
    melody: { type: 'array', generate: (rng) => Array.from({ length: 8 }, () => 48 + rng.nextInt(0, 36)) },
    timbre: { type: 'resonance', generate: (rng) => ({ fundamentals: [220 + rng.nextInt(0, 440)], partials: [{ freq_ratio: 2, amplitude: 0.3 + rng.nextF64() * 0.4, phase: 0 }], damping: 0.05 + rng.nextF64() * 0.15 }) },
  },
  sprite: {
    resolution: { type: 'scalar', generate: (rng) => 0.2 + rng.nextF64() * 0.6 },
    paletteSize: { type: 'scalar', generate: (rng) => rng.nextF64() },
    colors: { type: 'vector', generate: (rng) => [rng.nextF64(), rng.nextF64(), rng.nextF64()] },
    symmetry: { type: 'categorical', generate: (rng) => rng.nextChoice(['bilateral', 'radial', 'none', 'quad']) },
  },
  narrative: {
    genre: { type: 'categorical', generate: (rng) => rng.nextChoice(['epic', 'mystery', 'romance', 'thriller', 'adventure', 'literary_fiction']) },
    acts: { type: 'scalar', generate: (rng) => (rng.nextChoice([3, 5]) / 7) },
    complexity: { type: 'scalar', generate: (rng) => rng.nextF64() },
    voice: { type: 'categorical', generate: (rng) => rng.nextChoice(['first_person', 'third_person_limited', 'omniscient']) },
  },
  procedural: {
    octaves: { type: 'scalar', generate: (rng) => 0.3 + rng.nextF64() * 0.5 },
    persistence: { type: 'scalar', generate: (rng) => 0.3 + rng.nextF64() * 0.4 },
    scale: { type: 'scalar', generate: (rng) => 0.1 + rng.nextF64() * 0.6 },
    biome: { type: 'categorical', generate: (rng) => rng.nextChoice(['forest', 'desert', 'ocean', 'tundra', 'volcanic', 'plains']) },
  },
  agent: {
    persona: { type: 'categorical', generate: (rng) => rng.nextChoice(['architect', 'artist', 'critic', 'explorer', 'composer', 'analyst']) },
    name: { type: 'categorical', generate: (rng) => rng.nextChoice(['Nova', 'Atlas', 'Prism', 'Echo', 'Forge', 'Drift']) },
    temperature: { type: 'scalar', generate: (rng) => rng.nextF64() },
    reasoning_depth: { type: 'scalar', generate: (rng) => rng.nextF64() },
    exploration_rate: { type: 'scalar', generate: (rng) => rng.nextF64() },
    confidence_threshold: { type: 'scalar', generate: (rng) => 0.4 + rng.nextF64() * 0.4 },
    verbosity: { type: 'scalar', generate: (rng) => rng.nextF64() },
    autonomy: { type: 'scalar', generate: (rng) => rng.nextF64() },
    creativity_bias: { type: 'scalar', generate: (rng) => rng.nextF64() },
    max_reasoning_steps: { type: 'scalar', generate: (rng) => 0.3 + rng.nextF64() * 0.5 },
    context_window: { type: 'scalar', generate: (rng) => 0.3 + rng.nextF64() * 0.5 },
    tool_permissions: { type: 'struct', generate: () => ({ web_browse: false, file_write: false, fork_agent: false, delegate: false }) },
  },
};

const DOMAIN_SET = new Set([...getAllDomains(), ...Object.keys(DOMAIN_GENE_TEMPLATES)]);

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// ─── QUERY PARSER ───────────────────────────────────────────────────────────

/**
 * Enhanced query parser with multi-step detection.
 * Classifies intent, extracts entities, determines complexity tier.
 */
export function parseQuery(raw: string): ParsedQuery {
  const lower = raw.toLowerCase().trim();
  const entities: ParsedQuery['entities'] = {};
  let intent: AgentIntent = 'unknown';
  let confidence = 0;

  // Extract domain mentions. Match longer domain names first and use word boundaries.
  const knownDomains = Array.from(DOMAIN_SET).sort((a, b) => b.length - a.length);
  for (const domain of knownDomains) {
    const domainRegex = new RegExp(`\\b${escapeRegExp(domain)}\\b`, 'i');
    if (domainRegex.test(lower)) {
      if (!entities.domain) entities.domain = domain;
      else if (!entities.targetDomain) entities.targetDomain = domain;
    }
  }

  // Extract gene type mentions
  for (const gt of GENE_TYPE_SET) {
    if (lower.includes(gt)) {
      entities.geneType = gt;
      break;
    }
  }

  // Extract quoted seed name
  const nameMatch = raw.match(/"([^"]+)"/);
  if (nameMatch) entities.seedName = nameMatch[1];

  // Extract mutation rate
  const rateMatch = lower.match(/rate\s*[:=]?\s*(\d*\.?\d+)/);
  if (rateMatch) entities.mutationRate = parseFloat(rateMatch[1]);

  // Extract population size
  const popMatch = lower.match(/(?:pop(?:ulation)?|count|size)\s*[:=]?\s*(\d+)/);
  if (popMatch) entities.populationSize = parseInt(popMatch[1], 10);

  // Check for GSPL source blocks
  const gsplMatch = raw.match(/seed\s+"[^"]+"\s+in\s+\w+\s*\{[\s\S]*?\}/);
  if (gsplMatch) {
    entities.gsplSource = gsplMatch[0];
    intent = 'parse_gspl';
    confidence = 0.95;
    return { intent, entities, confidence, raw, tier: INTENT_TIER.parse_gspl };
  }

  // ── Multi-step detection ──
  // Look for conjunctions chaining operations: "create ... then mutate ... and grow"
  const chainWords = lower.match(/\b(then|and then|after that|next|finally|also|and)\b/g);
  const operationWords = lower.match(/\b(create|make|mutate|breed|compose|grow|evolve|pick|select|best|transform|convert)\b/g);

  if (chainWords && chainWords.length >= 1 && operationWords && operationWords.length >= 2) {
    intent = 'multi_step';
    confidence = 0.85;
    // Extract step descriptions
    entities.steps = raw.split(/\b(?:then|and then|after that|next|finally|,\s*then)\b/i).map(s => s.trim()).filter(Boolean);
    entities.prompt = raw;
    return { intent, entities, confidence, raw, tier: INTENT_TIER.multi_step };
  }

  // ── Single intent classification ──
  const patterns: [RegExp, AgentIntent, number][] = [
    [/\b(create|new|make|spawn|generate|design)\b.*\bseed\b/i, 'create_seed', 0.85],
    [/\bseed\b.*\b(create|new|make|spawn|generate|design)\b/i, 'create_seed', 0.80],
    [/\b(create|new|make|spawn|generate|design)\b.*\b(agent|assistant|ai)\b/i, 'create_seed', 0.80],
    [/\b(mutate|mutation|tweak|alter|modify|perturb)\b/i, 'mutate_seed', 0.85],
    [/\b(breed|cross|mate|combine|merge)\b/i, 'breed_seeds', 0.85],
    [/\b(compose|transform|convert|translate|bridge)\b/i, 'compose_seed', 0.85],
    [/\b(grow|expand|develop|instantiate|realize|render)\b/i, 'grow_seed', 0.80],
    [/\b(evolve|evolution|population|generation)\b/i, 'evolve_seed', 0.80],
    [/\b(distance|compare|similar|different|how far)\b/i, 'compare_seeds', 0.80],
    [/\b(describe|explain|what is|info|about|tell me)\b.*\bdomain\b/i, 'describe_domain', 0.75],
    [/\bdomain\b.*\b(describe|explain|what is|info|about)\b/i, 'describe_domain', 0.70],
    [/\b(describe|explain|what is|info|about|tell me)\b.*\bgene\b/i, 'describe_gene_type', 0.75],
    [/\b(path|route|bridge|connect)\b.*\b(from|to|between)\b/i, 'find_composition_path', 0.80],
    [/\b(suggest|recommend)\b.*\b(compos|path|bridge|transform)\b/i, 'suggest_composition', 0.80],
    [/\blist\b.*\bdomain/i, 'list_domains', 0.90],
    [/\blist\b.*\bgene/i, 'list_gene_types', 0.90],
    [/\b(write|generate|create)\b.*\bgspl\b/i, 'write_gspl', 0.85],
    [/\b(search|browse|look up|find|research)\b.*\b(web|online|internet)\b/i, 'web_search', 0.80],
    [/\b(help|how|what can|commands|usage|guide)\b/i, 'help', 0.60],
    [/\bgspl\b/i, 'parse_gspl', 0.50],
  ];

  for (const [pattern, matchIntent, matchConf] of patterns) {
    if (pattern.test(lower) && matchConf > confidence) {
      intent = matchIntent;
      confidence = matchConf;
    }
  }

  // If we detected "create" and it's in the agent domain, set domain
  if (intent === 'create_seed' && !entities.domain) {
    if (lower.includes('agent') || lower.includes('assistant') || lower.includes('ai')) {
      entities.domain = 'agent';
    }
  }

  entities.prompt = raw;
  const tier = INTENT_TIER[intent] ?? InferenceTier.STANDARD;
  return { intent, entities, confidence, raw, tier };
}

// ─── PLAN BUILDER ───────────────────────────────────────────────────────────

/**
 * Build an execution plan from a parsed query.
 * For simple intents: single-step plan.
 * For multi_step: decompose into sequential operations.
 */
export function buildPlan(parsed: ParsedQuery, seeds: any[]): ReasoningPlan {
  const plan: ReasoningPlan = {
    query: parsed.raw,
    intent: parsed.intent,
    steps: [],
    currentStep: 0,
    status: 'planning',
  };

  switch (parsed.intent) {
    case 'create_seed':
    case 'design_seed': {
      plan.steps.push({
        id: 0, operation: 'create_seed', dependsOn: [], status: 'pending',
        params: {
          domain: parsed.entities.domain || 'character',
          name: parsed.entities.seedName || `New ${parsed.entities.domain || 'character'} seed`,
          genes: parsed.entities.genes || buildDefaultGenes(parsed.entities.domain || 'character', parsed.raw),
        },
      });
      break;
    }

    case 'mutate_seed': {
      plan.steps.push({
        id: 0, operation: 'mutate_seed', dependsOn: [], status: 'pending',
        params: { seedIndex: -1, rate: parsed.entities.mutationRate || 0.15 },
      });
      break;
    }

    case 'breed_seeds': {
      plan.steps.push({
        id: 0, operation: 'breed_seeds', dependsOn: [], status: 'pending',
        params: { indexA: -2, indexB: -1 },
      });
      break;
    }

    case 'compose_seed': {
      plan.steps.push({
        id: 0, operation: 'compose_seed', dependsOn: [], status: 'pending',
        params: { seedIndex: -1, targetDomain: parsed.entities.targetDomain || parsed.entities.domain || '' },
      });
      break;
    }

    case 'grow_seed': {
      plan.steps.push({
        id: 0, operation: 'grow_seed', dependsOn: [], status: 'pending',
        params: { seedIndex: -1 },
      });
      break;
    }

    case 'evolve_seed': {
      plan.steps.push({
        id: 0, operation: 'evolve_seeds', dependsOn: [], status: 'pending',
        params: { seedIndex: -1, populationSize: parsed.entities.populationSize || 4 },
      });
      break;
    }

    case 'compare_seeds': {
      plan.steps.push({
        id: 0, operation: 'compute_distance', dependsOn: [], status: 'pending',
        params: { indexA: -2, indexB: -1 },
      });
      break;
    }

    case 'find_composition_path': {
      plan.steps.push({
        id: 0, operation: 'find_path', dependsOn: [], status: 'pending',
        params: { source: parsed.entities.domain || '', target: parsed.entities.targetDomain || '' },
      });
      break;
    }

    case 'parse_gspl': {
      plan.steps.push({
        id: 0, operation: 'execute_gspl', dependsOn: [], status: 'pending',
        params: { source: parsed.entities.gsplSource || parsed.raw },
      });
      break;
    }

    case 'describe_domain':
    case 'describe_gene_type':
    case 'list_domains':
    case 'list_gene_types':
    case 'suggest_composition':
    case 'help': {
      plan.steps.push({
        id: 0, operation: 'query_knowledge', dependsOn: [], status: 'pending',
        params: { query: parsed.raw },
      });
      break;
    }

    case 'multi_step': {
      // Decompose multi-step into sequential operations
      const stepDescs = parsed.entities.steps || [parsed.raw];
      for (let i = 0; i < stepDescs.length; i++) {
        const subParsed = parseQuery(stepDescs[i]);
        const subPlan = buildPlan(subParsed, seeds);
        for (const step of subPlan.steps) {
          step.id = plan.steps.length;
          step.dependsOn = plan.steps.length > 0 ? [plan.steps.length - 1] : [];
          plan.steps.push(step);
        }
      }
      break;
    }

    default: {
      // Unknown intent — try knowledge base
      plan.steps.push({
        id: 0, operation: 'query_knowledge', dependsOn: [], status: 'pending',
        params: { query: parsed.raw },
      });
    }
  }

  plan.status = 'executing';
  return plan;
}

// ─── PLAN EXECUTOR ──────────────────────────────────────────────────────────

/**
 * Execute a reasoning plan step by step.
 * Each step produces results that feed into subsequent steps.
 */
export async function executePlan(
  plan: ReasoningPlan,
  context: ToolContext,
): Promise<ReasoningPlan> {
  const mutableSeeds = [...context.seeds];

  for (let i = 0; i < plan.steps.length; i++) {
    const step = plan.steps[i];
    plan.currentStep = i;

    // Check dependencies
    const depsOk = step.dependsOn.every(depId => {
      const dep = plan.steps.find(s => s.id === depId);
      return dep?.status === 'completed';
    });

    if (!depsOk) {
      step.status = 'failed';
      step.error = 'Dependency not met';
      plan.status = 'failed';
      return plan;
    }

    step.status = 'running';

    // Execute via tool system
    const toolContext: ToolContext = {
      ...context,
      seeds: mutableSeeds,
      plan,
    };

    const result = await executeTool(step.operation, step.params, toolContext);

    if (result.success) {
      step.status = 'completed';
      step.result = result;

      // If tool created seeds, add them to the working set
      if (result.seedsCreated) {
        for (const seed of result.seedsCreated) {
          mutableSeeds.push(seed);
        }
      }
    } else {
      step.status = 'failed';
      step.error = result.message;
      plan.status = 'failed';
      return plan;
    }
  }

  plan.status = 'completed';
  return plan;
}

// ─── DEFAULT GENE BUILDER ───────────────────────────────────────────────────

/**
 * Build default genes for a domain, optionally influenced by the query text.
 * This replaces the old hardcoded 3-gene approach with domain-appropriate genes.
 */
function buildDefaultGenes(domain: string, queryHint: string = ''): Record<string, any> {
  const rng = rngFromHash(domain + queryHint + Date.now());
  const template = DOMAIN_GENE_TEMPLATES[domain];

  if (template) {
    const genes: Record<string, any> = {};
    for (const [name, spec] of Object.entries(template)) {
      genes[name] = { type: spec.type, value: spec.generate(rng) };
    }
    // Always add core genes
    genes.core_power = { type: 'scalar', value: rng.nextF64() };
    genes.stability = { type: 'scalar', value: rng.nextF64() };
    return genes;
  }

  // Generic fallback for domains without templates
  return {
    core_power: { type: 'scalar', value: rng.nextF64() },
    stability: { type: 'scalar', value: rng.nextF64() },
    complexity: { type: 'scalar', value: rng.nextF64() },
    style: { type: 'categorical', value: rng.nextChoice(['classic', 'modern', 'experimental', 'minimal']) },
    palette: { type: 'vector', value: [rng.nextF64(), rng.nextF64(), rng.nextF64()] },
  };
}

// ─── RESPONSE BUILDER ───────────────────────────────────────────────────────

/**
 * Build an AgentResponse from a completed (or failed) plan.
 */
export function buildResponse(plan: ReasoningPlan, parsed: ParsedQuery, startTime: number): AgentResponse {
  const endTime = Date.now();

  if (plan.status === 'failed') {
    const failedStep = plan.steps.find(s => s.status === 'failed');
    return {
      success: false,
      intent: parsed.intent,
      tier: parsed.tier,
      message: failedStep?.error || 'Plan execution failed.',
      plan,
      suggestions: ['help', 'list domains', 'create a character seed'],
      timing: { parseMs: 0, planMs: 0, executeMs: endTime - startTime, totalMs: endTime - startTime },
    };
  }

  // Collect all results
  const allSeeds: any[] = [];
  const messages: string[] = [];

  for (const step of plan.steps) {
    if (step.result) {
      if (step.result.message) messages.push(step.result.message);
      if (step.result.seedsCreated) allSeeds.push(...step.result.seedsCreated);
    }
  }

  // Get the last step's data as primary response data
  const lastStep = plan.steps[plan.steps.length - 1];
  const data: any = lastStep?.result?.data || {};
  if (allSeeds.length > 0) data.seeds = allSeeds;

  // Generate contextual suggestions
  const suggestions = generateSuggestions(parsed, allSeeds);

  return {
    success: true,
    intent: parsed.intent,
    tier: parsed.tier,
    message: messages.join('\n'),
    data,
    suggestions,
    plan: plan.steps.length > 1 ? plan : undefined, // only include plan for multi-step
    timing: { parseMs: 0, planMs: 0, executeMs: endTime - startTime, totalMs: endTime - startTime },
  };
}

/**
 * Generate contextual suggestions based on what just happened.
 */
function generateSuggestions(parsed: ParsedQuery, seeds: any[]): string[] {
  const suggestions: string[] = [];
  const lastSeed = seeds[seeds.length - 1];

  if (!lastSeed) {
    return ['create a character seed', 'list domains', 'help'];
  }

  const domain = lastSeed.$domain;

  // Always suggest mutation and growth
  if (parsed.intent === 'create_seed' || parsed.intent === 'design_seed') {
    suggestions.push('mutate this seed');
    suggestions.push('grow this seed');
    suggestions.push('evolve with population 6');
  }

  if (parsed.intent === 'evolve_seed') {
    suggestions.push('breed the top two');
    suggestions.push('evolve the best one again');
    suggestions.push('grow the best one');
  }

  // Suggest composition based on graph
  const graph = getCompositionGraph();
  const outgoing = graph.edges.filter(e => e.source === domain);
  if (outgoing.length > 0) {
    suggestions.push(`compose to ${outgoing[0].target}`);
  }

  // Suggest agent-specific operations
  if (domain === 'agent') {
    suggestions.push('compose to character (embody the agent)');
    suggestions.push('compose to narrative (agent\'s story)');
  }

  return suggestions.slice(0, 4);
}

// ─── HELP RESPONSE ──────────────────────────────────────────────────────────

export function buildHelpResponse(): AgentResponse {
  return {
    success: true,
    intent: 'help',
    tier: InferenceTier.KERNEL,
    message: 'Paradigm GSPL Agent v2 — available commands:',
    data: {
      commands: [
        { command: 'create [domain] seed "[name]"', description: 'Create a new seed (27 domains including "agent")' },
        { command: 'mutate [seed] rate:0.2', description: 'Mutate a seed\'s genes' },
        { command: 'breed', description: 'Crossover two seeds' },
        { command: 'compose to [domain]', description: 'Transform via functor bridges (12 bridges)' },
        { command: 'grow', description: 'Execute domain engine on seed' },
        { command: 'evolve population:6', description: 'Generate a ranked population of mutants' },
        { command: 'compare', description: 'Compute genetic distance between two seeds' },
        { command: 'list domains', description: 'Show all 27 creative domains' },
        { command: 'list gene types', description: 'Show all 17 gene types' },
        { command: 'path from [domain] to [domain]', description: 'Find composition path' },
        { command: 'seed "Name" in domain { ... }', description: 'Parse and execute GSPL code' },
        { command: 'Multi-step: "create X, then mutate, then grow"', description: 'Chain operations with then/and' },
      ],
      capabilities: {
        domains: 27,
        geneTypes: 17,
        functorBridges: 12,
        inferenceAvailable: getInferenceClient().maxAvailableTier() > InferenceTier.KERNEL,
      },
    },
  };
}
