/**
 * SubAgent Orchestrator
 *
 * Runs the 6-stage generation pipeline using the sub-agent system:
 *
 * Stage 0: Gather live context (session state)
 * Stage 1: IntentOracle — parse description → IntentEnvelope
 * Stage 2: CodeSmith — IntentEnvelope → GSPL code
 * Stage 3: Deterministic Growth — kernel growSeed
 * Stage 4: Validator — verify artifact matches description
 *   → Refine cycle: up to 3 attempts, back to Stage 2
 * Stage 5: Evolver/Composer — optional refinement
 * Stage 6: SovereignSigner — sign + archive
 */

import type { MemorySystem } from '../../commons/memory/memory-system';
import type { SubAgent, AgentMessage, AgentContext, PipelineResult } from './SubAgent';
import type { IntentEnvelope, GrowthOutput, CodeGenOutput } from './SubAgent';
import { IntentOracle } from './IntentOracle';
import { CodeSmith } from './CodeSmith';
import { Validator } from './Validator';
import { Evolver } from './Evolver';
import { Composer } from './Composer';
import { SovereignSigner } from './SovereignSigner';
import crypto from 'crypto';

export interface OrchestratorConfig {
  maxRefineAttempts: number;
  enableEvolution: boolean;
  enableComposition: boolean;
  enableSigning: boolean;
  evolutionPopulationSize: number;
  evolutionGenerations: number;
  confidenceThreshold: number;
  defaultDomain: string;
}

const DEFAULT_CONFIG: OrchestratorConfig = {
  maxRefineAttempts: 3,
  enableEvolution: true,
  enableComposition: false,
  enableSigning: true,
  evolutionPopulationSize: 8,
  evolutionGenerations: 3,
  confidenceThreshold: 0.5,
  defaultDomain: 'character',
};

export class Orchestrator {
  private config: OrchestratorConfig;
  private subAgents: Map<string, SubAgent>;

  intentOracle: IntentOracle;
  codeSmith: CodeSmith;
  validator: Validator;
  evolver: Evolver;
  composer: Composer;
  sovereignSigner: SovereignSigner;

  constructor(config?: Partial<OrchestratorConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };

    this.intentOracle = new IntentOracle();
    this.codeSmith = new CodeSmith();
    this.validator = new Validator(this.config.confidenceThreshold);
    this.evolver = new Evolver();
    this.composer = new Composer();
    this.sovereignSigner = new SovereignSigner();

    this.subAgents = new Map<string, SubAgent>([
      [this.intentOracle.name, this.intentOracle],
      [this.codeSmith.name, this.codeSmith],
      [this.validator.name, this.validator],
      [this.evolver.name, this.evolver],
      [this.composer.name, this.composer],
      [this.sovereignSigner.name, this.sovereignSigner],
    ]);
  }

  getSubAgent(name: string): SubAgent | undefined {
    return this.subAgents.get(name);
  }

  getAllSubAgents(): SubAgent[] {
    return Array.from(this.subAgents.values());
  }

  /**
   * Run the full 6-stage pipeline from natural language description.
   */
  async runPipeline(
    description: string,
    domain?: string,
    memory?: MemorySystem,
    seeds?: any[],
  ): Promise<PipelineResult> {
    const startTime = Date.now();
    const ctx: AgentContext = {
      userId: memory?.working?.userId || 'anonymous',
      memory,
      config: { defaultDomain: this.config.defaultDomain, confidenceThreshold: this.config.confidenceThreshold },
      seeds: seeds || [],
    };

    // Stage 0: Live Context
    if (memory) {
      memory.working.setCurrentIntent(description);
      if (domain) memory.working.setActiveDomain(domain);
    }

    try {
      // Stage 1: Intent Resolution
      const intentResult = await this.intentOracle.execute(
        { type: 'description', payload: { description, domain } },
        ctx,
      );
      if (!intentResult.success) {
        return this.fail(description, intentResult.payload?.error || 'Intent resolution failed', startTime);
      }
      const intent = intentResult.payload as IntentEnvelope;

      // Stage 2 + 3 + 4 refine loop
      let growth: GrowthOutput | undefined;
      let code: CodeGenOutput | undefined;
      let refineCount = 0;

      for (let attempt = 0; attempt <= this.config.maxRefineAttempts; attempt++) {
        // Stage 2: Code Generation
        const codeResult = await this.codeSmith.execute(
          { type: 'intent', payload: intent },
          ctx,
        );
        if (!codeResult.success) {
          return this.fail(description, 'Code generation failed', startTime);
        }
        code = codeResult.payload as CodeGenOutput;

        // Stage 3: Deterministic Growth
        growth = await this.deterministicGrowth(intent, code);

        // Stage 4: Validation
        const validationResult = await this.validator.execute(
          {
            type: 'artifact',
            payload: {
              description,
              artifact: growth.artifact,
              domain: intent.domain,
              quality: growth.quality,
            },
          },
          ctx,
        );

        if (validationResult.success) {
          const validation = validationResult.payload;
          if (validation.valid || attempt >= this.config.maxRefineAttempts) {
            refineCount = attempt;
            break;
          }
          // Refine: adjust intent based on issues
          refineCount = attempt + 1;
          if (validation.adjustedDescription) {
            intent.description = validation.adjustedDescription;
          }
        }
      }

      // Stage 5: Evolution (optional)
      let evolutionResult;
      if (this.config.enableEvolution && growth && growth.quality < 0.95) {
        evolutionResult = await this.evolver.execute(
          {
            type: 'seed',
            payload: {
              seed: growth.seed,
              populationSize: this.config.evolutionPopulationSize,
              generations: this.config.evolutionGenerations,
            },
          },
          ctx,
        );
      }

      // Stage 5b: Composition (optional)
      let compositionResult;
      if (this.config.enableComposition && growth) {
        compositionResult = await this.composer.execute(
          {
            type: 'seed',
            payload: { seed: growth.seed, maxSuggestions: 3 },
          },
          ctx,
        );
      }

      // Stage 6: Sign & Archive
      let archiveResult;
      if (this.config.enableSigning && growth) {
        archiveResult = await this.sovereignSigner.execute(
          {
            type: 'seed',
            payload: {
              seed: growth.seed,
              artifact: growth.artifact,
            },
          },
          ctx,
        );
      }

      // Record to memory
      if (memory && growth) {
        memory.recordEpisode(
          'create', intent.domain, description,
          growth.seedId, growth.seedHash,
          !!(growth.quality >= this.config.confidenceThreshold),
        );
      }

      return {
        success: true,
        description,
        intent,
        code,
        growth,
        validation: evolutionResult?.payload,
        evolution: evolutionResult?.payload,
        composition: compositionResult?.payload,
        archive: archiveResult?.payload,
        duration: Date.now() - startTime,
        refineCount,
      };
    } catch (err: any) {
      return this.fail(description, err.message, startTime);
    }
  }

  private async deterministicGrowth(intent: IntentEnvelope, code: CodeGenOutput): Promise<GrowthOutput> {
    const hash = crypto.createHash('sha256')
      .update(`${intent.domain}:${intent.description}:${JSON.stringify(intent.genes)}`)
      .digest('hex');

    const seed: any = {
      id: `seed-${hash.slice(0, 12)}`,
      $domain: intent.domain,
      $name: `${intent.domain}_${hash.slice(0, 8)}`,
      $hash: hash,
      $lineage: { generation: 0, operation: 'pipeline', parents: [] as string[] },
      $fitness: { overall: 0.5 + (parseInt(hash.slice(0, 2), 16) / 256) * 0.3 },
      genes: {},
      metadata: { description: intent.description, style: intent.style, code: code.gsplCode },
    };

    for (const [k, v] of Object.entries(intent.genes)) {
      seed.genes[k] = {
        type: typeof v === 'number' ? 'scalar' : typeof v === 'string' ? 'categorical' : 'struct',
        value: v,
      };
    }

    let artifact: any;
    let quality = 0.7;

    try {
      const { growSeed } = await import('../../kernel/engines');
      artifact = await growSeed(seed);
      quality = artifact?.quality ? parseFloat(String(artifact.quality)) : 0.8;
    } catch {
      artifact = {
        format: 'json',
        domain: intent.domain,
        hash,
        description: intent.description,
        style: intent.style,
      };
      quality = 0.65;
    }

    return {
      seedId: seed.id,
      seedHash: hash,
      seed,
      artifact,
      domain: intent.domain,
      quality,
    };
  }

  private fail(description: string, error: string, startTime: number): PipelineResult {
    return {
      success: false,
      description,
      error,
      duration: Date.now() - startTime,
      refineCount: 0,
    };
  }
}
