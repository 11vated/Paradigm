import { UniversalSeed } from '../seeds';

export interface EngineConfig {
  name: string;
  domain: string;
  version: string;
}

export interface EngineResult {
  success: boolean;
  output: unknown;
  errors: string[];
}

export abstract class BaseEngine {
  protected config: EngineConfig;
  protected initialized: boolean = false;

  constructor(config: EngineConfig) {
    this.config = config;
  }

  abstract initialize(): Promise<void>;
  abstract process(seed: UniversalSeed, params?: Record<string, unknown>): Promise<EngineResult>;
  abstract cleanup(): Promise<void>;

  isInitialized(): boolean {
    return this.initialized;
  }

  getConfig(): EngineConfig {
    return { ...this.config };
  }

  getName(): string {
    return this.config.name;
  }

  getDomain(): string {
    return this.config.domain;
  }
}

export interface ShaderCode {
  vertex: string;
  fragment: string;
  uniforms: Record<string, { type: string; value: unknown }>;
}

export interface ParticleSystem {
  emitter: {
    position: [number, number, number];
    rate: number;
    lifetime: [number, number];
  };
  particles: Array<{
    position: [number, number, number];
    velocity: [number, number, number];
    color: [number, number, number, number];
    size: number;
    age: number;
  }>;
}

export interface VehicleConfig {
  wheels: number;
  maxSpeed: number;
  acceleration: number;
  handling: number;
  mass: number;
}

export interface FashionDesign {
  silhouette: string;
  fabric: string;
  colors: string[];
  patterns: string[];
  details: string[];
}

export interface Narrative {
  title: string;
  genre: string;
  characters: Array<{ name: string; role: string; traits: string[] }>;
  plot: string[];
  setting: string;
  tone: string;
}

export interface UIComponent {
  type: string;
  props: Record<string, unknown>;
  children: UIComponent[];
  events: Record<string, string>;
  a11y: Record<string, unknown>;
}

export interface PhysicsWorld {
  gravity: [number, number, number];
  bodies: PhysicsBody[];
  constraints: PhysicsConstraint[];
}

export interface PhysicsBody {
  id: string;
  type: 'rigid' | 'soft' | 'particle';
  position: [number, number, number];
  velocity: [number, number, number];
  mass: number;
  shape: string;
  properties: Record<string, unknown>;
}

export interface PhysicsConstraint {
  type: 'distance' | 'hinge' | 'spring';
  bodyA: string;
  bodyB: string;
  params: Record<string, number>;
}

export interface AccessibilityReport {
  score: number;
  issues: AccessibilityIssue[];
  recommendations: string[];
}

export interface AccessibilityIssue {
  severity: 'critical' | 'serious' | 'moderate' | 'minor';
  element: string;
  issue: string;
  wcagCriteria: string;
  fix: string;
}

export interface VoiceConfig {
  voice: string;
  pitch: number;
  rate: number;
  volume: number;
  language: string;
  effects: Record<string, unknown>;
}

export interface FontDesign {
  family: string;
  style: string;
  weight: number;
  license: string;
  characterSet: string[];
  metrics: {
    ascent: number;
    descent: number;
    lineGap: number;
    capHeight: number;
  };
}

export interface AnimationGraph {
  nodes: AnimationNode[];
  edges: AnimationEdge[];
  duration: number;
  loop: boolean;
}

export interface AnimationNode {
  id: string;
  type: 'state' | 'transition' | 'action';
  properties: Record<string, unknown>;
}

export interface AnimationEdge {
  from: string;
  to: string;
  condition: string;
  duration: number;
}

export class EngineRegistry {
  private engines: Map<string, BaseEngine> = new Map();

  register(name: string, engine: BaseEngine): void {
    this.engines.set(name, engine);
  }

  get(name: string): BaseEngine | undefined {
    return this.engines.get(name);
  }

  getAll(): BaseEngine[] {
    return Array.from(this.engines.values());
  }

  getByDomain(domain: string): BaseEngine[] {
    return Array.from(this.engines.values()).filter(e => e.getDomain() === domain);
  }

  listDomains(): string[] {
    return Array.from(new Set(Array.from(this.engines.values()).map(e => e.getDomain())));
  }
}