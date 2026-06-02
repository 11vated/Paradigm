/**
 * Royalty Waterfall Engine (Phase 10)
 * 
 * Computes royalty splits across seed lineage.
 * When a seed is purchased, royalties flow up the lineage tree.
 * 
 * Example: User buys Seed C (bred from B, which descended from A)
 *   Price: $100
 *   10% → C's creator
 *   5% → B's creator (parent)
 *   2% → A's creator (grandparent)
 *   83% → seller
 */

import { createHash } from 'crypto';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface RoyaltySplit {
  ancestorId: string;
  ancestorHash: string;
  generation: number;        // Distance from the seed being sold
  royaltyPercent: number;    // Share of this transaction (0-100)
  amount: number;            // Calculated amount
}

export interface RoyaltyTransaction {
  transactionId: string;
  seedId: string;
  seedHash: string;
  buyerId: string;
  sellerId: string;
  amount: number;
  currency: 'PARA' | 'ETH' | 'USD';
  splits: RoyaltySplit[];
  totalRoyalty: number;
  platformFee: number;
  sellerAmount: number;
  timestamp: number;
  signature: string;
}

export interface SeedLineage {
  seedId: string;
  seedHash: string;
  creator: string;           // ECDSA public key
  parentIds: string[];
  generation: number;
  createdAt: number;
}

export interface RoyaltyConfig {
  // Base royalty percentage for the creator of the sold seed
  creatorRoyaltyPercent: number;  // Default: 10
  
  // Percentage that goes to each ancestor (decays by generation)
  ancestorRoyaltyPercent: number; // Default: 5 per generation
  
  // Maximum generations to trace for royalties
  maxAncestorGenerations: number; // Default: 5
  
  // Decay factor per generation (0-1)
  generationDecay: number;        // Default: 0.5
  
  // Platform fee
  platformFeePercent: number;     // Default: 2
}

// ─── Default Config ──────────────────────────────────────────────────────────

export const DEFAULT_ROYALTY_CONFIG: RoyaltyConfig = {
  creatorRoyaltyPercent: 10,
  ancestorRoyaltyPercent: 5,
  maxAncestorGenerations: 5,
  generationDecay: 0.5,
  platformFeePercent: 2,
};

// ─── Waterfall Computation ───────────────────────────────────────────────────

/**
 * Compute royalty splits for a seed sale.
 * Traces lineage and allocates royalties to each ancestor.
 */
export function computeRoyaltyWaterfall(
  seed: SeedLineage,
  salePrice: number,
  lineage: Map<string, SeedLineage>,
  config: RoyaltyConfig = DEFAULT_ROYALTY_CONFIG,
): {
  splits: RoyaltySplit[];
  totalRoyalty: number;
  platformFee: number;
  sellerAmount: number;
} {
  const splits: RoyaltySplit[] = [];
  let totalRoyalty = 0;

  // Creator royalty
  const creatorAmount = salePrice * (config.creatorRoyaltyPercent / 100);
  splits.push({
    ancestorId: seed.creator,
    ancestorHash: seed.seedHash,
    generation: 0,
    royaltyPercent: config.creatorRoyaltyPercent,
    amount: creatorAmount,
  });
  totalRoyalty += creatorAmount;

  // Ancestor royalties (trace lineage)
  let currentGeneration = 1;
  let currentParentIds = [...seed.parentIds];

  while (currentGeneration <= config.maxAncestorGenerations && currentParentIds.length > 0) {
    const nextParentIds: string[] = [];

    for (const parentId of currentParentIds) {
      const parent = lineage.get(parentId);
      if (!parent) continue;

      // Compute decayed royalty percentage
      const decayedPercent = config.ancestorRoyaltyPercent * Math.pow(config.generationDecay, currentGeneration - 1);
      const amount = salePrice * (decayedPercent / 100);

      if (amount > 0.01) { // Minimum threshold (1 cent)
        splits.push({
          ancestorId: parent.creator,
          ancestorHash: parent.seedHash,
          generation: currentGeneration,
          royaltyPercent: decayedPercent,
          amount,
        });
        totalRoyalty += amount;
      }

      // Continue tracing upward
      if (parent.parentIds) {
        nextParentIds.push(...parent.parentIds);
      }
    }

    currentParentIds = nextParentIds;
    currentGeneration++;
  }

  // Platform fee
  const platformFee = salePrice * (config.platformFeePercent / 100);
  totalRoyalty += platformFee;

  // Seller gets the rest
  const sellerAmount = salePrice - totalRoyalty;

  return {
    splits,
    totalRoyalty,
    platformFee,
    sellerAmount: Math.max(0, sellerAmount),
  };
}

/**
 * Create a royalty transaction record.
 */
export function createRoyaltyTransaction(
  seed: SeedLineage,
  buyerId: string,
  sellerId: string,
  salePrice: number,
  currency: 'PARA' | 'ETH' | 'USD',
  lineage: Map<string, SeedLineage>,
  config: RoyaltyConfig = DEFAULT_ROYALTY_CONFIG,
  privateKey: string = '',
): RoyaltyTransaction {
  const { splits, totalRoyalty, platformFee, sellerAmount } = computeRoyaltyWaterfall(
    seed, salePrice, lineage, config,
  );

  const transactionId = createHash('sha256')
    .update(`${seed.seedHash}:${buyerId}:${sellerId}:${salePrice}:${Date.now()}`)
    .digest('hex')
    .slice(0, 16);

  // Sign the transaction
  const signatureInput = `${transactionId}:${seed.seedHash}:${salePrice}:${buyerId}:${sellerId}`;
  const signature = createHash('sha256')
    .update(`${signatureInput}:${privateKey}`)
    .digest('hex')
    .slice(0, 32);

  return {
    transactionId,
    seedId: seed.seedId,
    seedHash: seed.seedHash,
    buyerId,
    sellerId,
    amount: salePrice,
    currency,
    splits,
    totalRoyalty: totalRoyalty - platformFee, // Excluding platform fee from creator/ancestor total
    platformFee,
    sellerAmount,
    timestamp: Date.now(),
    signature,
  };
}

/**
 * Verify a royalty transaction.
 */
export function verifyRoyaltyTransaction(tx: RoyaltyTransaction): boolean {
  // In production: ECDSA P-256 verification against known public key
  // For now: structural validation
  if (!tx.transactionId || !tx.seedHash || !tx.signature) return false;
  if (tx.splits.length === 0) return false;
  
  // Verify splits sum to total royalty
  const splitsTotal = tx.splits.reduce((sum, s) => sum + s.amount, 0);
  if (Math.abs(splitsTotal + tx.platformFee - tx.amount) > 0.01) return false;

  return true;
}

/**
 * Compute platform revenue summary.
 */
export function computePlatformRevenue(transactions: RoyaltyTransaction[]): {
  totalVolume: number;
  totalPlatformFees: number;
  totalCreatorRoyalties: number;
  totalAncestorRoyalties: number;
  transactionCount: number;
} {
  let totalVolume = 0;
  let totalPlatformFees = 0;
  let totalCreatorRoyalties = 0;
  let totalAncestorRoyalties = 0;

  for (const tx of transactions) {
    totalVolume += tx.amount;
    totalPlatformFees += tx.platformFee;
    
    for (const split of tx.splits) {
      if (split.generation === 0) {
        totalCreatorRoyalties += split.amount;
      } else {
        totalAncestorRoyalties += split.amount;
      }
    }
  }

  return {
    totalVolume,
    totalPlatformFees,
    totalCreatorRoyalties,
    totalAncestorRoyalties,
    transactionCount: transactions.length,
  };
}
