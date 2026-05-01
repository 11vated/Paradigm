/**
 * Sovereignty adapters (Phase 7.2).
 *
 * This module defines three small interfaces — Signer, Anchor, Pin — and
 * ships a complete set of *local, deterministic* implementations for each.
 * The real-chain / real-IPFS / real-Arweave backends sit behind the same
 * interfaces and are drop-in replacements once configured.
 *
 * Why this split?
 *
 *   - Tests, dev environments, and CI should never need a funded wallet, an
 *     Arweave key, or an IPFS node. The Local* adapters produce real, valid
 *     artifacts deterministically so the whole pipeline exercises end-to-end.
 *   - Production swaps in BaseL2Anchor + ArweavePin (+ optionally IPFSPin as
 *     a secondary) without touching the orchestrating code.
 *   - No mocks: the Local adapters are genuine implementations of the
 *     interface contract, not stubbed-out nothing. This honors the project's
 *     no-placeholder rule — you can actually run a sovereignty flow with zero
 *     external services and inspect the receipts.
 *
 * Appendix D decisions baked in:
 *   - Chain: Base L2 (chain ID 8453 mainnet, 84532 sepolia).
 *   - Pinning: Arweave primary (permanence), IPFS secondary (speed).
 *   - Signer: EIP-712 typed data (EthersWalletSigner) or deterministic HMAC
 *     for local/dev.
 */

import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { canonicalizeSeed, seedDigestBytes32 } from './canonical.js';

// ─── Shared types ──────────────────────────────────────────────────────────

export interface SovereigntySignature {
  /** Signer identity — address for EthersWalletSigner, key id for HMAC. */
  signer: string;
  /** Hex bytes of the signature itself (no 0x trimming — always 0x-prefixed). */
  signature: `0x${string}`;
  /** Algorithm id so downstream verifiers know which curve/scheme to use. */
  algorithm: 'eip712-ecdsa' | 'local-hmac-sha256';
  /** What was signed: the canonical JSON of the seed. */
  canonicalJson: string;
  /** The SHA-256 of canonicalJson, as 0x-prefixed bytes32. */
  digest: `0x${string}`;
  /** ISO 8601 wall-clock timestamp the signer recorded. */
  signedAt: string;
  /** Optional domain/chain hint — useful when mixing chains. */
  domain?: { name: string; version: string; chainId: number };
}

export interface SovereigntyAnchorReceipt {
  /** Network the anchor lives on. */
  network: string;
  /** Chain id (8453 = Base mainnet, 84532 = Base Sepolia, 0 = local). */
  chainId: number;
  /** The ERC-721 token id (decimal string — tokens can exceed JS number range). */
  tokenId: string;
  /** Transaction hash, or a deterministic synthetic hash for local adapters. */
  transactionHash: `0x${string}`;
  /** Block number if known (null for local/dry-run). */
  blockNumber: number | null;
  /** The metadata URI that was anchored. */
  metadataUri: string;
  /** The 32-byte canonical seed hash that was anchored. */
  seedDigest: `0x${string}`;
  /** Owner address. */
  owner: string;
  /** ISO 8601 timestamp from the adapter (not the chain). */
  anchoredAt: string;
  /** Whether this is a real chain submission or a dry-run. */
  dryRun: boolean;
}

export interface SovereigntyPinReceipt {
  /** Pinning backend id. */
  backend: 'local-file' | 'arweave' | 'ipfs';
  /** Canonical URI that can be resolved later (file://, ar://, ipfs://). */
  uri: string;
  /** Gateway URL for human access (Arweave/IPFS HTTP gateway), if known. */
  gatewayUrl?: string;
  /** Size in bytes of what was pinned. */
  sizeBytes: number;
  /** SHA-256 of the pinned content — lets callers verify integrity. */
  contentDigest: `0x${string}`;
  /** ISO 8601 timestamp. */
  pinnedAt: string;
}

// ─── Signer ────────────────────────────────────────────────────────────────

export interface SovereigntySigner {
  /** A stable identifier for this signer (address, key id, etc.). */
  readonly id: string;
  /** Produce a signature over the canonical seed digest. */
  sign(seed: unknown): Promise<SovereigntySignature>;
  /**
   * Verify a signature against the current canonical form of the seed.
   * Implementations must re-canonicalize the seed themselves — verification
   * using a passed-in digest is explicitly rejected to prevent spoofing.
   */
  verify(seed: unknown, signature: SovereigntySignature): Promise<boolean>;
}

/**
 * Deterministic HMAC-SHA256 signer. Uses a static key (or one passed in) to
 * produce signatures that verify only against the same key. Intended for
 * local dev, tests, and airgapped setups.
 *
 * Why HMAC and not ECDSA for the local case?
 *   - HMAC is deterministic with no external entropy — same input + same key
 *     always → same signature. That lets tests pin golden signatures.
 *   - It still exercises the full signer contract (id, sign, verify).
 *   - When a real wallet is wired in (EthersWalletSigner), the interface
 *     flips over cleanly.
 *
 * This is NOT an on-chain-valid signature. Code paths that need to submit to
 * Base MUST use EthersWalletSigner.
 */
export class LocalHmacSigner implements SovereigntySigner {
  readonly id: string;
  private readonly key: Buffer;

  constructor(opts: { id?: string; key?: string | Buffer } = {}) {
    this.id = opts.id ?? 'local-hmac';
    if (opts.key === undefined) {
      // Deterministic default so tests can pin signatures, but users wanting
      // secrecy should pass their own.
      this.key = Buffer.from('paradigm-local-hmac-default-key', 'utf8');
    } else if (typeof opts.key === 'string') {
      this.key = Buffer.from(opts.key, 'utf8');
    } else {
      this.key = opts.key;
    }
  }

  async sign(seed: unknown): Promise<SovereigntySignature> {
    const { canonicalJson, digest } = canonicalizeSeed(seed);
    const mac = crypto.createHmac('sha256', this.key).update(canonicalJson, 'utf8').digest('hex');
    return {
      signer: this.id,
      signature: `0x${mac}` as `0x${string}`,
      algorithm: 'local-hmac-sha256',
      canonicalJson,
      digest: `0x${digest}` as `0x${string}`,
      // Wall-clock is intentional — consumers can use `signedAt` for display.
      // The digest is what binds identity; signedAt isn't covered by the MAC,
      // which matches how on-chain signing also leaves timestamps off-chain.
      signedAt: new Date().toISOString(),
    };
  }

  async verify(seed: unknown, signature: SovereigntySignature): Promise<boolean> {
    if (signature.algorithm !== 'local-hmac-sha256') return false;
    if (signature.signer !== this.id) return false;
    const { canonicalJson, digest } = canonicalizeSeed(seed);
    // Sanity: the digest in the signature must match the recomputed digest.
    if (signature.digest.toLowerCase() !== `0x${digest}`) return false;
    const expected = crypto.createHmac('sha256', this.key).update(canonicalJson, 'utf8').digest('hex');
    // Constant-time compare — not strictly necessary for integrity, but keeps
    // the verify path from leaking bit-by-bit timing info under attack.
    const a = Buffer.from(expected, 'hex');
    const bHex = signature.signature.startsWith('0x') ? signature.signature.slice(2) : signature.signature;
    if (bHex.length !== expected.length) return false;
    const b = Buffer.from(bHex, 'hex');
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(a, b);
  }
}

/**
 * Real EIP-712 ECDSA signer using ethers.js. Not instantiated in dev/test
 * paths — the factory below throws if ethers isn't installed. When wired,
 * signatures produced here are valid on-chain against the Base L2 verifier.
 *
 * The EIP-712 typed-data shape pins:
 *   - domain: Paradigm Sovereignty, v1, chain id
 *   - message: { digest: bytes32, signedAt: uint256 }
 *
 * We explicitly put `signedAt` inside the message so it IS covered by the
 * signature — unlike HMAC where we leave it off. On-chain, we want the
 * timestamp to be part of the attestation.
 */
export interface EthersWalletSignerOptions {
  /** 0x-prefixed 64-char hex private key. */
  privateKey: string;
  /** Chain id for the EIP-712 domain. Defaults to Base mainnet. */
  chainId?: number;
}

export async function createEthersWalletSigner(
  opts: EthersWalletSignerOptions,
): Promise<SovereigntySigner> {
  const ethers = await import('ethers').catch(() => null);
  if (!ethers) {
    throw new Error(
      'EthersWalletSigner requires the `ethers` package. Install it or use LocalHmacSigner.',
    );
  }
  const chainId = opts.chainId ?? 8453;
  const wallet = new ethers.Wallet(opts.privateKey);

  const domain = {
    name: 'Paradigm Sovereignty',
    version: '1',
    chainId,
  };
  const types = {
    SeedAttestation: [
      { name: 'digest', type: 'bytes32' },
      { name: 'signedAt', type: 'uint256' },
    ],
  };

  const signer: SovereigntySigner = {
    id: wallet.address,
    async sign(seed: unknown) {
      const { canonicalJson, digest } = canonicalizeSeed(seed);
      const signedAtSec = Math.floor(Date.now() / 1000);
      const sig = await wallet.signTypedData(domain, types, {
        digest: `0x${digest}`,
        signedAt: signedAtSec,
      });
      return {
        signer: wallet.address,
        signature: sig as `0x${string}`,
        algorithm: 'eip712-ecdsa',
        canonicalJson,
        digest: `0x${digest}` as `0x${string}`,
        signedAt: new Date(signedAtSec * 1000).toISOString(),
        domain: { name: domain.name, version: domain.version, chainId: domain.chainId },
      };
    },
    async verify(seed: unknown, signature: SovereigntySignature) {
      if (signature.algorithm !== 'eip712-ecdsa') return false;
      const { digest } = canonicalizeSeed(seed);
      if (signature.digest.toLowerCase() !== `0x${digest}`) return false;
      const signedAtSec = Math.floor(new Date(signature.signedAt).getTime() / 1000);
      try {
        const recovered = ethers.verifyTypedData(
          signature.domain ?? domain,
          types,
          { digest: signature.digest, signedAt: signedAtSec },
          signature.signature,
        );
        return recovered.toLowerCase() === signature.signer.toLowerCase();
      } catch {
        return false;
      }
    },
  };
  return signer;
}

// ─── Anchor ────────────────────────────────────────────────────────────────

export interface SovereigntyAnchor {
  readonly id: string;
  /**
   * Submit a seed's digest + metadata URI as an on-chain (or simulated)
   * attestation. Returns a receipt describing where it went and under what
   * token id. Idempotent only in dryRun; on-chain calls cost gas.
   */
  anchor(input: {
    seed: unknown;
    metadataUri: string;
    owner: string;
  }): Promise<SovereigntyAnchorReceipt>;

  /** Fetch the last receipt for a seed, if the backend remembers. */
  lookup(seedDigest: `0x${string}`): Promise<SovereigntyAnchorReceipt | null>;
}

/**
 * Local dry-run anchor. Writes receipts to an in-memory ledger keyed by seed
 * digest. Deterministic tx hashes let tests pin receipts byte-for-byte.
 *
 * The "token id" is derived from the first 16 hex chars of the digest, which
 * matches what the real Base anchor does in `prepareMint()`. That means a
 * dev can run the full flow locally, get a token id, and then later wire the
 * same seed into Base L2 and see the same token id — no surprise renumbering.
 */
export class LocalDryRunAnchor implements SovereigntyAnchor {
  readonly id = 'local-dry-run';
  private ledger = new Map<string, SovereigntyAnchorReceipt>();

  async anchor(input: {
    seed: unknown;
    metadataUri: string;
    owner: string;
  }): Promise<SovereigntyAnchorReceipt> {
    const digest = seedDigestBytes32(input.seed);
    const tokenId = BigInt(digest.slice(0, 18)).toString(); // first 8 bytes
    // Synthetic tx hash: sha256(digest || metadataUri || owner). Deterministic.
    const txPayload = `${digest}|${input.metadataUri}|${input.owner}`;
    const txHash = `0x${crypto.createHash('sha256').update(txPayload, 'utf8').digest('hex')}` as `0x${string}`;
    const receipt: SovereigntyAnchorReceipt = {
      network: 'local',
      chainId: 0,
      tokenId,
      transactionHash: txHash,
      blockNumber: null,
      metadataUri: input.metadataUri,
      seedDigest: digest,
      owner: input.owner,
      anchoredAt: new Date().toISOString(),
      dryRun: true,
    };
    this.ledger.set(digest.toLowerCase(), receipt);
    return receipt;
  }

  async lookup(seedDigest: `0x${string}`): Promise<SovereigntyAnchorReceipt | null> {
    return this.ledger.get(seedDigest.toLowerCase()) ?? null;
  }
}

/**
 * Base L2 anchor (mainnet: 8453, sepolia: 84532). Lazy-loads ethers + the
 * ERC-721 ABI so dev environments without the dependency aren't forced to
 * pull it. Real transactions require a funded wallet and deployed contract.
 *
 * This is intentionally thin: it's the minimal code path that turns a
 * Signer-produced digest into an ERC-721 token on Base. The heavier metadata
 * building lives in onchain.ts — we *could* fold it in here, but keeping it
 * separate means the adapter interface stays narrow and testable.
 */
export interface BaseL2AnchorOptions {
  privateKey: string;
  contractAddress: string;
  rpcUrl?: string;
  chainId?: number;
}

const BASE_L2_ABI = [
  'function mint(address to, string uri, bytes32 seedHash) external returns (uint256)',
  'function seedHash(uint256 tokenId) external view returns (bytes32)',
  'function ownerOf(uint256 tokenId) external view returns (address)',
  'event SeedMinted(uint256 indexed tokenId, bytes32 seedHash, string domain)',
];

export async function createBaseL2Anchor(opts: BaseL2AnchorOptions): Promise<SovereigntyAnchor> {
  const ethers = await import('ethers').catch(() => null);
  if (!ethers) {
    throw new Error('BaseL2Anchor requires the `ethers` package. Install it or use LocalDryRunAnchor.');
  }
  const chainId = opts.chainId ?? 8453;
  const rpcUrl = opts.rpcUrl ?? (chainId === 8453
    ? 'https://mainnet.base.org'
    : 'https://sepolia.base.org');
  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const wallet = new ethers.Wallet(opts.privateKey, provider);
  const contract = new ethers.Contract(opts.contractAddress, BASE_L2_ABI, wallet);

  return {
    id: `base-l2:${chainId}`,
    async anchor(input) {
      const digest = seedDigestBytes32(input.seed);
      const tx = await contract.mint(input.owner, input.metadataUri, digest);
      const receipt = await tx.wait();
      // The token id is emitted by SeedMinted — parse from logs.
      let tokenId = BigInt(digest.slice(0, 18)).toString();
      for (const log of receipt?.logs ?? []) {
        try {
          const parsed = contract.interface.parseLog(log);
          if (parsed?.name === 'SeedMinted') {
            tokenId = parsed.args[0].toString();
            break;
          }
        } catch {
          // non-matching log, ignore
        }
      }
      return {
        network: chainId === 8453 ? 'base' : 'base-sepolia',
        chainId,
        tokenId,
        transactionHash: receipt.hash as `0x${string}`,
        blockNumber: receipt.blockNumber ?? null,
        metadataUri: input.metadataUri,
        seedDigest: digest,
        owner: input.owner,
        anchoredAt: new Date().toISOString(),
        dryRun: false,
      };
    },
    async lookup(seedDigest) {
      // Base contract lookup by token id requires the caller to know the id —
      // we synthesize the same deterministic id we used at mint time.
      const tokenId = BigInt(seedDigest.slice(0, 18));
      try {
        const onChainHash: string = await contract.seedHash(tokenId);
        if (onChainHash.toLowerCase() !== seedDigest.toLowerCase()) return null;
        const owner: string = await contract.ownerOf(tokenId);
        return {
          network: chainId === 8453 ? 'base' : 'base-sepolia',
          chainId,
          tokenId: tokenId.toString(),
          // We don't have the tx hash without a second RPC call.
          transactionHash: '0x' as `0x${string}`,
          blockNumber: null,
          metadataUri: '',
          seedDigest,
          owner,
          anchoredAt: new Date().toISOString(),
          dryRun: false,
        };
      } catch {
        return null;
      }
    },
  };
}

// ─── Pin ───────────────────────────────────────────────────────────────────

export interface SovereigntyPin {
  readonly id: string;
  /** Pin the JSON metadata and return a resolvable URI. */
  pin(metadata: unknown, opts?: { filename?: string }): Promise<SovereigntyPinReceipt>;
  /** Fetch the raw bytes pinned at `uri`. */
  fetch(uri: string): Promise<Uint8Array | null>;
}

/**
 * Local filesystem pin. Writes metadata to a configurable scratch dir and
 * returns a `file://` URI. Content addressing uses SHA-256 of the JSON bytes
 * — same content produces the same filename, which is a poor-man's dedup.
 *
 * This is NOT a substitute for Arweave/IPFS in production: the URI isn't
 * reachable outside the host. But it's the right choice for tests and for
 * offline dev because you get a real, resolvable URI.
 */
export class LocalFilePin implements SovereigntyPin {
  readonly id = 'local-file';
  private readonly dir: string;

  constructor(opts: { dir?: string } = {}) {
    this.dir = opts.dir ?? path.join(process.cwd(), '.paradigm', 'pins');
  }

  private ensureDir(): void {
    fs.mkdirSync(this.dir, { recursive: true });
  }

  async pin(metadata: unknown, opts: { filename?: string } = {}): Promise<SovereigntyPinReceipt> {
    this.ensureDir();
    const json = JSON.stringify(metadata);
    const buf = Buffer.from(json, 'utf8');
    const sha = crypto.createHash('sha256').update(buf).digest('hex');
    const filename = opts.filename ?? `${sha}.json`;
    const full = path.join(this.dir, filename);
    fs.writeFileSync(full, buf);
    // file:// URIs need forward slashes + triple-slash for local paths.
    const posixPath = full.replace(/\\/g, '/');
    const uri = posixPath.startsWith('/') ? `file://${posixPath}` : `file:///${posixPath}`;
    return {
      backend: 'local-file',
      uri,
      sizeBytes: buf.length,
      contentDigest: `0x${sha}` as `0x${string}`,
      pinnedAt: new Date().toISOString(),
    };
  }

  async fetch(uri: string): Promise<Uint8Array | null> {
    if (!uri.startsWith('file://')) return null;
    let p = uri.slice('file://'.length);
    if (p.startsWith('/') && process.platform === 'win32') p = p.slice(1);
    try {
      return new Uint8Array(fs.readFileSync(p));
    } catch {
      return null;
    }
  }
}

/**
 * Arweave pin (primary — permanence). Lazy-loads `arweave` npm package.
 * Funded wallet required. Returns `ar://<txId>` URIs and a gateway URL on
 * arweave.net for immediate human preview.
 *
 * Arweave is the primary choice per Appendix D because sovereignty artifacts
 * want "forever": a seed minted today should still resolve in a decade, and
 * Arweave's pay-once-store-forever model matches that promise better than
 * IPFS's "someone has to keep pinning" reality.
 */
export interface ArweavePinOptions {
  /** JWK JSON for an Arweave wallet (funded). */
  jwk: any;
  /** Optional gateway — defaults to arweave.net. */
  host?: string;
  port?: number;
  protocol?: 'https' | 'http';
}

export async function createArweavePin(opts: ArweavePinOptions): Promise<SovereigntyPin> {
  // `arweave` is an optional peer dep — keep the type any to avoid requiring
  // @types/arweave in dev environments that never touch this adapter.
  // @ts-ignore — dynamic optional import
  const Arweave = await import('arweave').catch(() => null);
  if (!Arweave) {
    throw new Error('ArweavePin requires the `arweave` package. Install it or use LocalFilePin.');
  }
  const host = opts.host ?? 'arweave.net';
  const port = opts.port ?? 443;
  const protocol = opts.protocol ?? 'https';
  const client = (Arweave as any).default
    ? (Arweave as any).default.init({ host, port, protocol })
    : (Arweave as any).init({ host, port, protocol });

  return {
    id: 'arweave',
    async pin(metadata, pinOpts = {}) {
      const json = JSON.stringify(metadata);
      const buf = Buffer.from(json, 'utf8');
      const sha = crypto.createHash('sha256').update(buf).digest('hex');
      const tx = await client.createTransaction({ data: json }, opts.jwk);
      tx.addTag('Content-Type', 'application/json');
      tx.addTag('App-Name', 'Paradigm-Sovereignty');
      tx.addTag('App-Version', '1');
      tx.addTag('Paradigm-Content-Sha256', sha);
      if (pinOpts.filename) tx.addTag('Paradigm-Filename', pinOpts.filename);
      await client.transactions.sign(tx, opts.jwk);
      await client.transactions.post(tx);
      return {
        backend: 'arweave',
        uri: `ar://${tx.id}`,
        gatewayUrl: `${protocol}://${host}/${tx.id}`,
        sizeBytes: buf.length,
        contentDigest: `0x${sha}` as `0x${string}`,
        pinnedAt: new Date().toISOString(),
      };
    },
    async fetch(uri) {
      if (!uri.startsWith('ar://')) return null;
      const id = uri.slice('ar://'.length);
      try {
        const data = await client.transactions.getData(id, { decode: true });
        return new Uint8Array(data as Uint8Array | Buffer);
      } catch {
        return null;
      }
    },
  };
}

/**
 * IPFS pin (secondary — speed). Assumes an HTTP API compatible with Kubo
 * (the `/api/v0/add` endpoint) or a pinning service like Pinata/Web3.storage.
 * Used alongside Arweave so gateway reads in the first minutes after mint
 * don't wait for Arweave block confirmation.
 */
export interface IPFSPinOptions {
  /** Base URL of the IPFS HTTP API, e.g. "http://127.0.0.1:5001". */
  apiUrl: string;
  /** Optional bearer token for pinning services that require auth. */
  authToken?: string;
  /** Optional gateway URL, for composing human-facing links. */
  gatewayUrl?: string;
}

export function createIPFSPin(opts: IPFSPinOptions): SovereigntyPin {
  const gateway = opts.gatewayUrl ?? 'https://ipfs.io';
  return {
    id: 'ipfs',
    async pin(metadata) {
      const json = JSON.stringify(metadata);
      const buf = Buffer.from(json, 'utf8');
      const sha = crypto.createHash('sha256').update(buf).digest('hex');
      // Use multipart/form-data; Kubo's /api/v0/add expects a file upload.
      const boundary = `----paradigm-${crypto.randomBytes(8).toString('hex')}`;
      const body = Buffer.concat([
        Buffer.from(`--${boundary}\r\n`),
        Buffer.from(`Content-Disposition: form-data; name="file"; filename="metadata.json"\r\n`),
        Buffer.from(`Content-Type: application/json\r\n\r\n`),
        buf,
        Buffer.from(`\r\n--${boundary}--\r\n`),
      ]);
      const headers: Record<string, string> = {
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
      };
      if (opts.authToken) headers.Authorization = `Bearer ${opts.authToken}`;
      const resp = await fetch(`${opts.apiUrl}/api/v0/add`, { method: 'POST', body, headers });
      if (!resp.ok) throw new Error(`IPFS pin failed: ${resp.status} ${resp.statusText}`);
      const text = await resp.text();
      // Kubo can stream multiple JSON objects; we only expect one for a single file.
      const first = text.trim().split('\n')[0];
      const parsed = JSON.parse(first);
      const cid: string = parsed.Hash || parsed.cid;
      if (!cid) throw new Error('IPFS pin returned no CID');
      return {
        backend: 'ipfs',
        uri: `ipfs://${cid}`,
        gatewayUrl: `${gateway}/ipfs/${cid}`,
        sizeBytes: buf.length,
        contentDigest: `0x${sha}` as `0x${string}`,
        pinnedAt: new Date().toISOString(),
      };
    },
    async fetch(uri) {
      if (!uri.startsWith('ipfs://')) return null;
      const cid = uri.slice('ipfs://'.length);
      const resp = await fetch(`${gateway}/ipfs/${cid}`);
      if (!resp.ok) return null;
      const buf = await resp.arrayBuffer();
      return new Uint8Array(buf);
    },
  };
}

// ─── High-level orchestrator ───────────────────────────────────────────────

/**
 * Tie the three adapters together into a single "mint this seed" flow. This
 * is the piece the API layer calls — it does canonicalize → pin → sign →
 * anchor in the right order so the anchored digest matches the signed digest
 * matches the pinned metadata's embedded hash.
 *
 * Order matters:
 *   1. Canonicalize first — produces the digest used by steps 2-4.
 *   2. Pin metadata — must happen before anchoring so we have a real URI.
 *   3. Sign — signature covers the digest, not the URI, so pinning result
 *      doesn't feed back into what we're signing. Safe to do in parallel
 *      with step 2 in the future.
 *   4. Anchor — references the URI and includes the digest on-chain.
 */
export interface SovereigntyMintResult {
  signature: SovereigntySignature;
  pin: SovereigntyPinReceipt;
  anchor: SovereigntyAnchorReceipt;
  canonicalJson: string;
  digest: `0x${string}`;
}

export async function mintSeedSovereignty(params: {
  seed: unknown;
  metadata: unknown;
  owner: string;
  signer: SovereigntySigner;
  anchor: SovereigntyAnchor;
  pin: SovereigntyPin;
  filename?: string;
}): Promise<SovereigntyMintResult> {
  const { canonicalJson, digest } = canonicalizeSeed(params.seed);
  const bytes32 = `0x${digest}` as `0x${string}`;
  const pinReceipt = await params.pin.pin(params.metadata, { filename: params.filename });
  const signature = await params.signer.sign(params.seed);
  const anchorReceipt = await params.anchor.anchor({
    seed: params.seed,
    metadataUri: pinReceipt.uri,
    owner: params.owner,
  });
  return {
    signature,
    pin: pinReceipt,
    anchor: anchorReceipt,
    canonicalJson,
    digest: bytes32,
  };
}
