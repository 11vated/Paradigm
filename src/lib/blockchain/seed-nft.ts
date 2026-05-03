/**
 * SeedNFT Client — Interact with SeedNFT smart contract
 *
 * Provides a TypeScript interface for minting, breeding,
 * and managing Seed NFTs from the frontend.
 */

import { ethers } from 'ethers';
import SeedNFTABI from './SeedNFTABI.json';

// Seed data structure (matches contract)
export interface SeedNFTData {
  seedHash: string;
  domain: string;
  genetics: string;
  createdAt: number;
  creator: string;
  parent1: string;
  parent2: string;
  generation: number;
}

// Deployment addresses (update after deployment)
const CONTRACT_ADDRESSES: Record<string, string> = {
  polygon: '0x...', // TODO: Update after deployment
  mainnet: '0x...',
  goerli: '0x...',
  localhost: '0x5FbDB2315678afecb367f032d93F642f64180aa3', // Default Hardhat
};

/**
 * SeedNFT Client class
 */
export class SeedNFTClient {
  private contract: ethers.Contract;
  private signer: ethers.Signer;

  constructor(
    provider: ethers.Provider,
    signer: ethers.Signer,
    network: keyof typeof CONTRACT_ADDRESSES = 'localhost'
  ) {
    const address = CONTRACT_ADDRESSES[network];
    if (!address) {
      throw new Error(`No contract address for network: ${network}`);
    }

    this.signer = signer;
    this.contract = new ethers.Contract(address, SeedNFTABI, signer);
  }

  /**
   * Mint a new seed NFT
   */
  async mintSeed(
    to: string,
    seedHash: string,
    domain: string,
    genetics: string,
    uri: string,
    parent1Hash: string = '',
    parent2Hash: string = '',
    generation: number = 0
  ): Promise<{ tokenId: bigint; txHash: string }> {
    const tx = await this.contract.mintSeed(
      to,
      seedHash,
      domain,
      genetics,
      uri,
      parent1Hash,
      parent2Hash,
      generation
    );

    const receipt = await tx.wait();
    const event = receipt.logs
      .map((log: any) => {
        try {
          return this.contract.interface.parseLog(log);
        } catch {
          return null;
        }
      })
      .find((e: any) => e?.name === 'SeedMinted');

    const tokenId = event?.args?.tokenId || BigInt(0);

    return {
      tokenId,
      txHash: tx.hash,
    };
  }

  /**
   * Breed two seed NFTs
   */
  async breedSeeds(
    to: string,
    parent1TokenId: bigint,
    parent2TokenId: bigint,
    childSeedHash: string,
    childGenetics: string,
    childUri: string
  ): Promise<{ tokenId: bigint; txHash: string }> {
    const tx = await this.contract.breedSeeds(
      to,
      parent1TokenId,
      parent2TokenId,
      childSeedHash,
      childGenetics,
      childUri
    );

    const receipt = await tx.wait();
    const event = receipt.logs
      .map((log: any) => {
        try {
          return this.contract.interface.parseLog(log);
        } catch {
          return null;
        }
      })
      .find((e: any) => e?.name === 'SeedBred');

    const tokenId = event?.args?.tokenId || BigInt(0);

    return {
      tokenId,
      txHash: tx.hash,
    };
  }

  /**
   * Get seed data for a token
   */
  async getSeedData(tokenId: bigint): Promise<SeedNFTData> {
    const data = await this.contract.seedData(tokenId);
    return {
      seedHash: data.seedHash,
      domain: data.domain,
      genetics: data.genetics,
      createdAt: Number(data.createdAt),
      creator: data.creator,
      parent1: data.parent1,
      parent2: data.parent2,
      generation: Number(data.generation),
    };
  }

  /**
   * Get all seeds owned by an address
   */
  async getSeedsByOwner(owner: string): Promise<bigint[]> {
    return await this.contract.getSeedsByOwner(owner);
  }

  /**
   * Check if a seed hash has been minted
   */
  async isSeedMinted(seedHash: string): Promise<boolean> {
    return await this.contract.isSeedMinted(seedHash);
  }

  /**
   * Get total seeds minted
   */
  async totalSeeds(): Promise<bigint> {
    return await this.contract.totalSeeds();
  }

  /**
   * Get token URI
   */
  async tokenURI(tokenId: bigint): Promise<string> {
    return await this.contract.tokenURI(tokenId);
  }

  /**
   * Get royalty info
   */
  async royaltyInfo(tokenId: bigint, salePrice: bigint): Promise<{ receiver: string; royaltyAmount: bigint }> {
    const [receiver, royaltyAmount] = await this.contract.royaltyInfo(tokenId, salePrice);
    return { receiver, royaltyAmount };
  }

  /**
   * Get contract address
   */
  getAddress(): Promise<string> {
    return this.contract.getAddress();
  }
}

/**
 * Helper: Create client from browser wallet (MetaMask)
 */
export async function createBrowserClient(
  network: keyof typeof CONTRACT_ADDRESSES = 'localhost'
): Promise<SeedNFTClient | null> {
  if (typeof window === 'undefined' || !window.ethereum) {
    throw new Error('No Ethereum wallet found. Install MetaMask.');
  }

  await window.ethereum.request({ method: 'eth_requestAccounts' });

  const provider = new ethers.BrowserProvider(window.ethereum);
  const signer = await provider.getSigner();

  return new SeedNFTClient(provider, signer, network);
}

/**
 * Helper: Create read-only client
 */
export function createReadOnlyClient(
  network: keyof typeof CONTRACT_ADDRESSES = 'localhost'
): SeedNFTClient {
  const provider = new ethers.JsonRpcProvider(getRPCUrl(network));
  const signer = ethers.Wallet.createRandom(provider);
  return new SeedNFTClient(provider, signer, network);
}

/**
 * Get RPC URL for network
 */
function getRPCUrl(network: keyof typeof CONTRACT_ADDRESSES): string {
  const urls: Record<string, string> = {
    polygon: 'https://polygon-rpc.com',
    mainnet: 'https://eth-mainnet.g.alchemy.com/v2/YOUR_API_KEY',
    goerli: 'https://eth-goerli.g.alchemy.com/v2/YOUR_API_KEY',
    localhost: 'http://localhost:8545',
  };
  return urls[network] || urls.localhost;
}

// Type declaration for window.ethereum
declare global {
  interface Window {
    ethereum?: any;
  }
}
