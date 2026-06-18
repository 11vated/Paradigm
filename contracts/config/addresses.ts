/**
 * Smart Contract Address Configuration
 * 
 * Manages wallet addresses for token distribution across different networks.
 * Replaces hardcoded addresses in ParaToken.sol with environment-based configuration.
 * 
 * Phase 12.2: Smart Contract Address Configuration
 * Date: 2026-06-18
 * 
 * Security: All addresses must be set via environment variables.
 * Production deployment will fail if any required address is missing.
 */

export interface NetworkAddresses {
  CREATOR_REWARDS: string;
  DAO_TREASURY: string;
  STAKING_REWARDS: string;
  TEAM: string;
  ECOSYSTEM: string;
}

export interface ContractAddresses {
  development: NetworkAddresses;
  sepolia: NetworkAddresses;
  mumbai: NetworkAddresses;
  mainnet: NetworkAddresses;
}

/**
 * Load addresses from environment variables for a specific network
 */
function loadNetworkAddresses(network: string): NetworkAddresses {
  const prefix = network.toUpperCase();
  
  return {
    CREATOR_REWARDS: process.env[`${prefix}_CREATOR_REWARDS_WALLET`] || '',
    DAO_TREASURY: process.env[`${prefix}_DAO_TREASURY_WALLET`] || '',
    STAKING_REWARDS: process.env[`${prefix}_STAKING_REWARDS_WALLET`] || '',
    TEAM: process.env[`${prefix}_TEAM_WALLET`] || '',
    ECOSYSTEM: process.env[`${prefix}_ECOSYSTEM_WALLET`] || '',
  };
}

/**
 * Contract addresses configuration
 * 
 * Addresses are loaded from environment variables at runtime.
 * This allows different addresses for different networks without code changes.
 */
export const CONTRACT_ADDRESSES: ContractAddresses = {
  development: loadNetworkAddresses('DEVELOPMENT'),
  sepolia: loadNetworkAddresses('SEPOLIA'),
  mumbai: loadNetworkAddresses('MUMBAI'),
  mainnet: loadNetworkAddresses('MAINNET'),
};

/**
 * Validate that all required addresses are set for a network
 */
function validateAddresses(network: string, addresses: NetworkAddresses): void {
  const missing: string[] = [];
  
  for (const [key, value] of Object.entries(addresses)) {
    if (!value || value.trim() === '') {
      missing.push(key);
    }
    
    // Validate Ethereum address format (0x + 40 hex chars)
    if (value && !/^0x[a-fA-F0-9]{40}$/.test(value)) {
      throw new Error(
        `Invalid Ethereum address format for ${network}.${key}: ${value}\n` +
        `Expected format: 0x followed by 40 hexadecimal characters`
      );
    }
  }
  
  if (missing.length > 0) {
    throw new Error(
      `Missing required wallet addresses for ${network} network:\n` +
      missing.map(key => `  - ${network.toUpperCase()}_${key}_WALLET`).join('\n') +
      `\n\nSet these environment variables before deployment.` +
      `\nSee .env.example for required variables.`
    );
  }
}

/**
 * Get validated addresses for a specific network
 * 
 * @param network - Network name (development, sepolia, mumbai, mainnet)
 * @returns Validated network addresses
 * @throws Error if network is unknown or addresses are invalid/missing
 */
export function getAddresses(network: string): NetworkAddresses {
  const normalizedNetwork = network.toLowerCase();
  
  // Check if network is supported
  if (!(normalizedNetwork in CONTRACT_ADDRESSES)) {
    throw new Error(
      `Unknown network: ${network}\n` +
      `Supported networks: ${Object.keys(CONTRACT_ADDRESSES).join(', ')}`
    );
  }
  
  const addresses = CONTRACT_ADDRESSES[normalizedNetwork as keyof ContractAddresses];
  
  // Validate addresses (throws if invalid or missing)
  validateAddresses(network, addresses);
  
  return addresses;
}

/**
 * Get addresses with fallback for development
 * 
 * In development mode, if addresses are not set, uses placeholder addresses.
 * This allows local testing without setting all environment variables.
 * 
 * WARNING: Never use this in production! Always use getAddresses() for production.
 */
export function getAddressesWithFallback(network: string): NetworkAddresses {
  const normalizedNetwork = network.toLowerCase();
  
  // In production, always require real addresses
  if (process.env.NODE_ENV === 'production') {
    return getAddresses(network);
  }
  
  // Development fallback
  if (normalizedNetwork === 'development') {
    const addresses = CONTRACT_ADDRESSES.development;
    
    // If any address is missing, use placeholder
    const hasAllAddresses = Object.values(addresses).every(addr => addr && addr.trim() !== '');
    
    if (!hasAllAddresses) {
      console.warn(
        '[CONTRACT-CONFIG] Using placeholder addresses for development.\n' +
        'Set DEVELOPMENT_*_WALLET environment variables for real addresses.'
      );
      
      return {
        CREATOR_REWARDS: '0x0000000000000000000000000000000000000001',
        DAO_TREASURY: '0x0000000000000000000000000000000000000002',
        STAKING_REWARDS: '0x0000000000000000000000000000000000000003',
        TEAM: '0x0000000000000000000000000000000000000004',
        ECOSYSTEM: '0x0000000000000000000000000000000000000005',
      };
    }
  }
  
  return getAddresses(network);
}

/**
 * Display current configuration for debugging
 */
export function displayConfiguration(network: string): void {
  try {
    const addresses = getAddresses(network);
    
    console.log(`\n[CONTRACT-CONFIG] ${network.toUpperCase()} Network Addresses:`);
    console.log(`  Creator Rewards: ${addresses.CREATOR_REWARDS}`);
    console.log(`  DAO Treasury:    ${addresses.DAO_TREASURY}`);
    console.log(`  Staking Rewards: ${addresses.STAKING_REWARDS}`);
    console.log(`  Team:            ${addresses.TEAM}`);
    console.log(`  Ecosystem:       ${addresses.ECOSYSTEM}\n`);
  } catch (error) {
    console.error(`[CONTRACT-CONFIG] Configuration error:`, error);
    throw error;
  }
}

/**
 * Validate all networks at startup
 * 
 * Useful for CI/CD to catch configuration errors early.
 */
export function validateAllNetworks(): void {
  const networks = ['development', 'sepolia', 'mumbai', 'mainnet'];
  const errors: string[] = [];
  
  for (const network of networks) {
    try {
      getAddresses(network);
      console.log(`[CONTRACT-CONFIG] ✓ ${network} configuration valid`);
    } catch (error) {
      errors.push(`${network}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  if (errors.length > 0) {
    throw new Error(
      `Contract address configuration errors:\n\n` +
      errors.join('\n\n')
    );
  }
}

// Made with Bob
