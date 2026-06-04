/**
 * Friend genesis — deterministically produces a FriendSeed from a seed hash.
 *
 * Every gene is sampled from the seeded RNG. Same hash → byte-identical
 * FriendSeed object. No wall-clock entropy, no Math.random — only the
 * xoshiro256** stream derived from the seed hash.
 */

import { createHash } from 'crypto';
import { rngFromHash, type Xoshiro256StarStar } from '../kernel/rng';
import { deriveCleanTitle } from '../kernel/types';
import {
  type FriendSeedData,
  type FriendGenerationOptions,
  type FriendRng,
  type BodyArchetype,
  type EyeShape,
  type NoseShape,
  type MouthShape,
  type JawShape,
  type SpeechStyle,
  type BodyGene,
  type FaceGene,
  type VoiceGene,
  type PersonaGene,
  type MemoryGene,
  type BondGene,
  asFriendRng,
} from './types';

// ─── Constant gene domains ─────────────────────────────────────────────────

const BODY_ARCHETYPES: BodyArchetype[] = [
  'slender', 'athletic', 'sturdy', 'soft', 'tall', 'petite',
];

const EYE_SHAPES: EyeShape[] = ['almond', 'round', 'narrow', 'wide', 'hooded'];
const NOSE_SHAPES: NoseShape[] = ['straight', 'aquiline', 'snub', 'broad', 'narrow'];
const MOUTH_SHAPES: MouthShape[] = ['full', 'thin', 'bow', 'wide', 'small'];
const JAW_SHAPES: JawShape[] = ['square', 'soft', 'pointed', 'broad', 'tapered'];

const HAIR_STYLES = [
  'short', 'medium', 'long', 'wavy', 'curly', 'braided', 'pixie',
  'buzz', 'pony', 'bun', 'undercut', 'shoulder', 'flowing',
];

const SPEECH_STYLES: SpeechStyle[] = [
  'casual', 'formal', 'poetic', 'precise', 'playful', 'reserved', 'theatrical',
];

const ACCENTS = [
  'neutral', 'rp', 'midwest', 'southern', 'tokyo', 'seoul',
  'paris', 'berlin', 'rio', 'lagos', 'mumbai', 'edinburgh',
];

const INTEREST_POOL = [
  'astronomy', 'cooking', 'music', 'mathematics', 'poetry', 'gardening',
  'philosophy', 'cinema', 'rock-climbing', 'chess', 'biology', 'origami',
  'cycling', 'painting', 'history', 'languages', 'architecture',
  'photography', 'fermentation', 'birdwatching', 'cartography', 'dance',
  'theatre', 'electronics', 'woodworking', 'sailing', 'astronomy', 'tea',
];

const VALUE_POOL = [
  'honesty', 'curiosity', 'kindness', 'courage', 'humility', 'craft',
  'loyalty', 'play', 'rigor', 'wonder', 'patience', 'generosity',
  'restraint', 'directness', 'devotion', 'irreverence',
];

// ─── Sampling helpers ──────────────────────────────────────────────────────

function pick<T>(rng: FriendRng, list: readonly T[]): T {
  return list[Math.floor(rng.nextFloat() * list.length)];
}

function range(rng: FriendRng, lo: number, hi: number): number {
  return lo + rng.nextFloat() * (hi - lo);
}

function unit(rng: FriendRng): number {
  return rng.nextFloat();
}

function uniqueSample<T>(rng: FriendRng, pool: readonly T[], n: number): T[] {
  const copy = [...pool];
  const out: T[] = [];
  const k = Math.min(n, copy.length);
  for (let i = 0; i < k; i++) {
    const idx = Math.floor(rng.nextFloat() * copy.length);
    out.push(copy[idx]);
    copy.splice(idx, 1);
  }
  return out;
}

// ─── Gene samplers ─────────────────────────────────────────────────────────

function sampleBody(rng: FriendRng, archetypeBias?: BodyArchetype): BodyGene {
  const archetype = archetypeBias ?? pick(rng, BODY_ARCHETYPES);

  // Archetype anchors — small biases applied on top of uniform sampling.
  const heightAnchor =
    archetype === 'tall' ? 1.2 :
    archetype === 'petite' ? 0.85 :
    archetype === 'slender' ? 1.05 :
    1.0;

  const muscleAnchor =
    archetype === 'athletic' ? 0.7 :
    archetype === 'soft' ? 0.25 :
    archetype === 'sturdy' ? 0.55 :
    0.45;

  return {
    archetype,
    heightScale: heightAnchor + range(rng, -0.1, 0.1),
    shoulderRatio: 0.8 + unit(rng) * 0.4,
    torsoRatio: 0.85 + unit(rng) * 0.3,
    limbRatio: 0.85 + unit(rng) * 0.3,
    muscle: Math.max(0, Math.min(1, muscleAnchor + range(rng, -0.15, 0.15))),
    softness: Math.max(0, Math.min(1, (1 - muscleAnchor) * 0.7 + range(rng, -0.1, 0.1))),
    skinTone: [
      0.35 + unit(rng) * 0.55,
      0.25 + unit(rng) * 0.55,
      0.20 + unit(rng) * 0.50,
    ],
  };
}

function sampleFace(rng: FriendRng): FaceGene {
  return {
    roundness: unit(rng),
    eyeHeight: 0.45 + unit(rng) * 0.10,
    eyeSpacing: 0.30 + unit(rng) * 0.15,
    eyeShape: pick(rng, EYE_SHAPES),
    eyeColor: [
      0.10 + unit(rng) * 0.6,
      0.10 + unit(rng) * 0.6,
      0.10 + unit(rng) * 0.6,
    ],
    noseShape: pick(rng, NOSE_SHAPES),
    noseHeight: 0.55 + unit(rng) * 0.10,
    mouthShape: pick(rng, MOUTH_SHAPES),
    jawShape: pick(rng, JAW_SHAPES),
    brow: unit(rng),
    cheekbones: unit(rng),
    chin: unit(rng),
    hairStyle: pick(rng, HAIR_STYLES),
    hairColor: [
      0.05 + unit(rng) * 0.7,
      0.04 + unit(rng) * 0.55,
      0.03 + unit(rng) * 0.50,
    ],
  };
}

function sampleVoice(rng: FriendRng): VoiceGene {
  const pitch = 80 + unit(rng) * 220;  // 80–300 Hz
  // Formants scale with pitch (lower voices have lower formants)
  const formantScale = 200 / Math.max(80, pitch);
  return {
    pitch,
    inflection: 0.1 + unit(rng) * 0.8,
    tempo: 90 + unit(rng) * 80,  // 90–170 wpm
    breathiness: unit(rng) * 0.5,
    warmth: unit(rng),
    formants: [
      700 * formantScale,
      1220 * formantScale,
      2600 * formantScale,
      3200 * formantScale,
      4000 * formantScale,
    ],
    accent: pick(rng, ACCENTS),
  };
}

function samplePersona(rng: FriendRng): PersonaGene {
  return {
    bigFive: {
      openness: unit(rng),
      conscientiousness: unit(rng),
      extraversion: unit(rng),
      agreeableness: unit(rng),
      neuroticism: unit(rng),
    },
    interests: uniqueSample(rng, INTEREST_POOL, 3 + Math.floor(unit(rng) * 4)),
    values: uniqueSample(rng, VALUE_POOL, 2 + Math.floor(unit(rng) * 3)),
    speechStyle: pick(rng, SPEECH_STYLES),
    humor: unit(rng),
    curiosity: unit(rng),
  };
}

function sampleMemory(rng: FriendRng): MemoryGene {
  return {
    episodicCapacity: 500 + Math.floor(unit(rng) * 4500),       // 500–5000
    episodicDecay: 0.005 + unit(rng) * 0.025,                   // 0.5–3% / day
    semanticCapacity: 2_000 + Math.floor(unit(rng) * 18_000),   // 2K–20K
    reflectionCadenceDays: 1 + unit(rng) * 6,                   // every 1–7 days
  };
}

function sampleBond(rng: FriendRng): BondGene {
  return {
    initialTrust: 0.3 + unit(rng) * 0.4,
    initialWarmth: 0.3 + unit(rng) * 0.5,
    bondingDays: 14 + Math.floor(unit(rng) * 76),  // 14–90 days
  };
}

// ─── Public API ────────────────────────────────────────────────────────────

function deriveSeedHash(input: string): string {
  return createHash('sha256').update(input).digest('hex');
}

function shortId(seedHash: string): string {
  return seedHash.slice(0, 16);
}

function pickName(rng: FriendRng): string {
  // A tiny built-in name list. The real registry-driven naming layer
  // is a Phase 2 deliverable.
  const names = [
    'Nori', 'Wren', 'Atlas', 'Indigo', 'Sora', 'Linnea', 'Kai', 'Mira',
    'Theo', 'Iris', 'Juno', 'Eli', 'Sage', 'Ren', 'Vesper', 'Oak',
    'Hara', 'Zenon', 'Lior', 'Calla', 'Onyx', 'Pax', 'Quill', 'Aster',
  ];
  return pick(rng, names);
}

/**
 * Deterministically grow a FriendSeed from a seed string.
 *
 * @param seedInput  Any string. The SHA-256 of this string becomes the
 *                   `seedHash` and drives the RNG. Same input → identical
 *                   FriendSeed object.
 * @param options    Optional birth metadata or archetype bias.
 */
export function createFriendSeed(
  seedInput: string,
  options: FriendGenerationOptions = {},
): FriendSeedData {
  const seedHash = deriveSeedHash(seedInput);
  const xoshiro: Xoshiro256StarStar = rngFromHash(seedHash);
  const rng: FriendRng = asFriendRng(xoshiro);

  const body = sampleBody(rng, options.archetypeBias);
  const face = sampleFace(rng);
  const voice = sampleVoice(rng);
  const persona = samplePersona(rng);
  const memory = sampleMemory(rng);
  const bond = sampleBond(rng);

  // Name is picked AFTER all genes so adding/removing gene categories
  // doesn't cascade through name selection.
  const sampledName = deriveCleanTitle(options.name ?? pickName(rng), seedHash);

  return {
    id: shortId(seedHash),
    name: sampledName,
    seedHash,
    bornAt: options.bornAt ?? new Date(0).toISOString(),
    genomeVersion: 1,
    genes: { body, face, voice, persona, memory, bond },
    derivation: {
      operator: 'genesis',
      parents: [],
      generation: 0,
    },
  };
}
