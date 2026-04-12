/**
 * Paradigm Absolute — Agent Tool System
 *
 * Typed tools that the reasoning engine can invoke.
 * Categories:
 *   kernel  — deterministic kernel operations (always available)
 *   extended — optional capabilities (web browse, library search)
 *   meta    — agent self-modification (fork, delegate)
 *
 * Tool permissions are controlled by the agent seed's tool_permissions gene.
 */

import crypto from 'crypto';
import {
  Xoshiro256StarStar, rngFromHash,
  GENE_TYPES, validateGene, mutateGene, crossoverGene, distanceGene, getGeneTypeInfo,
  ENGINES, growSeed, getAllDomains,
  getFunctor, findCompositionPath, composeSeed, getCompositionGraph,
} from '../kernel/index.js';
import { ParadigmPipeline } from '../pipeline/index.js';
import { InferenceTier } from './types.js';
import type { AgentTool, ToolContext, ToolResult, ToolParameter } from './types.js';

// ─── HELPER ─────────────────────────────────────────────────────────────────

function makeSeed(domain: string, name: string, genes: Record<string, any>, parentHashes: string[] = []): any {
  const rng = rngFromHash(name + domain + Date.now());
  return {
    id: crypto.randomUUID(),
    $domain: domain,
    $name: name,
    $lineage: { generation: parentHashes.length > 0 ? 1 : 0, operation: 'agent_tool', parents: parentHashes },
    $hash: crypto.createHash('sha256').update(JSON.stringify(genes)).digest('hex'),
    $fitness: { overall: 0.3 + rng.nextF64() * 0.4 },
    genes,
  };
}

// ─── KERNEL TOOLS ───────────────────────────────────────────────────────────

const createSeedTool: AgentTool = {
  name: 'create_seed',
  description: 'Create a new seed in a specified domain with given genes',
  category: 'kernel',
  tier: InferenceTier.KERNEL,
  parameters: {
    domain: { type: 'string', description: 'Target domain (one of 27 domains)', required: true },
    name: { type: 'string', description: 'Seed name', required: true },
    genes: { type: 'object', description: 'Gene map: { geneName: { type, value } }', required: true },
  },
  execute: async (params, ctx) => {
    const domain = params.domain || 'character';
    const name = params.name || `New ${domain} seed`;
    const genes = params.genes || {};

    // Validate all genes
    const validationErrors: string[] = [];
    for (const [key, gene] of Object.entries(genes) as [string, any][]) {
      if (gene.type && GENE_TYPES[gene.type]) {
        try {
          const valid = validateGene(gene.type, gene.value);
          if (!valid) validationErrors.push(`Gene "${key}" (${gene.type}): invalid value`);
        } catch (e: any) {
          validationErrors.push(`Gene "${key}": ${e.message}`);
        }
      }
    }

    const seed = makeSeed(domain, name, genes);

    return {
      success: true,
      data: { seed, validationErrors },
      message: `Created "${name}" in domain "${domain}" with ${Object.keys(genes).length} genes.${validationErrors.length > 0 ? ` Warnings: ${validationErrors.join('; ')}` : ''}`,
      seedsCreated: [seed],
    };
  },
};

const mutateSeedTool: AgentTool = {
  name: 'mutate_seed',
  description: 'Mutate a seed\'s genes at a given rate',
  category: 'kernel',
  tier: InferenceTier.KERNEL,
  parameters: {
    seedIndex: { type: 'number', description: 'Index in session seeds array (default: last)', default: -1 },
    rate: { type: 'number', description: 'Mutation rate [0, 1]', default: 0.15 },
  },
  execute: async (params, ctx) => {
    const idx = params.seedIndex === -1 ? ctx.seeds.length - 1 : params.seedIndex;
    const target = ctx.seeds[idx];
    if (!target) return { success: false, data: null, message: 'No seed found to mutate.' };

    const rate = Math.max(0, Math.min(1, params.rate ?? 0.15));
    const rng = rngFromHash((target.$hash || '') + 'mutate' + Date.now());

    const newGenes: Record<string, any> = {};
    let mutationCount = 0;
    for (const [key, gene] of Object.entries(target.genes || {}) as [string, any][]) {
      if (rng.nextF64() < rate && gene.type && GENE_TYPES[gene.type]) {
        newGenes[key] = { type: gene.type, value: mutateGene(gene.type, gene.value, rate, rng) };
        mutationCount++;
      } else {
        newGenes[key] = JSON.parse(JSON.stringify(gene));
      }
    }

    const mutated = {
      ...target,
      id: crypto.randomUUID(),
      $name: `${target.$name} (Mutated)`,
      $lineage: { generation: (target.$lineage?.generation || 0) + 1, operation: 'agent_mutate', parents: [target.$hash] },
      $hash: crypto.createHash('sha256').update(JSON.stringify(newGenes)).digest('hex'),
      $fitness: { overall: Math.min(1, Math.max(0, (target.$fitness?.overall || 0.5) + (rng.nextF64() * 0.2 - 0.1))) },
      genes: newGenes,
    };

    return {
      success: true,
      data: { seed: mutated, mutations: mutationCount, rate },
      message: `Mutated "${target.$name}" — ${mutationCount} gene(s) changed at rate ${rate}.`,
      seedsCreated: [mutated],
    };
  },
};

const breedSeedsTool: AgentTool = {
  name: 'breed_seeds',
  description: 'Breed two seeds via crossover to produce an offspring',
  category: 'kernel',
  tier: InferenceTier.KERNEL,
  parameters: {
    indexA: { type: 'number', description: 'Index of parent A (default: second-to-last)', default: -2 },
    indexB: { type: 'number', description: 'Index of parent B (default: last)', default: -1 },
  },
  execute: async (params, ctx) => {
    const idxA = params.indexA < 0 ? ctx.seeds.length + params.indexA : params.indexA;
    const idxB = params.indexB < 0 ? ctx.seeds.length + params.indexB : params.indexB;
    const parentA = ctx.seeds[idxA];
    const parentB = ctx.seeds[idxB];

    if (!parentA || !parentB) return { success: false, data: null, message: 'Need at least 2 seeds to breed.' };

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
      id: crypto.randomUUID(),
      $domain: parentA.$domain,
      $name: `${parentA.$name} × ${parentB.$name}`,
      $lineage: {
        generation: Math.max(parentA.$lineage?.generation || 0, parentB.$lineage?.generation || 0) + 1,
        operation: 'agent_breed', parents: [parentA.$hash, parentB.$hash],
      },
      $hash: crypto.createHash('sha256').update(JSON.stringify(newGenes)).digest('hex'),
      $fitness: { overall: ((parentA.$fitness?.overall || 0.5) + (parentB.$fitness?.overall || 0.5)) / 2 },
      genes: newGenes,
    };

    return {
      success: true,
      data: { seed: child },
      message: `Bred "${parentA.$name}" × "${parentB.$name}" — ${allKeys.size} genes crossed.`,
      seedsCreated: [child],
    };
  },
};

const composeSeedTool: AgentTool = {
  name: 'compose_seed',
  description: 'Compose a seed to a target domain via functor bridges',
  category: 'kernel',
  tier: InferenceTier.KERNEL,
  parameters: {
    seedIndex: { type: 'number', description: 'Index of seed to compose (default: last)', default: -1 },
    targetDomain: { type: 'string', description: 'Target domain', required: true },
  },
  execute: async (params, ctx) => {
    const idx = params.seedIndex < 0 ? ctx.seeds.length + params.seedIndex : params.seedIndex;
    const target = ctx.seeds[idx];
    if (!target) return { success: false, data: null, message: 'No seed found to compose.' };

    const composed = composeSeed(target, params.targetDomain);
    if (!composed) {
      const path = findCompositionPath(target.$domain || '', params.targetDomain);
      return { success: false, data: null, message: `No composition path from "${target.$domain}" to "${params.targetDomain}".` };
    }

    composed.id = crypto.randomUUID();
    const path = findCompositionPath(target.$domain || '', params.targetDomain);

    return {
      success: true,
      data: { seed: composed, path: path?.map(s => `${s.src} →[${s.functor}]→ ${s.tgt}`) },
      message: `Composed "${target.$name}" from ${target.$domain} → ${params.targetDomain}${path ? ` via ${path.length} functor(s)` : ''}.`,
      seedsCreated: [composed],
    };
  },
};

const growSeedTool: AgentTool = {
  name: 'grow_seed',
  description: 'Grow a seed through its domain engine to produce an artifact',
  category: 'kernel',
  tier: InferenceTier.KERNEL,
  parameters: {
    seedIndex: { type: 'number', description: 'Index of seed to grow (default: last)', default: -1 },
  },
  execute: async (params, ctx) => {
    const idx = params.seedIndex < 0 ? ctx.seeds.length + params.seedIndex : params.seedIndex;
    const target = ctx.seeds[idx];
    if (!target) return { success: false, data: null, message: 'No seed found to grow.' };

    try {
      const artifact = await ParadigmPipeline.runEndToEnd(target);
      return {
        success: true,
        data: { artifact },
        message: `Grew "${target.$name}" in domain "${target.$domain}" — pipeline produced emergent asset.`,
      };
    } catch (e: any) {
      return { success: false, data: null, message: `Grow failed: ${e.message}` };
    }
  },
};

const evolveSeedTool: AgentTool = {
  name: 'evolve_seeds',
  description: 'Evolve a population of mutants from a seed and return ranked by fitness',
  category: 'kernel',
  tier: InferenceTier.KERNEL,
  parameters: {
    seedIndex: { type: 'number', description: 'Index of seed to evolve (default: last)', default: -1 },
    populationSize: { type: 'number', description: 'Number of variants (max 20)', default: 4 },
  },
  execute: async (params, ctx) => {
    const idx = params.seedIndex < 0 ? ctx.seeds.length + params.seedIndex : params.seedIndex;
    const target = ctx.seeds[idx];
    if (!target) return { success: false, data: null, message: 'No seed found to evolve.' };

    const popSize = Math.min(params.populationSize || 4, 20);
    const population: any[] = [];

    for (let i = 0; i < popSize; i++) {
      const rng = rngFromHash((target.$hash || '') + `evolve_${i}_${Date.now()}`);
      const rate = 0.1 + rng.nextF64() * 0.3;
      const newGenes: Record<string, any> = {};

      for (const [key, gene] of Object.entries(target.genes || {}) as [string, any][]) {
        if (rng.nextF64() < rate && gene.type && GENE_TYPES[gene.type]) {
          newGenes[key] = { type: gene.type, value: mutateGene(gene.type, gene.value, rate, rng) };
        } else {
          newGenes[key] = JSON.parse(JSON.stringify(gene));
        }
      }

      population.push({
        id: crypto.randomUUID(),
        $domain: target.$domain,
        $name: `${target.$name} (Gen ${i + 1})`,
        $lineage: { generation: (target.$lineage?.generation || 0) + 1, operation: 'agent_evolve', parents: [target.$hash] },
        $hash: crypto.createHash('sha256').update(JSON.stringify(newGenes) + i).digest('hex'),
        $fitness: { overall: Math.min(1, Math.max(0, (target.$fitness?.overall || 0.5) + (rng.nextF64() * 0.4 - 0.2))) },
        genes: newGenes,
      });
    }

    population.sort((a, b) => (b.$fitness?.overall || 0) - (a.$fitness?.overall || 0));

    return {
      success: true,
      data: { population, best: population[0] },
      message: `Evolved "${target.$name}" — ${popSize} variants. Best fitness: ${population[0]?.$fitness?.overall?.toFixed(3)}.`,
      seedsCreated: population,
    };
  },
};

const computeDistanceTool: AgentTool = {
  name: 'compute_distance',
  description: 'Compute genetic distance between two seeds',
  category: 'kernel',
  tier: InferenceTier.KERNEL,
  parameters: {
    indexA: { type: 'number', description: 'Index of seed A', default: -2 },
    indexB: { type: 'number', description: 'Index of seed B', default: -1 },
  },
  execute: async (params, ctx) => {
    const idxA = params.indexA < 0 ? ctx.seeds.length + params.indexA : params.indexA;
    const idxB = params.indexB < 0 ? ctx.seeds.length + params.indexB : params.indexB;
    const seedA = ctx.seeds[idxA];
    const seedB = ctx.seeds[idxB];

    if (!seedA || !seedB) return { success: false, data: null, message: 'Need two seeds to compare.' };

    const distances: Record<string, number> = {};
    let totalDistance = 0;
    let geneCount = 0;

    const allKeys = new Set([...Object.keys(seedA.genes || {}), ...Object.keys(seedB.genes || {})]);
    for (const key of allKeys) {
      const gA = (seedA.genes || {})[key];
      const gB = (seedB.genes || {})[key];
      if (gA && gB && gA.type === gB.type && GENE_TYPES[gA.type]) {
        const d = distanceGene(gA.type, gA.value, gB.value);
        distances[key] = d;
        totalDistance += d;
        geneCount++;
      } else {
        distances[key] = 1.0; // missing gene = max distance
        totalDistance += 1.0;
        geneCount++;
      }
    }

    const avgDistance = geneCount > 0 ? totalDistance / geneCount : 0;

    return {
      success: true,
      data: { distances, averageDistance: +avgDistance.toFixed(4), geneCount },
      message: `Distance between "${seedA.$name}" and "${seedB.$name}": ${avgDistance.toFixed(4)} (avg over ${geneCount} genes).`,
    };
  },
};

const findPathTool: AgentTool = {
  name: 'find_path',
  description: 'Find composition path between two domains',
  category: 'kernel',
  tier: InferenceTier.KERNEL,
  parameters: {
    source: { type: 'string', description: 'Source domain', required: true },
    target: { type: 'string', description: 'Target domain', required: true },
  },
  execute: async (params) => {
    const path = findCompositionPath(params.source, params.target);
    if (!path) return { success: false, data: null, message: `No path from "${params.source}" to "${params.target}".` };

    return {
      success: true,
      data: { path, hops: path.length },
      message: `Path: ${path.map(s => `${s.src} →[${s.functor}]→ ${s.tgt}`).join(' ')} (${path.length} hop${path.length > 1 ? 's' : ''})`,
    };
  },
};

import { ragRetriever } from './rag.js';

const queryKnowledgeTool: AgentTool = {
  name: 'query_knowledge',
  description: 'Search the kernel knowledge base for information about domains, gene types, or GSPL',
  category: 'kernel',
  tier: InferenceTier.KERNEL,
  parameters: {
    query: { type: 'string', description: 'Search query', required: true },
  },
  execute: async (params) => {
    const domains = getAllDomains();
    const geneTypes = Object.keys(GENE_TYPES);
    const graph = getCompositionGraph();

    const q = (params.query || '').toLowerCase();
    const results: string[] = [];

    // Check if asking about a specific domain
    for (const d of domains) {
      if (q.includes(d)) {
        const outgoing = graph.edges.filter(e => e.source === d);
        const incoming = graph.edges.filter(e => e.target === d);
        results.push(`Domain "${d}": grows seeds via the ${d} engine. Composes to: ${outgoing.map(e => e.target).join(', ') || 'none'}. Composes from: ${incoming.map(e => e.source).join(', ') || 'none'}.`);
      }
    }

    // Check gene types
    for (const gt of geneTypes) {
      if (q.includes(gt)) {
        const info = getGeneTypeInfo(gt);
        results.push(`Gene type "${gt}": supports validate, mutate, crossover, distance. ${JSON.stringify(info)}`);
      }
    }

    // RAG Query
    const ragResults = await ragRetriever.query(q);
    if (ragResults.length > 0) {
      results.push(...ragResults);
    }

    // General info
    if (results.length === 0) {
      results.push(`${domains.length} domains: ${domains.join(', ')}`);
      results.push(`${geneTypes.length} gene types: ${geneTypes.join(', ')}`);
      results.push(`${graph.edges.length} functor bridges`);
    }

    return {
      success: true,
      data: { results },
      message: results.join('\n'),
    };
  },
};

const executeGsplTool: AgentTool = {
  name: 'execute_gspl',
  description: 'Execute GSPL code to create or modify seeds',
  category: 'kernel',
  tier: InferenceTier.KERNEL,
  parameters: {
    source: { type: 'string', description: 'GSPL source code', required: true },
  },
  execute: async (params, context) => {
    const source = params.source || '';
    const generatedSeeds: any[] = [];
    const errors: string[] = [];

    const seedRegex = /seed\s+"([^"]+)"\s+in\s+([a-zA-Z0-9_-]+)\s*\{([\s\S]*?)\}/g;
    let match;

    while ((match = seedRegex.exec(source)) !== null) {
      const name = match[1];
      const domain = match[2];
      const body = match[3];
      const genes: Record<string, any> = {};

      for (const line of body.split('\n')) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('//')) continue;

        const colonIdx = trimmed.indexOf(':');
        if (colonIdx > 0) {
          const key = trimmed.substring(0, colonIdx).trim();
          const valStr = trimmed.substring(colonIdx + 1).trim();

          if (valStr.startsWith('"') && valStr.endsWith('"')) {
            genes[key] = { type: 'categorical', value: valStr.slice(1, -1) };
          } else if (!isNaN(Number(valStr))) {
            genes[key] = { type: 'scalar', value: Number(valStr) };
          } else if (valStr.startsWith('[')) {
            try {
              const parsed = JSON.parse(valStr);
              if (Array.isArray(parsed)) genes[key] = { type: 'vector', value: parsed };
            } catch {
              const numbers = valStr.match(/-?\d+(\.\d+)?/g);
              if (numbers) genes[key] = { type: 'vector', value: numbers.map(Number) };
              else genes[key] = { type: 'vector', value: valStr };
            }
          } else {
            genes[key] = { type: 'categorical', value: valStr };
          }
        }
      }

      const rng = rngFromHash(name + domain + Date.now());
      const newSeed = {
        id: crypto.randomUUID(),
        $domain: domain,
        $name: name,
        $lineage: { generation: 0, operation: 'gspl' },
        $hash: crypto.createHash('sha256').update(JSON.stringify(genes)).digest('hex'),
        $fitness: { overall: 0.3 + rng.nextF64() * 0.4 },
        genes,
      };

      generatedSeeds.push(newSeed);
    }

    if (generatedSeeds.length > 0) {
      return {
        success: true,
        data: { seeds: generatedSeeds },
        seedsCreated: generatedSeeds,
        message: `Executed GSPL and generated ${generatedSeeds.length} seeds.`,
      };
    } else {
      return {
        success: false,
        data: null,
        message: 'No valid seed blocks found in GSPL source.',
      };
    }
  },
};

// ─── TOOL REGISTRY ──────────────────────────────────────────────────────────

export const AGENT_TOOLS: Map<string, AgentTool> = new Map([
  // Kernel tools (always available)
  ['create_seed', createSeedTool],
  ['mutate_seed', mutateSeedTool],
  ['breed_seeds', breedSeedsTool],
  ['compose_seed', composeSeedTool],
  ['grow_seed', growSeedTool],
  ['evolve_seeds', evolveSeedTool],
  ['compute_distance', computeDistanceTool],
  ['find_path', findPathTool],
  ['query_knowledge', queryKnowledgeTool],
  ['execute_gspl', executeGsplTool],
]);

/**
 * Get tools available to an agent, filtered by permissions.
 */
export function getAvailableTools(permissions: Record<string, boolean>): Map<string, AgentTool> {
  const available = new Map<string, AgentTool>();

  for (const [name, tool] of AGENT_TOOLS) {
    if (tool.category === 'kernel') {
      available.set(name, tool);
    } else if (tool.category === 'extended') {
      // Check permission
      if (name === 'web_browse' && permissions.web_browse) available.set(name, tool);
      if (name === 'search_library' && permissions.file_write !== false) available.set(name, tool);
    } else if (tool.category === 'meta') {
      if (name === 'fork_agent' && permissions.fork_agent) available.set(name, tool);
      if (name === 'delegate' && permissions.delegate) available.set(name, tool);
    }
  }

  return available;
}

/**
 * Execute a named tool with parameters.
 */
export async function executeTool(
  toolName: string,
  params: Record<string, any>,
  context: ToolContext,
): Promise<ToolResult> {
  const tool = AGENT_TOOLS.get(toolName);
  if (!tool) {
    return { success: false, data: null, message: `Unknown tool: ${toolName}` };
  }

  // Check permissions
  if (tool.category === 'extended' || tool.category === 'meta') {
    const perms = context.agentConfig.tools || {};
    if (toolName === 'web_browse' && !perms.web_browse) {
      return { success: false, data: null, message: 'Web browsing not permitted by agent seed.' };
    }
    if (toolName === 'fork_agent' && !perms.fork_agent) {
      return { success: false, data: null, message: 'Agent forking not permitted by agent seed.' };
    }
  }

  try {
    return await tool.execute(params, context);
  } catch (e: any) {
    return { success: false, data: null, message: `Tool execution error: ${e.message}` };
  }
}
