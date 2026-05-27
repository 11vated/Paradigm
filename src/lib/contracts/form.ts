/**
 * Form stratum contract.
 *
 * Per Doctrine v2 Part VI.1:
 *   - Closed, manifold, watertight geometry (genus declared).
 *   - Triangle-count budget by use-case tier.
 *   - UV coverage ≥ 95% of surface area, no overlaps.
 *   - Material slots declared and typed.
 *   - Bounding box and pivot canonical.
 *   - Renders identically across glTF/FBX/USD/STL within tolerance.
 *
 * Phase 0: predicate identities + descriptions declared. Bodies are
 * `unimplemented` and replaced engine-by-engine in Phase 3.
 */
import { defineStratum, todoPredicate, type StratumContract } from './types';

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
}

export const formContract: StratumContract<FormArtifact> = defineStratum<FormArtifact>(
  'form',
  '0.1.0',
  [
    todoPredicate('form.manifold', 'Geometry is closed and 2-manifold; genus matches declared value.'),
    todoPredicate('form.watertight', 'Geometry is watertight (no open boundary edges) unless explicitly authored.'),
    todoPredicate('form.triangleBudget', 'Triangle count is within declared tier budget.'),
    todoPredicate('form.uvCoverage', 'UV coverage ≥ 95% of surface area.'),
    todoPredicate('form.uvNoOverlap', 'UV charts do not overlap.'),
    todoPredicate('form.materialSlots', 'Material slots are declared with stable typed names.'),
    todoPredicate('form.canonicalPivot', 'Pivot and bounding box are canonical and stable.'),
    todoPredicate('form.crossAdapterParity', 'Renders identically across glTF/FBX/USD/STL within tolerance.'),
  ],
);
