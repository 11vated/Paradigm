/**
 * Domain Engine Router — dispatches seed → generator
 * Upgraded to use WebGPU Generator System (Phase 2)
 */

import type { Seed } from './types';
import { createWebGPUGeneratorSystem, WebGPUGeneratorSystem } from './generators/webgpu-system';

// Lazy-loaded generator system
let gpuSystem: WebGPUGeneratorSystem | null = null;

async function getGPUSystem(): Promise<WebGPUGeneratorSystem> {
  if (!gpuSystem) {
    gpuSystem = await createWebGPUGeneratorSystem({
      preferGPU: true,
      fallbackToCPU: true
    });
  }
  return gpuSystem;
}

// Core domain imports (V2/V3 versions with GPU acceleration)
// Using correct export names from generator files
import { generateCharacterV3 as generateCharacter } from './generators/character-v3';
import { generateSpriteV2 as generateSprite } from './generators/sprite-v2';
import { generateMusicV2 as generateMusic } from './generators/music-v2';
import { generateVisual2DV2 as generateVisual2D } from './generators/visual2d-v2';
import { generateGameV2 as generateGame } from './generators/game-v2';
import { generateGeometry3D } from './generators/geometry3d';
import { generateGameWASM as generateGameWASM } from './generators/game-wasm';
import { generateAnimation } from './generators/animation';
import { generateAnimationEnhanced } from './generators/animation-enhanced';
import { generateShader } from './generators/shader';
import { generateParticle } from './generators/particle';
import { generateParticleGPU } from './generators/particle-gpu';
import { generateEcosystem } from './generators/ecosystem';
import { generateEcosystemWorker } from './generators/ecosystem-worker';
import { generateProcedural } from './generators/procedural';
import { generateProcedural3D } from './generators/procedural-3d';
import { generateFullGame } from './generators/fullgame';
import { generateFullGameElectron } from './generators/fullgame-electron';
import { generateTypography } from './generators/typography';
import { generateTypographyEnhanced } from './generators/typography-enhanced';
import { generateArchitecture } from './generators/architecture';
import { generateArchitecture3D } from './generators/architecture-3d';
import { generateVehicle } from './generators/vehicle';
import { generateVehicle3D } from './generators/vehicle-3d';
import { generateFurniture } from './generators/furniture';
import { generateFurniture3D } from './generators/furniture-3d';
import { generateFashion } from './generators/fashion';
import { generateFashion3D } from './generators/fashion-3d';
import { generateRobotics } from './generators/robotics';
import { generateRobotics3D } from './generators/robotics-3d';
import { generateCircuit } from './generators/circuit';
import { generateFood } from './generators/food';
import { generateFood3D } from './generators/food-3d';
import { generateChoreography } from './generators/choreography';
import { generateAlife } from './generators/alife';
import { generateALifeWorker } from './generators/alife-worker';
import { generateAgent } from './generators/agent';
import { dispatch as dispatchSeed, getDomains } from './engine-dispatcher.js';

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

export type { Seed, Artifact };

function geneVal(seed: Seed, name: string, fallback: any = null): any {
  return seed.genes?.[name]?.value ?? fallback;
}

// ─── PRIMARY ENGINES ──────────────────────────────────────────────────────────

async function growCharacter(seed: Seed): Promise<Artifact> {
  const outputDir = 'data/artifacts/character';
  const fileName = `${seed.$hash ?? 'unknown'}_${Date.now()}.gltf`;
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
  const fileName = `${seed.$hash ?? 'unknown'}_${Date.now()}_animated.png`;
  const outputPath = `${outputDir}/${fileName}`;

  let resolution = geneVal(seed, 'resolution', 32);
  if (typeof resolution === 'number' && resolution <= 1) resolution = Math.floor(resolution * 64);
  let paletteSize = geneVal(seed, 'paletteSize', 8);
  if (typeof paletteSize === 'number' && paletteSize <= 1) paletteSize = Math.floor(paletteSize * 16);
  const colors = geneVal(seed, 'colors', [0.8, 0.2, 0.3]);
  const symmetry = geneVal(seed, 'symmetry', 'bilateral');

  try {
    const result = await generateSpriteAnimated(seed, outputPath);
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
      render_hints: { mode: '2d_sprite', pixel_art: true, animated: true, hasFile: true },
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
  const fileName = `${seed.$hash ?? 'unknown'}_${Date.now()}_enhanced.wav`;
  const outputPath = `${outputDir}/${fileName}`;

  try {
    const result = await generateMusicEnhanced(seed, outputPath);
    return {
      type: 'music', name: seed.$name ?? 'Music', domain: 'music',
      seed_hash: seed.$hash ?? '', generation: seed.$lineage?.generation ?? 0,
      music: {
        tempo: +geneVal(seed, 'tempo', 0.5).toFixed(1),
        key: geneVal(seed, 'key', 'C'),
        scale: geneVal(seed, 'scale', 'major'),
        melody: geneVal(seed, 'melody', []),
        duration_ms: result.duration * 1000,
        sampleRate: result.sampleRate,
        tuning: seed.genes?.tuning?.value || 'a432',
      },
      artifact: { filePath: result.filePath, format: 'WAV (Stereo)', duration: result.duration, tuning: 'non-440Hz' },
      render_hints: { mode: 'audio_waveform', playable: true, hasFile: true, enhanced: true },
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
  const outputDir = 'data/artifacts/visual2d';
  const fileName = `${seed.$hash ?? 'unknown'}_${Date.now()}.svg`;
  const outputPath = `${outputDir}/${fileName}`;

  const style = geneVal(seed, 'style', 'abstract');
  const complexity = geneVal(seed, 'complexity', 0.5);
  const palette = geneVal(seed, 'palette', [0.5, 0.3, 0.8]);

  try {
    const result = await generateVisual2DSVG(seed, outputPath);
    return {
      type: 'visual2d', name: seed.$name ?? 'Visual', domain: 'visual2d',
      seed_hash: seed.$hash ?? '', generation: seed.$lineage?.generation ?? 0,
      visual: {
        style, complexity: typeof complexity === 'number' ? +complexity.toFixed(2) : complexity,
        palette: geneVal(seed, 'palette', [0.5, 0.3, 0.8]),
        composition: geneVal(seed, 'composition', 'centered'),
        layers: typeof complexity === 'number' ? Math.max(3, Math.floor(complexity * 10)) : 5,
      },
      artifact: { filePath: result.filePath, format: 'SVG', width: result.width, height: result.height },
      render_hints: { mode: '2d_svg', generative: true, hasFile: true, scalable: true },
    };
  } catch (err) {
    return {
      type: 'visual2d', name: seed.$name ?? 'Visual', domain: 'visual2d',
      seed_hash: seed.$hash ?? '', generation: seed.$lineage?.generation ?? 0,
      visual: { style, complexity, error: String(err) },
      render_hints: { mode: '2d_svg', generative: true, error: true },
    };
  }
}

async function growProcedural(seed: Seed): Promise<Artifact> {
  const outputDir = 'data/artifacts/procedural';
  const fileName = `${seed.$hash ?? 'unknown'}_${Date.now()}.gltf`;
  const outputPath = `${outputDir}/${fileName}`;

  let octaves = geneVal(seed, 'octaves', 4);
  if (typeof octaves === 'number' && octaves <= 1) octaves = Math.max(1, Math.floor(octaves * 8));

  try {
    const result = await generateProcedural3D(seed, outputPath);
    return {
      type: 'procedural', name: seed.$name ?? 'Terrain', domain: 'procedural',
      seed_hash: seed.$hash ?? '', generation: seed.$lineage?.generation ?? 0,
      terrain: {
        octaves, persistence: +(geneVal(seed, 'persistence', 0.5)).toFixed(3),
        scale: +(geneVal(seed, 'scale', 1.0)).toFixed(2),
        biome: geneVal(seed, 'biome', 'temperate'),
        heightmap_size: 256,
      },
      artifact: { filePath: result.filePath, format: 'GLTF', vertices: result.vertices, faces: result.faces },
      render_hints: { mode: '3d_terrain', interactive: true, hasFile: true, enhanced: true },
    };
  } catch (err) {
    return {
      type: 'procedural', name: seed.$name ?? 'Terrain', domain: 'procedural',
      seed_hash: seed.$hash ?? '', generation: seed.$lineage?.generation ?? 0,
      terrain: { error: String(err) },
      render_hints: { mode: '3d_terrain', interactive: true, error: true },
    };
  }
}

// ─── EXTENDED ENGINES ─────────────────────────────────────────────────────────

async function growFullgame(seed: Seed): Promise<Artifact> {
  const outputDir = 'data/artifacts/fullgame';
  const fileName = `${seed.$hash ?? 'unknown'}_${Date.now()}_electron.html`;
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
  const fileName = `${seed.$hash ?? 'unknown'}_${Date.now()}_enhanced.png`;
  const outputPath = `${outputDir}/${fileName}`;

  try {
    const result = await generateAnimationEnhanced(seed, outputPath);
    return {
      type: 'animation', name: seed.$name ?? 'Animation', domain: 'animation',
      seed_hash: seed.$hash ?? '', generation: seed.$lineage?.generation ?? 0,
      animation: { frame_count: Math.max(4, Math.floor(geneVal(seed, 'frameCount', 0.5) * 60)), fps: Math.max(8, Math.floor(geneVal(seed, 'fps', 0.5) * 60)), motion_type: geneVal(seed, 'motionType', 'skeletal'), loop: geneVal(seed, 'loop', 'loop') },
      artifact: { filePath: result.filePath, format: 'PNG', frameCount: result.frameCount, fps: result.fps },
      render_hints: { mode: 'animation_timeline', animated: true, hasFile: true, enhanced: true },
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
    // Use geometry3d generator to produce real GLTF files
    const result = await generateGeometry3D(seed, outputPath);
    return {
      type: 'geometry3d', name: seed.$name ?? '3D Object', domain: 'geometry3d',
      seed_hash: seed.$hash ?? '', generation: seed.$lineage?.generation ?? 0,
      mesh: {
        vertices: result.vertices,
        faces: result.faces,
        material: result.material,
      },
      artifact: { filePath: result.filePath, format: 'gltf-binary', size: result.fileSize },
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

async function growUi(seed: Seed): Promise<Artifact> {
  const outputDir = 'data/artifacts/ui';
  const fileName = `${seed.$hash ?? 'unknown'}_${Date.now()}_interactive.html`;
  const outputPath = `${outputDir}/${fileName}`;

    try {
      const result = await generateUI(seed, outputPath);
    return {
      type: 'ui', name: seed.$name ?? 'Interface', domain: 'ui',
      seed_hash: seed.$hash ?? '', generation: seed.$lineage?.generation ?? 0,
      interface: { layout: geneVal(seed, 'layout', 'dashboard'), theme: geneVal(seed, 'theme', 'dark'), components: geneVal(seed, 'components', ['header', 'sidebar', 'main']) },
      artifact: { filePath: result.filePath, format: 'HTML', interactive: true },
      render_hints: { mode: 'ui_preview', interactive: true, hasFile: true, html: true },
    };
  } catch (err) {
    return {
      type: 'ui', name: seed.$name ?? 'Interface', domain: 'ui',
      seed_hash: seed.$hash ?? '', generation: seed.$lineage?.generation ?? 0,
      interface: { error: String(err) },
      render_hints: { mode: 'ui_preview', interactive: true, error: true },
    };
  }
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
  const fileName = `${seed.$hash ?? 'unknown'}_${Date.now()}_worker.json`;
  const outputPath = `${outputDir}/${fileName}`;

  try {
    const result = await generateEcosystemWorker(seed, outputPath);
    return {
      type: 'ecosystem', name: seed.$name ?? 'Ecosystem', domain: 'ecosystem',
      seed_hash: seed.$hash ?? '', generation: seed.$lineage?.generation ?? 0,
      ecosystem: {
        speciesCount: geneVal(seed, 'speciesCount', 10),
        foodWebComplexity: +(geneVal(seed, 'foodWebComplexity', 0.5)).toFixed(2),
        climateZones: geneVal(seed, 'climateZones', 3),
        timeSteps: 1000,
      },
      artifact: { filePath: result.filePath, format: 'JSON', speciesCount: result.speciesCount, workerScript: true },
      render_hints: { mode: 'ecosystem_simulation', animated: true, hasFile: true, workerReady: true },
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
  const fileName = `${seed.$hash ?? 'unknown'}_${Date.now()}_wasm.js`;
  const outputPath = `${outputDir}/${fileName}`;

  try {
    const result = await generateGameWASM(seed, outputPath);
    return {
      type: 'game', name: seed.$name ?? 'Game', domain: 'game',
      seed_hash: seed.$hash ?? '', generation: seed.$lineage?.generation ?? 0,
      game: {
        genre: geneVal(seed, 'genre', 'platformer'),
        difficulty: geneVal(seed, 'difficulty', 0.5),
        levelCount: geneVal(seed, 'levelCount', 5),
        hasPowerups: geneVal(seed, 'hasPowerups', true),
        hasObstacles: geneVal(seed, 'hasObstacles', true),
        hasBoss: geneVal(seed, 'hasBoss', false),
      },
      artifact: { filePath: result.filePath, format: 'JS+WASM', size: result.size, wasmPath: result.wasmPath },
      render_hints: { mode: 'game_logic', interactive: true, hasFile: true, wasmReady: true },
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

async function growAlife(seed: Seed): Promise<Artifact> {
  const outputDir = 'data/artifacts/alife';
  const fileName = `${seed.$hash ?? 'unknown'}_${Date.now()}_worker.json`;
  const outputPath = `${outputDir}/${fileName}`;

  let populationSize = geneVal(seed, 'populationSize', 50);
  if (typeof populationSize === 'number' && populationSize <= 1) populationSize = Math.max(10, Math.floor(populationSize * 100));

  try {
    const result = await generateALifeWorker(seed, outputPath);
    return {
      type: 'alife', name: seed.$name ?? 'Ecosystem', domain: 'alife',
      seed_hash: seed.$hash ?? '', generation: seed.$lineage?.generation ?? 0,
      simulation: {
        populationSize, mutationRate: +(geneVal(seed, 'mutationRate', 0.1)).toFixed(3),
        environment: geneVal(seed, 'environment', 'forest'),
        timeSteps: 1000,
      },
      artifact: { filePath: result.filePath, format: 'JSON', entityCount: result.entityCount, workerScript: true },
      render_hints: { mode: 'life_simulation', animated: true, hasFile: true, workerReady: true },
    };
  } catch (err) {
    return {
      type: 'alife', name: seed.$name ?? 'Artificial Life', domain: 'alife',
      seed_hash: seed.$hash ?? '', generation: seed.$lineage?.generation ?? 0,
      alife: { error: String(err) },
      render_hints: { mode: 'cellular_automata', animated: true, error: true },
    };
  }
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
  const fileName = `${seed.$hash ?? 'unknown'}_${Date.now()}_gpu.json`;
  const outputPath = `${outputDir}/${fileName}`;

  try {
    const result = await generateParticleGPU(seed, outputPath);
    return {
      type: 'particle', name: seed.$name ?? 'Particle System', domain: 'particle',
      seed_hash: seed.$hash ?? '', generation: seed.$lineage?.generation ?? 0,
      particle: {
        count: geneVal(seed, 'count', 100),
        emitterType: geneVal(seed, 'emitterType', 'point'),
        particleType: geneVal(seed, 'particleType', 'spark'),
        lifetime: +(geneVal(seed, 'lifetime', 2.0)).toFixed(1),
        speed: +(geneVal(seed, 'speed', 5.0)).toFixed(1),
        spread: +(geneVal(seed, 'spread', 1.0)).toFixed(1),
      },
      artifact: { filePath: result.filePath, format: 'JSON+GLSL+WGSL', particleCount: result.particleCount, gpuReady: true },
      render_hints: { mode: 'particle_system', animated: true, hasFile: true, gpuReady: true },
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

async function growTypography(seed: Seed): Promise<Artifact> {
  const outputDir = 'data/artifacts/typography';
  const fileName = `${seed.$hash ?? 'unknown'}_${Date.now()}_enhanced.json`;
  const outputPath = `${outputDir}/${fileName}`;

  try {
    const result = await generateTypographyEnhanced(seed, outputPath);
    return {
      type: 'typography', name: seed.$name ?? 'Text', domain: 'typography',
      seed_hash: seed.$hash ?? '', generation: seed.$lineage?.generation ?? 0,
      text: {
        fontFamily: geneVal(seed, 'fontFamily', 'Arial'),
        weight: geneVal(seed, 'weight', 400),
        style: geneVal(seed, 'style', 'normal'),
        size: geneVal(seed, 'size', 24),
        text: geneVal(seed, 'text', 'Hello World'),
      },
      artifact: { filePath: result.filePath, format: 'JSON+SVG+CSS+HTML', svgPath: result.svgPath, fontPath: result.fontPath },
      render_hints: { mode: 'text_svg', interactive: true, hasFile: true, enhanced: true },
    };
  } catch (err) {
    return {
      type: 'typography', name: seed.$name ?? 'Typeface', domain: 'typography',
      seed_hash: seed.$hash ?? '', generation: seed.$lineage?.generation ?? 0,
      typography: { error: String(err) },
      render_hints: { mode: 'type_specimen', error: true },
    };
  }
}

async function growArchitecture(seed: Seed): Promise<Artifact> {
  const outputDir = 'data/artifacts/architecture';
  const fileName = `${seed.$hash ?? 'unknown'}_${Date.now()}.gltf`;
  const outputPath = `${outputDir}/${fileName}`;

  try {
    const result = await generateArchitecture3D(seed, outputPath);
    return {
      type: 'architecture', name: seed.$name ?? 'Building', domain: 'architecture',
      seed_hash: seed.$hash ?? '', generation: seed.$lineage?.generation ?? 0,
      building: {
        buildingType: geneVal(seed, 'buildingType', 'residential'),
        floors: geneVal(seed, 'floors', 3),
        footprint: geneVal(seed, 'footprint', [10, 10]),
        style: geneVal(seed, 'style', 'modern'),
        hasDetails: geneVal(seed, 'hasDetails', true),
      },
      artifact: { filePath: result.filePath, format: 'GLTF', vertices: result.vertices, materials: result.materials },
      render_hints: { mode: 'building_3d', interactive: true, hasFile: true, enhanced: true },
    };
  } catch (err) {
    return {
      type: 'architecture', name: seed.$name ?? 'Building', domain: 'architecture',
      seed_hash: seed.$hash ?? '', generation: seed.$lineage?.generation ?? 0,
      building: { error: String(err) },
      render_hints: { mode: 'building_viewer', rotatable: true, error: true },
    };
  }
}

async function growVehicle(seed: Seed): Promise<Artifact> {
  const outputDir = 'data/artifacts/vehicle';
  const fileName = `${seed.$hash ?? 'unknown'}_${Date.now()}.gltf`;
  const outputPath = `${outputDir}/${fileName}`;

  try {
    const result = await generateVehicle3D(seed, outputPath);
    return {
      type: 'vehicle', name: seed.$name ?? 'Vehicle', domain: 'vehicle',
      seed_hash: seed.$hash ?? '', generation: seed.$lineage?.generation ?? 0,
      vehicle: {
        vehicleType: geneVal(seed, 'vehicleType', 'car'),
        style: geneVal(seed, 'style', 'modern'),
        wheelCount: geneVal(seed, 'wheelCount', 4),
        hasDetails: geneVal(seed, 'hasDetails', true),
      },
      artifact: { filePath: result.filePath, format: 'GLTF', vertices: result.vertices, parts: result.parts },
      render_hints: { mode: 'vehicle_3d', interactive: true, hasFile: true, enhanced: true },
    };
  } catch (err) {
    return {
      type: 'vehicle', name: seed.$name ?? 'Vehicle', domain: 'vehicle',
      seed_hash: seed.$hash ?? '', generation: seed.$lineage?.generation ?? 0,
      vehicle: { error: String(err) },
      render_hints: { mode: 'vehicle_showcase', rotatable: true, error: true },
    };
  }
}

async function growFurniture(seed: Seed): Promise<Artifact> {
  const outputDir = 'data/artifacts/furniture';
  const fileName = `${seed.$hash ?? 'unknown'}_${Date.now()}.gltf`;
  const outputPath = `${outputDir}/${fileName}`;

  try {
    const result = await generateFurniture3D(seed, outputPath);
    return {
      type: 'furniture', name: seed.$name ?? 'Furniture', domain: 'furniture',
      seed_hash: seed.$hash ?? '', generation: seed.$lineage?.generation ?? 0,
      furniture: {
        furnitureType: geneVal(seed, 'furnitureType', 'chair'),
        style: geneVal(seed, 'style', 'modern'),
        dimensions: geneVal(seed, 'dimensions', [1, 1, 1]),
        hasDetails: geneVal(seed, 'hasDetails', true),
      },
      artifact: { filePath: result.filePath, format: 'GLTF', vertices: result.vertices, parts: result.parts },
      render_hints: { mode: 'furniture_3d', interactive: true, hasFile: true, enhanced: true },
    };
  } catch (err) {
    return {
      type: 'furniture', name: seed.$name ?? 'Furniture', domain: 'furniture',
      seed_hash: seed.$hash ?? '', generation: seed.$lineage?.generation ?? 0,
      furniture: { error: String(err) },
      render_hints: { mode: 'furniture_viewer', rotatable: true, error: true },
    };
  }
}

async function growFashion(seed: Seed): Promise<Artifact> {
  const outputDir = 'data/artifacts/fashion';
  const fileName = `${seed.$hash ?? 'unknown'}_${Date.now()}.gltf`;
  const outputPath = `${outputDir}/${fileName}`;

  try {
    const result = await generateFashion3D(seed, outputPath);
    return {
      type: 'fashion', name: seed.$name ?? 'Garment', domain: 'fashion',
      seed_hash: seed.$hash ?? '', generation: seed.$lineage?.generation ?? 0,
      garment: {
        clothingType: geneVal(seed, 'clothingType', 'shirt'),
        style: geneVal(seed, 'style', 'casual'),
        size: geneVal(seed, 'size', 'M'),
        hasDetails: geneVal(seed, 'hasDetails', true),
      },
      artifact: { filePath: result.filePath, format: 'GLTF', vertices: result.vertices, garments: result.garments },
      render_hints: { mode: 'fashion_3d', interactive: true, hasFile: true, enhanced: true },
    };
  } catch (err) {
    return {
      type: 'fashion', name: seed.$name ?? 'Garment', domain: 'fashion',
      seed_hash: seed.$hash ?? '', generation: seed.$lineage?.generation ?? 0,
      garment: { error: String(err) },
      render_hints: { mode: 'fashion_sketch', error: true },
    };
  }
}

async function growRobotics(seed: Seed): Promise<Artifact> {
  const outputDir = 'data/artifacts/robotics';
  const fileName = `${seed.$hash ?? 'unknown'}_${Date.now()}.gltf`;
  const outputPath = `${outputDir}/${fileName}`;

  let armCount = geneVal(seed, 'armCount', 2);
  if (typeof armCount === 'number' && armCount <= 1) armCount = Math.max(2, Math.floor(armCount * 10));

  try {
    const result = await generateRobotics3D(seed, outputPath);
    return {
      type: 'robotics', name: seed.$name ?? 'Robot', domain: 'robotics',
      seed_hash: seed.$hash ?? '', generation: seed.$lineage?.generation ?? 0,
      robot: {
        robotType: geneVal(seed, 'robotType', 'humanoid'),
        mobility: geneVal(seed, 'mobility', 'wheels'),
        armCount, hasDetails: geneVal(seed, 'hasDetails', true),
      },
      artifact: { filePath: result.filePath, format: 'GLTF', vertices: result.vertices, parts: result.parts },
      render_hints: { mode: 'robot_3d', interactive: true, hasFile: true, enhanced: true },
    };
  } catch (err) {
    return {
      type: 'robotics', name: seed.$name ?? 'Robot', domain: 'robotics',
      seed_hash: seed.$hash ?? '', generation: seed.$lineage?.generation ?? 0,
      robot: { error: String(err) },
      render_hints: { mode: 'robot_schematic', error: true },
    };
  }
}

async function growCircuit(seed: Seed): Promise<Artifact> {
  const outputDir = 'data/artifacts/circuit';
  const fileName = `${seed.$hash ?? 'unknown'}_${Date.now()}_interactive.html`;
  const outputPath = `${outputDir}/${fileName}`;

    try {
      const result = await generateCircuit(seed, outputPath);
    return {
      type: 'circuit', name: seed.$name ?? 'Circuit', domain: 'circuit',
      seed_hash: seed.$hash ?? '', generation: seed.$lineage?.generation ?? 0,
      circuit: {
        circuitType: geneVal(seed, 'circuitType', 'amplifier'),
        componentCount: geneVal(seed, 'componentCount', 5),
        isDigital: geneVal(seed, 'isDigital', false),
        hasSimulation: geneVal(seed, 'hasSimulation', true),
      },
      artifact: { filePath: result.filePath, format: 'HTML+SVG+SPICE', componentCount: result.componentCount, interactive: true },
      render_hints: { mode: 'circuit_simulator', interactive: true, hasFile: true, enhanced: true },
    };
  } catch (err) {
    return {
      type: 'circuit', name: seed.$name ?? 'Circuit', domain: 'circuit',
      seed_hash: seed.$hash ?? '', generation: seed.$lineage?.generation ?? 0,
      circuit: { error: String(err) },
      render_hints: { mode: 'circuit_diagram', error: true },
    };
  }
}

async function growFood(seed: Seed): Promise<Artifact> {
  const outputDir = 'data/artifacts/food';
  const fileName = `${seed.$hash ?? 'unknown'}_${Date.now()}.gltf`;
  const outputPath = `${outputDir}/${fileName}`;

  try {
    const result = await generateFood3D(seed, outputPath);
    return {
      type: 'food', name: seed.$name ?? 'Food', domain: 'food',
      seed_hash: seed.$hash ?? '', generation: seed.$lineage?.generation ?? 0,
      food: {
        foodType: geneVal(seed, 'foodType', 'apple'),
        style: geneVal(seed, 'style', 'realistic'),
        size: geneVal(seed, 'size', 1.0),
        hasDetails: geneVal(seed, 'hasDetails', true),
      },
      artifact: { filePath: result.filePath, format: 'GLTF', vertices: result.vertices, items: result.items },
      render_hints: { mode: 'food_3d', interactive: true, hasFile: true, enhanced: true },
    };
  } catch (err) {
    return {
      type: 'food', name: seed.$name ?? 'Dish', domain: 'food',
      seed_hash: seed.$hash ?? '', generation: seed.$lineage?.generation ?? 0,
      dish: { error: String(err) },
      render_hints: { mode: 'food_photography', error: true },
    };
  }
}

async function growChoreography(seed: Seed): Promise<Artifact> {
  const outputDir = 'data/artifacts/choreography';
  const fileName = `${seed.$hash ?? 'unknown'}_${Date.now()}_motion.json`;
  const outputPath = `${outputDir}/${fileName}`;

    try {
      const result = await generateChoreography(seed, outputPath);
    return {
      type: 'choreography', name: seed.$name ?? 'Dance', domain: 'choreography',
      seed_hash: seed.$hash ?? '', generation: seed.$lineage?.generation ?? 0,
      dance: {
        style: geneVal(seed, 'style', 'ballet'),
        tempo: geneVal(seed, 'tempo', 0.5),
        complexity: geneVal(seed, 'complexity', 0.5),
        duration: geneVal(seed, 'duration', 60),
      },
      artifact: { filePath: result.filePath, format: 'JSON+BVH+HTML', moveCount: result.moveCount },
      render_hints: { mode: 'dance_motion', hasFile: true, enhanced: true },
    };
  } catch (err) {
    return {
      type: 'choreography', name: seed.$name ?? 'Dance', domain: 'choreography',
      seed_hash: seed.$hash ?? '', generation: seed.$lineage?.generation ?? 0,
      dance: { error: String(err) },
      render_hints: { mode: 'dance_timeline', error: true },
    };
  }
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
async function growAgent(seed: Seed): Promise<Artifact> {
  const outputDir = 'data/artifacts/agent';
  const fileName = `${seed.$hash ?? 'unknown'}_${Date.now()}.json`;
  const outputPath = `${outputDir}/${fileName}`;

  const persona = geneVal(seed, 'persona', 'architect');
  const name = seed.$name ?? 'Agent';

  try {
    const result = await generateAgent(seed, outputPath);
    return {
      type: 'agent', name, domain: 'agent',
      seed_hash: seed.$hash ?? '', generation: seed.$lineage?.generation ?? 0,
      config: {
        persona, name,
        temperature: +(geneVal(seed, 'temperature', 0.7)).toFixed(2),
        reasoningDepth: +(geneVal(seed, 'reasoning_depth', 0.5)).toFixed(2),
        explorationRate: +(geneVal(seed, 'exploration_rate', 0.5)).toFixed(2),
        maxSteps: Math.floor(geneVal(seed, 'max_steps', 10)),
      },
      artifact: { filePath: result.filePath, format: 'JSON', configSize: result.configSize },
      render_hints: { mode: 'chat_interface', color_scheme: 'dark', animated: false, hasFile: true },
    };
  } catch (err) {
    return {
      type: 'agent', name, domain: 'agent',
      seed_hash: seed.$hash ?? '', generation: seed.$lineage?.generation ?? 0,
      config: { error: String(err) },
      render_hints: { mode: 'chat_interface', color_scheme: 'dark', animated: false, error: true },
    };
  }
}

// ─── ENGINE REGISTRY ──────────────────────────────────────────────────────────
// ─── 27th DOMAIN: AGENT ─────────────────────────────────────────────────────

// ─── ENGINE REGISTRY ──────────────────────────────────────────────────────────
export const ENGINES: Record<string, (seed: Seed) => Promise<Artifact>> = {
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

export function growSeedSync(seed: Seed): Artifact {
  const domain = seed.$domain ?? 'character';
  const artifact = growGeneric(seed);
  artifact.type = domain;
  artifact.name = seed.$name ?? `${domain.charAt(0).toUpperCase() + domain.slice(1)} Artifact`;
  artifact.domain = domain;
  artifact.render_hints = { mode: domain, description_only: true };

  if (domain === 'agent') {
    artifact.config = { fallback: true };
    artifact.render_hints = { mode: 'chat_interface', color_scheme: 'dark', animated: false, hasFile: false };
  }

  return artifact;
}

export async function growSeed(seed: Seed): Promise<Artifact> {
  const domain = seed.$domain ?? 'character';
  
  // Use engine-dispatcher for all 103+ domains
  try {
    const outputDir = `data/artifacts/${domain}`;
    const result = await dispatchSeed(seed, outputDir);
    return {
      type: domain,
      name: seed.$name ?? 'Artifact',
      domain,
      seed_hash: seed.$hash ?? '',
      generation: seed.$lineage?.generation ?? 0,
      ...result,
      render_hints: { mode: domain, hasFile: !!result }
    };
  } catch (err) {
    console.error(`Error growing seed for domain ${domain}:`, err);
    // Fallback to legacy engine
    const engine = ENGINES[domain] ?? growGeneric;
    const result = engine(seed);
    return result instanceof Promise ? await result : result;
  }
}

export function getAllDomains(): string[] {
  return Object.keys(ENGINES).sort();
}

// Re-export V2 generators (using lazy imports to avoid errors)
// These are re-exported for backward compatibility
export async function getGenerator(domain: string) {
  const generators: Record<string, () => Promise<any>> = {
    character: () => import('./generators/character-v3').then(m => m.generateCharacterV3),
    sprite: () => import('./generators/sprite-v2').then(m => m.generateSpriteV2),
    music: () => import('./generators/music-v2').then(m => m.generateMusicV2),
    visual2d: () => import('./generators/visual2d-v2').then(m => m.generateVisual2DV2),
    game: () => import('./generators/game-v2').then(m => m.generateGameV2),
    geometry3d: () => import('./generators/geometry3d').then(m => m.generateGeometry3D),
    // Add more as needed
  };

  const loader = generators[domain];
  if (!loader) return null;
  return loader();
}

export { WebGPUGeneratorSystem } from './generators/webgpu-system';

// Re-export GSPL
export { GsplLexer, TokenType } from './gspl-lexer';
export { GsplParser, ASTNodeType } from './gspl-parser';
export { GsplInterpreter, executeGspl } from './gspl-interpreter';

// Re-export Phase 4: Binary Format & Sovereignty
export { encodeGseed, decodeGseed, createGseed, SectionType, OutputType } from './binary-format';
export type { GseedPackage } from './binary-format';
export { buildC2PAManifest, verifyC2PAManifest } from './c2pa-manifest';
export type { C2PAClaim } from './c2pa-manifest';
export type { RoyaltyConfig, RoyaltySplit } from './royalty-system';
export { createDefaultRoyaltyConfig, validateRoyaltyConfig, ROYALTY_ABI } from './royalty-system';
