/**
 * Cross-Domain Composition — Expanded Functor Network
 * 50+ functor bridges, BFS pathfinding, generic composition via gene mapping
 */

export interface FunctorBridge {
  name: string;
  sourceDomain: string;
  targetDomain: string;
  coherence: number;
  generic?: boolean;
  functor?: string;
  source?: string;
  target?: string;
  /** Optional custom gene-transform function for high-fidelity bridges. */
  transform?: (sourceGenes: Record<string, any>, seed: any) => Record<string, any>;
}

export interface CompositionPath {
  source: string;
  target: string;
  bridges: string[];
  totalCoherence: number;
}

// ─── Domain Gene Profiles ────────────────────────────────────────────────────
// Each domain uses specific gene keys when growing artifacts.
// This profile drives the similarity matrix and functor generation.

const DOMAIN_GENES: Record<string, string[]> = {
  character:   ['size', 'archetype', 'strength', 'agility', 'personality', 'palette'],
  sprite:      ['resolution', 'paletteSize', 'colors', 'symmetry'],
  music:       ['tempo', 'key', 'scale', 'melody', 'tuning'],
  visual2d:    ['style', 'complexity', 'palette', 'composition', 'layers'],
  procedural:  ['octaves', 'persistence', 'scale', 'biome', 'heightmapSize'],
  fullgame:    ['genre', 'difficulty', 'levelCount', 'mechanics'],
  animation:   ['frameCount', 'fps', 'motionType', 'loop'],
  geometry3d:  ['primitive', 'segments', 'radius', 'detail'],
  narrative:   ['structure', 'tone', 'characters', 'plot', 'acts'],
  ui:          ['layout', 'theme', 'components', 'interaction'],
  physics:     ['gravity', 'friction', 'elasticity', 'simulationType'],
  audio:       ['soundType', 'frequency', 'duration', 'attack', 'decay'],
  ecosystem:   ['speciesCount', 'foodWebComplexity', 'climateZones', 'timeSteps'],
  game:        ['genre', 'difficulty', 'levelCount', 'hasPowerups', 'hasBoss'],
  alife:       ['populationSize', 'mutationRate', 'environment', 'generations'],
  shader:      ['shaderType', 'technique', 'iterations'],
  particle:    ['count', 'emitterType', 'particleType', 'lifetime', 'speed', 'spread'],
  typography:  ['fontFamily', 'weight', 'style', 'size', 'text'],
  architecture:['buildingType', 'floors', 'footprint', 'style', 'hasDetails'],
  vehicle:     ['vehicleType', 'style', 'wheelCount', 'hasDetails'],
  furniture:   ['furnitureType', 'style', 'dimensions', 'hasDetails'],
  fashion:     ['clothingType', 'style', 'size', 'hasDetails'],
  robotics:    ['robotType', 'mobility', 'armCount', 'hasDetails'],
  circuit:     ['circuitType', 'componentCount', 'isDigital', 'hasSimulation'],
  food:        ['foodType', 'style', 'cuisine', 'ingredients'],
  choreography:['style', 'tempo', 'complexity', 'duration', 'formation'],
  agent:       ['persona', 'temperature', 'reasoning_depth', 'exploration_rate', 'max_steps'],
  friend:      ['body', 'face', 'voice', 'persona', 'memory', 'bond'],
};

// ─── Gene Category Groups ────────────────────────────────────────────────────
// Genes in the same category have semantic correspondences across domains.

const GENE_CATEGORIES: Record<string, string> = {
  size: 'scale', resolution: 'scale', scale: 'scale', dimensions: 'scale', segments: 'scale',
  populationSize: 'scale', levelCount: 'scale', floors: 'scale', count: 'scale',
  archetype: 'type', genre: 'type', biome: 'type', soundType: 'type', shaderType: 'type',
  vehicleType: 'type', foodType: 'type', buildingType: 'type', furnitureType: 'type',
  clothingType: 'type', robotType: 'type', circuitType: 'type', motionType: 'type',
  emitterType: 'type', particleType: 'type', primitive: 'type', simulationType: 'type',
  style: 'aesthetic', tone: 'aesthetic', theme: 'aesthetic', composition: 'aesthetic',
  symmetry: 'aesthetic', palette: 'color', colors: 'color',
  strength: 'power', difficulty: 'power', gravity: 'power', intensity: 'power',
  agility: 'speed', speed: 'speed', fps: 'speed', tempo: 'speed', mobility: 'speed',
  complexity: 'detail', octaves: 'detail', detail: 'detail', iterations: 'detail',
  hasDetails: 'detail', componentCount: 'detail', wheelCount: 'detail', armCount: 'detail',
  personality: 'behavior', persona: 'behavior', character: 'behavior',
  temperature: 'randomness', mutationRate: 'randomness', exploration_rate: 'randomness',
  reasoning_depth: 'depth', generations: 'depth', acts: 'depth', layers: 'depth',
  persistence: 'memory', duration: 'length', lifetime: 'length', timeSteps: 'length',
  foodWebComplexity: 'complexity', climateZones: 'zones', environment: 'zones',
  layout: 'structure', structure: 'structure', formation: 'structure',
  text: 'content', narrative: 'content', plot: 'content', ingredients: 'content',
};

function geneCategory(gene: string): string {
  return GENE_CATEGORIES[gene] ?? 'other';
}

// ─── Similarity Matrix ──────────────────────────────────────────────────────

function domainGeneCategories(domain: string): Set<string> {
  const cats = new Set<string>();
  for (const gene of DOMAIN_GENES[domain] ?? []) {
    cats.add(geneCategory(gene));
  }
  return cats;
}

function domainSimilarity(a: string, b: string): number {
  const catsA = domainGeneCategories(a);
  const catsB = domainGeneCategories(b);
  if (catsA.size === 0 && catsB.size === 0) return 0.3;
  const union = new Set([...catsA, ...catsB]);
  const intersection = new Set([...catsA].filter(c => catsB.has(c)));
  return (intersection.size) / (union.size || 1);
}

// ─── Functor Registry ────────────────────────────────────────────────────────
// Hand-crafted high-coherence bridges + auto-generated from similarity matrix.

const ALL_DOMAINS = Object.keys(DOMAIN_GENES);

const HAND_CRAFTED: FunctorBridge[] = [
  { name: 'character_to_sprite', sourceDomain: 'character', targetDomain: 'sprite', coherence: 0.85 },
  { name: 'character_to_music', sourceDomain: 'character', targetDomain: 'music', coherence: 0.72 },
  { name: 'character_to_fullgame', sourceDomain: 'character', targetDomain: 'fullgame', coherence: 0.78 },
  { name: 'character_to_narrative', sourceDomain: 'character', targetDomain: 'narrative', coherence: 0.76 },
  { name: 'character_to_animation', sourceDomain: 'character', targetDomain: 'animation', coherence: 0.80 },
  { name: 'character_to_geometry3d', sourceDomain: 'character', targetDomain: 'geometry3d', coherence: 0.74 },
  { name: 'character_to_agent', sourceDomain: 'character', targetDomain: 'agent', coherence: 0.68 },
  { name: 'sprite_to_visual2d', sourceDomain: 'sprite', targetDomain: 'visual2d', coherence: 0.82 },
  { name: 'sprite_to_animation', sourceDomain: 'sprite', targetDomain: 'animation', coherence: 0.78 },
  { name: 'sprite_to_character', sourceDomain: 'sprite', targetDomain: 'character', coherence: 0.70 },
  { name: 'music_to_audio', sourceDomain: 'music', targetDomain: 'audio', coherence: 0.88 },
  { name: 'music_to_choreography', sourceDomain: 'music', targetDomain: 'choreography', coherence: 0.82 },
  { name: 'music_to_ecosystem', sourceDomain: 'music', targetDomain: 'ecosystem', coherence: 0.65 },
  { name: 'music_to_fullgame', sourceDomain: 'music', targetDomain: 'fullgame', coherence: 0.70 },
  { name: 'visual2d_to_sprite', sourceDomain: 'visual2d', targetDomain: 'sprite', coherence: 0.80 },
  { name: 'visual2d_to_animation', sourceDomain: 'visual2d', targetDomain: 'animation', coherence: 0.75 },
  { name: 'visual2d_to_procedural', sourceDomain: 'visual2d', targetDomain: 'procedural', coherence: 0.68 },
  { name: 'visual2d_to_typography', sourceDomain: 'visual2d', targetDomain: 'typography', coherence: 0.62 },
  { name: 'visual2d_to_shader', sourceDomain: 'visual2d', targetDomain: 'shader', coherence: 0.71 },
  { name: 'procedural_to_fullgame', sourceDomain: 'procedural', targetDomain: 'fullgame', coherence: 0.82 },
  { name: 'procedural_to_architecture', sourceDomain: 'procedural', targetDomain: 'architecture', coherence: 0.74 },
  { name: 'procedural_to_geometry3d', sourceDomain: 'procedural', targetDomain: 'geometry3d', coherence: 0.76 },
  { name: 'fullgame_to_game', sourceDomain: 'fullgame', targetDomain: 'game', coherence: 0.85 },
  { name: 'fullgame_to_animation', sourceDomain: 'fullgame', targetDomain: 'animation', coherence: 0.72 },
  { name: 'fullgame_to_narrative', sourceDomain: 'fullgame', targetDomain: 'narrative', coherence: 0.70 },
  { name: 'fullgame_to_ui', sourceDomain: 'fullgame', targetDomain: 'ui', coherence: 0.68 },
  { name: 'animation_to_sprite', sourceDomain: 'animation', targetDomain: 'sprite', coherence: 0.79 },
  { name: 'animation_to_character', sourceDomain: 'animation', targetDomain: 'character', coherence: 0.77 },
  { name: 'geometry3d_to_procedural', sourceDomain: 'geometry3d', targetDomain: 'procedural', coherence: 0.80 },
  { name: 'geometry3d_to_architecture', sourceDomain: 'geometry3d', targetDomain: 'architecture', coherence: 0.84 },
  { name: 'geometry3d_to_vehicle', sourceDomain: 'geometry3d', targetDomain: 'vehicle', coherence: 0.78 },
  { name: 'geometry3d_to_furniture', sourceDomain: 'geometry3d', targetDomain: 'furniture', coherence: 0.76 },
  { name: 'geometry3d_to_robotics', sourceDomain: 'geometry3d', targetDomain: 'robotics', coherence: 0.80 },
  { name: 'geometry3d_to_fashion', sourceDomain: 'geometry3d', targetDomain: 'fashion', coherence: 0.66 },
  { name: 'geometry3d_to_food', sourceDomain: 'geometry3d', targetDomain: 'food', coherence: 0.64 },
  { name: 'narrative_to_fullgame', sourceDomain: 'narrative', targetDomain: 'fullgame', coherence: 0.80 },
  { name: 'narrative_to_agent', sourceDomain: 'narrative', targetDomain: 'agent', coherence: 0.74 },
  { name: 'narrative_to_character', sourceDomain: 'narrative', targetDomain: 'character', coherence: 0.72 },
  { name: 'narrative_to_ui', sourceDomain: 'narrative', targetDomain: 'ui', coherence: 0.60 },
  { name: 'ui_to_fullgame', sourceDomain: 'ui', targetDomain: 'fullgame', coherence: 0.72 },
  { name: 'ui_to_narrative', sourceDomain: 'ui', targetDomain: 'narrative', coherence: 0.64 },
  { name: 'physics_to_fullgame', sourceDomain: 'physics', targetDomain: 'fullgame', coherence: 0.88 },
  { name: 'physics_to_procedural', sourceDomain: 'physics', targetDomain: 'procedural', coherence: 0.72 },
  { name: 'physics_to_ecosystem', sourceDomain: 'physics', targetDomain: 'ecosystem', coherence: 0.74 },
  { name: 'physics_to_alife', sourceDomain: 'physics', targetDomain: 'alife', coherence: 0.70 },
  { name: 'audio_to_music', sourceDomain: 'audio', targetDomain: 'music', coherence: 0.85 },
  { name: 'audio_to_ecosystem', sourceDomain: 'audio', targetDomain: 'ecosystem', coherence: 0.58 },
  { name: 'ecosystem_to_alife', sourceDomain: 'ecosystem', targetDomain: 'alife', coherence: 0.82 },
  { name: 'ecosystem_to_fullgame', sourceDomain: 'ecosystem', targetDomain: 'fullgame', coherence: 0.66 },
  { name: 'game_to_fullgame', sourceDomain: 'game', targetDomain: 'fullgame', coherence: 0.87 },
  { name: 'game_to_alife', sourceDomain: 'game', targetDomain: 'alife', coherence: 0.68 },
  { name: 'alife_to_ecosystem', sourceDomain: 'alife', targetDomain: 'ecosystem', coherence: 0.80 },
  { name: 'alife_to_agent', sourceDomain: 'alife', targetDomain: 'agent', coherence: 0.70 },
  { name: 'shader_to_visual2d', sourceDomain: 'shader', targetDomain: 'visual2d', coherence: 0.76 },
  { name: 'shader_to_particle', sourceDomain: 'shader', targetDomain: 'particle', coherence: 0.82 },
  { name: 'shader_to_procedural', sourceDomain: 'shader', targetDomain: 'procedural', coherence: 0.68 },
  { name: 'particle_to_shader', sourceDomain: 'particle', targetDomain: 'shader', coherence: 0.78 },
  { name: 'particle_to_visual2d', sourceDomain: 'particle', targetDomain: 'visual2d', coherence: 0.70 },
  { name: 'particle_to_physics', sourceDomain: 'particle', targetDomain: 'physics', coherence: 0.72 },
  { name: 'typography_to_visual2d', sourceDomain: 'typography', targetDomain: 'visual2d', coherence: 0.66 },
  { name: 'typography_to_ui', sourceDomain: 'typography', targetDomain: 'ui', coherence: 0.74 },
  { name: 'typography_to_narrative', sourceDomain: 'typography', targetDomain: 'narrative', coherence: 0.62 },
  { name: 'architecture_to_procedural', sourceDomain: 'architecture', targetDomain: 'procedural', coherence: 0.72 },
  { name: 'architecture_to_geometry3d', sourceDomain: 'architecture', targetDomain: 'geometry3d', coherence: 0.82 },
  { name: 'architecture_to_furniture', sourceDomain: 'architecture', targetDomain: 'furniture', coherence: 0.70 },
  { name: 'architecture_to_fullgame', sourceDomain: 'architecture', targetDomain: 'fullgame', coherence: 0.66 },
  { name: 'vehicle_to_geometry3d', sourceDomain: 'vehicle', targetDomain: 'geometry3d', coherence: 0.80 },
  { name: 'vehicle_to_fullgame', sourceDomain: 'vehicle', targetDomain: 'fullgame', coherence: 0.68 },
  { name: 'vehicle_to_transport', sourceDomain: 'vehicle', targetDomain: 'physics', coherence: 0.66 },
  { name: 'furniture_to_geometry3d', sourceDomain: 'furniture', targetDomain: 'geometry3d', coherence: 0.78 },
  { name: 'furniture_to_architecture', sourceDomain: 'furniture', targetDomain: 'architecture', coherence: 0.74 },
  { name: 'fashion_to_character', sourceDomain: 'fashion', targetDomain: 'character', coherence: 0.76 },
  { name: 'fashion_to_visual2d', sourceDomain: 'fashion', targetDomain: 'visual2d', coherence: 0.68 },
  { name: 'fashion_to_geometry3d', sourceDomain: 'fashion', targetDomain: 'geometry3d', coherence: 0.72 },
  { name: 'robotics_to_geometry3d', sourceDomain: 'robotics', targetDomain: 'geometry3d', coherence: 0.82 },
  { name: 'robotics_to_vehicle', sourceDomain: 'robotics', targetDomain: 'vehicle', coherence: 0.78 },
  { name: 'robotics_to_agent', sourceDomain: 'robotics', targetDomain: 'agent', coherence: 0.68 },
  { name: 'circuit_to_geometry3d', sourceDomain: 'circuit', targetDomain: 'geometry3d', coherence: 0.60 },
  { name: 'circuit_to_fullgame', sourceDomain: 'circuit', targetDomain: 'fullgame', coherence: 0.62 },
  { name: 'circuit_to_robotics', sourceDomain: 'circuit', targetDomain: 'robotics', coherence: 0.70 },
  { name: 'food_to_character', sourceDomain: 'food', targetDomain: 'character', coherence: 0.58 },
  { name: 'food_to_fullgame', sourceDomain: 'food', targetDomain: 'fullgame', coherence: 0.60 },
  { name: 'food_to_visual2d', sourceDomain: 'food', targetDomain: 'visual2d', coherence: 0.64 },
  { name: 'choreography_to_music', sourceDomain: 'choreography', targetDomain: 'music', coherence: 0.78 },
  { name: 'choreography_to_animation', sourceDomain: 'choreography', targetDomain: 'animation', coherence: 0.84 },
  { name: 'choreography_to_fullgame', sourceDomain: 'choreography', targetDomain: 'fullgame', coherence: 0.66 },
  { name: 'agent_to_character', sourceDomain: 'agent', targetDomain: 'character', coherence: 0.70 },
  { name: 'agent_to_narrative', sourceDomain: 'agent', targetDomain: 'narrative', coherence: 0.78 },
  { name: 'agent_to_fullgame', sourceDomain: 'agent', targetDomain: 'fullgame', coherence: 0.68 },
  { name: 'agent_to_agent', sourceDomain: 'agent', targetDomain: 'agent', coherence: 0.85 },
];

// Auto-generate additional functors from similarity matrix (coherence ≥ 0.4)
function generateAutoFunctors(): FunctorBridge[] {
  const generated: FunctorBridge[] = [];
  const existing = new Set(HAND_CRAFTED.map(f => `${f.sourceDomain}_${f.targetDomain}`));

  for (const src of ALL_DOMAINS) {
    for (const tgt of ALL_DOMAINS) {
      if (src === tgt) continue;
      const key = `${src}_${tgt}`;
      if (existing.has(key)) continue;

      const sim = domainSimilarity(src, tgt);
      if (sim >= 0.4) {
        generated.push({
          name: key,
          sourceDomain: src,
          targetDomain: tgt,
          coherence: +(0.35 + sim * 0.4).toFixed(2), // scale similarity to coherence
          generic: true,
        });
      }
    }
  }
  return generated;
}

const AUTO_FUNCTORS = generateAutoFunctors();

export const FUNCTOR_REGISTRY: FunctorBridge[] = [...HAND_CRAFTED, ...AUTO_FUNCTORS];

// ─── Generic Composition via Gene Mapping ────────────────────────────────────

const CATEGORY_DEFAULTS: Record<string, number | string | number[]> = {
  scale: 0.5, type: 'default', aesthetic: 'neutral', color: [0.5, 0.5, 0.5],
  power: 0.5, speed: 0.5, detail: 0.5, behavior: 'balanced',
  randomness: 0.5, depth: 0.5, length: 1, zones: 1, structure: 'simple',
  content: 'generated', memory: 0.5, complexity: 0.5,
};

function mapGeneValue(value: unknown, category: string): unknown {
  if (typeof value === 'number') {
    if (category === 'color') return value;
    if (category === 'scale') return Math.max(0.1, Math.min(value, 1));
    if (category === 'detail') return Math.floor(value * 10) || 1;
    return value;
  }
  if (typeof value === 'string') return value;
  return CATEGORY_DEFAULTS[category] ?? 0.5;
}

function genericCompose(seed: any, sourceDomain: string, targetDomain: string): any {
  const sourceGenes: Record<string, any> = seed.genes ?? {};
  const targetGenes: Record<string, any> = {};
  const usedCategories = new Set<string>();

  // Map source genes to target genes via shared categories
  for (const [key, gene] of Object.entries(sourceGenes)) {
    const cat = geneCategory(key);
    if (usedCategories.has(cat)) continue;

    // Find a target gene in the same category
    const targetGeneName = (DOMAIN_GENES[targetDomain] ?? []).find(
      tg => geneCategory(tg) === cat && !(tg in targetGenes)
    );
    if (targetGeneName && gene && typeof gene === 'object') {
      targetGenes[targetGeneName] = {
        type: geneCategory(targetGeneName) === 'color' ? 'vector' : typeof gene.value === 'number' ? 'scalar' : 'categorical',
        value: mapGeneValue(gene.value, cat),
      };
      usedCategories.add(cat);
    }
  }

  // Fill missing target genes with defaults
  for (const geneName of DOMAIN_GENES[targetDomain] ?? []) {
    if (!(geneName in targetGenes)) {
      const cat = geneCategory(geneName);
      targetGenes[geneName] = {
        type: cat === 'color' ? 'vector' : cat === 'content' ? 'categorical' : 'scalar',
        value: CATEGORY_DEFAULTS[cat] ?? 0.5,
      };
    }
  }

  return {
    ...seed,
    $domain: targetDomain,
    $lineage: {
      ...seed.$lineage,
      operation: `compose:${sourceDomain}→${targetDomain}`,
      parents: [...(seed.$lineage?.parents ?? []), seed.$hash ?? sourceDomain],
    },
    genes: targetGenes,
  };
}

// ─── Public API ──────────────────────────────────────────────────────────────

export function composeSeed(seed: any, targetDomain: string): any {
  const sourceDomain = seed.$domain ?? seed.metadata?.domain ?? 'unknown';
  if (sourceDomain === targetDomain) return { ...seed };

  const bridge = FUNCTOR_REGISTRY.find(
    f => f.sourceDomain === sourceDomain && f.targetDomain === targetDomain
  );

  if (bridge) {
    let transformedGenes: Record<string, any>;
    const sourceGenes = seed.genes ?? {};

    if (typeof bridge.transform === 'function') {
      // High-fidelity custom transform — used by domain-specific
      // bridges (e.g. friend × music) for semantically correct gene mapping.
      transformedGenes = bridge.transform(sourceGenes, seed);
    } else {
      transformedGenes = {};
      // Project genes forward: keep ones that map to target domain
      if (typeof sourceGenes === 'object') {
        let kept = 0;
        const targetGeneNames = DOMAIN_GENES[targetDomain] ?? [];
        for (const [key, gene] of Object.entries(sourceGenes)) {
          // Keep if the source gene name or category exists in target domain
          if (targetGeneNames.includes(key) || targetGeneNames.some(tg => geneCategory(tg) === geneCategory(key))) {
            transformedGenes[key] = typeof gene === 'object' ? { ...gene } : gene;
            kept++;
          }
        }
        // Fill missing genes with defaults
        for (const geneName of targetGeneNames) {
          if (!(geneName in transformedGenes)) {
            const cat = geneCategory(geneName);
            transformedGenes[geneName] = { type: 'scalar', value: CATEGORY_DEFAULTS[cat] ?? 0.5 };
          }
        }
      }
    }

    return {
      ...seed,
      $domain: targetDomain,
      $lineage: {
        ...seed.$lineage,
        operation: `compose:${sourceDomain}→${targetDomain}`,
        parents: [...(seed.$lineage?.parents ?? []), seed.$hash ?? sourceDomain],
      },
      genes: Object.keys(transformedGenes).length > 0 ? transformedGenes : seed.genes,
    };
  }

  // No direct bridge: use generic composition
  return genericCompose(seed, sourceDomain, targetDomain);
}

export function getFunctor(name: string): FunctorBridge | undefined {
  return FUNCTOR_REGISTRY.find(f => f.name === name);
}

export function getCompositionGraph(): { nodes: string[]; edges: FunctorBridge[] } {
  const uniqueNodes = [...new Set(FUNCTOR_REGISTRY.flatMap(f => [f.sourceDomain, f.targetDomain]))].filter(d => d !== 'mixed');
  return { nodes: uniqueNodes, edges: FUNCTOR_REGISTRY.filter(f => f.targetDomain !== 'mixed') };
}

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
      const totalCoherence = bridges.length > 0
        ? bridges.reduce((prod, b) => prod * b.coherence, 1)
        : 1;
      return { source: sourceDomain, target: targetDomain, bridges: path, totalCoherence };
    }

    if (visited.has(domain)) continue;
    visited.add(domain);

    for (const bridge of FUNCTOR_REGISTRY) {
      if (bridge.sourceDomain === domain && bridge.targetDomain !== 'mixed' && !visited.has(bridge.targetDomain)) {
        queue.push({ domain: bridge.targetDomain, path: [...path, bridge.name] });
      }
    }
  }

  // If no path found through specific bridges, return generic path
  const generic = FUNCTOR_REGISTRY.find(
    f => f.sourceDomain === sourceDomain && f.targetDomain === targetDomain && f.generic
  );
  if (generic) {
    return { source: sourceDomain, target: targetDomain, bridges: [generic.name], totalCoherence: generic.coherence };
  }

  return null;
}

export function getPossibleCompositions(domain: string): FunctorBridge[] {
  return FUNCTOR_REGISTRY.filter(f => f.sourceDomain === domain && f.targetDomain !== 'mixed');
}

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
      if (bridge.sourceDomain === domain && bridge.targetDomain !== 'mixed' && !visited.has(bridge.targetDomain)) {
        queue.push({ domain: bridge.targetDomain, coherence: coherence * bridge.coherence });
      }
    }
  }

  return reachable.sort((a, b) => b.coherence - a.coherence);
}
