/**
 * Multi-Chain Support — Phase 14
 * 
 * Deploy Paradigm seeds to multiple blockchains:
 * - Ethereum mainnet (high-value seeds)
 * - Polygon L2 (low-cost, high-volume)
 * - Arbitrum (fast finality)
 * - Base (Coinbase L2)
 * 
 * Each chain gets the same seed NFT, but with chain-specific optimizations.
 */

// ─── Types ───────────────────────────────────────────────────────────────────

export type ChainId = 1 | 137 | 42161 | 8453;

export interface ChainConfig {
  chainId: ChainId;
  name: string;
  rpcUrl: string;
  explorerUrl: string;
  nativeCurrency: string;
  blockTime: number;        // seconds
  gasPrice: number;         // gwei average
  contractAddress: string;
  confirmations: number;    // required for finality
}

export interface CrossChainSeed {
  seedHash: string;
  chains: Array<{
    chainId: ChainId;
    tokenId: number;
    txHash: string;
    blockNumber: number;
    timestamp: number;
    gasUsed: number;
  }>;
  primaryChain: ChainId;
  createdAt: number;
}

// ─── Chain Configurations ────────────────────────────────────────────────────

export const CHAIN_CONFIGS: Record<ChainId, ChainConfig> = {
  1: {
    chainId: 1,
    name: 'Ethereum',
    rpcUrl: 'https://eth.llamarpc.com',
    explorerUrl: 'https://etherscan.io',
    nativeCurrency: 'ETH',
    blockTime: 12,
    gasPrice: 20,
    contractAddress: '0x0000000000000000000000000000000000000000', // Placeholder
    confirmations: 12,
  },
  137: {
    chainId: 137,
    name: 'Polygon',
    rpcUrl: 'https://polygon-rpc.com',
    explorerUrl: 'https://polygonscan.com',
    nativeCurrency: 'MATIC',
    blockTime: 2,
    gasPrice: 30,
    contractAddress: '0x0000000000000000000000000000000000000000',
    confirmations: 30,
  },
  42161: {
    chainId: 42161,
    name: 'Arbitrum',
    rpcUrl: 'https://arb1.arbitrum.io/rpc',
    explorerUrl: 'https://arbiscan.io',
    nativeCurrency: 'ETH',
    blockTime: 0.25,
    gasPrice: 0.1,
    contractAddress: '0x0000000000000000000000000000000000000000',
    confirmations: 1,
  },
  8453: {
    chainId: 8453,
    name: 'Base',
    rpcUrl: 'https://mainnet.base.org',
    explorerUrl: 'https://basescan.org',
    nativeCurrency: 'ETH',
    blockTime: 2,
    gasPrice: 0.01,
    contractAddress: '0x0000000000000000000000000000000000000000',
    confirmations: 1,
  },
};

// ─── Cross-Chain Manager ────────────────────────────────────────────────────

export class CrossChainManager {
  private seeds: Map<string, CrossChainSeed> = new Map();

  /**
   * Register a seed on a specific chain.
   */
  registerOnChain(
    seedHash: string,
    chainId: ChainId,
    txHash: string,
    tokenId: number,
    blockNumber: number,
    gasUsed: number,
  ): void {
    const existing = this.seeds.get(seedHash);
    const chainEntry = {
      chainId,
      tokenId,
      txHash,
      blockNumber,
      timestamp: Date.now(),
      gasUsed,
    };

    if (existing) {
      existing.chains.push(chainEntry);
    } else {
      this.seeds.set(seedHash, {
        seedHash,
        chains: [chainEntry],
        primaryChain: chainId,
        createdAt: Date.now(),
      });
    }
  }

  /**
   * Get all chains a seed is deployed on.
   */
  getChains(seedHash: string): ChainId[] {
    const seed = this.seeds.get(seedHash);
    return seed ? seed.chains.map(c => c.chainId) : [];
  }

  /**
   * Get the cheapest chain for a new deployment.
   */
  getCheapestChain(): ChainConfig {
    return Object.values(CHAIN_CONFIGS).sort((a, b) => a.gasPrice - b.gasPrice)[0];
  }

  /**
   * Get chain info for a seed.
   */
  getSeedInfo(seedHash: string): CrossChainSeed | undefined {
    return this.seeds.get(seedHash);
  }
}
