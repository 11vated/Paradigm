/**
 * Sovereignty: ECDSA P-256 Signing Tests
 * 
 * Tests sign/verify cycle, per-gene signing, and determinism.
 * Uses Web Crypto API (available in Node 20+ and modern browsers).
 */
import { describe, it, expect, beforeAll } from 'vitest';
import { UniversalSeed } from '../../src/seeds/universal-seed';

describe('Sovereignty: ECDSA P-256 Signing', () => {
  let keyPair: CryptoKeyPair;

  beforeAll(async () => {
    keyPair = await crypto.subtle.generateKey(
      { name: 'ECDSA', namedCurve: 'P-256' },
      true,
      ['sign', 'verify']
    );
  });

  it('sign() attaches sovereignty to seed', async () => {
    const seed = new UniversalSeed({
      metadata: {
        id: 'sign-test-1', name: 'Sign Test', version: '1.0.0',
        created: 0, updated: 0, tags: ['character'], lineage: []
      }
    });

    const signed = await seed.sign(keyPair.privateKey, 'test-author');

    expect(signed.sovereignty).toBeDefined();
    expect(signed.sovereignty!.signature).toBeDefined();
    expect(typeof signed.sovereignty!.signature).toBe('string');
    expect(signed.sovereignty!.signature.length).toBeGreaterThan(0);
  });

  it('verify() returns true for valid signature', async () => {
    const seed = new UniversalSeed({
      metadata: {
        id: 'verify-test-1', name: 'Verify Test', version: '1.0.0',
        created: 0, updated: 0, tags: ['music'], lineage: []
      }
    });

    const signed = await seed.sign(keyPair.privateKey, 'test-author');
    const valid = await signed.verify(keyPair.publicKey, 'test-author');

    expect(valid).toBe(true);
  });

  it('verify() returns false for tampered seed', async () => {
    const seed = new UniversalSeed({
      metadata: {
        id: 'tamper-test', name: 'Tamper Test', version: '1.0.0',
        created: 0, updated: 0, tags: ['sprite'], lineage: []
      }
    });
    seed.setGene('color' as any, [255, 0, 0]);

    const signed = await seed.sign(keyPair.privateKey, 'test-author');

    // Tamper by modifying a gene value
    const tampered = signed.clone();
    tampered.setGene('color' as any, [0, 0, 0]);

    const valid = await tampered.verify(keyPair.publicKey, 'test-author');
    expect(valid).toBe(false);
  });

  it('signGene() signs individual gene', async () => {
    const seed = new UniversalSeed({
      metadata: {
        id: 'gene-sign-test', name: 'Gene Sign', version: '1.0.0',
        created: 0, updated: 0, tags: ['character'], lineage: []
      }
    });
    seed.setGene('size' as any, 1.75);

    const signed = await seed.signGene('size', keyPair.privateKey, 'CC-BY-NC', 'test-author');

    expect(signed.sovereignty!.genes).toBeDefined();
    expect(signed.sovereignty!.genes!['size']).toBeDefined();
    expect(signed.sovereignty!.genes!['size'].license).toBe('CC-BY-NC');
    expect(signed.sovereignty!.genes!['size'].signature).toBeDefined();
  });

  it('verifyGene() validates gene signature', async () => {
    const seed = new UniversalSeed({
      metadata: {
        id: 'gene-verify-test', name: 'Gene Verify', version: '1.0.0',
        created: 0, updated: 0, tags: ['character'], lineage: []
      }
    });
    seed.setGene('size' as any, 1.75);

    const signed = await seed.signGene('size', keyPair.privateKey, 'CC-BY', 'test-author');
    const valid = await signed.verifyGene('size', keyPair.publicKey);

    expect(valid).toBe(true);
  });

  // Note: RFC 6979 deterministic nonces require a custom implementation.
  // Web Crypto API uses random nonces by default (non-deterministic signatures).
  // Add RFC 6979 support in P1.6 for cross-platform deterministic signing.
});
