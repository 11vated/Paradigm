/**
 * Motion stratum contract — Doctrine v2 Part VI.2.
 *
 * - Kinematic legality (no joint hyperextension; ground contact preserved;
 *   physics-plausible accelerations).
 * - Loop closure for cyclic motion.
 * - Beat-grid alignment when seeded against a MusicSeed.
 * - Retargets cleanly across canonical character skeletons.
 */
import { defineStratum, todoPredicate, type StratumContract } from './types';

export interface MotionArtifact {
  /** Length of motion clip in seconds. */
  readonly durationSec?: number;
  /** Whether the clip is intended to loop. */
  readonly cyclic?: boolean;
  /** BPM if seeded against a musical grid. */
  readonly bpm?: number | null;
  /** Skeleton identifier the clip is authored against. */
  readonly skeleton?: string;
  /** Self-reported max joint angular velocity (rad/s). */
  readonly maxAngularVelocity?: number;
}

export const motionContract: StratumContract<MotionArtifact> = defineStratum<MotionArtifact>(
  'motion',
  '0.1.0',
  [
    todoPredicate('motion.jointLegality', 'No joint exceeds declared hyperextension limits.'),
    todoPredicate('motion.groundContact', 'Ground contact preserved for locomotion clips (no foot-sliding beyond ε).'),
    todoPredicate('motion.physicsPlausibleAcceleration', 'Linear/angular accelerations within physiologically plausible bounds.'),
    todoPredicate('motion.loopClosure', 'Cyclic clips close at the seam (no pop in pose, velocity, or acceleration).'),
    todoPredicate('motion.beatAlignment', 'Beat-aligned clips snap to declared BPM grid within tolerance.'),
    todoPredicate('motion.skeletonRetarget', 'Retargets cleanly across canonical skeleton inventory.'),
  ],
);
