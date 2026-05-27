/**
 * Culture stratum contract — Doctrine v2 Part VI.8 (Phase 3).
 *
 * - Language declared (BCP-47).
 * - Taboo set consistent (no taboo violated by canonical practice).
 * - PolicySeed linkage well-formed (cf. Doctrine XVII.4).
 *
 * Pure / deterministic / IO-free.
 */
import {
  defineStratum,
  todoPredicate,
  type ContractPredicate,
  type PredicateResult,
  type StratumContract,
} from './types';

export interface CultureArtifact {
  /** Declared primary language (BCP-47). */
  readonly language?: string;
  /** Declared taboo identifiers. */
  readonly taboos?: ReadonlyArray<string>;
  /** Canonical practice identifiers produced under this Culture. */
  readonly canonicalPractices?: ReadonlyArray<string>;
  /** Hash of the linked PolicySeed (cf. Doctrine XVII.4). */
  readonly policyHash?: string | null;
  /** Engine-declared verdict on policy applicability. */
  readonly policyApplicable?: boolean;
}

const ABSENT: PredicateResult = {
  kind: 'unimplemented',
  reason: 'Engine has not declared this property on the CultureArtifact.',
};

const BCP47_RE = /^[a-z]{2,3}(-[A-Z][a-zA-Z]{1,3})?(-[A-Z]{2})?$/;

function pred(
  id: string,
  description: string,
  body: (a: CultureArtifact) => PredicateResult,
): ContractPredicate<CultureArtifact> {
  return { id, description, evaluate: body };
}

const languageDeclared = pred(
  'culture.languageDeclared',
  'Primary language declared in BCP-47 form.',
  (a) => {
    if (a.language === undefined) return ABSENT;
    if (typeof a.language !== 'string' || a.language.length === 0) {
      return { kind: 'fail', reason: 'language must be a non-empty string.' };
    }
    return BCP47_RE.test(a.language)
      ? { kind: 'pass' }
      : { kind: 'fail', reason: `language "${a.language}" is not valid BCP-47.` };
  },
);

const tabooConsistency = pred(
  'culture.tabooConsistency',
  'No taboo identifier appears in the canonical practice set.',
  (a) => {
    if (a.taboos === undefined) return ABSENT;
    if (!Array.isArray(a.taboos)) {
      return { kind: 'fail', reason: 'taboos must be an array.' };
    }
    for (const t of a.taboos) {
      if (typeof t !== 'string' || t.length === 0) {
        return { kind: 'fail', reason: `taboo entry ${JSON.stringify(t)} is not a non-empty string.` };
      }
    }
    const tabooSet = new Set(a.taboos);
    if (tabooSet.size !== a.taboos.length) {
      return { kind: 'fail', reason: 'taboos array contains duplicates.' };
    }
    if (a.canonicalPractices === undefined) {
      return {
        kind: 'unimplemented',
        reason: 'taboos declared but canonicalPractices missing; cannot evaluate.',
      };
    }
    for (const p of a.canonicalPractices) {
      if (tabooSet.has(p)) {
        return {
          kind: 'fail',
          reason: `canonical practice "${p}" is also declared as taboo.`,
        };
      }
    }
    return { kind: 'pass' };
  },
);

const policyLinkage = pred(
  'culture.policyLinkage',
  'Linked PolicySeed (if any) is well-formed and applicable.',
  (a) => {
    if (a.policyHash === undefined) return ABSENT;
    if (a.policyHash === null) return { kind: 'pass' };
    if (typeof a.policyHash !== 'string' || a.policyHash.length === 0) {
      return { kind: 'fail', reason: 'policyHash must be a non-empty string.' };
    }
    if (a.policyApplicable === undefined) {
      return {
        kind: 'unimplemented',
        reason: 'policyHash declared but policyApplicable verdict missing.',
      };
    }
    return a.policyApplicable
      ? { kind: 'pass' }
      : { kind: 'fail', reason: 'Engine reports linked PolicySeed not applicable.' };
  },
);

export const cultureContract: StratumContract<CultureArtifact> = defineStratum<CultureArtifact>(
  'culture',
  '0.2.0',
  [languageDeclared, tabooConsistency, policyLinkage],
);
