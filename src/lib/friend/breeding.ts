/**
 * Friend breeding + mutation — deterministic gene operators.
 *
 * Breeding takes two parent FriendSeeds and a salt string; produces a
 * child FriendSeed whose every gene is a deterministic mix of the parents'
 * (and zero `Math.random`). Same parents + same salt → byte-identical child.
 *
 * Mutation takes one FriendSeed and a salt; nudges every gene by a small
 * amount derived from the salt + the gene type.
 */

import { createHash } from 'crypto';
import { rngFromHash, type Xoshiro256StarStar } from '../kernel/rng';
import {
  type FriendSeedData,
  type BodyGene,
  type FaceGene,
  type VoiceGene,
  type PersonaGene,
  type MemoryGene,
  type BondGene,
  type FriendRng,
  asFriendRng,
} from './types';

// ─── Helpers ───────────────────────────────────────────────────────────────

function deriveSeedHash(input: string): string {
  return createHash('sha256').update(input).digest('hex');
}

function shortId(seedHash: string): string {
  return seedHash.slice(0, 16);
}

/** Linear interpolation between two numbers. */
function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/** Linear interpolation between two vec3 colors. */
function lerpVec3(
  a: [number, number, number],
  b: [number, number, number],
  t: number,
): [number, number, number] {
  return [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
}

/** Pick from a parent based on rng coin flip. */
function pickFromParents<T>(rng: FriendRng, a: T, b: T): T {
  return rng.nextFloat() < 0.5 ? a : b;
}

/** Clamp to [lo, hi]. */
function clamp(x: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, x));
}

/** Mix two unique-sample arrays: take random subset of union. */
function mixSets<T>(rng: FriendRng, a: readonly T[], b: readonly T[]): T[] {
  const union = Array.from(new Set([...a, ...b]));
  const targetSize = Math.max(
    1,
    Math.round((a.length + b.length) / 2),
  );
  const out: T[] = [];
  const copy = [...union];
  while (out.length < targetSize && copy.length > 0) {
    const idx = Math.floor(rng.nextFloat() * copy.length);
    out.push(copy[idx]);
    copy.splice(idx, 1);
  }
  return out;
}

// ─── Gene crossover ────────────────────────────────────────────────────────

function crossBody(rng: FriendRng, a: BodyGene, b: BodyGene): BodyGene {
  const t = rng.nextFloat();
  return {
    archetype: pickFromParents(rng, a.archetype, b.archetype),
    heightScale: lerp(a.heightScale, b.heightScale, t),
    shoulderRatio: lerp(a.shoulderRatio, b.shoulderRatio, rng.nextFloat()),
    torsoRatio: lerp(a.torsoRatio, b.torsoRatio, rng.nextFloat()),
    limbRatio: lerp(a.limbRatio, b.limbRatio, rng.nextFloat()),
    muscle: lerp(a.muscle, b.muscle, rng.nextFloat()),
    softness: lerp(a.softness, b.softness, rng.nextFloat()),
    skinTone: lerpVec3(a.skinTone, b.skinTone, rng.nextFloat()),
  };
}

function crossFace(rng: FriendRng, a: FaceGene, b: FaceGene): FaceGene {
  return {
    roundness: lerp(a.roundness, b.roundness, rng.nextFloat()),
    eyeHeight: lerp(a.eyeHeight, b.eyeHeight, rng.nextFloat()),
    eyeSpacing: lerp(a.eyeSpacing, b.eyeSpacing, rng.nextFloat()),
    eyeShape: pickFromParents(rng, a.eyeShape, b.eyeShape),
    eyeColor: lerpVec3(a.eyeColor, b.eyeColor, rng.nextFloat()),
    noseShape: pickFromParents(rng, a.noseShape, b.noseShape),
    noseHeight: lerp(a.noseHeight, b.noseHeight, rng.nextFloat()),
    mouthShape: pickFromParents(rng, a.mouthShape, b.mouthShape),
    jawShape: pickFromParents(rng, a.jawShape, b.jawShape),
    brow: lerp(a.brow, b.brow, rng.nextFloat()),
    cheekbones: lerp(a.cheekbones, b.cheekbones, rng.nextFloat()),
    chin: lerp(a.chin, b.chin, rng.nextFloat()),
    hairStyle: pickFromParents(rng, a.hairStyle, b.hairStyle),
    hairColor: lerpVec3(a.hairColor, b.hairColor, rng.nextFloat()),
  };
}

function crossVoice(rng: FriendRng, a: VoiceGene, b: VoiceGene): VoiceGene {
  const t = rng.nextFloat();
  return {
    pitch: lerp(a.pitch, b.pitch, t),
    inflection: lerp(a.inflection, b.inflection, rng.nextFloat()),
    tempo: lerp(a.tempo, b.tempo, rng.nextFloat()),
    breathiness: lerp(a.breathiness, b.breathiness, rng.nextFloat()),
    warmth: lerp(a.warmth, b.warmth, rng.nextFloat()),
    formants: [
      lerp(a.formants[0], b.formants[0], rng.nextFloat()),
      lerp(a.formants[1], b.formants[1], rng.nextFloat()),
      lerp(a.formants[2], b.formants[2], rng.nextFloat()),
      lerp(a.formants[3], b.formants[3], rng.nextFloat()),
      lerp(a.formants[4], b.formants[4], rng.nextFloat()),
    ],
    accent: pickFromParents(rng, a.accent, b.accent),
  };
}

function crossPersona(rng: FriendRng, a: PersonaGene, b: PersonaGene): PersonaGene {
  return {
    bigFive: {
      openness: lerp(a.bigFive.openness, b.bigFive.openness, rng.nextFloat()),
      conscientiousness: lerp(
        a.bigFive.conscientiousness, b.bigFive.conscientiousness, rng.nextFloat()),
      extraversion: lerp(
        a.bigFive.extraversion, b.bigFive.extraversion, rng.nextFloat()),
      agreeableness: lerp(
        a.bigFive.agreeableness, b.bigFive.agreeableness, rng.nextFloat()),
      neuroticism: lerp(
        a.bigFive.neuroticism, b.bigFive.neuroticism, rng.nextFloat()),
    },
    interests: mixSets(rng, a.interests, b.interests),
    values: mixSets(rng, a.values, b.values),
    speechStyle: pickFromParents(rng, a.speechStyle, b.speechStyle),
    humor: lerp(a.humor, b.humor, rng.nextFloat()),
    curiosity: lerp(a.curiosity, b.curiosity, rng.nextFloat()),
  };
}

function crossMemory(rng: FriendRng, a: MemoryGene, b: MemoryGene): MemoryGene {
  return {
    episodicCapacity: Math.round(
      lerp(a.episodicCapacity, b.episodicCapacity, rng.nextFloat())),
    episodicDecay: lerp(a.episodicDecay, b.episodicDecay, rng.nextFloat()),
    semanticCapacity: Math.round(
      lerp(a.semanticCapacity, b.semanticCapacity, rng.nextFloat())),
    reflectionCadenceDays: lerp(
      a.reflectionCadenceDays, b.reflectionCadenceDays, rng.nextFloat()),
  };
}

function crossBond(rng: FriendRng, a: BondGene, b: BondGene): BondGene {
  return {
    initialTrust: lerp(a.initialTrust, b.initialTrust, rng.nextFloat()),
    initialWarmth: lerp(a.initialWarmth, b.initialWarmth, rng.nextFloat()),
    bondingDays: Math.round(
      lerp(a.bondingDays, b.bondingDays, rng.nextFloat())),
  };
}

// ─── Public API ────────────────────────────────────────────────────────────

/**
 * Breed two FriendSeeds. The salt is hashed with both parent ids to form
 * the deterministic seed of the child. Same parents + same salt → same child.
 */
export function breedFriends(
  parentA: FriendSeedData,
  parentB: FriendSeedData,
  salt: string = '',
): FriendSeedData {
  const seedHash = deriveSeedHash(
    `breed|${parentA.seedHash}|${parentB.seedHash}|${salt}`,
  );
  const xoshiro: Xoshiro256StarStar = rngFromHash(seedHash);
  const rng: FriendRng = asFriendRng(xoshiro);

  const generation = Math.max(
    parentA.derivation?.generation ?? 0,
    parentB.derivation?.generation ?? 0,
  ) + 1;

  return {
    id: shortId(seedHash),
    name: pickFromParents(rng, parentA.name, parentB.name),
    seedHash,
    bornAt: new Date(0).toISOString(),
    genomeVersion: 1,
    genes: {
      body: crossBody(rng, parentA.genes.body, parentB.genes.body),
      face: crossFace(rng, parentA.genes.face, parentB.genes.face),
      voice: crossVoice(rng, parentA.genes.voice, parentB.genes.voice),
      persona: crossPersona(rng, parentA.genes.persona, parentB.genes.persona),
      memory: crossMemory(rng, parentA.genes.memory, parentB.genes.memory),
      bond: crossBond(rng, parentA.genes.bond, parentB.genes.bond),
    },
    parents: [parentA.id, parentB.id],
    derivation: {
      operator: 'breed',
      parents: [parentA.id, parentB.id],
      generation,
    },
  };
}

/**
 * Mutate one FriendSeed. The `magnitude` scales every continuous gene's
 * displacement (0 = identity, 1 = full random replacement). Discrete genes
 * (archetype, eyeShape, etc.) re-roll with probability = magnitude.
 */
export function mutateFriend(
  parent: FriendSeedData,
  magnitude: number = 0.15,
  salt: string = '',
): FriendSeedData {
  const m = clamp(magnitude, 0, 1);
  const seedHash = deriveSeedHash(
    `mutate|${parent.seedHash}|${m}|${salt}`,
  );
  const xoshiro: Xoshiro256StarStar = rngFromHash(seedHash);
  const rng: FriendRng = asFriendRng(xoshiro);

  // Each continuous gene nudges by ±m around its current value, clamped.
  const nudge = (v: number): number =>
    clamp(v + (rng.nextFloat() * 2 - 1) * m, 0, 1);

  const nudgeFree = (v: number, lo: number, hi: number): number =>
    clamp(v + (rng.nextFloat() * 2 - 1) * m * (hi - lo), lo, hi);

  const reroll = <T>(orig: T, fresh: T): T => (rng.nextFloat() < m ? fresh : orig);

  const generation = (parent.derivation?.generation ?? 0) + 1;

  // For discrete re-rolls we need fresh samples — we'll just keep parent
  // values when reroll says no.  Drawing fresh discrete samples here
  // would consume RNG even when not used; we instead always draw a fresh
  // value to keep stream alignment.
  const FRESH_EYE = ['almond', 'round', 'narrow', 'wide', 'hooded'] as const;
  const FRESH_NOSE = ['straight', 'aquiline', 'snub', 'broad', 'narrow'] as const;
  const FRESH_MOUTH = ['full', 'thin', 'bow', 'wide', 'small'] as const;
  const FRESH_JAW = ['square', 'soft', 'pointed', 'broad', 'tapered'] as const;
  const FRESH_HAIR = [
    'short', 'medium', 'long', 'wavy', 'curly', 'braided', 'pixie',
    'buzz', 'pony', 'bun', 'undercut', 'shoulder', 'flowing',
  ] as const;

  const pickFresh = <T>(arr: readonly T[]): T =>
    arr[Math.floor(rng.nextFloat() * arr.length)];

  return {
    id: shortId(seedHash),
    name: parent.name,
    seedHash,
    bornAt: new Date(0).toISOString(),
    genomeVersion: 1,
    genes: {
      body: {
        ...parent.genes.body,
        heightScale: nudgeFree(parent.genes.body.heightScale, 0.5, 1.5),
        shoulderRatio: nudgeFree(parent.genes.body.shoulderRatio, 0.6, 1.4),
        torsoRatio: nudgeFree(parent.genes.body.torsoRatio, 0.6, 1.4),
        limbRatio: nudgeFree(parent.genes.body.limbRatio, 0.6, 1.4),
        muscle: nudge(parent.genes.body.muscle),
        softness: nudge(parent.genes.body.softness),
        skinTone: [
          nudge(parent.genes.body.skinTone[0]),
          nudge(parent.genes.body.skinTone[1]),
          nudge(parent.genes.body.skinTone[2]),
        ],
      },
      face: {
        ...parent.genes.face,
        roundness: nudge(parent.genes.face.roundness),
        eyeHeight: nudgeFree(parent.genes.face.eyeHeight, 0.4, 0.6),
        eyeSpacing: nudgeFree(parent.genes.face.eyeSpacing, 0.25, 0.5),
        eyeShape: reroll(parent.genes.face.eyeShape, pickFresh(FRESH_EYE)),
        eyeColor: [
          nudge(parent.genes.face.eyeColor[0]),
          nudge(parent.genes.face.eyeColor[1]),
          nudge(parent.genes.face.eyeColor[2]),
        ],
        noseShape: reroll(parent.genes.face.noseShape, pickFresh(FRESH_NOSE)),
        noseHeight: nudgeFree(parent.genes.face.noseHeight, 0.5, 0.7),
        mouthShape: reroll(parent.genes.face.mouthShape, pickFresh(FRESH_MOUTH)),
        jawShape: reroll(parent.genes.face.jawShape, pickFresh(FRESH_JAW)),
        brow: nudge(parent.genes.face.brow),
        cheekbones: nudge(parent.genes.face.cheekbones),
        chin: nudge(parent.genes.face.chin),
        hairStyle: reroll(parent.genes.face.hairStyle, pickFresh(FRESH_HAIR)),
        hairColor: [
          nudge(parent.genes.face.hairColor[0]),
          nudge(parent.genes.face.hairColor[1]),
          nudge(parent.genes.face.hairColor[2]),
        ],
      },
      voice: {
        ...parent.genes.voice,
        pitch: nudgeFree(parent.genes.voice.pitch, 80, 300),
        inflection: nudge(parent.genes.voice.inflection),
        tempo: nudgeFree(parent.genes.voice.tempo, 80, 180),
        breathiness: clamp(
          parent.genes.voice.breathiness + (rng.nextFloat() - 0.5) * m, 0, 1),
        warmth: nudge(parent.genes.voice.warmth),
        formants: parent.genes.voice.formants.map((f) =>
          clamp(f + (rng.nextFloat() - 0.5) * m * 500, 100, 5000),
        ) as [number, number, number, number, number],
        accent: parent.genes.voice.accent,
      },
      persona: {
        ...parent.genes.persona,
        bigFive: {
          openness: nudge(parent.genes.persona.bigFive.openness),
          conscientiousness: nudge(parent.genes.persona.bigFive.conscientiousness),
          extraversion: nudge(parent.genes.persona.bigFive.extraversion),
          agreeableness: nudge(parent.genes.persona.bigFive.agreeableness),
          neuroticism: nudge(parent.genes.persona.bigFive.neuroticism),
        },
        humor: nudge(parent.genes.persona.humor),
        curiosity: nudge(parent.genes.persona.curiosity),
      },
      memory: { ...parent.genes.memory },
      bond: { ...parent.genes.bond },
    },
    parents: [parent.id],
    derivation: {
      operator: 'mutate',
      parents: [parent.id],
      generation,
    },
  };
}
