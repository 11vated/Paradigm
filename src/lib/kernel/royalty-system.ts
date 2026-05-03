/**
 * Royalty System for .gseed files
 *
 * Defines royalty splits and smart contract interfaces
 * for generative content monetization.
 */

import type { Seed } from '../engines';

/**
 * Royalty split configuration
 */
export interface RoyaltySplit {
  address: string; // Ethereum/Solana address
  percentage: number; // 0-100
  role: 'author' | 'platform' | 'contributor';
}

/**
 * Royalty configuration for a .gseed file
 */
export interface RoyaltyConfig {
  schema: string;
  enabled: boolean;
  primarySplits: RoyaltySplit[]; // On initial sale
  resaleSplits?: RoyaltySplit[]; // On secondary sales
  minimumPrice?: number;
  currency?: string;
  chain: 'ethereum' | 'solana' | 'polygon' | 'base';
}

/**
 * Default royalty config
 */
export function createDefaultRoyaltyConfig(
  authorAddress: string,
  platformAddress: string = '0x0000000000000000000000000000000000000000'
): RoyaltyConfig {
  return {
    schema: 'https://paradigm.ai/schema/gseed-royalty/v1',
    enabled: true,
    primarySplits: [
      { address: authorAddress, percentage: 70, role: 'author' },
      { address: platformAddress, percentage: 30, role: 'platform' },
    ],
    resaleSplits: [
      { address: authorAddress, percentage: 5, role: 'author' },
    ],
    minimumPrice: 0.01,
    currency: 'ETH',
    chain: 'ethereum',
  };
}

/**
 * Validate royalty config
 */
export function validateRoyaltyConfig(config: RoyaltyConfig): boolean {
  // Check total percentages
  const primaryTotal = config.primarySplits.reduce((sum, s) => sum + s.percentage, 0);
  if (Math.abs(primaryTotal - 100) > 0.01) return false;

  if (config.resaleSplits) {
    const resaleTotal = config.resaleSplits.reduce((sum, s) => sum + s.percentage, 0);
    if (resaleTotal > 100) return false;
  }

  // Check addresses (simplified)
  for (const split of config.primarySplits) {
    if (!split.address || split.address.length < 10) return false;
  }

  return true;
}

/**
 * Calculate royalty payment
 */
export function calculateRoyalty(
  config: RoyaltyConfig,
  salePrice: number,
  isResale: boolean = false
): Array<{ address: string; amount: number; role: string }> {
  const splits = isResale && config.resaleSplits
    ? config.resaleSplits
    : config.primarySplits;

  return splits.map(split => ({
    address: split.address,
    amount: (salePrice * split.percentage) / 100,
    role: split.role,
  }));
}

/**
 * EVM Smart Contract ABI (simplified)
 */
export const ROYALTY_ABI = [
  {
    type: 'event',
    name: 'RoyaltyPaid',
    inputs: [
      { name: 'seedHash', type: 'bytes32', indexed: true },
      { name: 'payer', type: 'address', indexed: false },
      { name: 'payee', type: 'address', indexed: false },
      { name: 'amount', type: 'uint256', indexed: false },
      { name: 'role', type: 'string', indexed: false },
    ],
  },
  {
    type: 'function',
    name: 'payRoyalty',
    inputs: [
      { name: 'seedHash', type: 'bytes32' },
    ],
    outputs: [],
    stateMutability: 'payable',
  },
  {
    type: 'function',
    name: 'getRoyaltySplits',
    inputs: [
      { name: 'seedHash', type: 'bytes32' },
    ],
    outputs: [
      { name: 'addresses', type: 'address[]' },
      { name: 'percentages', type: 'uint256[]' },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'registerSeed',
    inputs: [
      { name: 'seedHash', type: 'bytes32' },
      { name: 'config', type: 'tuple', components: [
        { name: 'enabled', type: 'bool' },
        { name: 'primarySplits', type: 'tuple[]', components: [
          { name: 'address', type: 'address' },
          { name: 'percentage', type: 'uint256' },
          { name: 'role', type: 'string' },
        ]},
        { name: 'resaleSplits', type: 'tuple[]', components: [
          { name: 'address', type: 'address' },
          { name: 'percentage', type: 'uint256' },
          { name: 'role', type: 'string' },
        ]},
      ]},
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
] as const;

/**
 * Solana Royalty Instruction (simplified)
 */
export interface SolanaRoyaltyInstruction {
  programId: string;
  instruction: 'register' | 'pay' | 'get_splits';
  seedHash: string;
  config?: RoyaltyConfig;
  amount?: number;
}

/**
 * Create royalty config from seed
 */
export function createRoyaltyFromSeed(
  seed: Seed,
  authorAddress: string
): RoyaltyConfig {
  return createDefaultRoyaltyConfig(authorAddress);
}
