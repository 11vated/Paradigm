/**
 * Motion stratum contract — Doctrine v2 Part VI.2 (Phase 3 partial).
 *
 * - Kinematic legality (no joint hyperextension).
 * - Loop closure for cyclic motion.
 * - Beat-grid alignment when seeded against a MusicSeed.
 * - Retargets cleanly across canonical character skeletons.
 *
 * Predicate bodies are pure / deterministic / IO-free. Absent fields
 * return `unimplemented` rather than `fail` (engine has not opted in).
 *
 * Kinematic-legality bounds are conservative human-skeleton defaults:
 * - max joint angular velocity ~50 rad/s (anything beyond is whip-snap
 *   territory; typical human peaks at 25–35 rad/s)
 * - max linear acceleration ~50 g for non-vehicle clips
 */
import {
  defineStratum,
  todoPredicate,
  type ContractPredicate,
  type PredicateResult,
  type StratumContract,
} from './types';

export interface MotionArtifact {
  /** Length of motion clip in seconds. */
  readonly durationSec?: number;
  /** Whether the clip is intended to loop. */
  readonly cyclic?: boolean;
  /** BPM if seeded against a musical grid (null = un-seeded). */
  readonly bpm?: number | null;
  /** Skeleton identifier the clip is authored against. */
  readonly skeleton?: string;
  /** Self-reported max joint angular velocity (rad/s). */
  readonly maxAngularVelocity?: number;
  /** Self-reported max linear acceleration (m/s²). */
  readonly maxLinearAcceleration?: number;
  /** Pose deltas at clip seam (first ↔ last frame). Required for cyclic. */
  readonly seamDelta?: {
    readonly translation: readonly [number, number, number];
    readonly rotation: readonly [number, number, number];
  };
  /** Beat-grid offsets in seconds at which key motion events fall. */
  readonly beatOffsets?: ReadonlyArray<number>;
  /** Canonical skeleton inventory the engine claims to retarget against. */
  readonly retargetsAgainst?: ReadonlyArray<string>;
}

const ABSENT: PredicateResult = {
  kind: 'unimplemented',
  reason: 'Engine has not declared this property on the MotionArtifact.',
};

const MAX_JOINT_ANGULAR_VELOCITY_RAD_S = 50;
const MAX_LINEAR_ACCEL_M_S2 = 50 * 9.80665; // 50g
const SEAM_TRANSLATION_TOL_M = 0.005; // 5 mm
const SEAM_ROTATION_TOL_RAD = 0.01;   // ~0.57°
const BEAT_TOLERANCE_SEC = 0.015;     // 15 ms

function pred(
  id: string,
  description: string,
  body: (a: MotionArtifact) => PredicateResult,
): ContractPredicate<MotionArtifact> {
  return { id, description, evaluate: body };
}

const jointLegalityPredicate = pred(
  'motion.jointLegality',
  'No joint exceeds declared hyperextension limits (angular velocity ≤ 50 rad/s).',
  (a) => {
    if (a.maxAngularVelocity === undefined) return ABSENT;
    if (!Number.isFinite(a.maxAngularVelocity) || a.maxAngularVelocity < 0) {
      return { kind: 'fail', reason: `maxAngularVelocity ${a.maxAngularVelocity} is not a finite non-negative number.` };
    }
    return a.maxAngularVelocity <= MAX_JOINT_ANGULAR_VELOCITY_RAD_S
      ? { kind: 'pass' }
      : {
          kind: 'fail',
          reason: `maxAngularVelocity ${a.maxAngularVelocity.toFixed(2)} rad/s exceeds limit ${MAX_JOINT_ANGULAR_VELOCITY_RAD_S}.`,
        };
  },
);

const groundContactPredicate = todoPredicate<MotionArtifact>(
  'motion.groundContact',
  'Ground contact preserved for locomotion clips (per-frame foot data required; oracle responsibility).',
);

const physicsAccelPredicate = pred(
  'motion.physicsPlausibleAcceleration',
  'Linear acceleration within physiologically plausible bounds (≤ 50g).',
  (a) => {
    if (a.maxLinearAcceleration === undefined) return ABSENT;
    if (!Number.isFinite(a.maxLinearAcceleration) || a.maxLinearAcceleration < 0) {
      return { kind: 'fail', reason: `maxLinearAcceleration ${a.maxLinearAcceleration} is not finite ≥ 0.` };
    }
    return a.maxLinearAcceleration <= MAX_LINEAR_ACCEL_M_S2
      ? { kind: 'pass' }
      : {
          kind: 'fail',
          reason: `maxLinearAcceleration ${a.maxLinearAcceleration.toFixed(2)} m/s² exceeds 50g cap ${MAX_LINEAR_ACCEL_M_S2.toFixed(2)}.`,
        };
  },
);

const loopClosurePredicate = pred(
  'motion.loopClosure',
  'Cyclic clips close at the seam: translation Δ ≤ 5mm, rotation Δ ≤ 0.57° per joint.',
  (a) => {
    if (a.cyclic === undefined) return ABSENT;
    if (!a.cyclic) return { kind: 'pass' };
    if (!a.seamDelta) {
      return { kind: 'fail', reason: 'Cyclic clip is missing seamDelta; cannot evaluate loop closure.' };
    }
    const t = a.seamDelta.translation;
    const r = a.seamDelta.rotation;
    if (t.length !== 3 || r.length !== 3) {
      return { kind: 'fail', reason: 'seamDelta translation/rotation must each have 3 components.' };
    }
    const tMag = Math.hypot(t[0], t[1], t[2]);
    const rMag = Math.hypot(r[0], r[1], r[2]);
    if (tMag > SEAM_TRANSLATION_TOL_M) {
      return { kind: 'fail', reason: `Seam translation delta ${tMag.toFixed(4)}m > tolerance ${SEAM_TRANSLATION_TOL_M}m.` };
    }
    if (rMag > SEAM_ROTATION_TOL_RAD) {
      return { kind: 'fail', reason: `Seam rotation delta ${rMag.toFixed(4)}rad > tolerance ${SEAM_ROTATION_TOL_RAD}rad.` };
    }
    return { kind: 'pass' };
  },
);

const beatAlignmentPredicate = pred(
  'motion.beatAlignment',
  'Beat-aligned clips snap to declared BPM grid within 15ms.',
  (a) => {
    if (a.bpm === undefined) return ABSENT;
    if (a.bpm === null) return { kind: 'pass' }; // un-seeded → trivially aligned
    if (!Number.isFinite(a.bpm) || a.bpm <= 0) {
      return { kind: 'fail', reason: `bpm ${a.bpm} is not a positive finite number.` };
    }
    if (a.beatOffsets === undefined) {
      return { kind: 'fail', reason: 'BPM declared but beatOffsets missing; cannot evaluate alignment.' };
    }
    const beatPeriod = 60 / a.bpm;
    for (const offset of a.beatOffsets) {
      if (!Number.isFinite(offset) || offset < 0) {
        return { kind: 'fail', reason: `beatOffsets entry ${offset} is invalid.` };
      }
      const phase = offset % beatPeriod;
      const distance = Math.min(phase, beatPeriod - phase);
      if (distance > BEAT_TOLERANCE_SEC) {
        return {
          kind: 'fail',
          reason: `Beat offset ${offset.toFixed(4)}s is ${(distance * 1000).toFixed(1)}ms off the ${a.bpm}bpm grid (tol ${BEAT_TOLERANCE_SEC * 1000}ms).`,
        };
      }
    }
    return { kind: 'pass' };
  },
);

const skeletonRetargetPredicate = pred(
  'motion.skeletonRetarget',
  'Retargets cleanly against canonical skeleton inventory (engine self-declares).',
  (a) => {
    if (a.retargetsAgainst === undefined) return ABSENT;
    if (!Array.isArray(a.retargetsAgainst)) {
      return { kind: 'fail', reason: 'retargetsAgainst is not an array.' };
    }
    if (a.retargetsAgainst.length === 0) {
      return { kind: 'fail', reason: 'retargetsAgainst array is empty; engine claims no skeleton support.' };
    }
    for (const s of a.retargetsAgainst) {
      if (typeof s !== 'string' || s.length === 0) {
        return { kind: 'fail', reason: `retargetsAgainst contains invalid entry: ${JSON.stringify(s)}` };
      }
    }
    return { kind: 'pass' };
  },
);

export const motionContract: StratumContract<MotionArtifact> = defineStratum<MotionArtifact>(
  'motion',
  '0.2.0',
  [
    jointLegalityPredicate,
    groundContactPredicate,
    physicsAccelPredicate,
    loopClosurePredicate,
    beatAlignmentPredicate,
    skeletonRetargetPredicate,
  ],
);
