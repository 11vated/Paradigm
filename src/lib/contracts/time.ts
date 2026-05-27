/**
 * Time stratum contract — Doctrine v2 Part VI.9 (Phase 3).
 *
 * - Chronology acyclic.
 * - Event causality respected (no effect precedes its cause on the same world line).
 * - Time-scale declared and consistent across linked artifacts.
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

export type TimeScale = 'real-time' | 'in-game' | 'mythic';

export interface TimeArtifact {
  /** Declared time-scale. */
  readonly timeScale?: TimeScale;
  /** Number of declared events. */
  readonly eventCount?: number;
  /** Engine self-report of acyclic chronology. */
  readonly chronologyAcyclic?: boolean;
  /** Number of chronology edges (event → event). */
  readonly chronologyEdgeCount?: number;
  /** Engine self-report on causality respect. */
  readonly causalityRespected?: boolean;
  /** Per-world-line causality violations observed (0 = clean). */
  readonly causalityViolationCount?: number;
}

const ABSENT: PredicateResult = {
  kind: 'unimplemented',
  reason: 'Engine has not declared this property on the TimeArtifact.',
};

const ALLOWED_SCALES: ReadonlyArray<TimeScale> = ['real-time', 'in-game', 'mythic'];

function pred(
  id: string,
  description: string,
  body: (a: TimeArtifact) => PredicateResult,
): ContractPredicate<TimeArtifact> {
  return { id, description, evaluate: body };
}

const chronologyAcyclic = pred(
  'time.chronologyAcyclic',
  'Chronology graph is acyclic (edges ≤ n(n-1)/2 sanity).',
  (a) => {
    if (a.chronologyAcyclic === undefined) return ABSENT;
    if (!a.chronologyAcyclic) {
      return { kind: 'fail', reason: 'Engine self-reports cyclic chronology.' };
    }
    if (a.eventCount !== undefined && a.chronologyEdgeCount !== undefined) {
      const n = a.eventCount;
      if (!Number.isInteger(n) || n < 0) {
        return { kind: 'fail', reason: `eventCount ${n} invalid.` };
      }
      if (!Number.isInteger(a.chronologyEdgeCount) || a.chronologyEdgeCount < 0) {
        return { kind: 'fail', reason: `chronologyEdgeCount ${a.chronologyEdgeCount} invalid.` };
      }
      const maxDagEdges = (n * (n - 1)) / 2;
      if (a.chronologyEdgeCount > maxDagEdges) {
        return {
          kind: 'fail',
          reason: `edgeCount ${a.chronologyEdgeCount} > max DAG edges ${maxDagEdges} for ${n} events.`,
        };
      }
    }
    return { kind: 'pass' };
  },
);

const causalityRespected = pred(
  'time.causalityRespected',
  'No effect precedes its cause within the same world line.',
  (a) => {
    if (a.causalityRespected === undefined && a.causalityViolationCount === undefined) {
      return ABSENT;
    }
    if (a.causalityViolationCount !== undefined) {
      if (!Number.isInteger(a.causalityViolationCount) || a.causalityViolationCount < 0) {
        return { kind: 'fail', reason: `causalityViolationCount ${a.causalityViolationCount} invalid.` };
      }
      if (a.causalityViolationCount > 0) {
        return {
          kind: 'fail',
          reason: `${a.causalityViolationCount} causality violation(s) reported.`,
        };
      }
    }
    if (a.causalityRespected === false) {
      return { kind: 'fail', reason: 'Engine self-reports causality not respected.' };
    }
    return { kind: 'pass' };
  },
);

const scaleDeclared = pred(
  'time.scaleDeclared',
  'Time-scale declared from canonical set.',
  (a) => {
    if (a.timeScale === undefined) return ABSENT;
    return ALLOWED_SCALES.includes(a.timeScale)
      ? { kind: 'pass' }
      : { kind: 'fail', reason: `timeScale "${a.timeScale}" not in canonical set.` };
  },
);

export const timeContract: StratumContract<TimeArtifact> = defineStratum<TimeArtifact>(
  'time',
  '0.2.0',
  [chronologyAcyclic, causalityRespected, scaleDeclared],
);
