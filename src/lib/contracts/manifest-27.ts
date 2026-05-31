/**
 * Paradigm Infinite — Full 27-Domain Manifest (runtime)
 * Generated from the 15_ spec. Used by health, preflight, and OS Shell.
 */

import { ALL_DOMAIN_CONTRACTS } from './domain-registry';

export interface DomainManifestEntry {
  domain: string;
  strata: string[];
  version: string;
  determinism: string;
}

export function getFull27Manifest(): DomainManifestEntry[] {
  return ALL_DOMAIN_CONTRACTS.map(c => ({
    domain: c.domain,
    strata: c.strata,
    version: c.version,
    determinism: c.determinismLock,
  }));
}

export const TOTAL_DOMAINS = 27;
