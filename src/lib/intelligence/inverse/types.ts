/**
 * Inverse Pipeline — artifact → GSPL seed (canon brief 089).
 *
 * Forward direction: agent.run(prompt) → ResolvedIntent → ConstructionPlan → Seed → Artifact.
 * Inverse direction: import any existing artifact and infer the seed that would have produced it.
 *
 * Each domain ships an Inverter that converts (artifact bytes/metadata)
 * into a partial seed (gene values), a confidence estimate per gene, and
 * a residual report describing what the inverter could NOT recover.
 *
 * Three rules:
 *   1. Inverters are pure functions, no LLM, no network. Deterministic.
 *   2. Confidence in [0,1] per gene. The orchestrator may iterate
 *      forward-then-backward to refine low-confidence values.
 *   3. The residual is always explicit — "the audio's reverb has these
 *      parameters; I have no gene for reverb tail length yet" — so we
 *      can grow the gene system instead of silently dropping information.
 */

export type ConfidenceLevel = 'high' | 'medium' | 'low' | 'guess';

export interface InvertedGene {
  /** Dotted gene path, e.g. "music.tempo", "visual.palette.primary" */
  path: string;
  /** Value extracted (number, string, or array) */
  value: number | string | number[] | string[];
  /** 0..1 — how confident the inverter is in this value */
  confidence: number;
  level: ConfidenceLevel;
  /** Human-readable note about how it was derived */
  note?: string;
}

export interface InversionResidual {
  /** Quantity or feature the inverter detected but couldn't map */
  feature: string;
  /** Why it couldn't be mapped: 'no-gene' | 'low-confidence' | 'unsupported' */
  reason: 'no-gene' | 'low-confidence' | 'unsupported';
  /** Optional raw value for downstream curation */
  raw?: unknown;
}

export interface InversionReport {
  domain: string;
  inverterId: string;
  /** Bytes of the source artifact for provenance hashing */
  artifactBytes: number;
  /** Recovered gene values */
  genes: InvertedGene[];
  /** Features the inverter saw but couldn't represent */
  residuals: InversionResidual[];
  /** Aggregate quality: mean of high-confidence gene confidences */
  overallConfidence: number;
  /** Elapsed time in ms */
  elapsedMs: number;
}

export interface Inverter<Artifact = unknown> {
  /** Stable id e.g. "visual2d.palette" or "music.tempo-key-v1" */
  readonly id: string;
  /** Domain the inverter targets */
  readonly domain: string;
  /** Cheap test — returns true if this inverter can process the given artifact */
  accepts(artifact: Artifact): boolean;
  /** Run the inversion */
  invert(artifact: Artifact): Promise<InversionReport>;
}

export interface InverterRegistry {
  register<A>(inverter: Inverter<A>): void;
  get(id: string): Inverter | undefined;
  forDomain(domain: string): Inverter[];
  list(): Inverter[];
}

/** Convert raw confidence number to a discrete level for display. */
export function confidenceLevel(c: number): ConfidenceLevel {
  if (c >= 0.85) return 'high';
  if (c >= 0.6) return 'medium';
  if (c >= 0.35) return 'low';
  return 'guess';
}
