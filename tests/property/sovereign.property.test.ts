/**
 * Property-based tests for sovereign sign/verify roundtrip.
 *
 * The kernel never lies: a signed seed must verify under the same key,
 * and must fail to verify under a different key. The FedV1 envelope
 * must round-trip through create→verify with a correct merkle proof.
 */
import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import {
  SovereigntyLayer,
  createFedV1SignedExchange,
  verifyFedV1Exchange,
  detMergeFed,
  detForkFed,
} from '@/lib/sovereignty';

const arbHexHash = fc
  .array(fc.integer({ min: 0, max: 255 }), { minLength: 8, maxLength: 64 })
  .map((arr) => arr.map((b) => b.toString(16).padStart(2, '0')).join(''));

const arbLineage = fc.array(arbHexHash, { minLength: 0, maxLength: 8 });

const arbSeedObj = fc.record({
  name: fc.string({ minLength: 1, maxLength: 16 }),
  domain: fc.constantFrom('character', 'sprite', 'music', 'world', 'narrative'),
  $hash: arbHexHash,
});

describe('Sovereign sign/verify — property ladder', () => {
  it('key generation is deterministic-shaped (PEM, EC)', () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 5 }), () => {
        const k = SovereigntyLayer.generateKeys();
        expect(k.public_key).toContain('BEGIN PUBLIC KEY');
        expect(k.private_key).toContain('BEGIN PRIVATE KEY');
        expect(k.public_key).toContain('END PUBLIC KEY');
        expect(k.private_key).toContain('END PRIVATE KEY');
      }),
      { numRuns: 10 }
    );
  });

  it('sign then verify with same key passes', () => {
    fc.assert(
      fc.property(arbSeedObj, (seed) => {
        const k = SovereigntyLayer.generateKeys();
        const signed = SovereigntyLayer.signSeed(seed, k.private_key);
        const seedWithSig = { ...seed, $sovereignty: { signature: signed.signature, public_key: signed.public_key } };
        const ok = SovereigntyLayer.verifySeed(seedWithSig, k.public_key);
        expect(ok).toBe(true);
      }),
      { numRuns: 30 }
    );
  });

  it('sign with key A, verify with key B → fails', () => {
    fc.assert(
      fc.property(arbSeedObj, (seed) => {
        const a = SovereigntyLayer.generateKeys();
        const b = SovereigntyLayer.generateKeys();
        const signed = SovereigntyLayer.signSeed(seed, a.private_key);
        const seedWithSig = { ...seed, $sovereignty: { signature: signed.signature, public_key: signed.public_key } };
        const ok = SovereigntyLayer.verifySeed(seedWithSig, b.public_key);
        expect(ok).toBe(false);
      }),
      { numRuns: 20 }
    );
  });

  it('mutated seed → verification fails (kernel never lies)', () => {
    fc.assert(
      fc.property(arbSeedObj, (seed) => {
        const k = SovereigntyLayer.generateKeys();
        const signed = SovereigntyLayer.signSeed(seed, k.private_key);
        const seedWithSig = { ...seed, $sovereignty: { signature: signed.signature, public_key: signed.public_key } };
        const mutated = { ...seedWithSig, name: seed.name + '_mut' };
        const ok = SovereigntyLayer.verifySeed(mutated, k.public_key);
        expect(ok).toBe(false);
      }),
      { numRuns: 20 }
    );
  });

  it('FedV1 envelope: create+verify round-trips correctly', () => {
    fc.assert(
      fc.property(arbHexHash, arbLineage, (seedHash, lineage) => {
        const k = SovereigntyLayer.generateKeys();
        // Ensure the seedHash is in the lineage so the merkle proof covers it
        const fullLineage = lineage.includes(seedHash) ? lineage : [seedHash, ...lineage];
        const ex = createFedV1SignedExchange(
          'nodeA',
          'nodeB',
          seedHash,
          fullLineage,
          k.private_key
        );
        const v = verifyFedV1Exchange(ex, k.public_key);
        expect(v.sigOk).toBe(true);
        expect(v.merkleOk).toBe(true);
      }),
      { numRuns: 20 }
    );
  });

  it('detMergeFed is deterministic: same inputs → same merged seed id', () => {
    fc.assert(
      fc.property(arbHexHash, arbLineage, arbHexHash, (seedHash, lineage, localHash) => {
        const a = SovereigntyLayer.generateKeys();
        const incoming = createFedV1SignedExchange(
          'nodeA', 'nodeB', seedHash, lineage, a.private_key
        );
        const m1 = detMergeFed(incoming, localHash, [...lineage, `${localHash}-anc`], a.private_key);
        const m2 = detMergeFed(incoming, localHash, [...lineage, `${localHash}-anc`], a.private_key);
        expect(m1.mergedSeedId).toBe(m2.mergedSeedId);
        expect(m1.fork).toBe(m2.fork);
      }),
      { numRuns: 15 }
    );
  });

  it('detForkFed produces a new fork with extended lineage', () => {
    fc.assert(
      fc.property(arbHexHash, arbLineage, (seedHash, lineage) => {
        const k = SovereigntyLayer.generateKeys();
        const fork = detForkFed(seedHash, lineage, k.private_key);
        expect(fork.success).toBe(true);
        expect(fork.forkedSeedId).toBeTruthy();
        expect(fork.newLineage).toBeDefined();
        expect(fork.newLineage.length).toBeGreaterThanOrEqual(lineage.length);
        // new lineage should include source
        const flat = new Set(fork.newLineage);
        expect(flat.has(seedHash)).toBe(true);
      }),
      { numRuns: 15 }
    );
  });
});
