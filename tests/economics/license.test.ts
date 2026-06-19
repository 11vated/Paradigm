import { describe, it, expect } from 'vitest';
import { LICENSE_TEMPLATES, issueLicense, signLicense, verifyLicense, isDomainAllowed, licenseCapacityRemaining } from '../../src/lib/economics/license';

describe('LICENSE_TEMPLATES', () => {
  it('defines all four tiers', () => {
    expect(Object.keys(LICENSE_TEMPLATES)).toEqual(['free', 'indie', 'studio', 'enterprise']);
  });

  it('enterprise has unlimited seeds', () => {
    expect(LICENSE_TEMPLATES.enterprise.maxSeeds).toBeNull();
  });

  it('free is non-commercial', () => {
    expect(LICENSE_TEMPLATES.free.nonCommercial).toBe(true);
  });
});

describe('issueLicense', () => {
  it('creates a free tier license', () => {
    const lic = issueLicense('universe-1', 'creator-a', 'free');
    expect(lic.universeId).toBe('universe-1');
    expect(lic.creator).toBe('creator-a');
    expect(lic.tiers['free'].maxSeeds).toBe(10);
    expect(lic.licenseHash).toBeTruthy();
  });

  it('creates an enterprise tier license', () => {
    const lic = issueLicense('universe-2', 'creator-b', 'enterprise');
    expect(lic.tiers['enterprise'].maxSeeds).toBeNull();
    expect(lic.tiers['enterprise'].allowedDomains).toEqual(['*']);
  });

  it('accepts overrides for tier fields', () => {
    const lic = issueLicense('u', 'c', 'indie', null, { maxSeeds: 50, royaltyPercent: 8 });
    expect(lic.tiers['indie'].maxSeeds).toBe(50);
    expect(lic.tiers['indie'].royaltyPercent).toBe(8);
  });
});

describe('signLicense and verifyLicense', () => {
  it('signs and verifies a license', () => {
    const lic = issueLicense('u', 'c', 'indie');
    const signed = signLicense(lic, 'private-key-123');
    expect(signed.signature).toBeTruthy();
    expect(verifyLicense(signed)).toBe(true);
  });

  it('rejects unsigned license', () => {
    const lic = issueLicense('u', 'c', 'free');
    expect(verifyLicense(lic)).toBe(false);
  });

  it('rejects empty license', () => {
    expect(verifyLicense({} as any)).toBe(false);
  });
});

describe('isDomainAllowed', () => {
  it('allows configured domains', () => {
    const lic = issueLicense('u', 'c', 'indie');
    expect(isDomainAllowed(lic, 'character')).toBe(true);
    expect(isDomainAllowed(lic, 'robotics')).toBe(false);
  });

  it('enterprise allows all domains', () => {
    const lic = issueLicense('u', 'c', 'enterprise');
    expect(isDomainAllowed(lic, 'quantum')).toBe(true);
  });
});

describe('licenseCapacityRemaining', () => {
  it('returns remaining capacity', () => {
    const lic = issueLicense('u', 'c', 'free');
    expect(licenseCapacityRemaining(lic, 3)).toBe(7);
  });

  it('returns Infinity for enterprise', () => {
    const lic = issueLicense('u', 'c', 'enterprise');
    expect(licenseCapacityRemaining(lic, 9999)).toBe(Infinity);
  });

  it('returns 0 when at capacity', () => {
    const lic = issueLicense('u', 'c', 'free');
    expect(licenseCapacityRemaining(lic, 10)).toBe(0);
  });
});
