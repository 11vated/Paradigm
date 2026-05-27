/**
 * Seed license evaluation — Doctrine v2 Part VIII.18 v1.
 *
 * Pure-evaluator tests for the seven canonical license archetypes
 * across the six canonical intended uses.
 */
import { describe, it, expect } from 'vitest';
import {
  buildLicense,
  evaluateLicense,
  isStructurallyValid,
  licenseManifestOf,
  type SeedLicense,
  type IntendedUse,
  type LicenseType,
} from '../../src/lib/kernel/seed-license';

function make(type: LicenseType, extras: Partial<SeedLicense> = {}): SeedLicense {
  const built = buildLicense({
    type,
    version: '1.0.0',
    custodian: '0xCustodian',
    ...extras,
  });
  return built as SeedLicense;
}

describe('Doctrine v2 Part VIII.18 — seed license substrate', () => {
  it('buildLicense produces a self-consistent manifest', () => {
    const l = make('attribution', { attribution: { required: true, canonicalLine: 'by Operator A' } });
    expect(l.manifest).toMatch(/^[0-9a-f]{64}$/);
    expect(isStructurallyValid(l)).toBe(true);
  });

  it('isStructurallyValid catches a tampered license body', () => {
    const l = make('attribution');
    const tampered = { ...l, custodian: '0xAttacker' };
    expect(isStructurallyValid(tampered)).toBe(false);
  });

  it('public-domain: all uses allowed, no requirements, no royalty', () => {
    const l = make('public-domain');
    for (const use of ['view', 'remix', 'commercial-resale', 'redistribute'] as IntendedUse[]) {
      const v = evaluateLicense(l, use);
      expect(v.allowed).toBe(true);
      expect(v.requirements.length).toBe(0);
      expect(v.royaltyBp).toBe(0);
    }
  });

  it('attribution: all uses allowed; attribution requirement included', () => {
    const l = make('attribution', { attribution: { required: true, canonicalLine: 'by A' } });
    const v = evaluateLicense(l, 'remix');
    expect(v.allowed).toBe(true);
    expect(v.requirements.some((r) => /attribution/i.test(r))).toBe(true);
  });

  it('attribution-share-alike: remix forces same license type', () => {
    const l = make('attribution-share-alike', { attribution: { required: true } });
    const remix = evaluateLicense(l, 'remix');
    expect(remix.allowed).toBe(true);
    expect(remix.requirements.some((r) => /share-alike|inherit/i.test(r))).toBe(true);
    const view = evaluateLicense(l, 'view');
    expect(view.allowed).toBe(true);
    expect(view.requirements.some((r) => /share-alike|inherit/i.test(r))).toBe(false);
  });

  it('noncommercial: forbids commercial use', () => {
    const l = make('noncommercial', { attribution: { required: true } });
    expect(evaluateLicense(l, 'view').allowed).toBe(true);
    expect(evaluateLicense(l, 'remix').allowed).toBe(true);
    expect(evaluateLicense(l, 'commercial-display').allowed).toBe(false);
    expect(evaluateLicense(l, 'commercial-resale').allowed).toBe(false);
    expect(evaluateLicense(l, 'commercial-resale').reason).toMatch(/noncommercial/);
  });

  it('commercial-royalty: commercial allowed when royalty paid', () => {
    const l = make('commercial-royalty', { royaltyBp: 750 }); // 7.5%
    const view = evaluateLicense(l, 'view');
    expect(view.allowed).toBe(true);
    expect(view.royaltyBp).toBe(0);

    const resale = evaluateLicense(l, 'commercial-resale');
    expect(resale.allowed).toBe(true);
    expect(resale.royaltyBp).toBe(750);
    expect(resale.requirements.some((r) => /royalty/i.test(r))).toBe(true);
  });

  it('all-rights-reserved: only view + redistribute permitted', () => {
    const l = make('all-rights-reserved', { attribution: { required: true } });
    expect(evaluateLicense(l, 'view').allowed).toBe(true);
    expect(evaluateLicense(l, 'redistribute').allowed).toBe(true);
    expect(evaluateLicense(l, 'remix').allowed).toBe(false);
    expect(evaluateLicense(l, 'commercial-resale').allowed).toBe(false);
  });

  it('custom: default-denies unless terms are empty', () => {
    const l1 = make('custom', { terms: 'must include logo with permission' });
    expect(evaluateLicense(l1, 'view').allowed).toBe(false);
    expect(evaluateLicense(l1, 'view').reason).toMatch(/custom/);

    const l2 = make('custom', { terms: '' });
    expect(evaluateLicense(l2, 'commercial-resale').allowed).toBe(true);
  });

  it('expires: an expired license denies everything', () => {
    const l = make('public-domain', { expires: '2020-01-01T00:00:00.000Z' });
    const v = evaluateLicense(l, 'view', { now: '2026-05-27T00:00:00.000Z' });
    expect(v.allowed).toBe(false);
    expect(v.reason).toMatch(/expired/);
  });

  it('expires: a future expiry still permits use today', () => {
    const l = make('public-domain', { expires: '2099-01-01T00:00:00.000Z' });
    const v = evaluateLicense(l, 'view', { now: '2026-05-27T00:00:00.000Z' });
    expect(v.allowed).toBe(true);
  });

  it('manifest is deterministic across identical inputs', () => {
    const make1 = buildLicense({
      type: 'commercial-royalty', version: '1.0.0', custodian: '0xX',
      royaltyBp: 1000, attribution: { required: true, canonicalLine: 'X' },
    });
    const make2 = buildLicense({
      type: 'commercial-royalty', version: '1.0.0', custodian: '0xX',
      royaltyBp: 1000, attribution: { required: true, canonicalLine: 'X' },
    });
    expect(make1.manifest).toBe(make2.manifest);
  });

  it('manifest changes when any field changes', () => {
    const a = buildLicense({ type: 'attribution', version: '1.0.0', custodian: '0xA' });
    const b = buildLicense({ type: 'attribution', version: '1.0.0', custodian: '0xB' });
    expect(a.manifest).not.toBe(b.manifest);
  });

  it('royaltyBp clamps to 0..10000', () => {
    const l = make('commercial-royalty', { royaltyBp: 99_999 });
    const v = evaluateLicense(l, 'commercial-resale');
    expect(v.royaltyBp).toBe(10_000);
  });

  it('manifest function is pure (no side effects)', () => {
    const body = { schema: 'https://paradigm.ai/schema/seed-license/v1' as const, type: 'attribution' as LicenseType, version: '1.0.0', custodian: '0xX' };
    const h1 = licenseManifestOf(body);
    const h2 = licenseManifestOf(body);
    expect(h1).toBe(h2);
  });
});
