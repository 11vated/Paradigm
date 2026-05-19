/**
 * Friend on-chain anchoring tests — pure preparation pipeline.
 *
 * We can't exercise a live chain in tests, so we exhaustively cover the
 * deterministic `prepareFriendMint` pipeline + the failure paths of the
 * live functions (missing ethers, missing key, missing contract).
 */

import { describe, it, expect } from 'vitest';
import {
  createFriendSeed,
  signFriendSeed,
  generateFriendKeyPair,
  prepareFriendMint,
  anchorFriendOnChain,
  verifyFriendAnchor,
  type FriendOnChainAnchor,
} from '@/lib/friend';

describe('prepareFriendMint', () => {
  it('returns deterministic tokenId for the same friend', () => {
    const f = createFriendSeed('determinism-anchor');
    const a = prepareFriendMint(f);
    const b = prepareFriendMint(f);
    expect(a.tokenId).toBe(b.tokenId);
    expect(a.metadataUri).toBe(b.metadataUri);
    expect(a.metadataHash).toBe(b.metadataHash);
    expect(a.payloadHash).toBe(b.payloadHash);
  });

  it('tokenId is a decimal uint < 2^64', () => {
    const f = createFriendSeed('token-id-bounds');
    const { tokenId } = prepareFriendMint(f);
    expect(tokenId).toMatch(/^\d+$/);
    const big = BigInt(tokenId);
    expect(big).toBeGreaterThanOrEqual(0n);
    expect(big).toBeLessThan(2n ** 64n);
  });

  it('different friends yield different tokenIds', () => {
    const a = prepareFriendMint(createFriendSeed('a'));
    const b = prepareFriendMint(createFriendSeed('b'));
    expect(a.tokenId).not.toBe(b.tokenId);
  });

  it('metadata has the expected attributes', () => {
    const f = createFriendSeed('metadata-attrs');
    const { metadata } = prepareFriendMint(f);
    expect(metadata.paradigm.schema).toBe('paradigm.friend.v1');
    expect(metadata.paradigm.friendId).toBe(f.id);
    const traitTypes = metadata.attributes.map((a) => a.trait_type);
    expect(traitTypes).toContain('Archetype');
    expect(traitTypes).toContain('Speech Style');
    expect(traitTypes).toContain('Generation');
  });

  it('embeds sovereignty into paradigm metadata when present', async () => {
    const f = createFriendSeed('sov-in-metadata');
    const kp = await generateFriendKeyPair();
    const signed = await signFriendSeed(f, kp.privateKey, kp.publicKey);
    const { metadata } = prepareFriendMint(signed);
    expect(metadata.paradigm.sovereignty).toBeDefined();
    expect(metadata.paradigm.sovereignty!.algorithm).toBe('ECDSA-P256-SHA256');
  });

  it('switches to ipfs:// URI when ipfsCid is provided', () => {
    const f = createFriendSeed('ipfs-uri');
    const { metadataUri } = prepareFriendMint(f, { ipfsCid: 'Qmtest123' });
    expect(metadataUri).toBe('ipfs://Qmtest123');
  });

  it('uses data: URI by default', () => {
    const { metadataUri } = prepareFriendMint(createFriendSeed('data-uri'));
    expect(metadataUri.startsWith('data:application/json;base64,')).toBe(true);
  });

  it('metadataHash is stable hex 64 chars', () => {
    const f = createFriendSeed('hash-stability');
    const { metadataHash } = prepareFriendMint(f);
    expect(metadataHash).toMatch(/^[0-9a-f]{64}$/);
  });

  it('tokenId derives from payloadHash, not friend.id', async () => {
    // Two friends with identical genes but different ids would be impossible
    // by construction (id is hash-based), so instead verify that signing
    // a friend doesn't change its tokenId — the signature doesn't influence
    // the canonical payload.
    const f = createFriendSeed('payload-tokenid');
    const kp = await generateFriendKeyPair();
    const signed = await signFriendSeed(f, kp.privateKey, kp.publicKey);
    expect(prepareFriendMint(f).tokenId).toBe(prepareFriendMint(signed).tokenId);
  });
});

describe('anchorFriendOnChain — failure paths', () => {
  it('rejects unsigned friend', async () => {
    const f = createFriendSeed('unsigned');
    const r = await anchorFriendOnChain({
      friend: f, ownerAddress: '0x' + '1'.repeat(40), privateKey: '0x' + '2'.repeat(64),
    });
    expect(r.success).toBe(false);
    expect(r.error).toMatch(/signed/i);
  });

  it('rejects missing private key', async () => {
    const f = createFriendSeed('no-priv');
    const kp = await generateFriendKeyPair();
    const signed = await signFriendSeed(f, kp.privateKey, kp.publicKey);
    const r = await anchorFriendOnChain({
      friend: signed, ownerAddress: '0x' + '1'.repeat(40), privateKey: '',
    });
    expect(r.success).toBe(false);
    expect(r.error).toMatch(/private/i);
  });

  it('rejects when contract is not configured', async () => {
    // We must ensure PARADIGM_FRIEND_NFT_CONTRACT and PARADIGM_NFT_CONTRACT are unset.
    const before = {
      friend: process.env.PARADIGM_FRIEND_NFT_CONTRACT,
      legacy: process.env.PARADIGM_NFT_CONTRACT,
    };
    delete process.env.PARADIGM_FRIEND_NFT_CONTRACT;
    delete process.env.PARADIGM_NFT_CONTRACT;
    try {
      const f = createFriendSeed('no-contract');
      const kp = await generateFriendKeyPair();
      const signed = await signFriendSeed(f, kp.privateKey, kp.publicKey);
      const r = await anchorFriendOnChain({
        friend: signed,
        ownerAddress: '0x' + '1'.repeat(40),
        privateKey: '0x' + '2'.repeat(64),
      });
      expect(r.success).toBe(false);
      expect(r.error).toMatch(/CONTRACT/);
    } finally {
      if (before.friend !== undefined) process.env.PARADIGM_FRIEND_NFT_CONTRACT = before.friend;
      if (before.legacy !== undefined) process.env.PARADIGM_NFT_CONTRACT = before.legacy;
    }
  });
});

describe('verifyFriendAnchor', () => {
  it('detects tokenId mismatch (payload changed since anchoring)', async () => {
    const f = createFriendSeed('verify-tokenid');
    const fakeAnchor: FriendOnChainAnchor = {
      tokenId: '12345',
      contractAddress: '0x' + '1'.repeat(40),
      transactionHash: '0x' + '0'.repeat(64),
      network: 'sepolia',
      anchoredAt: new Date(0).toISOString(),
      metadataUri: 'data:application/json;base64,eyJ9',
      metadataHash: 'a'.repeat(64),
    };
    // Don't actually hit the chain; the function will short-circuit
    // when tokenId doesn't match.
    const r = await verifyFriendAnchor(f, fakeAnchor);
    expect(r.valid).toBe(false);
    expect(r.reason).toMatch(/token id/i);
  });
});
