/**
 * Friend sovereignty tests — ECDSA-P256 sign + verify, tampering detection.
 */

import { describe, it, expect } from 'vitest';
import {
  createFriendSeed,
  generateFriendKeyPair,
  signFriendSeed,
  verifyFriendSovereignty,
  friendPayloadHash,
  canonicalFriendJson,
  breedFriends,
} from '@/lib/friend';

describe('Friend sovereignty — keypair + sign + verify', () => {
  it('generateFriendKeyPair produces valid JWK strings', async () => {
    const kp = await generateFriendKeyPair();
    expect(kp.publicKey).toBeTypeOf('string');
    expect(kp.privateKey).toBeTypeOf('string');
    const pub = JSON.parse(kp.publicKey);
    const priv = JSON.parse(kp.privateKey);
    expect(pub.kty).toBe('EC');
    expect(pub.crv).toBe('P-256');
    expect(priv.kty).toBe('EC');
    expect(priv.crv).toBe('P-256');
    expect(priv.d).toBeTypeOf('string'); // private d component present
    expect(pub.d).toBeUndefined();        // public must NOT have d
  });

  it('signed friend verifies successfully against its own key', async () => {
    const kp = await generateFriendKeyPair();
    const friend = createFriendSeed('test-sov-1');
    const signed = await signFriendSeed(friend, kp.privateKey, kp.publicKey);
    expect(signed.sovereignty).toBeDefined();
    expect(signed.sovereignty!.author).toBe(kp.publicKey);
    expect(signed.sovereignty!.algorithm).toBe('ECDSA-P256-SHA256');
    const v = await verifyFriendSovereignty(signed);
    expect(v.valid).toBe(true);
    expect(v.payloadHash).toBe(signed.sovereignty!.payloadHash);
    expect(v.author).toBe(kp.publicKey);
  });

  it('signing does not mutate the input friend', async () => {
    const kp = await generateFriendKeyPair();
    const friend = createFriendSeed('test-sov-2');
    const before = JSON.stringify(friend);
    await signFriendSeed(friend, kp.privateKey, kp.publicKey);
    const after = JSON.stringify(friend);
    expect(before).toBe(after);
    expect(friend.sovereignty).toBeUndefined();
  });

  it('payloadHash is identical for two signings of the same friend', async () => {
    const kp = await generateFriendKeyPair();
    const friend = createFriendSeed('test-sov-3');
    const a = await signFriendSeed(friend, kp.privateKey, kp.publicKey);
    const b = await signFriendSeed(friend, kp.privateKey, kp.publicKey);
    expect(a.sovereignty!.payloadHash).toBe(b.sovereignty!.payloadHash);
  });

  it('signature is ECDSA-randomized — same hash, different signatures', async () => {
    const kp = await generateFriendKeyPair();
    const friend = createFriendSeed('test-sov-randomization');
    const a = await signFriendSeed(friend, kp.privateKey, kp.publicKey);
    const b = await signFriendSeed(friend, kp.privateKey, kp.publicKey);
    // Same payload, but ECDSA includes randomness — signatures should differ
    expect(a.sovereignty!.signature).not.toBe(b.sovereignty!.signature);
    // BUT both verify
    expect((await verifyFriendSovereignty(a)).valid).toBe(true);
    expect((await verifyFriendSovereignty(b)).valid).toBe(true);
  });

  it('canonicalFriendJson strips the sovereignty field', async () => {
    const friend = createFriendSeed('test-canonical');
    const before = canonicalFriendJson(friend);
    const kp = await generateFriendKeyPair();
    const signed = await signFriendSeed(friend, kp.privateKey, kp.publicKey);
    const after = canonicalFriendJson(signed);
    expect(before).toBe(after); // signing must not change the canonical payload
  });

  it('payloadHash matches the friend pre-signing', async () => {
    const friend = createFriendSeed('test-payloadhash');
    const hash = friendPayloadHash(friend);
    const kp = await generateFriendKeyPair();
    const signed = await signFriendSeed(friend, kp.privateKey, kp.publicKey);
    expect(signed.sovereignty!.payloadHash).toBe(hash);
  });

  it('canonical JSON is stable across object-key reordering', () => {
    const f1 = createFriendSeed('test-stability');
    const reordered = JSON.parse(JSON.stringify(f1));
    // Build a key-shuffled version
    const shuffled = {
      sovereignty: undefined,
      genes: reordered.genes,
      bornAt: reordered.bornAt,
      name: reordered.name,
      id: reordered.id,
      seedHash: reordered.seedHash,
      genomeVersion: reordered.genomeVersion,
      derivation: reordered.derivation,
    } as any;
    expect(canonicalFriendJson(shuffled)).toBe(canonicalFriendJson(f1));
  });
});

describe('Friend sovereignty — tampering + key separation', () => {
  it('mutating the friend after signing invalidates verification', async () => {
    const kp = await generateFriendKeyPair();
    const friend = createFriendSeed('test-tamper-1');
    const signed = await signFriendSeed(friend, kp.privateKey, kp.publicKey);
    const tampered = { ...signed, name: 'Eve' };
    const v = await verifyFriendSovereignty(tampered);
    expect(v.valid).toBe(false);
    expect(v.reason).toMatch(/payload hash mismatch/);
  });

  it('mutating a gene after signing invalidates verification', async () => {
    const kp = await generateFriendKeyPair();
    const friend = createFriendSeed('test-tamper-2');
    const signed = await signFriendSeed(friend, kp.privateKey, kp.publicKey);
    const tampered = {
      ...signed,
      genes: {
        ...signed.genes,
        voice: { ...signed.genes.voice, pitch: signed.genes.voice.pitch + 50 },
      },
    };
    const v = await verifyFriendSovereignty(tampered);
    expect(v.valid).toBe(false);
    expect(v.reason).toMatch(/payload hash mismatch/);
  });

  it('rejects friend signed by attacker even if author claims victim key', async () => {
    const victim = await generateFriendKeyPair();
    const attacker = await generateFriendKeyPair();
    const friend = createFriendSeed('test-impersonation');
    // Attacker signs with their own key but claims victim's public key
    const attackerSigned = await signFriendSeed(friend, attacker.privateKey, victim.publicKey);
    const v = await verifyFriendSovereignty(attackerSigned);
    expect(v.valid).toBe(false);
    expect(v.reason).toMatch(/signature verification failed/);
  });

  it('rejects friend with no sovereignty field', async () => {
    const friend = createFriendSeed('test-unsigned');
    const v = await verifyFriendSovereignty(friend);
    expect(v.valid).toBe(false);
    expect(v.reason).toMatch(/no sovereignty receipt/);
  });

  it('rejects friend with unsupported algorithm', async () => {
    const kp = await generateFriendKeyPair();
    const friend = createFriendSeed('test-badalg');
    const signed = await signFriendSeed(friend, kp.privateKey, kp.publicKey);
    const tampered = {
      ...signed,
      sovereignty: { ...signed.sovereignty!, algorithm: 'RSA-PSS-2048' as any },
    };
    const v = await verifyFriendSovereignty(tampered);
    expect(v.valid).toBe(false);
    expect(v.reason).toMatch(/unsupported algorithm/);
  });

  it('rejects friend with malformed signature', async () => {
    const kp = await generateFriendKeyPair();
    const friend = createFriendSeed('test-malformed');
    const signed = await signFriendSeed(friend, kp.privateKey, kp.publicKey);
    const tampered = {
      ...signed,
      sovereignty: { ...signed.sovereignty!, signature: 'not-base64!!!' },
    };
    const v = await verifyFriendSovereignty(tampered);
    expect(v.valid).toBe(false);
  });
});

describe('Friend sovereignty — composition with breeding', () => {
  it('a bred child can be signed and verified', async () => {
    const kp = await generateFriendKeyPair();
    const a = createFriendSeed('parent-A');
    const b = createFriendSeed('parent-B');
    const child = breedFriends(a, b, 'child-1');
    const signed = await signFriendSeed(child, kp.privateKey, kp.publicKey);
    const v = await verifyFriendSovereignty(signed);
    expect(v.valid).toBe(true);
  });

  it('re-signing a previously-signed friend rotates the receipt', async () => {
    const a = await generateFriendKeyPair();
    const b = await generateFriendKeyPair();
    const friend = createFriendSeed('test-rotate');
    const signed1 = await signFriendSeed(friend, a.privateKey, a.publicKey);
    expect(signed1.sovereignty!.author).toBe(a.publicKey);
    // Strip the receipt first, then re-sign with b
    const stripped = { ...signed1, sovereignty: undefined };
    delete (stripped as any).sovereignty;
    const signed2 = await signFriendSeed(stripped as any, b.privateKey, b.publicKey);
    expect(signed2.sovereignty!.author).toBe(b.publicKey);
    expect((await verifyFriendSovereignty(signed2)).valid).toBe(true);
  });
});
