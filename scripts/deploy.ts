/**
 * DEPLOYMENT SCRIPTS FOR PARADIGM SMART CONTRACTS
 * 
 * Usage:
 *   npx hardhat run scripts/deploy.ts --network localhost
 *   npx hardhat run scripts/deploy.ts --network polygon
 *   npx hardhat run scripts/deploy.ts --network mumbai
 */

import { ethers, upgrades } from 'hardhat';
import * as fs from 'fs';
import * as path from 'path';

interface DeployConfig {
  network: string;
  timestamp: string;
  deployer: string;
  chainId: number;
  contracts: {
    [key: string]: {
      address: string;
      constructorArgs: any[];
      transactionHash: string;
    };
  };
}

async function main() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('  PARADIGM SMART CONTRACTS DEPLOYMENT');
  console.log('═══════════════════════════════════════════════════════════\n');

  const [deployer] = await ethers.getSigners();
  const network = await ethers.provider.getNetwork();
  
  console.log(`Network: ${network.name} (chainId: ${network.chainId})`);
  console.log(`Deployer: ${deployer.address}`);
  const balance = await deployer.getBalance();
  console.log(`Balance: ${ethers.formatEther(balance)} ETH\n`);

  const deploymentConfig: DeployConfig = {
    network: network.name,
    timestamp: new Date().toISOString(),
    deployer: deployer.address,
    chainId: Number(network.chainId),
    contracts: {},
  };

  // ═══════════════════════════════════════════════════════════════
  // 1. Deploy PARA Token (ERC-20)
  // ═══════════════════════════════════════════════════════════════
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  [1/3] Deploying PARA Token (ERC-20)...');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const ParaToken = await ethers.getContractFactory('ParaToken');
  
  // Initial supply: 1 billion PARA tokens (18 decimals)
  const initialSupply = ethers.parseEther('1000000000');
  
  const paraToken = await ParaToken.deploy(
    'Paradigm',           // name
    'PARA',              // symbol
    deployer.address,    // initial holder (treasury)
    initialSupply        // initial supply
  );
  
  await paraToken.waitForDeployment();
  const paraTokenAddress = await paraToken.getAddress();
  
  console.log(`✅ PARA Token deployed at: ${paraTokenAddress}`);
  
  deploymentConfig.contracts.ParaToken = {
    address: paraTokenAddress,
    constructorArgs: ['Paradigm', 'PARA', deployer.address, initialSupply.toString()],
    transactionHash: paraToken.deploymentTransaction()?.hash || '',
  };

  // Grant minter role to deployer for vesting
  const MINTER_ROLE = await paraToken.MINTER_ROLE();
  await paraToken.grantRole(MINTER_ROLE, deployer.address);
  console.log(`✅ Granted MINTER role to deployer\n`);

  // ═══════════════════════════════════════════════════════════════
  // 2. Deploy SeedNFT (ERC-721)
  // ═══════════════════════════════════════════════════════════════
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  [2/3] Deploying SeedNFT (ERC-721)...');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const SeedNFT = await ethers.getContractFactory('SeedNFT');
  
  const seedNFT = await upgrades.deployProxy(SeedNFT, [
    'Paradigm Seed NFT',
    'P-SEED',
    paraTokenAddress, // PARAToken address for royalty payments
    ethers.parseEther('0.01'), // 1% royalty on secondary sales
    deployer.address, // royalty recipient
  ], { initializer: 'initialize' });
  
  await seedNFT.waitForDeployment();
  const seedNFTAddress = await seedNFT.getAddress();
  
  console.log(`✅ SeedNFT (proxy) deployed at: ${seedNFTAddress}`);
  
  deploymentConfig.contracts.SeedNFT = {
    address: seedNFTAddress,
    constructorArgs: ['Paradigm Seed NFT', 'P-SEED', paraTokenAddress, '10000000000000000', deployer.address],
    transactionHash: seedNFT.deploymentTransaction()?.hash || '',
  };

  // Grant minter role to deployer
  const MINTER_ROLE_NFT = await seedNFT.MINTER_ROLE();
  await seedNFT.grantRole(MINTER_ROLE_NFT, deployer.address);
  console.log(`✅ Granted MINTER role to deployer\n`);

  // ═══════════════════════════════════════════════════════════════
  // 3. Deploy Paradigm Marketplace
  // ═══════════════════════════════════════════════════════════════
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  [3/3] Deploying Paradigm Marketplace...');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const Marketplace = await ethers.getContractFactory('ParadigmMarketplace');
  
  // Platform fee: 2.5% (250 basis points)
  const platformFee = 250;
  
  const marketplace = await Marketplace.deploy(
    seedNFTAddress,
    paraTokenAddress,
    platformFee,
    deployer.address // fee recipient
  );
  
  await marketplace.waitForDeployment();
  const marketplaceAddress = await marketplace.getAddress();
  
  console.log(`✅ Paradigm Marketplace deployed at: ${marketplaceAddress}`);
  
  deploymentConfig.contracts.ParadigmMarketplace = {
    address: marketplaceAddress,
    constructorArgs: [seedNFTAddress, paraTokenAddress, platformFee, deployer.address],
    transactionHash: marketplace.deploymentTransaction()?.hash || '',
  };

  // ═══════════════════════════════════════════════════════════════
  // VERIFICATION SUMMARY
  // ═══════════════════════════════════════════════════════════════
  console.log('═══════════════════════════════════════════════════════════');
  console.log('  DEPLOYMENT COMPLETE');
  console.log('═══════════════════════════════════════════════════════════\n');
  
  console.log('Contract Addresses:');
  console.log('───────────────────────────────────────────────────────────');
  console.log(`  PARA Token:     ${paraTokenAddress}`);
  console.log(`  SeedNFT:       ${seedNFTAddress}`);
  console.log(`  Marketplace:   ${marketplaceAddress}`);
  console.log('───────────────────────────────────────────────────────────\n');

  // Save deployment info
  const deploymentsDir = path.join(__dirname, '..', 'deployments');
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir, { recursive: true });
  }

  const deploymentFile = path.join(deploymentsDir, `${network.name}.json`);
  fs.writeFileSync(deploymentFile, JSON.stringify(deploymentConfig, null, 2));
  console.log(`💾 Deployment info saved to: ${deploymentFile}\n`);

  // Verify on block explorer (if not local)
  if (network.name !== 'localhost' && network.name !== 'hardhat') {
    console.log('⏳ Waiting for block confirmations...');
    await paraToken.deploymentTransaction()?.wait(3);
    await seedNFT.deploymentTransaction()?.wait(3);
    await marketplace.deploymentTransaction()?.wait(3);
    console.log('✅ Transactions confirmed\n');
  }

  console.log('Next steps:');
  console.log('  1. Update .env with contract addresses');
  console.log('  2. Verify contracts: npx hardhat verify --network <network>');
  console.log('  3. Run tests: npx hardhat test');
  console.log('  4. Seed initial liquidity if needed\n');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('\n❌ Deployment failed:', error);
    process.exit(1);
  });