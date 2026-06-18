/**
 * Smart Contract Configuration
 * 
 * Manages contract addresses and ABIs for different networks.
 * Integrates with Phase 14 deployment infrastructure.
 * 
 * Phase 15.1: Web3 Contract Configuration
 * Date: 2026-06-18
 */

export interface ContractAddresses {
  ParaToken: string;
  ParadigmTimelock: string;
  ParadigmGovernor: string;
  SeedNFT: string;
  ParadigmMarketplace: string;
}

export interface NetworkConfig {
  chainId: number;
  name: string;
  rpcUrl: string;
  blockExplorer: string;
  contracts: ContractAddresses;
  nativeCurrency: {
    name: string;
    symbol: string;
    decimals: number;
  };
  rpcUrls: string[];
  blockExplorerUrls: string[];
}

/**
 * Network configurations
 * 
 * Addresses will be populated after contract deployment.
 * See Phase 14 deployment script output.
 */
export const NETWORKS: Record<string, NetworkConfig> = {
  // Local development (Hardhat)
  localhost: {
    chainId: 31337,
    name: 'Localhost',
    rpcUrl: 'http://127.0.0.1:8545',
    blockExplorer: '',
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    rpcUrls: ['http://127.0.0.1:8545'],
    blockExplorerUrls: [],
    contracts: {
      ParaToken: process.env.VITE_LOCAL_PARA_TOKEN_ADDRESS || '',
      ParadigmTimelock: process.env.VITE_LOCAL_PARADIGM_TIMELOCK_ADDRESS || '',
      ParadigmGovernor: process.env.VITE_LOCAL_PARADIGM_GOVERNOR_ADDRESS || '',
      SeedNFT: process.env.VITE_LOCAL_SEED_NFT_ADDRESS || '',
      ParadigmMarketplace: process.env.VITE_LOCAL_PARADIGM_MARKETPLACE_ADDRESS || '',
    },
  },
  
  // Ethereum Sepolia Testnet
  sepolia: {
    chainId: 11155111,
    name: 'Sepolia',
    rpcUrl: process.env.VITE_SEPOLIA_RPC_URL || 'https://sepolia.infura.io/v3/',
    blockExplorer: 'https://sepolia.etherscan.io',
    nativeCurrency: { name: 'Sepolia Ether', symbol: 'ETH', decimals: 18 },
    rpcUrls: [process.env.VITE_SEPOLIA_RPC_URL || 'https://sepolia.infura.io/v3/'],
    blockExplorerUrls: ['https://sepolia.etherscan.io'],
    contracts: {
      ParaToken: process.env.VITE_SEPOLIA_PARA_TOKEN_ADDRESS || '',
      ParadigmTimelock: process.env.VITE_SEPOLIA_PARADIGM_TIMELOCK_ADDRESS || '',
      ParadigmGovernor: process.env.VITE_SEPOLIA_PARADIGM_GOVERNOR_ADDRESS || '',
      SeedNFT: process.env.VITE_SEPOLIA_SEED_NFT_ADDRESS || '',
      ParadigmMarketplace: process.env.VITE_SEPOLIA_PARADIGM_MARKETPLACE_ADDRESS || '',
    },
  },
  
  // Polygon Mumbai Testnet
  mumbai: {
    chainId: 80001,
    name: 'Mumbai',
    rpcUrl: process.env.VITE_MUMBAI_RPC_URL || 'https://polygon-mumbai.infura.io/v3/',
    blockExplorer: 'https://mumbai.polygonscan.com',
    nativeCurrency: { name: 'MATIC', symbol: 'MATIC', decimals: 18 },
    rpcUrls: [process.env.VITE_MUMBAI_RPC_URL || 'https://polygon-mumbai.infura.io/v3/'],
    blockExplorerUrls: ['https://mumbai.polygonscan.com'],
    contracts: {
      ParaToken: process.env.VITE_MUMBAI_PARA_TOKEN_ADDRESS || '',
      ParadigmTimelock: process.env.VITE_MUMBAI_PARADIGM_TIMELOCK_ADDRESS || '',
      ParadigmGovernor: process.env.VITE_MUMBAI_PARADIGM_GOVERNOR_ADDRESS || '',
      SeedNFT: process.env.VITE_MUMBAI_SEED_NFT_ADDRESS || '',
      ParadigmMarketplace: process.env.VITE_MUMBAI_PARADIGM_MARKETPLACE_ADDRESS || '',
    },
  },
  
  // Ethereum Mainnet
  mainnet: {
    chainId: 1,
    name: 'Ethereum',
    rpcUrl: process.env.VITE_MAINNET_RPC_URL || 'https://mainnet.infura.io/v3/',
    blockExplorer: 'https://etherscan.io',
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    rpcUrls: [process.env.VITE_MAINNET_RPC_URL || 'https://mainnet.infura.io/v3/'],
    blockExplorerUrls: ['https://etherscan.io'],
    contracts: {
      ParaToken: process.env.VITE_MAINNET_PARA_TOKEN_ADDRESS || '',
      ParadigmTimelock: process.env.VITE_MAINNET_PARADIGM_TIMELOCK_ADDRESS || '',
      ParadigmGovernor: process.env.VITE_MAINNET_PARADIGM_GOVERNOR_ADDRESS || '',
      SeedNFT: process.env.VITE_MAINNET_SEED_NFT_ADDRESS || '',
      ParadigmMarketplace: process.env.VITE_MAINNET_PARADIGM_MARKETPLACE_ADDRESS || '',
    },
  },
  
  // Polygon Mainnet
  polygon: {
    chainId: 137,
    name: 'Polygon',
    rpcUrl: process.env.VITE_POLYGON_RPC_URL || 'https://polygon-mainnet.infura.io/v3/',
    blockExplorer: 'https://polygonscan.com',
    nativeCurrency: { name: 'MATIC', symbol: 'MATIC', decimals: 18 },
    rpcUrls: [process.env.VITE_POLYGON_RPC_URL || 'https://polygon-mainnet.infura.io/v3/'],
    blockExplorerUrls: ['https://polygonscan.com'],
    contracts: {
      ParaToken: process.env.VITE_POLYGON_PARA_TOKEN_ADDRESS || '',
      ParadigmTimelock: process.env.VITE_POLYGON_PARADIGM_TIMELOCK_ADDRESS || '',
      ParadigmGovernor: process.env.VITE_POLYGON_PARADIGM_GOVERNOR_ADDRESS || '',
      SeedNFT: process.env.VITE_POLYGON_SEED_NFT_ADDRESS || '',
      ParadigmMarketplace: process.env.VITE_POLYGON_PARADIGM_MARKETPLACE_ADDRESS || '',
    },
  },
};

/**
 * Get network configuration by chain ID
 */
export function getNetworkConfig(chainId: number): NetworkConfig | undefined {
  return Object.values(NETWORKS).find(n => n.chainId === chainId);
}

/**
 * Get contract addresses for a specific network
 */
export function getContractAddresses(chainId: number): ContractAddresses | undefined {
  const network = getNetworkConfig(chainId);
  return network?.contracts;
}

/**
 * Validate that all contract addresses are set for a network
 */
export function validateContractAddresses(addresses: ContractAddresses): boolean {
  return Object.values(addresses).every(addr => addr && addr !== '');
}

/**
 * Get block explorer URL for a transaction
 */
export function getTransactionUrl(chainId: number, txHash: string): string {
  const network = getNetworkConfig(chainId);
  if (!network || !network.blockExplorer) return '';
  return `${network.blockExplorer}/tx/${txHash}`;
}

/**
 * Get block explorer URL for an address
 */
export function getAddressUrl(chainId: number, address: string): string {
  const network = getNetworkConfig(chainId);
  if (!network || !network.blockExplorer) return '';
  return `${network.blockExplorer}/address/${address}`;
}

/**
 * Get block explorer URL for a token
 */
export function getTokenUrl(chainId: number, tokenAddress: string): string {
  const network = getNetworkConfig(chainId);
  if (!network || !network.blockExplorer) return '';
  return `${network.blockExplorer}/token/${tokenAddress}`;
}

/**
 * Supported chain IDs
 */
export const SUPPORTED_CHAIN_IDS = Object.values(NETWORKS).map(n => n.chainId);

/**
 * Default chain ID (Sepolia testnet for development)
 */
export const DEFAULT_CHAIN_ID = 11155111; // Sepolia

/**
 * Check if a chain ID is supported
 */
export function isSupportedChain(chainId: number): boolean {
  return SUPPORTED_CHAIN_IDS.includes(chainId);
}

/**
 * Get a specific contract address by name and chain ID
 */
export function getContractAddress(
  contractName: keyof ContractAddresses,
  chainId: number
): string | undefined {
  const addresses = getContractAddresses(chainId);
  return addresses?.[contractName];
}

/**
 * Export supported chains for UI display
 */
export const SUPPORTED_CHAINS = Object.values(NETWORKS);

// Made with Bob
