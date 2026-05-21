/**
 * Field-Theory Primitives — Reality-OS substrate primitive
 *
 * Models "the invisible" — phenomena that aren't directly rendered but
 * shape what is. Three kinds of field:
 *
 *   IntentionField    — gradient pulling generation toward a goal
 *   PossibilityField  — distribution over counterfactual branches
 *   ConstraintField   — repulsive force away from forbidden regions
 *
 * Fields are scalar functions over gene-value space. The agent uses
 * them to bias resolved gene specs without overriding sub-agent
 * outputs: a field nudges, doesn't dictate.
 *
 * Inspired by physics fields (gravity, EM) and modern continuous
 * optimization. Deterministic — no entropy.
 */

import type { Vec12 } from '../agent/adjective-normalization';

// ─── Field interface ───────────────────────────────────────────────────────

export interface Field {
  /** Human-readable name. */
  readonly name: string;
  /**
   * Score how aligned a 12-D point is with this field's direction.
   * Range: [-1, 1] — positive = attracted, negative = repelled.
   */
  evaluate(point: Vec12): number;
  /**
   * Gradient at a point — vector pointing in direction of steepest
   * ascent. Caller may step the gene specs along this direction by
   * `stepSize` to move toward the field.
   */
  gradient(point: Vec12): Vec12;
}

// ─── Intention field ──────────────────────────────────────────────────────

/**
 * IntentionField is a directed pull toward an explicit goal vector.
 * The closer a point is to the goal (cosine), the higher the score.
 * Gradient points from current point toward goal.
 */
export function intentionField(goal: Vec12, strength = 1): Field {
  const normGoal = normalize(goal);
  return {
    name: 'intention',
    evaluate(point) {
      const v = normalize(point);
      let dot = 0;
      for (let i = 0; i < 12; i++) dot += v[i] * normGoal[i];
      return dot * strength;
    },
    gradient(point) {
      const v = normalize(point);
      const out = new Array(12).fill(0) as number[];
      for (let i = 0; i < 12; i++) {
        out[i] = (normGoal[i] - v[i]) * strength;
      }
      return out as Vec12;
    },
  };
}

// ─── Possibility field ────────────────────────────────────────────────────

/**
 * PossibilityField holds N counterfactual centers (alternate timelines)
 * each with a weight. The field's value at a point is a soft-max
 * weighted blend of distances to each center. Used to keep the agent
 * aware of "what could have been" while still committing to one branch.
 */
export interface PossibilityCenter {
  point: Vec12;
  weight: number; // > 0, higher = more probable in latent space
  label?: string;
}

export function possibilityField(centers: PossibilityCenter[]): Field {
  const normCenters = centers.map((c) => ({ ...c, point: normalize(c.point) }));
  return {
    name: 'possibility',
    evaluate(point) {
      const v = normalize(point);
      let weighted = 0;
      let totalW = 0;
      for (const c of normCenters) {
        let dot = 0;
        for (let i = 0; i < 12; i++) dot += v[i] * c.point[i];
        weighted += dot * c.weight;
        totalW += c.weight;
      }
      return totalW > 0 ? weighted / totalW : 0;
    },
    gradient(point) {
      const v = normalize(point);
      const out = new Array(12).fill(0) as number[];
      let totalW = 0;
      for (const c of normCenters) {
        for (let i = 0; i < 12; i++) {
          out[i] += (c.point[i] - v[i]) * c.weight;
        }
        totalW += c.weight;
      }
      if (totalW > 0) {
        for (let i = 0; i < 12; i++) out[i] /= totalW;
      }
      return out as Vec12;
    },
  };
}

// ─── Constraint field ─────────────────────────────────────────────────────

/**
 * ConstraintField is a soft prohibition. A region of 12-D space
 * (defined by a center + radius) becomes a repulsive zone — the field
 * is negative everywhere inside it, and gradient points away from it.
 *
 * Used for safety / canon-consistency / brand-guideline enforcement.
 */
export function constraintField(
  center: Vec12,
  radius: number,
  strength = 1,
): Field {
  const normCenter = normalize(center);
  return {
    name: 'constraint',
    evaluate(point) {
      const d = cosineDist(normalize(point), normCenter);
      // inside radius: negative; outside: 0
      return d < radius ? -strength * (1 - d / radius) : 0;
    },
    gradient(point) {
      const v = normalize(point);
      const d = cosineDist(v, normCenter);
      const out = new Array(12).fill(0) as number[];
      if (d < radius) {
        // push away from center
        for (let i = 0; i < 12; i++) {
          out[i] = (v[i] - normCenter[i]) * strength;
        }
      }
      return out as Vec12;
    },
  };
}

// ─── Compound field — sum of fields ───────────────────────────────────────

export function compoundField(fields: Field[]): Field {
  return {
    name: `compound[${fields.map((f) => f.name).join('+')}]`,
    evaluate(point) {
      let total = 0;
      for (const f of fields) total += f.evaluate(point);
      return total;
    },
    gradient(point) {
      const out = new Array(12).fill(0) as number[];
      for (const f of fields) {
        const g = f.gradient(point);
        for (let i = 0; i < 12; i++) out[i] += g[i];
      }
      return out as Vec12;
    },
  };
}

// ─── Counterfactual reasoning ─────────────────────────────────────────────

/**
 * Generate K counterfactual variants of a 12-D point by walking in the
 * top-K eigen-directions of the field's gradient. Deterministic given
 * the same input + k. Used for "what would have happened if..."
 * generative branching without entropy.
 */
export function counterfactuals(point: Vec12, field: Field, k = 3): Vec12[] {
  const g = field.gradient(point);
  const variants: Vec12[] = [];
  // Top-k axes by absolute gradient magnitude
  const indexed = g.map((v, i) => ({ v, i }))
    .sort((a, b) => Math.abs(b.v) - Math.abs(a.v))
    .slice(0, k);
  for (const { i, v } of indexed) {
    const next = [...point] as Vec12;
    next[i] += Math.sign(v) * 0.3;
    next[i] = Math.max(-1, Math.min(1, next[i]));
    variants.push(next);
  }
  return variants;
}

// ─── Helpers ──────────────────────────────────────────────────────────────

function normalize(v: number[]): Vec12 {
  let mag = 0;
  for (const x of v) mag += x * x;
  mag = Math.sqrt(mag);
  if (mag < 1e-9) return new Array(12).fill(0) as Vec12;
  const out = new Array(12).fill(0) as number[];
  for (let i = 0; i < 12; i++) out[i] = (v[i] ?? 0) / mag;
  return out as Vec12;
}

function cosineDist(a: Vec12, b: Vec12): number {
  let dot = 0;
  for (let i = 0; i < 12; i++) dot += a[i] * b[i];
  return 1 - dot; // [0, 2]
}
