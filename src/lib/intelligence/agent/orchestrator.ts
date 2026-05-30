/**
 * Sovereign Agent Orchestrator
 *
 * The single entry point for "give me a seed for X". Drives the
 * canonical 5-stage pipeline (Stage-0 live context is opportunistic;
 * Stage-6 archival is fire-and-forget):
 *
 *   Stage 0: prime memory with live context           (optional)
 *   Stage 1: parse(raw) → ParsedIntent                (LLM-light)
 *   Stage 2: resolve(intent) → ResolvedIntent         (sub-agents)
 *   Stage 3: plan(resolved) → ConstructionPlan        (LLM-optional)
 *   Stage 4: assemble(plan) → AssembledOutput         (PURE)
 *   Stage 5: validate(assembled) → ValidatedSeed      (PURE)
 *   Stage 6: archive(validated)                       (memory write)
 *
 * The Stage-3 ConstructionPlan is the determinism boundary: from there
 * to the end the pipeline is byte-stable.
 */

import type { SeedLLM } from '../llm/base';
import { calculateStratumConformance } from '../../kernel/quality/predicates.js';  // Phase 1/2 live conformance wiring (full autonomy)
import type { Seed } from '../../kernel/engines';
import type { MemoryOrchestrator } from '../memory/types';
import { kernelNow } from '../../kernel/clock';
import { parse } from './stages/stage-1-parse';
import { resolve as resolveStage } from './stages/stage-2-resolve';
import { plan as planStage } from './stages/stage-3-plan';
import { assemble } from './stages/stage-4-assemble';
import { validate, defaultOracle, type Oracle, type Signer } from './stages/stage-5-validate';
import { defaultSubAgents } from './sub-agents';
import { runFeedbackLoop, type FeedbackLoopOptions } from '../feedback';
import { gatherLiveContext, type LiveContext, type LiveContextOptions } from './stages/stage-0-context';
import { archive as archiveStage6 } from './stages/stage-6-archive';
import type { CanonMemory } from '../memory/canon';
import { signatureFor, dominantDimension, signatureMagnitude, type DimensionalSignature } from '../reality/dimensions';
import { captureReproducibleRun, type ReproducibilityCapture } from '../reproducibility';
// resonance scoring is exposed as a separate API for comparing seed pairs
import type {
  ConstructionPlan,
  ParsedIntent,
  ResolvedIntent,
  SubAgent,
  ValidatedSeed,
} from './types';

export interface RunOptions {
  /** Seed lookup for inherit / crossover / compose steps */
  lookupSeed?: (hash: string) => Promise<Seed | undefined>;
  /** Domain-specific oracle (defaults to a minimal baseline) */
  oracle?: Oracle;
  /** Sovereignty signer */
  signer?: Signer;
  /** Recent domains hint for Stage 1 */
  recentDomains?: string[];
  /** Known names for entity resolution */
  knownNames?: Map<string, string>;
  /** Pass-through quality threshold for Stage 5 */
  passThreshold?: number;
  /** Skip Stage-5 validation entirely (e.g. for preview UI) */
  skipValidate?: boolean;
  liveContext?: LiveContextOptions & { enabled?: boolean };
  /** Don't write Stage-6 archive entries (e.g. for trial-runs) */
  ephemeral?: boolean;
  feedbackLoop?: Omit<FeedbackLoopOptions, 'oracle' | 'critique' | 'lookupSeed' | 'planLlm' | 'planLlmTag'> & { enabled?: boolean };
  annotateReality?: boolean;

  /** Doctrine v2 — capture reproducibility tuple (intent + memoryHash + seedCorpusHash) */
  captureReproducible?: boolean;
}

export interface AgentRunReport {
  intent: ParsedIntent;
  resolved: ResolvedIntent;
  plan: ConstructionPlan;
  seed: Seed;
  validated?: ValidatedSeed;
  timings: Record<string, number>;
  reality?: { signature: DimensionalSignature; dominant: string; magnitude: number };
  iterations?: number;
  liveContext?: LiveContext;

  /** Doctrine v2 reproducibility capture (only present when captureReproducible: true) */
  reproducibility?: ReproducibilityCapture;
}

export class SovereignAgent {
  constructor(
    private readonly llm: SeedLLM,
    private readonly memory: MemoryOrchestrator,
    private readonly subAgents: SubAgent[] = defaultSubAgents(),
    private readonly version = '0.1',
    private readonly canon?: CanonMemory,
  ) {}

  /** Single-shot run: utterance in, validated seed out. */
  async run(raw: string, opts: RunOptions = {}): Promise<AgentRunReport> {
    const timings: Record<string, number> = {};
    const t0 = kernelNow();

    // Stage 0 — live context (optional; default ON when memory or canon present)
    let liveContext: LiveContext | undefined;
    const stage0Enabled = opts.liveContext?.enabled !== false && (this.memory || this.canon);
    if (stage0Enabled) {
      liveContext = await gatherLiveContext(raw, this.memory, this.canon, opts.liveContext ?? {});
      timings.stage0 = kernelNow() - t0;
    }

    // Stage 1
    const t1 = kernelNow();
    const intent = await parse(raw, {
      llm: this.llm,
      recentDomains: opts.recentDomains,
      knownNames: opts.knownNames,
    });
    timings.stage1 = kernelNow() - t1;

    // Stage 2
    const t2 = kernelNow();
    const resolved = await resolveStage(intent, {
      subAgents: this.subAgents,
      memory: this.memory,
    });
    timings.stage2 = kernelNow() - t2;

    // Stage 3
    const t3 = kernelNow();
    const plan = await planStage(resolved, {
      llm: this.llm,
      llmTag: { provider: "local", model: "auto" },
    });
    timings.stage3 = kernelNow() - t3;

    // Stage 4
    const t4 = kernelNow();
    const assembled = await assemble(plan, {
      lookupSeed: opts.lookupSeed ?? defaultLookup,
    });
    timings.stage4 = kernelNow() - t4;

    // Stage 5 — optionally with self-critique feedback loop
    let validated: ValidatedSeed | undefined;
    let iterations: number | undefined;
    if (!opts.skipValidate) {
      const t5 = kernelNow();
      if (opts.feedbackLoop?.enabled) {
        const loop = await runFeedbackLoop(resolved, {
          oracle: opts.oracle ?? defaultOracle,
          signer: opts.signer,
          maxIterations: opts.feedbackLoop.maxIterations ?? 3,
          scoreThreshold: opts.feedbackLoop.scoreThreshold ?? 0.7,
          minImprovement: opts.feedbackLoop.minImprovement ?? 0.02,
          timeBudgetMs: opts.feedbackLoop.timeBudgetMs,
        });
        validated = loop.best;
        iterations = loop.iterations.length;
        // Re-assign assembled.seed to the loop's chosen seed for downstream use
        (assembled as { seed: typeof assembled.seed }).seed = loop.best.seed;
      } else {
        validated = await validate(assembled, {
          oracle: opts.oracle ?? defaultOracle,
          signer: opts.signer,
          passThreshold: opts.passThreshold,
        });
      }
      timings.stage5 = kernelNow() - t5;
    }

    // Reality-OS annotation — attach dimensional signature to the seed
    let reality: { signature: DimensionalSignature; dominant: string; magnitude: number } | undefined;
    if (opts.annotateReality !== false) {
      const geneTypeKey = (assembled.seed.$domain ?? plan.domain ?? 'misc') as string;
      const signature = signatureFor(geneTypeKey);
      const dominant = dominantDimension(signature);
      const magnitude = signatureMagnitude(signature);
      reality = { signature, dominant, magnitude };
      // Attach to the seed (additive; keeps determinism since signatureFor is pure)
      (assembled.seed as { $reality?: typeof reality }).$reality = reality;
    }

    // Working — recent utterance trail (kept around for live-context Stage 0)
    if (!opts.ephemeral && this.memory) {
      try {
        await this.memory.writeTo('working', {
          key: `utt:${kernelNow()}`,
          topic: 'utterance',
          value: { raw, intentTop: intent.top, seedHash: assembled.seed.$hash },
          source: 'sovereign-agent',
        } as any);
      } catch { /* working memory is best-effort */ }
    }

    // Stage 6 — canonical archive (episodic + semantic + canon RAG)
    if (!opts.ephemeral) {
      const t6 = kernelNow();
      const layers = (this.memory as any)?.layers ?? {};
      await archiveStage6(
        validated ?? { seed: assembled.seed, passed: true, oracle: { overall: 0, axes: {}, notes: [], conformsTo: 'unvalidated' } },
        {
          episodic: layers.episodic,
          semantic: layers.semantic,
          canon: this.canon,
          agentId: 'sovereign-agent',
          skipCanon: false,
        },
      );
      timings.stage6 = kernelNow() - t6;
    }

    timings.total = kernelNow() - t0;

    // Doctrine v2 reproducibility capture (optional, opt-in)
    let reproducibility: ReproducibilityCapture | undefined;
    if (opts.captureReproducible && this.memory) {
      try {
        reproducibility = await captureReproducibleRun(
          { intent, resolved, plan, seed: assembled.seed, validated, timings, reality: reality as any },
          this.memory,
          this.version,
        );
      } catch {
        // Capture is best-effort; never break a run because of it
      }
    }

    // Phase 1/2 full autonomy: attach live Doctrine v2 Stratum Conformance to every agent run
    let stratumConformance: any = undefined;
    try {
      const artifacts = [assembled.seed, validated?.seed].filter(Boolean);
      if (artifacts.length > 0) {
        stratumConformance = calculateStratumConformance(artifacts);
      }
    } catch {}

    return {
      intent,
      resolved,
      plan,
      seed: assembled.seed,
      ...(validated ? { validated } : {}),
      ...(reproducibility ? { reproducibility } : {}),
      ...(reality ? { reality } : {}),
      ...(iterations !== undefined ? { iterations } : {}),
      ...(liveContext ? { liveContext } : {}),
      ...(stratumConformance ? { stratumConformance } : {}),
      timings,
    };
  }

  /** Stage-6: write the run into the right memory layers. */
  private async archive(
    intent: ParsedIntent,
    resolved: ResolvedIntent,
    plan: ConstructionPlan,
    validated: ValidatedSeed,
  ): Promise<void> {
    // Working — recent utterance
    await this.memory.writeTo('working', {
      key: `utt:${plan.planHash.slice(0, 8)}`,
      value: { raw: intent.raw, top: intent.top, sub: intent.sub },
      topic: 'utterance',
      source: 'agent',
    });

    // Semantic — name → hash registration when a name was provided
    const nameEntity = intent.entities.find((e) => e.kind === 'character' || e.kind === 'object');
    if (nameEntity && validated.passed) {
      await this.memory.writeTo('semantic', {
        key: `name:${nameEntity.text.toLowerCase()}`,
        value: { hash: validated.seed.$hash, domain: plan.domain },
        topic: 'name-registry',
        source: 'agent',
      });
    }

    // Canon RAG — embed + index the seed when canon is configured
    if (this.canon && validated.passed) {
      try { await this.canon.ingest(validated.seed); }
      catch (e) { /* canon ingest is best-effort; never block the run */ }
    }

    // Episodic — full run report, if the layer is configured
    try {
      await this.memory.writeTo('episodic', {
        key: `run:${plan.planHash}`,
        value: {
          intent: { raw: intent.raw, top: intent.top, sub: intent.sub, domains: intent.domains },
          plan: { planHash: plan.planHash, base: plan.base, domain: plan.domain, stepCount: plan.steps.length },
          oracle: validated.oracle.overall,
          passed: validated.passed,
        },
        topic: 'agent-run',
        source: 'agent',
      });
    } catch {
      // Episodic layer is optional; ignore if not wired.
    }
  }
}

/** Convenience: build with all defaults */
export function createSovereignAgent(opts: {
  llm: SeedLLM;
  memory: MemoryOrchestrator;
  subAgents?: SubAgent[];
}): SovereignAgent {
  return new SovereignAgent(opts.llm, opts.memory, opts.subAgents ?? defaultSubAgents());
}

async function defaultLookup(_hash: string): Promise<Seed | undefined> {
  return undefined;
}
