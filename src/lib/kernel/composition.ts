/**
 * Paradigm Absolute — Cross-Domain Composition Engine
 * 12 functor bridges + registry + BFS pathfinding.
 * Ported from Python composition.py.
 * 3 agent bridges: agent↔character, agent→narrative.
 */
import crypto from 'crypto';

interface Seed {
  $gst?: string;
  $domain?: string;
  $name?: string;
  $hash?: string;
  $lineage?: { generation?: number };
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
  seed.$fitness = { overall: 0.5 + Math.random() * 0.3 };
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
  const persona = gv(seed, 'persona', 'architect');
  const reasoning = gv(seed, 'reasoning_depth', 0.5);
  const creativity = gv(seed, 'creativity_bias', 0.4);
  const autonomy = gv(seed, 'autonomy', 0.3);
  const verbosity = gv(seed, 'verbosity', 0.5);

  // Map persona to narrative archetype
  const narrativeMap: Record<string, { genre: string; voice: string; structure: string }> = {
    architect: { genre: 'epic', voice: 'omniscient', structure: 'three_act' },
    artist: { genre: 'literary_fiction', voice: 'stream_of_consciousness', structure: 'nonlinear' },
    critic: { genre: 'mystery', voice: 'unreliable_narrator', structure: 'frame_narrative' },
    explorer: { genre: 'adventure', voice: 'first_person', structure: 'quest' },
    composer: { genre: 'ensemble', voice: 'multiple_pov', structure: 'braided' },
    analyst: { genre: 'thriller', voice: 'third_person_limited', structure: 'three_act' },
  };

  const traits = narrativeMap[persona] || narrativeMap.architect;
  const actCount = reasoning > 0.7 ? 5 : 3;

  return finalizeSeed({
    $gst: seed.$gst ?? '1.0', $domain: 'narrative',
    $name: (seed.$name ?? 'Agent') + ' — Story',
    $lineage: makeLineage(seed, 'agent_to_narrative'),
    genes: {
      genre: { type: 'categorical', value: traits.genre },
      voice: { type: 'categorical', value: traits.voice },
      structure: { type: 'categorical', value: traits.structure },
      acts: { type: 'scalar', value: actCount / 7 },
      complexity: { type: 'scalar', value: +reasoning.toFixed(3) },
      tension_curve: { type: 'temporal', value: {
        keyframes: [
          { time: 0, value: 0.2 },
          { time: 0.25, value: 0.4 + creativity * 0.3 },
          { time: 0.5, value: 0.3 },
          { time: 0.75, value: 0.7 + autonomy * 0.2 },
          { time: 1.0, value: creativity > 0.6 ? 0.4 : 0.9 },
        ],
      }},
      protagonist_agency: { type: 'scalar', value: +autonomy.toFixed(3) },
      descriptive_density: { type: 'scalar', value: +verbosity.toFixed(3) },
    },
    $metadata: { source_domain: 'agent', functor: 'agent_to_narrative' },
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
