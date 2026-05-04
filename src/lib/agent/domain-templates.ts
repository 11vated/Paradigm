/**
 * Agent Domain Templates
 * Gap 3: Per-engine gene templates for all 27 domains
 * 
 * Allows the agent to create seeds in any domain with
 * proper gene defaults and fitness functions.
 */

import type { Seed } from '../kernel/types';

export interface DomainGeneTemplate {
  required: string[];
  optional: string[];
  defaults: Record<string, { type: string; value: any }>;
  fitness: (genes: Record<string, { value: any }>) => number;
  description: string;
}

export const DOMAIN_TEMPLATES: Record<string, DomainGeneTemplate> = {
  // 3D Domains
  character: {
    required: ['archetype', 'strength', 'agility'],
    optional: ['palette', 'personality', 'combat_style', 'weapon'],
    defaults: {
      archetype: { type: 'categorical', value: 'warrior' },
      strength: { type: 'scalar', value: 0.5 },
      agility: { type: 'scalar', value: 0.5 },
      palette: { type: 'array', value: [0.5, 0.3, 0.8] },
      personality: { type: 'string', value: 'balanced' },
    },
    fitness: (genes) => (genes.strength?.value ?? 0.5) * 0.4 + (genes.agility?.value ?? 0.5) * 0.3,
    description: '3D character with stats, animations, and PBR materials'
  },
  geometry3d: {
    required: ['primitive', 'subdivisions'],
    optional: ['material', 'scale', 'position'],
    defaults: {
      primitive: { type: 'categorical', value: 'sphere' },
      subdivisions: { type: 'int', value: 32 },
      material: { type: 'string', value: 'metallic' },
    },
    fitness: (genes) => (genes.subdivisions?.value ?? 32) / 64,
    description: '3D geometric primitives with materials'
  },
  architecture: {
    required: ['building_type', 'floors'],
    optional: ['style', 'materials', 'foundation'],
    defaults: {
      building_type: { type: 'categorical', value: 'residential' },
      floors: { type: 'int', value: 2 },
      style: { type: 'categorical', value: 'modern' },
    },
    fitness: (genes) => (genes.floors?.value ?? 2) / 10,
    description: 'Architectural buildings and structures'
  },
  vehicle: {
    required: ['vehicle_type', 'speed'],
    optional: ['color', 'size', 'handling'],
    defaults: {
      vehicle_type: { type: 'categorical', value: 'car' },
      speed: { type: 'scalar', value: 0.5 },
      color: { type: 'array', value: [0.2, 0.2, 0.8] },
    },
    fitness: (genes) => (genes.speed?.value ?? 0.5),
    description: 'Vehicles with physics properties'
  },
  robotics: {
    required: ['robot_type', 'actuators'],
    optional: ['sensors', 'ai_level', 'payload'],
    defaults: {
      robot_type: { type: 'categorical', value: 'manipulator' },
      actuators: { type: 'int', value: 6 },
      ai_level: { type: 'scalar', value: 0.3 },
    },
    fitness: (genes) => (genes.actuators?.value ?? 6) / 12,
    description: 'Robotic systems with control code'
  },
  fashion: {
    required: ['garment_type', 'material'],
    optional: ['color', 'pattern', 'size'],
    defaults: {
      garment_type: { type: 'categorical', value: 'shirt' },
      material: { type: 'categorical', value: 'cotton' },
      color: { type: 'array', value: [0.8, 0.2, 0.2] },
    },
    fitness: () => 0.5,
    description: 'Fashion designs and clothing'
  },
  food: {
    required: ['cuisine', 'spice_level'],
    optional: ['ingredients', 'presentation'],
    defaults: {
      cuisine: { type: 'categorical', value: 'fusion' },
      spice_level: { type: 'scalar', value: 0.5 },
    },
    fitness: (genes) => 1 - (genes.spice_level?.value ?? 0.5),
    description: 'Food items with visual representation'
  },
  furniture: {
    required: ['furniture_type', 'material'],
    optional: ['style', 'dimensions', 'ergonomic'],
    defaults: {
      furniture_type: { type: 'categorical', value: 'chair' },
      material: { type: 'categorical', value: 'wood' },
    },
    fitness: () => 0.6,
    description: 'Furniture designs'
  },

  // 2D Domains
  sprite: {
    required: ['resolution', 'style'],
    optional: ['frames', 'palette', 'animation'],
    defaults: {
      resolution: { type: 'int', value: 64 },
      style: { type: 'categorical', value: 'pixel-art' },
      frames: { type: 'int', value: 4 },
    },
    fitness: (genes) => (genes.resolution?.value ?? 64) / 128,
    description: 'Animated sprite sheets'
  },
  visual2d: {
    required: ['style', 'complexity'],
    optional: ['palette', 'composition', 'layers'],
    defaults: {
      style: { type: 'categorical', value: 'abstract' },
      complexity: { type: 'scalar', value: 0.5 },
      palette: { type: 'array', value: [0.5, 0.3, 0.8] },
    },
    fitness: (genes) => genes.complexity?.value ?? 0.5,
    description: '2D generative art and SVGs'
  },
  typography: {
    required: ['font', 'weight'],
    optional: ['style', 'language', 'size'],
    defaults: {
      font: { type: 'categorical', value: 'sans-serif' },
      weight: { type: 'int', value: 400 },
      language: { type: 'string', value: 'en' },
    },
    fitness: () => 0.7,
    description: 'Typography and type designs'
  },

  // Audio/Music Domain
  music: {
    required: ['tempo', 'key', 'scale'],
    optional: ['genre', 'instrumentation', 'duration', 'tuning'],
    defaults: {
      tempo: { type: 'int', value: 120 },
      key: { type: 'categorical', value: 'C' },
      scale: { type: 'categorical', value: 'major' },
      genre: { type: 'categorical', value: 'electronic' },
      tuning: { type: 'string', value: 'a440' },
    },
    fitness: (genes) => (genes.tempo?.value ?? 120) / 200,
    description: 'Music compositions with WAV output'
  },

  // Interactive Domains
  game: {
    required: ['genre', 'difficulty'],
    optional: ['controls', 'physics', 'ai'],
    defaults: {
      genre: { type: 'categorical', value: 'platformer' },
      difficulty: { type: 'scalar', value: 0.5 },
      controls: { type: 'categorical', value: 'keyboard' },
    },
    fitness: (genes) => 1 - Math.abs((genes.difficulty?.value ?? 0.5) - 0.5),
    description: 'Simple browser games'
  },
  fullgame: {
    required: ['genre', 'difficulty', 'levels'],
    optional: ['mechanics', 'narrative', 'physics'],
    defaults: {
      genre: { type: 'categorical', value: 'rpg' },
      difficulty: { type: 'scalar', value: 0.5 },
      levels: { type: 'int', value: 5 },
    },
    fitness: (genes) => ((genes.levels?.value ?? 5) / 20) * 0.5 + (genes.difficulty?.value ?? 0.5) * 0.5,
    description: 'Full HTML5 game bundles'
  },
  ui: {
    required: ['component_type', 'theme'],
    optional: ['responsive', 'accessibility', 'color_scheme'],
    defaults: {
      component_type: { type: 'categorical', value: 'button' },
      theme: { type: 'categorical', value: 'dark' },
      responsive: { type: 'bool', value: true },
    },
    fitness: (genes) => (genes.responsive?.value ? 0.8 : 0.4),
    description: 'UI components and layouts'
  },

  // Simulation Domains
  physics: {
    required: ['simulation_type', 'iterations'],
    optional: ['gravity', 'collision', 'particles'],
    defaults: {
      simulation_type: { type: 'categorical', value: 'rigid_body' },
      iterations: { type: 'int', value: 100 },
      gravity: { type: 'scalar', value: 0.5 },
    },
    fitness: (genes) => (genes.iterations?.value ?? 100) / 500,
    description: 'Physics simulations'
  },
  ecosystem: {
    required: ['species_count', 'interaction_type'],
    optional: ['food_chain', 'environment', 'time_scale'],
    defaults: {
      species_count: { type: 'int', value: 10 },
      interaction_type: { type: 'categorical', value: 'predator_prey' },
    },
    fitness: (genes) => (genes.species_count?.value ?? 10) / 50,
    description: 'Ecosystem food web simulations'
  },
  alife: {
    required: ['algorithm', 'cell_count'],
    optional: ['rules', 'generations', 'pattern'],
    defaults: {
      algorithm: { type: 'categorical', value: 'game_of_life' },
      cell_count: { type: 'int', value: 100 },
    },
    fitness: (genes) => (genes.cell_count?.value ?? 100) / 500,
    description: 'Artificial life simulations'
  },
  particle: {
    required: ['particle_count', 'behavior'],
    optional: ['color_scheme', 'physics', 'emitter'],
    defaults: {
      particle_count: { type: 'int', value: 1000 },
      behavior: { type: 'categorical', value: 'fire' },
    },
    fitness: (genes) => (genes.particle_count?.value ?? 1000) / 10000,
    description: 'Particle system with GPU shaders'
  },

  // Specialized Domains
  narrative: {
    required: ['structure', 'tone'],
    optional: ['characters', 'plot', 'genre'],
    defaults: {
      structure: { type: 'categorical', value: 'hero_journey' },
      tone: { type: 'categorical', value: 'epic' },
      characters: { type: 'array', value: ['protagonist', 'antagonist'] },
    },
    fitness: () => 0.6,
    description: 'Narrative story generation'
  },
  choreography: {
    required: ['dance_style', 'duration'],
    optional: ['difficulty', 'music_sync', 'moves'],
    defaults: {
      dance_style: { type: 'categorical', value: 'contemporary' },
      duration: { type: 'int', value: 60 },
    },
    fitness: (genes) => (genes.duration?.value ?? 60) / 300,
    description: 'Motion choreography with BVH output'
  },
  shader: {
    required: ['shader_type', 'complexity'],
    optional: ['lighting', 'post_processing'],
    defaults: {
      shader_type: { type: 'categorical', value: 'pbr' },
      complexity: { type: 'scalar', value: 0.5 },
    },
    fitness: (genes) => genes.complexity?.value ?? 0.5,
    description: 'GLSL shader code'
  },
  procedural: {
    required: ['algorithm', 'scale'],
    optional: ['octaves', 'seed', 'normalization'],
    defaults: {
      algorithm: { type: 'categorical', value: 'perlin' },
      scale: { type: 'scalar', value: 0.5 },
      octaves: { type: 'int', value: 4 },
    },
    fitness: (genes) => (genes.octaves?.value ?? 4) / 8,
    description: 'Procedural generation'
  },
  circuit: {
    required: ['nodes', 'frequency'],
    optional: ['circuit_type', 'logic_gates', 'voltage'],
    defaults: {
      nodes: { type: 'int', value: 8 },
      frequency: { type: 'scalar', value: 0.5 },
      circuit_type: { type: 'categorical', value: 'digital' },
    },
    fitness: (genes) => (genes.nodes?.value ?? 8) / 64,
    description: 'Electronic circuit schematics'
  },
  agent: {
    required: ['persona', 'reasoning_style'],
    optional: ['tools', 'memory', 'temperature'],
    defaults: {
      persona: { type: 'string', value: 'helpful_assistant' },
      reasoning_style: { type: 'categorical', value: 'deductive' },
      tools: { type: 'array', value: ['seed_create', 'evolve'] },
      temperature: { type: 'scalar', value: 0.5 },
    },
    fitness: (genes) => genes.temperature?.value ?? 0.5,
    description: 'AI agent configurations'
  },
  animation: {
    required: ['duration', 'fps'],
    optional: ['style', 'easing', 'loops'],
    defaults: {
      duration: { type: 'int', value: 60 },
      fps: { type: 'int', value: 24 },
      style: { type: 'categorical', value: 'keyframe' },
    },
    fitness: (genes) => ((genes.duration?.value ?? 60) / 300) * ((genes.fps?.value ?? 24) / 60),
    description: 'Animation sequences'
  },
  terrain: {
    required: ['algorithm', 'scale'],
    optional: ['water_level', 'biomes', 'detail'],
    defaults: {
      algorithm: { type: 'categorical', value: 'simplex' },
      scale: { type: 'scalar', value: 0.5 },
      water_level: { type: 'scalar', value: 0.3 },
    },
    fitness: (genes) => (genes.detail?.value ?? 0.5),
    description: 'Terrain generation'
  }
};

export function getDomainTemplate(domain: string): DomainGeneTemplate | null {
  return DOMAIN_TEMPLATES[domain.toLowerCase()] || null;
}

export function getAllDomains(): string[] {
  return Object.keys(DOMAIN_TEMPLATES);
}

export function createSeedFromDomain(
  domain: string,
  seedHash: string,
  overrides?: Partial<Record<string, { value: any }>>
): Seed {
  const template = getDomainTemplate(domain);
  
  if (!template) {
    throw new Error(`Unknown domain: ${domain}`);
  }
  
  const genes: Record<string, { type: string; value: any }> = {};
  
  const all = { ...template.defaults, ...overrides };
  for (const [key, gene] of Object.entries(all)) {
    genes[key] = { type: gene.type, value: gene.value };
  }
  
  return {
    $domain: domain,
    $hash: seedHash,
    $lineage: { generation: 0, operation: 'primordial' },
    genes
  };
}

export function evaluateDomainFitness(domain: string, genes: Record<string, { value: any }>): number {
  const template = getDomainTemplate(domain);
  if (!template) return 0;
  return template.fitness(genes);
}