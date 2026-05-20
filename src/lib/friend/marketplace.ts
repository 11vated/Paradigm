/**
 * Friend marketplace anchoring — listing-calldata preparation.
 *
 * The substrate does NOT custody private keys. This module produces
 * the deterministic, ABI-encoded transaction data needed for the user
 * to LIST or DELIST a (signed, anchored) Friend NFT via their own
 * wallet.
 *
 * Phase 6 (2/n): bridges Friend.sovereignty.anchor → ParadigmMarketplace
 * list() / delist() calls. Wallet integration is out of scope; the user
 * passes the returned calldata to MetaMask / Frame / hardware wallet.
 */
import { ethers } from 'ethers';
import type { FriendSeedData } from './types';

// Subset of ParadigmMarketplace ABI — only the functions we need.
const MARKETPLACE_ABI = [
  'function list(uint256 tokenId, uint256 price) external',
  'function delist(uint256 tokenId) external',
  'function buy(uint256 tokenId) external payable',
  'function placeBid(uint256 tokenId) external payable',
];

export interface ListingPrep {
  /** Marketplace contract address. */
  contract: string;
  /** ABI-encoded transaction data to send via the user's wallet. */
  calldata: string;
  /** Hex-encoded value in wei to attach (0x0 for list/delist). */
  value: string;
  /** Human-readable function signature being invoked. */
  function: string;
  /** Parameters, decoded for the UI. */
  params: Record<string, string>;
  /** Token id being acted on (decimal string). */
  tokenId: string;
}

function getMarketplaceAddress(): string {
  const a = process.env.SEED_NFT_ADDRESS || process.env.PARADIGM_MARKETPLACE;
  if (!a) {
    throw new Error('SEED_NFT_ADDRESS (or PARADIGM_MARKETPLACE) is not set');
  }
  return a;
}

/**
 * Prepare a `list(tokenId, price)` transaction.
 * @param friend Must have sovereignty.anchor with a tokenId.
 * @param priceWei Price in wei as a decimal string (e.g. "1000000000000000000" = 1 ETH).
 */
export function prepareList(friend: FriendSeedData, priceWei: string): ListingPrep {
  const anchor = friend.sovereignty?.anchor;
  if (!anchor?.tokenId) {
    throw new Error('Friend has no on-chain anchor; mint first via /api/v1/friend/:id/anchor');
  }
  const iface = new ethers.Interface(MARKETPLACE_ABI);
  const calldata = iface.encodeFunctionData('list', [anchor.tokenId, priceWei]);
  return {
    contract: anchor.contractAddress || getMarketplaceAddress(),
    calldata,
    value: '0x0',
    function: 'list(uint256,uint256)',
    params: { tokenId: anchor.tokenId, priceWei },
    tokenId: anchor.tokenId,
  };
}

/** Prepare a `delist(tokenId)` transaction. */
export function prepareDelist(friend: FriendSeedData): ListingPrep {
  const anchor = friend.sovereignty?.anchor;
  if (!anchor?.tokenId) {
    throw new Error('Friend has no on-chain anchor');
  }
  const iface = new ethers.Interface(MARKETPLACE_ABI);
  const calldata = iface.encodeFunctionData('delist', [anchor.tokenId]);
  return {
    contract: anchor.contractAddress || getMarketplaceAddress(),
    calldata,
    value: '0x0',
    function: 'delist(uint256)',
    params: { tokenId: anchor.tokenId },
    tokenId: anchor.tokenId,
  };
}

/** Prepare a `buy(tokenId)` transaction. Requires the buyer to attach `priceWei`. */
export function prepareBuy(friend: FriendSeedData, priceWei: string): ListingPrep {
  const anchor = friend.sovereignty?.anchor;
  if (!anchor?.tokenId) {
    throw new Error('Friend has no on-chain anchor');
  }
  const iface = new ethers.Interface(MARKETPLACE_ABI);
  const calldata = iface.encodeFunctionData('buy', [anchor.tokenId]);
  return {
    contract: anchor.contractAddress || getMarketplaceAddress(),
    calldata,
    value: '0x' + BigInt(priceWei).toString(16),
    function: 'buy(uint256)',
    params: { tokenId: anchor.tokenId, priceWei },
    tokenId: anchor.tokenId,
  };
}
