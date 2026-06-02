/**
 * Paradigm Infinite Contracts Bootstrap
 * Call this early (e.g., in server start or kernel init) to ensure all 27 contracts
 * and Part 6 systems are registered and ready.
 */

import { ALL_DOMAIN_CONTRACTS } from './domain-registry';
import '../kernel/quality-contract'; // triggers the bridge

const QC_VERBOSE =
  process.env.PARADIGM_QC_VERBOSE === '1' || process.env.PARADIGM_QC_VERBOSE === 'true';

export function bootstrapParadigmContracts() {
  if (QC_VERBOSE) {
    console.log(`[15_spec] Bootstrapped ${ALL_DOMAIN_CONTRACTS.length} engineering-grade contracts`);
  }
  // In full system: also init OS Shell, physical bridge, etc.
  return { contracts: ALL_DOMAIN_CONTRACTS.length };
}
