/**
 * World stratum contract — Doctrine v2 Part VI.6.
 *
 * - Spatial closure (no leak geometry, navmesh continuous).
 * - Biome / climate self-consistency.
 * - Cross-stratum: Field rules are legal everywhere in the world.
 */
import { defineStratum, todoPredicate, type StratumContract } from './types';

export interface WorldArtifact {
  /** Navmesh continuity self-report. */
  readonly navmeshContinuous?: boolean;
  /** Declared biomes/regions. */
  readonly biomes?: ReadonlyArray<string>;
  /** Linked FieldSeed hash. */
  readonly fieldHash?: string | null;
  /** Area in canonical units squared. */
  readonly areaUnits2?: number;
}

export const worldContract: StratumContract<WorldArtifact> = defineStratum<WorldArtifact>(
  'world',
  '0.1.0',
  [
    todoPredicate('world.spatialClosure', 'No leak geometry; outer hull is closed.'),
    todoPredicate('world.navmeshContinuous', 'Navmesh is continuous over walkable regions.'),
    todoPredicate('world.biomeConsistency', 'Biome/climate parameters are mutually consistent.'),
    todoPredicate('world.fieldLegality', 'Linked FieldSeed rules are decidable everywhere in the world.'),
  ],
);
