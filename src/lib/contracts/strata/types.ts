/**
 * Paradigm Infinite — Nine Strata Type System
 * Engineering Grade v1.0
 */

export type Stratum =
  | 'Form'
  | 'Motion'
  | 'Sound'
  | 'Mind'
  | 'Story'
  | 'World'
  | 'Field'
  | 'Culture'
  | 'Time';

export const ALL_STRATA: Stratum[] = [
  'Form', 'Motion', 'Sound', 'Mind', 'Story', 'World', 'Field', 'Culture', 'Time'
];

export interface StratumManifest {
  id: Stratum;
  glyph: string;
  color: string;
  description: string;
  primaryDomains: string[];
}

/**
 * Base interface that every stratum predicate set must implement.
 */
export interface StratumPredicates<T> {
  readonly stratum: Stratum;

  /**
   * Core quality predicates for this stratum.
   */
  evaluate(artifact: T): StratumScore;

  /**
   * Returns human + machine readable explanation of the score.
   */
  explain(artifact: T): string;
}

export interface StratumScore {
  score: number;           // 0.0 – 1.0
  confidence: number;      // How confident we are in this score
  subscores?: Record<string, number>;
  issues: string[];
}
