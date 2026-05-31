/**
 * Paradigm Infinite Contracts Loader
 * 
 * This is the entry point the rest of the system (engines, health, agent, preflight)
 * should eventually import to get the full set of engineering-grade contracts.
 */

import { ALL_DOMAIN_CONTRACTS, getContractByDomain, getAllDomains } from './domain-registry';

export const ParadigmContracts = {
  all: ALL_DOMAIN_CONTRACTS,
  get: getContractByDomain,
  domains: getAllDomains,
  count: ALL_DOMAIN_CONTRACTS.length,
};

export default ParadigmContracts;
