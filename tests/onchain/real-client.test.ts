/**
 * Smoke test for the real on-chain client. Spawns a local hardhat node,
 * deploys PARA + SeedNFT, mints parents, breeds a child, and distributes
 * royalties. Every transaction is a real signed tx with real gas.
 */
// @vitest-environment node
import { describe, it, expect, afterAll } from 'vitest';
import { runLocalOnchainDemo, RealOnChainClient, startLocalHardhatNode } from '../../src/lib/contracts/onchain/real-client.js';

const nodeHandles: Array<{ close: () => Promise<void> }> = [];

afterAll(async () => {
  for (const n of nodeHandles) {
    try { await n.close(); } catch { /* swallow */ }
  }
});

describe('Real On-Chain Client — Hardhat Local Node', () => {
  it('Spawns hardhat node + deploys PARA + SeedNFT + mints + breeds + distributes royalties', async () => {
    const result = await runLocalOnchainDemo({ seedHashPrefix: 'smoke-' + Date.now().toString(36) });
    nodeHandles.push({ close: result.nodeClose });

    // Deploy
    expect(result.deploy.paraToken.address).toMatch(/^0x[0-9a-fA-F]{40}$/);
    expect(result.deploy.seedNFT.address).toMatch(/^0x[0-9a-fA-F]{40}$/);
    expect(result.deploy.deployer).toMatch(/^0x[0-9a-fA-F]{40}$/);
    expect(result.deploy.paraToken.deployTxHash).toMatch(/^0x[0-9a-fA-F]{64}$/);
    expect(result.deploy.seedNFT.deployTxHash).toMatch(/^0x[0-9a-fA-F]{64}$/);
    expect(result.deploy.chainId).toBe(31337);

    // Mints
    expect(result.mints).toHaveLength(2);
    expect(result.mints[0].tokenId).toBeGreaterThan(0);
    expect(result.mints[0].txHash).toMatch(/^0x[0-9a-fA-F]{64}$/);
    expect(result.mints[0].blockNumber).toBeGreaterThan(0);
    expect(Number(result.mints[0].gasUsed)).toBeGreaterThan(0);
    expect(result.mints[1].tokenId).toBeGreaterThan(result.mints[0].tokenId);

    // Breed
    expect(result.breeds).toHaveLength(1);
    expect(result.breeds[0].childTokenId).toBeGreaterThan(result.mints[1].tokenId);
    expect(result.breeds[0].txHash).toMatch(/^0x[0-9a-fA-F]{64}$/);
    expect(result.breeds[0].parentTokenIds).toEqual([result.mints[0].tokenId, result.mints[1].tokenId]);

    // Child on-chain state
    expect(result.childSeed).not.toBeNull();
    expect(result.childSeed?.domain).toBe('character');
    expect(result.childSeed?.generation).toBe(1); // (0+0)/2+1
    expect(result.childSeed?.parent1).toBe(result.mints[0].seedHash);
    expect(result.childSeed?.parent2).toBe(result.mints[1].seedHash);

    // Royalties
    expect(result.royalties.transfers).toHaveLength(2);
    expect(result.royalties.transfers[0].txHash).toMatch(/^0x[0-9a-fA-F]{64}$/);
    expect(result.royalties.transfers[0].amount).toBe('1000000000000000000'); // 1 PARA
    expect(result.royalties.totalAmount).toBe('2000000000000000000'); // 2 PARA

    // Balance
    expect(BigInt(result.paraBalanceDeployer)).toBeGreaterThan(0n);

    // Total gas
    expect(BigInt(result.totalGasUsed)).toBeGreaterThan(0n);

    // Claim string summarizes the full path
    expect(result.claim).toContain('REAL on-chain');
    expect(result.claim).toContain('chainId=31337');
  }, 60_000);

  it('Connects to an existing hardhat node and deploys contracts', async () => {
    const node = await startLocalHardhatNode();
    nodeHandles.push(node);
    const devKey = '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80';
    const client = await new RealOnChainClient({ rpcUrl: node.rpcUrl, privateKey: devKey }).init();

    expect(client.chainId).toBe(31337);
    expect(client.deployerAddress.toLowerCase()).toBe('0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266');

    const deploy = await client.deployAll({ nftName: 'Test NFT', nftSymbol: 'TEST' });
    expect(deploy.paraToken.address).toMatch(/^0x[0-9a-fA-F]{40}$/);
    expect(deploy.seedNFT.address).toMatch(/^0x[0-9a-fA-F]{40}$/);
    // PARA + SeedNFT should have distinct addresses
    expect(deploy.paraToken.address).not.toBe(deploy.seedNFT.address);

    // Verify on-chain
    const bal = await client.readParaBalance(deploy.deployer);
    expect(BigInt(bal)).toBeGreaterThanOrEqual(0n);
  }, 60_000);
});
