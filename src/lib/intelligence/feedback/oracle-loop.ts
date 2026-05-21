/**
 * Oracle Feedback Loop — self-critiquing agent
 *
 * The single biggest jump in output quality is wiring the existing
 * Oracle into the Sovereign Agent so the agent reads its own scorecard
 * and iterates. AlphaZero for generative design — except the policy
 * is the agent + sub-agents and the value function is the Oracle.
 *
 * Loop:
 *   1. Stage 3 produces ConstructionPlan v0 from a ResolvedIntent
 *   2. Stage 4 assembles → seed
 *   3. Oracle scores seed → OracleReport (overall + per-axis)
 *   4. Notes synthesized from low axes + CritiqueAgent
 *   5. If overall < threshold AND budget remaining:
 *        re-run Stage 3 with notes; loop
 *   6. Return the highest-scoring variant
 *
 * Sovereignty: all local. Deterministic given the kernel/clock + seeds.
 */

import type {
  AssembledOutput,
  ConstructionPlan,
  ResolvedIntent,
  ValidatedSeed,
  OracleReport,
} from '../agent/types';
import type { Oracle, Signer } from '../agent/stages/stage-5-validate';
import { plan as runPlan } from '../agent/stages/stage-3-plan';
import { assemble } from '../agent/stages/stage-4-assemble';
import { validate } from '../agent/stages/stage-5-validate';
import { CritiqueAgent } from '../agent/sub-agents/critique-agent';
import { kernelNow } from '../../kernel/clock';

export interface FeedbackLoopOptions {
  oracle: Oracle;
  signer?: Signer;
  /** Stop when Oracle overall score reaches this. Default 0.85. */
  scoreThreshold?: number;
  /** Maximum number of full re-plan iterations. Default 4. */
  maxIterations?: number;
  /** Diminishing-returns cutoff: stop if improvement < this. Default 0.02. */
  minImprovement?: number;
  /** Soft wall-clock budget in ms. */
  timeBudgetMs?: number;
}

export interface IterationRecord {
  iteration: number;
  planHash: string;
  oracle: OracleReport;
  notes: string[];
  acceptedAsBest: boolean;
  durationMs: number;
}

export interface FeedbackLoopResult {
  best: ValidatedSeed;
  iterations: IterationRecord[];
  stoppedReason:
    | 'threshold-met'
    | 'max-iterations'
    | 'diminishing-returns'
    | 'budget-exhausted';
}

/**
 * Run the Oracle-feedback loop from a fully resolved intent.
 *
 * Owns Stage 3 → Stage 5 and reflects between iterations. Returns
 * the best ValidatedSeed observed plus the full iteration ledger.
 */
export async function runFeedbackLoop(
  resolved: ResolvedIntent,
  opts: FeedbackLoopOptions,
): Promise<FeedbackLoopResult> {
  const threshold = opts.scoreThreshold ?? 0.85;
  const maxIters = opts.maxIterations ?? 4;
  const minImprovement = opts.minImprovement ?? 0.02;
  const startedAt = kernelNow();
  const critique = new CritiqueAgent();

  const records: IterationRecord[] = [];
  let best: ValidatedSeed | undefined;
  let priorNotes: string[] = [];
  let stoppedReason: FeedbackLoopResult['stoppedReason'] = 'max-iterations';

  for (let iter = 0; iter < maxIters; iter++) {
    const iterStart = kernelNow();
    const planCtx: ConstructionPlan = await runPlan(resolved, {
      iteration: iter,
      iterationNotes: priorNotes,
    });
    const assembled: AssembledOutput = await assemble(planCtx, { lookupSeed: async () => undefined });
    const validated: ValidatedSeed = await validate(assembled, {
      oracle: opts.oracle,
      signer: opts.signer,
    });

    const notes = await synthesizeNotes(validated.oracle, resolved, critique);
    const accepted = !best || validated.oracle.overall > best.oracle.overall;
    records.push({
      iteration: iter,
      planHash: planCtx.planHash,
      oracle: validated.oracle,
      notes,
      acceptedAsBest: accepted,
      durationMs: kernelNow() - iterStart,
    });
    if (accepted) best = validated;

    if (validated.oracle.overall >= threshold) {
      stoppedReason = 'threshold-met';
      break;
    }
    if (
      iter > 0 &&
      records[iter].oracle.overall - records[iter - 1].oracle.overall < minImprovement
    ) {
      stoppedReason = 'diminishing-returns';
      break;
    }
    if (opts.timeBudgetMs !== undefined && kernelNow() - startedAt > opts.timeBudgetMs) {
      stoppedReason = 'budget-exhausted';
      break;
    }
    priorNotes = notes;
  }

  if (!best) {
    throw new Error('Feedback loop produced no valid seed — Oracle or plan failed');
  }
  return { best, iterations: records, stoppedReason };
}

/** Convert an OracleReport + critique into actionable iteration notes. */
async function synthesizeNotes(
  report: OracleReport,
  resolved: ResolvedIntent,
  critique: CritiqueAgent,
): Promise<string[]> {
  const notes: string[] = [];

  // 1. Per-axis weakness: any axis below 0.5 becomes a concrete note.
  for (const axisName of Object.keys(report.axes)) {
    const score = report.axes[axisName];
    if (score < 0.5) {
      notes.push(`Weak axis "${axisName}" (${score.toFixed(2)}): increase emphasis next pass.`);
    }
  }

  // 2. Aggregate score gap: push toward novelty / dimensional saturation.
  if (report.overall < 0.7) {
    notes.push('Overall Oracle score low — try a more distinctive value on the dominant gene path.');
  }

  // 3. Oracle's own free-form notes become explicit instructions.
  for (const n of report.notes) notes.push(`Oracle: ${n}`);

  // 4. CritiqueAgent's domain coverage analysis.
  const critiqueOut = await critique.run({
    intent: resolved.intent,
    partial: resolved.geneSpecs,
    memory: {
      recall: () => undefined,
      lookup: () => undefined,
      worldFact: () => undefined,
    },
  });
  for (const c of critiqueOut.critiques ?? []) {
    notes.push(`Critique: ${c}`);
  }

  // De-duplicate
  return Array.from(new Set(notes));
}
