/**
 * Paradigm World — deterministic genesis from a seed string.
 */
import { createHash } from 'crypto';
import { Xoshiro256StarStar } from '../kernel/rng';
import { kernelNowIso } from '../kernel/clock';
import type {
  WorldSeedData, SettingGene, PhysicsGene, SocietyGene, ConflictGene,
  MoodGene, HistoryGene, Era, Biome, ConflictKind, WorldRng,
} from './types';
import { asWorldRng } from './types';

const GENOME_VERSION = 1;

const ERAS: Era[] = ['medieval', 'modern', 'sci-fi', 'mythic', 'post-apocalyptic'];
const BIOMES: Biome[] = ['forest', 'desert', 'ocean', 'tundra', 'urban', 'underground', 'sky', 'volcanic'];
const CONFLICTS: ConflictKind[] = ['invasion', 'mystery', 'exploration', 'survival', 'political', 'redemption', 'discovery'];

const NAME_VOWELS = ['a','e','i','o','u','ae','ei'];
const NAME_CONS_START = ['v','c','m','t','s','d','r','l','b','k','n','p','g','h','f','y'];
const NAME_CONS_MID = ['l','n','r','th','st','ld','rd','nn','ss','vr','cr'];
const NAME_SUFFIX = ['ros','ras','ria','nor','dor','mor','rys','ral','reach','heim','vale','glade','spire','marsh','wynd','helm'];

function pick<T>(rng: WorldRng, arr: readonly T[]): T {
  return arr[Math.floor(rng.nextFloat() * arr.length)];
}

function sampleSetting(rng: WorldRng): SettingGene {
  return {
    era:     pick(rng, ERAS),
    biome:   pick(rng, BIOMES),
    magic:   rng.nextFloat(),
    tech:    rng.nextFloat(),
    density: rng.nextFloat(),
  };
}

function samplePhysics(rng: WorldRng): PhysicsGene {
  return {
    gravity:           rng.nextFloat(),
    hostility:         rng.nextFloat(),
    diurnalRate:       rng.nextFloat(),
    weatherVolatility: rng.nextFloat(),
  };
}

function sampleSociety(rng: WorldRng): SocietyGene {
  return {
    order:      rng.nextFloat(),
    pluralism:  rng.nextFloat(),
    prosperity: rng.nextFloat(),
    literacy:   rng.nextFloat(),
  };
}

function sampleConflict(rng: WorldRng): ConflictGene {
  return {
    kind:    pick(rng, CONFLICTS),
    scale:   rng.nextFloat(),
    urgency: rng.nextFloat(),
    clarity: rng.nextFloat(),
  };
}

function sampleMood(rng: WorldRng): MoodGene {
  return {
    brightness: rng.nextFloat(),
    warmth:     rng.nextFloat(),
    pace:       rng.nextFloat(),
    levity:     rng.nextFloat(),
  };
}

function sampleHistory(rng: WorldRng): HistoryGene {
  return {
    agesSinceFall: Math.floor(rng.nextFloat() * 5000),
    ghostliness:   rng.nextFloat(),
    eraCount:      1 + Math.floor(rng.nextFloat() * 4),
  };
}

function sampleName(rng: WorldRng): string {
  // Pattern: [Cons][Vowel][Cons-mid][Vowel][Suffix]
  const a = pick(rng, NAME_CONS_START);
  const b = pick(rng, NAME_VOWELS);
  const c = pick(rng, NAME_CONS_MID);
  const d = pick(rng, NAME_VOWELS);
  const e = pick(rng, NAME_SUFFIX);
  const word = (a + b + c + d).replace(/(.)\\1+/g, '$1');
  return (word.charAt(0).toUpperCase() + word.slice(1)) + ' ' +
         e.charAt(0).toUpperCase() + e.slice(1);
}

function deriveSeedHash(input: string): string {
  return createHash('sha256').update(input).digest('hex');
}

function shortId(seedHash: string): string {
  return seedHash.slice(0, 16);
}

export function createWorldSeed(
  seedInput: string,
  options?: { name?: string },
): WorldSeedData {
  const seedHash = deriveSeedHash(seedInput);
  const rng = asWorldRng(new Xoshiro256StarStar(seedHash));
  const setting = sampleSetting(rng);
  const physics = samplePhysics(rng);
  const society = sampleSociety(rng);
  const conflict = sampleConflict(rng);
  const mood = sampleMood(rng);
  const history = sampleHistory(rng);
  const name = options?.name ?? sampleName(rng);
  return {
    id: shortId(seedHash),
    name,
    seedHash,
    genomeVersion: GENOME_VERSION,
    genes: { setting, physics, society, conflict, mood, history },
    bornAt: kernelNowIso(),
    derivation: { operator: 'genesis', parents: [], salt: seedInput, generation: 0 },
  };
}
