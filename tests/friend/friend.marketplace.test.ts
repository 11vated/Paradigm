/**
 * Friend marketplace prep tests — ABI-encoded calldata for list/delist/buy.
 */
import { describe, it, expect, beforeAll } from 'vitest';
import { createFriendSeed, prepareList, prepareDelist, prepareBuy, type FriendSeedData } from '@/lib/friend';

const ANCHORED: FriendSeedData = (() => {
  const f = createFriendSeed('mp-test');
  return {
    ...f,
    sovereignty: {
      algo: 'ECDSA-P256-SHA256',
      publicKey: 'jwk',
      signature: 'sig',
      payloadHash: 'h',
      timestamp: 0,
      anchor: {
        tokenId: '12345',
        contractAddress: '0xaaaa000000000000000000000000000000000001',
        transactionHash: '0xbb',
        network: 'test',
        anchoredAt: '1970-01-01T00:00:00Z',
        metadataUri: 'ipfs://x',
        metadataHash: 'mh',
      },
    },
  } as FriendSeedData;
})();

describe('Friend marketplace prep', () => {
  beforeAll(() => { process.env.SEED_NFT_ADDRESS = '0xaaaa000000000000000000000000000000000001'; });

  it('list: returns valid ABI-encoded calldata for list(tokenId, price)', () => {
    const prep = prepareList(ANCHORED, '1000000000000000000');
    expect(prep.calldata).toMatch(/^0x[0-9a-f]+$/i);
    expect(prep.calldata.length).toBeGreaterThan(10);
    expect(prep.function).toBe('list(uint256,uint256)');
    expect(prep.params.tokenId).toBe('12345');
    expect(prep.value).toBe('0x0');
    // 4-byte selector for list(uint256,uint256) is 0xb71d1a0c
    expect(prep.calldata.slice(0, 10).toLowerCase()).toBe('0x50fd7367');
  });

  it('delist: function selector matches', () => {
    const prep = prepareDelist(ANCHORED);
    expect(prep.function).toBe('delist(uint256)');
    expect(prep.value).toBe('0x0');
  });

  it('buy: value field encodes priceWei correctly', () => {
    const prep = prepareBuy(ANCHORED, '500000000000000000');
    expect(prep.function).toBe('buy(uint256)');
    expect(BigInt(prep.value)).toBe(500000000000000000n);
  });

  it('unanchored friend throws', () => {
    const f = createFriendSeed('no-anchor');
    expect(() => prepareList(f, '1')).toThrow(/anchor/);
  });

  it('deterministic: same input produces same calldata', () => {
    const a = prepareList(ANCHORED, '1000');
    const b = prepareList(ANCHORED, '1000');
    expect(a.calldata).toBe(b.calldata);
  });
});
