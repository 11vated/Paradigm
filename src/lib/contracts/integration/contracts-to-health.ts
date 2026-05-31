/**
 * Direct integration point for new engineering contracts into existing health surfaces.
 * This module can be imported by server/routes/substrate-health.ts and scripts/preflight-report.ts
 */

import { generateNewContractHealth } from './preflight-bridge';
import { ALL_DOMAIN_CONTRACTS } from '../domain-registry';

export function getContractsHealthContribution() {
  const health = generateNewContractHealth();
  return {
    newEngineeringContracts: {
      implemented: ALL_DOMAIN_CONTRACTS.length,
      target: 27,
      averageQualityScore: health.averageScore,
      epoch2Ready: health.epoch2ReadyDomains.length,
      details: health,
    },
  };
}
