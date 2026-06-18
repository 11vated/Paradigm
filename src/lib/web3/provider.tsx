/**
 * Web3 Provider Context
 * 
 * Provides Web3 connection state and contract instances using ethers.js v6.
 * Manages wallet connection, network switching, and contract initialization.
 * 
 * Phase 15.2: Web3 Provider Infrastructure
 * Date: 2026-06-18
 */

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { BrowserProvider, Contract, JsonRpcSigner, Network } from 'ethers';
import { getContractAddress, getNetworkConfig, isSupportedChain, SUPPORTED_CHAINS } from './contracts';
import { ParaTokenABI, SeedNFTABI, MarketplaceABI, GovernorABI } from './abis';

export interface Web3State {
  // Connection state
  isConnected: boolean;
  isConnecting: boolean;
  address: string | null;
  chainId: number | null;
  balance: string | null;
  
  // Provider and signer
  provider: BrowserProvider | null;
  signer: JsonRpcSigner | null;
  
  // Contract instances
  paraToken: Contract | null;
  seedNFT: Contract | null;
  marketplace: Contract | null;
  governor: Contract | null;
  
  // Actions
  connect: () => Promise<void>;
  disconnect: () => void;
  switchNetwork: (chainId: number) => Promise<void>;
  
  // Error state
  error: string | null;
}

const Web3Context = createContext<Web3State | null>(null);

export function useWeb3() {
  const context = useContext(Web3Context);
  if (!context) {
    throw new Error('useWeb3 must be used within Web3Provider');
  }
  return context;
}

interface Web3ProviderProps {
  children: ReactNode;
}

export function Web3Provider({ children }: Web3ProviderProps) {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [address, setAddress] = useState<string | null>(null);
  const [chainId, setChainId] = useState<number | null>(null);
  const [balance, setBalance] = useState<string | null>(null);
  const [provider, setProvider] = useState<BrowserProvider | null>(null);
  const [signer, setSigner] = useState<JsonRpcSigner | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Contract instances
  const [paraToken, setParaToken] = useState<Contract | null>(null);
  const [seedNFT, setSeedNFT] = useState<Contract | null>(null);
  const [marketplace, setMarketplace] = useState<Contract | null>(null);
  const [governor, setGovernor] = useState<Contract | null>(null);

  // Initialize contracts when signer and chainId change
  useEffect(() => {
    if (!signer || !chainId) {
      setParaToken(null);
      setSeedNFT(null);
      setMarketplace(null);
      setGovernor(null);
      return;
    }

    try {
      const paraTokenAddress = getContractAddress('ParaToken', chainId);
      const seedNFTAddress = getContractAddress('SeedNFT', chainId);
      const marketplaceAddress = getContractAddress('ParadigmMarketplace', chainId);
      const governorAddress = getContractAddress('ParadigmGovernor', chainId);

      if (paraTokenAddress) {
        setParaToken(new Contract(paraTokenAddress, ParaTokenABI, signer));
      }
      if (seedNFTAddress) {
        setSeedNFT(new Contract(seedNFTAddress, SeedNFTABI, signer));
      }
      if (marketplaceAddress) {
        setMarketplace(new Contract(marketplaceAddress, MarketplaceABI, signer));
      }
      if (governorAddress) {
        setGovernor(new Contract(governorAddress, GovernorABI, signer));
      }
    } catch (err) {
      console.error('Failed to initialize contracts:', err);
      setError(err instanceof Error ? err.message : 'Failed to initialize contracts');
    }
  }, [signer, chainId]);

  // Update balance when address or chainId changes
  useEffect(() => {
    if (!provider || !address) {
      setBalance(null);
      return;
    }

    let cancelled = false;

    async function fetchBalance() {
      try {
        if (!provider || !address || cancelled) return;
        const bal = await provider.getBalance(address);
        if (!cancelled) {
          setBalance(bal.toString());
        }
      } catch (err) {
        console.error('Failed to fetch balance:', err);
      }
    }

    fetchBalance();
    const interval = setInterval(fetchBalance, 10000); // Update every 10s

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [provider, address, chainId]);

  // Connect to wallet
  const connect = useCallback(async () => {
    if (typeof window.ethereum === 'undefined') {
      setError('MetaMask is not installed. Please install MetaMask to continue.');
      return;
    }

    setIsConnecting(true);
    setError(null);

    try {
      // Request account access
      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts',
      });

      if (accounts.length === 0) {
        throw new Error('No accounts found');
      }

      // Create provider and signer
      const browserProvider = new BrowserProvider(window.ethereum);
      const network = await browserProvider.getNetwork();
      const signerInstance = await browserProvider.getSigner();

      setProvider(browserProvider);
      setSigner(signerInstance);
      setAddress(accounts[0]);
      setChainId(Number(network.chainId));
      setIsConnected(true);

      // Check if network is supported
      if (!isSupportedChain(Number(network.chainId))) {
        setError(`Unsupported network. Please switch to one of: ${SUPPORTED_CHAINS.map((c) => c.name).join(', ')}`);
      }
    } catch (err) {
      console.error('Failed to connect wallet:', err);
      setError(err instanceof Error ? err.message : 'Failed to connect wallet');
      setIsConnected(false);
    } finally {
      setIsConnecting(false);
    }
  }, []);

  // Disconnect wallet
  const disconnect = useCallback(() => {
    setProvider(null);
    setSigner(null);
    setAddress(null);
    setChainId(null);
    setBalance(null);
    setIsConnected(false);
    setParaToken(null);
    setSeedNFT(null);
    setMarketplace(null);
    setGovernor(null);
    setError(null);
  }, []);

  // Switch network
  const switchNetwork = useCallback(async (targetChainId: number) => {
    if (typeof window.ethereum === 'undefined') {
      setError('MetaMask is not installed');
      return;
    }

    const networkConfig = getNetworkConfig(targetChainId);
    if (!networkConfig) {
      setError('Unsupported network');
      return;
    }

    try {
      // Try to switch to the network
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: `0x${targetChainId.toString(16)}` }],
      });
    } catch (switchError: any) {
      // This error code indicates that the chain has not been added to MetaMask
      if (switchError.code === 4902) {
        try {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [
              {
                chainId: `0x${targetChainId.toString(16)}`,
                chainName: networkConfig.name,
                nativeCurrency: networkConfig.nativeCurrency,
                rpcUrls: networkConfig.rpcUrls,
                blockExplorerUrls: networkConfig.blockExplorerUrls,
              },
            ],
          });
        } catch (addError) {
          console.error('Failed to add network:', addError);
          setError(addError instanceof Error ? addError.message : 'Failed to add network');
        }
      } else {
        console.error('Failed to switch network:', switchError);
        setError(switchError instanceof Error ? switchError.message : 'Failed to switch network');
      }
    }
  }, []);

  // Listen for account changes
  useEffect(() => {
    if (typeof window.ethereum === 'undefined') return;

    const handleAccountsChanged = (accounts: string[]) => {
      if (accounts.length === 0) {
        disconnect();
      } else {
        setAddress(accounts[0]);
      }
    };

    const handleChainChanged = (chainIdHex: string) => {
      const newChainId = parseInt(chainIdHex, 16);
      setChainId(newChainId);
      
      if (!isSupportedChain(newChainId)) {
        setError(`Unsupported network. Please switch to one of: ${SUPPORTED_CHAINS.map((c) => c.name).join(', ')}`);
      } else {
        setError(null);
      }
    };

    window.ethereum.on('accountsChanged', handleAccountsChanged);
    window.ethereum.on('chainChanged', handleChainChanged);

    return () => {
      window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
      window.ethereum.removeListener('chainChanged', handleChainChanged);
    };
  }, [disconnect]);

  // Auto-connect if previously connected
  useEffect(() => {
    if (typeof window.ethereum === 'undefined') return;

    async function checkConnection() {
      try {
        const accounts = await window.ethereum.request({
          method: 'eth_accounts',
        });

        if (accounts.length > 0) {
          await connect();
        }
      } catch (err) {
        console.error('Failed to check connection:', err);
      }
    }

    checkConnection();
  }, [connect]);

  const value: Web3State = {
    isConnected,
    isConnecting,
    address,
    chainId,
    balance,
    provider,
    signer,
    paraToken,
    seedNFT,
    marketplace,
    governor,
    connect,
    disconnect,
    switchNetwork,
    error,
  };

  return <Web3Context.Provider value={value}>{children}</Web3Context.Provider>;
}

// Type augmentation for window.ethereum
declare global {
  interface Window {
    ethereum?: any;
  }
}

// Made with Bob
