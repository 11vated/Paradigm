/**
 * Stratum manifest wiring — Doctrine v2 Part VI.10 / Phase 1.
 *
 * These tests verify the QualityContract → StratumManifest → coverage
 * index pipeline that powers the Substrate Health Dashboard.
 */
import { describe, it, expect } from 'vitest';
import {
  registerContract,
  resolveManifest,
  listStrataDeclarations,
  computeStratumCoverage,
  listContracts,
  type QualityContract,
} from '../../src/lib/kernel/quality-contract';

function makeStubContract(domain: string, strata: ReadonlyArray<'form' | 'motion' | 'sound' | 'mind' | 'story' | 'world' | 'field' | 'culture' | 'time'>, owner?: string): QualityContract<{ id: string }, { ok: boolean }, Record<string, unknown>> {
  return {
    domain,
    version: '0.0.1',
    synthesize: () => ({ ok: true }),
    invert: () => ({}),
    rate: () => ({ score: 1, axes: {} }),
    curated: () => [
      { id: 'a', name: 'A', intent: 't', seed: { id: 'a' } },
      { id: 'b', name: 'B', intent: 't', seed: { id: 'b' } },
      { id: 'c', name: 'C', intent: 't', seed: { id: 'c' } },
    ],
    strata,
    engineOwner: owner,
  };
}

describe('Doctrine v2 Part VI.10 — Stratum Manifest wiring', () => {
  it('resolveManifest prefers the manifest() method over static strata', () => {
    const c: QualityContract<{ id: string }, { ok: boolean }, Record<string, unknown>> = {
      ...makeStubContract('manifest-test-a', ['form', 'motion'] as const, 'Owner-A'),
      manifest: () => ({ strata: ['sound'], engineOwner: 'Override-Owner', doctrineRef: 'VI.3' }),
    };
    const m = resolveManifest(c);
    expect(m.strata).toEqual(['sound']);
    expect(m.engineOwner).toBe('Override-Owner');
    expect(m.doctrineRef).toBe('VI.3');
  });

  it('resolveManifest falls back to static strata', () => {
    const c = makeStubContract('manifest-test-b', ['mind', 'story'] as const, 'Static-Owner');
    const m = resolveManifest(c);
    expect(m.strata).toEqual(['mind', 'story']);
    expect(m.engineOwner).toBe('Static-Owner');
  });

  it('resolveManifest returns empty strata when neither is declared', () => {
    const c: QualityContract<{ id: string }, { ok: boolean }, Record<string, unknown>> = {
      domain: 'manifest-test-c',
      version: '0.0.1',
      synthesize: () => ({ ok: true }),
      invert: () => ({}),
      rate: () => ({ score: 1, axes: {} }),
      curated: () => [
        { id: 'a', name: 'A', intent: 't', seed: { id: 'a' } },
        { id: 'b', name: 'B', intent: 't', seed: { id: 'b' } },
        { id: 'c', name: 'C', intent: 't', seed: { id: 'c' } },
      ],
    };
    const m = resolveManifest(c);
    expect(m.strata).toEqual([]);
  });

  it('listStrataDeclarations and computeStratumCoverage are consistent', () => {
    // The registry is process-wide; register a fresh contract with a
    // unique domain so this test does not depend on other suites.
    const c = makeStubContract('manifest-test-coverage', ['form', 'world'] as const, 'Coverage-Owner');
    registerContract(c);

    const decls = listStrataDeclarations();
    const decl = decls.find((d) => d.domain === 'manifest-test-coverage');
    expect(decl).toBeDefined();
    expect(decl!.strata).toEqual(['form', 'world']);
    expect(decl!.engineOwner).toBe('Coverage-Owner');

    const idx = computeStratumCoverage();
    expect(idx.form.contracts).toContain('manifest-test-coverage');
    expect(idx.world.contracts).toContain('manifest-test-coverage');
    expect(idx.form.count).toBeGreaterThanOrEqual(1);
    expect(idx.world.count).toBeGreaterThanOrEqual(1);
    expect(idx.motion.contracts).not.toContain('manifest-test-coverage');
  });

  it('coverage index has all 9 doctrinal strata as keys', () => {
    const idx = computeStratumCoverage();
    const keys = Object.keys(idx).sort();
    expect(keys).toEqual(['culture', 'field', 'form', 'mind', 'motion', 'sound', 'story', 'time', 'world']);
    for (const k of keys) {
      expect(idx[k as keyof typeof idx]).toHaveProperty('count');
      expect(idx[k as keyof typeof idx]).toHaveProperty('contracts');
    }
  });

  it('every registered contract is listed (even those without strata)', () => {
    const all = listContracts();
    const decls = listStrataDeclarations();
    expect(decls.length).toBe(all.length);
  });
});
