/**
 * Hardhat configuration (CommonJS) — Paradigm smart contracts.
 *
 * Targets Solidity 0.8.20+ for OpenZeppelin v4.9 compatibility.
 * No external networks configured by default (sovereignty: explicit opt-in).
 */
require('@nomicfoundation/hardhat-toolbox');

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: '0.8.20',
    settings: {
      optimizer: { enabled: true, runs: 200 },
      viaIR: false,
    },
  },
  paths: {
    sources: './contracts',
    tests: './test/contracts',
    artifacts: './artifacts',
    cache: './cache',
  },
  networks: {
    hardhat: { chainId: 31337 },
    ...(process.env.PARADIGM_RPC_URL ? {
      external: {
        url: process.env.PARADIGM_RPC_URL,
        accounts: process.env.PARADIGM_DEPLOY_KEY ? [process.env.PARADIGM_DEPLOY_KEY] : [],
      },
    } : {}),
  },
  mocha: { timeout: 60000 },
};
