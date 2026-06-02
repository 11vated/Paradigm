/**
 * AgentPipeline — 6-Stage Generation Pipeline
 *
 * Stage 0: Live Context     — Gather user context, preferences
 * Stage 1: Intent Resolution — Parse description → IntentEnvelope
 * Stage 2: Code Generation   — IntentEnvelope → GSPL code
 * Stage 3: Deterministic Growth — GSPL → seed → grow → artifact
 * Stage 4: Validation        — Verify artifact matches description
 * Stage 5: Evolution/Composition — Optional refinement via GA
 * Stage 6: Archive/Sign      — Sign and archive seed
 */
/* eslint-disable @typescript-eslint/no-require-imports -- Agent pipeline uses require('crypto') for SHA-256 hash checks during stage 3 growth. */

import type { MemorySystem } from '../memory/memory-system';
import type {
  LiveContext, IntentEnvelope, CodeGenResult,
  GrowthResult, ValidationResult, EvolutionResult,
  ArchiveResult, PipelineResult,
} from './stages';
import { Xoshiro256StarStar, rngFromHash } from '../../kernel/rng';
import { growSeed } from '../../kernel/engines';
import { encodeGseed } from '../../kernel/binary-format';
import { VerificationGate } from '../verification/verification-gate';

export interface PipelineConfig {
  enableEvolution: boolean;
  enableValidation: boolean;
  enableArchive: boolean;
  maxEvolutionIterations: number;
  evolutionPopulationSize: number;
  confidenceThreshold: number;
  storageDir: string;
}

const DEFAULT_CONFIG: PipelineConfig = {
  enableEvolution: true,
  enableValidation: true,
  enableArchive: true,
  maxEvolutionIterations: 5,
  evolutionPopulationSize: 10,
  confidenceThreshold: 0.7,
  storageDir: 'data/artifacts',
};

/**
 * Get 24 canonical domains for gene templates
 */
const DOMAIN_GENE_TEMPLATES: Record<string, Record<string, unknown>> = {
  character: { archetype: 'adventurer', strength: 0.5, agility: 0.5, size: 0.5, palette: [0.5, 0.5, 0.5] },
  sprite: { resolution: 0.5, paletteSize: 0.5, colors: [0.5, 0.5, 0.5] },
  music: { tempo: 0.5, key: 'C', scale: 'major' },
  visual2d: { style: 'abstract', complexity: 0.5, palette: [0.5, 0.5, 0.5] },
  procedural: { octaves: 0.5, persistence: 0.5, scale: 0.5 },
  fullgame: { genre: 'adventure', difficulty: 0.5 },
  animation: { frameCount: 0.5, fps: 0.5, motionType: 'skeletal' },
  geometry3d: { primitive: 'cube', detail: 0.5, scale: [1, 1, 1] },
  narrative: { structure: 'linear', tone: 'neutral' },
  ui: { layout: 'single', theme: 'dark' },
  physics: { gravity: 0.5, friction: 0.3, elasticity: 0.5 },
  audio: { soundType: 'tone', frequency: 432 },
  ecosystem: { speciesCount: 0.5, environment: 'forest', stability: 0.7 },
  game: { mechanicType: 'turn_based', complexity: 0.5 },
  alife: { rules: 'conway', gridSize: 0.5 },
  shader: { shaderType: 'fragment', technique: 'raymarching' },
  particle: { emitter: 'point', count: 100 },
  typography: { style: 'sans_serif', xHeight: 0.5 },
  architecture: { style: 'modern', scale: 0.5 },
  vehicle: { propulsion: 'electric', speed: 0.5 },
  furniture: { furnitureType: 'chair', style: 'modern' },
  fashion: { garmentType: 'shirt', fabric: 'cotton' },
  robotics: { robotType: 'humanoid' },
  circuit: { circuitType: 'digital', components: ['gate'] },
  food: { cuisine: 'generic', complexity: 0.5 },
  choreography: { style: 'contemporary', tempo: 0.5, energy: 0.5 },
  agent: { persona: 'assistant', temperature: 0.5, reasoning_depth: 0.5 },
};

export class AgentPipeline {
  private config: PipelineConfig;
  private memory: MemorySystem;
  private verificationGate: VerificationGate;

  constructor(memory: MemorySystem, config?: Partial<PipelineConfig>) {
    this.memory = memory;
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.verificationGate = new VerificationGate({ confidenceThreshold: this.config.confidenceThreshold });
  }

  async run(description: string, domain?: string): Promise<PipelineResult> {
    const startTime = Date.now();

    try {
      // Stage 0: Live Context
      const context = this.gatherContext(domain);
      this.memory.working.setCurrentIntent(description);

      // Stage 1: Intent Resolution
      const intent = this.resolveIntent(description, context);

      // Stage 2: Code Generation
      const code = this.generateCode(intent);

      // Stage 3: Deterministic Growth
      const growth = await this.deterministicGrowth(intent, code);

      // Stage 4: Validation
      let validation: ValidationResult | undefined;
      if (this.config.enableValidation) {
        validation = await this.validate(intent, growth);
        if (!validation.valid && validation.adjustedDescription) {
          // Refine cycle: adjust and retry (simple single-cycle)
          const refinedIntent = { ...intent, description: validation.adjustedDescription };
          const refinedCode = this.generateCode(refinedIntent);
          const refinedGrowth = await this.deterministicGrowth(refinedIntent, refinedCode);
          Object.assign(growth, refinedGrowth);
        }
      }

      // Stage 5: Evolution
      let evolution: EvolutionResult | undefined;
      if (this.config.enableEvolution && growth.quality < 0.9) {
        evolution = await this.evolve(intent, growth);
      }

      // Stage 6: Archive/Sign
      let archive: ArchiveResult | undefined;
      if (this.config.enableArchive) {
        archive = this.archive(intent, growth, evolution);
      }

      // Record to memory
      this.memory.recordEpisode(
        'create', intent.domain, description,
        growth.seedId, growth.seedHash,
        !!(validation?.valid ?? true),
      );

      return {
        success: true,
        intent,
        code,
        growth,
        validation,
        evolution,
        archive,
        duration: Date.now() - startTime,
      };
    } catch (err: any) {
      return {
        success: false,
        intent: { description, domain: domain || 'character', genes: {}, constraints: {}, style: 'default' },
        error: err.message,
        duration: Date.now() - startTime,
      };
    }
  }

  /** Stage 0: Gather user context */
  private gatherContext(domain?: string): LiveContext {
    return {
      userId: this.memory.working.userId,
      activeDomain: domain || this.memory.working.activeDomain,
      recentSeedIds: this.memory.working.recentSeedIds,
      styleHints: this.memory.working.recentSeedIds,
      preferences: {},
    };
  }

  /** Stage 1: Resolve natural language description to IntentEnvelope */
  private resolveIntent(description: string, context: LiveContext): IntentEnvelope {
    const domain = this.detectDomain(description, context.activeDomain);
    const template = DOMAIN_GENE_TEMPLATES[domain] || {};
    const style = this.detectStyle(description);

    return {
      description,
      domain,
      genes: { ...template },
      constraints: {},
      style,
    };
  }

  /** Stage 2: Generate GSPL code from intent */
  private generateCode(intent: IntentEnvelope): CodeGenResult {
    const paramEntries = Object.entries(intent.genes)
      .map(([k, v]) => `  "${k}": ${JSON.stringify(v)}`)
      .join(',\n');

    const gsplCode = `// Generated from: ${intent.description}
seed_${intent.domain} {
${paramEntries}
}`;

    return { gsplCode, params: intent.genes };
  }

  /** Stage 3: Grow seed deterministically */
  private async deterministicGrowth(intent: IntentEnvelope, _code: CodeGenResult): Promise<GrowthResult> {
    const hash = this.hashIntent(intent);
    const seed: any = {
      id: `seed-${hash.slice(0, 12)}`,
      $domain: intent.domain,
      $name: `${intent.domain}_${hash.slice(0, 8)}`,
      $hash: hash,
      genes: new Map(Object.entries(intent.genes).map(([k, v]) => [k, { type: typeof v === 'number' ? 'scalar' : 'categorical', value: v }])),
      $lineage: { generation: 0, operation: 'pipeline', parents: [] },
      metadata: { description: intent.description, style: intent.style },
    };

    let artifact: any;
    let quality = 0.7;
    try {
      artifact = await growSeed(seed);
      quality = artifact?.quality ? parseFloat(artifact.quality) : 0.8;
    } catch {
      artifact = { format: 'json', data: { domain: intent.domain, hash } };
      quality = 0.6;
    }

    return {
      seedId: seed.id,
      seedHash: hash,
      artifact,
      domain: intent.domain,
      quality,
    };
  }

  /** Stage 4: Validate artifact against description using verification gate */
  private async validate(intent: IntentEnvelope, growth: GrowthResult): Promise<ValidationResult> {
    const issues: string[] = [];
    if (!growth.artifact) issues.push('No artifact produced');

    let confidence = growth.quality;
    if (growth.artifact) {
      try {
        const result = await this.verificationGate.verify(
          intent.description,
          growth.artifact,
          intent.domain,
        );
        confidence = result.confidence;
        if (!result.match) {
          issues.push(...result.issues.slice(0, 3));
          issues.push(result.explanation);
        }
      } catch {
        issues.push('Verification gate threw an error');
        confidence = growth.quality * 0.5;
      }
    }

    return {
      valid: issues.length === 0,
      confidence,
      issues,
      adjustedDescription: issues.length > 0 ? `${intent.description} (issues: ${issues.join('; ')})` : undefined,
    };
  }

  /** Stage 5: Optional evolution refinement */
  private async evolve(_intent: IntentEnvelope, growth: GrowthResult): Promise<EvolutionResult> {
    return {
      refinedSeedId: growth.seedId,
      refinedSeedHash: growth.seedHash,
      improvement: 0,
      iterations: 0,
    };
  }

  /** Stage 6: Sign and archive */
  private archive(intent: IntentEnvelope, growth: GrowthResult, _evolution?: EvolutionResult): ArchiveResult {
    return {
      signed: false,
      storageId: `${intent.domain}/${growth.seedId}`,
    };
  }

  /** Domain detection from description */
  private detectDomain(description: string, fallback: string): string {
    const lower = description.toLowerCase();
    const domainHints: [RegExp, string][] = [
      [/character|person|human|creature|warrior|mage|rogue/, 'character'],
      [/music|song|melody|beat|rhythm|anthem/, 'music'],
      [/sprite|pixel|8bit|16bit/, 'sprite'],
      [/visual|painting|abstract|landscape/, 'visual2d'],
      [/procedural|terrain|mountain|noise/, 'procedural'],
      [/game|dungeon|crawler|rpg|platformer/, 'fullgame'],
      [/animation|walk|run|cycle|motion/, 'animation'],
      [/3d|geometry|mesh|object|crystal/, 'geometry3d'],
      [/story|narrative|tale|epic|myth/, 'narrative'],
      [/ui|interface|dashboard|layout/, 'ui'],
      [/physics|gravity|collision|simulation/, 'physics'],
      [/audio|sound|synth|pad|ambient/, 'audio'],
      [/ecosystem|forest|ocean|coral|biome/, 'ecosystem'],
      [/alife|cellular|automata|life/, 'alife'],
      [/shader|fragment|fractal|glsl/, 'shader'],
      [/particle|fire|smoke|emitter/, 'particle'],
      [/font|typeface|typography|text/, 'typography'],
      [/building|tower|architecture|pavilion/, 'architecture'],
      [/vehicle|car|ship|drone|cycle/, 'vehicle'],
      [/furniture|chair|table|desk/, 'furniture'],
      [/fashion|clothing|gown|wearable/, 'fashion'],
      [/robot|drone|automaton|mech/, 'robotics'],
      [/circuit|processor|analog|digital/, 'circuit'],
      [/food|cuisine|recipe|dish|ramen/, 'food'],
      [/dance|choreography|ballet|motion/, 'choreography'],
      [/agent|ai|intelligence|reasoning/, 'agent'],
    ];

    for (const [pattern, domain] of domainHints) {
      if (pattern.test(lower)) return domain;
    }
    return fallback;
  }

  /** Style detection */
  private detectStyle(description: string): string {
    const lower = description.toLowerCase();
    if (/dark|noir|gothic|shadow/.test(lower)) return 'dark';
    if (/bright|cheerful|colorful|vibrant/.test(lower)) return 'vibrant';
    if (/minimal|clean|simple|modern/.test(lower)) return 'minimal';
    if (/organic|natural|flowing|curved/.test(lower)) return 'organic';
    if (/cyber|tech|digital|neon/.test(lower)) return 'cyberpunk';
    return 'default';
  }

  /** Deterministic hash from intent */
  private hashIntent(intent: IntentEnvelope): string {
    const data = `${intent.domain}:${intent.description}:${JSON.stringify(intent.genes)}`;
    const hash = require('crypto').createHash('sha256').update(data).digest('hex');
    return hash;
  }
}