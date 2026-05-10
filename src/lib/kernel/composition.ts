/**
 * Paradigm Absolute — Cross-Domain Composition Engine
 * 12 functor bridges + registry + BFS pathfinding.
 * Ported from Python composition.py.
 * 3 agent bridges: agent↔character, agent→narrative.
 */
import crypto from 'crypto';
import { rngFromHash } from './rng.js';

interface Seed {
  $gst?: string;
  $domain?: string;
  $name?: string;
  $hash?: string;
  $lineage?: { generation?: number; operation?: string; parents?: string[]; timestamp?: string };
  $fitness?: { overall?: number };
  $metadata?: Record<string, any>;
  genes?: Record<string, { type: string; value: any }>;
  [key: string]: any;
}

function makeLineage(source: Seed, functorName: string) {
  return {
    parents: [source.$hash ?? ''],
    operation: `compose:${functorName}`,
    generation: (source.$lineage?.generation ?? 0) + 1,
    timestamp: new Date().toISOString(),
  };
}

function finalizeSeed(seed: Seed): Seed {
  seed.$hash = crypto.createHash('sha256').update(JSON.stringify(seed.genes ?? {})).digest('hex');
  // G-04: deterministic fitness, seeded by post-compose hash. Math.random
  // would give different answers on each run, violating the determinism axiom.
  const fitnessRng = rngFromHash(seed.$hash + ':fitness');
  seed.$fitness = { overall: 0.5 + fitnessRng.nextF64() * 0.3 };
  return seed;
}

function gv(seed: Seed, name: string, fallback: any): any {
  return seed.genes?.[name]?.value ?? fallback;
}

// ─── 9 FUNCTOR BRIDGES ────────────────────────────────────────────────────────

function characterToSprite(seed: Seed): Seed {
  const palette = gv(seed, 'palette', [0.5, 0.3, 0.2]);
  const size = gv(seed, 'size', 0.75);
  return finalizeSeed({
    $gst: seed.$gst ?? '1.0', $domain: 'sprite',
    $name: (seed.$name ?? '') + ' — Sprite',
    $lineage: makeLineage(seed, 'character_to_sprite'),
    genes: {
      resolution: { type: 'scalar', value: 0.3 + size * 0.4 },
      paletteSize: { type: 'scalar', value: 0.5 },
      colors: { type: 'vector', value: Array.isArray(palette) ? palette : [0.5, 0.3, 0.2] },
      symmetry: { type: 'categorical', value: 'bilateral' },
      animation: { type: 'temporal', value: { keyframes: [{ time: 0, value: 0 }, { time: 0.5, value: 1 }, { time: 1, value: 0 }] } },
    },
    $metadata: { source_domain: 'character', functor: 'character_to_sprite' },
  });
}

function characterToMusic(seed: Seed): Seed {
  const strength = gv(seed, 'strength', 0.5);
  const agility = gv(seed, 'agility', 0.5);
  const archetype = gv(seed, 'archetype', 'warrior');
  const modeMap: Record<string, string> = { warrior: 'minor', mage: 'dorian', rogue: 'blues', paladin: 'major', ranger: 'pentatonic', dark_knight: 'minor', bard: 'mixolydian' };
  const instMap: Record<string, string[]> = { warrior: ['timpani', 'brass', 'low_strings'], mage: ['choir', 'harp', 'celeste'], rogue: ['pizzicato', 'woodwinds', 'harp'], paladin: ['organ', 'brass', 'choir'] };
  return finalizeSeed({
    $gst: seed.$gst ?? '1.0', $domain: 'music',
    $name: (seed.$name ?? '') + ' — Theme',
    $lineage: makeLineage(seed, 'character_to_music'),
    genes: {
      tempo: { type: 'scalar', value: 0.3 + strength * 0.5 },
      key: { type: 'categorical', value: 'C' },
      scale: { type: 'categorical', value: modeMap[archetype] ?? 'minor' },
      melody: { type: 'array', value: [60, 62, 64, 67, 69, 72, 67, 64] },
      timbre: { type: 'resonance', value: { fundamentals: [440], partials: [{ freq_ratio: 2, amplitude: 0.5 + agility * 0.3, phase: 0 }], damping: 0.1 } },
      instruments: { type: 'array', value: instMap[archetype] ?? ['full_orchestra'] },
    },
    $metadata: { source_domain: 'character', functor: 'character_to_music' },
  });
}

function characterToFullgame(seed: Seed): Seed {
  const archetype = gv(seed, 'archetype', 'warrior');
  const strength = gv(seed, 'strength', 0.5);
  const genreMap: Record<string, string> = { warrior: 'action', mage: 'rpg', rogue: 'stealth', paladin: 'adventure', ranger: 'exploration' };
  return finalizeSeed({
    $gst: seed.$gst ?? '1.0', $domain: 'fullgame',
    $name: (seed.$name ?? '') + ' — Game',
    $lineage: makeLineage(seed, 'character_to_fullgame'),
    genes: {
      genre: { type: 'categorical', value: genreMap[archetype] ?? 'action' },
      difficulty: { type: 'scalar', value: strength },
      levelCount: { type: 'scalar', value: 0.5 },
      mechanics: { type: 'array', value: ['combat', 'exploration', 'dialogue'] },
      protagonist: { type: 'struct', value: { name: seed.$name ?? '', archetype } },
    },
    $metadata: { source_domain: 'character', functor: 'character_to_fullgame' },
  });
}

function proceduralToFullgame(seed: Seed): Seed {
  const biome = gv(seed, 'biome', 'temperate');
  return finalizeSeed({
    $gst: seed.$gst ?? '1.0', $domain: 'fullgame',
    $name: (seed.$name ?? '') + ' — Open World',
    $lineage: makeLineage(seed, 'procedural_to_fullgame'),
    genes: {
      genre: { type: 'categorical', value: 'exploration' },
      worldBiome: { type: 'categorical', value: biome },
      levelCount: { type: 'scalar', value: 0.8 },
      mechanics: { type: 'array', value: ['exploration', 'crafting', 'survival'] },
    },
    $metadata: { source_domain: 'procedural', functor: 'procedural_to_fullgame' },
  });
}

function musicToEcosystem(seed: Seed): Seed {
  const tempo = gv(seed, 'tempo', 0.5);
  return finalizeSeed({
    $gst: seed.$gst ?? '1.0', $domain: 'ecosystem',
    $name: (seed.$name ?? '') + ' — Ecosystem',
    $lineage: makeLineage(seed, 'music_to_ecosystem'),
    genes: {
      speciesCount: { type: 'scalar', value: tempo },
      interactionRate: { type: 'scalar', value: tempo * 0.8 },
      stability: { type: 'scalar', value: 0.6 },
      environment: { type: 'categorical', value: 'forest' },
    },
    $metadata: { source_domain: 'music', functor: 'music_to_ecosystem' },
  });
}

function visual2dToAnimation(seed: Seed): Seed {
  return finalizeSeed({
    $gst: seed.$gst ?? '1.0', $domain: 'animation',
    $name: (seed.$name ?? '') + ' — Animated',
    $lineage: makeLineage(seed, 'visual2d_to_animation'),
    genes: {
      frameCount: { type: 'scalar', value: 0.5 },
      fps: { type: 'scalar', value: 0.5 },
      motionType: { type: 'categorical', value: 'skeletal' },
      loop: { type: 'categorical', value: 'loop' },
      easing: { type: 'expression', value: 'ease_in_out(t)' },
    },
    $metadata: { source_domain: 'visual2d', functor: 'visual2d_to_animation' },
  });
}

function narrativeToFullgame(seed: Seed): Seed {
  return finalizeSeed({
    $gst: seed.$gst ?? '1.0', $domain: 'fullgame',
    $name: (seed.$name ?? '') + ' — Narrative Game',
    $lineage: makeLineage(seed, 'narrative_to_fullgame'),
    genes: {
      genre: { type: 'categorical', value: 'adventure' },
      levelCount: { type: 'scalar', value: 0.6 },
      mechanics: { type: 'array', value: ['dialogue', 'choice', 'exploration'] },
      narrative: { type: 'symbolic', value: gv(seed, 'plot', 'hero_journey') },
    },
    $metadata: { source_domain: 'narrative', functor: 'narrative_to_fullgame' },
  });
}

function physicsToFullgame(seed: Seed): Seed {
  return finalizeSeed({
    $gst: seed.$gst ?? '1.0', $domain: 'fullgame',
    $name: (seed.$name ?? '') + ' — Physics Puzzle',
    $lineage: makeLineage(seed, 'physics_to_fullgame'),
    genes: {
      genre: { type: 'categorical', value: 'puzzle' },
      difficulty: { type: 'scalar', value: 0.5 },
      mechanics: { type: 'array', value: ['physics', 'construction', 'destruction'] },
    },
    $metadata: { source_domain: 'physics', functor: 'physics_to_fullgame' },
  });
}

function spriteToAnimation(seed: Seed): Seed {
  return finalizeSeed({
    $gst: seed.$gst ?? '1.0', $domain: 'animation',
    $name: (seed.$name ?? '') + ' — Spritesheet',
    $lineage: makeLineage(seed, 'sprite_to_animation'),
    genes: {
      frameCount: { type: 'scalar', value: 0.5 },
      fps: { type: 'scalar', value: 0.4 },
      motionType: { type: 'categorical', value: 'frame_by_frame' },
      loop: { type: 'categorical', value: 'loop' },
    },
    $metadata: { source_domain: 'sprite', functor: 'sprite_to_animation' },
  });
}

// ─── AGENT FUNCTOR BRIDGES ───────────────────────────────────────────────────

/**
 * agent → character: The agent's persona, creativity, and reasoning traits
 * become a character's archetype, intelligence, and personality.
 */
function agentToCharacter(seed: Seed): Seed {
  const persona = gv(seed, 'persona', 'architect');
  const creativity = gv(seed, 'creativity_bias', 0.4);
  const reasoning = gv(seed, 'reasoning_depth', 0.5);
  const exploration = gv(seed, 'exploration_rate', 0.2);
  const temperature = gv(seed, 'temperature', 0.3);

  // Map persona to archetype
  const archetypeMap: Record<string, string> = {
    architect: 'paladin', artist: 'bard', critic: 'mage',
    explorer: 'ranger', composer: 'bard', analyst: 'mage',
  };

  // Derive palette from behavioral genes: warm = creative, cool = analytical
  const warmth = (creativity + temperature) / 2;
  const r = 0.3 + warmth * 0.5;
  const g = 0.2 + reasoning * 0.4;
  const b = 0.3 + (1 - warmth) * 0.5;

  return finalizeSeed({
    $gst: seed.$gst ?? '1.0', $domain: 'character',
    $name: (seed.$name ?? 'Agent') + ' — Embodied',
    $lineage: makeLineage(seed, 'agent_to_character'),
    genes: {
      archetype: { type: 'categorical', value: archetypeMap[persona] ?? 'mage' },
      strength: { type: 'scalar', value: 0.3 + exploration * 0.5 },
      agility: { type: 'scalar', value: 0.3 + temperature * 0.4 },
      intelligence: { type: 'scalar', value: 0.4 + reasoning * 0.5 },
      size: { type: 'scalar', value: 0.6 + reasoning * 0.3 },
      palette: { type: 'vector', value: [+r.toFixed(3), +g.toFixed(3), +b.toFixed(3)] },
      personality: { type: 'categorical', value: persona },
    },
    $metadata: { source_domain: 'agent', functor: 'agent_to_character' },
  });
}

/**
 * character → agent: A character's traits become an agent's behavioral genes.
 * This creates an agent that "thinks like" the character.
 */
function characterToAgent(seed: Seed): Seed {
  const archetype = gv(seed, 'archetype', 'warrior');
  const strength = gv(seed, 'strength', 0.5);
  const agility = gv(seed, 'agility', 0.5);
  const intelligence = gv(seed, 'intelligence', 0.5);
  const palette = gv(seed, 'palette', [0.5, 0.5, 0.5]);

  // Map archetype to persona
  const personaMap: Record<string, string> = {
    warrior: 'architect', mage: 'analyst', rogue: 'explorer',
    paladin: 'architect', ranger: 'explorer', bard: 'artist',
    dark_knight: 'critic',
  };

  // Derive creativity from palette warmth (red channel)
  const warmth = Array.isArray(palette) ? (palette[0] ?? 0.5) : 0.5;

  return finalizeSeed({
    $gst: seed.$gst ?? '1.0', $domain: 'agent',
    $name: (seed.$name ?? 'Character') + ' — Agent',
    $lineage: makeLineage(seed, 'character_to_agent'),
    genes: {
      persona: { type: 'categorical', value: personaMap[archetype] ?? 'architect' },
      name: { type: 'categorical', value: seed.$name ?? 'Unnamed' },
      temperature: { type: 'scalar', value: +(agility * 0.7).toFixed(3) },
      reasoning_depth: { type: 'scalar', value: +(0.3 + intelligence * 0.6).toFixed(3) },
      exploration_rate: { type: 'scalar', value: +(agility * 0.5).toFixed(3) },
      confidence_threshold: { type: 'scalar', value: +(0.4 + strength * 0.4).toFixed(3) },
      verbosity: { type: 'scalar', value: 0.5 },
      autonomy: { type: 'scalar', value: +(strength * 0.6).toFixed(3) },
      creativity_bias: { type: 'scalar', value: +warmth.toFixed(3) },
      max_reasoning_steps: { type: 'scalar', value: +(0.3 + intelligence * 0.5).toFixed(3) },
      context_window: { type: 'scalar', value: +(0.3 + intelligence * 0.4).toFixed(3) },
      tool_permissions: { type: 'struct', value: { web_browse: false, file_write: false, fork_agent: false, delegate: false } },
    },
    $metadata: { source_domain: 'character', functor: 'character_to_agent' },
  });
}

/**
 * agent → narrative: The agent's persona, reasoning style, and domain focus
 * become a story structure with matching themes and narrative voice.
 */
function agentToNarrative(seed: Seed): Seed {
  const reasoning = gv(seed, 'reasoning_depth', 0.5);
  const creativity = gv(seed, 'creativity_bias', 0.4);
  return finalizeSeed({
    $gst: seed.$gst ?? '1.0', $domain: 'narrative',
    $name: (seed.$name ?? 'Agent') + ' — Story',
    $lineage: makeLineage(seed, 'agent_to_narrative'),
    genes: {
      plot: { type: 'symbolic', value: reasoning > 0.6 ? 'mystery' : 'adventure' },
      complexity: { type: 'scalar', value: reasoning },
      creativity: { type: 'scalar', value: creativity },
    },
    $metadata: { source_domain: 'agent', functor: 'agent_to_narrative' },
  });
}

// ─── ADDITIONAL FUNCTOR IMPLEMENTATIONS ───────────────────────────────────────

function characterToFashion(seed: Seed): Seed {
  const archetype = gv(seed, 'archetype', 'warrior');
  const palette = gv(seed, 'palette', [0.5, 0.3, 0.2]);
  const styleMap: Record<string, string> = { 
    warrior: 'armor', mage: 'robes', rogue: 'leather', paladin: 'plate', ranger: 'leather' 
  };
  return finalizeSeed({
    $gst: seed.$gst ?? '1.0', $domain: 'fashion',
    $name: (seed.$name ?? '') + ' — Garments',
    $lineage: makeLineage(seed, 'character_to_fashion'),
    genes: {
      garmentType: { type: 'categorical', value: styleMap[archetype] ?? 'tunic' },
      colors: { type: 'vector', value: Array.isArray(palette) ? palette : [0.5, 0.3, 0.2] },
      complexity: { type: 'scalar', value: 0.5 },
    },
    $metadata: { source_domain: 'character', functor: 'character_to_fashion' },
  });
}

function characterToHairstyle(seed: Seed): Seed {
  const archetype = gv(seed, 'archetype', 'warrior');
  const styleMap: Record<string, string> = { 
    warrior: 'short', mage: 'long', rogue: 'ponytail', paladin: 'short', ranger: 'messy' 
  };
  return finalizeSeed({
    $gst: seed.$gst ?? '1.0', $domain: 'character',
    $name: (seed.$name ?? '') + ' — Hair',
    $lineage: makeLineage(seed, 'character_to_hairstyle'),
    genes: {
      hairstyle: { type: 'categorical', value: styleMap[archetype] ?? 'short' },
      length: { type: 'scalar', value: archetype === 'mage' ? 0.8 : 0.3 },
    },
    $metadata: { source_domain: 'character', functor: 'character_to_hairstyle' },
  });
}

function characterToArchitecture(seed: Seed): Seed {
  const strength = gv(seed, 'strength', 0.5);
  const archetype = gv(seed, 'archetype', 'warrior');
  const styleMap: Record<string, string> = { 
    warrior: 'castle', mage: 'tower', rogue: 'house', paladin: 'temple', ranger: 'cottage' 
  };
  return finalizeSeed({
    $gst: seed.$gst ?? '1.0', $domain: 'architecture',
    $name: (seed.$name ?? '') + ' — Structure',
    $lineage: makeLineage(seed, 'character_to_architecture'),
    genes: {
      buildingType: { type: 'categorical', value: styleMap[archetype] ?? 'house' },
      scale: { type: 'scalar', value: 0.3 + strength * 0.6 },
      floors: { type: 'scalar', value: 1 + Math.floor(strength * 5) },
    },
    $metadata: { source_domain: 'character', functor: 'character_to_architecture' },
  });
}

function characterToVehicle(seed: Seed): Seed {
  const archetype = gv(seed, 'archetype', 'warrior');
  const agility = gv(seed, 'agility', 0.5);
  const typeMap: Record<string, string> = { 
    warrior: 'warhorse', mage: 'floating_disc', rogue: 'shadow_mount', paladin: 'chariot', ranger: 'wagon' 
  };
  return finalizeSeed({
    $gst: seed.$gst ?? '1.0', $domain: 'vehicle',
    $name: (seed.$name ?? '') + ' — Transport',
    $lineage: makeLineage(seed, 'character_to_vehicle'),
    genes: {
      vehicleType: { type: 'categorical', value: typeMap[archetype] ?? 'horse' },
      speed: { type: 'scalar', value: agility },
      capacity: { type: 'scalar', value: 0.5 },
    },
    $metadata: { source_domain: 'character', functor: 'character_to_vehicle' },
  });
}

function characterToFood(seed: Seed): Seed {
  const archetype = gv(seed, 'archetype', 'warrior');
  const cuisineMap: Record<string, string> = { 
    warrior: 'barbecue', mage: 'elixir', rogue: 'trail_cook', paladin: 'feast', ranger: 'foraging' 
  };
  return finalizeSeed({
    $gst: seed.$gst ?? '1.0', $domain: 'food',
    $name: (seed.$name ?? '') + ' — Cuisine',
    $lineage: makeLineage(seed, 'character_to_food'),
    genes: {
      cuisine: { type: 'categorical', value: cuisineMap[archetype] ?? 'simple' },
      complexity: { type: 'scalar', value: 0.5 },
    },
    $metadata: { source_domain: 'character', functor: 'character_to_food' },
  });
}

function characterToRobotics(seed: Seed): Seed {
  const intelligence = gv(seed, 'intelligence', 0.5);
  const archetype = gv(seed, 'archetype', 'warrior');
  const formMap: Record<string, string> = { 
    warrior: 'mech', mage: 'golem', rogue: 'drone', paladin: 'automaton', ranger: 'helper' 
  };
  return finalizeSeed({
    $gst: seed.$gst ?? '1.0', $domain: 'robotics',
    $name: (seed.$name ?? '') + ' — Robot',
    $lineage: makeLineage(seed, 'character_to_robotics'),
    genes: {
      formFactor: { type: 'categorical', value: formMap[archetype] ?? 'humanoid' },
      aiLevel: { type: 'scalar', value: intelligence },
      strength: { type: 'scalar', value: 0.5 },
    },
    $metadata: { source_domain: 'character', functor: 'character_to_robotics' },
  });
}

function musicToChoreography(seed: Seed): Seed {
  const tempo = gv(seed, 'tempo', 0.5);
  const scale = gv(seed, 'scale', 'minor');
  const energy = tempo > 0.6 ? 'high' : tempo > 0.3 ? 'medium' : 'low';
  return finalizeSeed({
    $gst: seed.$gst ?? '1.0', $domain: 'choreography',
    $name: (seed.$name ?? '') + ' — Dance',
    $lineage: makeLineage(seed, 'music_to_choreography'),
    genes: {
      danceStyle: { type: 'categorical', value: scale === 'major' ? 'ballet' : 'contemporary' },
      energy: { type: 'categorical', value: energy },
      complexity: { type: 'scalar', value: tempo },
      duration: { type: 'scalar', value: 0.5 },
    },
    $metadata: { source_domain: 'music', functor: 'music_to_choreography' },
  });
}

function musicToVisualization(seed: Seed): Seed {
  const tempo = gv(seed, 'tempo', 0.5);
  const palette = gv(seed, 'palette', [0.5, 0.5, 0.5]);
  return finalizeSeed({
    $gst: seed.$gst ?? '1.0', $domain: 'visual2d',
    $name: (seed.$name ?? '') + ' — Visual',
    $lineage: makeLineage(seed, 'music_to_visualization'),
    genes: {
      style: { type: 'categorical', value: tempo > 0.6 ? 'neon' : 'ethereal' },
      colors: { type: 'vector', value: Array.isArray(palette) ? palette : [0.5, 0.3, 0.2] },
      motion: { type: 'temporal', value: { keyframes: [{ time: 0, value: 0 }, { time: 0.5, value: 1 }, { time: 1, value: 0 }] } },
    },
    $metadata: { source_domain: 'music', functor: 'music_to_visualization' },
  });
}

function musicToGameLevel(seed: Seed): Seed {
  const tempo = gv(seed, 'tempo', 0.5);
  const genre = tempo > 0.6 ? 'action' : tempo > 0.3 ? 'puzzle' : 'exploration';
  return finalizeSeed({
    $gst: seed.$gst ?? '1.0', $domain: 'game',
    $name: (seed.$name ?? '') + ' — Level',
    $lineage: makeLineage(seed, 'music_to_game_level'),
    genes: {
      genre: { type: 'categorical', value: genre },
      difficulty: { type: 'scalar', value: tempo },
    },
    $metadata: { source_domain: 'music', functor: 'music_to_game_level' },
  });
}

function musicToNarrative(seed: Seed): Seed {
  const scale = gv(seed, 'scale', 'minor');
  const mood = scale === 'major' ? 'adventure' : 'mystery';
  return finalizeSeed({
    $gst: seed.$gst ?? '1.0', $domain: 'narrative',
    $name: (seed.$name ?? '') + ' — Tale',
    $lineage: makeLineage(seed, 'music_to_narrative'),
    genes: {
      plot: { type: 'symbolic', value: mood },
      tone: { type: 'categorical', value: scale },
    },
    $metadata: { source_domain: 'music', functor: 'music_to_narrative' },
  });
}

function architectureToInterior(seed: Seed): Seed {
  const scale = gv(seed, 'scale', 0.5);
  return finalizeSeed({
    $gst: seed.$gst ?? '1.0', $domain: 'interior_design',
    $name: (seed.$name ?? '') + ' — Interior',
    $lineage: makeLineage(seed, 'architecture_to_interior'),
    genes: {
      roomCount: { type: 'scalar', value: 1 + Math.floor(scale * 5) },
      style: { type: 'categorical', value: 'modern' },
    },
    $metadata: { source_domain: 'architecture', functor: 'architecture_to_interior' },
  });
}

function architectureToCity(seed: Seed): Seed {
  const scale = gv(seed, 'scale', 0.5);
  return finalizeSeed({
    $gst: seed.$gst ?? '1.0', $domain: 'city',
    $name: (seed.$name ?? '') + ' — City',
    $lineage: makeLineage(seed, 'architecture_to_city'),
    genes: {
      population: { type: 'scalar', value: scale },
      districtCount: { type: 'scalar', value: 3 + Math.floor(scale * 7) },
    },
    $metadata: { source_domain: 'architecture', functor: 'architecture_to_city' },
  });
}

function architectureToFurniture(seed: Seed): Seed {
  return finalizeSeed({
    $gst: seed.$gst ?? '1.0', $domain: 'furniture',
    $name: (seed.$name ?? '') + ' — Furnishings',
    $lineage: makeLineage(seed, 'architecture_to_furniture'),
    genes: {
      style: { type: 'categorical', value: 'classical' },
      pieces: { type: 'array', value: ['chair', 'table', 'shelf'] },
    },
    $metadata: { source_domain: 'architecture', functor: 'architecture_to_furniture' },
  });
}

function vehicleToCircuit(seed: Seed): Seed {
  const speed = gv(seed, 'speed', 0.5);
  return finalizeSeed({
    $gst: seed.$gst ?? '1.0', $domain: 'circuit',
    $name: (seed.$name ?? '') + ' — Circuit',
    $lineage: makeLineage(seed, 'vehicle_to_circuit'),
    genes: {
      complexity: { type: 'scalar', value: speed },
      componentCount: { type: 'scalar', value: 10 + Math.floor(speed * 90) },
    },
    $metadata: { source_domain: 'vehicle', functor: 'vehicle_to_circuit' },
  });
}

function vehicleToNarrative(seed: Seed): Seed {
  const vehicleType = gv(seed, 'vehicleType', 'car');
  return finalizeSeed({
    $gst: seed.$gst ?? '1.0', $domain: 'narrative',
    $name: (seed.$name ?? '') + ' — Journey',
    $lineage: makeLineage(seed, 'vehicle_to_narrative'),
    genes: {
      plot: { type: 'symbolic', value: 'road_trip' },
      setting: { type: 'categorical', value: vehicleType === 'ship' ? 'sea' : 'land' },
    },
    $metadata: { source_domain: 'vehicle', functor: 'vehicle_to_narrative' },
  });
}

function gameToMovie(seed: Seed): Seed {
  const genre = gv(seed, 'genre', 'action');
  return finalizeSeed({
    $gst: seed.$gst ?? '1.0', $domain: 'film',
    $name: (seed.$name ?? '') + ' — Film',
    $lineage: makeLineage(seed, 'game_to_movie'),
    genes: {
      genre: { type: 'categorical', value: genre },
      duration: { type: 'scalar', value: 0.7 },
    },
    $metadata: { source_domain: 'game', functor: 'game_to_movie' },
  });
}

function gameToTutorial(seed: Seed): Seed {
  const difficulty = gv(seed, 'difficulty', 0.5);
  return finalizeSeed({
    $gst: seed.$gst ?? '1.0', $domain: 'education',
    $name: (seed.$name ?? '') + ' — Tutorial',
    $lineage: makeLineage(seed, 'game_to_tutorial'),
    genes: {
      subject: { type: 'categorical', value: 'game_mechanics' },
      difficulty: { type: 'scalar', value: difficulty },
    },
    $metadata: { source_domain: 'game', functor: 'game_to_tutorial' },
  });
}

function gameToDocumentation(seed: Seed): Seed {
  return finalizeSeed({
    $gst: seed.$gst ?? '1.0', $domain: 'documentation',
    $name: (seed.$name ?? '') + ' — Docs',
    $lineage: makeLineage(seed, 'game_to_documentation'),
    genes: {
      format: { type: 'categorical', value: 'markdown' },
      sections: { type: 'array', value: ['overview', 'controls', 'strategy'] },
    },
    $metadata: { source_domain: 'game', functor: 'game_to_documentation' },
  });
}

function narrativeToVisualNovel(seed: Seed): Seed {
  const plot = gv(seed, 'plot', 'adventure');
  return finalizeSeed({
    $gst: seed.$gst ?? '1.0', $domain: 'visual_novel',
    $name: (seed.$name ?? '') + ' — VN',
    $lineage: makeLineage(seed, 'narrative_to_visual_novel'),
    genes: {
      style: { type: 'categorical', value: 'anime' },
      routes: { type: 'scalar', value: 0.3 },
    },
    $metadata: { source_domain: 'narrative', functor: 'narrative_to_visual_novel' },
  });
}

function narrativeToComic(seed: Seed): Seed {
  const plot = gv(seed, 'plot', 'adventure');
  return finalizeSeed({
    $gst: seed.$gst ?? '1.0', $domain: 'comic',
    $name: (seed.$name ?? '') + ' — Comic',
    $lineage: makeLineage(seed, 'narrative_to_comic'),
    genes: {
      artStyle: { type: 'categorical', value: 'western' },
      panelCount: { type: 'scalar', value: 0.5 },
    },
    $metadata: { source_domain: 'narrative', functor: 'narrative_to_comic' },
  });
}

function narrativeToPodcast(seed: Seed): Seed {
  return finalizeSeed({
    $gst: seed.$gst ?? '1.0', $domain: 'podcast',
    $name: (seed.$name ?? '') + ' — Audio',
    $lineage: makeLineage(seed, 'narrative_to_podcast'),
    genes: {
      format: { type: 'categorical', value: 'narrative' },
      duration: { type: 'scalar', value: 0.5 },
    },
    $metadata: { source_domain: 'narrative', functor: 'narrative_to_podcast' },
  });
}

function visual2dToUI(seed: Seed): Seed {
  const style = gv(seed, 'style', 'minimal');
  return finalizeSeed({
    $gst: seed.$gst ?? '1.0', $domain: 'ui',
    $name: (seed.$name ?? '') + ' — Interface',
    $lineage: makeLineage(seed, 'visual2d_to_ui'),
    genes: {
      theme: { type: 'categorical', value: style === 'neon' ? 'dark' : 'light' },
      componentCount: { type: 'scalar', value: 5 },
    },
    $metadata: { source_domain: 'visual2d', functor: 'visual2d_to_ui' },
  });
}

function visual2dToTypography(seed: Seed): Seed {
  return finalizeSeed({
    $gst: seed.$gst ?? '1.0', $domain: 'typography',
    $name: (seed.$name ?? '') + ' — Type',
    $lineage: makeLineage(seed, 'visual2d_to_typography'),
    genes: {
      fontStyle: { type: 'categorical', value: 'serif' },
      weight: { type: 'scalar', value: 0.5 },
    },
    $metadata: { source_domain: 'visual2d', functor: 'visual2d_to_typography' },
  });
}

function visual2dToFashion(seed: Seed): Seed {
  const colors = gv(seed, 'colors', [0.5, 0.3, 0.2]);
  return finalizeSeed({
    $gst: seed.$gst ?? '1.0', $domain: 'fashion',
    $name: (seed.$name ?? '') + ' — Design',
    $lineage: makeLineage(seed, 'visual2d_to_fashion'),
    genes: {
      colors: { type: 'vector', value: Array.isArray(colors) ? colors : [0.5, 0.3, 0.2] },
      pattern: { type: 'categorical', value: 'solid' },
    },
    $metadata: { source_domain: 'visual2d', functor: 'visual2d_to_fashion' },
  });
}

function particleToShader(seed: Seed): Seed {
  return finalizeSeed({
    $gst: seed.$gst ?? '1.0', $domain: 'shader',
    $name: (seed.$name ?? '') + ' — Shader',
    $lineage: makeLineage(seed, 'particle_to_shader'),
    genes: {
      language: { type: 'categorical', value: 'glsl' },
      effect: { type: 'categorical', value: 'glow' },
    },
    $metadata: { source_domain: 'particle', functor: 'particle_to_shader' },
  });
}

function particleToPhysics(seed: Seed): Seed {
  return finalizeSeed({
    $gst: seed.$gst ?? '1.0', $domain: 'physics',
    $name: (seed.$name ?? '') + ' — Simulation',
    $lineage: makeLineage(seed, 'particle_to_physics'),
    genes: {
      simulationType: { type: 'categorical', value: 'fluid' },
      accuracy: { type: 'scalar', value: 0.7 },
    },
    $metadata: { source_domain: 'particle', functor: 'particle_to_physics' },
  });
}

function ecosystemToAlife(seed: Seed): Seed {
  const speciesCount = gv(seed, 'speciesCount', 0.5);
  return finalizeSeed({
    $gst: seed.$gst ?? '1.0', $domain: 'alife',
    $name: (seed.$name ?? '') + ' — ALife',
    $lineage: makeLineage(seed, 'ecosystem_to_alife'),
    genes: {
      entityCount: { type: 'scalar', value: speciesCount * 100 },
      behaviorComplexity: { type: 'scalar', value: speciesCount },
    },
    $metadata: { source_domain: 'ecosystem', functor: 'ecosystem_to_alife' },
  });
}

function ecosystemToClimate(seed: Seed): Seed {
  const stability = gv(seed, 'stability', 0.5);
  return finalizeSeed({
    $gst: seed.$gst ?? '1.0', $domain: 'climate',
    $name: (seed.$name ?? '') + ' — Weather',
    $lineage: makeLineage(seed, 'ecosystem_to_climate'),
    genes: {
      variability: { type: 'scalar', value: 1 - stability },
      seasonality: { type: 'scalar', value: 0.5 },
    },
    $metadata: { source_domain: 'ecosystem', functor: 'ecosystem_to_climate' },
  });
}

function foodToMusic(seed: Seed): Seed {
  const cuisine = gv(seed, 'cuisine', 'simple');
  const tempo = cuisine === 'barbecue' ? 0.7 : cuisine === 'elixir' ? 0.3 : 0.5;
  return finalizeSeed({
    $gst: seed.$gst ?? '1.0', $domain: 'music',
    $name: (seed.$name ?? '') + ' — Mood',
    $lineage: makeLineage(seed, 'food_to_music'),
    genes: {
      tempo: { type: 'scalar', value: tempo },
      scale: { type: 'categorical', value: 'major' },
    },
    $metadata: { source_domain: 'food', functor: 'food_to_music' },
  });
}

function foodToColorPalette(seed: Seed): Seed {
  const cuisine = gv(seed, 'cuisine', 'simple');
  const colorMap: Record<string, number[]> = {
    barbecue: [0.8, 0.3, 0.1], elixir: [0.2, 0.8, 0.3], 
    trail_cook: [0.6, 0.5, 0.3], feast: [0.9, 0.7, 0.4], foraging: [0.3, 0.7, 0.2]
  };
  return finalizeSeed({
    $gst: seed.$gst ?? '1.0', $domain: 'visual2d',
    $name: (seed.$name ?? '') + ' — Palette',
    $lineage: makeLineage(seed, 'food_to_color_palette'),
    genes: {
      colors: { type: 'vector', value: colorMap[cuisine] ?? [0.5, 0.5, 0.5] },
    },
    $metadata: { source_domain: 'food', functor: 'food_to_color_palette' },
  });
}

function shaderToVisual2d(seed: Seed): Seed {
  return finalizeSeed({
    $gst: seed.$gst ?? '1.0', $domain: 'visual2d',
    $name: (seed.$name ?? '') + ' — Render',
    $lineage: makeLineage(seed, 'shader_to_visual2d'),
    genes: {
      style: { type: 'categorical', value: 'abstract' },
    },
    $metadata: { source_domain: 'shader', functor: 'shader_to_visual2d' },
  });
}

function shaderToParticle(seed: Seed): Seed {
  return finalizeSeed({
    $gst: seed.$gst ?? '1.0', $domain: 'particle',
    $name: (seed.$name ?? '') + ' — FX',
    $lineage: makeLineage(seed, 'shader_to_particle'),
    genes: {
      particleCount: { type: 'scalar', value: 1000 },
      behavior: { type: 'categorical', value: 'emitter' },
    },
    $metadata: { source_domain: 'shader', functor: 'shader_to_particle' },
  });
}

function physicsToSimulation(seed: Seed): Seed {
  return finalizeSeed({
    $gst: seed.$gst ?? '1.0', $domain: 'simulation',
    $name: (seed.$name ?? '') + ' — Sim',
    $lineage: makeLineage(seed, 'physics_to_simulation'),
    genes: {
      timestep: { type: 'scalar', value: 0.01 },
      duration: { type: 'scalar', value: 10 },
    },
    $metadata: { source_domain: 'physics', functor: 'physics_to_simulation' },
  });
}

function physicsToGame(seed: Seed): Seed {
  return finalizeSeed({
    $gst: seed.$gst ?? '1.0', $domain: 'game',
    $name: (seed.$name ?? '') + ' — Physics Game',
    $lineage: makeLineage(seed, 'physics_to_game'),
    genes: {
      genre: { type: 'categorical', value: 'puzzle' },
      mechanics: { type: 'array', value: ['physics', 'gravity'] },
    },
    $metadata: { source_domain: 'physics', functor: 'physics_to_game' },
  });
}

// ─── FUNCTOR REGISTRY ─────────────────────────────────────────────────────────

interface FunctorEntry {
  fn: (seed: Seed) => Seed;
  name: string;
}

const FUNCTOR_REGISTRY: Map<string, FunctorEntry> = new Map([
  // Original 9 bridges
  ['character->sprite', { fn: characterToSprite, name: 'character_to_sprite' }],
  ['character->music', { fn: characterToMusic, name: 'character_to_music' }],
  ['character->fullgame', { fn: characterToFullgame, name: 'character_to_fullgame' }],
  ['procedural->fullgame', { fn: proceduralToFullgame, name: 'procedural_to_fullgame' }],
  ['music->ecosystem', { fn: musicToEcosystem, name: 'music_to_ecosystem' }],
  ['visual2d->animation', { fn: visual2dToAnimation, name: 'visual2d_to_animation' }],
  ['narrative->fullgame', { fn: narrativeToFullgame, name: 'narrative_to_fullgame' }],
  ['physics->fullgame', { fn: physicsToFullgame, name: 'physics_to_fullgame' }],
  ['sprite->animation', { fn: spriteToAnimation, name: 'sprite_to_animation' }],
  // 3 new agent bridges
  ['agent->character', { fn: agentToCharacter, name: 'agent_to_character' }],
  ['character->agent', { fn: characterToAgent, name: 'character_to_agent' }],
  ['agent->narrative', { fn: agentToNarrative, name: 'agent_to_narrative' }],
  
  // ─── ADDITIONAL 35 FUNCTORS FOR 50+ TOTAL ─────────────────────────────────────
  
  // Character → Extended Domains
  ['character->fashion', { fn: characterToFashion, name: 'character_to_fashion' }],
  ['character->hairstyle', { fn: characterToHairstyle, name: 'character_to_hairstyle' }],
  ['character->architecture', { fn: characterToArchitecture, name: 'character_to_architecture' }],
  ['character->vehicle', { fn: characterToVehicle, name: 'character_to_vehicle' }],
  ['character->food', { fn: characterToFood, name: 'character_to_food' }],
  ['character->robotics', { fn: characterToRobotics, name: 'character_to_robotics' }],
  
  // Music → Extended Domains  
  ['music->choreography', { fn: musicToChoreography, name: 'music_to_choreography' }],
  ['music->visualization', { fn: musicToVisualization, name: 'music_to_visualization' }],
  ['music->game_level', { fn: musicToGameLevel, name: 'music_to_game_level' }],
  ['music->narrative', { fn: musicToNarrative, name: 'music_to_narrative' }],
  
  // Architecture → Extended
  ['architecture->interior', { fn: architectureToInterior, name: 'architecture_to_interior' }],
  ['architecture->city', { fn: architectureToCity, name: 'architecture_to_city' }],
  ['architecture->furniture', { fn: architectureToFurniture, name: 'architecture_to_furniture' }],
  
  // Vehicle → Extended
  ['vehicle->circuit', { fn: vehicleToCircuit, name: 'vehicle_to_circuit' }],
  ['vehicle->narrative', { fn: vehicleToNarrative, name: 'vehicle_to_narrative' }],
  
  // Game → Extended
  ['game->movie', { fn: gameToMovie, name: 'game_to_movie' }],
  ['game->tutorial', { fn: gameToTutorial, name: 'game_to_tutorial' }],
  ['game->documentation', { fn: gameToDocumentation, name: 'game_to_documentation' }],
  
  // Narrative → Extended
  ['narrative->visual_novel', { fn: narrativeToVisualNovel, name: 'narrative_to_visual_novel' }],
  ['narrative->comic', { fn: narrativeToComic, name: 'narrative_to_comic' }],
  ['narrative->podcast', { fn: narrativeToPodcast, name: 'narrative_to_podcast' }],
  
  // Visual2D → Extended
  ['visual2d->ui', { fn: visual2dToUI, name: 'visual2d_to_ui' }],
  ['visual2d->typography', { fn: visual2dToTypography, name: 'visual2d_to_typography' }],
  ['visual2d->fashion', { fn: visual2dToFashion, name: 'visual2d_to_fashion' }],
  
  // Particle → Extended
  ['particle->shader', { fn: particleToShader, name: 'particle_to_shader' }],
  ['particle->physics', { fn: particleToPhysics, name: 'particle_to_physics' }],
  
  // Ecosystem → Extended
  ['ecosystem->alife', { fn: ecosystemToAlife, name: 'ecosystem_to_alife' }],
  ['ecosystem->climate', { fn: ecosystemToClimate, name: 'ecosystem_to_climate' }],
  
  // Food → Extended
  ['food->music', { fn: foodToMusic, name: 'food_to_music' }],
  ['food->color_palette', { fn: foodToColorPalette, name: 'food_to_color_palette' }],
  
  // Shader → Extended
  ['shader->visual2d', { fn: shaderToVisual2d, name: 'shader_to_visual2d' }],
  ['shader->particle', { fn: shaderToParticle, name: 'shader_to_particle' }],
  
  // Physics → Extended
  ['physics->simulation', { fn: physicsToSimulation, name: 'physics_to_simulation' }],
  ['physics->game', { fn: physicsToGame, name: 'physics_to_game' }],
]);

export function getFunctor(source: string, target: string): FunctorEntry | undefined {
  return FUNCTOR_REGISTRY.get(`${source}->${target}`);
}

export function findCompositionPath(source: string, target: string): { src: string; tgt: string; functor: string }[] | null {
  if (source === target) return [];
  const visited = new Set<string>([source]);
  const queue: [string, { src: string; tgt: string; functor: string }[]][] = [[source, []]];

  while (queue.length > 0) {
    const [node, path] = queue.shift()!;
    // Find all outgoing edges from this node
    const outgoing: [string, string, FunctorEntry][] = [];
    for (const [key, entry] of FUNCTOR_REGISTRY) {
      const [src, tgt] = key.split('->');
      if (src === node) outgoing.push([src, tgt, entry]);
    }
    outgoing.sort((a, b) => a[2].name.localeCompare(b[2].name));

    for (const [src, tgt, entry] of outgoing) {
      if (tgt === target) {
        return [...path, { src, tgt, functor: entry.name }];
      }
      if (!visited.has(tgt)) {
        visited.add(tgt);
        queue.push([tgt, [...path, { src, tgt, functor: entry.name }]]);
      }
    }
  }
  return null;
}

export function composeSeed(seed: Seed, targetDomain: string): Seed | null {
  const source = seed.$domain ?? '';
  if (source === targetDomain) return seed;

  const direct = getFunctor(source, targetDomain);
  if (direct) return direct.fn(seed);

  const path = findCompositionPath(source, targetDomain);
  if (!path) return null;

  let current = seed;
  for (const step of path) {
    const functor = getFunctor(step.src, step.tgt);
    if (!functor) return null;
    current = functor.fn(current);
  }
  return current;
}

export function getCompositionGraph() {
  const nodes = new Set<string>();
  const edges: { source: string; target: string; functor: string }[] = [];
  for (const [key, entry] of FUNCTOR_REGISTRY) {
    const [src, tgt] = key.split('->');
    nodes.add(src);
    nodes.add(tgt);
    edges.push({ source: src, target: tgt, functor: entry.name });
  }
  return { nodes: [...nodes].sort(), edges };
}
