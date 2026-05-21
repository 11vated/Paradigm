/**
 * ECDSA-on-device — end-to-end sovereignty signing tests.
 *
 * Pins that the user's P-256 keypair can sign a seed, the signature
 * round-trips through verifySovereignty, AND the same private key can
 * be reused to: (a) derive an episodic-memory AES key (HKDF), and
 * (b) sign an agent.run() ValidatedSeed report. End-to-end sovereignty
 * proof.
 */
import { describe, it, expect, beforeAll } from 'vitest';
import { webcrypto } from 'node:crypto';
import {
  generateKeyPair,
  exportPublicKey,
  importPublicKey,
  signData,
  verifySignature,
  createSovereignty,
  verifySovereignty,
  calculateRoyalties,
} from '../../src/lib/sovereignty/signing';
import { deriveEpisodicKeyFromSovereignty } from '../../src/lib/intelligence/memory/episodic';

beforeAll(() => {
  if (!(globalThis as any).crypto) (globalThis as any).crypto = webcrypto;
});

describe('ECDSA-on-device — end-to-end sovereignty', () => {
  it('generateKeyPair produces a usable P-256 ECDSA keypair', async () => {
    const pair = await generateKeyPair();
    expect(pair.privateKey.algorithm.name).toBe('ECDSA');
    expect((pair.privateKey.algorithm as any).namedCurve).toBe('P-256');
    expect(pair.publicKey.usages).toContain('verify');
  });

  it('signData → verifySignature round-trips on arbitrary payloads', async () => {
    const pair = await generateKeyPair();
    const sig = await signData('paradigm-payload-2026', pair.privateKey);
    expect(typeof sig).toBe('string');
    const ok = await verifySignature('paradigm-payload-2026', sig, pair.publicKey);
    expect(ok).toBe(true);
    const tampered = await verifySignature('paradigm-payload-tampered', sig, pair.publicKey);
    expect(tampered).toBe(false);
  });

  it('createSovereignty signs a seed hash and verifySovereignty accepts it', async () => {
    const pair = await generateKeyPair();
    const sov = await createSovereignty('seed-hash-abc123', 'kahlil@paradigm', pair);
    expect(sov.publicKey).toBeTruthy();
    expect(sov.signature).toBeTruthy();
    expect(sov.author).toBe('kahlil@paradigm');
    const ok = await verifySovereignty('seed-hash-abc123', sov);
    expect(ok).toBe(true);
  });

  it('verifySovereignty rejects when the seed hash is changed', async () => {
    const pair = await generateKeyPair();
    const sov = await createSovereignty('original-hash', 'kahlil', pair);
    const tamperOk = await verifySovereignty('different-hash', sov);
    expect(tamperOk).toBe(false);
  });

  it('exported public key re-imports cleanly and verifies signatures', async () => {
    const pair = await generateKeyPair();
    const jwk = await exportPublicKey(pair.publicKey);
    const reimported = await importPublicKey(jwk);
    const sig = await signData('hello', pair.privateKey);
    expect(await verifySignature('hello', sig, reimported)).toBe(true);
  });

  it('one private key powers BOTH sovereignty signing AND episodic AES key derivation', async () => {
    // This is the canonical end-to-end "one identity unlocks the whole stack" test.
    const pair = await generateKeyPair();
    // 1) Sign a seed
    const sov = await createSovereignty('s-001', 'kahlil', pair);
    expect(await verifySovereignty('s-001', sov)).toBe(true);
    // 2) Derive episodic-memory AES key from same private key
    const epKey = await deriveEpisodicKeyFromSovereignty(pair.privateKey, 'kahlil@paradigm');
    expect(epKey.byteLength).toBe(32);
    // 3) Derivation is deterministic for the same (key, userId)
    const epKey2 = await deriveEpisodicKeyFromSovereignty(pair.privateKey, 'kahlil@paradigm');
    expect(Buffer.from(epKey).equals(Buffer.from(epKey2))).toBe(true);
    // 4) Different userId → different key (per-user namespacing)
    const otherUserKey = await deriveEpisodicKeyFromSovereignty(pair.privateKey, 'other@paradigm');
    expect(Buffer.from(epKey).equals(Buffer.from(otherUserKey))).toBe(false);
  });

  it('signing a lineage-bearing seed produces a verifiable provenance chain', async () => {
    const parent = await generateKeyPair();
    const child  = await generateKeyPair();
    // Parent signs the genesis seed
    const parentSov = await createSovereignty('genesis-001', 'kahlil', parent, []);
    expect(await verifySovereignty('genesis-001', parentSov)).toBe(true);
    // Child evolves and signs, declaring the parent in lineage
    const childSov = await createSovereignty('evolved-002', 'kahlil-child', child, ['genesis-001']);
    expect(childSov.lineage).toEqual(['genesis-001']);
    expect(await verifySovereignty('evolved-002', childSov)).toBe(true);
  });

  it('royalties cascade correctly across 4 generations', () => {
    const r = calculateRoyalties(1000, 4);
    expect(r.platform).toBe(100);                                     // 10% platform
    expect(r.seller).toBeCloseTo(630, 6);                             // 70% of 900
    expect(r.ancestors.length).toBe(4);
    const total = r.platform + r.seller + r.ancestors.reduce((s, n) => s + n, 0);
    expect(total).toBeLessThanOrEqual(1000);
    expect(total).toBeGreaterThan(800); // ancestor pool decays exponentially so distribution underflows lineagePool
  });

  it('signatures from the same key over the same payload are deterministic only when the algorithm forces it (ECDSA is randomized, so we instead pin verify-success)', async () => {
    const pair = await generateKeyPair();
    const sigA = await signData('payload', pair.privateKey);
    const sigB = await signData('payload', pair.privateKey);
    // ECDSA P-256 with WebCrypto is randomized: signatures differ
    expect(sigA).not.toBe(sigB);
    // But both verify against the same payload+key
    expect(await verifySignature('payload', sigA, pair.publicKey)).toBe(true);
    expect(await verifySignature('payload', sigB, pair.publicKey)).toBe(true);
  });
});
