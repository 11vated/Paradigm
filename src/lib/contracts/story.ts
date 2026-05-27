/**
 * Story stratum contract — Doctrine v2 Part VI.5 (Phase 3).
 *
 * - Beat structure declared and consistent with beat count.
 * - Causality graph acyclic (engine self-report verified).
 * - Character voice consistency vs MindSeed fingerprints.
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

export interface StoryArtifact {
  /** Declared beat structure id ('save-the-cat' | 'heros-journey' | etc.). */
  readonly beatStructure?: string;
  /** Beat count. */
  readonly beatCount?: number;
  /** Whether the causality graph is acyclic (engine self-report). */
  readonly causalityAcyclic?: boolean;
  /** Number of nodes / edges in causality graph (for sanity). */
  readonly causalityNodeCount?: number;
  readonly causalityEdgeCount?: number;
  /** Linked MindSeed hashes per character. */
  readonly characterMindHashes?: Readonly<Record<string, string>>;
  /** Engine self-report on per-character voice fingerprint match. */
  readonly voiceFingerprintsMatch?: boolean;
}

const ABSENT: PredicateResult = {
  kind: 'unimplemented',
  reason: 'Engine has not declared this property on the StoryArtifact.',
};

const BEAT_COUNTS: Record<string, number> = {
  'save-the-cat': 15,
  'heros-journey': 17,
  'three-act': 3,
  'five-act': 5,
  'seven-point': 7,
  'kishotenketsu': 4,
};

function pred(
  id: string,
  description: string,
  body: (a: StoryArtifact) => PredicateResult,
): ContractPredicate<StoryArtifact> {
  return { id, description, evaluate: body };
}

const beatStructure = pred(
  'story.beatStructureDeclared',
  'A canonical beat structure is declared and matches the beat count.',
  (a) => {
    if (a.beatStructure === undefined) return ABSENT;
    if (typeof a.beatStructure !== 'string' || a.beatStructure.length === 0) {
      return { kind: 'fail', reason: 'beatStructure must be a non-empty string.' };
    }
    if (a.beatCount === undefined) {
      return {
        kind: 'unimplemented',
        reason: 'beatStructure declared but beatCount missing.',
      };
    }
    if (!Number.isInteger(a.beatCount) || a.beatCount <= 0) {
      return { kind: 'fail', reason: `beatCount ${a.beatCount} must be a positive integer.` };
    }
    const expected = BEAT_COUNTS[a.beatStructure];
    if (expected !== undefined && a.beatCount !== expected) {
      return {
        kind: 'fail',
        reason: `beatStructure "${a.beatStructure}" canonically has ${expected} beats; declared ${a.beatCount}.`,
      };
    }
    return { kind: 'pass' };
  },
);

const causalityAcyclic = pred(
  'story.causalityAcyclic',
  'Event causality graph is acyclic (DAG: edges ≤ n(n-1)/2 sanity).',
  (a) => {
    if (a.causalityAcyclic === undefined) return ABSENT;
    if (!a.causalityAcyclic) {
      return { kind: 'fail', reason: 'Engine self-reports cyclic causality graph.' };
    }
    if (a.causalityNodeCount !== undefined && a.causalityEdgeCount !== undefined) {
      const n = a.causalityNodeCount;
      const maxEdgesDag = (n * (n - 1)) / 2;
      if (a.causalityEdgeCount > maxEdgesDag) {
        return {
          kind: 'fail',
          reason: `edgeCount ${a.causalityEdgeCount} > max DAG edges ${maxEdgesDag} for ${n} nodes; cannot be acyclic.`,
        };
      }
    }
    return { kind: 'pass' };
  },
);

const voiceConsistency = pred(
  'story.voiceConsistency',
  'Dialogue per character matches the voice fingerprint of its MindSeed.',
  (a) => {
    if (a.characterMindHashes === undefined) return ABSENT;
    const entries = Object.entries(a.characterMindHashes);
    if (entries.length === 0) {
      return { kind: 'fail', reason: 'characterMindHashes is empty.' };
    }
    for (const [name, hash] of entries) {
      if (typeof name !== 'string' || name.length === 0) {
        return { kind: 'fail', reason: 'characterMindHashes has empty character name.' };
      }
      if (typeof hash !== 'string' || hash.length === 0) {
        return { kind: 'fail', reason: `characterMindHashes["${name}"] is not a non-empty string.` };
      }
    }
    if (a.voiceFingerprintsMatch === undefined) {
      return {
        kind: 'unimplemented',
        reason: 'characterMindHashes declared but voiceFingerprintsMatch verdict missing.',
      };
    }
    return a.voiceFingerprintsMatch
      ? { kind: 'pass' }
      : { kind: 'fail', reason: 'Engine self-reports dialogue inconsistent with MindSeed fingerprints.' };
  },
);

export const storyContract: StratumContract<StoryArtifact> = defineStratum<StoryArtifact>(
  'story',
  '0.2.0',
  [beatStructure, causalityAcyclic, voiceConsistency],
);
