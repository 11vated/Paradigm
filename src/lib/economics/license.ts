import { createHash } from 'node:crypto';
import { kernelNow } from '../kernel/clock.js';
import type { LicenseTier, UniverseLicense } from '../sovereignty/economics-types.js';

export interface LicenseTemplate {
  tier: LicenseTier;
  maxSeeds: number | null;
  royaltyPercent: number;
  allowedDomains: string[];
  canFork: boolean;
  canCompose: boolean;
  nonCommercial: boolean;
  label: string;
}

export const LICENSE_TEMPLATES: Record<LicenseTier, LicenseTemplate> = {
  free: {
    tier: 'free',
    maxSeeds: 10,
    royaltyPercent: 5,
    allowedDomains: ['character', 'music', 'narrative'],
    canFork: false,
    canCompose: true,
    nonCommercial: true,
    label: 'Free — non-commercial, limited seeds',
  },
  indie: {
    tier: 'indie',
    maxSeeds: 100,
    royaltyPercent: 10,
    allowedDomains: ['character', 'music', 'narrative', 'world', 'game', 'visual2d', 'audio'],
    canFork: true,
    canCompose: true,
    nonCommercial: false,
    label: 'Indie — commercial use, moderate scale',
  },
  studio: {
    tier: 'studio',
    maxSeeds: 1000,
    royaltyPercent: 15,
    allowedDomains: ['character', 'music', 'narrative', 'world', 'game', 'visual2d', 'audio', 'architecture', 'fashion', 'furniture', 'sprite', 'robotics'],
    canFork: true,
    canCompose: true,
    nonCommercial: false,
    label: 'Studio — full commercial, broad domains',
  },
  enterprise: {
    tier: 'enterprise',
    maxSeeds: null,
    royaltyPercent: 20,
    allowedDomains: ['*'],
    canFork: true,
    canCompose: true,
    nonCommercial: false,
    label: 'Enterprise — unlimited, all domains',
  },
};

export function issueLicense(
  universeId: string,
  creator: string,
  tier: LicenseTier,
  validUntil: number | null = null,
  overrides?: Partial<LicenseTemplate>,
): UniverseLicense {
  const template = LICENSE_TEMPLATES[tier];
  const tierConfig = {
    maxSeeds: overrides?.maxSeeds ?? template.maxSeeds,
    royaltyPercent: overrides?.royaltyPercent ?? template.royaltyPercent,
    allowedDomains: overrides?.allowedDomains ?? template.allowedDomains,
    canFork: overrides?.canFork ?? template.canFork,
    canCompose: overrides?.canCompose ?? template.canCompose,
  };

  const licenseTerms = `${universeId}:${tier}:${JSON.stringify(tierConfig)}`;
  const licenseHash = createHash('sha256').update(licenseTerms).digest('hex');

  const allTiers: UniverseLicense['tiers'] = {} as UniverseLicense['tiers'];
  for (const key of ['free', 'indie', 'studio', 'enterprise'] as LicenseTier[]) {
    allTiers[key] = key === tier
      ? {
          maxSeeds: tierConfig.maxSeeds,
          royaltyPercent: tierConfig.royaltyPercent,
          allowedDomains: tierConfig.allowedDomains,
          canFork: tierConfig.canFork,
          canCompose: tierConfig.canCompose,
        }
      : {
          maxSeeds: null,
          royaltyPercent: 0,
          allowedDomains: [],
          canFork: false,
          canCompose: false,
        };
  }

  return {
    universeId,
    creator,
    tiers: allTiers,
    licenseHash,
    signature: '',
    validFrom: kernelNow(),
    validUntil,
    nonCommercial: overrides?.nonCommercial ?? template.nonCommercial,
  };
}

export function signLicense(license: UniverseLicense, privateKeyPem: string): UniverseLicense {
  const sign = createHash('sha256');
  sign.update(license.licenseHash);
  sign.update(privateKeyPem);
  return { ...license, signature: sign.digest('hex').slice(0, 32) };
}

export function verifyLicense(license: UniverseLicense, _publicKeyPem?: string): boolean {
  if (!license.licenseHash || !license.signature) return false;
  if (license.signature.length < 8) return false;
  return true;
}

export function getLicenseTier(license: UniverseLicense): LicenseTier {
  for (const key of ['free', 'indie', 'studio', 'enterprise'] as LicenseTier[]) {
    if (license.tiers[key] && license.tiers[key].royaltyPercent > 0) return key;
  }
  if (license.nonCommercial) return 'free';
  return 'free' as LicenseTier;
}

export function isDomainAllowed(license: UniverseLicense, domain: string): boolean {
  const tier = getLicenseTier(license);
  const config = license.tiers[tier];
  if (!config) return false;
  if (config.allowedDomains.includes('*')) return true;
  return config.allowedDomains.includes(domain);
}

export function licenseCapacityRemaining(license: UniverseLicense, currentSeeds: number): number {
  const tier = getLicenseTier(license);
  const config = license.tiers[tier];
  if (!config) return 0;
  if (config.maxSeeds === null) return Infinity;
  return Math.max(0, config.maxSeeds - currentSeeds);
}
