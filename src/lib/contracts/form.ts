/**
 * Form stratum contract — implementation (Phase 3 partial).
 *
 * Per Doctrine v2 Part VI.1. Predicate bodies are pure, deterministic,
 * IO-free. They evaluate against the typed `FormArtifact` shape; an
 * absent field returns `unimplemented` (the engine has not declared
 * the property yet) rather than a hard `fail` (which would punish
 * engines that have not opted in).
 *
 * The `crossAdapterParity` predicate stays unimplemented at this
 * level because it requires comparing renders across adapters — that
 * is a runtime concern, handled by the oracle / harness, not the
 * stratum substrate.
 */
import {
  defineStratum,
  todoPredicate,
  type ContractPredicate,
  type PredicateResult,
  type StratumContract,
} from './types';

export interface FormArtifact {
  /** Triangle count. */
  readonly triangleCount?: number;
  /** Declared genus (0 = sphere/disc, n = n-handles). */
  readonly genus?: number;
  /** Manifold-ness self-report from the engine. */
  readonly manifold?: boolean;
  /** Watertight self-report. */
  readonly watertight?: boolean;
  /** UV coverage ratio in [0, 1]. */
  readonly uvCoverage?: number;
  /** Whether UV charts overlap. */
  readonly uvOverlap?: boolean;
  /** Declared material slots. */
  readonly materialSlots?: ReadonlyArray<string>;
  /** Bounding box: [minX, minY, minZ, maxX, maxY, maxZ]. */
  readonly bbox?: readonly [number, number, number, number, number, number];
  /** Canonical pivot in object space. */
  readonly pivot?: readonly [number, number, number];
  /** Triangle budget tier; if absent, no upper bound is enforced. */
  readonly triangleBudget?: { tier: 'low' | 'medium' | 'high' | 'cinema'; max: number };
}

const ABSENT: PredicateResult = {
  kind: 'unimplemented',
  reason: 'Engine has not declared this property on the FormArtifact.',
};

function pred(
  id: string,
  description: string,
  body: (a: FormArtifact) => PredicateResult,
): ContractPredicate<FormArtifact> {
  return { id, description, evaluate: body };
}

const manifoldPredicate = pred(
  'form.manifold',
  'Geometry is closed and 2-manifold; genus matches declared value.',
  (a) => {
    if (a.manifold === undefined) return ABSENT;
    return a.manifold
      ? { kind: 'pass' }
      : { kind: 'fail', reason: 'Engine self-reports non-manifold geometry.' };
  },
);

const watertightPredicate = pred(
  'form.watertight',
  'Geometry is watertight (no open boundary edges) unless explicitly authored.',
  (a) => {
    if (a.watertight === undefined) return ABSENT;
    return a.watertight
      ? { kind: 'pass' }
      : { kind: 'fail', reason: 'Engine self-reports non-watertight geometry.' };
  },
);

const triangleBudgetPredicate = pred(
  'form.triangleBudget',
  'Triangle count is within declared tier budget.',
  (a) => {
    if (a.triangleCount === undefined) return ABSENT;
    if (!a.triangleBudget) {
      return {
        kind: 'unimplemented',
        reason: 'Engine declared triangleCount but no triangleBudget tier; cannot evaluate.',
      };
    }
    return a.triangleCount <= a.triangleBudget.max
      ? { kind: 'pass' }
      : {
          kind: 'fail',
          reason: `triangleCount ${a.triangleCount} exceeds ${a.triangleBudget.tier}-tier max ${a.triangleBudget.max}.`,
          detail: { triangleCount: a.triangleCount, max: a.triangleBudget.max, tier: a.triangleBudget.tier },
        };
  },
);

const uvCoveragePredicate = pred(
  'form.uvCoverage',
  'UV coverage ≥ 95% of surface area.',
  (a) => {
    if (a.uvCoverage === undefined) return ABSENT;
    if (!Number.isFinite(a.uvCoverage) || a.uvCoverage < 0 || a.uvCoverage > 1) {
      return { kind: 'fail', reason: `uvCoverage ${a.uvCoverage} is not a finite ratio in [0, 1].` };
    }
    return a.uvCoverage >= 0.95
      ? { kind: 'pass' }
      : { kind: 'fail', reason: `uvCoverage ${a.uvCoverage.toFixed(4)} < 0.95 threshold.` };
  },
);

const uvNoOverlapPredicate = pred(
  'form.uvNoOverlap',
  'UV charts do not overlap.',
  (a) => {
    if (a.uvOverlap === undefined) return ABSENT;
    return a.uvOverlap
      ? { kind: 'fail', reason: 'Engine self-reports overlapping UV charts.' }
      : { kind: 'pass' };
  },
);

const materialSlotsPredicate = pred(
  'form.materialSlots',
  'Material slots are declared with stable typed names.',
  (a) => {
    if (a.materialSlots === undefined) return ABSENT;
    if (!Array.isArray(a.materialSlots)) {
      return { kind: 'fail', reason: 'materialSlots is not an array.' };
    }
    if (a.materialSlots.length === 0) {
      return { kind: 'fail', reason: 'materialSlots array is empty.' };
    }
    for (const s of a.materialSlots) {
      if (typeof s !== 'string' || s.length === 0) {
        return { kind: 'fail', reason: `materialSlots contains non-string or empty entry: ${JSON.stringify(s)}` };
      }
    }
    const dedup = new Set(a.materialSlots);
    if (dedup.size !== a.materialSlots.length) {
      return { kind: 'fail', reason: 'materialSlots contains duplicate entries.' };
    }
    return { kind: 'pass' };
  },
);

const canonicalPivotPredicate = pred(
  'form.canonicalPivot',
  'Pivot and bounding box are canonical and stable.',
  (a) => {
    if (a.pivot === undefined && a.bbox === undefined) return ABSENT;
    if (!a.pivot || !a.bbox) {
      return { kind: 'fail', reason: 'Both pivot and bbox must be declared together.' };
    }
    if (a.pivot.length !== 3) {
      return { kind: 'fail', reason: 'pivot must have exactly 3 components.' };
    }
    if (a.bbox.length !== 6) {
      return { kind: 'fail', reason: 'bbox must have exactly 6 components [minX,minY,minZ,maxX,maxY,maxZ].' };
    }
    for (let i = 0; i < 3; i++) {
      if (a.bbox[i]! > a.bbox[i + 3]!) {
        return { kind: 'fail', reason: `bbox min[${i}] > max[${i}]; invalid bounds.` };
      }
    }
    return { kind: 'pass' };
  },
);

export const formContract: StratumContract<FormArtifact> = defineStratum<FormArtifact>(
  'form',
  '0.2.0',
  [
    manifoldPredicate,
    watertightPredicate,
    triangleBudgetPredicate,
    uvCoveragePredicate,
    uvNoOverlapPredicate,
    materialSlotsPredicate,
    canonicalPivotPredicate,
    todoPredicate<FormArtifact>(
      'form.crossAdapterParity',
      'Renders identically across glTF/FBX/USD/STL within tolerance (runtime; oracle responsibility).',
    ),
  ],
);
