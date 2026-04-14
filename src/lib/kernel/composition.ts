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
  // Deterministic fitness from hash — no Math.random()
  const hashBytes = Buffer.from(seed.$hash, 'hex');
  const deterministicValue = (hashBytes[0] + hashBytes[1] * 256) / 65535;
  seed.$fitness = { overall: +(0.4 + deterministicValue * 0.4).toFixed(4) };
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

// ─── 18 EXPANSION BRIDGES ─────────────────────────────────────────────────────

function musicToAnimation(seed: Seed): Seed {
  const tempo = gv(seed, 'tempo', 0.5); const t = typeof tempo === 'number' ? tempo : 0.5;
  return finalizeSeed({ id: crypto.randomUUID(), $domain: 'animation', $name: `${seed.$name ?? 'Music'}_animated`, $lineage: makeLineage(seed, 'music_to_animation'), genes: { frameCount: { type: 'scalar', value: 0.3 + t * 0.5 }, fps: { type: 'scalar', value: 0.3 + t * 0.4 }, motionType: { type: 'categorical', value: 'rhythmic' }, amplitude: { type: 'scalar', value: t * 0.8 }, easing: { type: 'categorical', value: t > 0.6 ? 'bounce' : 'ease_in_out' } } });
}

function narrativeToCharacter(seed: Seed): Seed {
  const tone = gv(seed, 'tone', 'epic');
  const map: Record<string, string> = { epic: 'warrior', dark: 'rogue', comic: 'bard', mystery: 'mage', literary: 'sage' };
  return finalizeSeed({ id: crypto.randomUUID(), $domain: 'character', $name: `${seed.$name ?? 'Story'}_protagonist`, $lineage: makeLineage(seed, 'narrative_to_character'), genes: { archetype: { type: 'categorical', value: map[tone] || 'warrior' }, strength: { type: 'scalar', value: tone === 'epic' ? 0.8 : 0.5 }, agility: { type: 'scalar', value: tone === 'dark' ? 0.8 : 0.5 }, palette: { type: 'vector', value: tone === 'dark' ? [0.2, 0.1, 0.3] : [0.7, 0.5, 0.3] }, personality: { type: 'categorical', value: tone === 'comic' ? 'witty' : 'determined' } } });
}

function ecosystemToProcedural(seed: Seed): Seed {
  const env = gv(seed, 'environment', 'forest');
  const biomeMap: Record<string, string> = { forest: 'temperate', ocean: 'coastal', desert: 'arid', tundra: 'arctic', jungle: 'tropical' };
  const stability = gv(seed, 'stability', 0.6);
  return finalizeSeed({ id: crypto.randomUUID(), $domain: 'procedural', $name: `${seed.$name ?? 'Eco'}_terrain`, $lineage: makeLineage(seed, 'ecosystem_to_procedural'), genes: { biome: { type: 'categorical', value: biomeMap[env] || 'temperate' }, octaves: { type: 'scalar', value: 0.4 + (typeof stability === 'number' ? stability : 0.5) * 0.4 }, persistence: { type: 'scalar', value: 0.4 + (typeof stability === 'number' ? (1 - stability) : 0.5) * 0.3 }, scale: { type: 'scalar', value: 0.6 } } });
}

function geometry3dToPhysics(seed: Seed): Seed {
  const material = gv(seed, 'material', 'metal');
  const d: Record<string, number> = { metal: 0.8, wood: 0.3, glass: 0.5, stone: 0.7 };
  return finalizeSeed({ id: crypto.randomUUID(), $domain: 'physics', $name: `${seed.$name ?? 'Mesh'}_physics`, $lineage: makeLineage(seed, 'geometry3d_to_physics'), genes: { gravity: { type: 'scalar', value: 0.5 }, friction: { type: 'scalar', value: d[material] || 0.5 }, elasticity: { type: 'scalar', value: material === 'glass' ? 0.2 : 0.6 }, simulationType: { type: 'categorical', value: 'rigid_body' } } });
}

function shaderToVisual2d(seed: Seed): Seed {
  const technique = gv(seed, 'technique', 'raymarching');
  return finalizeSeed({ id: crypto.randomUUID(), $domain: 'visual2d', $name: `${seed.$name ?? 'Shader'}_visual`, $lineage: makeLineage(seed, 'shader_to_visual2d'), genes: { style: { type: 'categorical', value: technique === 'raymarching' ? 'abstract' : 'geometric' }, complexity: { type: 'scalar', value: gv(seed, 'complexity', 0.5) }, palette: { type: 'vector', value: gv(seed, 'palette', [0.5, 0.3, 0.8]) }, composition: { type: 'categorical', value: 'centered' } } });
}

function visual2dToSprite(seed: Seed): Seed {
  const palette = gv(seed, 'palette', [0.5, 0.3, 0.8]);
  return finalizeSeed({ id: crypto.randomUUID(), $domain: 'sprite', $name: `${seed.$name ?? 'Art'}_sprite`, $lineage: makeLineage(seed, 'visual2d_to_sprite'), genes: { resolution: { type: 'scalar', value: 0.5 }, paletteSize: { type: 'scalar', value: 0.5 }, colors: { type: 'vector', value: Array.isArray(palette) ? palette : [0.5, 0.3, 0.8] }, symmetry: { type: 'categorical', value: 'bilateral' } } });
}

function animationToChoreography(seed: Seed): Seed {
  const motionType = gv(seed, 'motionType', 'skeletal');
  return finalizeSeed({ id: crypto.randomUUID(), $domain: 'choreography', $name: `${seed.$name ?? 'Anim'}_dance`, $lineage: makeLineage(seed, 'animation_to_choreography'), genes: { style: { type: 'categorical', value: motionType === 'skeletal' ? 'contemporary' : 'abstract' }, tempo: { type: 'scalar', value: gv(seed, 'fps', 0.5) }, dancers: { type: 'scalar', value: 0.3 }, energy: { type: 'scalar', value: gv(seed, 'amplitude', 0.5) } } });
}

function physicsToParticle(seed: Seed): Seed {
  const gravity = gv(seed, 'gravity', 0.5); const elasticity = gv(seed, 'elasticity', 0.8);
  return finalizeSeed({ id: crypto.randomUUID(), $domain: 'particle', $name: `${seed.$name ?? 'Sim'}_particles`, $lineage: makeLineage(seed, 'physics_to_particle'), genes: { emitter: { type: 'categorical', value: 'point' }, count: { type: 'scalar', value: 0.5 }, lifetime: { type: 'scalar', value: typeof elasticity === 'number' ? elasticity * 3 : 2.0 }, velocity: { type: 'vector', value: [0, typeof gravity === 'number' ? gravity : 0.5, 0] } } });
}

function characterToNarrative(seed: Seed): Seed {
  const archetype = gv(seed, 'archetype', 'warrior');
  const plotMap: Record<string, string> = { warrior: 'quest', mage: 'mystery', rogue: 'heist', paladin: 'crusade', bard: 'romance' };
  return finalizeSeed({ id: crypto.randomUUID(), $domain: 'narrative', $name: `${seed.$name ?? 'Hero'}_story`, $lineage: makeLineage(seed, 'character_to_narrative'), genes: { structure: { type: 'categorical', value: 'heros_journey' }, tone: { type: 'categorical', value: archetype === 'rogue' ? 'dark' : 'epic' }, characters: { type: 'array', value: [seed.$name || 'hero', 'villain', 'mentor'] }, plot: { type: 'categorical', value: plotMap[archetype] || 'quest' }, complexity: { type: 'scalar', value: 0.6 } } });
}

function musicToChoreography(seed: Seed): Seed {
  const tempo = gv(seed, 'tempo', 0.5); const scale = gv(seed, 'scale', 'major');
  const styleMap: Record<string, string> = { major: 'ballet', minor: 'contemporary', blues: 'jazz', pentatonic: 'folk' };
  return finalizeSeed({ id: crypto.randomUUID(), $domain: 'choreography', $name: `${seed.$name ?? 'Music'}_dance`, $lineage: makeLineage(seed, 'music_to_choreography'), genes: { style: { type: 'categorical', value: styleMap[scale] || 'contemporary' }, tempo: { type: 'scalar', value: typeof tempo === 'number' ? tempo : 0.5 }, dancers: { type: 'scalar', value: 0.4 }, energy: { type: 'scalar', value: typeof tempo === 'number' ? tempo * 0.8 : 0.4 } } });
}

function architectureToGeometry3d(seed: Seed): Seed {
  const style = gv(seed, 'style', 'modern'); const scale = gv(seed, 'scale', 0.5);
  return finalizeSeed({ id: crypto.randomUUID(), $domain: 'geometry3d', $name: `${seed.$name ?? 'Building'}_mesh`, $lineage: makeLineage(seed, 'architecture_to_geometry3d'), genes: { primitive: { type: 'categorical', value: 'cube' }, detail: { type: 'scalar', value: typeof scale === 'number' ? scale : 0.5 }, material: { type: 'categorical', value: style === 'modern' ? 'glass' : 'stone' }, scale: { type: 'vector', value: [1, typeof scale === 'number' ? scale * 3 : 1.5, 1] } } });
}

function foodToEcosystem(seed: Seed): Seed {
  const cuisine = gv(seed, 'cuisine', 'italian');
  const envMap: Record<string, string> = { italian: 'mediterranean', japanese: 'coastal', mexican: 'desert', indian: 'tropical', french: 'temperate' };
  return finalizeSeed({ id: crypto.randomUUID(), $domain: 'ecosystem', $name: `${seed.$name ?? 'Recipe'}_ecosystem`, $lineage: makeLineage(seed, 'food_to_ecosystem'), genes: { speciesCount: { type: 'scalar', value: gv(seed, 'complexity', 0.5) }, environment: { type: 'categorical', value: envMap[cuisine] || 'temperate' }, stability: { type: 'scalar', value: 0.6 } } });
}

function fashionToCharacter(seed: Seed): Seed {
  const garmentType = gv(seed, 'garmentType', 'dress'); const palette = gv(seed, 'palette', [0.8, 0.1, 0.3]);
  return finalizeSeed({ id: crypto.randomUUID(), $domain: 'character', $name: `${seed.$name ?? 'Garment'}_wearer`, $lineage: makeLineage(seed, 'fashion_to_character'), genes: { archetype: { type: 'categorical', value: garmentType === 'armor' ? 'warrior' : 'noble' }, palette: { type: 'vector', value: Array.isArray(palette) ? palette : [0.8, 0.1, 0.3] }, strength: { type: 'scalar', value: 0.5 }, agility: { type: 'scalar', value: garmentType === 'dress' ? 0.4 : 0.6 } } });
}

function vehicleToPhysics(seed: Seed): Seed {
  const mass = gv(seed, 'mass', 0.5);
  return finalizeSeed({ id: crypto.randomUUID(), $domain: 'physics', $name: `${seed.$name ?? 'Vehicle'}_sim`, $lineage: makeLineage(seed, 'vehicle_to_physics'), genes: { gravity: { type: 'scalar', value: 0.5 }, friction: { type: 'scalar', value: 0.4 }, elasticity: { type: 'scalar', value: 0.3 }, simulationType: { type: 'categorical', value: 'rigid_body' } } });
}

function circuitToRobotics(seed: Seed): Seed {
  const complexity = gv(seed, 'complexity', 0.5);
  return finalizeSeed({ id: crypto.randomUUID(), $domain: 'robotics', $name: `${seed.$name ?? 'Circuit'}_robot`, $lineage: makeLineage(seed, 'circuit_to_robotics'), genes: { robotType: { type: 'categorical', value: 'humanoid' }, dof: { type: 'scalar', value: typeof complexity === 'number' ? complexity : 0.5 }, actuators: { type: 'array', value: ['servo', 'linear'] }, autonomy: { type: 'scalar', value: typeof complexity === 'number' ? complexity * 0.8 : 0.4 } } });
}

function typographyToUi(seed: Seed): Seed {
  const contrast = gv(seed, 'contrast', 0.3);
  return finalizeSeed({ id: crypto.randomUUID(), $domain: 'ui', $name: `${seed.$name ?? 'Type'}_interface`, $lineage: makeLineage(seed, 'typography_to_ui'), genes: { layout: { type: 'categorical', value: 'dashboard' }, theme: { type: 'categorical', value: typeof contrast === 'number' && contrast > 0.5 ? 'dark' : 'light' }, components: { type: 'array', value: ['header', 'main', 'sidebar'] }, density: { type: 'scalar', value: typeof contrast === 'number' ? contrast : 0.3 } } });
}

function alifeToEcosystem(seed: Seed): Seed {
  const density = gv(seed, 'density', 0.3);
  return finalizeSeed({ id: crypto.randomUUID(), $domain: 'ecosystem', $name: `${seed.$name ?? 'ALife'}_ecosystem`, $lineage: makeLineage(seed, 'alife_to_ecosystem'), genes: { speciesCount: { type: 'scalar', value: typeof density === 'number' ? density * 1.5 : 0.5 }, environment: { type: 'categorical', value: 'digital' }, stability: { type: 'scalar', value: 0.5 } } });
}

function particleToShader(seed: Seed): Seed {
  const color = gv(seed, 'color', [1, 0.5, 0]);
  return finalizeSeed({ id: crypto.randomUUID(), $domain: 'shader', $name: `${seed.$name ?? 'Particles'}_shader`, $lineage: makeLineage(seed, 'particle_to_shader'), genes: { shaderType: { type: 'categorical', value: 'fragment' }, technique: { type: 'categorical', value: 'particle_render' }, complexity: { type: 'scalar', value: gv(seed, 'count', 0.5) }, palette: { type: 'vector', value: Array.isArray(color) ? color : [1, 0.5, 0] } } });
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
  // 3 agent bridges
  ['agent->character', { fn: agentToCharacter, name: 'agent_to_character' }],
  ['character->agent', { fn: characterToAgent, name: 'character_to_agent' }],
  ['agent->narrative', { fn: agentToNarrative, name: 'agent_to_narrative' }],
  // 18 expansion bridges
  ['music->animation', { fn: musicToAnimation, name: 'music_to_animation' }],
  ['narrative->character', { fn: narrativeToCharacter, name: 'narrative_to_character' }],
  ['ecosystem->procedural', { fn: ecosystemToProcedural, name: 'ecosystem_to_procedural' }],
  ['geometry3d->physics', { fn: geometry3dToPhysics, name: 'geometry3d_to_physics' }],
  ['shader->visual2d', { fn: shaderToVisual2d, name: 'shader_to_visual2d' }],
  ['visual2d->sprite', { fn: visual2dToSprite, name: 'visual2d_to_sprite' }],
  ['animation->choreography', { fn: animationToChoreography, name: 'animation_to_choreography' }],
  ['physics->particle', { fn: physicsToParticle, name: 'physics_to_particle' }],
  ['character->narrative', { fn: characterToNarrative, name: 'character_to_narrative' }],
  ['music->choreography', { fn: musicToChoreography, name: 'music_to_choreography' }],
  ['architecture->geometry3d', { fn: architectureToGeometry3d, name: 'architecture_to_geometry3d' }],
  ['food->ecosystem', { fn: foodToEcosystem, name: 'food_to_ecosystem' }],
  ['fashion->character', { fn: fashionToCharacter, name: 'fashion_to_character' }],
  ['vehicle->physics', { fn: vehicleToPhysics, name: 'vehicle_to_physics' }],
  ['circuit->robotics', { fn: circuitToRobotics, name: 'circuit_to_robotics' }],
  ['typography->ui', { fn: typographyToUi, name: 'typography_to_ui' }],
  ['alife->ecosystem', { fn: alifeToEcosystem, name: 'alife_to_ecosystem' }],
  ['particle->shader', { fn: particleToShader, name: 'particle_to_shader' }],
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
