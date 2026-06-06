/**
 * Property tests for the real on-chain client. Spawns ONE local hardhat node
 * for the whole suite and reuses it across all tests, tracking nonces
 * carefully.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { RealOnChainClient, startLocalHardhatNode, type LocalNodeHandle } from '../../src/lib/contracts/onchain/real-client.js';

let node: LocalNodeHandle;
let client: RealOnChainClient;

const devKey = '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80';

beforeAll(async () => {
  node = await startLocalHardhatNode();
  client = await new RealOnChainClient({ rpcUrl: node.rpcUrl, privateKey: devKey }).init();
}, 60_000);

afterAll(async () => {
  if (node) await node.close();
});

describe('Real On-Chain Client — Property Tests', () => {
  it('connects to the local hardhat node and reports chainId 31337', () => {
    expect(client.chainId).toBe(31337);
    expect(client.deployerAddress.toLowerCase()).toBe('0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266');
  });

  it('deploys PARA + SeedNFT and returns valid addresses + tx hashes', async () => {
    const deploy = await client.deployAll();
    expect(deploy.paraToken.address).toMatch(/^0x[0-9a-fA-F]{40}$/);
    expect(deploy.seedNFT.address).toMatch(/^0x[0-9a-fA-F]{40}$/);
    expect(deploy.paraToken.address).not.toBe(deploy.seedNFT.address);
    expect(deploy.paraToken.deployTxHash).toMatch(/^0x[0-9a-fA-F]{64}$/);
    expect(deploy.seedNFT.deployTxHash).toMatch(/^0x[0-9a-fA-F]{64}$/);
    expect(deploy.deployer).toBe(client.deployerAddress);
  }, 30_000);

  it('mints 4 seeds and returns monotonic tokenIds with real txs', async () => {
    const results = [];
    for (let i = 0; i < 4; i++) {
      const r = await client.mintSeed({
        to: client.deployerAddress,
        seedHash: `prop-mint-${i}-${Date.now().toString(36)}`,
        domain: 'character',
        generation: i,
      });
      expect(r.tokenId).toBeGreaterThan(0);
      expect(r.txHash).toMatch(/^0x[0-9a-fA-F]{64}$/);
      expect(r.blockNumber).toBeGreaterThan(0);
      expect(Number(r.gasUsed)).toBeGreaterThan(0);
      results.push(r);
    }
    // tokenIds are monotonic (each new mint = next ID)
    for (let i = 1; i < results.length; i++) {
      expect(results[i].tokenId).toBeGreaterThan(results[i - 1].tokenId);
    }
  }, 60_000);

  it('breeds two parents and the child has the correct lineage on-chain', async () => {
    // Mint two parents
    const p1 = await client.mintSeed({
      to: client.deployerAddress,
      seedHash: `prop-p1-${Date.now().toString(36)}`,
      domain: 'character',
      generation: 0,
    });
    const p2 = await client.mintSeed({
      to: client.deployerAddress,
      seedHash: `prop-p2-${Date.now().toString(36)}`,
      domain: 'character',
      generation: 0,
    });

    // Breed
    const childHash = `prop-c-${Date.now().toString(36)}`;
    const child = await client.breedSeeds({
      to: client.deployerAddress,
      parent1TokenId: p1.tokenId,
      parent2TokenId: p2.tokenId,
      childSeedHash: childHash,
    });
    expect(child.childTokenId).toBeGreaterThan(p2.tokenId);
    expect(child.parentTokenIds).toEqual([p1.tokenId, p2.tokenId]);

    // Read on-chain state
    const onChain = await client.readSeed(child.childTokenId);
    expect(onChain).not.toBeNull();
    expect(onChain?.seedHash).toBe(childHash);
    expect(onChain?.parent1).toBe(p1.seedHash);
    expect(onChain?.parent2).toBe(p2.seedHash);
    expect(onChain?.generation).toBe(1); // (0+0)/2+1
    expect(onChain?.domain).toBe('character');
  }, 60_000);

  it('distributes PARA royalties across multiple recipients with real signed txs', async () => {
    const onePara = 1_000_000_000_000_000_000n; // 1 PARA
    const r = await client.distributeRoyalties({
      seedHash: `prop-royalty-${Date.now().toString(36)}`,
      recipients: [client.deployerAddress, client.deployerAddress, client.deployerAddress],
      amounts: [onePara, onePara, onePara],
    });
    expect(r.transfers).toHaveLength(3);
    for (const t of r.transfers) {
      expect(t.txHash).toMatch(/^0x[0-9a-fA-F]{64}$/);
      expect(t.blockNumber).toBeGreaterThan(0);
      expect(Number(t.gasUsed)).toBeGreaterThan(0);
      expect(t.amount).toBe(onePara.toString());
    }
    expect(r.totalAmount).toBe((onePara * 3n).toString());
  }, 60_000);

  it('rejects distributions when recipients/amounts length mismatch', async () => {
    await expect(
      client.distributeRoyalties({
        seedHash: 'mismatch',
        recipients: [client.deployerAddress],
        amounts: [1n, 2n],
      })
    ).rejects.toThrow(/length mismatch/);
  });
});
