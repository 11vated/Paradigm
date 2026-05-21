/**
 * Resonance Engine — Reality-OS substrate primitive
 *
 * Detects WHY two things "go together" across three independent axes:
 *
 *   1. Harmonic resonance     — small-integer frequency ratios (musical),
 *                               φ / π / e proportions, fractal self-similarity
 *   2. Semantic resonance     — cosine similarity in 12-D adjective space
 *                               or higher-D embedding space
 *   3. Structural resonance   — graph isomorphism / topological match
 *                               between gene structures
 *   4. Dimensional resonance  — overlap in dimensional signatures
 *
 * The total resonance is a weighted blend; weights are exposed so
 * domain-specific callers (music vs. character vs. world) can rebalance.
 *
 * Source inspiration: Generative-Seed-Programming-GSPL-/packages/llm/
 * src/agents/resonance.ts, elevated to canon for Paradigm.
 */

import type { DimensionalSignature } from './dimensions';
import { signatureSimilarity } from './dimensions';
import { cosine12, type Vec12 } from '../agent/adjective-normalization';

// ─── Mathematical anchors ──────────────────────────────────────────────────

export const PHI = 1.6180339887498949;
export const PI = Math.PI;
export const E = Math.E;
export const SQRT2 = Math.SQRT2;
export const SQRT3 = Math.sqrt(3);

/** Just-intonation ratios used in harmonic-resonance scoring. */
interface HarmonicRatio { ratio: number; name: string }
export const HARMONIC_RATIOS: HarmonicRatio[] = [
  { ratio: 1 / 1, name: 'unison' },
  { ratio: 2 / 1, name: 'octave' },
  { ratio: 3 / 2, name: 'perfect-fifth' },
  { ratio: 4 / 3, name: 'perfect-fourth' },
  { ratio: 5 / 4, name: 'major-third' },
  { ratio: 6 / 5, name: 'minor-third' },
  { ratio: 5 / 3, name: 'major-sixth' },
  { ratio: 8 / 5, name: 'minor-sixth' },
  { ratio: PHI, name: 'golden' },
  { ratio: 9 / 8, name: 'major-second' },
  { ratio: 16 / 9, name: 'minor-seventh' },
  { ratio: 15 / 8, name: 'major-seventh' },
];

// ─── Harmonic resonance ────────────────────────────────────────────────────

/**
 * Score a numeric ratio against the canonical just-intonation + golden
 * ratio set. Returns a value in [0, 1] where 1 = perfectly aligned with
 * a named harmonic ratio, 0 = maximally dissonant.
 *
 * Pure function; deterministic.
 */
export function harmonicResonance(a: number, b: number): {
  score: number;
  bestMatch: string;
  delta: number;
} {
  if (a === 0 || b === 0) return { score: 0, bestMatch: 'undefined', delta: 1 };
  const r = a > b ? a / b : b / a;
  let best = HARMONIC_RATIOS[0];
  let bestDelta = Math.abs(r - best.ratio);
  for (const h of HARMONIC_RATIOS) {
    const d = Math.abs(r - h.ratio);
    if (d < bestDelta) {
      best = h;
      bestDelta = d;
    }
  }
  // tolerance window: anything within 3% of a named ratio counts.
  const tolerance = 0.03;
  const score = bestDelta < tolerance
    ? 1 - bestDelta / tolerance
    : Math.max(0, 1 - bestDelta);
  return { score, bestMatch: best.name, delta: bestDelta };
}

/**
 * Fractal self-similarity score — given a sequence of values, measures
 * how well the sequence repeats itself at multiple scales. Used to
 * detect natural, organic structure in melodies, dialogue rhythms,
 * architectural plans, etc.
 *
 * Algorithm: detrended-fluctuation-style estimator over log-scaled
 * windows. Returns Hurst-like exponent normalized to [0, 1].
 */
export function fractalSelfSimilarity(values: number[]): number {
  if (values.length < 4) return 0;
  const n = values.length;
  const halves = [n, Math.floor(n / 2), Math.floor(n / 4)];
  const variances: number[] = [];
  for (const w of halves) {
    if (w < 2) continue;
    let sumVar = 0;
    let count = 0;
    for (let start = 0; start + w <= n; start += w) {
      const slice = values.slice(start, start + w);
      sumVar += variance(slice);
      count++;
    }
    if (count > 0) variances.push(sumVar / count);
  }
  if (variances.length < 2) return 0;
  // Self-similar if log-variance scales linearly with log-window-size.
  const logVars = variances.map((v) => Math.log(v + 1e-9));
  let mean = 0;
  for (const v of logVars) mean += v;
  mean /= logVars.length;
  let diff = 0;
  for (const v of logVars) diff += Math.abs(v - mean);
  diff /= logVars.length;
  // Lower diff = more self-similar. Map [0, 2] → [1, 0].
  return Math.max(0, Math.min(1, 1 - diff / 2));
}

/** Score a single number against φ / π / e proportions. */
export function transcendentalResonance(value: number): {
  score: number;
  bestMatch: string;
} {
  const anchors = [
    { v: PHI, name: 'phi' },
    { v: 1 / PHI, name: 'inverse-phi' },
    { v: PI, name: 'pi' },
    { v: PI / 2, name: 'pi/2' },
    { v: 2 * PI, name: 'tau' },
    { v: E, name: 'e' },
    { v: 1 / E, name: 'inverse-e' },
    { v: SQRT2, name: 'sqrt(2)' },
    { v: SQRT3, name: 'sqrt(3)' },
  ];
  let best = anchors[0];
  let bestDelta = Math.abs(value - best.v);
  for (const a of anchors) {
    const d = Math.abs(value - a.v);
    if (d < bestDelta) {
      best = a;
      bestDelta = d;
    }
  }
  const score = bestDelta < 0.05 ? 1 - bestDelta / 0.05 : 0;
  return { score, bestMatch: best.name };
}

// ─── Semantic resonance ────────────────────────────────────────────────────

/** Cosine in 12-D adjective space — direct passthrough. */
export function semanticResonance(a: Vec12, b: Vec12): number {
  return Math.max(0, cosine12(a, b)); // negative cosine is anti-resonance, clamp to 0
}

/** Negative cosine — "anti-resonance" / opposition score. */
export function semanticOpposition(a: Vec12, b: Vec12): number {
  return Math.max(0, -cosine12(a, b));
}

// ─── Structural resonance ─────────────────────────────────────────────────

export interface GeneGraph {
  nodes: string[]; // node ids (gene paths)
  edges: Array<[string, string]>; // ordered pairs
}

/**
 * Graph-edit-distance approximation between two gene graphs. Returns
 * a resonance score in [0, 1] where 1 = identical topology.
 *
 * Implementation: degree-sequence comparison + shared-edge ratio.
 * Not a true GED but stable and O(n+m).
 */
export function structuralResonance(g1: GeneGraph, g2: GeneGraph): number {
  if (g1.nodes.length === 0 && g2.nodes.length === 0) return 1;
  if (g1.nodes.length === 0 || g2.nodes.length === 0) return 0;
  const degs1 = degreeSeq(g1).sort((a, b) => b - a);
  const degs2 = degreeSeq(g2).sort((a, b) => b - a);
  const maxLen = Math.max(degs1.length, degs2.length);
  let diffSum = 0;
  for (let i = 0; i < maxLen; i++) {
    diffSum += Math.abs((degs1[i] ?? 0) - (degs2[i] ?? 0));
  }
  const degScore = Math.max(0, 1 - diffSum / (2 * Math.max(g1.edges.length, g2.edges.length, 1)));
  const edges1 = new Set(g1.edges.map(([a, b]) => `${a}->${b}`));
  let shared = 0;
  for (const [a, b] of g2.edges) {
    if (edges1.has(`${a}->${b}`)) shared++;
  }
  const edgeScore = shared / Math.max(g1.edges.length, g2.edges.length, 1);
  return (degScore + edgeScore) / 2;
}

// ─── Dimensional resonance ─────────────────────────────────────────────────

/** Overlap in dimensional signature — already implemented as cosine over 7-D. */
export function dimensionalResonance(
  a: DimensionalSignature,
  b: DimensionalSignature,
): number {
  return Math.max(0, signatureSimilarity(a, b));
}

// ─── Composite total resonance ─────────────────────────────────────────────

export interface ResonanceInput {
  /** Optional: numeric anchor pair for harmonic ratio scoring */
  harmonic?: { a: number; b: number };
  /** Optional: 12-D semantic vectors */
  semantic?: { a: Vec12; b: Vec12 };
  /** Optional: gene graphs for structural comparison */
  structural?: { a: GeneGraph; b: GeneGraph };
  /** Optional: dimensional signatures */
  dimensional?: { a: DimensionalSignature; b: DimensionalSignature };
  /** Optional: numeric sequence for fractal scoring */
  fractal?: number[];
}

export interface ResonanceWeights {
  harmonic: number;
  semantic: number;
  structural: number;
  dimensional: number;
  fractal: number;
}

export const DEFAULT_WEIGHTS: ResonanceWeights = {
  harmonic: 0.2,
  semantic: 0.3,
  structural: 0.2,
  dimensional: 0.2,
  fractal: 0.1,
};

export interface ResonanceReport {
  total: number;
  components: Partial<Record<keyof ResonanceWeights, number>>;
  notes: string[];
}

export function resonance(
  input: ResonanceInput,
  weights: ResonanceWeights = DEFAULT_WEIGHTS,
): ResonanceReport {
  const components: ResonanceReport['components'] = {};
  const notes: string[] = [];
  let totalScore = 0;
  let totalWeight = 0;

  if (input.harmonic) {
    const h = harmonicResonance(input.harmonic.a, input.harmonic.b);
    components.harmonic = h.score;
    totalScore += h.score * weights.harmonic;
    totalWeight += weights.harmonic;
    notes.push(`harmonic: ${h.bestMatch} (Δ=${h.delta.toFixed(3)})`);
  }
  if (input.semantic) {
    const s = semanticResonance(input.semantic.a, input.semantic.b);
    components.semantic = s;
    totalScore += s * weights.semantic;
    totalWeight += weights.semantic;
  }
  if (input.structural) {
    const st = structuralResonance(input.structural.a, input.structural.b);
    components.structural = st;
    totalScore += st * weights.structural;
    totalWeight += weights.structural;
  }
  if (input.dimensional) {
    const d = dimensionalResonance(input.dimensional.a, input.dimensional.b);
    components.dimensional = d;
    totalScore += d * weights.dimensional;
    totalWeight += weights.dimensional;
  }
  if (input.fractal) {
    const f = fractalSelfSimilarity(input.fractal);
    components.fractal = f;
    totalScore += f * weights.fractal;
    totalWeight += weights.fractal;
  }

  const total = totalWeight > 0 ? totalScore / totalWeight : 0;
  return { total, components, notes };
}

// ─── Helpers ───────────────────────────────────────────────────────────────

function variance(xs: number[]): number {
  if (xs.length === 0) return 0;
  let m = 0;
  for (const x of xs) m += x;
  m /= xs.length;
  let v = 0;
  for (const x of xs) v += (x - m) ** 2;
  return v / xs.length;
}

function degreeSeq(g: GeneGraph): number[] {
  const counts = new Map<string, number>();
  for (const node of g.nodes) counts.set(node, 0);
  for (const [a, b] of g.edges) {
    counts.set(a, (counts.get(a) ?? 0) + 1);
    counts.set(b, (counts.get(b) ?? 0) + 1);
  }
  return Array.from(counts.values());
}
