/**
 * Field stratum contract — Doctrine v2 Part VI.7 (Phase 3).
 *
 * - Rules expressible as typed predicates with declared arity/domain.
 * - Decidability declared and enforced (decidable | semi-decidable | undecidable).
 * - Conservation laws (energy, mass, currency, …) declared and enforced.
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

export type Decidability = 'decidable' | 'semi-decidable' | 'undecidable';

export interface FieldArtifact {
  /** Declared decidability class. */
  readonly decidability?: Decidability;
  /** Conservation laws declared (canonical names: 'energy', 'mass', 'currency', etc.). */
  readonly conservedQuantities?: ReadonlyArray<string>;
  /** Rule predicate count. */
  readonly ruleCount?: number;
  /** Per-rule arity. Length must equal ruleCount if both present. */
  readonly ruleArities?: ReadonlyArray<number>;
  /** Conservation drift per step / per quantity (engine self-report). */
  readonly conservationDriftPerStep?: Readonly<Record<string, number>>;
  /** Engine-declared maximum acceptable conservation drift (relative). */
  readonly conservationDriftMax?: number;
}

const ABSENT: PredicateResult = {
  kind: 'unimplemented',
  reason: 'Engine has not declared this property on the FieldArtifact.',
};

const DEFAULT_CONSERVATION_DRIFT_MAX = 1e-9;
const ALLOWED_DECIDABILITY: ReadonlyArray<Decidability> = ['decidable', 'semi-decidable', 'undecidable'];

function pred(
  id: string,
  description: string,
  body: (a: FieldArtifact) => PredicateResult,
): ContractPredicate<FieldArtifact> {
  return { id, description, evaluate: body };
}

const rulesTyped = pred(
  'field.rulesTyped',
  'Rules are typed predicates with declared arity and domain.',
  (a) => {
    if (a.ruleCount === undefined) return ABSENT;
    if (!Number.isInteger(a.ruleCount) || a.ruleCount < 0) {
      return { kind: 'fail', reason: `ruleCount ${a.ruleCount} must be a non-negative integer.` };
    }
    if (a.ruleArities === undefined) {
      return {
        kind: 'unimplemented',
        reason: 'ruleCount declared but ruleArities missing.',
      };
    }
    if (a.ruleArities.length !== a.ruleCount) {
      return {
        kind: 'fail',
        reason: `ruleArities length ${a.ruleArities.length} ≠ ruleCount ${a.ruleCount}.`,
      };
    }
    for (let i = 0; i < a.ruleArities.length; i++) {
      const ar = a.ruleArities[i]!;
      if (!Number.isInteger(ar) || ar < 0) {
        return { kind: 'fail', reason: `ruleArities[${i}]=${ar} must be a non-negative integer.` };
      }
    }
    return { kind: 'pass' };
  },
);

const decidabilityDeclared = pred(
  'field.decidabilityDeclared',
  'Decidability class is declared and from canonical set.',
  (a) => {
    if (a.decidability === undefined) return ABSENT;
    return ALLOWED_DECIDABILITY.includes(a.decidability)
      ? { kind: 'pass' }
      : { kind: 'fail', reason: `decidability "${a.decidability}" not in canonical set.` };
  },
);

const conservation = pred(
  'field.conservation',
  'Declared conserved quantities are conserved under simulation steps within drift bound.',
  (a) => {
    if (a.conservedQuantities === undefined) return ABSENT;
    if (!Array.isArray(a.conservedQuantities) || a.conservedQuantities.length === 0) {
      return { kind: 'fail', reason: 'conservedQuantities must be a non-empty array.' };
    }
    if (a.conservationDriftPerStep === undefined) {
      return {
        kind: 'unimplemented',
        reason: 'conservedQuantities declared but conservationDriftPerStep missing.',
      };
    }
    const driftMax = a.conservationDriftMax ?? DEFAULT_CONSERVATION_DRIFT_MAX;
    if (!Number.isFinite(driftMax) || driftMax < 0) {
      return { kind: 'fail', reason: `conservationDriftMax ${driftMax} invalid.` };
    }
    for (const q of a.conservedQuantities) {
      const d = a.conservationDriftPerStep[q];
      if (d === undefined) {
        return { kind: 'fail', reason: `conservedQuantity "${q}" has no declared drift.` };
      }
      if (!Number.isFinite(d)) {
        return { kind: 'fail', reason: `drift for "${q}" (${d}) is not finite.` };
      }
      if (Math.abs(d) > driftMax) {
        return {
          kind: 'fail',
          reason: `drift for "${q}" ${d.toExponential(2)} exceeds max ${driftMax.toExponential(2)}.`,
        };
      }
    }
    return { kind: 'pass' };
  },
);

export const fieldContract: StratumContract<FieldArtifact> = defineStratum<FieldArtifact>(
  'field',
  '0.2.0',
  [rulesTyped, decidabilityDeclared, conservation],
);
