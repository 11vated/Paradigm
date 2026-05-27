/**
 * Mind stratum contract — Doctrine v2 Part VI.4 (Phase 3).
 *
 * - Behavior trees / policies typed; no unreachable states.
 * - Goal stack bounded; termination provable.
 * - Cross-stratum coherence with Story.
 *
 * Pure / deterministic / IO-free.
 */
import {
  defineStratum,
  todoPredicate,
  type ContractPredicate,
  type PredicateResult,
  type StratumContract,
} from './types';

export interface MindArtifact {
  /** Number of declared states/nodes. */
  readonly stateCount?: number;
  /** Number of reachable states from entry. */
  readonly reachableCount?: number;
  /** Maximum goal-stack depth observed under deterministic replay. */
  readonly maxGoalDepth?: number;
  /** Engine-declared goal-stack ceiling (replay must stay ≤). */
  readonly goalStackCeiling?: number;
  /** Declared termination proof artifact id (if any). */
  readonly terminationProof?: string | null;
  /** Bounded-step guarantee N if no proof artifact. */
  readonly boundedSteps?: number;
  /** Linked StorySeed hash (if cross-stratum bound). */
  readonly storyHash?: string | null;
  /** Engine-declared coherence verdict against the linked StorySeed. */
  readonly storyCoherenceOk?: boolean;
}

const ABSENT: PredicateResult = {
  kind: 'unimplemented',
  reason: 'Engine has not declared this property on the MindArtifact.',
};

const HARD_GOAL_STACK_CAP = 1024;

function pred(
  id: string,
  description: string,
  body: (a: MindArtifact) => PredicateResult,
): ContractPredicate<MindArtifact> {
  return { id, description, evaluate: body };
}

const statesReachable = pred(
  'mind.statesReachable',
  'Every declared state is reachable from entry; no orphans.',
  (a) => {
    if (a.stateCount === undefined || a.reachableCount === undefined) return ABSENT;
    if (!Number.isInteger(a.stateCount) || a.stateCount < 0) {
      return { kind: 'fail', reason: `stateCount ${a.stateCount} is not a non-negative integer.` };
    }
    if (!Number.isInteger(a.reachableCount) || a.reachableCount < 0) {
      return { kind: 'fail', reason: `reachableCount ${a.reachableCount} is not a non-negative integer.` };
    }
    if (a.reachableCount > a.stateCount) {
      return { kind: 'fail', reason: `reachableCount ${a.reachableCount} > stateCount ${a.stateCount}.` };
    }
    return a.reachableCount === a.stateCount
      ? { kind: 'pass' }
      : {
          kind: 'fail',
          reason: `${a.stateCount - a.reachableCount} orphan state(s) (reachable ${a.reachableCount}/${a.stateCount}).`,
        };
  },
);

const goalStackBounded = pred(
  'mind.goalStackBounded',
  'Goal stack depth ≤ declared ceiling and ≤ hard cap (1024).',
  (a) => {
    if (a.maxGoalDepth === undefined) return ABSENT;
    if (!Number.isFinite(a.maxGoalDepth) || a.maxGoalDepth < 0) {
      return { kind: 'fail', reason: `maxGoalDepth ${a.maxGoalDepth} is invalid.` };
    }
    if (a.maxGoalDepth > HARD_GOAL_STACK_CAP) {
      return {
        kind: 'fail',
        reason: `maxGoalDepth ${a.maxGoalDepth} exceeds hard cap ${HARD_GOAL_STACK_CAP}.`,
      };
    }
    if (a.goalStackCeiling !== undefined && a.maxGoalDepth > a.goalStackCeiling) {
      return {
        kind: 'fail',
        reason: `maxGoalDepth ${a.maxGoalDepth} exceeds engine-declared ceiling ${a.goalStackCeiling}.`,
      };
    }
    return { kind: 'pass' };
  },
);

const terminationProvable = pred(
  'mind.terminationProvable',
  'Termination has a proof artifact id OR a bounded-step guarantee.',
  (a) => {
    const hasProof = typeof a.terminationProof === 'string' && a.terminationProof.length > 0;
    const hasBound =
      a.boundedSteps !== undefined && Number.isFinite(a.boundedSteps) && a.boundedSteps! > 0;
    if (a.terminationProof === undefined && a.boundedSteps === undefined) return ABSENT;
    if (a.terminationProof === null && !hasBound) {
      return { kind: 'fail', reason: 'terminationProof explicitly null and no boundedSteps declared.' };
    }
    if (hasProof || hasBound) return { kind: 'pass' };
    return { kind: 'fail', reason: 'No termination proof and no bounded-step guarantee.' };
  },
);

const storyCoherence = pred(
  'mind.storyCoherence',
  'Behavior is consistent with linked StorySeed arc, if any.',
  (a) => {
    if (a.storyHash === undefined) return ABSENT;
    if (a.storyHash === null) return { kind: 'pass' };
    if (typeof a.storyHash !== 'string' || a.storyHash.length === 0) {
      return { kind: 'fail', reason: 'storyHash is not a non-empty string.' };
    }
    if (a.storyCoherenceOk === undefined) {
      return {
        kind: 'unimplemented',
        reason: 'storyHash declared but storyCoherenceOk verdict missing.',
      };
    }
    return a.storyCoherenceOk
      ? { kind: 'pass' }
      : { kind: 'fail', reason: 'Engine self-reports inconsistency vs linked StorySeed.' };
  },
);

export const mindContract: StratumContract<MindArtifact> = defineStratum<MindArtifact>(
  'mind',
  '0.2.0',
  [statesReachable, goalStackBounded, terminationProvable, storyCoherence],
);
