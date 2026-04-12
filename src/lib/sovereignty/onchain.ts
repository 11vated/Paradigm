/**
 * Paradigm Absolute — On-Chain Sovereignty Module
 *
 * ERC-721 NFT minting for seed sovereignty on Ethereum L2 (Sepolia testnet).
 * Uses ethers.js for blockchain interaction and generates IPFS-compatible
 * metadata URIs. Seeds are minted as NFTs with full lineage provenance.
 *
 * Architecture:
 *  1. Seed → JSON metadata (name, domain, genes, lineage, hash)
 *  2. Metadata → IPFS pin (or data: URI fallback)
 *  3. IPFS CID → ERC-721 mint transaction
 *  4. Transaction receipt → sovereignty record on seed
 *
 * The Solidity contract is a minimal ERC-721 with:
 *  - mint(to, tokenId, uri) — only owner can mint
 *  - tokenURI(tokenId) — returns metadata URI
 *  - seedHash(tokenId) — maps token to Paradigm seed hash
 */
import crypto from 'crypto';

// ─── TYPES ───────────────────────────────────────────────────────────────────

interface MintRequest {
  seed: any;
  ownerAddress: string;
  privateKey?: string; // Wallet private key for signing
  ipfsGateway?: string;
}

interface MintResult {
  success: boolean;
  tokenId?: string;
  transactionHash?: string;
  metadataUri?: string;
  contractAddress?: string;
  network?: string;
  error?: string;
}

interface SeedMetadata {
  name: string;
  description: string;
  image: string;
  external_url: string;
  attributes: { trait_type: string; value: any }[];
  properties: {
    seed_hash: string;
    domain: string;
    generation: number;
    lineage: any;
    genes: Record<string, any>;
    paradigm_version: string;
  };
}

// ─── CONSTANTS ───────────────────────────────────────────────────────────────

// Paradigm Seed NFT contract — deployed to Sepolia
// This is the contract ABI for the minimal ERC-721 with seed-specific extensions
const CONTRACT_ABI = [
  'function mint(address to, uint256 tokenId, string uri, bytes32 seedHash) external',
  'function tokenURI(uint256 tokenId) external view returns (string)',
  'function seedHash(uint256 tokenId) external view returns (bytes32)',
  'function ownerOf(uint256 tokenId) external view returns (address)',
  'function balanceOf(address owner) external view returns (uint256)',
  'event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)',
  'event SeedMinted(uint256 indexed tokenId, bytes32 seedHash, string domain)',
];

// Minimal ERC-721 Solidity source for deployment
const SOLIDITY_SOURCE = `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title ParadigmSeedNFT
 * @notice ERC-721 for Paradigm GSPL seed sovereignty.
 *         Each token represents a unique seed with full lineage provenance.
 */
contract ParadigmSeedNFT is ERC721, ERC721URIStorage, Ownable {
    mapping(uint256 => bytes32) private _seedHashes;
    uint256 private _nextTokenId;

    event SeedMinted(uint256 indexed tokenId, bytes32 seedHash, string domain);

    constructor() ERC721("Paradigm Seed", "PSEED") Ownable(msg.sender) {}

    /**
     * @notice Mint a new seed NFT with metadata URI and seed hash.
     * @param to Recipient address
     * @param uri IPFS or data: URI pointing to seed metadata JSON
     * @param seedHash SHA-256 hash of the seed's gene data
     */
    function mint(address to, string memory uri, bytes32 seedHash) external onlyOwner returns (uint256) {
        uint256 tokenId = _nextTokenId++;
        _safeMint(to, tokenId);
        _setTokenURI(tokenId, uri);
        _seedHashes[tokenId] = seedHash;
        emit SeedMinted(tokenId, seedHash, "");
        return tokenId;
    }

    /**
     * @notice Get the Paradigm seed hash for a token.
     */
    function seedHash(uint256 tokenId) external view returns (bytes32) {
        _requireOwned(tokenId);
        return _seedHashes[tokenId];
    }

    // Required overrides
    function tokenURI(uint256 tokenId) public view override(ERC721, ERC721URIStorage) returns (string memory) {
        return super.tokenURI(tokenId);
    }

    function supportsInterface(bytes4 interfaceId) public view override(ERC721, ERC721URIStorage) returns (bool) {
        return super.supportsInterface(interfaceId);
    }
}`;

// ─── METADATA BUILDER ────────────────────────────────────────────────────────

function buildSeedMetadata(seed: any): SeedMetadata {
  const genes = seed.genes || {};
  const attributes: { trait_type: string; value: any }[] = [
    { trait_type: 'Domain', value: seed.$domain || 'unknown' },
    { trait_type: 'Generation', value: seed.$lineage?.generation || 0 },
    { trait_type: 'Fitness', value: seed.$fitness?.overall?.toFixed(3) || '0.000' },
    { trait_type: 'Operation', value: seed.$lineage?.operation || 'primordial' },
  ];

  // Add gene attributes (top-level scalars and categoricals)
  for (const [name, gene] of Object.entries(genes) as [string, any][]) {
    if (gene.type === 'scalar' && typeof gene.value === 'number') {
      attributes.push({ trait_type: name, value: gene.value.toFixed(3) });
    } else if (gene.type === 'categorical' && typeof gene.value === 'string') {
      attributes.push({ trait_type: name, value: gene.value });
    }
  }

  // Generate a deterministic SVG "gene portrait" as the image
  const svgImage = generateGenePortrait(seed);

  return {
    name: seed.$name || 'Paradigm Seed',
    description: `A ${seed.$domain || 'creative'} seed from the Paradigm GSPL Engine. Generation ${seed.$lineage?.generation || 0}. Hash: ${(seed.$hash || '').substring(0, 16)}...`,
    image: `data:image/svg+xml;base64,${Buffer.from(svgImage).toString('base64')}`,
    external_url: 'https://paradigm.dev',
    attributes,
    properties: {
      seed_hash: seed.$hash || '',
      domain: seed.$domain || 'unknown',
      generation: seed.$lineage?.generation || 0,
      lineage: seed.$lineage || {},
      genes,
      paradigm_version: '2.0.0',
    },
  };
}

/**
 * Generate a deterministic SVG visualization of a seed's genes.
 * Used as the NFT image — unique per seed hash.
 */
function generateGenePortrait(seed: any): string {
  const hash = seed.$hash || crypto.createHash('sha256').update(JSON.stringify(seed.genes || {})).digest('hex');
  const genes = seed.genes || {};

  // Extract colors from hash
  const r1 = parseInt(hash.substring(0, 2), 16);
  const g1 = parseInt(hash.substring(2, 4), 16);
  const b1 = parseInt(hash.substring(4, 6), 16);
  const r2 = parseInt(hash.substring(6, 8), 16);
  const g2 = parseInt(hash.substring(8, 10), 16);
  const b2 = parseInt(hash.substring(10, 12), 16);

  // Generate geometric elements from gene values
  const elements: string[] = [];
  let i = 0;
  for (const [name, gene] of Object.entries(genes) as [string, any][]) {
    const angle = (i * 137.5) % 360; // Golden angle
    const hIdx = (i * 4) % (hash.length - 4);
    const cx = 256 + Math.cos(angle * Math.PI / 180) * (80 + parseInt(hash.substring(hIdx, hIdx + 2), 16) * 0.4);
    const cy = 256 + Math.sin(angle * Math.PI / 180) * (80 + parseInt(hash.substring(hIdx + 2, hIdx + 4), 16) * 0.4);

    if (gene.type === 'scalar' && typeof gene.value === 'number') {
      const radius = 8 + gene.value * 30;
      const opacity = 0.3 + gene.value * 0.5;
      elements.push(`<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${radius.toFixed(1)}" fill="rgb(${r1},${g1},${b1})" opacity="${opacity.toFixed(2)}" />`);
    } else if (gene.type === 'vector' && Array.isArray(gene.value)) {
      const size = 10 + (gene.value[0] || 0.5) * 25;
      elements.push(`<rect x="${(cx - size / 2).toFixed(1)}" y="${(cy - size / 2).toFixed(1)}" width="${size.toFixed(1)}" height="${size.toFixed(1)}" rx="3" fill="rgb(${r2},${g2},${b2})" opacity="0.5" transform="rotate(${(angle).toFixed(0)} ${cx.toFixed(1)} ${cy.toFixed(1)})" />`);
    } else {
      const points = `${cx},${cy - 12} ${cx + 10},${cy + 8} ${cx - 10},${cy + 8}`;
      elements.push(`<polygon points="${points}" fill="rgb(${(r1 + r2) >> 1},${(g1 + g2) >> 1},${(b1 + b2) >> 1})" opacity="0.4" />`);
    }
    i++;
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <defs>
    <radialGradient id="bg" cx="50%" cy="50%" r="70%">
      <stop offset="0%" style="stop-color:rgb(${r1 >> 2},${g1 >> 2},${b1 >> 2})" />
      <stop offset="100%" style="stop-color:rgb(5,5,10)" />
    </radialGradient>
  </defs>
  <rect width="512" height="512" fill="url(#bg)" />
  <circle cx="256" cy="256" r="100" fill="none" stroke="rgb(${r1},${g1},${b1})" stroke-width="0.5" opacity="0.3" />
  <circle cx="256" cy="256" r="160" fill="none" stroke="rgb(${r2},${g2},${b2})" stroke-width="0.5" opacity="0.2" />
  ${elements.join('\n  ')}
  <text x="256" y="480" text-anchor="middle" fill="white" font-family="monospace" font-size="10" opacity="0.5">${seed.$domain || 'seed'} — ${(hash).substring(0, 12)}</text>
</svg>`;
}

// ─── MINTING ENGINE ──────────────────────────────────────────────────────────

/**
 * Prepare a seed for on-chain minting.
 * Returns the metadata and a data: URI (for environments without IPFS).
 * For actual chain submission, the caller provides ethers.js signer.
 */
export function prepareMint(seed: any): {
  metadata: SeedMetadata;
  metadataUri: string;
  tokenId: string;
  seedHashBytes: string;
} {
  const metadata = buildSeedMetadata(seed);

  // Encode metadata as a data: URI (base64 JSON)
  // In production, replace with IPFS pin: ipfs://Qm...
  const metadataJson = JSON.stringify(metadata);
  const metadataUri = `data:application/json;base64,${Buffer.from(metadataJson).toString('base64')}`;

  // Token ID derived from seed hash (first 8 bytes as uint256)
  const hashHex = seed.$hash || crypto.createHash('sha256').update(JSON.stringify(seed.genes || {})).digest('hex');
  const tokenId = BigInt('0x' + hashHex.substring(0, 16)).toString();

  // Seed hash as bytes32
  const seedHashBytes = '0x' + hashHex.padEnd(64, '0');

  return { metadata, metadataUri, tokenId, seedHashBytes };
}

/**
 * Execute on-chain mint (requires ethers.js at runtime).
 * This function dynamically imports ethers to avoid hard dependency.
 */
export async function mintOnChain(request: MintRequest): Promise<MintResult> {
  const { seed, ownerAddress, privateKey, ipfsGateway } = request;

  if (!privateKey) {
    return { success: false, error: 'Private key required for on-chain minting' };
  }

  try {
    // Dynamic import — ethers.js is an optional peer dependency
    const ethers = await import('ethers').catch(() => null);
    if (!ethers) {
      return { success: false, error: 'ethers.js not installed. Run: npm install ethers' };
    }

    // Connect to Sepolia testnet
    const provider = new ethers.JsonRpcProvider(
      process.env.SEPOLIA_RPC_URL || 'https://rpc.sepolia.org'
    );
    const wallet = new ethers.Wallet(privateKey, provider);

    const contractAddress = process.env.PARADIGM_NFT_CONTRACT || '';
    if (!contractAddress) {
      return { success: false, error: 'PARADIGM_NFT_CONTRACT address not set in environment' };
    }

    const contract = new ethers.Contract(contractAddress, CONTRACT_ABI, wallet);

    // Prepare metadata
    const { metadata, metadataUri, tokenId, seedHashBytes } = prepareMint(seed);

    // If IPFS gateway provided, try to pin there first
    let finalUri = metadataUri;
    if (ipfsGateway) {
      try {
        const response = await fetch(`${ipfsGateway}/api/v0/add`, {
          method: 'POST',
          body: JSON.stringify(metadata),
          headers: { 'Content-Type': 'application/json' },
        });
        const result = await response.json();
        if (result.Hash) {
          finalUri = `ipfs://${result.Hash}`;
        }
      } catch (ipfsError) {
        // Fall back to data: URI
        console.warn('IPFS pin failed, using data: URI', ipfsError);
      }
    }

    // Execute mint transaction
    const tx = await contract.mint(ownerAddress, BigInt(tokenId), finalUri, seedHashBytes);
    const receipt = await tx.wait();

    return {
      success: true,
      tokenId,
      transactionHash: receipt.hash,
      metadataUri: finalUri,
      contractAddress,
      network: 'sepolia',
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Minting failed',
    };
  }
}

/**
 * Verify that a seed's on-chain record matches its local data.
 */
export async function verifyOnChain(seed: any, contractAddress: string): Promise<{
  verified: boolean;
  onChainHash?: string;
  localHash?: string;
  owner?: string;
  error?: string;
}> {
  try {
    const ethers = await import('ethers').catch(() => null);
    if (!ethers) {
      return { verified: false, error: 'ethers.js not installed' };
    }

    const provider = new ethers.JsonRpcProvider(
      process.env.SEPOLIA_RPC_URL || 'https://rpc.sepolia.org'
    );
    const contract = new ethers.Contract(contractAddress, CONTRACT_ABI, provider);

    const { tokenId } = prepareMint(seed);
    const onChainHash = await contract.seedHash(BigInt(tokenId));
    const owner = await contract.ownerOf(BigInt(tokenId));

    const localHash = '0x' + (seed.$hash || '').padEnd(64, '0');

    return {
      verified: onChainHash === localHash,
      onChainHash: onChainHash.toString(),
      localHash,
      owner,
    };
  } catch (error: any) {
    return { verified: false, error: error.message || 'Verification failed' };
  }
}

// ─── EXPORTS ─────────────────────────────────────────────────────────────────

export const OnChainSovereignty = {
  prepareMint,
  mintOnChain,
  verifyOnChain,
  SOLIDITY_SOURCE,
  CONTRACT_ABI,
  generateGenePortrait,
};
