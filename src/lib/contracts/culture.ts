/**
 * Culture stratum contract — Doctrine v2 Part VI.8.
 *
 * - Language declared and IPA-validated.
 * - Custom set consistent (no taboo violated by canonical practice).
 * - Cross-stratum: art / music / story produced under this Culture pass
 *   the culture's own consistency oracle.
 */
import { defineStratum, todoPredicate, type StratumContract } from './types';

export interface CultureArtifact {
  /** Declared primary language (BCP-47). */
  readonly language?: string;
  /** Declared taboo identifiers. */
  readonly taboos?: ReadonlyArray<string>;
  /** Hash of the linked PolicySeed (cf. Doctrine XVII.4). */
  readonly policyHash?: string | null;
}

export const cultureContract: StratumContract<CultureArtifact> = defineStratum<CultureArtifact>(
  'culture',
  '0.1.0',
  [
    todoPredicate('culture.languageDeclared', 'Primary language declared and IPA-validated.'),
    todoPredicate('culture.tabooConsistency', 'No taboo violated by canonical practice produced under this Culture.'),
    todoPredicate('culture.policyLinkage', 'Linked PolicySeed (if any) is well-formed and applicable.'),
  ],
);
