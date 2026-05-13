/**
 * Cross-Domain Composition — Simplified Functor Bridges
 * Features: 12 functor bridges, BFS pathfinding, coherence scoring
 */

export interface FunctorBridge {
  name: string;
  sourceDomain: string;
  targetDomain: string;
  coherence: number;
}

export interface CompositionPath {
  source: string;
  target: string;
  bridges: string[];
  totalCoherence: number;
}

/**
 * All registered functor bridges
 */
export const FUNCTOR_REGISTRY: FunctorBridge[] = [
  { name: 'character_to_sprite', sourceDomain: 'character', targetDomain: 'sprite', coherence: 0.85 },
  { name: 'character_to_music', sourceDomain: 'character', targetDomain: 'music', coherence: 0.72 },
  { name: 'character_to_fullgame', sourceDomain: 'character', targetDomain: 'fullgame', coherence: 0.78 },
  { name: 'procedural_to_fullgame', sourceDomain: 'procedural', targetDomain: 'fullgame', coherence: 0.82 },
  { name: 'music_to_ecosystem', sourceDomain: 'music', targetDomain: 'ecosystem', coherence: 0.65 },
  { name: 'physics_to_fullgame', sourceDomain: 'physics', targetDomain: 'fullgame', coherence: 0.88 },
  { name: 'visual2d_to_animation', sourceDomain: 'visual2d', targetDomain: 'animation', coherence: 0.75 },
  { name: 'narrative_to_fullgame', sourceDomain: 'narrative', targetDomain: 'fullgame', coherence: 0.80 },
  { name: 'terrain_to_fullgame', sourceDomain: 'procedural', targetDomain: 'fullgame', coherence: 0.85 },
  { name: 'agent_to_character', sourceDomain: 'agent', targetDomain: 'character', coherence: 0.70 },
  { name: 'agent_to_narrative', sourceDomain: 'agent', targetDomain: 'narrative', coherence: 0.78 },
  { name: 'agent_compose', sourceDomain: 'agent', targetDomain: 'mixed', coherence: 0.75 }
];

/**
 * Compose a seed from one domain to another via functor bridges.
 * Maps genes to target domain using the functor when available,
 * falls back to setting the domain flag.
 */
export function composeSeed(seed: any, targetDomain: string): any {
  const sourceDomain = seed.$domain ?? seed.metadata?.domain ?? 'unknown';

  // Find direct functor bridge
  const bridge = FUNCTOR_REGISTRY.find(
    f => f.sourceDomain === sourceDomain && f.targetDomain === targetDomain
  );

  if (bridge) {
    // Transform: keep common genes, add target defaults
    const transformedGenes: Record<string, any> = {};
    const sourceGenes = seed.genes ?? {};

    // Project 60% of genes forward (coherence ratio as approximation)
    if (typeof sourceGenes === 'object') {
      const geneEntries = Object.entries(sourceGenes);
      const keepCount = Math.ceil(geneEntries.length * bridge.coherence);
      for (let i = 0; i < geneEntries.length; i++) {
        const [key, gene] = geneEntries[i];
        if (i < keepCount && gene && typeof gene === 'object') {
          transformedGenes[`${key}_${targetDomain}`] = { ...gene };
        }
      }
    }

    return {
      ...seed,
      $domain: targetDomain,
      genes: transformedGenes,
    };
  }

  // No direct functor: BFS fallback just sets domain flag
  return { ...seed, $domain: targetDomain };
}

/**
 * Legacy API compatibility - getFunctor
 */
export function getFunctor(name: string): FunctorBridge | undefined {
  return FUNCTOR_REGISTRY.find(f => f.name === name);
}

/**
 * Legacy API compatibility - getCompositionGraph
 */
export function getCompositionGraph(): any {
  return { nodes: FUNCTOR_REGISTRY.map(f => f.sourceDomain), edges: FUNCTOR_REGISTRY };
}

/**
 * Find composition path using BFS
 */
export function findCompositionPath(
  sourceDomain: string,
  targetDomain: string
): CompositionPath | null {
  const queue: { domain: string; path: string[] }[] = [{ domain: sourceDomain, path: [] }];
  const visited = new Set<string>();

  while (queue.length > 0) {
    const { domain, path } = queue.shift()!;

    if (domain === targetDomain) {
      const bridges = path.map(name => FUNCTOR_REGISTRY.find(f => f.name === name)!);
      const totalCoherence = bridges.reduce((prod, b) => prod * b.coherence, 1);
      return { source: sourceDomain, target: targetDomain, bridges: path, totalCoherence };
    }

    if (visited.has(domain)) continue;
    visited.add(domain);

    for (const bridge of FUNCTOR_REGISTRY) {
      if (bridge.sourceDomain === domain && !visited.has(bridge.targetDomain)) {
        queue.push({ domain: bridge.targetDomain, path: [...path, bridge.name] });
      }
    }
  }

  return null;
}

/**
 * Get all possible compositions from a domain
 */
export function getPossibleCompositions(domain: string): FunctorBridge[] {
  return FUNCTOR_REGISTRY.filter(f => f.sourceDomain === domain);
}

/**
 * Get all reachable domains from a source
 */
export function getReachableDomains(sourceDomain: string): { domain: string; coherence: number }[] {
  const reachable: { domain: string; coherence: number }[] = [];
  const visited = new Set<string>();
  const queue: { domain: string; coherence: number }[] = [{ domain: sourceDomain, coherence: 1.0 }];

  while (queue.length > 0) {
    const { domain, coherence } = queue.shift()!;
    if (visited.has(domain)) continue;
    visited.add(domain);

    if (domain !== sourceDomain) {
      reachable.push({ domain, coherence });
    }

    for (const bridge of FUNCTOR_REGISTRY) {
      if (bridge.sourceDomain === domain) {
        queue.push({ domain: bridge.targetDomain, coherence: coherence * bridge.coherence });
      }
    }
  }

  return reachable.sort((a, b) => b.coherence - a.coherence);
}
