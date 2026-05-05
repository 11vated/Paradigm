/**
 * SeedNFT Deployment Script
 *
 * Deploys the SeedNFT contract to Ethereum/Polygon/L2
 *
 * Usage:
 *   npx hardhat run scripts/deploy.ts --network polygon
 *   npx hardhat run scripts/deploy.ts --network mainnet
 */

import { ethers } from 'hardhat';

async function main() {
  console.log('Deploying SeedNFT contract...');

  // Get deployer
  const [deployer] = await ethers.getSigners();
  console.log(`Deploying with account: ${deployer.address}`);

  const balance = await ethers.provider.getBalance(deployer.address);
  console.log(`Account balance: ${ethers.formatEther(balance)} ETH`);

  // Constructor parameters
  const name = 'Paradigm Seed';
  const symbol = 'PSEED';
  const baseURI = process.env.BASE_URI || 'https://api.paradigm.art/seed/';
  const royaltyRecipient = process.env.ROYALTY_RECIPIENT || deployer.address;
  const royaltyBps = process.env.ROYALTY_BPS || 250; // 2.5%

  // Deploy contract
  const SeedNFT = await ethers.getContractFactory('SeedNFT');
  const seedNFT = await SeedNFT.deploy(
    name,
    symbol,
    baseURI,
    royaltyRecipient,
    royaltyBps
  );

  await seedNFT.waitForDeployment();

  const address = await seedNFT.getAddress();
  console.log(`SeedNFT deployed to: ${address}`);

  // Verify contract on Etherscan/Polygonscan
  if (process.env.VERIFY === 'true') {
    console.log('Verifying contract...');
    await hre.run('verify:verify', {
      address: address,
      constructorArguments: [name, symbol, baseURI, royaltyRecipient, royaltyBps],
    });
  }

  // Log deployment info
  console.log('\n=== Deployment Info ===');
  console.log(`Contract: ${address}`);
  console.log(`Name: ${name}`);
  console.log(`Symbol: ${symbol}`);
  console.log(`Base URI: ${baseURI}`);
  console.log(`Royalty: ${royaltyBps / 100}% to ${royaltyRecipient}`);

  return address;
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
