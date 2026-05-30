/**
 * World Quality Contract — second canonical pure-substrate generator (after friend).
 */
import { createWorldSeed } from './genesis';
import { generateWorld, hashArtifact } from './generator';
import { registerContract } from '../kernel/quality-contract';
import type { QualityContract, Stratum } from '../kernel/quality-contract';
import type { WorldSeedData, WorldArtifact } from './types';

interface WorldInverted {
  era: string;
  biome: string;
  conflict: string;
  factionCount: number;
  locationCount: number;
}

const CURATED = [
  { id: 'curated.world.vellichor',  name: 'Vellichor', intent: 'Mythic, contemplative, mystery', seed: createWorldSeed('vellichor') },
  { id: 'curated.world.iron-marsh', name: 'Iron Marsh', intent: 'Post-apoc survival', seed: createWorldSeed('iron-marsh') },
  { id: 'curated.world.thrice-fallen', name: 'Thrice-Fallen', intent: 'Sci-fi political', seed: createWorldSeed('thrice-fallen') },
  { id: 'curated.world.sun-quay',   name: 'Sun Quay', intent: 'Medieval exploration', seed: createWorldSeed('sun-quay') },
  { id: 'curated.world.lyrelm',     name: 'Lyrelm', intent: 'Modern urban redemption', seed: createWorldSeed('lyrelm') },
];

export const WorldQualityContract: QualityContract<WorldSeedData, WorldArtifact, WorldInverted> = {
  domain: 'world',
  version: '1.0.0',
  strata: ['World', 'Story', 'Culture', 'Field'] as const,
  engineOwner: 'World Engine',

  synthesize: async (seed: WorldSeedData) => generateWorld(seed),

  invert: (artifact: WorldArtifact): WorldInverted => {
    // Reconstruct the salient gene signal from artifact text.
    // Era/biome/conflict are visible in the summary string.
    const era = (artifact.summary.match(/medieval|modern|sci-fi|mythic|post-apocalyptic/) ?? ['unknown'])[0];
    const biome = (artifact.summary.match(/forest|desert|ocean|tundra|urban|underground|sky|volcanic/) ?? ['unknown'])[0];
    const conflict = (artifact.summary.match(/invasion|mystery|exploration|survival|political|redemption|discovery/) ?? ['unknown'])[0];
    return {
      era, biome, conflict,
      factionCount: artifact.factions.length,
      locationCount: artifact.locations.length,
    };
  },

  rate: (artifact: WorldArtifact) => {
    const axes = {
      hasHook:        artifact.hook.length > 20 ? 1 : 0,
      hasLocations:   artifact.locations.length >= 3 ? 1 : 0,
      hasFactions:    artifact.factions.length >= 3 ? 1 : 0,
      summaryQuality: artifact.summary.length > 40 ? 1 : 0,
      factionDiversity: new Set(artifact.factions.map((f) => f.alignment)).size >= 2 ? 1 : 0,
    };
    const score = (Object.values(axes).reduce((a, b) => a + b, 0)) / Object.keys(axes).length;
    return { score, axes, notes: [`world with ${artifact.factions.length} factions, ${artifact.locations.length} locations`] };
  },

  curated: () => CURATED,

  hashArtifact,

  manifest() {
    return {
      domain: 'world',
      version: '1.0.0',
      strata: ['World', 'Story', 'Culture', 'Field'] as const,
      clauses: ['synthesize', 'invert', 'rate', 'curated', 'deterministic'],
      determinism: 'strict',
    };
  },
};

registerContract(WorldQualityContract);
