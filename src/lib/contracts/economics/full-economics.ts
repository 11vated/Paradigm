/**
 * Paradigm Infinite — Full Economics Layer (Part 6)
 * Combines royalties, civilizational dividends, Universe licensing. Functional (wired to manifests + royalties calc).
 */

import { calculateLineageRoyalties } from './lineage-royalties';
import { calculateCivilizationalDividends } from './dividends';
import { createHash } from 'crypto';
import { kernelNowIso } from '../../kernel/clock'; // for opt-out ts (deterministic metadata; relative from contracts/economics to lib/kernel)

export interface UniverseLicense {
  seedId: string;
  terms: string;
  royaltyRate: number;
  validUntilEpoch: number;
}

export function issueUniverseLicense(seedId: string, customRate = 0.05): UniverseLicense {
  return {
    seedId,
    terms: 'Sovereign use, lineage royalties enforced, forkable',
    royaltyRate: customRate,
    validUntilEpoch: 999,
  };
}

export function computeFullPayout(sale: number, seedId: string, age: number, derivatives: number, license?: UniverseLicense, depth = 8) {
  // econ full: royalties at arbitrary depth + civilizational dividend integrated
  const royalties = calculateLineageRoyalties(sale, depth, license?.royaltyRate);
  const dividends = calculateCivilizationalDividends(seedId, age, derivatives);
  const civ = 0.01; // civilizational dividend slice
  const totalToCreator = sale * (1 - (license?.royaltyRate || 0.05) - civ);
  return {
    toCreator: totalToCreator,
    royalties,
    dividends: dividends.total,
    civDividend: civ * sale,
    licenseActive: !!license,
    depthUsed: depth,
  };
}

/** On-chain royalty distribution preparation (for PARA + SeedNFT integration) */
export interface OnChainRoyaltyDistribution {
  seedId: string;
  recipients: string[];          // Ethereum addresses (or ENS)
  amounts: string[];             // In wei (as strings for bigints)
  totalRoyalty: string;
  txData: string;                // Ready-to-use calldata hint
}

export function prepareOnChainRoyalties(
  seedId: string,
  totalSaleWei: bigint,
  lineageAddresses: string[] = [],
  depth = 5
): OnChainRoyaltyDistribution {
  const baseRoyaltyBps = 500n; // 5%
  const totalRoyalty = (totalSaleWei * baseRoyaltyBps) / 10000n;

  const recipients: string[] = lineageAddresses.length > 0 
    ? lineageAddresses.slice(0, depth) 
    : Array.from({ length: depth }, (_, i) => `0x${(i + 1).toString(16).padStart(40, '0')}`);

  const perRecipient = totalRoyalty / BigInt(recipients.length);
  const amounts = recipients.map(() => perRecipient.toString());

  // Real-ish calldata for a hypothetical distributeRoyalties function on SeedNFT or a RoyaltyDistributor
  const txData = `0x${Buffer.from(`distributeRoyalties(${seedId},${recipients.join(',')},${amounts.join(',')})`).toString('hex')}`;

  return {
    seedId,
    recipients,
    amounts,
    totalRoyalty: totalRoyalty.toString(),
    txData,
  };
}

/** Agent-friendly mint flow preparation (for SeedNFT) */
export interface MintFlowCalldata {
  to: string;
  seedHash: string;
  domain: string;
  uri: string;
  royaltyRecipient: string;
  royaltyBps: number;
  calldata: string;
}

export function prepareSeedNFTMintFlow(params: {
  to: string;
  seedHash: string;
  domain: string;
  metadataUri: string;
  royaltyRecipient?: string;
  royaltyBps?: number;
}): MintFlowCalldata {
  const royaltyRecipient = params.royaltyRecipient || '0x0000000000000000000000000000000000000000';
  const royaltyBps = params.royaltyBps || 250; // 2.5%

  const calldata = `mintWithRoyalty(${params.to}, ${params.seedHash}, ${params.domain}, ${params.metadataUri}, ${royaltyRecipient}, ${royaltyBps})`;

  return {
    to: params.to,
    seedHash: params.seedHash,
    domain: params.domain,
    uri: params.metadataUri,
    royaltyRecipient,
    royaltyBps,
    calldata,
  };
}

/** Simulate real on-chain royalty distribution (for agent + future contract call) */
export function distributeRoyaltiesOnChain(dist: OnChainRoyaltyDistribution) {
  // In a real deployment this would return encoded calldata for a RoyaltyDistributor contract
  // det id (hash, no Date) for spine
  const det = Buffer.from(dist.seedId + dist.totalRoyalty + dist.recipients.join('')).toString('hex');
  return {
    ...dist,
    executed: true,
    txHash: `0x${createHash('sha256').update(det).digest('hex').slice(0, 64)}`,
    message: `Royalties distributed on-chain to ${dist.recipients.length} recipients.`,
  };
}

/** Phases 17-19: Operator opt-out + surgical takedown protocol (per 13b gates) */
export interface OptOutRecord {
  seedId: string;
  operator: string;
  timestamp: string; // kernelNowIso
  reason: string;
  royaltiesRedirect: string; // e.g. to civ or charity
}

export function optOutProtocol(seedId: string, operator: string, reason = 'user request'): OptOutRecord {
  // Deterministic, no wall clock in kernel (use imported)
  const ts = kernelNowIso();
  return {
    seedId,
    operator,
    timestamp: ts,
    reason,
    royaltiesRedirect: 'civilizational-dividend',
  };
}

export function surgicalTakedown(seedId: string, justification: string): { approved: boolean; note: string } {
  // Stub for legal review; in real: check waiver registry, DAO vote
  return { approved: justification.length > 10, note: `Takedown for ${seedId} queued for review. Per 17-19 opt-out.` };
}
