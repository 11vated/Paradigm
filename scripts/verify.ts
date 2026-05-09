/**
 * VERIFICATION SCRIPTS FOR PARADIGM CONTRACTS
 * 
 * Verify contracts on Etherscan/Polygonscan after deployment
 * 
 * Usage:
 *   npx hardhat run scripts/verify.ts --network goerli
 *   npx hardhat run scripts/verify.ts --network polygon
 */

import { ethers, run, network } from 'hardhat';
import * as fs from 'fs';
import * as path from 'path';

interface DeploymentData {
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
  console.log('  PARADIGM CONTRACT VERIFICATION');
  console.log('═══════════════════════════════════════════════════════════\n');

  // Load deployment data
  const deploymentPath = path.join(__dirname, '..', 'deployments', `${network.name}.json`);
  
  if (!fs.existsSync(deploymentPath)) {
    console.error(`❌ No deployment found for network: ${network.name}`);
    console.log(`   Run: npx hardhat run scripts/deploy.ts --network ${network.name}`);
    process.exit(1);
  }

  const deployment: DeploymentData = JSON.parse(fs.readFileSync(deploymentPath, 'utf-8'));
  
  console.log(`Network: ${network.name}`);
  console.log(`Chain ID: ${deployment.chainId}\n`);

  const verifyPromises: Promise<void>[] = [];

  // ═══════════════════════════════════════════════════════════════
  // Verify PARA Token
  // ═══════════════════════════════════════════════════════════════
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  [1/3] Verifying PARA Token...');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const paraTokenAddress = deployment.contracts.ParaToken.address;
  const [deployer] = await ethers.getSigners();
  const initialSupply = ethers.parseEther('1000000000');

  const verifyPara = run('verify:verify', {
    address: paraTokenAddress,
    constructorArguments: [
      'Paradigm',
      'PARA',
      deployer.address,
      initialSupply.toString(),
    ],
  }).catch((err) => {
    console.log(`⚠️  PARA Token verification: ${err.message}`);
  });

  verifyPromises.push(verifyPara);

  // ═══════════════════════════════════════════════════════════════
  // Verify SeedNFT (Proxy)
  // ═══════════════════════════════════════════════════════════════
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  [2/3] Verifying SeedNFT...');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const seedNFTAddress = deployment.contracts.SeedNFT.address;

  // For upgradeable proxies, we need implementation address
  const seedNFT = await ethers.getContractAt('SeedNFT', seedNFTAddress);
  const implementationAddress = await ethers.getContractAt(
    'SeedNFT',
    await (seedNFT as any).implementation()
  ).then(c => c.address).catch(() => seedNFTAddress);

  const verifyNFT = run('verify:verify', {
    address: seedNFTAddress,
    constructorArguments: [
      'Paradigm Seed NFT',
      'P-SEED',
      deployment.contracts.ParaToken.address,
      '10000000000000000', // 0.01 ETH royalty
      deployer.address,
    ],
  }).catch((err) => {
    console.log(`⚠️  SeedNFT verification: ${err.message}`);
  });

  verifyPromises.push(verifyNFT);

  // ═══════════════════════════════════════════════════════════════
  // Verify Marketplace
  // ═══════════════════════════════════════════════════════════════
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  [3/3] Verifying Marketplace...');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const marketplaceAddress = deployment.contracts.ParadigmMarketplace.address;

  const verifyMarketplace = run('verify:verify', {
    address: marketplaceAddress,
    constructorArguments: [
      seedNFTAddress,
      paraTokenAddress,
      250, // 2.5% platform fee
      deployer.address,
    ],
  }).catch((err) => {
    console.log(`⚠️  Marketplace verification: ${err.message}`);
  });

  verifyPromises.push(verifyMarketplace);

  // Wait for all verifications
  await Promise.all(verifyPromises);

  console.log('═══════════════════════════════════════════════════════════');
  console.log('  VERIFICATION COMPLETE');
  console.log('═══════════════════════════════════════════════════════════\n');

  console.log('Verified Contracts:');
  console.log(`  - PARA Token:     https://${network.name === 'polygon' ? 'polygonscan.com' : network.name === 'goerli' ? 'goerli.etherscan.io' : 'etherscan.io'}/address/${paraTokenAddress}`);
  console.log(`  - SeedNFT:        https://${network.name === 'polygon' ? 'polygonscan.com' : network.name === 'goerli' ? 'goerli.etherscan.io' : 'etherscan.io'}/address/${seedNFTAddress}`);
  console.log(`  - Marketplace:    https://${network.name === 'polygon' ? 'polygonscan.com' : network.name === 'goerli' ? 'goerli.etherscan.io' : 'etherscan.io'}/address/${marketplaceAddress}\n`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('\n❌ Verification failed:', error);
    process.exit(1);
  });