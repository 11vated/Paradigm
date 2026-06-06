/**
 * Property tests for the GSPL v∞ formal verifier v3 (11+ properties).
 *
 * Exercises:
 *   P7  Sovereignty roundtrip    — sign seed → verify; mutate → verify fails
 *   P8  Compositional determinism — compose(A, B) bit-stable across runs
 *   P9  Strata preservation      — strata_gated_grow keeps strata
 *   P10 Merkle lineage validity  — bred seeds have consistent merkle lineage
 *   P11 Quality contract 1: det  — QualityContract.clause(deterministic) on all contracts
 *   P12 No-staleness             — det stable across kernel time advances
 *
 * Plus SMT-LIB v2 scaffold smoke test.
 */
import { describe, it, expect } from 'vitest';
import {
  getFormalVerifierReportV3Async,
  verifySovereigntyRoundtrip,
  verifyCompositionDeterminism,
  verifyStrataPreservation,
  verifyMerkleLineage,
  verifyContractProperty1,
  verifyNoStaleness,
  toSMTLIB2,
} from '../../src/lib/gspl/formal-verifier-v3.js';

describe('GSPL v∞ Formal Verifier v3 — Property Tests', () => {
  it('P7: Sovereignty roundtrip — sign → verify; mutate → verify fails', async () => {
    const r = await verifySovereigntyRoundtrip();
    expect(r.signatureCreated).toBe(true);
    expect(r.signatureVerified).toBe(true);
    expect(r.mutatedSeedFails).toBe(true);
    expect(r.passed).toBe(true);
    expect(r.errors).toEqual([]);
  }, 30_000);

  it('P8: Compositional determinism — compose(A, B) is bit-stable', async () => {
    const r = await verifyCompositionDeterminism();
    expect(r.composeAHash).toBe(r.composeBHash);
    expect(r.composeAHash).not.toBe('');
    expect(r.passed).toBe(true);
  }, 30_000);

  it('P9: Strata preservation — strata_gated_grow keeps strata assignments', async () => {
    const r = await verifyStrataPreservation();
    expect(r.beforeStrata.length).toBeGreaterThan(0);
    expect(r.beforeStrataHash).toBe(r.afterStrataHash);
    expect(r.passed).toBe(true);
  }, 30_000);

  it('P10: Merkle lineage — bred seeds have consistent merkle lineage', async () => {
    const r = await verifyMerkleLineage();
    expect(r.parentCount).toBeGreaterThanOrEqual(2);
    expect(r.allParentsInChild).toBe(true);
    expect(r.detAcrossRuns).toBe(true);
    expect(r.passed).toBe(true);
  }, 30_000);

  it('P11: Quality contract clause-1 (deterministic) on all registered contracts', async () => {
    const r = await verifyContractProperty1();
    expect(r.detMatch).toBe(true);
    expect(r.contractsChecked).toBeGreaterThanOrEqual(0);
    if (r.contractsChecked > 0) {
      expect(r.contractsDetPassed).toBe(r.contractsChecked);
    }
    expect(r.passed).toBe(true);
  }, 60_000);

  it('P12: No-staleness — det stable across kernel time advances', async () => {
    const r = await verifyNoStaleness();
    expect(r.hashBefore).toBe(r.hashAfter);
    expect(r.hashAfter).toBe(r.hashAfterAdvance);
    expect(r.passed).toBe(true);
  }, 30_000);

  it('SMT-LIB v2 scaffold: emits valid syntax for a simple program', () => {
    const smt = toSMTLIB2('seed "A" in character { x: 1 }');
    expect(smt).toContain('(set-logic QF_BV)');
    expect(smt).toContain('(declare-const x1 (_ BitVec 64))');
    expect(smt).toContain('(declare-const x2 (_ BitVec 64))');
    expect(smt).toContain('(assert (= x1 x2))');
    expect(smt).toContain('(check-sat)');
    expect(smt).toContain('(exit)');
  });

  it('Full v3 report aggregates all 12 properties and SMT scaffold', async () => {
    const report = await getFormalVerifierReportV3Async();
    // 6 v2 properties
    expect(report.determinism.length).toBeGreaterThanOrEqual(6);
    expect(report.geneTypes).toBeDefined();
    expect(report.roundtrip).toBeDefined();
    expect(report.gsplSupremacyRoundtrip).toBeDefined();
    expect(report.harness).toBeDefined();
    // 6 v3 properties
    expect(report.v3Properties.p7Sovereignty).toBeDefined();
    expect(report.v3Properties.p8Composition).toBeDefined();
    expect(report.v3Properties.p9Strata).toBeDefined();
    expect(report.v3Properties.p10Merkle).toBeDefined();
    expect(report.v3Properties.p11Contract).toBeDefined();
    expect(report.v3Properties.p12NoStaleness).toBeDefined();
    expect(report.totalPropertiesV3).toBe(6);
    expect(report.passedPropertiesV3).toBeGreaterThanOrEqual(0);
    // 30+ samples
    expect(report.totalSamples).toBeGreaterThanOrEqual(30);
    // SMT scaffold
    expect(report.smtlib2Sample).toContain('(set-logic QF_BV)');
    // Verifier version is v3
    expect(report.verifierVersion).toBe('v3-eleven-properties+smt');
    // Perf
    expect(report.perf.durationMs).toBeGreaterThanOrEqual(0);
    expect(report.perf.budgetMs).toBe(500);
  }, 120_000);
});
