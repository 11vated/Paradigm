/**
 * Civilisation breeding — given two parent civilisations, produce a
 * deterministic child whose intent is a typed crossover of the parents,
 * and whose lineage explicitly references both.
 *
 * Pure / deterministic / IO-free.
 */
import { createHash } from 'node:crypto';
import { rngFromHash } from '../kernel/rng.js';
import type { CivilisationIntent, CivilisationBundle } from './types.js';
import { composeCivilisation } from './orchestrator.js';

const MODES = ['ionian','dorian','phrygian','lydian','mixolydian','aeolian','locrian'] as const;
const KEYS = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'] as const;
const PHONEMES = ['ka','lo','si','re','mu','no','va','di','wo','ja','el','ur','ai','en','ix','ot'];

function mergeName(a: string, b: string, rng: ReturnType<typeof rngFromHash>): string {
  const splitA = Math.max(2, Math.floor(a.length * 0.4));
  const splitB = Math.max(2, Math.floor(b.length * 0.5));
  const head = a.slice(0, splitA);
  const tail = b.slice(b.length - splitB);
  const variant = rng.nextF64() > 0.5
    ? head + tail
    : (head + PHONEMES[rng.nextInt(0, PHONEMES.length - 1)] + tail);
  // Capitalize, strip duplicate chars at the seam
  let s = variant.charAt(0).toUpperCase() + variant.slice(1);
  s = s.replace(/(.)\1{2,}/g, '$1$1');
  return s;
}

function pickMode(a?: string, b?: string, rng: ReturnType<typeof rngFromHash> | null = null): string | undefined {
  if (!a && !b) return undefined;
  if (!a) return b;
  if (!b) return a;
  if (a === b) return a;
  // Blend: 30% chance pick a new mode that's "between" them in brightness
  if (rng && rng.nextF64() < 0.3) {
    // Brightness order: locrian < phrygian < aeolian < dorian < mixolydian < ionian < lydian
    const order = ['locrian','phrygian','aeolian','dorian','mixolydian','ionian','lydian'];
    const ia = order.indexOf(a as string);
    const ib = order.indexOf(b as string);
    if (ia >= 0 && ib >= 0) return order[Math.floor((ia + ib) / 2)];
  }
  return rng && rng.nextF64() < 0.5 ? a : b;
}

function pickKey(a?: string, b?: string, rng: ReturnType<typeof rngFromHash> | null = null): string | undefined {
  if (!a && !b) return undefined;
  if (!a) return b;
  if (!b) return a;
  if (a === b) return a;
  if (rng && rng.nextF64() < 0.25) {
    const ia = KEYS.indexOf(a as any);
    const ib = KEYS.indexOf(b as any);
    if (ia >= 0 && ib >= 0) {
      // 50/50: pick the perfect-fifth or the average
      const avg = Math.round((ia + ib) / 2) % 12;
      return KEYS[avg];
    }
  }
  return rng && rng.nextF64() < 0.5 ? a : b;
}

function blendTempo(a?: number, b?: number, rng: ReturnType<typeof rngFromHash> | null = null): number | undefined {
  if (a == null && b == null) return undefined;
  if (a == null) return b;
  if (b == null) return a;
  const blend = (a + b) / 2;
  const jitter = rng ? (rng.nextF64() - 0.5) * Math.abs(a - b) * 0.3 : 0;
  return Math.max(30, Math.min(240, Math.round(blend + jitter)));
}

export interface BreedOpts {
  /** Override the child's name. Otherwise computed deterministically. */
  name?: string;
  /** Strata to render in the child. Defaults to all 11. */
  strata?: string[];
  /** Form dimensions (passed through). */
  formWidth?: number;
  formHeight?: number;
  worldWidth?: number;
  worldHeight?: number;
}

export function breedCivilisations(
  parentA: CivilisationBundle,
  parentB: CivilisationBundle,
  opts: BreedOpts = {},
): CivilisationBundle {
  // Deterministic RNG keyed on both parents' hashes (commutative)
  const [hA, hB] = [parentA.hash, parentB.hash].sort();
  const breedSeed = createHash('sha256').update(`${hA}::${hB}`).digest('hex');
  const rng = rngFromHash(breedSeed);

  const intentA = parentA.intent;
  const intentB = parentB.intent;

  const childIntent: CivilisationIntent = {
    name: opts.name ?? mergeName(intentA.name, intentB.name, rng),
    key: pickKey(intentA.key, intentB.key, rng),
    mode: pickMode(intentA.mode, intentB.mode, rng),
    tempo: blendTempo(intentA.tempo, intentB.tempo, rng),
    custodian: rng.nextF64() < 0.5 ? intentA.custodian : intentB.custodian,
    parents: [parentA.hash, parentB.hash],
  };

  return composeCivilisation(childIntent, {
    strata: opts.strata as any,
    formWidth: opts.formWidth,
    formHeight: opts.formHeight,
    worldWidth: opts.worldWidth,
    worldHeight: opts.worldHeight,
  });
}

/** Verify that a child bundle correctly references its parents. */
export function verifyLineage(
  child: CivilisationBundle,
  expectedParents: ReadonlyArray<CivilisationBundle>,
): { passed: boolean; missing: string[] } {
  const childParentHashes = new Set(child.intent.parents ?? []);
  const missing: string[] = [];
  for (const p of expectedParents) {
    if (!childParentHashes.has(p.hash)) missing.push(p.hash);
  }
  return { passed: missing.length === 0, missing };
}
