/**
 * Mind stratum contract — Doctrine v2 Part VI.4.
 *
 * - Behavior trees / policies typed; no unreachable states.
 * - Goal stack bounded; termination provable.
 * - Cross-stratum coherence with Story.
 */
import { defineStratum, todoPredicate, type StratumContract } from './types';

export interface MindArtifact {
  /** Number of declared states/nodes. */
  readonly stateCount?: number;
  /** Number of reachable states from entry. */
  readonly reachableCount?: number;
  /** Maximum goal-stack depth observed under deterministic replay. */
  readonly maxGoalDepth?: number;
  /** Declared termination proof artifact id (if any). */
  readonly terminationProof?: string | null;
  /** Linked StorySeed hash (if cross-stratum bound). */
  readonly storyHash?: string | null;
}

export const mindContract: StratumContract<MindArtifact> = defineStratum<MindArtifact>(
  'mind',
  '0.1.0',
  [
    todoPredicate('mind.statesReachable', 'Every declared state is reachable from entry; no orphans.'),
    todoPredicate('mind.goalStackBounded', 'Goal stack depth bounded under replay.'),
    todoPredicate('mind.terminationProvable', 'Termination has a proof artifact or a bounded-step guarantee.'),
    todoPredicate('mind.storyCoherence', 'Behavior is consistent with linked StorySeed arc, if any.'),
  ],
);
