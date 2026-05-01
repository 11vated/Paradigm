/**
 * Paradigm Absolute — 27 Domain Engines
 * Each engine grows a seed into an artifact descriptor.
 * Ported from Python engines.py — every grow() has real logic, no stubs.
 * 27th domain "agent" grows seeds into runnable agent configurations.
 */

import { generateVisual2D } from './generators/visual2d';
import { generateAudio } from './generators/audio';
import { generateGeometry3D } from './generators/geometry3d';
import { generateCharacter } from './generators/character';
import { generateSprite } from './generators/sprite';
import { generateMusic } from './generators/music';
import { generateNarrative } from './generators/narrative';
import { generatePhysics } from './generators/physics';
import { generateGame } from './generators/game';
import { generateAnimation } from './generators/animation';
import { generateShader } from './generators/shader';
import { generateParticle } from './generators/particle';
import { generateEcosystem } from './generators/ecosystem';
import { generateProcedural } from './generators/procedural';
import { generateFullGame } from './generators/fullgame';

interface Seed {
  $name?: string;
  $domain?: string;
  $hash?: string;
  $lineage?: { generation?: number };
  genes?: Record<string, { type?: string; value?: any }>;
  [key: string]: any;
}

interface Artifact {
  type: string;
  name: string;
  domain: string;
  seed_hash: string;
  generation: number;
  render_hints: Record<string, any>;
  [key: string]: any;
}

function geneVal(seed: Seed, name: string, fallback: any = null): any {
  return seed.genes?.[name]?.value ?? fallback;
}

// ─── PRIMARY ENGINES ──────────────────────────────────────────────────────────

async function growCharacter(seed: Seed): Promise<Artifact> {
  const outputDir = 'data/artifacts/character';
  const fileName = `${seed.$hash ?? 'unknown'}_${Date.now()}.obj`;
  const outputPath = `${outputDir}/${fileName}`;

  const size = geneVal(seed, 'size', 1.0);
  const archetype = geneVal(seed, 'archetype', 'warrior');
  const strength = geneVal(seed, 'strength', 0.5);
  const agility = geneVal(seed, 'agility', 0.5);
  const palette = geneVal(seed, 'palette', [0.5, 0.5, 0.5]);
  let personality = geneVal(seed, 'personality', 'neutral');
  if (typeof personality === 'object' && personality !== null) personality = personality.trait ?? 'neutral';

  try {
    const result = await generateCharacter(seed, outputPath);
    return {
      type: 'character', name: seed.$name ?? 'Unknown', domain: 'character',
      seed_hash: seed.$hash ?? '', generation: seed.$lineage?.generation ?? 0,
      archetype,
      visual: {
        body_width: +(0.3 + strength * 0.4).toFixed(2),
        body_height: +(size * 0.8).toFixed(2),
        size_factor: +size.toFixed(2)
      },
      stats: {
        strength: Math.round(strength * 100),
        agility: Math.round(agility * 100),
        speed: +(agility * 10).toFixed(1),
        hp: Math.round(100 + strength * 200)
      },
      personality,
      artifact: { filePath: result.filePath, format: 'OBJ', vertices: result.vertices, faces: result.faces },
      render_hints: { mode: '3d_character', animated: true, hasFile: true },
    };
  } catch (err) {
    return {
      type: 'character', name: seed.$name ?? 'Unknown', domain: 'character',
      seed_hash: seed.$hash ?? '', generation: seed.$lineage?.generation ?? 0,
      archetype, personality,
      visual: { error: String(err) },
      render_hints: { mode: '3d_character', animated: true, error: true },
    };
  }
}

async function growSprite(seed: Seed): Promise<Artifact> {
  const outputDir = 'data/artifacts/sprite';
  const fileName = `${seed.$hash ?? 'unknown'}_${Date.now()}.png`;
  const outputPath = `${outputDir}/${fileName}`;

  let resolution = geneVal(seed, 'resolution', 32);
  if (typeof resolution === 'number' && resolution <= 1) resolution = Math.floor(resolution * 64);
  let paletteSize = geneVal(seed, 'paletteSize', 8);
  if (typeof paletteSize === 'number' && paletteSize <= 1) paletteSize = Math.floor(paletteSize * 16);
  const colors = geneVal(seed, 'colors', [0.8, 0.2, 0.3]);
  const symmetry = geneVal(seed, 'symmetry', 'bilateral');

  try {
    const result = await generateSprite(seed, outputPath);
    return {
      type: 'sprite', name: seed.$name ?? 'Sprite', domain: 'sprite',
      seed_hash: seed.$hash ?? '', generation: seed.$lineage?.generation ?? 0,
      visual: {
        resolution: Math.max(8, Math.min(resolution, 128)),
        palette_size: Math.max(2, Math.min(paletteSize, 32)),
        primary_color: `hsl(${Math.floor((colors[0] ?? 0.5) * 360)}, 70%, 50%)`,
        secondary_color: `hsl(${Math.floor((colors[1] ?? 0.25) * 360)}, 60%, 40%)`,
        symmetry,
      },
      artifact: { filePath: result.filePath, format: 'PNG', width: result.width, height: result.height, frames: result.frames },
      render_hints: { mode: '2d_sprite', pixel_art: true, hasFile: true },
    };
  } catch (err) {
    return {
      type: 'sprite', name: seed.$name ?? 'Sprite', domain: 'sprite',
      seed_hash: seed.$hash ?? '', generation: seed.$lineage?.generation ?? 0,
      visual: { error: String(err) },
      render_hints: { mode: '2d_sprite', pixel_art: true, error: true },
    };
  }
}

async function growMusic(seed: Seed): Promise<Artifact> {
  const outputDir = 'data/artifacts/music';
  const fileName = `${seed.$hash ?? 'unknown'}_${Date.now()}.wav`;
  const outputPath = `${outputDir}/${fileName}`;

  let tempo = geneVal(seed, 'tempo', 0.5);
  if (typeof tempo === 'number' && tempo <= 1) tempo = 60 + tempo * 140;

  try {
    const result = await generateMusic(seed, outputPath);
    return {
      type: 'music', name: seed.$name ?? 'Composition', domain: 'music',
      seed_hash: seed.$hash ?? '', generation: seed.$lineage?.generation ?? 0,
      musical: {
        tempo: Math.round(tempo),
        key: geneVal(seed, 'key', 'C'),
        scale: geneVal(seed, 'scale', 'major'),
        time_signature: '4/4', measures: 8,
      },
      timbre: (() => { const t = geneVal(seed, 'timbre', {}); return typeof t === 'object' ? t : { warmth: 0.5 }; })(),
      melody_preview: (() => { const m = geneVal(seed, 'melody', []); return Array.isArray(m) ? m.slice(0, 16) : []; })(),
      artifact: { filePath: result.filePath, format: 'WAV', duration: result.duration, sampleRate: result.sampleRate },
      render_hints: { mode: 'audio_waveform', playable: true, hasFile: true },
    };
  } catch (err) {
    return {
      type: 'music', name: seed.$name ?? 'Composition', domain: 'music',
      seed_hash: seed.$hash ?? '', generation: seed.$lineage?.generation ?? 0,
      musical: { error: String(err) },
      render_hints: { mode: 'audio_waveform', playable: true, error: true },
    };
  }
}

async function growVisual2d(seed: Seed): Promise<Artifact> {
  const style = geneVal(seed, 'style', 'abstract');
  const complexity = geneVal(seed, 'complexity', 0.5);
  const outputDir = 'data/artifacts/visual2d';
  const fileName = `${seed.$hash ?? 'unknown'}_${Date.now()}.png`;
  const outputPath = `${outputDir}/${fileName}`;

  try {
    const result = await generateVisual2D(seed, outputPath);
    return {
      type: 'visual2d', name: seed.$name ?? 'Visual', domain: 'visual2d',
      seed_hash: seed.$hash ?? '', generation: seed.$lineage?.generation ?? 0,
      visual: {
        style, complexity: typeof complexity === 'number' ? +complexity.toFixed(2) : complexity,
        palette: geneVal(seed, 'palette', [0.5, 0.3, 0.8]),
        composition: geneVal(seed, 'composition', 'centered'),
        layers: typeof complexity === 'number' ? Math.max(3, Math.floor(complexity * 10)) : 5,
      },
      artifact: { filePath: outputPath, width: result.width, height: result.height, format: 'PNG' },
      render_hints: { mode: '2d_canvas', generative: true, hasFile: true },
    };
  } catch (err) {
    return {
      type: 'visual2d', name: seed.$name ?? 'Visual', domain: 'visual2d',
      seed_hash: seed.$hash ?? '', generation: seed.$lineage?.generation ?? 0,
      visual: { style, complexity, error: String(err) },
      render_hints: { mode: '2d_canvas', generative: true, error: true },
    };
  }
}

async function growProcedural(seed: Seed): Promise<Artifact> {
  const outputDir = 'data/artifacts/procedural';
  const fileName = `${seed.$hash ?? 'unknown'}_${Date.now()}.png`;
  const outputPath = `${outputDir}/${fileName}`;

  let octaves = geneVal(seed, 'octaves', 4);
  if (typeof octaves === 'number' && octaves <= 1) octaves = Math.max(1, Math.floor(octaves * 8));

  try {
    const result = await generateProcedural(seed, outputPath);
    return {
      type: 'procedural', name: seed.$name ?? 'Terrain', domain: 'procedural',
      seed_hash: seed.$hash ?? '', generation: seed.$lineage?.generation ?? 0,
      terrain: {
        octaves, persistence: +(geneVal(seed, 'persistence', 0.5)).toFixed(3),
        scale: +(geneVal(seed, 'scale', 1.0)).toFixed(2),
        biome: geneVal(seed, 'biome', 'temperate'),
        heightmap_size: 256,
      },
      artifact: { filePath: result.filePath, format: 'PNG', width: result.width, height: result.height },
      render_hints: { mode: '2d_heightmap', interactive: true, hasFile: true },
    };
  } catch (err) {
    return {
      type: 'procedural', name: seed.$name ?? 'Terrain', domain: 'procedural',
      seed_hash: seed.$hash ?? '', generation: seed.$lineage?.generation ?? 0,
      terrain: { error: String(err) },
      render_hints: { mode: '2d_heightmap', interactive: true, error: true },
    };
  }
}

// ─── EXTENDED ENGINES ─────────────────────────────────────────────────────────

async function growFullgame(seed: Seed): Promise<Artifact> {
  const outputDir = 'data/artifacts/fullgame';
  const fileName = `${seed.$hash ?? 'unknown'}_${Date.now()}.html`;
  const outputPath = `${outputDir}/${fileName}`;

  const genre = geneVal(seed, 'genre', 'action');
  const diff = geneVal(seed, 'difficulty', 0.5);
  const levelCount = geneVal(seed, 'levelCount', 0.5);

  try {
    const result = await generateFullGame(seed, outputPath);
    return {
      type: 'fullgame', name: seed.$name ?? 'Game', domain: 'fullgame',
      seed_hash: seed.$hash ?? '', generation: seed.$lineage?.generation ?? 0,
      game: { genre, difficulty: typeof diff === 'number' ? +diff.toFixed(2) : diff, levels: Math.max(3, Math.floor((typeof levelCount === 'number' ? levelCount : 0.5) * 20)), mechanics: geneVal(seed, 'mechanics', ['action']) },
      artifact: { filePath: result.filePath, format: 'HTML', levels: result.levels, fileSize: result.fileSize },
      render_hints: { mode: 'game_preview', interactive: true, hasFile: true },
    };
  } catch (err) {
    return {
      type: 'fullgame', name: seed.$name ?? 'Game', domain: 'fullgame',
      seed_hash: seed.$hash ?? '', generation: seed.$lineage?.generation ?? 0,
      game: { error: String(err) },
      render_hints: { mode: 'game_preview', interactive: true, error: true },
    };
  }
}

async function growAnimation(seed: Seed): Promise<Artifact> {
  const outputDir = 'data/artifacts/animation';
  const fileName = `${seed.$hash ?? 'unknown'}_${Date.now()}.png`;
  const outputPath = `${outputDir}/${fileName}`;

  try {
    const result = await generateAnimation(seed, outputPath);
    return {
      type: 'animation', name: seed.$name ?? 'Animation', domain: 'animation',
      seed_hash: seed.$hash ?? '', generation: seed.$lineage?.generation ?? 0,
      animation: { frame_count: Math.max(4, Math.floor(geneVal(seed, 'frameCount', 0.5) * 60)), fps: Math.max(8, Math.floor(geneVal(seed, 'fps', 0.5) * 60)), motion_type: geneVal(seed, 'motionType', 'skeletal'), loop: geneVal(seed, 'loop', 'loop') },
      artifact: { filePath: result.filePath, format: 'PNG', frameCount: result.frameCount, fps: result.fps },
      render_hints: { mode: 'animation_timeline', animated: true, hasFile: true },
    };
  } catch (err) {
    return {
      type: 'animation', name: seed.$name ?? 'Animation', domain: 'animation',
      seed_hash: seed.$hash ?? '', generation: seed.$lineage?.generation ?? 0,
      animation: { error: String(err) },
      render_hints: { mode: 'animation_timeline', animated: true, error: true },
    };
  }
}

async function growGeometry3d(seed: Seed): Promise<Artifact> {
  const outputDir = 'data/artifacts/geometry3d';
  const fileName = `${seed.$hash ?? 'unknown'}_${Date.now()}.gltf`;
  const outputPath = `${outputDir}/${fileName}`;

  try {
    const result = await generateGeometry3D(seed, outputPath);
    return {
      type: 'geometry3d', name: seed.$name ?? '3D Object', domain: 'geometry3d',
      seed_hash: seed.$hash ?? '', generation: seed.$lineage?.generation ?? 0,
      mesh: {
        primitive: geneVal(seed, 'primitive', 'sphere'),
        subdivisions: Math.max(1, Math.floor(geneVal(seed, 'detail', 0.5) * 8)),
        material: geneVal(seed, 'material', 'metal'),
        scale: [1, 1, 1],
        vertices: result.vertices,
        faces: result.faces,
      },
      artifact: { filePath: result.filePath, format: 'GLTF', vertices: result.vertices, faces: result.faces },
      render_hints: { mode: '3d_viewport', rotatable: true, hasFile: true },
    };
  } catch (err) {
    return {
      type: 'geometry3d', name: seed.$name ?? '3D Object', domain: 'geometry3d',
      seed_hash: seed.$hash ?? '', generation: seed.$lineage?.generation ?? 0,
      mesh: { error: String(err) },
      render_hints: { mode: '3d_viewport', rotatable: true, error: true },
    };
  }
}

async function growNarrative(seed: Seed): Promise<Artifact> {
  const outputDir = 'data/artifacts/narrative';
  const fileName = `${seed.$hash ?? 'unknown'}_${Date.now()}.txt`;
  const outputPath = `${outputDir}/${fileName}`;

  try {
    const result = await generateNarrative(seed, outputPath);
    return {
      type: 'narrative', name: seed.$name ?? 'Story', domain: 'narrative',
      seed_hash: seed.$hash ?? '', generation: seed.$lineage?.generation ?? 0,
      story: {
        structure: geneVal(seed, 'structure', 'heros_journey'),
        tone: geneVal(seed, 'tone', 'epic'),
        characters: geneVal(seed, 'characters', ['hero', 'villain']),
        plot: geneVal(seed, 'plot', 'quest'),
        acts: 3
      },
      artifact: { filePath: result.filePath, format: 'TXT', wordCount: result.wordCount, acts: result.acts },
      render_hints: { mode: 'narrative_flow', readable: true, hasFile: true },
    };
  } catch (err) {
    return {
      type: 'narrative', name: seed.$name ?? 'Story', domain: 'narrative',
      seed_hash: seed.$hash ?? '', generation: seed.$lineage?.generation ?? 0,
      story: { error: String(err) },
      render_hints: { mode: 'narrative_flow', readable: true, error: true },
    };
  }
}

function growUi(seed: Seed): Artifact {
  return {
    type: 'ui', name: seed.$name ?? 'Interface', domain: 'ui',
    seed_hash: seed.$hash ?? '', generation: seed.$lineage?.generation ?? 0,
    interface: { layout: geneVal(seed, 'layout', 'dashboard'), theme: geneVal(seed, 'theme', 'dark'), components: geneVal(seed, 'components', ['header', 'sidebar', 'main']) },
    render_hints: { mode: 'ui_preview', interactive: true },
  };
}

async function growPhysics(seed: Seed): Promise<Artifact> {
  const outputDir = 'data/artifacts/physics';
  const fileName = `${seed.$hash ?? 'unknown'}_${Date.now()}.json`;
  const outputPath = `${outputDir}/${fileName}`;

  const grav = geneVal(seed, 'gravity', 0.5);

  try {
    const result = await generatePhysics(seed, outputPath);
    return {
      type: 'physics', name: seed.$name ?? 'Simulation', domain: 'physics',
      seed_hash: seed.$hash ?? '', generation: seed.$lineage?.generation ?? 0,
      simulation: { gravity: typeof grav === 'number' ? +(grav * 20).toFixed(2) : grav, friction: geneVal(seed, 'friction', 0.3), elasticity: geneVal(seed, 'elasticity', 0.8), type: geneVal(seed, 'simulationType', 'rigid_body'), steps: 1000 },
      artifact: { filePath: result.filePath, format: 'JSON', configSize: result.configSize },
      render_hints: { mode: 'physics_sim', animated: true, hasFile: true },
    };
  } catch (err) {
    return {
      type: 'physics', name: seed.$name ?? 'Simulation', domain: 'physics',
      seed_hash: seed.$hash ?? '', generation: seed.$lineage?.generation ?? 0,
      simulation: { error: String(err) },
      render_hints: { mode: 'physics_sim', animated: true, error: true },
    };
  }
}

async function growAudio(seed: Seed): Promise<Artifact> {
  const outputDir = 'data/artifacts/audio';
  const fileName = `${seed.$hash ?? 'unknown'}_${Date.now()}.wav`;
  const outputPath = `${outputDir}/${fileName}`;

  try {
    const result = await generateAudio(seed, outputPath);
    return {
      type: 'audio', name: seed.$name ?? 'Sound', domain: 'audio',
      seed_hash: seed.$hash ?? '', generation: seed.$lineage?.generation ?? 0,
      audio: {
        type: geneVal(seed, 'soundType', 'sfx'),
        duration_ms: result.duration * 1000,
        frequency: geneVal(seed, 'frequency', 440),
        sampleRate: result.sampleRate,
      },
      artifact: { filePath: result.filePath, format: 'WAV', duration: result.duration },
      render_hints: { mode: 'audio_waveform', playable: true, hasFile: true },
    };
  } catch (err) {
    return {
      type: 'audio', name: seed.$name ?? 'Sound', domain: 'audio',
      seed_hash: seed.$hash ?? '', generation: seed.$lineage?.generation ?? 0,
      audio: { error: String(err) },
      render_hints: { mode: 'audio_waveform', playable: true, error: true },
    };
  }
}

async function growEcosystem(seed: Seed): Promise<Artifact> {
  const outputDir = 'data/artifacts/ecosystem';
  const fileName = `${seed.$hash ?? 'unknown'}_${Date.now()}.json`;
  const outputPath = `${outputDir}/${fileName}`;

  try {
    const result = await generateEcosystem(seed, outputPath);
    return {
      type: 'ecosystem', name: seed.$name ?? 'Ecosystem', domain: 'ecosystem',
      seed_hash: seed.$hash ?? '', generation: seed.$lineage?.generation ?? 0,
      ecosystem: { species_count: Math.max(2, Math.floor(geneVal(seed, 'speciesCount', 0.5) * 20)), environment: geneVal(seed, 'environment', 'forest'), stability: geneVal(seed, 'stability', 0.6), interactions: ['predation', 'symbiosis', 'competition'] },
      artifact: { filePath: result.filePath, format: 'JSON', speciesCount: result.speciesCount },
      render_hints: { mode: 'ecosystem_graph', animated: true, hasFile: true },
    };
  } catch (err) {
    return {
      type: 'ecosystem', name: seed.$name ?? 'Ecosystem', domain: 'ecosystem',
      seed_hash: seed.$hash ?? '', generation: seed.$lineage?.generation ?? 0,
      ecosystem: { error: String(err) },
      render_hints: { mode: 'ecosystem_graph', animated: true, error: true },
    };
  }
}

async function growGame(seed: Seed): Promise<Artifact> {
  const outputDir = 'data/artifacts/game';
  const fileName = `${seed.$hash ?? 'unknown'}_${Date.now()}.html`;
  const outputPath = `${outputDir}/${fileName}`;

  try {
    const result = await generateGame(seed, outputPath);
    return {
      type: 'game', name: seed.$name ?? 'Game Mechanic', domain: 'game',
      seed_hash: seed.$hash ?? '', generation: seed.$lineage?.generation ?? 0,
      mechanic: { type: geneVal(seed, 'mechanicType', 'turn_based'), complexity: geneVal(seed, 'complexity', 0.5), players: geneVal(seed, 'players', 2) },
      artifact: { filePath: result.filePath, format: 'HTML', levelCount: result.levelCount, fileSize: result.fileSize },
      render_hints: { mode: 'mechanic_diagram', hasFile: true },
    };
  } catch (err) {
    return {
      type: 'game', name: seed.$name ?? 'Game Mechanic', domain: 'game',
      seed_hash: seed.$hash ?? '', generation: seed.$lineage?.generation ?? 0,
      mechanic: { error: String(err) },
      render_hints: { mode: 'mechanic_diagram', error: true },
    };
  }
}

function growAlife(seed: Seed): Artifact {
  return {
    type: 'alife', name: seed.$name ?? 'Artificial Life', domain: 'alife',
    seed_hash: seed.$hash ?? '', generation: seed.$lineage?.generation ?? 0,
    alife: { rules: geneVal(seed, 'rules', 'conway'), grid_size: Math.max(16, Math.floor(geneVal(seed, 'gridSize', 0.5) * 128)), initial_density: geneVal(seed, 'density', 0.3) },
    render_hints: { mode: 'cellular_automata', animated: true },
  };
}

async function growShader(seed: Seed): Promise<Artifact> {
  const outputDir = 'data/artifacts/shader';
  const fileName = `${seed.$hash ?? 'unknown'}_${Date.now()}.frag`;
  const outputPath = `${outputDir}/${fileName}`;

  try {
    const result = await generateShader(seed, outputPath);
    return {
      type: 'shader', name: seed.$name ?? 'Shader', domain: 'shader',
      seed_hash: seed.$hash ?? '', generation: seed.$lineage?.generation ?? 0,
      shader: { type: geneVal(seed, 'shaderType', 'fragment'), technique: geneVal(seed, 'technique', 'raymarching'), parameters: { iterations: 64, epsilon: 0.001 } },
      artifact: { filePath: result.filePath, format: 'GLSL', shaderCount: result.shaderCount },
      render_hints: { mode: 'shader_preview', realtime: true, hasFile: true },
    };
  } catch (err) {
    return {
      type: 'shader', name: seed.$name ?? 'Shader', domain: 'shader',
      seed_hash: seed.$hash ?? '', generation: seed.$lineage?.generation ?? 0,
      shader: { error: String(err) },
      render_hints: { mode: 'shader_preview', realtime: true, error: true },
    };
  }
}

async function growParticle(seed: Seed): Promise<Artifact> {
  const outputDir = 'data/artifacts/particle';
  const fileName = `${seed.$hash ?? 'unknown'}_${Date.now()}.json`;
  const outputPath = `${outputDir}/${fileName}`;

  try {
    const result = await generateParticle(seed, outputPath);
    return {
      type: 'particle', name: seed.$name ?? 'Particle System', domain: 'particle',
      seed_hash: seed.$hash ?? '', generation: seed.$lineage?.generation ?? 0,
      particles: { emitter: geneVal(seed, 'emitter', 'point'), count: Math.max(10, Math.floor(geneVal(seed, 'count', 0.5) * 1000)), lifetime: geneVal(seed, 'lifetime', 2.0), velocity: geneVal(seed, 'velocity', [0, 1, 0]) },
      artifact: { filePath: result.filePath, format: 'JSON', particleCount: result.particleCount },
      render_hints: { mode: 'particle_sim', animated: true, hasFile: true },
    };
  } catch (err) {
    return {
      type: 'particle', name: seed.$name ?? 'Particle System', domain: 'particle',
      seed_hash: seed.$hash ?? '', generation: seed.$lineage?.generation ?? 0,
      particles: { error: String(err) },
      render_hints: { mode: 'particle_sim', animated: true, error: true },
    };
  }
}

function growTypography(seed: Seed): Artifact {
  return {
    type: 'typography', name: seed.$name ?? 'Typeface', domain: 'typography',
    seed_hash: seed.$hash ?? '', generation: seed.$lineage?.generation ?? 0,
    typography: { style: geneVal(seed, 'style', 'sans_serif'), weight_range: [100, 900], x_height: geneVal(seed, 'xHeight', 0.5), contrast: geneVal(seed, 'contrast', 0.3) },
    render_hints: { mode: 'type_specimen' },
  };
}

function growArchitecture(seed: Seed): Artifact {
  return {
    type: 'architecture', name: seed.$name ?? 'Building', domain: 'architecture',
    seed_hash: seed.$hash ?? '', generation: seed.$lineage?.generation ?? 0,
    building: { style: geneVal(seed, 'style', 'modern'), floors: Math.max(1, Math.floor(geneVal(seed, 'scale', 0.5) * 10)), symmetry: geneVal(seed, 'symmetry', 'bilateral'), materials: geneVal(seed, 'materials', ['concrete', 'glass']) },
    render_hints: { mode: '3d_building', rotatable: true },
  };
}

function growVehicle(seed: Seed): Artifact {
  return {
    type: 'vehicle', name: seed.$name ?? 'Vehicle', domain: 'vehicle',
    seed_hash: seed.$hash ?? '', generation: seed.$lineage?.generation ?? 0,
    vehicle: { propulsion: geneVal(seed, 'propulsion', 'combustion'), top_speed: Math.max(10, Math.floor(geneVal(seed, 'speed', 0.5) * 300)), mass_kg: Math.max(100, Math.floor(geneVal(seed, 'mass', 0.5) * 5000)) },
    render_hints: { mode: '3d_vehicle', rotatable: true },
  };
}

function growFurniture(seed: Seed): Artifact {
  return {
    type: 'furniture', name: seed.$name ?? 'Furniture', domain: 'furniture',
    seed_hash: seed.$hash ?? '', generation: seed.$lineage?.generation ?? 0,
    furniture: { type: geneVal(seed, 'furnitureType', 'chair'), style: geneVal(seed, 'style', 'modern'), material: geneVal(seed, 'material', 'wood') },
    render_hints: { mode: '3d_furniture' },
  };
}

function growFashion(seed: Seed): Artifact {
  return {
    type: 'fashion', name: seed.$name ?? 'Garment', domain: 'fashion',
    seed_hash: seed.$hash ?? '', generation: seed.$lineage?.generation ?? 0,
    garment: { type: geneVal(seed, 'garmentType', 'dress'), fabric: geneVal(seed, 'fabric', 'silk'), palette: geneVal(seed, 'palette', [0.8, 0.1, 0.3]) },
    render_hints: { mode: '3d_garment' },
  };
}

function growRobotics(seed: Seed): Artifact {
  return {
    type: 'robotics', name: seed.$name ?? 'Robot', domain: 'robotics',
    seed_hash: seed.$hash ?? '', generation: seed.$lineage?.generation ?? 0,
    robot: { type: geneVal(seed, 'robotType', 'humanoid'), dof: Math.max(3, Math.floor(geneVal(seed, 'dof', 0.5) * 12)), actuators: geneVal(seed, 'actuators', ['servo', 'linear']) },
    render_hints: { mode: '3d_robot', animated: true },
  };
}

function growCircuit(seed: Seed): Artifact {
  return {
    type: 'circuit', name: seed.$name ?? 'Circuit', domain: 'circuit',
    seed_hash: seed.$hash ?? '', generation: seed.$lineage?.generation ?? 0,
    circuit: { type: geneVal(seed, 'circuitType', 'digital'), components: geneVal(seed, 'components', ['resistor', 'capacitor', 'IC']), layers: Math.max(1, Math.floor(geneVal(seed, 'layers', 0.5) * 6)) },
    render_hints: { mode: 'schematic' },
  };
}

function growFood(seed: Seed): Artifact {
  return {
    type: 'food', name: seed.$name ?? 'Recipe', domain: 'food',
    seed_hash: seed.$hash ?? '', generation: seed.$lineage?.generation ?? 0,
    recipe: { cuisine: geneVal(seed, 'cuisine', 'italian'), complexity: geneVal(seed, 'complexity', 0.5), servings: 4, flavor_profile: geneVal(seed, 'flavor_profile', [0.5, 0.3, 0.7, 0.2, 0.1]) },
    render_hints: { mode: 'recipe_card' },
  };
}

function growChoreography(seed: Seed): Artifact {
  return {
    type: 'choreography', name: seed.$name ?? 'Dance', domain: 'choreography',
    seed_hash: seed.$hash ?? '', generation: seed.$lineage?.generation ?? 0,
    choreography: { style: geneVal(seed, 'style', 'contemporary'), tempo: geneVal(seed, 'tempo', 0.5), dancers: Math.max(1, Math.floor(geneVal(seed, 'dancers', 0.5) * 8)), duration_beats: 32 },
    render_hints: { mode: 'motion_timeline', animated: true },
  };
}

// ─── 27th DOMAIN: AGENT ─────────────────────────────────────────────────────

/**
 * Grows an agent seed into a runnable agent configuration.
 * The agent domain is unique: its artifact is not a visual/audio output
 * but a fully instantiated reasoning system configuration that can process
 * natural language queries and execute kernel operations.
 *
 * Agent seeds are breedable, evolvable, composable, and sovereign —
 * the full kernel operates on them like any other seed.
 */
function growAgent(seed: Seed): Artifact {
  const persona = geneVal(seed, 'persona', 'architect');
  const name = geneVal(seed, 'name', seed.$name ?? 'Unnamed Agent');
  const temperature = Math.max(0, Math.min(1, geneVal(seed, 'temperature', 0.3)));
  const reasoningDepth = Math.max(0, Math.min(1, geneVal(seed, 'reasoning_depth', 0.5)));
  const explorationRate = Math.max(0, Math.min(1, geneVal(seed, 'exploration_rate', 0.2)));
  const confidenceThreshold = Math.max(0, Math.min(1, geneVal(seed, 'confidence_threshold', 0.7)));
  const verbosity = Math.max(0, Math.min(1, geneVal(seed, 'verbosity', 0.5)));
  const autonomy = Math.max(0, Math.min(1, geneVal(seed, 'autonomy', 0.3)));
  const creativityBias = Math.max(0, Math.min(1, geneVal(seed, 'creativity_bias', 0.4)));
  const maxSteps = Math.floor(Math.max(0, Math.min(1, geneVal(seed, 'max_reasoning_steps', 0.5))) * 20);
  const memoryWindow = Math.floor(Math.max(0, Math.min(1, geneVal(seed, 'context_window', 0.5))) * 50);

  // Domain focus — attention weights over all domains (default: uniform)
  let domainFocus = geneVal(seed, 'domain_focus', null);
  if (!Array.isArray(domainFocus) || domainFocus.length < 26) {
    domainFocus = new Array(27).fill(1 / 27);
  }
  // Normalize to sum to 1
  const focusSum = domainFocus.reduce((a: number, b: number) => a + Math.abs(b), 0) || 1;
  domainFocus = domainFocus.map((v: number) => Math.abs(v) / focusSum);

  // Gene expertise — proficiency with each gene type (default: uniform)
  let geneExpertise = geneVal(seed, 'gene_expertise', null);
  if (!Array.isArray(geneExpertise) || geneExpertise.length < 17) {
    geneExpertise = new Array(17).fill(1 / 17);
  }
  const expertiseSum = geneExpertise.reduce((a: number, b: number) => a + Math.abs(b), 0) || 1;
  geneExpertise = geneExpertise.map((v: number) => Math.abs(v) / expertiseSum);

  // Tool permissions
  const toolPerms = geneVal(seed, 'tool_permissions', {});
  const tools = {
    web_browse: !!toolPerms?.web_browse,
    file_write: !!toolPerms?.file_write,
    fork_agent: !!toolPerms?.fork_agent,
    delegate: !!toolPerms?.delegate,
  };

  // Build the system prompt from the agent's genes
  const personaTraits: Record<string, string> = {
    architect: 'You approach problems systematically, designing structured solutions. You favor composition and multi-step plans.',
    artist: 'You embrace creativity and expressiveness. You generate diverse, unexpected gene combinations and favor aesthetic quality.',
    critic: 'You evaluate rigorously, comparing seeds by distance metrics and fitness. You suggest improvements and point out weaknesses.',
    explorer: 'You prioritize novelty and exploration. You try unusual domain compositions and push genes toward unexplored regions.',
    composer: 'You excel at cross-domain composition. You think in functor bridges and multi-seed synthesis.',
    analyst: 'You are precise and data-driven. You compute distances, compare populations, and optimize fitness systematically.',
  };

  const systemPrompt = [
    `You are ${name}, a Paradigm GSPL agent with persona "${persona}".`,
    personaTraits[persona] || personaTraits.architect,
    `Temperature: ${temperature.toFixed(2)} | Reasoning depth: ${reasoningDepth.toFixed(2)} | Creativity: ${creativityBias.toFixed(2)}`,
    `You have access to 27 creative domains, 17 gene types, and 12 functor bridges.`,
    `Maximum reasoning steps: ${maxSteps}. Memory window: ${memoryWindow} turns.`,
    tools.web_browse ? 'Web browsing is enabled.' : '',
    `Respond ${verbosity < 0.3 ? 'tersely' : verbosity > 0.7 ? 'in detail with explanations' : 'with moderate detail'}.`,
    autonomy > 0.7 ? 'Act independently — execute plans without asking for confirmation.' :
    autonomy < 0.3 ? 'Always confirm plans with the user before executing.' :
    'Confirm complex multi-step plans, but execute simple operations directly.',
  ].filter(Boolean).join(' ');

  return {
    type: 'agent', name, domain: 'agent',
    seed_hash: seed.$hash ?? '', generation: seed.$lineage?.generation ?? 0,
    config: {
      persona, name, temperature, reasoningDepth, explorationRate,
      confidenceThreshold, verbosity, autonomy, creativityBias,
      maxSteps, memoryWindow,
      domainWeights: domainFocus,
      geneWeights: geneExpertise,
      tools,
      systemPrompt,
    },
    render_hints: { mode: 'chat_interface', color_scheme: 'dark', animated: false },
  };
}

// ─── ENGINE REGISTRY ──────────────────────────────────────────────────────────
export const ENGINES: Record<string, (seed: Seed) => Artifact> = {
  character: growCharacter, sprite: growSprite, music: growMusic,
  visual2d: growVisual2d, procedural: growProcedural,
  fullgame: growFullgame, animation: growAnimation, geometry3d: growGeometry3d,
  narrative: growNarrative, ui: growUi, physics: growPhysics,
  audio: growAudio, ecosystem: growEcosystem, game: growGame,
  alife: growAlife, shader: growShader, particle: growParticle,
  typography: growTypography, architecture: growArchitecture,
  vehicle: growVehicle, furniture: growFurniture, fashion: growFashion,
  robotics: growRobotics, circuit: growCircuit, food: growFood,
  choreography: growChoreography,
  agent: growAgent,
};

function growGeneric(seed: Seed): Artifact {
  const geneSummary: Record<string, any> = {};
  for (const [name, gene] of Object.entries(seed.genes ?? {})) {
    geneSummary[name] = { type: gene.type, value_preview: String(gene.value ?? '').slice(0, 50) };
  }
  return {
    type: seed.$domain ?? 'unknown', name: seed.$name ?? 'Artifact', domain: seed.$domain ?? 'unknown',
    seed_hash: seed.$hash ?? '', generation: seed.$lineage?.generation ?? 0,
    gene_summary: geneSummary,
    render_hints: { mode: 'generic', description_only: true },
  };
}

export async function growSeed(seed: Seed): Promise<Artifact> {
  const domain = seed.$domain ?? 'character';
  const engine = ENGINES[domain] ?? growGeneric;
  const result = engine(seed);
  return result instanceof Promise ? result : result;
}

export function getAllDomains(): string[] {
  return Object.keys(ENGINES);
}
