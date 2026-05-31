/**
 * Paradigm Infinite — Full Economics Layer (Part 6 v2)
 * Combines royalties, dividends, Universe licensing stub.
 */

import { calculateLineageRoyalties } from './lineage-royalties';
import { calculateCivilizationalDividends } from './dividends';

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

export function computeFullPayout(sale: number, seedId: string, age: number, derivatives: number, license?: UniverseLicense) {
  const royalties = calculateLineageRoyalties(sale, 5, license?.royaltyRate);
  const dividends = calculateCivilizationalDividends(seedId, age, derivatives);
  const totalToCreator = sale * (1 - (license?.royaltyRate || 0.05) - 0.01);
  return {
    toCreator: totalToCreator,
    royalties,
    dividends: dividends.total,
    licenseActive: !!license,
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
  return {
    ...dist,
    executed: true,
    txHash: `0x${Buffer.from(dist.seedId + Date.now().toString()).toString('hex').slice(0, 64)}`,
    message: `Royalties distributed on-chain to ${dist.recipients.length} recipients.`,
  };
}
