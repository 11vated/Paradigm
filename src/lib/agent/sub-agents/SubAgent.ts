/**
 * Paradigm Absolute — Sub-Agent Interface
 *
 * Defines the common interface for all sub-agents in the
 * 6-stage generation pipeline. Each sub-agent is either
 * deterministic (kernel-only) or LLM-backed.
 */

import type { MemorySystem } from '../../commons/memory/memory-system';

export interface AgentMessage {
  type: string;
  payload: any;
  metadata?: Record<string, any>;
}

export interface AgentResult {
  success: boolean;
  type: string;
  payload: any;
  error?: string;
  metadata?: Record<string, any>;
}

export interface AgentContext {
  userId: string;
  memory?: MemorySystem;
  config?: Record<string, any>;
  seeds?: any[];
}

export interface SubAgent {
  name: string;
  stage: number;
  isLLMBacked: boolean;
  hasToolAccess: boolean;
  toolNames: string[];

  execute(input: AgentMessage, ctx: AgentContext): Promise<AgentResult>;
}

// ─── Pipeline Stage Types ───────────────────────────────────────────────────

export interface LiveContext {
  userId: string;
  activeDomain: string;
  recentSeedIds: string[];
  styleHints: string[];
  preferences: Record<string, unknown>;
}

export interface IntentEnvelope {
  description: string;
  domain: string;
  genes: Record<string, unknown>;
  constraints: Record<string, unknown>;
  style: string;
  referenceSeeds?: string[];
}

export interface CodeGenOutput {
  gsplCode: string;
  params: Record<string, unknown>;
}

export interface GrowthOutput {
  seedId: string;
  seedHash: string;
  seed: any;
  artifact: any;
  domain: string;
  quality: number;
}

export interface ValidationOutput {
  valid: boolean;
  confidence: number;
  issues: string[];
  adjustedDescription?: string;
}

export interface EvolutionOutput {
  refinedSeed: any;
  refinedSeedId: string;
  refinedSeedHash: string;
  improvement: number;
  iterations: number;
}

export interface CompositionSuggestion {
  targetDomain: string;
  path: any;
  coherence: number;
  reason: string;
}

export interface CompositionOutput {
  suggestions: CompositionSuggestion[];
  sourceDomain: string;
}

export interface SigningOutput {
  signed: boolean;
  signature?: string;
  storageId: string;
  gseedPackage?: any;
}

// ─── Pipeline Result ────────────────────────────────────────────────────────

export interface PipelineResult {
  success: boolean;
  description: string;
  intent?: IntentEnvelope;
  code?: CodeGenOutput;
  growth?: GrowthOutput;
  validation?: ValidationOutput;
  evolution?: EvolutionOutput;
  composition?: CompositionOutput;
  archive?: SigningOutput;
  error?: string;
  duration: number;
  refineCount: number;
}

// ─── Domain Detection Helpers ───────────────────────────────────────────────

export const DOMAIN_PATTERNS: [RegExp, string][] = [
  [/character|person|human|creature|warrior|mage|rogue|hero/, 'character'],
  [/music|song|melody|beat|rhythm|anthem|symphony/, 'music'],
  [/sprite|pixel|8bit|16bit|tileset/, 'sprite'],
  [/visual|painting|abstract|landscape|portrait/, 'visual2d'],
  [/procedural|terrain|mountain|noise|heightmap/, 'procedural'],
  [/game|dungeon|crawler|rpg|platformer|rpg/, 'fullgame'],
  [/animation|walk|run|cycle|motion|keyframe/, 'animation'],
  [/3d|geometry|mesh|object|crystal|voxel/, 'geometry3d'],
  [/story|narrative|tale|epic|myth|fiction/, 'narrative'],
  [/\bui\b|interface|dashboard|layout|button/, 'ui'],
  [/physics|gravity|collision|simulation|force/, 'physics'],
  [/audio|sound|synth|pad|ambient|sfx/, 'audio'],
  [/ecosystem|forest|ocean|coral|biome|jungle/, 'ecosystem'],
  [/alife|cellular|automata|conway|life/, 'alife'],
  [/shader|fragment|fractal|glsl|raymarch/, 'shader'],
  [/particle|fire|smoke|emitter|spark/, 'particle'],
  [/font|typeface|typography|text|glyph/, 'typography'],
  [/building|tower|architecture|pavilion|house/, 'architecture'],
  [/vehicle|car|ship|drone|cycle|spaceship/, 'vehicle'],
  [/furniture|chair|table|desk|shelf/, 'furniture'],
  [/fashion|clothing|gown|wearable|outfit/, 'fashion'],
  [/robot|drone|automaton|mech|android/, 'robotics'],
  [/circuit|processor|analog|digital|electronic/, 'circuit'],
  [/food|cuisine|recipe|dish|ramen|meal/, 'food'],
  [/dance|choreography|ballet|motion|routine/, 'choreography'],
  [/agent|ai|intelligence|reasoning|assistant/, 'agent'],
];

export const STYLE_PATTERNS: [RegExp, string][] = [
  [/dark|noir|gothic|shadow|sinister/, 'dark'],
  [/bright|cheerful|colorful|vibrant|sunny/, 'vibrant'],
  [/minimal|clean|simple|modern|sleek/, 'minimal'],
  [/organic|natural|flowing|curved|biologic/, 'organic'],
  [/cyber|tech|digital|neon|futuristic/, 'cyberpunk'],
  [/retro|vintage|classic|old|pixel/, 'retro'],
  [/watercolor|painted|brush|artistic/, 'watercolor'],
  [/geometric|angular|sharp|blocky/, 'geometric'],
];

export function detectDomain(description: string, fallback = 'character'): string {
  const lower = description.toLowerCase();
  for (const [pattern, domain] of DOMAIN_PATTERNS) {
    if (pattern.test(lower)) return domain;
  }
  return fallback;
}

export function detectStyle(description: string): string {
  const lower = description.toLowerCase();
  for (const [pattern, style] of STYLE_PATTERNS) {
    if (pattern.test(lower)) return style;
  }
  return 'default';
}

export const DOMAIN_GENE_TEMPLATES: Record<string, Record<string, unknown>> = {
  character: { archetype: 'adventurer', strength: 0.5, agility: 0.5, size: 0.5, hp: 100, palette: [0.5, 0.5, 0.5] },
  sprite: { resolution: 0.5, paletteSize: 0.5, colors: [0.5, 0.5, 0.5], symmetry: 'bilateral' },
  music: { tempo: 120, key: 'C', scale: 'major', bpm: 120 },
  visual2d: { style: 'abstract', complexity: 0.5, palette: [0.5, 0.5, 0.5], layers: 3 },
  procedural: { octaves: 4, persistence: 0.5, scale: 1.0, biome: 'temperate' },
  fullgame: { genre: 'adventure', difficulty: 0.5, levels: 5, enemies: ['slime'] },
  animation: { frameCount: 0.5, fps: 0.5, motionType: 'skeletal', easing: 'linear' },
  geometry3d: { primitive: 'cube', detail: 0.5, scale: [1, 1, 1] },
  narrative: { structure: 'linear', tone: 'neutral', chapters: 3 },
  ui: { layout: 'single', theme: 'dark', spacing: 0.5 },
  physics: { gravity: 0.5, friction: 0.3, elasticity: 0.5 },
  audio: { soundType: 'tone', frequency: 440, duration: 1.0 },
  ecosystem: { speciesCount: 0.5, environment: 'forest', stability: 0.7 },
  game: { mechanicType: 'turn_based', complexity: 0.5 },
  alife: { rules: 'conway', gridSize: 0.5, birth: [3], survival: [2, 3] },
  shader: { shaderType: 'fragment', technique: 'raymarching', iterations: 64 },
  particle: { emitter: 'point', count: 100, lifetime: 2.0 },
  typography: { style: 'sans_serif', xHeight: 0.5, weight: 400 },
  architecture: { style: 'modern', scale: 0.5, floors: 1 },
  vehicle: { propulsion: 'electric', speed: 0.5, mass: 1000 },
  furniture: { furnitureType: 'chair', style: 'modern', material: 'wood' },
  fashion: { garmentType: 'shirt', fabric: 'cotton', color: [0.5, 0.3, 0.7] },
  robotics: { robotType: 'humanoid', dof: 6, sensors: ['camera'] },
  circuit: { circuitType: 'digital', components: ['gate'], frequency: 100 },
  food: { cuisine: 'generic', complexity: 0.5, cookTime: 30 },
  choreography: { style: 'contemporary', tempo: 120, energy: 0.5 },
  agent: { persona: 'assistant', temperature: 0.5, reasoning_depth: 0.5 },
};
