/**
 * Stance Genetics — Reconstructs Nexus "Adaptive Stances" for Paradigm
 * 
 * NEXUS CONCEPT: Pre-defined "stances" (Architect, Pair Programmer, etc.)
 *                that change LLM behavior via system prompts
 * 
 * PARADIGM RECONSTRUCTION: A "stance" is a complete 19-gene 
 *                         genetic configuration. Change stance = breed/mutate genes.
 * 
 * Key Insight: In Paradigm, agents ARE seeds. Stance = genetic profile.
 */

import type { Seed } from './types';
import { Xoshiro256Star, rngFromHash } from './rng';

// ─── The 19 Agent Genes (from seed-agent.ts) ─────────────
export interface StanceGenes {
  // Personality genes (4)
  persona: { type: 'string'; value: string };
  creativity: { type: 'float'; value: number };
  empathy: { type: 'float'; value: number };
  assertiveness: { type: 'float'; value: number };

  // Reasoning genes (3)
  reasoning_style: { type: 'enum'; value: 'deductive' | 'inductive' | 'abductive' };
  depth: { type: 'float'; value: number };
  confidence: { type: 'float'; value: number };

  // Knowledge genes (3)
  domains: { type: 'array'; value: string[] };
  facts: { type: 'float'; value: number };
  memory_capacity: { type: 'int'; value: number };

  // Tools genes (2)
  available_tools: { type: 'array'; value: string[] };
  tool_preference: { type: 'string'; value: string };

  // Memory genes (3)
  episodic_memory: { type: 'bool'; value: boolean };
  semantic_memory: { type: 'bool'; value: boolean };
  memory_decay: { type: 'float'; value: number };

  // Sovereignty genes (4)
  can_fork: { type: 'bool'; value: boolean };
  can_breed: { type: 'bool'; value: boolean };
  signature: { type: 'string'; value: string };
  ownership: { type: 'string'; value: string };
}

// ─── Predefined Stances (19-dimensional genetic configs) ───
export interface StanceConfig {
  name: string;
  description: string;
  genes: Partial<StanceGenes>;
  useCase: string[];
}

/**
 * ARCHITECT Stance:
 * - Low creativity (structured thinking)
 * - High depth (deep analysis)
 * - Deductive reasoning
 * - Prefers planning tools
 */
export const ARCHITECT_STANCE: StanceConfig = {
  name: 'architect',
  description: 'Systematic, structured problem-solving approach',
  genes: {
    persona: { type: 'string', value: 'architect' },
    creativity: { type: 'float', value: 0.3 },
    empathy: { type: 'float', value: 0.5 },
    assertiveness: { type: 'float', value: 0.7 },
    reasoning_style: { type: 'enum', value: 'deductive' },
    depth: { type: 'float', value: 0.8 },
    confidence: { type: 'float', value: 0.8 },
    domains: { type: 'array', value: ['architecture', 'geometry3d', 'ui'] },
    facts: { type: 'float', value: 0.7 },
    memory_capacity: { type: 'int', value: 150 },
    available_tools: { type: 'array', value: ['generate_seed', 'execute_gspl', 'grow_seed', 'evolve_population'] },
    tool_preference: { type: 'string', value: 'planning' },
    episodic_memory: { type: 'bool', value: true },
    semantic_memory: { type: 'bool', value: true },
    memory_decay: { type: 'float', value: 0.05 },
    can_fork: { type: 'bool', value: true },
    can_breed: { type: 'bool', value: true },
    signature: { type: 'string', value: '' },
    ownership: { type: 'string', value: '' },
  },
  useCase: ['system design', 'architecture planning', 'complex refactoring']
};

/**
 * ARTIST Stance:
 * - High creativity (expressive)
 * - Moderate depth (aesthetic focus)
 * - Abductive reasoning (creative leaps)
 * - Prefers generation tools
 */
export const ARTIST_STANCE: StanceConfig = {
  name: 'artist',
  description: 'Creative, expressive approach to all tasks',
  genes: {
    persona: { type: 'string', value: 'artist' },
    creativity: { type: 'float', value: 0.9 },
    empathy: { type: 'float', value: 0.8 },
    assertiveness: { type: 'float', value: 0.4 },
    reasoning_style: { type: 'enum', value: 'abductive' },
    depth: { type: 'float', value: 0.5 },
    confidence: { type: 'float', value: 0.6 },
    domains: { type: 'array', value: ['visual2d', 'character', 'fashion', 'music'] },
    facts: { type: 'float', value: 0.4 },
    memory_capacity: { type: 'int', value: 100 },
    available_tools: { type: 'array', value: ['generate_seed', 'grow_seed', 'execute_gspl'] },
    tool_preference: { type: 'string', value: 'generation' },
    episodic_memory: { type: 'bool', value: true },
    semantic_memory: { type: 'bool', value: false },
    memory_decay: { type: 'float', value: 0.15 },
    can_fork: { type: 'bool', value: true },
    can_breed: { type: 'bool', value: true },
    signature: { type: 'string', value: '' },
    ownership: { type: 'string', value: '' },
  },
  useCase: ['creative generation', 'aesthetic design', 'artistic exploration']
};

/**
 * CRITIC Stance:
 * - Very low creativity (strict evaluation)
 * - Very high depth (thorough analysis)
 * - Deductive reasoning (logical)
 * - Prefers analysis tools
 */
export const CRITIC_STANCE: StanceConfig = {
  name: 'critic',
  description: 'Rigorous evaluation and weakness identification',
  genes: {
    persona: { type: 'string', value: 'critic' },
    creativity: { type: 'float', value: 0.2 },
    empathy: { type: 'float', value: 0.3 },
    assertiveness: { type: 'float', value: 0.9 },
    reasoning_style: { type: 'enum', value: 'deductive' },
    depth: { type: 'float', value: 0.9 },
    confidence: { type: 'float', value: 0.9 },
    domains: { type: 'array', value: ['visual2d', 'music', 'narrative'] },
    facts: { type: 'float', value: 0.8 },
    memory_capacity: { type: 'int', value: 200 },
    available_tools: { type: 'array', value: ['list_seeds', 'get_agent_state', 'reflect'] },
    tool_preference: { type: 'string', value: 'analysis' },
    episodic_memory: { type: 'bool', value: true },
    semantic_memory: { type: 'bool', value: true },
    memory_decay: { type: 'float', value: 0.02 },
    can_fork: { type: 'bool', value: false },
    can_breed: { type: 'bool', value: false },
    signature: { type: 'string', value: '' },
    ownership: { type: 'string', value: '' },
  },
  useCase: ['code review', 'quality assurance', 'evaluation']
};

/**
 * EXPLORER Stance:
 * - High creativity (novelty-seeking)
 * - Low depth (broad exploration)
 * - Abductive reasoning (hypothesis generation)
 * - Prefers exploration tools
 */
export const EXPLORER_STANCE: StanceConfig = {
  name: 'explorer',
  description: 'Novelty and exploration of new ideas',
  genes: {
    persona: { type: 'string', value: 'explorer' },
    creativity: { type: 'float', value: 0.8 },
    empathy: { type: 'float', value: 0.6 },
    assertiveness: { type: 'float', value: 0.5 },
    reasoning_style: { type: 'enum', value: 'abductive' },
    depth: { type: 'float', value: 0.4 },
    confidence: { type: 'float', value: 0.5 },
    domains: { type: 'array', value: ['ecosystem', 'game', 'alife', 'particle'] },
    facts: { type: 'float', value: 0.5 },
    memory_capacity: { type: 'int', value: 80 },
    available_tools: { type: 'array', value: ['generate_seed', 'evolve_population', 'execute_gspl'] },
    tool_preference: { type: 'string', value: 'exploration' },
    episodic_memory: { type: 'bool', value: true },
    semantic_memory: { type: 'bool', value: false },
    memory_decay: { type: 'float', value: 0.2 },
    can_fork: { type: 'bool', value: true },
    can_breed: { type: 'bool', value: true },
    signature: { type: 'string', value: '' },
    ownership: { type: 'string', value: '' },
  },
  useCase: ['research', 'ideation', 'discovery']
};

/**
 * COMPOSER Stance:
 * - High creativity (synthesis)
 * - Moderate depth (integration focus)
 * - Inductive reasoning (pattern-based)
 * - Prefers composition tools
 */
export const COMPOSER_STANCE: StanceConfig = {
  name: 'composer',
  description: 'Excels at combining multiple domains creatively',
  genes: {
    persona: { type: 'string', value: 'composer' },
    creativity: { type: 'float', value: 0.85 },
    empathy: { type: 'float', value: 0.7 },
    assertiveness: { type: 'float', value: 0.6 },
    reasoning_style: { type: 'enum', value: 'inductive' },
    depth: { type: 'float', value: 0.6 },
    confidence: { type: 'float', value: 0.7 },
    domains: { type: 'array', value: ['music', 'narrative', 'choreography', 'game'] },
    facts: { type: 'float', value: 0.6 },
    memory_capacity: { type: 'int', value: 120 },
    available_tools: { type: 'array', value: ['compose', 'breed_seeds', 'execute_gspl'] },
    tool_preference: { type: 'string', value: 'composition' },
    episodic_memory: { type: 'bool', value: true },
    semantic_memory: { type: 'bool', value: true },
    memory_decay: { type: 'float', value: 0.1 },
    can_fork: { type: 'bool', value: true },
    can_breed: { type: 'bool', value: true },
    signature: { type: 'string', value: '' },
    ownership: { type: 'string', value: '' },
  },
  useCase: ['multimedia creation', 'cross-domain synthesis', 'complex compositions']
};

/**
 * ANALYST Stance:
 * - Low creativity (data-driven)
 * - High depth (statistical analysis)
 * - Deductive reasoning (logical)
 * - Prefers data tools
 */
export const ANALYST_STANCE: StanceConfig = {
  name: 'analyst',
  description: 'Precise and data-driven in approach',
  genes: {
    persona: { type: 'string', value: 'analyst' },
    creativity: { type: 'float', value: 0.2 },
    empathy: { type: 'float', value: 0.4 },
    assertiveness: { type: 'float', value: 0.7 },
    reasoning_style: { type: 'enum', value: 'deductive' },
    depth: { type: 'float', value: 0.9 },
    confidence: { type: 'float', value: 0.8 },
    domains: { type: 'array', value: ['circuit', 'robotics', 'physics', 'architecture'] },
    facts: { type: 'float', value: 0.9 },
    memory_capacity: { type: 'int', value: 250 },
    available_tools: { type: 'array', value: ['execute_gspl', 'list_seeds', 'save_memory', 'recall_memory'] },
    tool_preference: { type: 'string', value: 'data' },
    episodic_memory: { type: 'bool', value: false },
    semantic_memory: { type: 'bool', value: true },
    memory_decay: { type: 'float', value: 0.01 },
    can_fork: { type: 'bool', value: false },
    can_breed: { type: 'bool', value: false },
    signature: { type: 'string', value: '' },
    ownership: { type: 'string', value: '' },
  },
  useCase: ['data analysis', 'performance optimization', 'scientific research']
};

// ─── All Stances Registry ────────────────────────────────
export const STANCE_REGISTRY: Record<string, StanceConfig> = {
  architect: ARCHITECT_STANCE,
  artist: ARTIST_STANCE,
  critic: CRITIC_STANCE,
  explorer: EXPLORER_STANCE,
  composer: COMPOSER_STANCE,
  analyst: ANALYST_STANCE,
};

// ─── Stance Operations ────────────────────────────────────

/**
 * Apply a stance to a seed (mutates genes to match stance)
 * This is how you "change stance" in Paradigm
 */
export function applyStance(seed: Seed, stanceName: string): Seed {
  const stance = STANCE_REGISTRY[stanceName];
  if (!stance) {
    throw new Error(`Unknown stance: ${stanceName}`);
  }

  const rng = rngFromHash(seed.$hash || '');
  
  // Create new seed with stance genes
  const newSeed: Seed = {
    ...seed,
    $name: `${seed.$name || 'Seed'}_${stance.name}`,
    genes: {
      ...seed.genes,
      ...stance.genes,
      // Preserve sovereignty genes
      signature: seed.genes?.signature,
      ownership: seed.genes?.ownership,
    }
  };

  return newSeed;
}

/**
 * Breed two stances (genetic crossover)
 * Creates hybrid stance
 */
export function breedStances(stance1Name: string, stance2Name: string): Partial<StanceGenes> {
  const stance1 = STANCE_REGISTRY[stance1Name];
  const stance2 = STANCE_REGISTRY[stance2Name];
  
  if (!stance1 || !stance2) {
    throw new Error('Unknown stance(s)');
  }

  const rng = rngFromHash(Date.now().toString());
  const hybrid: Partial<StanceGenes> = {};

  // Uniform crossover: randomly pick from stance 1 or 2
  for (const [key, gene1] of Object.entries(stance1.genes)) {
    const gene2 = (stance2.genes as any)[key];
    if (!gene2) continue;

    // Random selection
    if (rng.nextF64() < 0.5) {
      (hybrid as any)[key] = gene1;
    } else {
      (hybrid as any)[key] = gene2;
    }
  }

  return hybrid;
}

/**
 * Mutate stance genes (gradual shift)
 */
export function mutateStance(stanceName: string, mutationRate: number = 0.1): Partial<StanceGenes> {
  const stance = STANCE_REGISTRY[stanceName];
  if (!stance) {
    throw new Error(`Unknown stance: ${stanceName}`);
  }

  const rng = rngFromHash(Date.now().toString());
  const mutated: Partial<StanceGenes> = { ...stance.genes };

  // Mutate numeric genes
  for (const [key, gene] of Object.entries(mutated)) {
    if (rng.nextF64() >= mutationRate) continue;

    if (gene && typeof gene === 'object' && 'value' in gene) {
      const g = gene as any;
      if (typeof g.value === 'number') {
        g.value += (rng.nextF64() - 0.5) * 0.2;
        g.value = Math.max(0, Math.min(1, g.value));
      }
    }
  }

  return mutated;
}

/**
 * Get stance similarity (genetic distance)
 */
export function stanceDistance(stance1Name: string, stance2Name: string): number {
  const stance1 = STANCE_REGISTRY[stance1Name];
  const stance2 = STANCE_REGISTRY[stance2Name];
  
  if (!stance1 || !stance2) return 1.0;

  let totalDistance = 0;
  let count = 0;

  for (const [key, gene1] of Object.entries(stance1.genes)) {
    const gene2 = (stance2.genes as any)[key];
    if (!gene1 || !gene2) continue;

    if (gene1.value !== undefined && gene2.value !== undefined) {
      if (typeof gene1.value === 'number' && typeof gene2.value === 'number') {
        totalDistance += Math.abs(gene1.value - gene2.value);
        count++;
      } else if (gene1.value === gene2.value) {
        totalDistance += 0;
        count++;
      } else {
        totalDistance += 1;
        count++;
      }
    }
  }

  return count > 0 ? totalDistance / count : 1.0;
}

/**
 * Recommend best stance for a task
 */
export function recommendStance(taskDescription: string): string {
  const task = taskDescription.toLowerCase();
  
  if (task.includes('design') || task.includes('architect')) return 'architect';
  if (task.includes('create') || task.includes('art') || task.includes('generat')) return 'artist';
  if (task.includes('review') || task.includes('evaluat') || task.includes('check')) return 'critic';
  if (task.includes('explor') || task.includes('research') || task.includes('discover')) return 'explorer';
  if (task.includes('compos') || task.includes('combine') || task.includes('integrat')) return 'composer';
  if (task.includes('analy') || task.includes('data') || task.includes('optim')) return 'analyst';
  
  // Default
  return 'architect';
}
