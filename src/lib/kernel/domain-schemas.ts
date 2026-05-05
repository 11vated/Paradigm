/**
 * Formal Domain Schemas — Paradigm 27 Domains
 * Defines exact output formats for world-class artifact generation
 */

// ===== Core Types =====
interface Vector3 { x: number; y: number; z: number }
interface ColorRGB { r: number; g: number; b: number }
interface BoundingBox { min: Vector3; max: Vector3 }

// ===== Domain 1: Character =====
export interface CharacterSchema {
  version: '2.0';
  type: 'character';
  format: 'gltf-binary';
  mesh: {
    vertices: number;      // Min: 10,000 for photorealistic
    triangles: number;    // Min: 20,000
    bones: number;        // 1-255 bones
    blendShapes: number;  // 52 ARKit blend shapes
  };
  textures: {
    albedo: { width: number; height: number; format: 'png' | 'jpeg'; resolution: 512 | 1024 | 2048 | 4096 };
    normal: { width: number; height: number; format: 'png' };
    roughness: { width: number; height: number; format: 'png' };
    metallic: { width: number; height: number; format: 'png' };
    ao: { width: number; height: number; format: 'png' };
  };
  animations: Array<{
    name: 'idle' | 'walk' | 'run' | 'jump' | string;
    duration: number;     // Seconds
    loop: boolean;
    keyframes: number;     // Min: 30fps * duration
  }>;
  rigging: {
    skeleton: true;
    boneCount: number;
    root: string;         // 'hip' or 'root'
  };
  metadata: {
    quality: 'low' | 'medium' | 'high' | 'photorealistic';
    generation: number;
    seed_hash: string;
    provenance: any;     // SeedProvenance struct
  };
}

// ===== Domain 2: Music =====
export interface MusicSchema {
  version: '2.0';
  type: 'music';
  format: 'wav' | 'mp3' | 'flac';
  audio: {
    sampleRate: 44100 | 48000 | 96000;
    bitDepth: 16 | 24 | 32;
    channels: 1 | 2;        // Mono | Stereo
    duration: number;      // Seconds
    stems: Array<{
      name: 'melody' | 'harmony' | 'bass' | 'drums' | string;
      instrument: string;
      midiNotes: number[];  // MIDI note numbers
    }>;
  };
  midi?: {
    format: 'midi';
    tracks: number;
    tempo: number;         // BPM
    timeSignature: [number, number]; // e.g., [4, 4]
    key: string;          // e.g., "C major"
  };
  metadata: {
    genre: string;
    mood: string;
    quality: 'low' | 'medium' | 'high' | 'photorealistic';
    generation: number;
    seed_hash: string;
  };
}

// ===== Domain 3: Visual2D =====
export interface Visual2DSchema {
  version: '2.0';
  type: 'visual2d';
  format: 'svg' | 'png' | 'jpeg';
  svg?: {
    width: number;
    height: number;
    elements: number;      // Min: 100 for complex scenes
    gradients: number;
    filters: number;
    layers: number;
  };
  png?: {
    width: number;
    height: number;
    hasAlpha: boolean;
    compression: 'none' | 'zip' | 'lzma';
  };
  metadata: {
    style: 'abstract' | 'geometric' | 'organic' | 'watercolor' | 'pixel' | 'isometric';
    complexity: number;    // 0-1
    quality: 'low' | 'medium' | 'high' | 'photorealistic';
    seed_hash: string;
  };
}

// ===== Domain 4: Game =====
export interface GameSchema {
  version: '2.0';
  type: 'game';
  format: 'html5' | 'wasm';
  html?: {
    playable: true;
    canvasWidth: number;
    canvasHeight: number;
    hasControls: boolean;
    hasScoring: boolean;
    hasWinCondition: boolean;
  };
  wasm?: {
    binarySize: number;
    imports: string[];
    exports: string[];
  };
  gameplay: {
    genre: 'platformer' | 'shooter' | 'puzzle' | 'racing' | 'action';
    estimatedPlaytime: number; // Minutes
    levelCount: number;      // Min: 3
    difficulty: number;      // 0-1
    mechanics: string[];
  };
  metadata: {
    engine: 'phaser' | 'three.js' | 'canvas';
    quality: 'low' | 'medium' | 'high' | 'photorealistic';
    seed_hash: string;
  };
}

// ===== Domain 5: Geometry3D =====
export interface Geometry3DSchema {
  version: '2.0';
  type: 'geometry3d';
  format: 'gltf-binary';
  mesh: {
    primitive: 'sphere' | 'box' | 'cylinder' | 'cone' | 'torus' | 'terrain';
    vertices: number;
    triangles: number;
    hasUV: boolean;
    hasNormals: boolean;
  };
  material: {
    type: 'pbr';
    metallic: number;     // 0-1
    roughness: number;    // 0-1
    hasTextures: boolean;
  };
  metadata: {
    quality: 'low' | 'medium' | 'high' | 'photorealistic';
    seed_hash: string;
  };
}

// ===== Domain 6: Audio (General) =====
export interface AudioSchema {
  version: '2.0';
  type: 'audio';
  format: 'wav' | 'mp3' | 'ogg';
  audio: {
    sampleRate: number;
    bitDepth: number;
    channels: number;
    duration: number;
  };
  metadata: {
    type: 'sfx' | 'ambient' | 'voice' | 'music';
    seed_hash: string;
  };
}

// ===== Domain 7: Sprite =====
export interface SpriteSchema {
  version: '2.0';
  type: 'sprite';
  format: 'png' | 'gif';
  frames: number;
  width: number;
  height: number;
  animated: boolean;
  metadata: {
    style: 'pixel' | 'smooth' | 'cartoon';
    seed_hash: string;
  };
}

// ===== Domain 8: Animation =====
export interface AnimationSchema {
  version: '2.0';
  type: 'animation';
  format: 'png-sequence' | 'gif' | 'webp';
  duration: number;
  fps: number;
  width: number;
  height: number;
  metadata: {
    type: 'motion' | 'effect' | 'transition';
    seed_hash: string;
  };
}

// ===== Domain 9: Narrative =====
export interface NarrativeSchema {
  version: '2.0';
  type: 'narrative';
  format: 'txt' | 'json' | 'html';
  wordCount: number;
  paragraphs: number;
  hasDialogue: boolean;
  metadata: {
    genre: string;
    tone: string;
    seed_hash: string;
  };
}

// ===== Domain 10-27: Placeholder Schemas =====
export interface ShaderSchema {
  version: '2.0';
  type: 'shader';
  format: 'glsl' | 'wgsl';
  hasVertex: boolean;
  hasFragment: boolean;
  hasCompute: boolean;
}

export interface PhysicsSchema {
  version: '2.0';
  type: 'physics';
  format: 'json';
  objectCount: number;
  simulationTime: number;
  hasCollisions: boolean;
}

export interface UIUXSchema {
  version: '2.0';
  type: 'ui';
  format: 'html' | 'figma';
  componentCount: number;
  responsive: boolean;
}

// ... (schemas for all 27 domains follow similar pattern)

/**
 * Validate artifact against schema
 */
export function validateArtifact(artifact: any, domain: string): boolean {
  // In production: use AJV or similar JSON Schema validator
  // For now, check basic structure
  if (!artifact.version || !artifact.type || !artifact.format) return false;
  if (artifact.type !== domain) return false;
  return true;
}

/**
 * Get schema for domain
 */
export function getDomainSchema(domain: string): any {
  const schemas: Record<string, any> = {
    character: {} as CharacterSchema,
    music: {} as MusicSchema,
    visual2d: {} as Visual2DSchema,
    game: {} as GameSchema,
    geometry3d: {} as Geometry3DSchema,
    audio: {} as AudioSchema,
    sprite: {} as SpriteSchema,
    animation: {} as AnimationSchema,
    narrative: {} as NarrativeSchema,
  };
  return schemas[domain] || null;
}
