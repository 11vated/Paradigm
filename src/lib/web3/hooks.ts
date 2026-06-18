/**
 * Web3 Contract Hooks
 * 
 * Custom React hooks for interacting with Paradigm smart contracts.
 * Provides type-safe interfaces for common contract operations.
 * 
 * Phase 15.4: Contract Interaction Hooks
 * Date: 2026-06-18
 */

import { useState, useEffect, useCallback } from 'react';
import { useWeb3 } from './provider';
import { formatEther, parseEther, formatUnits, parseUnits } from 'ethers';

/**
 * Hook for ParaToken (ERC-20) operations
 */
export function useParaToken() {
  const { paraToken, address, isConnected } = useWeb3();
  const [balance, setBalance] = useState<string>('0');
  const [totalSupply, setTotalSupply] = useState<string>('0');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch balance
  const fetchBalance = useCallback(async () => {
    if (!paraToken || !address) return;
    
    try {
      setLoading(true);
      const bal = await paraToken.balanceOf(address);
      setBalance(formatUnits(bal, 18));
    } catch (err) {
      console.error('Failed to fetch PARA balance:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch balance');
    } finally {
      setLoading(false);
    }
  }, [paraToken, address]);

  // Fetch total supply
  const fetchTotalSupply = useCallback(async () => {
    if (!paraToken) return;
    
    try {
      const supply = await paraToken.totalSupply();
      setTotalSupply(formatUnits(supply, 18));
    } catch (err) {
      console.error('Failed to fetch total supply:', err);
    }
  }, [paraToken]);

  // Transfer tokens
  const transfer = useCallback(async (to: string, amount: string) => {
    if (!paraToken) throw new Error('Contract not initialized');
    
    try {
      setLoading(true);
      setError(null);
      const tx = await paraToken.transfer(to, parseUnits(amount, 18));
      await tx.wait();
      await fetchBalance();
      return tx.hash;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Transfer failed';
      setError(message);
      throw new Error(message);
    } finally {
      setLoading(false);
    }
  }, [paraToken, fetchBalance]);

  // Approve spending
  const approve = useCallback(async (spender: string, amount: string) => {
    if (!paraToken) throw new Error('Contract not initialized');
    
    try {
      setLoading(true);
      setError(null);
      const tx = await paraToken.approve(spender, parseUnits(amount, 18));
      await tx.wait();
      return tx.hash;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Approval failed';
      setError(message);
      throw new Error(message);
    } finally {
      setLoading(false);
    }
  }, [paraToken]);

  // Check allowance
  const getAllowance = useCallback(async (owner: string, spender: string) => {
    if (!paraToken) return '0';
    
    try {
      const allowance = await paraToken.allowance(owner, spender);
      return formatUnits(allowance, 18);
    } catch (err) {
      console.error('Failed to fetch allowance:', err);
      return '0';
    }
  }, [paraToken]);

  useEffect(() => {
    if (isConnected && paraToken && address) {
      fetchBalance();
      fetchTotalSupply();
    }
  }, [isConnected, paraToken, address, fetchBalance, fetchTotalSupply]);

  return {
    balance,
    totalSupply,
    loading,
    error,
    transfer,
    approve,
    getAllowance,
    refresh: fetchBalance,
  };
}

/**
 * Hook for SeedNFT (ERC-721) operations
 */
export function useSeedNFT() {
  const { seedNFT, address, isConnected } = useWeb3();
  const [ownedSeeds, setOwnedSeeds] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch owned seeds
  const fetchOwnedSeeds = useCallback(async () => {
    if (!seedNFT || !address) return;
    
    try {
      setLoading(true);
      const balance = await seedNFT.balanceOf(address);
      const count = Number(balance);
      
      // Note: This is a simplified approach. In production, you'd want
      // to implement proper indexing or use events to track token IDs
      const seeds: number[] = [];
      for (let i = 0; i < Math.min(count, 100); i++) {
        // This would need a proper tokenOfOwnerByIndex function
        // For now, we'll just track the count
      }
      setOwnedSeeds(seeds);
    } catch (err) {
      console.error('Failed to fetch owned seeds:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch seeds');
    } finally {
      setLoading(false);
    }
  }, [seedNFT, address]);

  // Mint a new seed
  const mintSeed = useCallback(async (seedData: string) => {
    if (!seedNFT || !address) throw new Error('Contract not initialized');
    
    try {
      setLoading(true);
      setError(null);
      const tx = await seedNFT.mintSeed(address, seedData);
      const receipt = await tx.wait();
      await fetchOwnedSeeds();
      return { txHash: tx.hash, receipt };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Minting failed';
      setError(message);
      throw new Error(message);
    } finally {
      setLoading(false);
    }
  }, [seedNFT, address, fetchOwnedSeeds]);

  // Transfer seed
  const transferSeed = useCallback(async (to: string, tokenId: number) => {
    if (!seedNFT || !address) throw new Error('Contract not initialized');
    
    try {
      setLoading(true);
      setError(null);
      const tx = await seedNFT.transferFrom(address, to, tokenId);
      await tx.wait();
      await fetchOwnedSeeds();
      return tx.hash;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Transfer failed';
      setError(message);
      throw new Error(message);
    } finally {
      setLoading(false);
    }
  }, [seedNFT, address, fetchOwnedSeeds]);

  // Get seed data
  const getSeedData = useCallback(async (tokenId: number) => {
    if (!seedNFT) throw new Error('Contract not initialized');
    
    try {
      const data = await seedNFT.getSeedData(tokenId);
      return data;
    } catch (err) {
      console.error('Failed to fetch seed data:', err);
      throw err;
    }
  }, [seedNFT]);

  useEffect(() => {
    if (isConnected && seedNFT && address) {
      fetchOwnedSeeds();
    }
  }, [isConnected, seedNFT, address, fetchOwnedSeeds]);

  return {
    ownedSeeds,
    loading,
    error,
    mintSeed,
    transferSeed,
    getSeedData,
    refresh: fetchOwnedSeeds,
  };
}

/**
 * Hook for Marketplace operations
 */
export function useMarketplace() {
  const { marketplace, seedNFT, address, isConnected } = useWeb3();
  const [listings, setListings] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch active listings
  const fetchListings = useCallback(async () => {
    if (!marketplace) return;
    
    try {
      setLoading(true);
      const activeListings = await marketplace.getActiveListings();
      
      // Fetch details for each listing
      const listingDetails = await Promise.all(
        activeListings.map(async (id: bigint) => {
          const listing = await marketplace.getListing(id);
          return {
            id: Number(id),
            seller: listing.seller,
            tokenId: Number(listing.tokenId),
            price: formatEther(listing.price),
            active: listing.active,
          };
        })
      );
      
      setListings(listingDetails);
    } catch (err) {
      console.error('Failed to fetch listings:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch listings');
    } finally {
      setLoading(false);
    }
  }, [marketplace]);

  // List a seed for sale
  const listSeed = useCallback(async (tokenId: number, priceInEth: string) => {
    if (!marketplace || !seedNFT || !address) throw new Error('Contract not initialized');
    
    try {
      setLoading(true);
      setError(null);
      
      // First approve marketplace to transfer the NFT
      const approveTx = await seedNFT.approve(await marketplace.getAddress(), tokenId);
      await approveTx.wait();
      
      // Then list the seed
      const tx = await marketplace.listSeed(tokenId, parseEther(priceInEth));
      await tx.wait();
      await fetchListings();
      return tx.hash;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Listing failed';
      setError(message);
      throw new Error(message);
    } finally {
      setLoading(false);
    }
  }, [marketplace, seedNFT, address, fetchListings]);

  // Delist a seed
  const delistSeed = useCallback(async (listingId: number) => {
    if (!marketplace) throw new Error('Contract not initialized');
    
    try {
      setLoading(true);
      setError(null);
      const tx = await marketplace.delistSeed(listingId);
      await tx.wait();
      await fetchListings();
      return tx.hash;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Delisting failed';
      setError(message);
      throw new Error(message);
    } finally {
      setLoading(false);
    }
  }, [marketplace, fetchListings]);

  // Buy a seed
  const buySeed = useCallback(async (listingId: number, priceInEth: string) => {
    if (!marketplace) throw new Error('Contract not initialized');
    
    try {
      setLoading(true);
      setError(null);
      const tx = await marketplace.buySeed(listingId, { value: parseEther(priceInEth) });
      await tx.wait();
      await fetchListings();
      return tx.hash;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Purchase failed';
      setError(message);
      throw new Error(message);
    } finally {
      setLoading(false);
    }
  }, [marketplace, fetchListings]);

  useEffect(() => {
    if (isConnected && marketplace) {
      fetchListings();
    }
  }, [isConnected, marketplace, fetchListings]);

  return {
    listings,
    loading,
    error,
    listSeed,
    delistSeed,
    buySeed,
    refresh: fetchListings,
  };
}

/**
 * Hook for Governor (DAO) operations
 */
export function useGovernor() {
  const { governor, address, isConnected } = useWeb3();
  const [proposals, setProposals] = useState<any[]>([]);
  const [votingPower, setVotingPower] = useState<string>('0');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch voting power
  const fetchVotingPower = useCallback(async () => {
    if (!governor || !address) return;
    
    try {
      const blockNumber = await governor.runner?.provider?.getBlockNumber();
      if (!blockNumber) return;
      
      const power = await governor.getVotes(address, blockNumber - 1);
      setVotingPower(formatUnits(power, 18));
    } catch (err) {
      console.error('Failed to fetch voting power:', err);
    }
  }, [governor, address]);

  // Create proposal
  const createProposal = useCallback(async (
    targets: string[],
    values: bigint[],
    calldatas: string[],
    description: string
  ) => {
    if (!governor) throw new Error('Contract not initialized');
    
    try {
      setLoading(true);
      setError(null);
      const tx = await governor.propose(targets, values, calldatas, description);
      await tx.wait();
      return tx.hash;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Proposal creation failed';
      setError(message);
      throw new Error(message);
    } finally {
      setLoading(false);
    }
  }, [governor]);

  // Cast vote (0 = Against, 1 = For, 2 = Abstain)
  const castVote = useCallback(async (proposalId: number, support: 0 | 1 | 2, reason?: string) => {
    if (!governor) throw new Error('Contract not initialized');
    
    try {
      setLoading(true);
      setError(null);
      const tx = reason
        ? await governor.castVoteWithReason(proposalId, support, reason)
        : await governor.castVote(proposalId, support);
      await tx.wait();
      return tx.hash;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Voting failed';
      setError(message);
      throw new Error(message);
    } finally {
      setLoading(false);
    }
  }, [governor]);

  useEffect(() => {
    if (isConnected && governor && address) {
      fetchVotingPower();
    }
  }, [isConnected, governor, address, fetchVotingPower]);

  return {
    proposals,
    votingPower,
    loading,
    error,
    createProposal,
    castVote,
    refresh: fetchVotingPower,
  };
}

// Made with Bob
