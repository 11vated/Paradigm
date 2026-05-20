/**
 * Friend on-chain anchoring — ERC-721 mint for FriendSovereignty.
 *
 * Phase 1 (7/n): wraps the existing src/lib/sovereignty/onchain.ts to
 * mint a FriendSeed's sovereignty receipt as an NFT on an L2 (Sepolia
 * by default; configurable). The mint result is persisted onto the
 * friend's sovereignty.anchor field, so subsequent verifications can
 * show: receipt + on-chain anchor.
 *
 * Invariants:
 *   - The friend MUST already have an off-chain sovereignty receipt
 *     before it can be anchored. We do not allow anchoring an
 *     unsigned friend — the receipt is what's notarized on-chain.
 *   - The tokenId is derived from the friend's payloadHash (NOT its
 *     storage id) — same payload → same token, regardless of how it
 *     was obtained (genesis vs. breed reproducing identical genes).
 *   - The metadata URI is a data: URI by default (base64 JSON);
 *     callers can swap to IPFS by passing `ipfsCid`.
 *
 * This module never requires ethers at import time; it dynamically
 * imports inside `anchorFriendOnChain` so the build/test path stays
 * lightweight.
 */

import { createHash } from 'crypto';
import type { FriendSeedData, FriendSovereignty } from './types';
import { friendPayloadHash, canonicalFriendJson } from './sovereignty';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface FriendOnChainAnchor {
  /** ERC-721 token id (uint256 as decimal string) derived from payload hash. */
  tokenId: string;
  /** Contract address that minted the token. */
  contractAddress: string;
  /** Transaction hash for the mint. */
  transactionHash: string;
  /** Network label, e.g. 'sepolia', 'base-sepolia', 'mainnet'. */
  network: string;
  /** ISO-8601 timestamp of the mint (observability — NOT part of the signed payload). */
  anchoredAt: string;
  /** Metadata URI (data: URI or ipfs://...). */
  metadataUri: string;
  /** Hex digest of metadata for round-trip checks. */
  metadataHash: string;
}

export interface AnchorRequest {
  friend: FriendSeedData;
  ownerAddress: string;
  privateKey: string;
  contractAddress?: string;
  rpcUrl?: string;
  network?: string;
  ipfsCid?: string;
}

export interface AnchorResult {
  success: boolean;
  anchor?: FriendOnChainAnchor;
  error?: string;
}

export interface PreparedAnchor {
  tokenId: string;
  metadata: FriendNftMetadata;
  metadataUri: string;
  metadataHash: string;
  payloadHash: string;
}

export interface FriendNftMetadata {
  name: string;
  description: string;
  image: string;
  external_url?: string;
  /** OpenSea-style attributes — extracted from genes. */
  attributes: Array<{ trait_type: string; value: string | number }>;
  /** Paradigm extensions: */
  paradigm: {
    schema: 'paradigm.friend.v1';
    friendId: string;
    payloadHash: string;
    sovereignty?: FriendSovereignty;
    genome: {
      body: { archetype: string; heightM: number };
      face: { roundness: number; hairStyle: string };
      voice: { pitchHz: number };
      persona: { speechStyle: string };
    };
  };
}

// ─── Pure preparation (no chain interaction — safe in any environment) ──────

/**
 * Build the NFT metadata + tokenId for a friend.
 *
 * Pure / deterministic / no entropy. Given the same friend, returns
 * the same tokenId and the same canonical metadata.
 */
export function prepareFriendMint(friend: FriendSeedData, options: { externalUrl?: string; ipfsCid?: string } = {}): PreparedAnchor {
  const payloadHash = friendPayloadHash(friend);

  // Token id: low 16 hex chars of payloadHash, parsed as uint64-ish.
  // Using only 16 hex (64 bits) keeps the id small while remaining
  // collision-resistant for the foreseeable lifetime of the substrate.
  const tokenId = BigInt('0x' + payloadHash.slice(0, 16)).toString();

  const metadata = buildMetadata(friend, payloadHash, options.externalUrl);
  const metadataJson = canonicalJson(metadata); // deterministic
  const metadataHash = createHash('sha256').update(metadataJson).digest('hex');
  const metadataUri = options.ipfsCid
    ? `ipfs://${options.ipfsCid}`
    : `data:application/json;base64,${Buffer.from(metadataJson).toString('base64')}`;

  return { tokenId, metadata, metadataUri, metadataHash, payloadHash };
}

function buildMetadata(friend: FriendSeedData, payloadHash: string, externalUrl?: string): FriendNftMetadata {
  const archetype = friend.genes.body.archetype;
  const speechStyle = friend.genes.persona.speechStyle;
  return {
    name: `${friend.name} · Paradigm Friend`,
    description: `A Paradigm Friend — a sovereign digital companion. Determined by genome ${friend.id}.`,
    image: `paradigm://friend/${friend.id}/portrait.svg`,
    external_url: externalUrl,
    attributes: [
      { trait_type: 'Archetype', value: archetype },
      { trait_type: 'Height (m)', value: round3(friend.genes.body.heightScale) },
      { trait_type: 'Roundness', value: round3(friend.genes.face.roundness) },
      { trait_type: 'Hair Style', value: friend.genes.face.hairStyle },
      { trait_type: 'Pitch (Hz)', value: Math.round(friend.genes.voice.pitch) },
      { trait_type: 'Speech Style', value: speechStyle },
      { trait_type: 'Generation', value: friend.derivation?.generation ?? 0 },
      { trait_type: 'Operator', value: friend.derivation?.operator ?? 'genesis' },
      { trait_type: 'Curiosity', value: round3(friend.genes.persona.curiosity) },
      { trait_type: 'Humor', value: round3(friend.genes.persona.humor) },
      { trait_type: 'Genome v', value: friend.genomeVersion },
    ],
    paradigm: {
      schema: 'paradigm.friend.v1',
      friendId: friend.id,
      payloadHash,
      sovereignty: friend.sovereignty,
      genome: {
        body: { archetype, heightM: round4(friend.genes.body.heightScale) },
        face: { roundness: round4(friend.genes.face.roundness), hairStyle: friend.genes.face.hairStyle },
        voice: { pitchHz: Math.round(friend.genes.voice.pitch) },
        persona: { speechStyle },
      },
    },
  };
}

// ─── Live chain interaction (dynamic import of ethers) ───────────────────────

const FRIEND_NFT_ABI = [
  'function mint(address to, uint256 tokenId, string uri) external',
  'function tokenURI(uint256 tokenId) view returns (string)',
  'function ownerOf(uint256 tokenId) view returns (address)',
] as const;

/**
 * Anchor a signed Friend on-chain. Returns the anchor receipt; does NOT
 * mutate the input friend (caller is responsible for persisting the
 * returned anchor onto `friend.sovereignty.anchor`).
 *
 * Fails clearly if:
 *   - friend has no off-chain sovereignty receipt
 *   - contract address is not configured
 *   - ethers.js is not installed
 *   - the chain rejects the mint (insufficient gas, already minted, etc.)
 */
export async function anchorFriendOnChain(req: AnchorRequest): Promise<AnchorResult> {
  if (!req.friend.sovereignty) {
    return { success: false, error: 'friend must be signed before anchoring on-chain' };
  }
  if (!req.privateKey) {
    return { success: false, error: 'privateKey required for on-chain anchoring' };
  }
  const contractAddress = req.contractAddress
    ?? process.env.PARADIGM_FRIEND_NFT_CONTRACT
    ?? process.env.PARADIGM_NFT_CONTRACT;
  if (!contractAddress) {
    return { success: false, error: 'PARADIGM_FRIEND_NFT_CONTRACT (or PARADIGM_NFT_CONTRACT) is not configured' };
  }

  let ethers: any;
  try {
    ethers = await import('ethers');
  } catch {
    return { success: false, error: 'ethers.js not installed. Run: npm install ethers' };
  }

  try {
    const rpcUrl = req.rpcUrl ?? process.env.SEPOLIA_RPC_URL ?? 'https://rpc.sepolia.org';
    const network = req.network ?? 'sepolia';
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const wallet = new ethers.Wallet(req.privateKey, provider);
    const contract = new ethers.Contract(contractAddress, FRIEND_NFT_ABI, wallet);

    const prepared = prepareFriendMint(req.friend, { ipfsCid: req.ipfsCid });
    const tx = await contract.mint(req.ownerAddress, prepared.tokenId, prepared.metadataUri);
    const receipt = await tx.wait();

    const anchor: FriendOnChainAnchor = {
      tokenId: prepared.tokenId,
      contractAddress,
      transactionHash: receipt.hash,
      network,
      anchoredAt: new Date().toISOString(),
      metadataUri: prepared.metadataUri,
      metadataHash: prepared.metadataHash,
    };
    return { success: true, anchor };
  } catch (e: any) {
    return { success: false, error: e?.message ?? String(e) };
  }
}

/**
 * Verify that an on-chain anchor matches the friend's current payload.
 * - Recomputes the expected tokenId
 * - Reads the contract's tokenURI back and compares its metadataHash
 *
 * If the chain says a different metadataUri lives at this tokenId,
 * the friend was either modified after anchoring (tampering) OR the
 * tokenId was minted by someone else first (collision attack — very
 * unlikely with 64-bit ids).
 */
export async function verifyFriendAnchor(friend: FriendSeedData, anchor: FriendOnChainAnchor, rpcUrl?: string): Promise<{ valid: boolean; reason?: string; onChainUri?: string }> {
  let ethers: any;
  try {
    ethers = await import('ethers');
  } catch {
    return { valid: false, reason: 'ethers.js not installed' };
  }
  const prepared = prepareFriendMint(friend);
  if (prepared.tokenId !== anchor.tokenId) {
    return { valid: false, reason: 'token id does not match current friend payload' };
  }
  try {
    const provider = new ethers.JsonRpcProvider(rpcUrl ?? process.env.SEPOLIA_RPC_URL ?? 'https://rpc.sepolia.org');
    const contract = new ethers.Contract(anchor.contractAddress, FRIEND_NFT_ABI, provider);
    const onChainUri: string = await contract.tokenURI(anchor.tokenId);
    if (onChainUri !== anchor.metadataUri) {
      return { valid: false, reason: 'on-chain metadataUri differs from anchored URI', onChainUri };
    }
    return { valid: true, onChainUri };
  } catch (e: any) {
    return { valid: false, reason: e?.message ?? String(e) };
  }
}

// ─── helpers ────────────────────────────────────────────────────────────────

function round3(n: number): number { return Math.round(n * 1000) / 1000; }
function round4(n: number): number { return Math.round(n * 10000) / 10000; }

function canonicalJson(v: unknown): string {
  if (v === null || typeof v !== 'object') return JSON.stringify(v);
  if (Array.isArray(v)) return '[' + v.map(canonicalJson).join(',') + ']';
  const keys = Object.keys(v as Record<string, unknown>).sort();
  return '{' + keys.map((k) => JSON.stringify(k) + ':' + canonicalJson((v as Record<string, unknown>)[k])).join(',') + '}';
}
