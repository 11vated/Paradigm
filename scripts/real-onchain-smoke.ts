/**
 * Standalone smoke runner for the real on-chain client. Runs a local
 * hardhat node, deploys PARA + SeedNFT, mints parents, breeds a child,
 * and distributes royalties. Prints the full claim string.
 *
 * Usage: npx tsx scripts/real-onchain-smoke.ts
 */
import { runLocalOnchainDemo } from '../src/lib/contracts/onchain/real-client.js';

async function main() {
  console.log('Starting real on-chain demo...\n');
  const result = await runLocalOnchainDemo();
  console.log('═══════════════════════════════════════════════════════════');
  console.log('  REAL ON-CHAIN DEMO — RESULTS');
  console.log('═══════════════════════════════════════════════════════════\n');
  console.log('Deploy:');
  console.log('  PARA Token:    ', result.deploy.paraToken.address);
  console.log('  PARA DeployTx: ', result.deploy.paraToken.deployTxHash);
  console.log('  SeedNFT:       ', result.deploy.seedNFT.address);
  console.log('  SeedNFT DeployTx:', result.deploy.seedNFT.deployTxHash);
  console.log('  Deployer:      ', result.deploy.deployer);
  console.log('  Chain ID:      ', result.deploy.chainId);
  console.log('\nMints:');
  result.mints.forEach((m, i) => {
    console.log(`  Parent ${i + 1}: tokenId=${m.tokenId} txHash=${m.txHash} block=${m.blockNumber} gas=${m.gasUsed}`);
    console.log(`     seedHash=${m.seedHash}`);
  });
  console.log('\nBreeds:');
  result.breeds.forEach((b) => {
    console.log(`  Child: tokenId=${b.childTokenId} txHash=${b.txHash} block=${b.blockNumber} gas=${b.gasUsed}`);
    console.log(`     childSeedHash=${b.childSeedHash}`);
    console.log(`     parents=[${b.parentTokenIds.join(', ')}]`);
  });
  console.log('\nChild On-Chain State:');
  if (result.childSeed) {
    console.log(`  domain:     ${result.childSeed.domain}`);
    console.log(`  generation: ${result.childSeed.generation}`);
    console.log(`  parent1:    ${result.childSeed.parent1}`);
    console.log(`  parent2:    ${result.childSeed.parent2}`);
    console.log(`  createdAt:  ${result.childSeed.createdAt}`);
  }
  console.log('\nRoyalties:');
  console.log(`  Total: ${(Number(result.royalties.totalAmount) / 1e18).toFixed(2)} PARA (${result.royalties.totalAmount} wei)`);
  result.royalties.transfers.forEach((t, i) => {
    console.log(`  Transfer ${i + 1}: to=${t.to} amount=${(Number(t.amount) / 1e18).toFixed(2)} PARA txHash=${t.txHash} block=${t.blockNumber} gas=${t.gasUsed}`);
  });
  console.log('\nFinal state:');
  console.log(`  Deployer PARA balance: ${(Number(result.paraBalanceDeployer) / 1e18).toFixed(2)} PARA`);
  console.log(`  Total gas used:       ${result.totalGasUsed} wei`);
  console.log('\nClaim:');
  console.log(`  ${result.claim}\n`);
  await result.nodeClose();
  process.exit(0);
}

main().catch((err) => {
  console.error('FAILED:', err);
  process.exit(1);
});
