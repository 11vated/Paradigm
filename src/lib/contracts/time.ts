/**
 * Time stratum contract — Doctrine v2 Part VI.9.
 *
 * - Chronology acyclic.
 * - Event causality respected.
 * - Time-scale declared (real-time | in-game | mythic).
 */
import { defineStratum, todoPredicate, type StratumContract } from './types';

export interface TimeArtifact {
  /** Declared time-scale. */
  readonly timeScale?: 'real-time' | 'in-game' | 'mythic';
  /** Number of declared events. */
  readonly eventCount?: number;
  /** Engine self-report of acyclic chronology. */
  readonly chronologyAcyclic?: boolean;
}

export const timeContract: StratumContract<TimeArtifact> = defineStratum<TimeArtifact>(
  'time',
  '0.1.0',
  [
    todoPredicate('time.chronologyAcyclic', 'Chronology graph is acyclic.'),
    todoPredicate('time.causalityRespected', 'Event causality respected: no effect precedes its cause within the same world line.'),
    todoPredicate('time.scaleDeclared', 'Time-scale declared and consistent across linked artifacts.'),
  ],
);
