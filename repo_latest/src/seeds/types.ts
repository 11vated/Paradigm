export enum GeneType {
  STRUCTURE = 'structure',
  COLOR = 'color',
  SHAPE = 'shape',
  MOTION = 'motion',
  AUDIO = 'audio',
  TEXTURE = 'texture',
  PATTERN = 'pattern',
  BEHAVIOR = 'behavior',
  INTERACTION = 'interaction',
  PHYSICS = 'physics',
  MATERIAL = 'material',
  LIGHTING = 'lighting',
  ENVIRONMENT = 'environment',
  ANIMATION = 'animation',
  LOGIC = 'logic',
  DATA = 'data',
  META = 'meta'
}

export interface GeneTypeDefinition {
  type: GeneType;
  name: string;
  description: string;
  valueType: string;
  defaultValue: GeneValue;
  constraints: GeneConstraints;
}

export interface GeneConstraints {
  min?: number;
  max?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  enum?: string[];
}

export type GeneValue = number | string | boolean | bigint | GeneValue[] | { [key: string]: GeneValue };

export interface GeneSchema {
  type: GeneType;
  value: GeneValue;
  metadata: GeneMetadata;
}

export interface GeneMetadata {
  name: string;
  description?: string;
  category?: string;
  mutable: boolean;
  dominant: boolean;
  hidden: boolean;
  locked: boolean;
  expressionRange?: [number, number];
  mutationRate: number;
  validators?: GeneValidator[];
}

export interface GeneValidator {
  type: 'range' | 'enum' | 'pattern' | 'custom';
  params: unknown;
}

export const GENE_TYPE_DEFINITIONS: GeneTypeDefinition[] = [
  {
    type: GeneType.STRUCTURE,
    name: 'Structure',
    description: 'Defines the fundamental structure and topology of the seed',
    valueType: 'object',
    defaultValue: { nodes: [], edges: [] },
    constraints: { minLength: 0 }
  },
  {
    type: GeneType.COLOR,
    name: 'Color',
    description: 'Controls color palettes and color relationships',
    valueType: 'array',
    defaultValue: [],
    constraints: { minLength: 1, maxLength: 16 }
  },
  {
    type: GeneType.SHAPE,
    name: 'Shape',
    description: 'Defines geometric shapes and forms',
    valueType: 'string',
    defaultValue: 'default',
    constraints: { enum: ['default', 'circle', 'square', 'triangle', 'polygon', 'organic', 'custom'] }
  },
  {
    type: GeneType.MOTION,
    name: 'Motion',
    description: 'Controls movement patterns and dynamics',
    valueType: 'object',
    defaultValue: { velocity: 0, acceleration: 0, path: [] },
    constraints: {}
  },
  {
    type: GeneType.AUDIO,
    name: 'Audio',
    description: 'Defines sound characteristics and audio behavior',
    valueType: 'object',
    defaultValue: { volume: 1, frequency: 440, tempo: 120 },
    constraints: { min: 0, max: 1 }
  },
  {
    type: GeneType.TEXTURE,
    name: 'Texture',
    description: 'Controls surface textures and material properties',
    valueType: 'string',
    defaultValue: 'smooth',
    constraints: { enum: ['smooth', 'rough', 'metallic', 'fabric', 'organic', 'custom'] }
  },
  {
    type: GeneType.PATTERN,
    name: 'Pattern',
    description: 'Defines recurring patterns and repetitions',
    valueType: 'object',
    defaultValue: { repeat: 1, scale: 1, offset: { x: 0, y: 0 } },
    constraints: { min: 0.1, max: 10 }
  },
  {
    type: GeneType.BEHAVIOR,
    name: 'Behavior',
    description: 'Defines autonomous behaviors and AI logic',
    valueType: 'object',
    defaultValue: { stateMachine: [], goals: [], reactions: [] },
    constraints: {}
  },
  {
    type: GeneType.INTERACTION,
    name: 'Interaction',
    description: 'Controls user interaction modalities',
    valueType: 'object',
    defaultValue: { click: false, drag: false, hover: false, gesture: false },
    constraints: {}
  },
  {
    type: GeneType.PHYSICS,
    name: 'Physics',
    description: 'Defines physical properties and dynamics',
    valueType: 'object',
    defaultValue: { mass: 1, gravity: 9.8, friction: 0.5, bounce: 0.5 },
    constraints: { min: 0 }
  },
  {
    type: GeneType.MATERIAL,
    name: 'Material',
    description: 'Defines material rendering properties',
    valueType: 'object',
    defaultValue: { roughness: 0.5, metalness: 0, specular: 0.5, opacity: 1 },
    constraints: { min: 0, max: 1 }
  },
  {
    type: GeneType.LIGHTING,
    name: 'Lighting',
    description: 'Controls lighting conditions and shadows',
    valueType: 'object',
    defaultValue: { ambient: 0.3, directional: 0.7, shadows: false, color: '#ffffff' },
    constraints: { min: 0, max: 1 }
  },
  {
    type: GeneType.ENVIRONMENT,
    name: 'Environment',
    description: 'Defines environmental context and settings',
    valueType: 'object',
    defaultValue: { background: '#000000', fog: false, skybox: null, terrain: null },
    constraints: {}
  },
  {
    type: GeneType.ANIMATION,
    name: 'Animation',
    description: 'Controls animation keyframes and timelines',
    valueType: 'object',
    defaultValue: { keyframes: [], duration: 1, loop: true, easing: 'linear' },
    constraints: { min: 0 }
  },
  {
    type: GeneType.LOGIC,
    name: 'Logic',
    description: 'Defines computational logic and algorithms',
    valueType: 'object',
    defaultValue: { conditions: [], actions: [], operators: [] },
    constraints: {}
  },
  {
    type: GeneType.DATA,
    name: 'Data',
    description: 'Contains data payloads and storage',
    valueType: 'object',
    defaultValue: { values: [], indexes: [], cache: null },
    constraints: {}
  },
  {
    type: GeneType.META,
    name: 'Meta',
    description: 'Metadata about the seed itself',
    valueType: 'object',
    defaultValue: { version: '1.0', author: '', created: Date.now(), tags: [] },
    constraints: {}
  }
];

export function getGeneTypeDefinition(type: GeneType): GeneTypeDefinition | undefined {
  return GENE_TYPE_DEFINITIONS.find(d => d.type === type);
}

export function getAllGeneTypes(): GeneType[] {
  return Object.values(GeneType);
}

export function getGeneTypeNames(): string[] {
  return GENE_TYPE_DEFINITIONS.map(d => d.name);
}