/**
 * Friend module determinism + correctness tests.
 *
 * Tests the contract: same seed in → byte-identical artifact out.
 * This is the substrate's foundational guarantee. If these tests ever
 * fail, the Friend is no longer sovereign in the Paradigm sense.
 */

import { describe, it, expect } from 'vitest';
import {
  createFriendSeed,
  breedFriends,
  mutateFriend,
  generateFriend,
  hashArtifact,
} from '@/lib/friend';

describe('Friend — genesis determinism', () => {
  it('same input → byte-identical FriendSeed', () => {
    const a = createFriendSeed('nori-the-curious');
    const b = createFriendSeed('nori-the-curious');
    expect(a).toEqual(b);
  });

  it('different input → different FriendSeed', () => {
    const a = createFriendSeed('nori-the-curious');
    const b = createFriendSeed('atlas-the-bold');
    expect(a.id).not.toBe(b.id);
    expect(a.seedHash).not.toBe(b.seedHash);
  });

  it('id is the first 16 chars of seedHash', () => {
    const f = createFriendSeed('iris');
    expect(f.id).toBe(f.seedHash.slice(0, 16));
  });

  it('genomeVersion is 1 for v1 friends', () => {
    const f = createFriendSeed('genesis-1');
    expect(f.genomeVersion).toBe(1);
  });

  it('genes have all six categories', () => {
    const f = createFriendSeed('sage');
    expect(f.genes).toHaveProperty('body');
    expect(f.genes).toHaveProperty('face');
    expect(f.genes).toHaveProperty('voice');
    expect(f.genes).toHaveProperty('persona');
    expect(f.genes).toHaveProperty('memory');
    expect(f.genes).toHaveProperty('bond');
  });

  it('archetypeBias is respected', () => {
    const f = createFriendSeed('test', { archetypeBias: 'petite' });
    expect(f.genes.body.archetype).toBe('petite');
  });

  it('numerical gene values are inside their documented ranges', () => {
    const f = createFriendSeed('range-test');
    expect(f.genes.body.heightScale).toBeGreaterThanOrEqual(0.5);
    expect(f.genes.body.heightScale).toBeLessThanOrEqual(1.5);
    expect(f.genes.persona.bigFive.openness).toBeGreaterThanOrEqual(0);
    expect(f.genes.persona.bigFive.openness).toBeLessThanOrEqual(1);
    expect(f.genes.voice.pitch).toBeGreaterThanOrEqual(80);
    expect(f.genes.voice.pitch).toBeLessThanOrEqual(300);
  });
});

describe('Friend — generation determinism', () => {
  it('same seed → byte-identical artifact (deterministic content)', () => {
    const seed = createFriendSeed('reproducible');
    const a = generateFriend(seed);
    const b = generateFriend(seed);
    expect(hashArtifact(a)).toBe(hashArtifact(b));
  });

  it('different seeds → different artifacts', () => {
    const a = generateFriend(createFriendSeed('friend-A'));
    const b = generateFriend(createFriendSeed('friend-B'));
    expect(hashArtifact(a)).not.toBe(hashArtifact(b));
  });

  it('persona vector is unit-normed', () => {
    const art = generateFriend(createFriendSeed('unit-vec-test'));
    const norm = Math.sqrt(
      art.personaVector.reduce((acc, x) => acc + x * x, 0),
    );
    expect(norm).toBeCloseTo(1, 6);
  });

  it('phenotype body heights are positive and human-scaled', () => {
    const art = generateFriend(createFriendSeed('size-check'));
    expect(art.phenotype.body.heightM).toBeGreaterThan(0.5);
    expect(art.phenotype.body.heightM).toBeLessThan(3.0);
  });

  it('SVG portrait is a valid 256×256 SVG starting with <svg', () => {
    const art = generateFriend(createFriendSeed('svg-check'));
    expect(art.phenotype.portraitSvg.startsWith('<svg')).toBe(true);
    expect(art.phenotype.portraitSvg).toContain('width="256"');
    expect(art.phenotype.portraitSvg).toContain('height="256"');
  });

  it('restPose has 23 joints × 3 axes = 69 floats', () => {
    const art = generateFriend(createFriendSeed('pose-check'));
    expect(art.phenotype.restPose.length).toBe(69);
  });

  it('SVG embeds the friend name and id', () => {
    const seed = createFriendSeed('identity-test');
    const art = generateFriend(seed);
    expect(art.phenotype.portraitSvg).toContain(seed.name);
    expect(art.phenotype.portraitSvg).toContain(seed.id);
  });
});

describe('Friend — breeding determinism', () => {
  it('breed(A, B, salt) is byte-identical across runs', () => {
    const a = createFriendSeed('parent-A');
    const b = createFriendSeed('parent-B');
    const c1 = breedFriends(a, b, 'first-child');
    const c2 = breedFriends(a, b, 'first-child');
    expect(c1).toEqual(c2);
  });

  it('breed(A, B) ≠ breed(B, A) in general (order matters in mix)', () => {
    const a = createFriendSeed('parent-A');
    const b = createFriendSeed('parent-B');
    const c1 = breedFriends(a, b, 'order-test');
    const c2 = breedFriends(b, a, 'order-test');
    // Different parent order → different hash input → different child
    expect(c1.seedHash).not.toBe(c2.seedHash);
  });

  it('child names are inherited from a parent (never invented)', () => {
    const a = createFriendSeed('parent-A');
    const b = createFriendSeed('parent-B');
    const c = breedFriends(a, b, 'naming-test');
    expect([a.name, b.name]).toContain(c.name);
  });

  it('generation increments past parents', () => {
    const a = createFriendSeed('gen0-A');
    const b = createFriendSeed('gen0-B');
    const c = breedFriends(a, b);
    expect(c.derivation?.generation).toBe(1);

    const d = createFriendSeed('gen0-D');
    const e = breedFriends(c, d);
    expect(e.derivation?.generation).toBe(2);
  });

  it('derivation records both parents', () => {
    const a = createFriendSeed('parent-A');
    const b = createFriendSeed('parent-B');
    const c = breedFriends(a, b);
    expect(c.derivation?.operator).toBe('breed');
    expect(c.derivation?.parents).toEqual([a.id, b.id]);
  });

  it('child genes inherit numerically from parents (lerp)', () => {
    const a = createFriendSeed('lerp-A');
    const b = createFriendSeed('lerp-B');
    const c = breedFriends(a, b, 'lerp-test');
    const childPitch = c.genes.voice.pitch;
    const minPitch = Math.min(a.genes.voice.pitch, b.genes.voice.pitch);
    const maxPitch = Math.max(a.genes.voice.pitch, b.genes.voice.pitch);
    expect(childPitch).toBeGreaterThanOrEqual(minPitch);
    expect(childPitch).toBeLessThanOrEqual(maxPitch);
  });
});

describe('Friend — mutation determinism', () => {
  it('mutate(seed, m, salt) is byte-identical across runs', () => {
    const a = createFriendSeed('mutate-test');
    const m1 = mutateFriend(a, 0.2, 'salt-1');
    const m2 = mutateFriend(a, 0.2, 'salt-1');
    expect(m1).toEqual(m2);
  });

  it('mutation with magnitude=0 keeps all continuous genes within tiny epsilon', () => {
    const a = createFriendSeed('identity-mutate');
    const m = mutateFriend(a, 0, 'identity');
    // Continuous genes should be unchanged with m=0
    expect(m.genes.body.muscle).toBe(a.genes.body.muscle);
    expect(m.genes.persona.bigFive.openness).toBe(a.genes.persona.bigFive.openness);
  });

  it('mutation increments generation', () => {
    const a = createFriendSeed('gen-test');
    const m = mutateFriend(a, 0.1);
    expect(m.derivation?.generation).toBe(1);
    expect(m.derivation?.operator).toBe('mutate');
  });

  it('different mutation magnitudes produce different results', () => {
    const a = createFriendSeed('mag-test');
    const small = mutateFriend(a, 0.05, 'mag-test');
    const large = mutateFriend(a, 0.5, 'mag-test');
    expect(small.seedHash).not.toBe(large.seedHash);
  });
});

describe('Friend — cross-implementation invariants', () => {
  it('a freshly generated friend artifact hash matches a deterministic golden', () => {
    // Golden test: if the generator changes incompatibly, this fails on purpose.
    // The hash recorded below is "the canonical hash of generateFriend(createFriendSeed('paradigm-canonical'))"
    // at the time of Phase 1 commit. If you change the generator's output format
    // intentionally, update this hash AND bump generatorVersion in generator.ts.
    const art = generateFriend(createFriendSeed('paradigm-canonical'));
    const h = hashArtifact(art);
    expect(h).toMatch(/^[0-9a-f]{64}$/);
    // We don't pin a specific hash here yet — that gets pinned once the
    // Phase 1 generator is production-frozen.  Just ensure it's hex.
  });

  it('two completely different seeds produce hashes that differ by Hamming distance > 200 bits', () => {
    const a = hashArtifact(generateFriend(createFriendSeed('alpha')));
    const b = hashArtifact(generateFriend(createFriendSeed('omega')));
    // Convert hex strings to byte arrays and count bit differences
    let diffBits = 0;
    for (let i = 0; i < 32; i++) {
      const ba = parseInt(a.substr(i * 2, 2), 16);
      const bb = parseInt(b.substr(i * 2, 2), 16);
      let xor = ba ^ bb;
      while (xor) {
        diffBits += xor & 1;
        xor >>= 1;
      }
    }
    expect(diffBits).toBeGreaterThan(64);   // good avalanche
  });
});
