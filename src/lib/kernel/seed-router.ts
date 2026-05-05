/**
 * Seed Router — Reconstructs Nexus "Model Router" for Paradigm
 * 
 * NEXUS CONCEPT: Routes to optimal LLM based on task type
 * PARADIGM RECONSTRUCTION: Routes to optimal Generator/Engine based on seed genes
 * 
 * Instead of routing to LLMs, we route to:
 * - 27 generative domains (character, music, visual2d, etc.)
 * - LLM providers (for agent reasoning)
 * - Generator versions (v1, v2, v3, GPU)
 * - Composition bridges (cross-domain functors)
 */

import type { Seed } from './types';
import { ENGINES } from './engines';
import { findCompositionPath, getFunctor } from './composition';
import { rngFromHash } from './rng';

// ─── Router Configuration ─────────────────────────────────────
export interface RouterConfig {
  preferGPU: boolean;
  fallbackToCPU: boolean;
  allowComposition: boolean;
  llmProvider?: 'openai' | 'anthropic' | 'ollama' | 'mock';
}

// ─── Routing Decision ────────────────────────────────────────
export interface RoutingDecision {
  type: 'generator' | 'llm' | 'composition';
  target: string;
  confidence: number; // 0-1
  reason: string;
  metadata?: Record<string, any>;
}

// ─── Domain Router (replaces LLM Model Router) ──────────────
/**
 * Routes seed to optimal generator based on:
 * - seed.$domain gene
 * - agent's "domains" gene (knowledge)
 * - agent's "tool_preference" gene
 * - composition paths (cross-domain)
 */
export function routeSeed(
  seed: Seed,
  agentGenes?: Record<string, any>,
  config: RouterConfig = { preferGPU: true, fallbackToCPU: true, allowComposition: true }
): RoutingDecision {
  const domain = (seed.$domain || 'character').toLowerCase();

  // Check if domain exists in the core engine registry
  if (ENGINES[domain]) {
    const generator = selectGenerator(domain, config);
    return {
      type: 'generator',
      target: generator,
      confidence: 1.0,
      reason: `Direct domain match: ${domain}`,
      metadata: { domain, generator }
    };
  }

  // Check agent's preferred domains
  if (agentGenes?.domains?.value) {
    const preferredDomains = (agentGenes.domains.value as string[]).map(d => d.toLowerCase());
    if (preferredDomains.includes(domain) && ENGINES[domain]) {
      const generator = selectGenerator(domain, config);
      return {
        type: 'generator',
        target: generator,
        confidence: 0.9,
        reason: `Agent prefers domain: ${domain}`,
        metadata: { domain, generator, source: 'agent_preference' }
      };
    }
  }

  // Try composition bridge (cross-domain routing)
  if (config.allowComposition) {
    const compositionPath = findCompositionPath('agent', domain);
    if (compositionPath && compositionPath.length > 0) {
      const functor = compositionPath[compositionPath.length - 1].functor;
      return {
        type: 'composition',
        target: functor,
        confidence: 0.7,
        reason: `Composition bridge: agent → ${domain} via ${functor}`,
        metadata: {
          source: 'agent',
          target: domain,
          path: compositionPath,
          functor
        }
      };
    }
  }

  // Fallback: use agent's reasoning style to pick LLM
  if (agentGenes?.reasoning_style?.value) {
    const llm = routeToLLM(agentGenes.reasoning_style.value as string);
    return {
      type: 'llm',
      target: llm,
      confidence: 0.5,
      reason: `Fallback to LLM based on reasoning_style: ${agentGenes.reasoning_style.value}`,
      metadata: { reasoningStyle: agentGenes.reasoning_style.value, llm }
    };
  }

  // Ultimate fallback
  return {
    type: 'generator',
    target: 'generateGeneric',
    confidence: 0.3,
    reason: 'Ultimate fallback: generic generator',
    metadata: { domain: 'generic' }
  };
}

// ─── Generator Selector ──────────────────────────────────────
/**
 * Selects optimal generator version based on:
 * - GPU availability preference
 * - Seed genes (quality, complexity)
 * - Agent tool_preference gene
 */
function selectGenerator(domain: string, config: RouterConfig): string {
  const normalized = domain.toLowerCase();
  const baseGenerator = `generate${normalized.charAt(0).toUpperCase()}${normalized.slice(1)}`;
  const gpuDomains = new Set(['character', 'music', 'sprite']);
  const v3Domains = new Set(['character', 'music', 'sprite', 'visual2d', 'animation', 'fullgame', 'game']);

  if (config.preferGPU && gpuDomains.has(normalized)) {
    return `${baseGenerator}GPU`;
  }

  if (v3Domains.has(normalized) && ENGINES[normalized]) {
    return `${baseGenerator}V3`;
  }

  if (ENGINES[normalized]) {
    return baseGenerator;
  }

  return 'generateGeneric';
}

// ─── LLM Router (replaces Model Router for reasoning) ──
/**
 * Routes to LLM provider based on agent's reasoning genes:
 * - reasoning_style: deductive→claude (precise), inductive→gpt (creative), abductive→ollama (local)
 * - confidence: high→powerful model, low→fast model
 * - depth: deep→reasoning model, shallow→fast model
 */
export function routeToLLM(
  reasoningStyle: string,
  agentGenes?: Record<string, any>
): string {
  const confidence = agentGenes?.confidence?.value || 0.7;
  const depth = agentGenes?.depth?.value || 0.5;

  // Reasoning style routing
  switch (reasoningStyle) {
    case 'deductive':
      return 'claude-3-opus'; // Precise, logical
    case 'inductive':
      return 'gpt-4-turbo'; // Pattern recognition, creative
    case 'abductive':
      return 'ollama/mistral'; // Local, exploratory
    default:
      return 'gpt-3.5-turbo';
  }
}

// ─── Stance-Based Routing ────────────────────────────────────
/**
 * Reconstructs Nexus "Adaptive Stances" using genetic configuration
 * Each stance = specific routing preferences encoded in genes
 */
export function routeByStance(
  seed: Seed,
  stance: 'architect' | 'artist' | 'critic' | 'explorer' | 'composer' | 'analyst'
): RoutingDecision {
  const stanceConfig: Record<string, any> = {
    architect: {
      reasoning_style: 'deductive',
      creativity: 0.3,
      depth: 0.8,
      tool_preference: 'planning',
      domains: ['architecture', 'geometry3d', 'ui']
    },
    artist: {
      reasoning_style: 'abductive',
      creativity: 0.9,
      depth: 0.5,
      tool_preference: 'generation',
      domains: ['visual2d', 'character', 'fashion']
    },
    critic: {
      reasoning_style: 'deductive',
      creativity: 0.2,
      depth: 0.9,
      tool_preference: 'analysis',
      domains: ['visual2d', 'music', 'narrative']
    },
    explorer: {
      reasoning_style: 'abductive',
      creativity: 0.8,
      depth: 0.4,
      tool_preference: 'exploration',
      domains: ['ecosystem', 'game', 'alife']
    },
    composer: {
      reasoning_style: 'inductive',
      creativity: 0.7,
      depth: 0.6,
      tool_preference: 'composition',
      domains: ['music', 'narrative', 'choreography']
    },
    analyst: {
      reasoning_style: 'deductive',
      creativity: 0.2,
      depth: 0.9,
      tool_preference: 'data',
      domains: ['circuit', 'robotics', 'physics']
    }
  };

  const config = stanceConfig[stance];
  if (!config) {
    return routeSeed(seed);
  }

  // Create temporary genes for routing
  const tempGenes = {
    reasoning_style: { value: config.reasoning_style },
    domains: { value: config.domains },
    tool_preference: { value: config.tool_preference },
    creativity: { value: config.creativity },
    depth: { value: config.depth }
  };

  return routeSeed(seed, tempGenes);
}

// ─── Batch Routing (for Swarm Runtime) ─────────────────────
/**
 * Routes multiple seeds for parallel processing
 * Used by Swarm Runtime to distribute tasks
 */
export function routeBatch(
  seeds: Seed[],
  agentGenes?: Record<string, any>
): Map<string, RoutingDecision> {
  const decisions = new Map<string, RoutingDecision>();
  
  for (const seed of seeds) {
    const decision = routeSeed(seed, agentGenes);
    decisions.set(seed.$hash || seed.phrase || '', decision);
  }

  return decisions;
}

// ─── Routing Statistics ──────────────────────────────────────
export interface RoutingStats {
  totalRouted: number;
  byType: Record<string, number>;
  byDomain: Record<string, number>;
  averageConfidence: number;
}

export function getRoutingStats(decisions: RoutingDecision[]): RoutingStats {
  const stats: RoutingStats = {
    totalRouted: decisions.length,
    byType: {},
    byDomain: {},
    averageConfidence: 0
  };

  let totalConfidence = 0;

  for (const decision of decisions) {
    // Count by type
    stats.byType[decision.type] = (stats.byType[decision.type] || 0) + 1;
    
    // Count by domain
    const domain = decision.metadata?.domain || 'unknown';
    stats.byDomain[domain] = (stats.byDomain[domain] || 0) + 1;
    
    // Sum confidence
    totalConfidence += decision.confidence;
  }

  stats.averageConfidence = decisions.length > 0 ? totalConfidence / decisions.length : 0;

  return stats;
}
