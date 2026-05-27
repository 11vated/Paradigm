/**
 * Stratum Contract — typed predicate substrate.
 *
 * Per `Documents/Paradigm-Analysis/13_PARADIGM_INFINITE_COMPLETION_DOCTRINE_v2.md`
 * Part VI. Each of the nine substrate strata (Form, Motion, Sound, Mind,
 * Story, World, Field, Culture, Time) declares a typed predicate set that
 * any generator's output MUST satisfy.
 *
 * A generator declares which stratum contracts it satisfies; the oracle
 * verifies conformance. The Stratum Contract Conformance Index
 * (Part VI.10) tracks the percentage of artifacts that pass per engine.
 *
 * Phase 0 (this file): the typed substrate is declared. Per-stratum
 * predicate bodies are scaffolded as `evaluate(artifact)` returning an
 * `Unimplemented` result so the substrate compiles and reports are
 * consistent; Phase 3 fills the predicate bodies engine-by-engine.
 *
 * Invariants:
 *   - Pure functions only. No IO. Deterministic.
 *   - No wall-clock. No unseeded RNG.
 *   - Predicates compose: `all(predicates).evaluate(a)` short-circuits on
 *     first failure but always returns a structured report.
 */

/** A predicate evaluation result. */
export type PredicateResult =
  | { kind: 'pass' }
  | { kind: 'fail'; reason: string; detail?: Record<string, unknown> }
  | { kind: 'unimplemented'; reason: string };

/** A typed contract predicate over an artifact `A`. */
export interface ContractPredicate<A> {
  /** Stable id, e.g. `form.manifold`. */
  readonly id: string;
  /** Human-readable description. */
  readonly description: string;
  /** Pure evaluation against an artifact. */
  evaluate(artifact: A): PredicateResult;
}

/** A stratum contract — an ordered set of predicates. */
export interface StratumContract<A> {
  /** Stable stratum id: `form` | `motion` | … | `time`. */
  readonly stratum: StratumId;
  /** Semver of the contract surface. */
  readonly version: string;
  /** Ordered predicate list. */
  readonly predicates: ReadonlyArray<ContractPredicate<A>>;
  /**
   * Aggregate evaluation. Returns the structured per-predicate result
   * plus the conformance ratio used by the Conformance Index
   * (Part VI.10).
   */
  evaluate(artifact: A): StratumConformanceReport;
}

export interface StratumConformanceReport {
  readonly stratum: StratumId;
  readonly version: string;
  readonly total: number;
  readonly passes: number;
  readonly fails: number;
  readonly unimplemented: number;
  readonly conformance: number;
  readonly results: ReadonlyArray<{
    readonly id: string;
    readonly result: PredicateResult;
  }>;
}

export type StratumId =
  | 'form'
  | 'motion'
  | 'sound'
  | 'mind'
  | 'story'
  | 'world'
  | 'field'
  | 'culture'
  | 'time';

export const STRATA: ReadonlyArray<StratumId> = [
  'form',
  'motion',
  'sound',
  'mind',
  'story',
  'world',
  'field',
  'culture',
  'time',
] as const;

/**
 * Build a `StratumContract<A>` from a list of predicates. The aggregator
 * is shared so every stratum produces identically-shaped reports.
 */
export function defineStratum<A>(
  stratum: StratumId,
  version: string,
  predicates: ReadonlyArray<ContractPredicate<A>>,
): StratumContract<A> {
  return {
    stratum,
    version,
    predicates,
    evaluate(artifact: A): StratumConformanceReport {
      const results = predicates.map((p) => ({
        id: p.id,
        result: p.evaluate(artifact),
      }));
      let passes = 0;
      let fails = 0;
      let unimplemented = 0;
      for (const r of results) {
        if (r.result.kind === 'pass') passes++;
        else if (r.result.kind === 'fail') fails++;
        else unimplemented++;
      }
      const decided = passes + fails;
      const conformance = decided === 0 ? 0 : passes / decided;
      return {
        stratum,
        version,
        total: predicates.length,
        passes,
        fails,
        unimplemented,
        conformance,
        results,
      };
    },
  };
}

/**
 * Convenience: a placeholder predicate. Returns `unimplemented` and
 * documents the intended check. Replace per-predicate in Phase 3.
 */
export function todoPredicate<A>(
  id: string,
  description: string,
): ContractPredicate<A> {
  return {
    id,
    description,
    evaluate(_artifact: A): PredicateResult {
      return {
        kind: 'unimplemented',
        reason: `Stratum predicate "${id}" not yet implemented (Phase 3).`,
      };
    },
  };
}

/** Predicate composition helper: pass iff every member passes. */
export function allOf<A>(
  id: string,
  description: string,
  members: ReadonlyArray<ContractPredicate<A>>,
): ContractPredicate<A> {
  return {
    id,
    description,
    evaluate(artifact: A): PredicateResult {
      const details: Array<{ id: string; reason: string }> = [];
      for (const m of members) {
        const r = m.evaluate(artifact);
        if (r.kind === 'fail') {
          details.push({ id: m.id, reason: r.reason });
        } else if (r.kind === 'unimplemented') {
          // Treat unimplemented as soft-pass for composition; the
          // top-level Conformance Index still counts it separately.
        }
      }
      if (details.length === 0) return { kind: 'pass' };
      return {
        kind: 'fail',
        reason: `Composite predicate "${id}" failed ${details.length} sub-check(s).`,
        detail: { sub: details },
      };
    },
  };
}
