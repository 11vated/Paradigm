import type { DomainConfig } from './types';
import type { GeneratorOutput, Seed } from './types';

// Generator imports
import { generateCharacterV3 as generateCharacter } from '../generators/character-v3';
import { generateSpriteAnimated } from '../generators/sprite-animated';
import { generateMusicV2 as generateMusic } from '../generators/music-v2';
import { generateVisual2DV2 as generateVisual2D } from '../generators/visual2d-v2';
import { generateNarrative } from '../generators/narrative';
import { generateUI } from '../generators/ui';
import { generateGameV2 as generateGame } from '../generators/game-v2';
import { generateGeometry3D } from '../generators/geometry3d';
import { generateAnimation } from '../generators/animation';
import { generateAnimationEnhanced } from '../generators/animation-enhanced';
import { generateShader } from '../generators/shader';
import { generateShaderEnhanced } from '../generators/shader-enhanced';
import { generateParticle } from '../generators/particle';
import { generateParticleGPU } from '../generators/particle-gpu';
import { generateEcosystem } from '../generators/ecosystem';
import { generateEcosystemWorker } from '../generators/ecosystem-worker';
import { generateProcedural } from '../generators/procedural';
import { generateProcedural3D } from '../generators/procedural-3d';
import { generateFullGame } from '../generators/fullgame';
import { generateTypography } from '../generators/typography';
import { generateTypographyEnhanced } from '../generators/typography-enhanced';
import { generateArchitecture } from '../generators/architecture';
import { generateArchitecture3D } from '../generators/architecture-3d';
import { generateVehicle } from '../generators/vehicle';
import { generateVehicle3D } from '../generators/vehicle-3d';
import { generateFurniture } from '../generators/furniture';
import { generateFurniture3D } from '../generators/furniture-3d';
import { generateFashion } from '../generators/fashion';
import { generateFashion3D } from '../generators/fashion-3d';
import { generateRobotics } from '../generators/robotics';
import { generateRobotics3D } from '../generators/robotics-3d';
import { generateCircuit } from '../generators/circuit';
import { generateFood } from '../generators/food';
import { generateFood3D } from '../generators/food-3d';
import { generateChoreography } from '../generators/choreography';
import { generateAlife } from '../generators/alife';
import { generateAlifeWorker } from '../generators/alife-worker';
import { generateAgent } from '../generators/agent';
import { generatePhysics } from '../generators/physics';
import { generatePhysicsEnhanced } from '../generators/physics-enhanced';
import { generateAudio } from '../generators/audio';

function geneVal(seed: Seed, name: string, fallback: unknown = null): unknown {
  return seed.genes?.[name]?.value ?? fallback;
}

function geneNumber(seed: Seed, name: string, fallback: number): number {
  const value = geneVal(seed, name, fallback);
  return typeof value === 'number' ? value : fallback;
}

function geneArray(seed: Seed, name: string, fallback: number[]): number[] {
  const value = geneVal(seed, name, fallback);
  return Array.isArray(value) ? value : fallback;
}

export const DOMAIN_CONFIGS: DomainConfig[] = [
  {
    domain: 'character', version: 'v3', outputExtension: 'gltf',
    generator: (s, p) => generateCharacter(s, p),
    postProcess: (o: GeneratorOutput, s: Seed) => ({
      archetype: geneVal(s, 'archetype', 'warrior'),
      visual: {
        body_width: +(0.3 + geneNumber(s, 'strength', 0.5) * 0.4).toFixed(2),
        body_height: +(geneNumber(s, 'size', 1.0) * 0.8).toFixed(2),
        size_factor: +geneNumber(s, 'size', 1.0).toFixed(2),
      },
      stats: {
        strength: Math.round(geneNumber(s, 'strength', 0.5) * 100),
        agility: Math.round(geneNumber(s, 'agility', 0.5) * 100),
        speed: +(geneNumber(s, 'agility', 0.5) * 10).toFixed(1),
        hp: Math.round(100 + geneNumber(s, 'strength', 0.5) * 200),
      },
      personality: geneVal(s, 'personality', 'neutral'),
      render_hints: { mode: '3d_character', animated: true },
    }),
  },
  {
    domain: 'sprite', version: 'v2', outputExtension: 'png',
    generator: (s, p) => generateSpriteAnimated(s, p),
    postProcess: (o: GeneratorOutput, s: Seed) => {
      let resolution = geneNumber(s, 'resolution', 32);
      if (resolution <= 1) resolution = Math.floor(resolution * 64);
      let paletteSize = geneNumber(s, 'paletteSize', 8);
      if (paletteSize <= 1) paletteSize = Math.floor(paletteSize * 16);
      const colors = geneArray(s, 'colors', [0.8, 0.2, 0.3]);
      return {
        visual: {
          resolution: Math.max(8, Math.min(resolution, 128)),
          palette_size: Math.max(2, Math.min(paletteSize, 32)),
          primary_color: `hsl(${Math.floor((colors[0] ?? 0.5) * 360)}, 70%, 50%)`,
          secondary_color: `hsl(${Math.floor((colors[1] ?? 0.25) * 360)}, 60%, 40%)`,
          symmetry: geneVal(s, 'symmetry', 'bilateral'),
        },
        render_hints: { mode: '2d_sprite', pixel_art: true, animated: true },
      };
    },
  },
  {
    domain: 'music', version: 'v2', outputExtension: 'wav',
    generator: async (s, p) => {
      const fs = await import('fs');
      const dir = 'data/artifacts/music';
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      const { generateMusicEnhanced } = await import('../generators/music-enhanced');
      return generateMusicEnhanced(s, p);
    },
    postProcess: (o: GeneratorOutput, s: Seed) => {
      const res = o as any;
      return {
        music: {
          tempo: +geneNumber(s, 'tempo', 0.5).toFixed(1),
          key: geneVal(s, 'key', 'C'),
          scale: geneVal(s, 'scale', 'major'),
          duration_ms: res.duration ? res.duration * 1000 : 0,
          sampleRate: res.sampleRate || 44100,
        },
        render_hints: { mode: 'audio_waveform', playable: true },
      };
    },
  },
  {
    domain: 'visual2d', version: 'v2', outputExtension: 'svg',
    generator: (s, p) => generateVisual2D(s, p),
    postProcess: (o: GeneratorOutput, s: Seed) => ({
      visual: {
        style: geneVal(s, 'style', 'abstract'),
        complexity: +geneNumber(s, 'complexity', 0.5).toFixed(2),
        palette: geneVal(s, 'palette', [0.5, 0.3, 0.8]),
        composition: geneVal(s, 'composition', 'centered'),
        layers: Math.max(3, Math.floor(geneNumber(s, 'complexity', 0.5) * 10)),
      },
      render_hints: { mode: '2d_svg', generative: true, scalable: true },
    }),
  },
  {
    domain: 'procedural', version: 'v3', outputExtension: 'gltf',
    generator: (s, p) => generateProcedural3D(s, p),
    postProcess: (o: GeneratorOutput, s: Seed) => {
      let octaves = geneNumber(s, 'octaves', 4);
      if (octaves <= 1) octaves = Math.max(1, Math.floor(octaves * 8));
      return {
        terrain: {
          octaves, persistence: +geneNumber(s, 'persistence', 0.5).toFixed(3),
          scale: +geneNumber(s, 'scale', 1.0).toFixed(2),
          biome: geneVal(s, 'biome', 'temperate'),
          heightmap_size: 256,
        },
        render_hints: { mode: '3d_terrain', interactive: true },
      };
    },
  },
  {
    domain: 'fullgame', version: 'v1', outputExtension: 'html',
    generator: async (s, p) => generateFullGame(s, p),
    postProcess: (o: GeneratorOutput, s: Seed) => ({
      game: {
        genre: geneVal(s, 'genre', 'action'),
        difficulty: +geneNumber(s, 'difficulty', 0.5).toFixed(2),
        levels: Math.max(3, Math.floor(geneNumber(s, 'levelCount', 0.5) * 20)),
        mechanics: geneVal(s, 'mechanics', ['action']),
      },
      render_hints: { mode: 'game_preview', interactive: true },
    }),
  },
  {
    domain: 'animation', version: 'enhanced', outputExtension: 'png',
    generator: (s, p) => generateAnimationEnhanced(s, p),
    postProcess: (o: GeneratorOutput, s: Seed) => ({
      animation: {
        frame_count: Math.max(4, Math.floor(geneNumber(s, 'frameCount', 0.5) * 60)),
        fps: Math.max(8, Math.floor(geneNumber(s, 'fps', 0.5) * 60)),
        motion_type: geneVal(s, 'motionType', 'skeletal'),
        loop: geneVal(s, 'loop', 'loop'),
      },
      render_hints: { mode: 'animation_timeline', animated: true },
    }),
  },
  {
    domain: 'geometry3d', version: 'v1', outputExtension: 'gltf',
    generator: (s, p) => generateGeometry3D(s, p) as any,
    postProcess: (o: any, s: Seed) => ({
      mesh: {
        vertices: o.vertices, faces: o.faces, material: o.material,
      },
      render_hints: { mode: '3d_viewport', rotatable: true },
    }),
  },
  {
    domain: 'narrative', version: 'v1', outputExtension: 'txt',
    generator: (s, p) => generateNarrative(s, p),
    postProcess: (o: any, s: Seed) => ({
      story: {
        structure: geneVal(s, 'structure', 'heros_journey'),
        tone: geneVal(s, 'tone', 'epic'),
        characters: geneVal(s, 'characters', ['hero', 'villain']),
        plot: geneVal(s, 'plot', 'quest'),
        acts: 3,
      },
      render_hints: { mode: 'narrative_flow', readable: true },
    }),
  },
  {
    domain: 'ui', version: 'v1', outputExtension: 'html',
    generator: (s, p) => generateUI(s, p),
    postProcess: (o: any, s: Seed) => ({
      interface: {
        layout: geneVal(s, 'layout', 'dashboard'),
        theme: geneVal(s, 'theme', 'dark'),
        components: geneVal(s, 'components', ['header', 'sidebar', 'main']),
      },
      render_hints: { mode: 'ui_preview', interactive: true, html: true },
    }),
  },
  {
    domain: 'physics', version: 'enhanced', outputExtension: 'json',
    generator: (s, p) => generatePhysics(s, p),
    postProcess: (o: any, s: Seed) => ({
      simulation: {
        gravity: +(geneNumber(s, 'gravity', 0.5) * 20).toFixed(2),
        friction: geneVal(s, 'friction', 0.3),
        elasticity: geneVal(s, 'elasticity', 0.8),
        type: geneVal(s, 'simulationType', 'rigid_body'),
      },
      render_hints: { mode: 'physics_sim', animated: true },
    }),
  },
  {
    domain: 'audio', version: 'v1', outputExtension: 'wav',
    generator: async (s, p) => {
      const { generateAudio } = await import('../generators/audio');
      return generateAudio(s, p);
    },
    postProcess: (o: any, s: Seed) => ({
      audio: {
        type: geneVal(s, 'soundType', 'sfx'),
        duration_ms: o.duration ? o.duration * 1000 : 0,
        frequency: geneVal(s, 'frequency', 432),
        sampleRate: o.sampleRate || 44100,
      },
      render_hints: { mode: 'audio_waveform', playable: true },
    }),
  },
  {
    domain: 'ecosystem', version: 'worker', outputExtension: 'json',
    generator: (s, p) => generateEcosystemWorker(s, p),
    postProcess: (o: any, s: Seed) => ({
      ecosystem: {
        speciesCount: geneNumber(s, 'speciesCount', 10),
        foodWebComplexity: +geneNumber(s, 'foodWebComplexity', 0.5).toFixed(2),
        climateZones: geneNumber(s, 'climateZones', 3),
      },
      render_hints: { mode: 'ecosystem_simulation', animated: true, workerReady: true },
    }),
  },
  {
    domain: 'game', version: 'v2', outputExtension: 'js',
    generator: async (s, p) => {
      const { generateGameWASM } = await import('../generators/game-wasm');
      return generateGameWASM(s, p);
    },
    postProcess: (o: any, s: Seed) => ({
      game: {
        genre: geneVal(s, 'genre', 'platformer'),
        difficulty: geneVal(s, 'difficulty', 0.5),
        levelCount: geneVal(s, 'levelCount', 5),
        hasPowerups: geneVal(s, 'hasPowerups', true),
      },
      render_hints: { mode: 'game_logic', interactive: true, wasmReady: true },
    }),
  },
  {
    domain: 'alife', version: 'worker', outputExtension: 'json',
    generator: (s, p) => generateAlife(s, p) as Promise<GeneratorOutput>,
    postProcess: (o: any, s: Seed) => {
      let populationSize = geneNumber(s, 'populationSize', 50);
      if (populationSize <= 1) populationSize = Math.max(10, Math.floor(populationSize * 100));
      return {
        simulation: {
          populationSize, mutationRate: +geneNumber(s, 'mutationRate', 0.1).toFixed(3),
          environment: geneVal(s, 'environment', 'forest'),
        },
        render_hints: { mode: 'life_simulation', animated: true, workerReady: true },
      };
    },
  },
  {
    domain: 'shader', version: 'enhanced', outputExtension: 'frag',
    generator: (s, p) => generateShader(s, p),
    postProcess: (o: any, s: Seed) => ({
      shader: {
        type: geneVal(s, 'shaderType', 'fragment'),
        technique: geneVal(s, 'technique', 'raymarching'),
      },
      render_hints: { mode: 'shader_preview', realtime: true },
    }),
  },
  {
    domain: 'particle', version: 'gpu', outputExtension: 'json',
    generator: (s, p) => generateParticleGPU(s, p),
    postProcess: (o: any, s: Seed) => ({
      particle: {
        count: geneNumber(s, 'count', 100),
        emitterType: geneVal(s, 'emitterType', 'point'),
        particleType: geneVal(s, 'particleType', 'spark'),
        lifetime: +geneNumber(s, 'lifetime', 2.0).toFixed(1),
      },
      render_hints: { mode: 'particle_system', animated: true, gpuReady: true },
    }),
  },
  {
    domain: 'typography', version: 'enhanced', outputExtension: 'json',
    generator: (s, p) => generateTypographyEnhanced(s, p),
    postProcess: (o: any, s: Seed) => ({
      text: {
        fontFamily: geneVal(s, 'fontFamily', 'Arial'),
        weight: geneVal(s, 'weight', 400),
        style: geneVal(s, 'style', 'normal'),
        size: geneVal(s, 'size', 24),
        text: geneVal(s, 'text', 'Hello World'),
      },
      render_hints: { mode: 'text_svg', interactive: true },
    }),
  },
  {
    domain: 'architecture', version: 'v3', outputExtension: 'gltf',
    generator: (s, p) => generateArchitecture3D(s, p),
    postProcess: (o: any, s: Seed) => ({
      building: {
        buildingType: geneVal(s, 'buildingType', 'residential'),
        floors: geneVal(s, 'floors', 3),
        footprint: geneVal(s, 'footprint', [10, 10]),
        style: geneVal(s, 'style', 'modern'),
      },
      render_hints: { mode: 'building_3d', interactive: true },
    }),
  },
  {
    domain: 'vehicle', version: 'v3', outputExtension: 'gltf',
    generator: (s, p) => generateVehicle3D(s, p),
    postProcess: (o: any, s: Seed) => ({
      vehicle: {
        vehicleType: geneVal(s, 'vehicleType', 'car'),
        style: geneVal(s, 'style', 'modern'),
        wheelCount: geneVal(s, 'wheelCount', 4),
      },
      render_hints: { mode: 'vehicle_3d', interactive: true },
    }),
  },
  {
    domain: 'furniture', version: 'v3', outputExtension: 'gltf',
    generator: (s, p) => generateFurniture3D(s, p),
    postProcess: (o: any, s: Seed) => ({
      furniture: {
        furnitureType: geneVal(s, 'furnitureType', 'chair'),
        style: geneVal(s, 'style', 'modern'),
        dimensions: geneVal(s, 'dimensions', [1, 1, 1]),
      },
      render_hints: { mode: 'furniture_3d', interactive: true },
    }),
  },
  {
    domain: 'fashion', version: 'v3', outputExtension: 'gltf',
    generator: (s, p) => generateFashion3D(s, p),
    postProcess: (o: any, s: Seed) => ({
      garment: {
        clothingType: geneVal(s, 'clothingType', 'shirt'),
        style: geneVal(s, 'style', 'casual'),
        size: geneVal(s, 'size', 'M'),
      },
      render_hints: { mode: 'fashion_3d', interactive: true },
    }),
  },
  {
    domain: 'robotics', version: 'v3', outputExtension: 'gltf',
    generator: (s, p) => generateRobotics3D(s, p),
    postProcess: (o: any, s: Seed) => {
      let armCount = geneVal(s, 'armCount', 2);
      if (typeof armCount === 'number' && armCount <= 1) armCount = Math.max(2, Math.floor(armCount * 10));
      return {
        robot: {
          robotType: geneVal(s, 'robotType', 'humanoid'),
          mobility: geneVal(s, 'mobility', 'wheels'),
          armCount,
        },
        render_hints: { mode: 'robot_3d', interactive: true },
      };
    },
  },
  {
    domain: 'circuit', version: 'v1', outputExtension: 'html',
    generator: (s, p) => generateCircuit(s, p),
    postProcess: (o: any, s: Seed) => ({
      circuit: {
        circuitType: geneVal(s, 'circuitType', 'amplifier'),
        componentCount: geneVal(s, 'componentCount', 5),
        isDigital: geneVal(s, 'isDigital', false),
      },
      render_hints: { mode: 'circuit_simulator', interactive: true },
    }),
  },
  {
    domain: 'food', version: 'v3', outputExtension: 'gltf',
    generator: (s, p) => generateFood3D(s, p),
    postProcess: (o: any, s: Seed) => ({
      food: {
        foodType: geneVal(s, 'foodType', 'apple'),
        style: geneVal(s, 'style', 'realistic'),
        size: geneVal(s, 'size', 1.0),
      },
      render_hints: { mode: 'food_3d', interactive: true },
    }),
  },
  {
    domain: 'choreography', version: 'v1', outputExtension: 'json',
    generator: (s, p) => generateChoreography(s, p),
    postProcess: (o: any, s: Seed) => ({
      dance: {
        style: geneVal(s, 'style', 'ballet'),
        tempo: geneVal(s, 'tempo', 0.5),
        complexity: geneVal(s, 'complexity', 0.5),
      },
      render_hints: { mode: 'dance_motion' },
    }),
  },
  {
    domain: 'agent', version: 'v1', outputExtension: 'json',
    generator: async (s, p) => {
      const { generateAgent } = await import('../generators/agent');
      return generateAgent(s, p);
    },
    postProcess: (o: any, s: Seed) => ({
      config: {
        persona: geneVal(s, 'persona', 'architect'),
        name: s.$name ?? 'Agent',
        temperature: +geneNumber(s, 'temperature', 0.7).toFixed(2),
        reasoningDepth: +geneNumber(s, 'reasoning_depth', 0.5).toFixed(2),
        explorationRate: +geneNumber(s, 'exploration_rate', 0.5).toFixed(2),
      },
      render_hints: { mode: 'chat_interface', color_scheme: 'dark', animated: false },
    }),
  },
];

export function getDomainConfig(domain: string): DomainConfig | undefined {
  return DOMAIN_CONFIGS.find(c => c.domain === domain);
}

export function getAllConfiguredDomains(): string[] {
  return DOMAIN_CONFIGS.map(c => c.domain);
}
