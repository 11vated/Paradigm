/**
 * Real On-Chain Client — Paradigm smart contracts over a live JSON-RPC node.
 *
 * Doctrine v2 requires the seed economy to be REAL on-chain (PARA, SeedNFT,
 * royalty distribution). Existing `prepareOnChainRoyalties` returns ASCII
 * placeholder calldata; this module performs real deploys + signed txs
 * against a live EVM node (default: local hardhat).
 *
 * The flow:
 *   1. `startLocalHardhatNode()` spawns `npx hardhat node` on a free port and
 *      waits for the JSON-RPC endpoint to become available.
 *   2. `RealOnChainClient` connects via ethers.JsonRpcProvider.
 *   3. `deployAll()` deploys PARA + SeedNFT, returning real addresses + tx
 *      hashes.
 *   4. `mintSeed(...)` / `breedSeeds(...)` perform signed ERC-721 mints.
 *   5. `distributeRoyalties(...)` does a real ERC-20 `transfer` per recipient
 *      with actual gas usage and block confirmation.
 *
 * Determinism contract: The on-chain layer is the ONE place where wall time
 * matters (block.timestamp). All other substrate layers (seed hashing,
 * signature payloads, royalty splits) remain deterministic.
 */
import { spawn, type ChildProcess } from 'node:child_process';
import { ethers } from 'ethers';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { createHash } from 'node:crypto';

// ─── Artifact Loading ────────────────────────────────────────────────────────

const ARTIFACTS_ROOT = path.join(process.cwd(), 'artifacts', 'contracts');

interface ContractArtifact {
  abi: any[];
  bytecode: string;
}

function loadArtifact(contractName: string): ContractArtifact {
  const dir = path.join(ARTIFACTS_ROOT, `${contractName}.sol`);
  const file = path.join(dir, `${contractName}.json`);
  if (!fs.existsSync(file)) {
    throw new Error(`Artifact not found: ${file} (run \`npx hardhat compile\` first)`);
  }
  const json = JSON.parse(fs.readFileSync(file, 'utf8'));
  return { abi: json.abi, bytecode: json.bytecode };
}

// ─── Local Hardhat Node ──────────────────────────────────────────────────────

export interface LocalNodeHandle {
  rpcUrl: string;
  port: number;
  pid: number;
  close: () => Promise<void>;
}

/**
 * Spawn `npx hardhat node` on a free port. Returns once the JSON-RPC
 * endpoint is responsive (with a configurable timeout). Idempotent close.
 */
export async function startLocalHardhatNode(opts?: { port?: number; timeoutMs?: number }): Promise<LocalNodeHandle> {
  const port = opts?.port ?? await findFreePort();
  const timeoutMs = opts?.timeoutMs ?? 30_000;

  // On Windows, spawn needs `npx.cmd`; on POSIX, plain `npx`. Prefer
  // direct invocation of the local hardhat binary to avoid the wrapper.
  const isWin = process.platform === 'win32';
  const hardhatBin = path.join(process.cwd(), 'node_modules', '.bin', isWin ? 'hardhat.cmd' : 'hardhat');
  const command = fs.existsSync(hardhatBin) ? hardhatBin : (isWin ? 'npx.cmd' : 'npx');
  const args = command.endsWith('hardhat') || command.endsWith('hardhat.cmd')
    ? ['node', '--port', String(port), '--hostname', '127.0.0.1']
    : ['hardhat', 'node', '--port', String(port), '--hostname', '127.0.0.1'];

  const child: ChildProcess = spawn(command, args, {
    stdio: ['ignore', 'pipe', 'pipe'],
    detached: false,
    cwd: process.cwd(),
    env: { ...process.env, FORCE_COLOR: '0' },
    // On Windows, .cmd / .bat require shell:true to execute
    shell: isWin && (command.endsWith('.cmd') || command.endsWith('.bat')),
  });

  // Wait for "Started HTTP and WebSocket JSON-RPC server at" line or
  // a successful eth_chainId call.
  const rpcUrl = `http://127.0.0.1:${port}`;
  const ready = new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`hardhat node not ready in ${timeoutMs}ms`)), timeoutMs);
    let buf = '';
    child.stdout?.on('data', (chunk: Buffer) => {
      buf += chunk.toString('utf8');
      if (buf.includes('JSON-RPC server')) {
        clearTimeout(timer);
        resolve();
      }
    });
    child.stderr?.on('data', (chunk: Buffer) => {
      buf += chunk.toString('utf8');
    });
    child.on('exit', (code) => {
      clearTimeout(timer);
      reject(new Error(`hardhat node exited with code ${code} before ready`));
    });
    // Fallback: poll the JSON-RPC endpoint
    const poll = setInterval(async () => {
      try {
        const r = await fetch(rpcUrl, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ jsonrpc: '2.0', method: 'eth_chainId', params: [], id: 1 }),
        });
        const j = await r.json() as any;
        if (j?.result) {
          clearInterval(poll);
          clearTimeout(timer);
          resolve();
        }
      } catch { /* not ready yet */ }
    }, 250);
  });

  try {
    await ready;
  } catch (err) {
    try { child.kill('SIGTERM'); } catch { /* swallow */ }
    throw err;
  }

  return {
    rpcUrl,
    port,
    pid: child.pid ?? -1,
    close: () => new Promise<void>((resolve) => {
      // Disconnect provider first to release handles, then kill child
      try { child.stdout?.destroy(); } catch { /* swallow */ }
      try { child.stderr?.destroy(); } catch { /* swallow */ }
      try { child.kill('SIGTERM'); } catch { /* swallow */ }
      let resolved = false;
      child.once('exit', () => { if (!resolved) { resolved = true; resolve(); } });
      // Hard timeout — SIGKILL
      setTimeout(() => {
        if (!resolved) {
          try { child.kill('SIGKILL'); } catch { /* swallow */ }
          resolved = true;
          resolve();
        }
      }, 2000);
    }),
  };
}

async function findFreePort(): Promise<number> {
  const net = await import('node:net');
  return new Promise<number>((resolve, reject) => {
    const s = net.createServer();
    s.once('error', reject);
    s.listen(0, '127.0.0.1', () => {
      const port = (s.address() as any).port;
      s.close(() => resolve(port));
    });
  });
}

// ─── Real On-Chain Client ────────────────────────────────────────────────────

export interface DeployedContracts {
  paraToken: { address: string; deployTxHash: string };
  seedNFT: { address: string; deployTxHash: string };
  deployer: string;
  chainId: number;
}

export interface SignedMintResult {
  tokenId: number;
  txHash: string;
  blockNumber: number;
  gasUsed: string;
  seedHash: string;
  to: string;
}

export interface SignedBreedResult {
  childTokenId: number;
  txHash: string;
  blockNumber: number;
  gasUsed: string;
  parentTokenIds: [number, number];
  childSeedHash: string;
}

export interface RoyaltyDistributionResult {
  seedHash: string;
  totalAmount: string;
  transfers: Array<{
    to: string;
    amount: string;
    txHash: string;
    blockNumber: number;
    gasUsed: string;
  }>;
  totalGasUsed: string;
}

export class RealOnChainClient {
  private provider: ethers.JsonRpcProvider;
  private signer: ethers.Wallet;
  private paraToken: ethers.Contract | null = null;
  private seedNFT: ethers.Contract | null = null;
  /** Manually-tracked next nonce (avoids hardhat-node `getTransactionCount` race) */
  private nextNonce: number | null = null;
  public readonly chainId: number = 0;
  public readonly deployerAddress: string;
  public readonly rpcUrl: string;

  constructor(opts: { rpcUrl: string; privateKey: string }) {
    this.rpcUrl = opts.rpcUrl;
    this.provider = new ethers.JsonRpcProvider(opts.rpcUrl);
    this.signer = new ethers.Wallet(opts.privateKey, this.provider);
    this.deployerAddress = this.signer.address;
  }

  /** Connect to the chain (waits for network info) and cache chainId. */
  async init(): Promise<this> {
    const net = await this.provider.getNetwork();
    (this as { chainId: number }).chainId = Number(net.chainId);
    return this;
  }

  /**
   * Returns the next nonce, preferring our local counter over
   * `getTransactionCount` (hardhat-node has a known race between mining
   * and JSON-RPC state propagation). On the first call, syncs from chain.
   */
  private async getFreshNonce(): Promise<number> {
    if (this.nextNonce === null) {
      this.nextNonce = await this.provider.getTransactionCount(this.signer.address, 'pending');
    }
    const n = this.nextNonce;
    this.nextNonce = n + 1;
    return n;
  }

  /** Deploy PARA + SeedNFT, returning real addresses + tx hashes. */
  async deployAll(opts?: { paraName?: string; nftName?: string; nftSymbol?: string; baseURI?: string; royaltyBps?: number }): Promise<DeployedContracts> {
    const paraArtifact = loadArtifact('ParaToken');
    const seedArtifact = loadArtifact('SeedNFT');

    // Deploy PARA — explicit nonce
    const paraNonce = await this.getFreshNonce();
    const paraFactory = new ethers.ContractFactory(paraArtifact.abi, paraArtifact.bytecode, this.signer);
    const paraTokenRaw = await paraFactory.getDeployTransaction();
    const paraTx = await this.signer.sendTransaction({ ...paraTokenRaw, nonce: paraNonce });
    const paraReceipt = await paraTx.wait();
    if (!paraReceipt) throw new Error('PARA deploy tx not mined');
    const paraToken = new ethers.Contract(paraReceipt.contractAddress!, paraArtifact.abi, this.signer);

    // Deploy SeedNFT — next nonce
    const seedNonce = await this.getFreshNonce();
    const seedFactory = new ethers.ContractFactory(seedArtifact.abi, seedArtifact.bytecode, this.signer);
    const seedNftRaw = await seedFactory.getDeployTransaction(
      opts?.nftName ?? 'Paradigm Seed',
      opts?.nftSymbol ?? 'PSEED',
      opts?.baseURI ?? 'https://api.paradigm.art/seeds/',
      this.deployerAddress,
      opts?.royaltyBps ?? 250
    );
    const seedTx = await this.signer.sendTransaction({ ...seedNftRaw, nonce: seedNonce });
    const seedReceipt = await seedTx.wait();
    if (!seedReceipt) throw new Error('SeedNFT deploy tx not mined');
    const seedNFT = new ethers.Contract(seedReceipt.contractAddress!, seedArtifact.abi, this.signer);

    this.paraToken = paraToken as unknown as ethers.Contract;
    this.seedNFT = seedNFT as unknown as ethers.Contract;

    return {
      paraToken: { address: await paraToken.getAddress(), deployTxHash: paraTx.hash },
      seedNFT: { address: await seedNFT.getAddress(), deployTxHash: seedTx.hash },
      deployer: this.deployerAddress,
      chainId: this.chainId,
    };
  }

  /** Mint a seed NFT — returns real tx hash, block number, and gas used. */
  async mintSeed(opts: {
    to: string;
    seedHash: string;
    domain: string;
    genetics?: string;
    uri?: string;
    parent1Hash?: string;
    parent2Hash?: string;
    generation?: number;
  }): Promise<SignedMintResult> {
    if (!this.seedNFT) throw new Error('SeedNFT not deployed — call deployAll() first');
    const nonce = await this.getFreshNonce();
    const data = (this.seedNFT as any).interface.encodeFunctionData('mintSeed', [
      opts.to,
      opts.seedHash,
      opts.domain,
      opts.genetics ?? '0x',
      opts.uri ?? `ipfs://paradigm/${opts.seedHash}`,
      opts.parent1Hash ?? '',
      opts.parent2Hash ?? '',
      opts.generation ?? 0,
    ]);
    const tx = await this.signer.sendTransaction({
      to: await this.seedNFT.getAddress(),
      data,
      nonce,
    });
    const receipt = await tx.wait();
    if (!receipt) throw new Error('mintSeed tx not mined');
    // Extract tokenId from SeedMinted event
    let tokenId = 0;
    try {
      const event = receipt.logs
        .map((log: any) => { try { return (this.seedNFT as any).interface.parseLog(log); } catch { return null; } })
        .find((e: any) => e?.name === 'SeedMinted');
      tokenId = event ? Number(event.args.tokenId) : 0;
    } catch { /* swallow: tokenId defaults to 0 */ }

    return {
      tokenId,
      txHash: receipt.hash,
      blockNumber: receipt.blockNumber,
      gasUsed: receipt.gasUsed.toString(),
      seedHash: opts.seedHash,
      to: opts.to,
    };
  }

  /** Breed two seed NFTs — returns real signed tx result. */
  async breedSeeds(opts: {
    to: string;
    parent1TokenId: number;
    parent2TokenId: number;
    childSeedHash: string;
    childGenetics?: string;
    childUri?: string;
  }): Promise<SignedBreedResult> {
    if (!this.seedNFT) throw new Error('SeedNFT not deployed — call deployAll() first');
    const nonce = await this.getFreshNonce();
    const data = (this.seedNFT as any).interface.encodeFunctionData('breedSeeds', [
      opts.to,
      opts.parent1TokenId,
      opts.parent2TokenId,
      opts.childSeedHash,
      opts.childGenetics ?? '0x',
      opts.childUri ?? `ipfs://paradigm/${opts.childSeedHash}`,
    ]);
    const tx = await this.signer.sendTransaction({
      to: await this.seedNFT.getAddress(),
      data,
      nonce,
    });
    const receipt = await tx.wait();
    if (!receipt) throw new Error('breedSeeds tx not mined');
    let childTokenId = 0;
    try {
      const event = receipt.logs
        .map((log: any) => { try { return (this.seedNFT as any).interface.parseLog(log); } catch { return null; } })
        .find((e: any) => e?.name === 'SeedBred');
      childTokenId = event ? Number(event.args.tokenId) : 0;
    } catch { /* swallow */ }

    return {
      childTokenId,
      txHash: receipt.hash,
      blockNumber: receipt.blockNumber,
      gasUsed: receipt.gasUsed.toString(),
      parentTokenIds: [opts.parent1TokenId, opts.parent2TokenId],
      childSeedHash: opts.childSeedHash,
    };
  }

  /**
   * Distribute PARA royalties to a list of recipients. Performs a real
   * ERC-20 `transfer` for each recipient, returning per-tx hashes and
   * total gas used.
   */
  async distributeRoyalties(opts: {
    seedHash: string;
    recipients: string[];
    amounts: bigint[]; // wei
  }): Promise<RoyaltyDistributionResult> {
    if (!this.paraToken) throw new Error('ParaToken not deployed — call deployAll() first');
    if (opts.recipients.length !== opts.amounts.length) {
      throw new Error('recipients/amounts length mismatch');
    }

    // Ensure deployer has enough PARA — mint from MINTER_ROLE if needed.
    // ParaToken constructor pre-mints to fixed wallets, not the deployer.
    const totalNeeded = opts.amounts.reduce((s, a) => s + a, 0n);
    const currentBal: bigint = await (this.paraToken as any).balanceOf(this.deployerAddress);
    if (currentBal < totalNeeded) {
      const mintAmount = totalNeeded - currentBal;
      const mintNonce = await this.getFreshNonce();
      const mintData = (this.paraToken as any).interface.encodeFunctionData('mint', [this.deployerAddress, mintAmount]);
      const mintTx = await this.signer.sendTransaction({
        to: await this.paraToken.getAddress(),
        data: mintData,
        nonce: mintNonce,
      });
      const mintReceipt = await mintTx.wait();
      if (!mintReceipt || mintReceipt.status !== 1) throw new Error('PARA mint failed (check MINTER_ROLE)');
    }

    const transfers: RoyaltyDistributionResult['transfers'] = [];
    let totalGas = 0n;
    for (let i = 0; i < opts.recipients.length; i++) {
      const nonce = await this.getFreshNonce();
      const data = (this.paraToken as any).interface.encodeFunctionData('transfer', [opts.recipients[i], opts.amounts[i]]);
      const tx = await this.signer.sendTransaction({
        to: await this.paraToken.getAddress(),
        data,
        nonce,
      });
      const receipt = await tx.wait();
      if (!receipt) throw new Error(`royalty transfer ${i} not mined`);
      const gas = BigInt(receipt.gasUsed.toString());
      totalGas += gas;
      transfers.push({
        to: opts.recipients[i],
        amount: opts.amounts[i].toString(),
        txHash: receipt.hash,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed.toString(),
      });
    }

    return {
      seedHash: opts.seedHash,
      totalAmount: totalNeeded.toString(),
      transfers,
      totalGasUsed: totalGas.toString(),
    };
  }

  /** Read on-chain seed data for a given tokenId. */
  async readSeed(tokenId: number): Promise<{
    seedHash: string; domain: string; generation: number;
    creator: string; createdAt: number; parent1: string; parent2: string;
  } | null> {
    if (!this.seedNFT) throw new Error('SeedNFT not deployed — call deployAll() first');
    try {
      const d = await this.seedNFT.seedData(tokenId);
      return {
        seedHash: d.seedHash,
        domain: d.domain,
        generation: Number(d.generation),
        creator: d.creator,
        createdAt: Number(d.createdAt),
        parent1: d.parent1,
        parent2: d.parent2,
      };
    } catch {
      return null;
    }
  }

  /** Read on-chain PARA balance for an address. */
  async readParaBalance(address: string): Promise<string> {
    if (!this.paraToken) throw new Error('ParaToken not deployed — call deployAll() first');
    const b = await this.paraToken.balanceOf(address);
    return b.toString();
  }
}

// ─── Local Demo Driver ───────────────────────────────────────────────────────

export interface LocalOnchainDemoResult {
  deploy: DeployedContracts;
  mints: SignedMintResult[];
  breeds: SignedBreedResult[];
  royalties: RoyaltyDistributionResult;
  childSeed: Awaited<ReturnType<RealOnChainClient['readSeed']>>;
  paraBalanceDeployer: string;
  totalGasUsed: string;
  chainId: number;
  claim: string;
}

/**
 * Full real-onchain demo: spin up a local hardhat node, deploy PARA + SeedNFT,
 * mint 2 parent seeds, breed a child, then distribute PARA royalties. Returns
 * every signed tx hash, block number, and gas used.
 */
export async function runLocalOnchainDemo(opts?: { port?: number; seedHashPrefix?: string }): Promise<LocalOnchainDemoResult & { nodeClose: () => Promise<void> }> {
  const node = await startLocalHardhatNode({ port: opts?.port });
  // Hardhat default Account #0 — public for dev/local only
  const devKey = '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80';
  const client = await new RealOnChainClient({ rpcUrl: node.rpcUrl, privateKey: devKey }).init();

  const seedHashPrefix = opts?.seedHashPrefix ?? `demo-${Date.now().toString(36)}`;

  // Deploy
  const deploy = await client.deployAll();

  // Mint 2 parents + 1 child via breed
  const parent1 = await client.mintSeed({
    to: deploy.deployer,
    seedHash: `${seedHashPrefix}-p1-${createHash('sha256').update('p1').digest('hex').slice(0, 8)}`,
    domain: 'character',
    generation: 0,
  });
  const parent2 = await client.mintSeed({
    to: deploy.deployer,
    seedHash: `${seedHashPrefix}-p2-${createHash('sha256').update('p2').digest('hex').slice(0, 8)}`,
    domain: 'character',
    generation: 0,
  });
  const childSeedHash = `${seedHashPrefix}-c-${createHash('sha256').update('child').digest('hex').slice(0, 8)}`;
  const breeds = [await client.breedSeeds({
    to: deploy.deployer,
    parent1TokenId: parent1.tokenId,
    parent2TokenId: parent2.tokenId,
    childSeedHash,
  })];

  // Distribute PARA royalties to 2 recipients (1 PARA each = 1e18 wei)
  const onePara = 1_000_000_000_000_000_000n; // 1 PARA
  const royalties = await client.distributeRoyalties({
    seedHash: childSeedHash,
    recipients: [deploy.deployer, deploy.deployer], // self-transfer for demo
    amounts: [onePara, onePara],
  });

  // Read back child on-chain state
  const childSeed = breeds[0]?.childTokenId ? await client.readSeed(breeds[0].childTokenId) : null;
  const paraBalanceDeployer = await client.readParaBalance(deploy.deployer);

  // Total gas across all txs
  const allGas = [
    ...[parent1, parent2].map(m => BigInt(m.gasUsed)),
    ...breeds.map(b => BigInt(b.gasUsed)),
    ...royalties.transfers.map(t => BigInt(t.gasUsed)),
  ];
  const totalGas = allGas.reduce((s, g) => s + g, 0n).toString();

  return {
    deploy,
    mints: [parent1, parent2],
    breeds,
    royalties,
    childSeed,
    paraBalanceDeployer,
    totalGasUsed: totalGas,
    chainId: deploy.chainId,
    claim: `REAL on-chain demo: deployed PARA(${deploy.paraToken.address.slice(0, 10)}…) + SeedNFT(${deploy.seedNFT.address.slice(0, 10)}…), minted 2 parents, bred 1 child (tokenId=${breeds[0]?.childTokenId}), distributed ${(Number(royalties.totalAmount) / 1e18).toFixed(2)} PARA in royalties across ${royalties.transfers.length} signed txs, totalGas=${totalGas} wei, chainId=${deploy.chainId}`,
    nodeClose: node.close,
  };
}

