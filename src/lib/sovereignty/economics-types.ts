/**
 * Economic Substrate Types (Phase 10)
 * 
 * Defines the licensing, royalty, and governance types for Paradigm's
 * economic layer. All types are pure data structures — implementation
 * follows in separate modules.
 */

// ─── Universe Licensing ──────────────────────────────────────────────────────

export type LicenseTier = 'free' | 'indie' | 'studio' | 'enterprise';

export interface UniverseLicense {
  universeId: string;
  creator: string;           // ECDSA public key
  tiers: Record<LicenseTier, {
    maxSeeds: number | null;  // null = unlimited
    royaltyPercent: number;   // 0-100
    allowedDomains: string[];
    canFork: boolean;
    canCompose: boolean;
  }>;
  licenseHash: string;       // SHA-256 of license terms
  signature: string;         // Creator's ECDSA signature
  validFrom: number;         // Timestamp
  validUntil: number | null; // null = perpetual
  nonCommercial: boolean;    // If true, no commercial use
}

// ─── Royalty Waterfall ──────────────────────────────────────────────────────

export interface RoyaltySplit {
  ancestorId: string;
  ancestorHash: string;
  generation: number;        // Distance from original creator
  royaltyPercent: number;    // Share of this transaction
}

export interface RoyaltyTransaction {
  transactionId: string;
  seedId: string;
  seedHash: string;
  buyerId: string;
  sellerId: string;
  amount: number;            // In PARA tokens
  currency: 'PARA' | 'ETH' | 'USD';
  splits: RoyaltySplit[];    // Who gets what
  timestamp: number;
  signature: string;
  onChainTx?: string;        // If settled on-chain
}

export interface RoyaltyLedger {
  transactions: RoyaltyTransaction[];
  totalDistributed: number;
  byCreator: Record<string, number>;  // Creator public key → total earned
  byAncestor: Record<string, number>; // Ancestor ID → total earned
}

// ─── DAO Governance ──────────────────────────────────────────────────────────

export type ProposalType = 
  | 'parameter-change'     // Change stratum thresholds, royalty rates, etc.
  | 'domain-addition'      // Add new domain to the canonical set
  | 'budget-allocation'    // Spend from civilizational dividend
  | 'bug-bounty'           // Fund bug fixes
  | 'feature-request'      // Fund new features
  | 'emergency';           // Emergency actions

export interface Proposal {
  proposalId: string;
  type: ProposalType;
  title: string;
  description: string;
  proposer: string;         // PARA holder address
  votesFor: number;
  votesAgainst: number;
  quorum: number;           // Minimum votes required
  deadline: number;         // Voting deadline
  executed: boolean;
  executionResult?: string;
  signature: string;
}

export interface Vote {
  proposalId: string;
  voter: string;            // PARA holder address
  weight: number;           // PARA tokens staked
  choice: 'for' | 'against' | 'abstain';
  timestamp: number;
  signature: string;
}

// ─── Civilizational Dividend ─────────────────────────────────────────────────

export interface CivilizationalDividend {
  period: string;           // e.g., '2026-Q2'
  totalRoyalties: number;   // Total royalties collected this period
  dividendPool: number;     // Fraction going to civilizational fund
  operators: OperatorShare[];
  distributionDate: number;
  auditable: boolean;
}

export interface OperatorShare {
  operatorId: string;
  contributionScore: number; // Based on seeds created, evolutions, compositions
  sharePercent: number;
  amount: number;
}

// ─── On-Chain Integration ────────────────────────────────────────────────────

export interface OnChainSeed {
  tokenId: number;
  seedHash: string;
  creator: string;
  owner: string;
  license: string;          // License hash
  royaltyRate: number;      // Basis points (100 = 1%)
  lineageDepth: number;
  mintedAt: number;
  lastTransfer: number;
}

export interface OnChainTransaction {
  txHash: string;
  from: string;
  to: string;
  tokenId: number;
  price: number;            // In wei
  royaltyPaid: number;      // In wei
  timestamp: number;
  blockNumber: number;
}

// ─── Marketplace ─────────────────────────────────────────────────────────────

export interface Listing {
  listingId: string;
  seedId: string;
  seedHash: string;
  seller: string;
  price: number;
  currency: 'PARA' | 'ETH';
  license: LicenseTier;
  listedAt: number;
  expiresAt: number | null;
  active: boolean;
}

export interface Purchase {
  purchaseId: string;
  listingId: string;
  buyer: string;
  seller: string;
  seedId: string;
  price: number;
  royaltySplits: RoyaltySplit[];
  timestamp: number;
  completed: boolean;
}

// ─── Economics Summary ───────────────────────────────────────────────────────

export interface EconomicsSummary {
  totalSeedsCreated: number;
  totalSeedsTraded: number;
  totalVolumeTraded: number;
  totalRoyaltiesDistributed: number;
  activeLicenses: number;
  activeProposals: number;
  civilizationalFundBalance: number;
  topCreators: Array<{
    creator: string;
    seedsCreated: number;
    totalEarned: number;
  }>;
}
