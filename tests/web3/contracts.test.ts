/**
 * Web3 Contracts Configuration Tests
 * 
 * Tests for smart contract configuration, network management, and address validation
 * Covers all supported networks and utility functions
 */

import { describe, it, expect } from 'vitest';
import {
  NETWORKS,
  SUPPORTED_CHAIN_IDS,
  SUPPORTED_CHAINS,
  DEFAULT_CHAIN_ID,
  getNetworkConfig,
  getContractAddresses,
  validateContractAddresses,
  getTransactionUrl,
  getAddressUrl,
  getTokenUrl,
  isSupportedChain,
  getContractAddress,
  type ContractAddresses,
  type NetworkConfig,
} from '../../src/lib/web3/contracts.js';

describe('Web3 Contracts Configuration', () => {
  describe('Network Configurations', () => {
    it('defines all required networks', () => {
      expect(NETWORKS).toBeTruthy();
      expect(NETWORKS.localhost).toBeTruthy();
      expect(NETWORKS.sepolia).toBeTruthy();
      expect(NETWORKS.mumbai).toBeTruthy();
      expect(NETWORKS.mainnet).toBeTruthy();
      expect(NETWORKS.polygon).toBeTruthy();
    });

    it('localhost network has correct configuration', () => {
      const localhost = NETWORKS.localhost;
      
      expect(localhost.chainId).toBe(31337);
      expect(localhost.name).toBe('Localhost');
      expect(localhost.rpcUrl).toBe('http://127.0.0.1:8545');
      expect(localhost.nativeCurrency.symbol).toBe('ETH');
      expect(localhost.nativeCurrency.decimals).toBe(18);
      expect(localhost.contracts).toBeTruthy();
    });

    it('sepolia network has correct configuration', () => {
      const sepolia = NETWORKS.sepolia;
      
      expect(sepolia.chainId).toBe(11155111);
      expect(sepolia.name).toBe('Sepolia');
      expect(sepolia.blockExplorer).toBe('https://sepolia.etherscan.io');
      expect(sepolia.nativeCurrency.symbol).toBe('ETH');
      expect(sepolia.contracts).toBeTruthy();
    });

    it('mumbai network has correct configuration', () => {
      const mumbai = NETWORKS.mumbai;
      
      expect(mumbai.chainId).toBe(80001);
      expect(mumbai.name).toBe('Mumbai');
      expect(mumbai.blockExplorer).toBe('https://mumbai.polygonscan.com');
      expect(mumbai.nativeCurrency.symbol).toBe('MATIC');
      expect(mumbai.contracts).toBeTruthy();
    });

    it('mainnet network has correct configuration', () => {
      const mainnet = NETWORKS.mainnet;
      
      expect(mainnet.chainId).toBe(1);
      expect(mainnet.name).toBe('Ethereum');
      expect(mainnet.blockExplorer).toBe('https://etherscan.io');
      expect(mainnet.nativeCurrency.symbol).toBe('ETH');
      expect(mainnet.contracts).toBeTruthy();
    });

    it('polygon network has correct configuration', () => {
      const polygon = NETWORKS.polygon;
      
      expect(polygon.chainId).toBe(137);
      expect(polygon.name).toBe('Polygon');
      expect(polygon.blockExplorer).toBe('https://polygonscan.com');
      expect(polygon.nativeCurrency.symbol).toBe('MATIC');
      expect(polygon.contracts).toBeTruthy();
    });

    it('all networks have required contract addresses', () => {
      Object.values(NETWORKS).forEach(network => {
        expect(network.contracts.ParaToken).toBeDefined();
        expect(network.contracts.ParadigmTimelock).toBeDefined();
        expect(network.contracts.ParadigmGovernor).toBeDefined();
        expect(network.contracts.SeedNFT).toBeDefined();
        expect(network.contracts.ParadigmMarketplace).toBeDefined();
      });
    });

    it('all networks have RPC URLs array', () => {
      Object.values(NETWORKS).forEach(network => {
        expect(Array.isArray(network.rpcUrls)).toBe(true);
        expect(network.rpcUrls.length).toBeGreaterThan(0);
      });
    });

    it('all networks have block explorer URLs array', () => {
      Object.values(NETWORKS).forEach(network => {
        expect(Array.isArray(network.blockExplorerUrls)).toBe(true);
      });
    });
  });

  describe('getNetworkConfig', () => {
    it('returns correct network for localhost chain ID', () => {
      const config = getNetworkConfig(31337);
      
      expect(config).toBeTruthy();
      expect(config?.name).toBe('Localhost');
      expect(config?.chainId).toBe(31337);
    });

    it('returns correct network for Sepolia chain ID', () => {
      const config = getNetworkConfig(11155111);
      
      expect(config).toBeTruthy();
      expect(config?.name).toBe('Sepolia');
      expect(config?.chainId).toBe(11155111);
    });

    it('returns correct network for Mumbai chain ID', () => {
      const config = getNetworkConfig(80001);
      
      expect(config).toBeTruthy();
      expect(config?.name).toBe('Mumbai');
      expect(config?.chainId).toBe(80001);
    });

    it('returns correct network for Ethereum mainnet chain ID', () => {
      const config = getNetworkConfig(1);
      
      expect(config).toBeTruthy();
      expect(config?.name).toBe('Ethereum');
      expect(config?.chainId).toBe(1);
    });

    it('returns correct network for Polygon mainnet chain ID', () => {
      const config = getNetworkConfig(137);
      
      expect(config).toBeTruthy();
      expect(config?.name).toBe('Polygon');
      expect(config?.chainId).toBe(137);
    });

    it('returns undefined for unsupported chain ID', () => {
      const config = getNetworkConfig(999999);
      
      expect(config).toBeUndefined();
    });

    it('returns undefined for negative chain ID', () => {
      const config = getNetworkConfig(-1);
      
      expect(config).toBeUndefined();
    });
  });

  describe('getContractAddresses', () => {
    it('returns contract addresses for valid chain ID', () => {
      const addresses = getContractAddresses(31337);
      
      expect(addresses).toBeTruthy();
      expect(addresses).toHaveProperty('ParaToken');
      expect(addresses).toHaveProperty('SeedNFT');
      expect(addresses).toHaveProperty('ParadigmMarketplace');
    });

    it('returns undefined for invalid chain ID', () => {
      const addresses = getContractAddresses(999999);
      
      expect(addresses).toBeUndefined();
    });

    it('returns all 5 contract addresses', () => {
      const addresses = getContractAddresses(11155111);
      
      if (addresses) {
        const keys = Object.keys(addresses);
        expect(keys).toHaveLength(5);
        expect(keys).toContain('ParaToken');
        expect(keys).toContain('ParadigmTimelock');
        expect(keys).toContain('ParadigmGovernor');
        expect(keys).toContain('SeedNFT');
        expect(keys).toContain('ParadigmMarketplace');
      }
    });
  });

  describe('validateContractAddresses', () => {
    it('returns true for fully populated addresses', () => {
      const addresses: ContractAddresses = {
        ParaToken: '0x1234567890123456789012345678901234567890',
        ParadigmTimelock: '0x2345678901234567890123456789012345678901',
        ParadigmGovernor: '0x3456789012345678901234567890123456789012',
        SeedNFT: '0x4567890123456789012345678901234567890123',
        ParadigmMarketplace: '0x5678901234567890123456789012345678901234',
      };
      
      expect(validateContractAddresses(addresses)).toBe(true);
    });

    it('returns false for addresses with empty strings', () => {
      const addresses: ContractAddresses = {
        ParaToken: '0x1234567890123456789012345678901234567890',
        ParadigmTimelock: '',
        ParadigmGovernor: '0x3456789012345678901234567890123456789012',
        SeedNFT: '0x4567890123456789012345678901234567890123',
        ParadigmMarketplace: '0x5678901234567890123456789012345678901234',
      };
      
      expect(validateContractAddresses(addresses)).toBe(false);
    });

    it('returns false for partially populated addresses', () => {
      const addresses: ContractAddresses = {
        ParaToken: '0x1234567890123456789012345678901234567890',
        ParadigmTimelock: '0x2345678901234567890123456789012345678901',
        ParadigmGovernor: '',
        SeedNFT: '',
        ParadigmMarketplace: '',
      };
      
      expect(validateContractAddresses(addresses)).toBe(false);
    });

    it('returns false for all empty addresses', () => {
      const addresses: ContractAddresses = {
        ParaToken: '',
        ParadigmTimelock: '',
        ParadigmGovernor: '',
        SeedNFT: '',
        ParadigmMarketplace: '',
      };
      
      expect(validateContractAddresses(addresses)).toBe(false);
    });
  });

  describe('Block Explorer URLs', () => {
    describe('getTransactionUrl', () => {
      it('generates correct URL for Sepolia transaction', () => {
        const txHash = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';
        const url = getTransactionUrl(11155111, txHash);
        
        expect(url).toBe(`https://sepolia.etherscan.io/tx/${txHash}`);
      });

      it('generates correct URL for Ethereum mainnet transaction', () => {
        const txHash = '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890';
        const url = getTransactionUrl(1, txHash);
        
        expect(url).toBe(`https://etherscan.io/tx/${txHash}`);
      });

      it('generates correct URL for Polygon transaction', () => {
        const txHash = '0x9876543210fedcba9876543210fedcba9876543210fedcba9876543210fedcba';
        const url = getTransactionUrl(137, txHash);
        
        expect(url).toBe(`https://polygonscan.com/tx/${txHash}`);
      });

      it('returns empty string for localhost (no block explorer)', () => {
        const txHash = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';
        const url = getTransactionUrl(31337, txHash);
        
        expect(url).toBe('');
      });

      it('returns empty string for unsupported chain', () => {
        const txHash = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';
        const url = getTransactionUrl(999999, txHash);
        
        expect(url).toBe('');
      });
    });

    describe('getAddressUrl', () => {
      it('generates correct URL for Sepolia address', () => {
        const address = '0x1234567890123456789012345678901234567890';
        const url = getAddressUrl(11155111, address);
        
        expect(url).toBe(`https://sepolia.etherscan.io/address/${address}`);
      });

      it('generates correct URL for Ethereum mainnet address', () => {
        const address = '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd';
        const url = getAddressUrl(1, address);
        
        expect(url).toBe(`https://etherscan.io/address/${address}`);
      });

      it('generates correct URL for Mumbai address', () => {
        const address = '0x9876543210987654321098765432109876543210';
        const url = getAddressUrl(80001, address);
        
        expect(url).toBe(`https://mumbai.polygonscan.com/address/${address}`);
      });

      it('returns empty string for localhost', () => {
        const address = '0x1234567890123456789012345678901234567890';
        const url = getAddressUrl(31337, address);
        
        expect(url).toBe('');
      });
    });

    describe('getTokenUrl', () => {
      it('generates correct URL for Sepolia token', () => {
        const tokenAddress = '0x1234567890123456789012345678901234567890';
        const url = getTokenUrl(11155111, tokenAddress);
        
        expect(url).toBe(`https://sepolia.etherscan.io/token/${tokenAddress}`);
      });

      it('generates correct URL for Ethereum mainnet token', () => {
        const tokenAddress = '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd';
        const url = getTokenUrl(1, tokenAddress);
        
        expect(url).toBe(`https://etherscan.io/token/${tokenAddress}`);
      });

      it('generates correct URL for Polygon token', () => {
        const tokenAddress = '0x9876543210987654321098765432109876543210';
        const url = getTokenUrl(137, tokenAddress);
        
        expect(url).toBe(`https://polygonscan.com/token/${tokenAddress}`);
      });

      it('returns empty string for localhost', () => {
        const tokenAddress = '0x1234567890123456789012345678901234567890';
        const url = getTokenUrl(31337, tokenAddress);
        
        expect(url).toBe('');
      });
    });
  });

  describe('Chain Support', () => {
    it('SUPPORTED_CHAIN_IDS contains all network chain IDs', () => {
      expect(SUPPORTED_CHAIN_IDS).toContain(31337);  // localhost
      expect(SUPPORTED_CHAIN_IDS).toContain(11155111); // sepolia
      expect(SUPPORTED_CHAIN_IDS).toContain(80001);  // mumbai
      expect(SUPPORTED_CHAIN_IDS).toContain(1);      // mainnet
      expect(SUPPORTED_CHAIN_IDS).toContain(137);    // polygon
      expect(SUPPORTED_CHAIN_IDS).toHaveLength(5);
    });

    it('SUPPORTED_CHAINS contains all network configs', () => {
      expect(SUPPORTED_CHAINS).toHaveLength(5);
      expect(SUPPORTED_CHAINS.map(c => c.chainId)).toContain(31337);
      expect(SUPPORTED_CHAINS.map(c => c.chainId)).toContain(11155111);
      expect(SUPPORTED_CHAINS.map(c => c.chainId)).toContain(80001);
      expect(SUPPORTED_CHAINS.map(c => c.chainId)).toContain(1);
      expect(SUPPORTED_CHAINS.map(c => c.chainId)).toContain(137);
    });

    it('DEFAULT_CHAIN_ID is Sepolia', () => {
      expect(DEFAULT_CHAIN_ID).toBe(11155111);
    });

    it('isSupportedChain returns true for supported chains', () => {
      expect(isSupportedChain(31337)).toBe(true);
      expect(isSupportedChain(11155111)).toBe(true);
      expect(isSupportedChain(80001)).toBe(true);
      expect(isSupportedChain(1)).toBe(true);
      expect(isSupportedChain(137)).toBe(true);
    });

    it('isSupportedChain returns false for unsupported chains', () => {
      expect(isSupportedChain(999999)).toBe(false);
      expect(isSupportedChain(0)).toBe(false);
      expect(isSupportedChain(-1)).toBe(false);
      expect(isSupportedChain(5)).toBe(false); // Goerli (deprecated)
    });
  });

  describe('getContractAddress', () => {
    it('returns correct address for ParaToken on Sepolia', () => {
      const address = getContractAddress('ParaToken', 11155111);
      
      expect(address).toBeDefined();
      expect(typeof address).toBe('string');
    });

    it('returns correct address for SeedNFT on localhost', () => {
      const address = getContractAddress('SeedNFT', 31337);
      
      expect(address).toBeDefined();
      expect(typeof address).toBe('string');
    });

    it('returns correct address for ParadigmMarketplace on mainnet', () => {
      const address = getContractAddress('ParadigmMarketplace', 1);
      
      expect(address).toBeDefined();
      expect(typeof address).toBe('string');
    });

    it('returns undefined for unsupported chain', () => {
      const address = getContractAddress('ParaToken', 999999);
      
      expect(address).toBeUndefined();
    });

    it('works for all contract types', () => {
      const contractNames: (keyof ContractAddresses)[] = [
        'ParaToken',
        'ParadigmTimelock',
        'ParadigmGovernor',
        'SeedNFT',
        'ParadigmMarketplace',
      ];
      
      contractNames.forEach(name => {
        const address = getContractAddress(name, 11155111);
        expect(address).toBeDefined();
      });
    });
  });

  describe('Network Configuration Integrity', () => {
    it('all networks have unique chain IDs', () => {
      const chainIds = Object.values(NETWORKS).map(n => n.chainId);
      const uniqueChainIds = new Set(chainIds);
      
      expect(chainIds.length).toBe(uniqueChainIds.size);
    });

    it('all networks have non-empty names', () => {
      Object.values(NETWORKS).forEach(network => {
        expect(network.name).toBeTruthy();
        expect(network.name.length).toBeGreaterThan(0);
      });
    });

    it('all networks have valid RPC URLs', () => {
      Object.values(NETWORKS).forEach(network => {
        expect(network.rpcUrl).toBeTruthy();
        expect(network.rpcUrl.startsWith('http')).toBe(true);
      });
    });

    it('all networks have valid native currency configuration', () => {
      Object.values(NETWORKS).forEach(network => {
        expect(network.nativeCurrency).toBeTruthy();
        expect(network.nativeCurrency.name).toBeTruthy();
        expect(network.nativeCurrency.symbol).toBeTruthy();
        expect(network.nativeCurrency.decimals).toBe(18);
      });
    });

    it('testnet networks have testnet in block explorer URL', () => {
      expect(NETWORKS.sepolia.blockExplorer).toContain('sepolia');
      expect(NETWORKS.mumbai.blockExplorer).toContain('mumbai');
    });

    it('mainnet networks do not have testnet in block explorer URL', () => {
      expect(NETWORKS.mainnet.blockExplorer).not.toContain('testnet');
      expect(NETWORKS.mainnet.blockExplorer).not.toContain('sepolia');
      expect(NETWORKS.polygon.blockExplorer).not.toContain('testnet');
      expect(NETWORKS.polygon.blockExplorer).not.toContain('mumbai');
    });
  });
});

// Made with Bob
