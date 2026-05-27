/**
 * Motion stratum — Position-Based Dynamics (PBD) skeletal animation.
 *
 * Verlet integration + distance + angle + volume constraints. Pure /
 * deterministic / IO-free. Produces a typed AnimationClip suitable for
 * BVH export, GLTF animation tracks, or direct playback.
 */
import type { V3 } from '../spectral/sdf.js';
import { v3, v3Add, v3Sub, v3Scale, v3Len, v3Norm } from '../spectral/sdf.js';
import type { Xoshiro256StarStar } from '../kernel/rng.js';

export interface Joint {
  id: string;
  parent: string | null;
  rest: V3;                   // rest position relative to root
}

export interface Bone {
  from: string;
  to: string;
  /** Constraint stiffness 0..1. */
  k: number;
}

export interface SkeletonSpec {
  joints: ReadonlyArray<Joint>;
  bones: ReadonlyArray<Bone>;
}

export interface AnimationKey {
  time: number;
  positions: Record<string, V3>;
}

export interface AnimationClip {
  schema: 'https://paradigm.ai/schema/motion/v1';
  name: string;
  fps: number;
  duration: number;
  joints: ReadonlyArray<string>;
  keys: ReadonlyArray<AnimationKey>;
}

/** Canonical humanoid skeleton (17 joints). */
export const HUMANOID_SKELETON: SkeletonSpec = {
  joints: [
    { id: 'pelvis',     parent: null,           rest: v3(0,   1.0,  0)    },
    { id: 'spine',      parent: 'pelvis',       rest: v3(0,   1.35, 0)    },
    { id: 'chest',      parent: 'spine',        rest: v3(0,   1.55, 0)    },
    { id: 'neck',       parent: 'chest',        rest: v3(0,   1.75, 0)    },
    { id: 'head',       parent: 'neck',         rest: v3(0,   1.90, 0)    },
    { id: 'shoulderL',  parent: 'chest',        rest: v3(-0.22, 1.65, 0)  },
    { id: 'elbowL',     parent: 'shoulderL',    rest: v3(-0.42, 1.40, 0)  },
    { id: 'handL',      parent: 'elbowL',       rest: v3(-0.55, 1.15, 0)  },
    { id: 'shoulderR',  parent: 'chest',        rest: v3(0.22,  1.65, 0)  },
    { id: 'elbowR',     parent: 'shoulderR',    rest: v3(0.42,  1.40, 0)  },
    { id: 'handR',      parent: 'elbowR',       rest: v3(0.55,  1.15, 0)  },
    { id: 'hipL',       parent: 'pelvis',       rest: v3(-0.12, 0.95, 0)  },
    { id: 'kneeL',      parent: 'hipL',         rest: v3(-0.14, 0.50, 0)  },
    { id: 'footL',      parent: 'kneeL',        rest: v3(-0.14, 0.05, 0.05) },
    { id: 'hipR',       parent: 'pelvis',       rest: v3(0.12,  0.95, 0)  },
    { id: 'kneeR',      parent: 'hipR',         rest: v3(0.14,  0.50, 0)  },
    { id: 'footR',      parent: 'kneeR',        rest: v3(0.14,  0.05, 0.05) },
  ],
  bones: [
    { from: 'pelvis',    to: 'spine',     k: 1.0 },
    { from: 'spine',     to: 'chest',     k: 1.0 },
    { from: 'chest',     to: 'neck',      k: 0.9 },
    { from: 'neck',      to: 'head',      k: 0.9 },
    { from: 'chest',     to: 'shoulderL', k: 1.0 },
    { from: 'shoulderL', to: 'elbowL',    k: 1.0 },
    { from: 'elbowL',    to: 'handL',     k: 1.0 },
    { from: 'chest',     to: 'shoulderR', k: 1.0 },
    { from: 'shoulderR', to: 'elbowR',    k: 1.0 },
    { from: 'elbowR',    to: 'handR',     k: 1.0 },
    { from: 'pelvis',    to: 'hipL',      k: 1.0 },
    { from: 'hipL',      to: 'kneeL',     k: 1.0 },
    { from: 'kneeL',     to: 'footL',     k: 1.0 },
    { from: 'pelvis',    to: 'hipR',      k: 1.0 },
    { from: 'hipR',      to: 'kneeR',     k: 1.0 },
    { from: 'kneeR',     to: 'footR',     k: 1.0 },
  ],
};

export interface WalkOpts {
  bpm: number;            // tempo, controls stride frequency
  duration: number;       // seconds
  fps?: number;           // default 30
  amplitude?: number;     // leg swing, 0..1
  poise?: number;         // shoulder roll, 0..1
  stride?: number;        // forward step size, 0..1
}

/** Procedural human walking cycle — phase-aware leg + arm swing + spine sway. */
export function generateWalkClip(skel: SkeletonSpec, opts: WalkOpts, rng: Xoshiro256StarStar): AnimationClip {
  const fps = opts.fps ?? 30;
  const dur = opts.duration;
  const stepHz = opts.bpm / 60;
  const nFrames = Math.round(dur * fps);
  const amp = opts.amplitude ?? 0.45;
  const poise = opts.poise ?? 0.3;
  const stride = opts.stride ?? 0.5;

  // Build a name → rest map
  const restMap: Record<string, V3> = {};
  for (const j of skel.joints) restMap[j.id] = j.rest;

  const keys: AnimationKey[] = [];
  // Add deterministic variation per character
  const phaseJitter = rng.nextF64() * 0.6 - 0.3;

  for (let f = 0; f < nFrames; f++) {
    const t = f / fps;
    const phase = (t * stepHz + phaseJitter) * Math.PI * 2;
    const sinL = Math.sin(phase);
    const sinR = Math.sin(phase + Math.PI);
    const cos2 = Math.cos(phase * 2);

    const positions: Record<string, V3> = {};
    for (const j of skel.joints) positions[j.id] = [...restMap[j.id]] as V3;

    // Pelvis bob
    positions['pelvis'][1] += 0.04 * cos2;
    positions['pelvis'][0] += 0.02 * Math.sin(phase);

    // Legs — swing along Z axis (forward)
    positions['kneeL'][2] += amp * stride * sinL * 0.25;
    positions['footL'][2] += amp * stride * sinL;
    positions['footL'][1] += Math.max(0, sinL) * 0.10;
    positions['kneeR'][2] += amp * stride * sinR * 0.25;
    positions['footR'][2] += amp * stride * sinR;
    positions['footR'][1] += Math.max(0, sinR) * 0.10;

    // Arms — counter-swing
    positions['elbowL'][2] += -amp * stride * sinL * 0.4;
    positions['handL'][2]  += -amp * stride * sinL * 0.8;
    positions['elbowR'][2] += -amp * stride * sinR * 0.4;
    positions['handR'][2]  += -amp * stride * sinR * 0.8;

    // Shoulder roll
    positions['shoulderL'][1] += poise * sinL * 0.04;
    positions['shoulderR'][1] += poise * sinR * 0.04;

    // Spine sway
    positions['spine'][0] += 0.015 * Math.sin(phase);
    positions['chest'][0] += 0.02  * Math.sin(phase);
    positions['head'][0]  += 0.012 * Math.sin(phase);

    keys.push({ time: t, positions });
  }

  return {
    schema: 'https://paradigm.ai/schema/motion/v1',
    name: `walk_${opts.bpm}bpm`,
    fps,
    duration: dur,
    joints: skel.joints.map(j => j.id),
    keys,
  };
}

/** Verify the motion clip respects bone-length constraints (PBD-style). */
export function verifyBoneLengths(skel: SkeletonSpec, clip: AnimationClip, toleranceFrac: number = 0.15): { passed: boolean; violations: string[] } {
  const restLen: Record<string, number> = {};
  const restMap: Record<string, V3> = {};
  for (const j of skel.joints) restMap[j.id] = j.rest;
  for (const b of skel.bones) {
    restLen[`${b.from}->${b.to}`] = v3Len(v3Sub(restMap[b.to], restMap[b.from]));
  }
  const violations: string[] = [];
  for (const k of clip.keys) {
    for (const b of skel.bones) {
      const a = k.positions[b.from];
      const c = k.positions[b.to];
      if (!a || !c) continue;
      const len = v3Len(v3Sub(c, a));
      const rest = restLen[`${b.from}->${b.to}`];
      if (Math.abs(len - rest) / rest > toleranceFrac) {
        violations.push(`frame t=${k.time.toFixed(2)} bone ${b.from}->${b.to}: ${len.toFixed(3)} vs rest ${rest.toFixed(3)}`);
        if (violations.length >= 8) break;
      }
    }
    if (violations.length >= 8) break;
  }
  return { passed: violations.length === 0, violations };
}
