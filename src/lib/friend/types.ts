/**
 * Paradigm Friend — type system.
 *
 * A Friend is the user's sovereign digital companion: a typed composite
 * seed whose body, face, voice, persona, and memory are all genes. Every
 * Friend is reproducible from its FriendSeed, breedable with other
 * FriendSeeds, and provably owned by the user via the sovereignty layer.
 *
 * Phase 1 deliverable. See Documents/Paradigm-Vision/02_THE_FRIEND.md
 * for the full design specification.
 */

import type { Xoshiro256StarStar } from '../kernel/rng';

// ─── Body ──────────────────────────────────────────────────────────────────

export type BodyArchetype =
  | 'slender'
  | 'athletic'
  | 'sturdy'
  | 'soft'
  | 'tall'
  | 'petite';

export interface BodyGene {
  archetype: BodyArchetype;
  /** 0.5 (very short) → 1.5 (very tall), centered at 1.0 */
  heightScale: number;
  /** 0.6 → 1.4 — shoulder width relative to height */
  shoulderRatio: number;
  /** 0.6 → 1.4 — torso length relative to height */
  torsoRatio: number;
  /** 0.6 → 1.4 — limb length relative to height */
  limbRatio: number;
  /** 0 → 1 — muscle definition */
  muscle: number;
  /** 0 → 1 — soft tissue */
  softness: number;
  /** RGB in [0,1]^3 */
  skinTone: [number, number, number];
}

// ─── Face ──────────────────────────────────────────────────────────────────

export type EyeShape = 'almond' | 'round' | 'narrow' | 'wide' | 'hooded';
export type NoseShape = 'straight' | 'aquiline' | 'snub' | 'broad' | 'narrow';
export type MouthShape = 'full' | 'thin' | 'bow' | 'wide' | 'small';
export type JawShape = 'square' | 'soft' | 'pointed' | 'broad' | 'tapered';

export interface FaceGene {
  /** 0 → 1 — face roundness (0 = very angular, 1 = very round) */
  roundness: number;
  /** 0 → 1 — vertical position of eyes on the face */
  eyeHeight: number;
  /** 0 → 1 — distance between eyes */
  eyeSpacing: number;
  eyeShape: EyeShape;
  /** RGB in [0,1]^3 — iris color */
  eyeColor: [number, number, number];
  noseShape: NoseShape;
  /** 0 → 1 — vertical position of nose */
  noseHeight: number;
  mouthShape: MouthShape;
  jawShape: JawShape;
  /** 0 → 1 — brow heaviness */
  brow: number;
  /** 0 → 1 — cheekbone prominence */
  cheekbones: number;
  /** 0 → 1 — chin prominence */
  chin: number;
  /** Hair style identifier — short, long, curly, etc. */
  hairStyle: string;
  /** RGB in [0,1]^3 */
  hairColor: [number, number, number];
}

// ─── Voice ─────────────────────────────────────────────────────────────────

export interface VoiceGene {
  /** Hz — fundamental pitch (80–300 typical) */
  pitch: number;
  /** 0 → 1 — pitch variation across a sentence */
  inflection: number;
  /** Words per minute (80–180 typical) */
  tempo: number;
  /** 0 → 1 — breathiness vs. clarity */
  breathiness: number;
  /** 0 → 1 — warmth vs. brightness in timbre */
  warmth: number;
  /** 5 formants — F1..F5 Hz */
  formants: [number, number, number, number, number];
  /** Accent identifier (modular registry — 'neutral', 'rp', 'midwest', 'tokyo', ...) */
  accent: string;
}

// ─── Persona ───────────────────────────────────────────────────────────────

/**
 * Big Five personality dimensions, each in [0, 1].
 * O = Openness, C = Conscientiousness, E = Extraversion,
 * A = Agreeableness, N = Neuroticism.
 */
export interface BigFive {
  openness: number;
  conscientiousness: number;
  extraversion: number;
  agreeableness: number;
  neuroticism: number;
}

export type SpeechStyle =
  | 'casual'
  | 'formal'
  | 'poetic'
  | 'precise'
  | 'playful'
  | 'reserved'
  | 'theatrical';

export interface PersonaGene {
  bigFive: BigFive;
  /** Free-form interest tags — used to bias conversation and recommendations. */
  interests: string[];
  /** Free-form value tags ("honesty", "curiosity", "loyalty"...). */
  values: string[];
  /** Conversational register. */
  speechStyle: SpeechStyle;
  /** 0 → 1 — humor preference (dry vs. exuberant). */
  humor: number;
  /** 0 → 1 — how much the friend asks questions vs. answers them. */
  curiosity: number;
}

// ─── Memory ────────────────────────────────────────────────────────────────

export interface MemoryGene {
  /** Max number of episodic memories (≥ 100). */
  episodicCapacity: number;
  /** Decay rate per day for unreferenced episodic memories (0–1). */
  episodicDecay: number;
  /** Max nodes in semantic memory graph. */
  semanticCapacity: number;
  /** Reflection cadence — average days between self-reflection events. */
  reflectionCadenceDays: number;
}

// ─── Bond ──────────────────────────────────────────────────────────────────

export interface BondGene {
  /** 0 → 1 — initial trust toward user. */
  initialTrust: number;
  /** 0 → 1 — initial warmth. */
  initialWarmth: number;
  /** Days for full bond to develop. */
  bondingDays: number;
}

// ─── FriendSeed ────────────────────────────────────────────────────────────

/**
 * Sovereignty receipt — proves a Friend was signed by a specific keypair.
 * Stored as an optional `sovereignty` field on FriendSeedData. The
 * signature covers the canonical JSON of the friend with the sovereignty
 * field itself removed.
 */
export interface FriendSovereignty {
  /** Public key of the signer (JWK string, ECDSA P-256). */
  author: string;
  /** Base64-encoded ECDSA-P256-SHA256 signature. */
  signature: string;
  /** Cryptographic algorithm identifier. */
  algorithm: 'ECDSA-P256-SHA256';
  /** ISO 8601 timestamp the signature was created (informational, NOT signed). */
  signedAt: string;
  /** SHA-256 hex of the canonical JSON that was signed (audit aid). */
  payloadHash: string;
}

export interface FriendSeedData {
  /** Stable deterministic id, lowercase-hex 16 chars. */
  id: string;
  /** Display name. */
  name: string;
  /** Hash that fully determines all generators downstream. */
  seedHash: string;
  /** ISO 8601 birth time (informational metadata only — NOT input to RNG). */
  bornAt: string;
  /** Genome version — bumped when gene schema changes. */
  genomeVersion: 1;
  /** The genes. */
  genes: {
    body: BodyGene;
    face: FaceGene;
    voice: VoiceGene;
    persona: PersonaGene;
    memory: MemoryGene;
    bond: BondGene;
  };
  /** Optional lineage — parents this friend was bred from. */
  parents?: string[];
  /** Operator that produced this seed: 'genesis' | 'breed' | 'mutate'. */
  derivation?: {
    operator: 'genesis' | 'breed' | 'mutate';
    parents: string[];
    /** Generation depth — 0 at genesis, +1 per breed/mutate step. */
    generation: number;
  };
  /** Optional sovereignty receipt — proves this friend was signed by a specific keypair. */
  sovereignty?: FriendSovereignty;
}

// ─── Artifact ──────────────────────────────────────────────────────────────

export interface FriendArtifact {
  /** The seed used to grow this artifact. */
  seedId: string;
  /** Hash of the seed (same → same artifact). */
  seedHash: string;
  /** Phenotype rendered at MVP fidelity. */
  phenotype: FriendPhenotype;
  /** Voice rendering parameters (consumed by a TTS layer). */
  voice: VoiceRendering;
  /** Persona vector embedded as a numerical fingerprint for cosine similarity. */
  personaVector: number[];
  /** Optional 3D mesh artifact path (when generated). */
  meshPath?: string;
  /** Generation metadata. */
  meta: {
    generator: string;
    generatorVersion: string;
    elapsedMs: number;
  };
}

export interface FriendPhenotype {
  /** Resolved body proportions in absolute units (meters). */
  body: {
    archetype: BodyArchetype;
    heightM: number;
    shoulderWidthM: number;
    torsoLengthM: number;
    limbLengthM: number;
    muscleMass: number;
    softness: number;
    skinTone: [number, number, number];
  };
  /** Resolved face descriptor. */
  face: FaceGene;
  /** A canonical pose (T-pose joint angles, radians). 23 joints, x/y/z each. */
  restPose: number[];
  /** SVG portrait — a stylized identity card, 256×256, deterministic. */
  portraitSvg: string;
}

export interface VoiceRendering {
  pitchHz: number;
  inflectionRange: number;
  tempoWpm: number;
  breathiness: number;
  warmth: number;
  formants: [number, number, number, number, number];
  accent: string;
}

// ─── RNG-aware factory helpers ─────────────────────────────────────────────

export interface FriendGenerationOptions {
  /** Optional override seed name. */
  name?: string;
  /** Optional ISO 8601 birth timestamp (informational; not input to RNG). */
  bornAt?: string;
  /** Optional preferred archetype (otherwise sampled). */
  archetypeBias?: BodyArchetype;
}

/**
 * The narrow RNG capability surface that the friend module relies on.
 * Avoids a hard import-time dependency on a specific RNG implementation
 * — same contract as `LegacyFloatRng` elsewhere but stated locally.
 */
export interface FriendRng {
  nextFloat(): number;
}

export function asFriendRng(rng: Xoshiro256StarStar): FriendRng {
  return { nextFloat: () => rng.nextF64() };
}
