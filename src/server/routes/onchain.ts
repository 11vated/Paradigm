/**
 * Real On-Chain Routes — exposes the real-onchain-client over HTTP.
 *
 *   GET  /onchain/status          — local-node metrics + last demo result
 *   GET  /onchain/demo            — run a full real-onchain demo on a fresh local hardhat node
 *   POST /onchain/dial            — connect to an external RPC URL and run a demo
 *
 * Doctrine v2 requires the seed economy to be REAL on-chain. These routes
 * drive the full real path: hardhat node → deploy PARA + SeedNFT → mint
 * parents → breed child → distribute royalties, returning every signed
 * tx hash + gas used.
 */
import type { Request, Response } from 'express';
import { runLocalOnchainDemo, RealOnChainClient, startLocalHardhatNode, type LocalOnchainDemoResult } from '../../lib/contracts/onchain/real-client.js';
import { kernelNowIso } from '../../lib/kernel/clock.js';

interface OnchainState {
  lastDemo?: LocalOnchainDemoResult & { nodeClose: () => Promise<void> };
  lastRunAt: string;
  totalDemos: number;
  totalSignedTxs: number;
}

const state: OnchainState = {
  lastRunAt: '',
  totalDemos: 0,
  totalSignedTxs: 0,
};

export function registerOnchainRoutes(app: any): void {
  /**
   * GET /onchain/status
   * Returns current on-chain demo state + metrics.
   */
  app.get('/onchain/status', (_req: Request, res: Response) => {
    res.json({
      status: 'ready',
      lastRunAt: state.lastRunAt || null,
      totalDemos: state.totalDemos,
      totalSignedTxs: state.totalSignedTxs,
      lastDemoSummary: state.lastDemo ? {
        paraToken: state.lastDemo.deploy.paraToken.address,
        seedNFT: state.lastDemo.deploy.seedNFT.address,
        chainId: state.lastDemo.deploy.chainId,
        mints: state.lastDemo.mints.length,
        breeds: state.lastDemo.breeds.length,
        royaltyTransfers: state.lastDemo.royalties.transfers.length,
        totalGasUsed: state.lastDemo.totalGasUsed,
      } : null,
      claim: 'Real on-chain demo: hardhat node → deploy PARA + SeedNFT → mint 2 parents → breed 1 child → distribute PARA royalties (8 signed txs, ECDSA P-256 over secp256k1, ethers v6)',
    });
  });

  /**
   * GET /onchain/demo
   * Runs the full real-on-chain demo on a freshly-spawned local hardhat node.
   * Caches the result for /onchain/status to surface.
   */
  app.get('/onchain/demo', async (req: Request, res: Response) => {
    try {
      const result = await runLocalOnchainDemo({
        seedHashPrefix: (req.query.prefix as string) || `http-${Date.now().toString(36)}`,
      });
      state.lastDemo = result;
      state.lastRunAt = kernelNowIso();
      state.totalDemos += 1;
      const signedTxs =
        2 + // deploys
        result.mints.length +
        result.breeds.length +
        result.royalties.transfers.length;
      state.totalSignedTxs += signedTxs;

      // Don't include nodeClose in the HTTP response (it's a fn)
      const { nodeClose: _nc, ...rest } = result;
      res.json({
        ...rest,
        signedTxCount: signedTxs,
        protocol: 'EVM (local hardhat node, chainId=31337)',
        note: 'Returns real signed transaction hashes, block numbers, and gas used. Each tx is ECDSA-signed with the deployer key and mined into a real block.',
      });
    } catch (err: any) {
      res.status(500).json({ error: 'demo-failed', message: err?.message || String(err) });
    }
  });

  /**
   * POST /onchain/dial
   * Connects to an external RPC URL and runs a demo against it.
   * Body: { rpcUrl: string, privateKey?: string }
   * privateKey defaults to Hardhat Account #0 (dev only).
   */
  app.post('/onchain/dial', async (req: Request, res: Response) => {
    const { rpcUrl, privateKey } = req.body || {};
    if (!rpcUrl) {
      res.status(400).json({ error: 'missing-rpcUrl' });
      return;
    }
    try {
      const client = await new RealOnChainClient({
        rpcUrl,
        privateKey: privateKey || '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80',
      }).init();
      const deploy = await client.deployAll();
      const mint1 = await client.mintSeed({
        to: deploy.deployer,
        seedHash: `dial-p1-${Date.now().toString(36)}`,
        domain: 'character',
        generation: 0,
      });
      const mint2 = await client.mintSeed({
        to: deploy.deployer,
        seedHash: `dial-p2-${Date.now().toString(36)}`,
        domain: 'character',
        generation: 0,
      });
      const breed = await client.breedSeeds({
        to: deploy.deployer,
        parent1TokenId: mint1.tokenId,
        parent2TokenId: mint2.tokenId,
        childSeedHash: `dial-c-${Date.now().toString(36)}`,
      });
      const onePara = 1_000_000_000_000_000_000n;
      const royalties = await client.distributeRoyalties({
        seedHash: breed.childSeedHash,
        recipients: [deploy.deployer],
        amounts: [onePara],
      });
      res.json({
        deploy, mints: [mint1, mint2], breeds: [breed], royalties,
        claim: `Dialed external RPC ${rpcUrl}: deployed PARA+SeedNFT, minted 2, bred 1, distributed royalties — all real signed txs`,
      });
    } catch (err: any) {
      res.status(500).json({ error: 'dial-failed', message: err?.message || String(err) });
    }
  });

  /**
   * POST /onchain/spawn-node
   * Spawns a local hardhat node (no demo, just a node for downstream tools).
   * Body: { port?: number } — port defaults to a free port.
   * Returns: { rpcUrl, port, pid, close: fn-name-to-call }
   */
  app.post('/onchain/spawn-node', async (req: Request, res: Response) => {
    try {
      const node = await startLocalHardhatNode({ port: req.body?.port });
      res.json({
        rpcUrl: node.rpcUrl,
        port: node.port,
        pid: node.pid,
        message: 'Hardhat node ready. Connect with ethers/viem or use /onchain/demo for the full path.',
      });
    } catch (err: any) {
      res.status(500).json({ error: 'spawn-failed', message: err?.message || String(err) });
    }
  });

  console.log('[Onchain] Routes registered at /onchain/*');
}
