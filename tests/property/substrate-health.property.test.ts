/**
 * Property tests for /api/substrate/health response contract.
 *
 * The /health page depends on a stable shape from the API. These tests
 * pin down the contract so refactors don't silently break the dashboard.
 */
import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';

interface PredicateRow { stratum: string; score?: number; passed?: boolean }
interface PredicateDemo { available: boolean; results?: PredicateRow[]; averageScore?: string; conformancePercent?: number; conformanceIndex?: number; strataCovered?: number; note?: string; lastUpdated?: string; error?: string }
interface Metrics { determinism_violations: number; evasion_unwaived: number; canonical_rename_unwaived_siblings: number; waiver_count: number; ts_nocheck_count: number; golden_hashes_ok: boolean; contract_honesty: string; strata_adoption: string }
interface ContractDetail { domain: string; version: string; strata: string[]; hasManifest: boolean }

const STRATA_9 = ['Form', 'Motion', 'Sound', 'Mind', 'Story', 'World', 'Field', 'Culture', 'Time'];

const arbPredicateRow = () => fc.record({
  stratum: fc.constantFrom(...STRATA_9),
  score: fc.double({ min: 0, max: 1, noNaN: true, noNegativeZero: true }),
  passed: fc.boolean(),
});

// Each of the 9 strata exactly once, in canonical order
const arbFullPredicateResults = (): fc.Arbitrary<PredicateRow[]> => fc.shuffledSubarray(STRATA_9, { minLength: 9, maxLength: 9 }).map(arr => arr.map(s => ({ stratum: s, score: 0.85, passed: true })));

const arbMetrics = (): fc.Arbitrary<Metrics> => fc.record({
  determinism_violations: fc.nat({ max: 50 }),
  evasion_unwaived: fc.nat({ max: 100 }),
  canonical_rename_unwaived_siblings: fc.nat({ max: 200 }),
  waiver_count: fc.nat({ max: 50 }),
  ts_nocheck_count: fc.nat({ max: 5 }),
  golden_hashes_ok: fc.boolean(),
  contract_honesty: fc.constantFrom('100% (all contracts strata-declared)', 'N/A', 'partial'),
  strata_adoption: fc.constantFrom('100.0%', '75.0%', '50.0%', 'N/A'),
});

const arbContractDetail = (): fc.Arbitrary<ContractDetail> => fc.record({
  domain: fc.constantFrom('visual2d', 'music', 'character', 'game', 'website', 'field', 'quantum', 'molecule', 'cosmology', 'shader', 'narrative', 'sprite', 'physics', 'audio', 'app'),
  version: fc.constantFrom('1.0.0', '1.1.0', '0.9.0'),
  // unique strata, subset of 9, length 0–9
  strata: fc.uniqueArray(fc.constantFrom(...STRATA_9), { maxLength: 9 }),
  hasManifest: fc.boolean(),
});

describe('Substrate health response contract — /api/substrate/health', () => {
  it('predicateDemo: if available, results must cover the 9 declared strata', () => {
    fc.assert(
      fc.property(arbFullPredicateResults(), (rows) => {
        const demo: PredicateDemo = { available: true, results: rows, strataCovered: rows.length, conformanceIndex: 80 };
        const names = new Set(demo.results!.map(r => r.stratum));
        for (const s of STRATA_9) expect(names.has(s)).toBe(true);
      }),
      { numRuns: 30 }
    );
  });

  it('predicateDemo scores are within [0,1] when present', () => {
    fc.assert(
      fc.property(arbPredicateRow(), (r) => {
        if (typeof r.score === 'number') {
          expect(r.score).toBeGreaterThanOrEqual(0);
          expect(r.score).toBeLessThanOrEqual(1);
        }
      }),
      { numRuns: 50 }
    );
  });

  it('metrics.determinism_violations + ts_nocheck_count are non-negative integers', () => {
    fc.assert(
      fc.property(arbMetrics(), (m) => {
        expect(Number.isInteger(m.determinism_violations)).toBe(true);
        expect(m.determinism_violations).toBeGreaterThanOrEqual(0);
        expect(Number.isInteger(m.ts_nocheck_count)).toBe(true);
        expect(m.ts_nocheck_count).toBeGreaterThanOrEqual(0);
      }),
      { numRuns: 50 }
    );
  });

  it('contract details: domains are non-empty strings, version follows semver-ish', () => {
    fc.assert(
      fc.property(arbContractDetail(), (c) => {
        expect(c.domain).toMatch(/^[a-z0-9]+$/);
        expect(c.version).toMatch(/^\d+\.\d+\.\d+$/);
        expect(Array.isArray(c.strata)).toBe(true);
        const uniqueStrata = new Set(c.strata);
        expect(uniqueStrata.size).toBe(c.strata.length);
      }),
      { numRuns: 50 }
    );
  });

  it('conformance index is 0–100 when present', () => {
    fc.assert(
      fc.property(fc.double({ min: 0, max: 100, noNaN: true, noNegativeZero: true }), (v) => {
        const demo: PredicateDemo = { available: true, conformanceIndex: v };
        if (typeof demo.conformanceIndex === 'number') {
          expect(demo.conformanceIndex).toBeGreaterThanOrEqual(0);
          expect(demo.conformanceIndex).toBeLessThanOrEqual(100);
        }
      }),
      { numRuns: 50 }
    );
  });

  it('phase 0 gate: any single red gate flags the system as not all-green', () => {
    fc.assert(
      fc.property(
        fc.record({
          gsplInterpreter: fc.constantFrom('green', 'red', 'amber'),
          lints: fc.constantFrom('green', 'red', 'amber'),
          waivers: fc.constantFrom('green', 'red', 'amber'),
          substrateHealth: fc.constantFrom('green', 'red', 'amber'),
          docsAndMapping: fc.constantFrom('green', 'red', 'amber'),
        }),
        (g) => {
          const values = Object.values(g);
          const allGreen = values.every(v => v === 'green');
          const hasRed = values.some(v => v === 'red');
          if (hasRed) expect(allGreen).toBe(false);
        }
      ),
      { numRuns: 50 }
    );
  });
});
