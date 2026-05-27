/**
 * World stratum contract — Doctrine v2 Part VI.6 (Phase 3).
 *
 * - Spatial closure (outer hull closed; no leak geometry).
 * - Navmesh continuity over walkable regions.
 * - Biome / climate self-consistency.
 * - Cross-stratum: linked FieldSeed rules are decidable everywhere.
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

export interface WorldArtifact {
  /** Spatial closure self-report. */
  readonly spatialHullClosed?: boolean;
  /** Navmesh continuity self-report. */
  readonly navmeshContinuous?: boolean;
  /** Number of navmesh islands; ≥ 2 with walkable area implies discontinuity. */
  readonly navmeshIslandCount?: number;
  /** Declared biomes/regions. */
  readonly biomes?: ReadonlyArray<string>;
  /** Mean temperature per biome (Celsius). */
  readonly biomeMeanTempC?: Readonly<Record<string, number>>;
  /** Linked FieldSeed hash. */
  readonly fieldHash?: string | null;
  /** Engine self-report on field-rule decidability across the world. */
  readonly fieldRulesDecidableEverywhere?: boolean;
  /** Area in canonical units squared. */
  readonly areaUnits2?: number;
}

const ABSENT: PredicateResult = {
  kind: 'unimplemented',
  reason: 'Engine has not declared this property on the WorldArtifact.',
};

// Earth-like biome temperature bounds; engines simulating other planets
// can override by overriding these predicates in `manifest()`.
const BIOME_TEMP_BOUNDS_C: Record<string, [number, number]> = {
  desert:   [10, 50],
  tropical: [18, 35],
  temperate: [-10, 30],
  boreal:   [-30, 25],
  tundra:   [-50, 10],
  arctic:   [-70, 5],
  oceanic:  [-2, 35],
};

function pred(
  id: string,
  description: string,
  body: (a: WorldArtifact) => PredicateResult,
): ContractPredicate<WorldArtifact> {
  return { id, description, evaluate: body };
}

const spatialClosure = pred(
  'world.spatialClosure',
  'No leak geometry; outer hull is closed.',
  (a) => {
    if (a.spatialHullClosed === undefined) return ABSENT;
    return a.spatialHullClosed
      ? { kind: 'pass' }
      : { kind: 'fail', reason: 'Engine self-reports unclosed outer hull (leak geometry).' };
  },
);

const navmeshContinuous = pred(
  'world.navmeshContinuous',
  'Navmesh is continuous over walkable regions (single island unless explicitly multi-zone).',
  (a) => {
    if (a.navmeshContinuous === undefined) return ABSENT;
    if (!a.navmeshContinuous) {
      return { kind: 'fail', reason: 'Engine self-reports discontinuous navmesh.' };
    }
    if (a.navmeshIslandCount !== undefined) {
      if (!Number.isInteger(a.navmeshIslandCount) || a.navmeshIslandCount < 0) {
        return { kind: 'fail', reason: `navmeshIslandCount ${a.navmeshIslandCount} invalid.` };
      }
      if (a.navmeshIslandCount > 1) {
        return {
          kind: 'fail',
          reason: `Engine claims continuity but reports ${a.navmeshIslandCount} islands.`,
        };
      }
    }
    return { kind: 'pass' };
  },
);

const biomeConsistency = pred(
  'world.biomeConsistency',
  'Biome temperatures within Earth-like bounds (override in manifest() for non-Earth worlds).',
  (a) => {
    if (a.biomes === undefined) return ABSENT;
    if (a.biomes.length === 0) return { kind: 'fail', reason: 'biomes array is empty.' };
    if (a.biomeMeanTempC === undefined) {
      return {
        kind: 'unimplemented',
        reason: 'biomes declared but biomeMeanTempC missing.',
      };
    }
    for (const biome of a.biomes) {
      const temp = a.biomeMeanTempC[biome];
      const bounds = BIOME_TEMP_BOUNDS_C[biome];
      if (temp === undefined) {
        return { kind: 'fail', reason: `biome "${biome}" has no declared mean temperature.` };
      }
      if (!Number.isFinite(temp)) {
        return { kind: 'fail', reason: `biome "${biome}" mean temperature ${temp} is not finite.` };
      }
      if (bounds && (temp < bounds[0] || temp > bounds[1])) {
        return {
          kind: 'fail',
          reason: `biome "${biome}" mean ${temp}°C outside Earth-like bounds [${bounds[0]}, ${bounds[1]}].`,
        };
      }
    }
    return { kind: 'pass' };
  },
);

const fieldLegality = pred(
  'world.fieldLegality',
  'Linked FieldSeed rules are decidable everywhere in the world.',
  (a) => {
    if (a.fieldHash === undefined) return ABSENT;
    if (a.fieldHash === null) return { kind: 'pass' };
    if (typeof a.fieldHash !== 'string' || a.fieldHash.length === 0) {
      return { kind: 'fail', reason: 'fieldHash is not a non-empty string.' };
    }
    if (a.fieldRulesDecidableEverywhere === undefined) {
      return {
        kind: 'unimplemented',
        reason: 'fieldHash declared but fieldRulesDecidableEverywhere verdict missing.',
      };
    }
    return a.fieldRulesDecidableEverywhere
      ? { kind: 'pass' }
      : { kind: 'fail', reason: 'Engine reports field rules undecidable in part of the world.' };
  },
);

export const worldContract: StratumContract<WorldArtifact> = defineStratum<WorldArtifact>(
  'world',
  '0.2.0',
  [spatialClosure, navmeshContinuous, biomeConsistency, fieldLegality],
);
