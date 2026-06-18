#!/usr/bin/env tsx
/**
 * Paradigm Smart Contract Deployment Script
 * 
 * Deploys all Paradigm contracts in the correct order:
 * 1. ParaToken (ERC-20 governance token)
 * 2. ParadigmTimelock (48-hour timelock for governance)
 * 3. ParadigmGovernor (DAO governance)
 * 4. SeedNFT (ERC-721 for seeds)
 * 5. ParadigmMarketplace (NFT marketplace)
 * 
 * Uses environment-based address configuration from Phase 12.
 * 
 * Usage:
 *   # Development (local hardhat)
 *   npm run deploy:contracts:dev
 * 
 *   # Testnet (Sepolia)
 *   npm run deploy:contracts:testnet
 * 
 *   # Mainnet (requires confirmation)
 *   npm run deploy:contracts:mainnet
 */

import { ethers } from 'hardhat';
import { promises as fs } from 'fs';
import path from 'path';
import { getAddresses, displayConfiguration } from '../contracts/config/addresses';

interface DeploymentResult {
  network: string;
  chainId: number;
  deployer: string;
  contracts: {
    ParaToken: string;
    ParadigmTimelock: string;
    ParadigmGovernor: string;
    SeedNFT: string;
    ParadigmMarketplace: string;
  };
  timestamp: string;
  gasUsed: {
    ParaToken: string;
    ParadigmTimelock: string;
    ParadigmGovernor: string;
    SeedNFT: string;
    ParadigmMarketplace: string;
    total: string;
  };
}

async function main() {
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║   PARADIGM ABSOLUTE - SMART CONTRACT DEPLOYMENT           ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  // Get network info
  const network = await ethers.provider.getNetwork();
  const networkName = network.name === 'unknown' ? 'localhost' : network.name;
  const chainId = Number(network.chainId);
  
  console.log(`Network: ${networkName} (Chain ID: ${chainId})`);
  
  // Get deployer
  const [deployer] = await ethers.getSigners();
  console.log(`Deployer: ${deployer.address}`);
  
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log(`Balance: ${ethers.formatEther(balance)} ETH\n`);
  
  // Validate sufficient balance
  const minBalance = ethers.parseEther('0.1'); // Minimum 0.1 ETH for deployment
  if (balance < minBalance) {
    throw new Error(`Insufficient balance. Need at least ${ethers.formatEther(minBalance)} ETH`);
  }
  
  // Get and validate addresses
  const addresses = getAddresses(networkName as any);
  displayConfiguration(networkName as any);
  
  // Confirm deployment on mainnet
  if (networkName === 'mainnet' || chainId === 1) {
    console.log('\n⚠️  WARNING: You are about to deploy to MAINNET!');
    console.log('This will cost real ETH and cannot be undone.');
    console.log('Press Ctrl+C to cancel, or wait 10 seconds to continue...\n');
    await new Promise(resolve => setTimeout(resolve, 10000));
  }
  
  const gasUsed: Record<string, bigint> = {};
  
  // ═══════════════════════════════════════════════════════════════════════════
  // 1. Deploy ParaToken (ERC-20)
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('\n[1/5] Deploying ParaToken (ERC-20)...');
  
  const ParaToken = await ethers.getContractFactory('ParaToken');
  const paraToken = await ParaToken.deploy(
    addresses.CREATOR_REWARDS,
    addresses.DAO_TREASURY,
    addresses.STAKING_REWARDS,
    addresses.TEAM,
    addresses.ECOSYSTEM
  );
  
  await paraToken.waitForDeployment();
  const paraTokenAddress = await paraToken.getAddress();
  const paraTokenReceipt = await paraToken.deploymentTransaction()?.wait();
  gasUsed.ParaToken = paraTokenReceipt?.gasUsed || 0n;
  
  console.log(`✓ ParaToken deployed to: ${paraTokenAddress}`);
  console.log(`  Gas used: ${gasUsed.ParaToken.toString()}`);
  
  // ═══════════════════════════════════════════════════════════════════════════
  // 2. Deploy ParadigmTimelock (48-hour timelock)
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('\n[2/5] Deploying ParadigmTimelock...');
  
  const minDelay = 48 * 60 * 60; // 48 hours in seconds
  const proposers = [deployer.address]; // Will be updated to Governor after deployment
  const executors = [deployer.address]; // Will be updated to Governor after deployment
  const admin = deployer.address; // Will renounce after setup
  
  const ParadigmTimelock = await ethers.getContractFactory('ParadigmTimelock');
  const timelock = await ParadigmTimelock.deploy(
    minDelay,
    proposers,
    executors,
    admin
  );
  
  await timelock.waitForDeployment();
  const timelockAddress = await timelock.getAddress();
  const timelockReceipt = await timelock.deploymentTransaction()?.wait();
  gasUsed.ParadigmTimelock = timelockReceipt?.gasUsed || 0n;
  
  console.log(`✓ ParadigmTimelock deployed to: ${timelockAddress}`);
  console.log(`  Min delay: ${minDelay / 3600} hours`);
  console.log(`  Gas used: ${gasUsed.ParadigmTimelock.toString()}`);
  
  // ═══════════════════════════════════════════════════════════════════════════
  // 3. Deploy ParadigmGovernor (DAO)
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('\n[3/5] Deploying ParadigmGovernor...');
  
  const votingDelay = 1; // 1 block (~12 seconds)
  const votingPeriod = 50400; // ~1 week (assuming 12 sec blocks)
  const proposalThreshold = ethers.parseEther('1000000'); // 1M PARA to propose
  
  const ParadigmGovernor = await ethers.getContractFactory('ParadigmGovernor');
  const governor = await ParadigmGovernor.deploy(
    paraTokenAddress,
    timelockAddress,
    votingDelay,
    votingPeriod,
    proposalThreshold
  );
  
  await governor.waitForDeployment();
  const governorAddress = await governor.getAddress();
  const governorReceipt = await governor.deploymentTransaction()?.wait();
  gasUsed.ParadigmGovernor = governorReceipt?.gasUsed || 0n;
  
  console.log(`✓ ParadigmGovernor deployed to: ${governorAddress}`);
  console.log(`  Voting delay: ${votingDelay} blocks`);
  console.log(`  Voting period: ${votingPeriod} blocks (~1 week)`);
  console.log(`  Proposal threshold: ${ethers.formatEther(proposalThreshold)} PARA`);
  console.log(`  Gas used: ${gasUsed.ParadigmGovernor.toString()}`);
  
  // ═══════════════════════════════════════════════════════════════════════════
  // 4. Deploy SeedNFT (ERC-721)
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('\n[4/5] Deploying SeedNFT (ERC-721)...');
  
  const name = 'Paradigm Seed';
  const symbol = 'PSEED';
  const baseURI = process.env.SEED_NFT_BASE_URI || 'https://api.paradigm.art/seed/';
  const royaltyRecipient = addresses.CREATOR_REWARDS;
  const royaltyBps = 250; // 2.5%
  
  const SeedNFT = await ethers.getContractFactory('SeedNFT');
  const seedNFT = await SeedNFT.deploy(
    name,
    symbol,
    baseURI,
    royaltyRecipient,
    royaltyBps
  );
  
  await seedNFT.waitForDeployment();
  const seedNFTAddress = await seedNFT.getAddress();
  const seedNFTReceipt = await seedNFT.deploymentTransaction()?.wait();
  gasUsed.SeedNFT = seedNFTReceipt?.gasUsed || 0n;
  
  console.log(`✓ SeedNFT deployed to: ${seedNFTAddress}`);
  console.log(`  Base URI: ${baseURI}`);
  console.log(`  Royalty: ${royaltyBps / 100}% to ${royaltyRecipient}`);
  console.log(`  Gas used: ${gasUsed.SeedNFT.toString()}`);
  
  // ═══════════════════════════════════════════════════════════════════════════
  // 5. Deploy ParadigmMarketplace
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('\n[5/5] Deploying ParadigmMarketplace...');
  
  const ParadigmMarketplace = await ethers.getContractFactory('ParadigmMarketplace');
  const marketplace = await ParadigmMarketplace.deploy();
  
  await marketplace.waitForDeployment();
  const marketplaceAddress = await marketplace.getAddress();
  const marketplaceReceipt = await marketplace.deploymentTransaction()?.wait();
  gasUsed.ParadigmMarketplace = marketplaceReceipt?.gasUsed || 0n;
  
  console.log(`✓ ParadigmMarketplace deployed to: ${marketplaceAddress}`);
  console.log(`  Gas used: ${gasUsed.ParadigmMarketplace.toString()}`);
  
  // ═══════════════════════════════════════════════════════════════════════════
  // Post-Deployment Configuration
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('\n[Post-Deployment] Configuring contracts...');
  
  // Grant Governor role to Timelock
  console.log('  • Granting PROPOSER_ROLE to Governor...');
  const PROPOSER_ROLE = await timelock.PROPOSER_ROLE();
  await timelock.grantRole(PROPOSER_ROLE, governorAddress);
  
  console.log('  • Granting EXECUTOR_ROLE to Governor...');
  const EXECUTOR_ROLE = await timelock.EXECUTOR_ROLE();
  await timelock.grantRole(EXECUTOR_ROLE, governorAddress);
  
  console.log('  • Revoking deployer admin role from Timelock...');
  const TIMELOCK_ADMIN_ROLE = await timelock.TIMELOCK_ADMIN_ROLE();
  await timelock.revokeRole(TIMELOCK_ADMIN_ROLE, deployer.address);
  
  console.log('✓ Post-deployment configuration complete');
  
  // ═══════════════════════════════════════════════════════════════════════════
  // Calculate Total Gas
  // ═══════════════════════════════════════════════════════════════════════════
  const totalGas = Object.values(gasUsed).reduce((a, b) => a + b, 0n);
  
  // ═══════════════════════════════════════════════════════════════════════════
  // Save Deployment Info
  // ═══════════════════════════════════════════════════════════════════════════
  const deployment: DeploymentResult = {
    network: networkName,
    chainId,
    deployer: deployer.address,
    contracts: {
      ParaToken: paraTokenAddress,
      ParadigmTimelock: timelockAddress,
      ParadigmGovernor: governorAddress,
      SeedNFT: seedNFTAddress,
      ParadigmMarketplace: marketplaceAddress,
    },
    timestamp: new Date().toISOString(),
    gasUsed: {
      ParaToken: gasUsed.ParaToken.toString(),
      ParadigmTimelock: gasUsed.ParadigmTimelock.toString(),
      ParadigmGovernor: gasUsed.ParadigmGovernor.toString(),
      SeedNFT: gasUsed.SeedNFT.toString(),
      ParadigmMarketplace: gasUsed.ParadigmMarketplace.toString(),
      total: totalGas.toString(),
    },
  };
  
  const deploymentDir = path.join(process.cwd(), 'deployments');
  await fs.mkdir(deploymentDir, { recursive: true });
  
  const deploymentFile = path.join(deploymentDir, `${networkName}-${Date.now()}.json`);
  await fs.writeFile(deploymentFile, JSON.stringify(deployment, null, 2));
  
  console.log(`\n✓ Deployment info saved to: ${deploymentFile}`);
  
  // ═══════════════════════════════════════════════════════════════════════════
  // Summary
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║              DEPLOYMENT COMPLETE                           ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');
  
  console.log('Contract Addresses:');
  console.log(`  ParaToken:           ${paraTokenAddress}`);
  console.log(`  ParadigmTimelock:    ${timelockAddress}`);
  console.log(`  ParadigmGovernor:    ${governorAddress}`);
  console.log(`  SeedNFT:             ${seedNFTAddress}`);
  console.log(`  ParadigmMarketplace: ${marketplaceAddress}`);
  
  console.log(`\nTotal Gas Used: ${totalGas.toString()}`);
  
  console.log('\nNext Steps:');
  console.log('  1. Update .env with deployed contract addresses');
  console.log('  2. Verify contracts on block explorer (if mainnet/testnet)');
  console.log('  3. Update frontend configuration');
  console.log('  4. Test contract interactions');
  console.log('  5. Transfer ownership to DAO (if applicable)\n');
  
  // ═══════════════════════════════════════════════════════════════════════════
  // Generate .env Template
  // ═══════════════════════════════════════════════════════════════════════════
  const envTemplate = `
# Paradigm Contract Addresses (${networkName})
# Generated: ${new Date().toISOString()}

PARA_TOKEN_ADDRESS=${paraTokenAddress}
PARADIGM_TIMELOCK_ADDRESS=${timelockAddress}
PARADIGM_GOVERNOR_ADDRESS=${governorAddress}
SEED_NFT_ADDRESS=${seedNFTAddress}
PARADIGM_MARKETPLACE_ADDRESS=${marketplaceAddress}

# Network Info
NETWORK=${networkName}
CHAIN_ID=${chainId}
DEPLOYER=${deployer.address}
`;
  
  const envFile = path.join(deploymentDir, `${networkName}.env`);
  await fs.writeFile(envFile, envTemplate.trim());
  
  console.log(`✓ Environment template saved to: ${envFile}\n`);
  
  return deployment;
}

// Execute deployment
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('\n❌ Deployment failed:');
    console.error(error);
    process.exit(1);
  });

// Made with Bob
