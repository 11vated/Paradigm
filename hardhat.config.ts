/**
 * Hardhat configuration for SeedNFT contract
 *
 * Networks:
 * - localhost: Hardhat node (npx hardhat node)
 * - goerli: Ethereum testnet
 * - polygon: Polygon mainnet
 * - mumbai: Polygon testnet
 */

import { HardhatUserConfig } from 'hardhat';
import '@nomicfoundation/hardhat-toolbox';
import 'dotenv/config';

const config: HardhatUserConfig = {
  solidity: {
    version: '0.8.20',
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },

  paths: {
    sources: './contracts',
    tests: './test',
    cache: './cache',
    artifacts: './artifacts',
  },

  networks: {
    hardhat: {
      chainId: 31337,
    },

    localhost: {
      url: 'http://127.0.0.1:8545',
      chainId: 31337,
    },

    goerli: {
      url: process.env.GOERLI_RPC_URL || '',
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      chainId: 5,
    },

    polygon: {
      url: process.env.POLYGON_RPC_URL || '',
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      chainId: 137,
      gasPrice: 30000000000, // 30 gwei
    },

    mumbai: {
      url: process.env.MUMBAI_RPC_URL || '',
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      chainId: 80001,
    },
  },

  etherscan: {
    apiKey: {
      polygon: process.env.POLYGONSCAN_API_KEY || '',
      goerli: process.env.ETHERSCAN_API_KEY || '',
    },
  },

  mocha: {
    timeout: 40000,
  },
};

export default config;
