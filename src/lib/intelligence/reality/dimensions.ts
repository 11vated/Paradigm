/**
 * Dimensional Encoding — Reality-OS substrate primitive
 *
 * Every gene lives in one or more dimensions. The dimensional signature
 * declares which dimensions a gene occupies and how it projects across
 * them. This enables cross-dimensional transformation, resonance
 * scoring, and visualization of "the invisible" (modal, possible,
 * relational dimensions that don't reduce to 3D).
 *
 * Canonical 7 dimensions:
 *   SPATIAL    physical 3D    (x, y, z)
 *   TEMPORAL   time, rhythm   (t)
 *   SPECTRAL   frequency      (Hz, nm, EM bands)
 *   MODAL      emotional      (12-D adjective space)
 *   POSSIBLE   counterfactual (latent / unrealized branches)
 *   SEMANTIC   meaning        (embedding coordinates)
 *   STRUCTURAL relational     (graph topology of relations)
 */

export type DimensionId =
  | 'SPATIAL'
  | 'TEMPORAL'
  | 'SPECTRAL'
  | 'MODAL'
  | 'POSSIBLE'
  | 'SEMANTIC'
  | 'STRUCTURAL';

export const ALL_DIMENSIONS: readonly DimensionId[] = [
  'SPATIAL',
  'TEMPORAL',
  'SPECTRAL',
  'MODAL',
  'POSSIBLE',
  'SEMANTIC',
  'STRUCTURAL',
] as const;

/** A dimensional signature declares presence + intensity in each dimension. */
export interface DimensionalSignature {
  /** intensity per dimension, all in [0, 1]; 0 = absent, 1 = saturated */
  readonly weights: Record<DimensionId, number>;
  /** optional per-dimension coordinates when known (e.g. {x,y,z} for SPATIAL) */
  readonly coords?: Partial<Record<DimensionId, number[]>>;
}

export const ZERO_SIGNATURE: DimensionalSignature = {
  weights: {
    SPATIAL: 0,
    TEMPORAL: 0,
    SPECTRAL: 0,
    MODAL: 0,
    POSSIBLE: 0,
    SEMANTIC: 0,
    STRUCTURAL: 0,
  },
};

export function makeSignature(
  weights: Partial<Record<DimensionId, number>>,
  coords?: Partial<Record<DimensionId, number[]>>,
): DimensionalSignature {
  const w: Record<DimensionId, number> = { ...ZERO_SIGNATURE.weights };
  for (const dim of ALL_DIMENSIONS) {
    if (weights[dim] !== undefined) {
      w[dim] = clamp01(weights[dim]!);
    }
  }
  return coords ? { weights: w, coords } : { weights: w };
}

/** Canonical signatures for the 17 gene types — used as defaults. */
export const GENE_SIGNATURES: Record<string, DimensionalSignature> = {
  body:     makeSignature({ SPATIAL: 1.0, STRUCTURAL: 0.6 }),
  face:     makeSignature({ SPATIAL: 0.9, MODAL: 0.5, SEMANTIC: 0.4 }),
  voice:    makeSignature({ SPECTRAL: 1.0, TEMPORAL: 0.8, MODAL: 0.6 }),
  music:    makeSignature({ SPECTRAL: 1.0, TEMPORAL: 1.0, MODAL: 0.7 }),
  visual:   makeSignature({ SPATIAL: 0.7, SPECTRAL: 0.5, MODAL: 0.6 }),
  visual2d: makeSignature({ SPATIAL: 0.6, SPECTRAL: 0.4, MODAL: 0.5 }),
  geometry3d: makeSignature({ SPATIAL: 1.0, STRUCTURAL: 0.7 }),
  animation:  makeSignature({ SPATIAL: 0.8, TEMPORAL: 1.0 }),
  persona:    makeSignature({ MODAL: 1.0, SEMANTIC: 0.8, STRUCTURAL: 0.5 }),
  memory:     makeSignature({ TEMPORAL: 0.7, SEMANTIC: 0.9, POSSIBLE: 0.4 }),
  bond:       makeSignature({ STRUCTURAL: 1.0, MODAL: 0.8, SEMANTIC: 0.5 }),
  narrative:  makeSignature({ TEMPORAL: 0.9, SEMANTIC: 1.0, POSSIBLE: 0.7, MODAL: 0.7 }),
  mechanics:  makeSignature({ STRUCTURAL: 0.9, TEMPORAL: 0.7, POSSIBLE: 0.8 }),
  physics:    makeSignature({ SPATIAL: 1.0, TEMPORAL: 0.9, SPECTRAL: 0.5 }),
  style:      makeSignature({ MODAL: 0.7, SEMANTIC: 0.9, SPECTRAL: 0.5 }),
  agent:      makeSignature({ SEMANTIC: 1.0, POSSIBLE: 0.9, STRUCTURAL: 0.6 }),
  friend:     makeSignature({ MODAL: 1.0, STRUCTURAL: 0.9, SEMANTIC: 0.7, TEMPORAL: 0.5 }),
};

export function signatureFor(geneType: string): DimensionalSignature {
  return GENE_SIGNATURES[geneType] ?? ZERO_SIGNATURE;
}

/** Cosine similarity over the 7-dimensional weight vector. */
export function signatureSimilarity(
  a: DimensionalSignature,
  b: DimensionalSignature,
): number {
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (const dim of ALL_DIMENSIONS) {
    const av = a.weights[dim];
    const bv = b.weights[dim];
    dot += av * bv;
    na += av * av;
    nb += bv * bv;
  }
  const denom = Math.sqrt(na) * Math.sqrt(nb);
  return denom < 1e-9 ? 0 : dot / denom;
}

/** L2 distance between two signatures in 7-D. */
export function signatureDistance(
  a: DimensionalSignature,
  b: DimensionalSignature,
): number {
  let sum = 0;
  for (const dim of ALL_DIMENSIONS) {
    const d = a.weights[dim] - b.weights[dim];
    sum += d * d;
  }
  return Math.sqrt(sum);
}

/**
 * Project a signature onto a single target dimension.
 * Returns a new signature where only the target dimension is preserved,
 * scaled by its original weight.
 */
export function projectOnto(
  sig: DimensionalSignature,
  target: DimensionalSignature,
): DimensionalSignature {
  const out = makeSignature({});
  for (const dim of ALL_DIMENSIONS) {
    out.weights[dim] = sig.weights[dim] * target.weights[dim];
  }
  return out;
}

/**
 * Compose two signatures by element-wise max (union) — the result
 * occupies every dimension at least one input occupies, at the higher
 * intensity. Used when blending two genes into a composite.
 */
export function unionSignatures(
  a: DimensionalSignature,
  b: DimensionalSignature,
): DimensionalSignature {
  const out = makeSignature({});
  for (const dim of ALL_DIMENSIONS) {
    out.weights[dim] = Math.max(a.weights[dim], b.weights[dim]);
  }
  return out;
}

/**
 * Intersect two signatures by element-wise min — the result occupies
 * only the dimensions both inputs share, at the lower intensity. Used
 * to find the common dimensional ground between two genes.
 */
export function intersectSignatures(
  a: DimensionalSignature,
  b: DimensionalSignature,
): DimensionalSignature {
  const out = makeSignature({});
  for (const dim of ALL_DIMENSIONS) {
    out.weights[dim] = Math.min(a.weights[dim], b.weights[dim]);
  }
  return out;
}

/** Total intensity across all 7 dimensions — measures how "present" a gene is overall. */
export function signatureMagnitude(sig: DimensionalSignature): number {
  let sum = 0;
  for (const dim of ALL_DIMENSIONS) sum += sig.weights[dim];
  return sum;
}

/** The dimension with highest weight — the gene's "home" dimension. */
export function dominantDimension(sig: DimensionalSignature): DimensionId {
  let best: DimensionId = 'SPATIAL';
  let bestW = -Infinity;
  for (const dim of ALL_DIMENSIONS) {
    if (sig.weights[dim] > bestW) {
      bestW = sig.weights[dim];
      best = dim;
    }
  }
  return best;
}

/**
 * Cross-dimensional transform: project a gene from source dim → target dim
 * using a learned (or hand-coded) mapping function. Returns the
 * transformed value plus a confidence in [0, 1].
 *
 * Example mappings (built-in, hand-coded):
 *   MODAL.valence × SPECTRAL → musical mode (positive → major, negative → minor)
 *   SPECTRAL.fundamental → SPATIAL.hue   (frequency → color, Newton's spectrum)
 *   MODAL.arousal → TEMPORAL.tempo       (high arousal → fast BPM)
 *   SEMANTIC.archetype → STRUCTURAL.role (archetype → social topology slot)
 */
export interface CrossDimTransform {
  source: DimensionId;
  target: DimensionId;
  description: string;
  apply: (value: number) => { value: number; confidence: number };
}

const TAU = 2 * Math.PI;

export const CROSS_DIM_TRANSFORMS: readonly CrossDimTransform[] = [
  {
    source: 'MODAL',
    target: 'SPECTRAL',
    description: 'valence → musical mode (1 = major, 0 = phrygian, -1 = locrian)',
    apply: (v) => ({ value: (v + 1) / 2, confidence: 0.8 }),
  },
  {
    source: 'SPECTRAL',
    target: 'SPATIAL',
    description: 'frequency (0..1 normalized) → hue (degrees on color wheel)',
    apply: (v) => ({ value: ((v % 1) + 1) % 1 * 360, confidence: 0.7 }),
  },
  {
    source: 'MODAL',
    target: 'TEMPORAL',
    description: 'arousal → tempo (60 BPM at -1, 180 BPM at +1)',
    apply: (v) => ({ value: 60 + (v + 1) * 60, confidence: 0.85 }),
  },
  {
    source: 'POSSIBLE',
    target: 'SEMANTIC',
    description: 'counterfactual weight → semantic novelty (raw passthrough)',
    apply: (v) => ({ value: v, confidence: 0.6 }),
  },
  {
    source: 'STRUCTURAL',
    target: 'MODAL',
    description: 'topology density → emotional intensity (higher density → higher arousal)',
    apply: (v) => ({ value: v * 2 - 1, confidence: 0.5 }),
  },
];

export function findTransform(
  source: DimensionId,
  target: DimensionId,
): CrossDimTransform | undefined {
  return CROSS_DIM_TRANSFORMS.find((t) => t.source === source && t.target === target);
}

/**
 * The Visualization Manifest — given a signature, produce a recipe
 * for rendering the gene visible across its occupied dimensions.
 * This is the "make the invisible visible" primitive: an agent can
 * use this manifest to drive generation of renderers per dimension.
 */
export interface VisualizationManifest {
  primary: DimensionId;
  renderers: Array<{
    dimension: DimensionId;
    weight: number;
    suggested: string; // e.g. "3d-mesh", "audio-clip", "color-swatch", "graph-svg"
  }>;
}

const DIM_RENDERERS: Record<DimensionId, string> = {
  SPATIAL: '3d-mesh',
  TEMPORAL: 'timeline',
  SPECTRAL: 'audio-clip',
  MODAL: 'emotion-glyph',
  POSSIBLE: 'branching-tree',
  SEMANTIC: 'embedding-cloud',
  STRUCTURAL: 'graph-svg',
};

export function visualizationManifest(sig: DimensionalSignature): VisualizationManifest {
  const primary = dominantDimension(sig);
  const renderers: VisualizationManifest['renderers'] = [];
  for (const dim of ALL_DIMENSIONS) {
    if (sig.weights[dim] > 0.15) {
      renderers.push({
        dimension: dim,
        weight: sig.weights[dim],
        suggested: DIM_RENDERERS[dim],
      });
    }
  }
  renderers.sort((a, b) => b.weight - a.weight);
  return { primary, renderers };
}

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v));
}

void TAU; // reserved for future angular transforms
