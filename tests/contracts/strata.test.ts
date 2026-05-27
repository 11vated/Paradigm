/**
 * Stratum contract scaffolding tests — Doctrine v2 Part VI / Phase 0.
 *
 * These tests do not yet validate predicate bodies (Phase 3); they prove
 * that the substrate is declared, every stratum has at least one
 * predicate, and reports are well-shaped.
 */
import { describe, it, expect } from 'vitest';
import {
  STRATA,
  STRATUM_CONTRACTS,
  defineStratum,
  todoPredicate,
} from '../../src/lib/contracts';

describe('Doctrine v2 Part VI — Stratum Contracts', () => {
  it('declares all nine canonical strata in doctrinal order', () => {
    expect([...STRATA]).toEqual([
      'form',
      'motion',
      'sound',
      'mind',
      'story',
      'world',
      'field',
      'culture',
      'time',
    ]);
  });

  it('every stratum has a contract registered with at least one predicate', () => {
    for (const id of STRATA) {
      const c = STRATUM_CONTRACTS[id];
      expect(c).toBeDefined();
      expect(c.stratum).toBe(id);
      expect(c.version).toMatch(/^\d+\.\d+\.\d+$/);
      expect(c.predicates.length).toBeGreaterThan(0);
    }
  });

  it('produces a well-shaped Conformance Report (Part VI.10) for any artifact', () => {
    const report = STRATUM_CONTRACTS.form.evaluate({} as unknown);
    expect(report.stratum).toBe('form');
    expect(report.total).toBe(STRATUM_CONTRACTS.form.predicates.length);
    expect(report.results.length).toBe(report.total);
    // Phase 0: predicates are todoPredicate, so all unimplemented.
    expect(report.unimplemented).toBe(report.total);
    expect(report.passes).toBe(0);
    expect(report.fails).toBe(0);
    // Conformance is 0 when no predicate has decided.
    expect(report.conformance).toBe(0);
  });

  it('defineStratum + todoPredicate compose deterministically', () => {
    const c = defineStratum<{ x: number }>('form', '0.0.1', [
      todoPredicate('demo.x', 'demo predicate'),
    ]);
    const r1 = c.evaluate({ x: 1 });
    const r2 = c.evaluate({ x: 1 });
    expect(r1).toEqual(r2);
    expect(r1.results[0].id).toBe('demo.x');
    expect(r1.results[0].result.kind).toBe('unimplemented');
  });
});
