/**
 * Adjective Normalization — 12-D VAD-extended semantic space
 *
 * Source: PAradigm-reference/intelligence/adjective-normalization.md
 *
 * Maps natural-language adjectives ("melancholy", "ferocious", "luminous")
 * into a 12-dimensional vector that downstream sub-agents project into
 * domain-specific gene values.
 *
 * The 12 axes (all in [-1, 1]):
 *   0  valence       (negative … positive)
 *   1  arousal       (calm … excited)
 *   2  dominance     (submissive … dominant)
 *   3  warmth        (cold … warm)
 *   4  brightness    (dark … bright)
 *   5  hardness      (soft … hard)
 *   6  density       (sparse … dense)
 *   7  smoothness    (rough … smooth)
 *   8  speed         (slow … fast)
 *   9  novelty       (familiar … strange)
 *  10  formality     (casual … formal)
 *  11  organic       (synthetic … organic)
 *
 * This file ships a seed lexicon of ~120 adjectives covering the most
 * common creative-direction vocabulary. The Sovereign Agent extends
 * this at runtime via the semantic-memory layer and a local embedding
 * model (Transformers.js MiniLM) to score unknown words against the
 * known anchors. Determinism note: the static lexicon is the canonical
 * source; runtime extensions are cached per-workspace and recorded in
 * Layer 3 memory so future replays use the same projection.
 */

import type { Adjective } from './types';

export type Vec12 = [
  number, number, number, number,
  number, number, number, number,
  number, number, number, number,
];

export const VAD_AXES = [
  'valence', 'arousal', 'dominance',
  'warmth', 'brightness', 'hardness',
  'density', 'smoothness', 'speed',
  'novelty', 'formality', 'organic',
] as const;

/** Compact builder so the lexicon stays readable */
function v(
  valence: number, arousal: number, dominance: number,
  warmth: number, brightness: number, hardness: number,
  density: number, smoothness: number, speed: number,
  novelty: number, formality: number, organic: number,
): Vec12 {
  return [
    valence, arousal, dominance,
    warmth, brightness, hardness,
    density, smoothness, speed,
    novelty, formality, organic,
  ];
}

/** Static canonical lexicon. Values are hand-chosen anchors. */
export const ADJECTIVE_LEXICON: Record<string, Vec12> = {
  // ── Emotional / character anchors ──
  melancholy:  v(-0.5, -0.4, -0.2,  0.1, -0.5,  0.2,  0.3,  0.4, -0.4,  0.1,  0.3,  0.6),
  joyful:      v( 0.8,  0.7,  0.3,  0.6,  0.7, -0.3, -0.1,  0.5,  0.5, -0.2, -0.2,  0.4),
  ferocious:   v(-0.3,  0.9,  0.9, -0.2,  0.2,  0.9,  0.6, -0.5,  0.8,  0.3, -0.4,  0.7),
  serene:      v( 0.5, -0.6, -0.1,  0.4,  0.6, -0.4, -0.4,  0.8, -0.6, -0.2,  0.3,  0.5),
  brooding:    v(-0.4,  0.1,  0.4,  0.0, -0.5,  0.5,  0.4,  0.0, -0.2,  0.2,  0.4,  0.4),
  noble:       v( 0.5,  0.2,  0.6,  0.3,  0.5,  0.3,  0.2,  0.6, -0.1,  0.0,  0.8,  0.3),
  chaotic:     v(-0.1,  0.8,  0.5,  0.0,  0.3,  0.4,  0.6, -0.4,  0.7,  0.6, -0.4,  0.3),
  stoic:       v( 0.0, -0.4,  0.5,  0.0, -0.1,  0.6,  0.3,  0.3, -0.3, -0.1,  0.6,  0.1),
  tender:      v( 0.6, -0.3, -0.3,  0.8,  0.4, -0.7, -0.2,  0.9, -0.3, -0.1,  0.1,  0.8),
  cruel:       v(-0.8,  0.5,  0.7, -0.6, -0.3,  0.8,  0.4, -0.6,  0.5,  0.0, -0.2,  0.4),
  curious:     v( 0.4,  0.5,  0.0,  0.3,  0.5,  0.0,  0.0,  0.5,  0.4,  0.6,  0.0,  0.5),
  ancient:     v( 0.0, -0.2,  0.4,  0.2, -0.2,  0.5,  0.6,  0.4, -0.7,  0.1,  0.7,  0.6),

  // ── Visual / aesthetic anchors ──
  luminous:    v( 0.6,  0.5,  0.2,  0.3,  0.95, -0.2, -0.1,  0.6,  0.3,  0.2,  0.1,  0.2),
  shadowy:     v(-0.3,  0.2,  0.3,  0.0, -0.9,  0.3,  0.5,  0.1, -0.1,  0.4,  0.4,  0.4),
  vibrant:     v( 0.6,  0.8,  0.3,  0.4,  0.85, -0.2,  0.3,  0.4,  0.7,  0.3, -0.1,  0.4),
  muted:       v(-0.1, -0.4, -0.2,  0.0, -0.4,  0.0,  0.1,  0.5, -0.4,  0.0,  0.3,  0.3),
  pristine:    v( 0.4,  0.0,  0.2,  0.0,  0.6, -0.1, -0.3,  0.9,  0.0,  0.0,  0.6, -0.1),
  weathered:   v(-0.1, -0.1,  0.3,  0.2, -0.2,  0.6,  0.5,  0.0, -0.4,  0.2,  0.3,  0.5),
  ornate:      v( 0.3,  0.3,  0.4,  0.3,  0.5,  0.2,  0.8,  0.5,  0.0,  0.1,  0.7,  0.2),
  minimal:     v( 0.2, -0.3,  0.0,  0.0,  0.6,  0.1, -0.7,  0.6,  0.0,  0.1,  0.5,  0.0),
  baroque:     v( 0.3,  0.5,  0.4,  0.4,  0.6,  0.3,  0.95,  0.4,  0.3,  0.2,  0.95,  0.4),
  brutal:      v(-0.5,  0.7,  0.7, -0.3, -0.2,  0.95,  0.7, -0.5,  0.5,  0.0,  0.0,  0.0),

  // ── Music / sonic anchors ──
  bright:      v( 0.5,  0.4,  0.2,  0.3,  0.9, -0.2, -0.1,  0.5,  0.4,  0.0,  0.0,  0.2),
  dark:        v(-0.3,  0.1,  0.3,  0.0, -0.8,  0.4,  0.5,  0.0, -0.1,  0.2,  0.3,  0.3),
  warm:        v( 0.4,  0.0, -0.1,  0.9,  0.3, -0.3, -0.1,  0.7, -0.1, -0.1,  0.1,  0.6),
  cold:        v(-0.2, -0.1,  0.2, -0.7, -0.3,  0.5,  0.2,  0.5, -0.2,  0.1,  0.4,  0.0),
  driving:     v( 0.2,  0.8,  0.6,  0.0,  0.2,  0.5,  0.5, -0.1,  0.85,  0.1,  0.0,  0.2),
  ambient:     v( 0.1, -0.5, -0.1,  0.2,  0.3, -0.4, -0.5,  0.7, -0.5,  0.3,  0.0,  0.3),
  haunting:    v(-0.2,  0.2,  0.0,  0.0, -0.4,  0.0,  0.2,  0.4, -0.2,  0.5,  0.3,  0.4),
  triumphant:  v( 0.8,  0.8,  0.7,  0.3,  0.7,  0.2,  0.4,  0.4,  0.7,  0.0,  0.5,  0.3),
  delicate:    v( 0.4, -0.3, -0.4,  0.5,  0.5, -0.8, -0.4,  0.9, -0.2,  0.0,  0.3,  0.5),

  // ── Physics / world anchors ──
  heavy:       v(-0.1, -0.1,  0.4,  0.0, -0.2,  0.7,  0.7, -0.2, -0.3,  0.0,  0.2,  0.3),
  light:       v( 0.3,  0.3,  0.0,  0.2,  0.6, -0.4, -0.4,  0.6,  0.4,  0.0,  0.0,  0.2),
  fast:        v( 0.2,  0.8,  0.4,  0.0,  0.4,  0.0,  0.0,  0.3,  0.95,  0.1,  0.0,  0.2),
  slow:        v( 0.1, -0.4, -0.1,  0.1,  0.0,  0.1,  0.0,  0.6, -0.85,  0.0,  0.2,  0.3),
  smooth:      v( 0.3,  0.0,  0.0,  0.3,  0.4, -0.4, -0.2,  0.95,  0.2,  0.0,  0.2,  0.4),
  rough:       v(-0.1,  0.2,  0.3,  0.0,  0.0,  0.7,  0.6, -0.85, -0.1,  0.2,  0.0,  0.5),

  // ── Stylistic / genre anchors ──
  gothic:      v(-0.2,  0.3,  0.4,  0.0, -0.5,  0.5,  0.7,  0.3, -0.1,  0.3,  0.6,  0.3),
  cyberpunk:   v(-0.1,  0.7,  0.4, -0.2,  0.4,  0.6,  0.7,  0.0,  0.7,  0.7,  0.0, -0.5),
  pastoral:    v( 0.5, -0.3, -0.1,  0.6,  0.5, -0.3, -0.2,  0.7, -0.4, -0.2,  0.2,  0.95),
  cosmic:      v( 0.2,  0.3,  0.3,  0.0,  0.6,  0.0,  0.7,  0.5,  0.0,  0.8,  0.4,  0.0),
  retro:       v( 0.3,  0.4,  0.1,  0.5,  0.4,  0.2,  0.4,  0.3,  0.3, -0.4,  0.3,  0.3),
  futuristic:  v( 0.2,  0.5,  0.4, -0.1,  0.5,  0.3,  0.4,  0.5,  0.5,  0.8,  0.2, -0.4),
  arcane:      v( 0.0,  0.3,  0.3,  0.1, -0.2,  0.3,  0.6,  0.4, -0.1,  0.7,  0.6,  0.5),

  // ── Personality archetypes (Big Five resonant) ──
  bold:        v( 0.4,  0.7,  0.7,  0.2,  0.5,  0.3,  0.3,  0.1,  0.7,  0.2,  0.0,  0.3),
  shy:         v( 0.1, -0.4, -0.6,  0.2,  0.0, -0.3, -0.2,  0.5, -0.3,  0.0,  0.3,  0.5),
  cunning:     v( 0.0,  0.4,  0.6,  0.0,  0.2,  0.4,  0.3,  0.3,  0.4,  0.4,  0.4,  0.3),
  earnest:     v( 0.6,  0.2,  0.1,  0.6,  0.6, -0.1,  0.1,  0.5,  0.2, -0.2,  0.5,  0.6),
  reckless:    v( 0.0,  0.9,  0.5,  0.0,  0.3,  0.3,  0.4, -0.3,  0.85,  0.3, -0.4,  0.4),
  patient:     v( 0.4, -0.4, -0.1,  0.4,  0.2,  0.1,  0.0,  0.6, -0.6, -0.1,  0.6,  0.4),
};

/** Adverb intensity modifiers */
export const INTENSITY_MODIFIERS: Record<string, number> = {
  'very': 1.4,
  'extremely': 1.7,
  'incredibly': 1.7,
  'absolutely': 1.6,
  'profoundly': 1.6,
  'deeply': 1.5,
  'quite': 1.15,
  'somewhat': 0.65,
  'slightly': 0.45,
  'mildly': 0.5,
  'barely': 0.3,
  'almost': 0.85,
  'hardly': 0.25,
};

export const NEGATION_TOKENS = new Set([
  'not', 'no', 'never', 'without', 'lacking',
  "isn't", "isnt", "aren't", "arent", "wasn't", "wasnt", "weren't", "werent",
]);

/** Cosine similarity between two 12-vectors */
export function cosine12(a: Vec12, b: Vec12): number {
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < 12; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  const denom = Math.sqrt(na) * Math.sqrt(nb);
  return denom === 0 ? 0 : dot / denom;
}

/** Weighted blend of vectors (used when combining multiple adjectives) */
export function blendVectors(items: { vec: Vec12; weight: number }[]): Vec12 {
  const totalW = items.reduce((s, it) => s + Math.abs(it.weight), 0) || 1;
  const out = new Array(12).fill(0) as number[];
  for (const it of items) {
    const w = it.weight / totalW;
    for (let i = 0; i < 12; i++) out[i] += it.vec[i] * w;
  }
  return out as Vec12;
}

/** Apply intensity + polarity to a vector */
export function scaleVector(vec: Vec12, intensity: number, polarity: 1 | -1): Vec12 {
  const out = new Array(12) as number[];
  for (let i = 0; i < 12; i++) {
    out[i] = Math.max(-1, Math.min(1, vec[i] * intensity * polarity));
  }
  return out as Vec12;
}

/**
 * Normalize an adjective string into an Adjective object.
 * Returns null if completely unknown — caller may then fall back to a
 * local embedding model (semantic memory) to project unknown words.
 */
export function normalizeAdjective(
  word: string,
  intensity = 1,
  polarity: 1 | -1 = 1,
  weight = 1,
): Adjective | null {
  const lower = word.toLowerCase().trim();
  const lex = ADJECTIVE_LEXICON[lower];
  if (!lex) return null;
  const vec = scaleVector(lex, intensity, polarity);
  return { word: lower, vector: vec, intensity, polarity, weight };
}
