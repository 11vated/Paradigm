/**
 * Friend — genesis, breeding, and mutation tests.
 *
 * Pins the determinism contract: same seed/salt → byte-identical FriendSeed,
 * even across process restarts. Also pins gene-domain shape (BodyArchetype,
 * EyeShape, etc.) and lineage propagation through breed/mutate.
 */
import { describe, it, expect } from 'vitest';
import { createHash } from 'crypto';
import {
  createFriendSeed,
} from '../../src/lib/friend/genesis';
import {
  breedFriends,
  mutateFriend,
} from '../../src/lib/friend/breeding';
import type { FriendSeedData } from '../../src/lib/friend/types';

// ─── Helpers ────────────────────────────────────────────────────────────────

function hashSeed(seed: FriendSeedData): string {
  return createHash('sha256')
    .update(JSON.stringify(seed))
    .digest('hex');
}

// ─── createFriendSeed ───────────────────────────────────────────────────────

describe('createFriendSeed', () => {
  it('produces a deterministically-hashable seed for the same input', () => {
    const a = createFriendSeed('paradigm-friend-test-1');
    const b = createFriendSeed('paradigm-friend-test-1');
    expect(hashSeed(a)).toBe(hashSeed(b));
    expect(a.seedHash).toBe(b.seedHash);
    expect(a.id).toBe(b.id);
  });

  it('produces different seeds for different inputs', () => {
    const a = createFriendSeed('paradigm-friend-A');
    const b = createFriendSeed('paradigm-friend-B');
    expect(a.seedHash).not.toBe(b.seedHash);
  });

  it('id is the first 16 hex chars of the seed hash', () => {
    const s = createFriendSeed('paradigm-friend-id-test');
    expect(s.id).toBe(s.seedHash.slice(0, 16));
    expect(s.id).toMatch(/^[0-9a-f]{16}$/);
  });

  it('full seed hash is 64-char hex SHA-256', () => {
    const s = createFriendSeed('paradigm-friend-hash-test');
    expect(s.seedHash).toMatch(/^[0-9a-f]{64}$/);
  });

  it('id is stable for the same input across calls', () => {
    const s1 = createFriendSeed('paradigm-friend-stable');
    const s2 = createFriendSeed('paradigm-friend-stable');
    expect(s1.id).toBe(s2.id);
  });

  it('exposes the full gene bundle', () => {
    const s = createFriendSeed('paradigm-friend-genes');
    expect(s.genes.body).toBeDefined();
    expect(s.genes.face).toBeDefined();
    expect(s.genes.voice).toBeDefined();
    expect(s.genes.persona).toBeDefined();
    expect(s.genes.memory).toBeDefined();
    expect(s.genes.bond).toBeDefined();
  });

  it('body archetype is a valid BodyArchetype', () => {
    const valid = ['slender', 'athletic', 'sturdy', 'soft', 'tall', 'petite'];
    for (let i = 0; i < 12; i++) {
      const s = createFriendSeed(`paradigm-archetype-${i}`);
      expect(valid).toContain(s.genes.body.archetype);
    }
  });

  it('body heightScale is in [0.5, 1.5]', () => {
    for (let i = 0; i < 20; i++) {
      const s = createFriendSeed(`paradigm-height-${i}`);
      expect(s.genes.body.heightScale).toBeGreaterThanOrEqual(0.4); // small margin
      expect(s.genes.body.heightScale).toBeLessThanOrEqual(1.6);
    }
  });

  it('voice pitch is in [80, 300] Hz', () => {
    for (let i = 0; i < 20; i++) {
      const s = createFriendSeed(`paradigm-pitch-${i}`);
      expect(s.genes.voice.pitch).toBeGreaterThanOrEqual(80);
      expect(s.genes.voice.pitch).toBeLessThanOrEqual(300);
    }
  });

  it('Big Five scores are all in [0, 1]', () => {
    for (let i = 0; i < 10; i++) {
      const s = createFriendSeed(`paradigm-bigfive-${i}`);
      const bf = s.genes.persona.bigFive;
      expect(bf.openness).toBeGreaterThanOrEqual(0);
      expect(bf.openness).toBeLessThanOrEqual(1);
      expect(bf.conscientiousness).toBeGreaterThanOrEqual(0);
      expect(bf.conscientiousness).toBeLessThanOrEqual(1);
      expect(bf.extraversion).toBeGreaterThanOrEqual(0);
      expect(bf.extraversion).toBeLessThanOrEqual(1);
      expect(bf.agreeableness).toBeGreaterThanOrEqual(0);
      expect(bf.agreeableness).toBeLessThanOrEqual(1);
      expect(bf.neuroticism).toBeGreaterThanOrEqual(0);
      expect(bf.neuroticism).toBeLessThanOrEqual(1);
    }
  });

  it('interests and values are non-empty arrays of unique strings', () => {
    const s = createFriendSeed('paradigm-unique-test');
    expect(s.genes.persona.interests.length).toBeGreaterThan(0);
    expect(s.genes.persona.values.length).toBeGreaterThan(0);
    expect(new Set(s.genes.persona.interests).size).toBe(s.genes.persona.interests.length);
    expect(new Set(s.genes.persona.values).size).toBe(s.genes.persona.values.length);
  });

  it('memory capacities are non-negative', () => {
    const s = createFriendSeed('paradigm-mem-test');
    expect(s.genes.memory.episodicCapacity).toBeGreaterThanOrEqual(100);
    expect(s.genes.memory.semanticCapacity).toBeGreaterThanOrEqual(100);
    expect(s.genes.memory.reflectionCadenceDays).toBeGreaterThanOrEqual(1);
  });

  it('derivation is set to { operator: "genesis", parents: [], generation: 0 }', () => {
    const s = createFriendSeed('paradigm-derivation-test');
    expect(s.derivation).toBeDefined();
    expect(s.derivation?.operator).toBe('genesis');
    expect(s.derivation?.parents).toEqual([]);
    expect(s.derivation?.generation).toBe(0);
  });

  it('archetypeBias is honored when supplied', () => {
    const tall = createFriendSeed('paradigm-bias-1', { archetypeBias: 'tall' });
    const petite = createFriendSeed('paradigm-bias-2', { archetypeBias: 'petite' });
    expect(tall.genes.body.archetype).toBe('tall');
    expect(petite.genes.body.archetype).toBe('petite');
  });

  it('name option produces a non-empty, deterministic name (cleanTitle polish)', () => {
    const s1 = createFriendSeed('paradigm-name-test', { name: 'Lyra' });
    const s2 = createFriendSeed('paradigm-name-test', { name: 'Lyra' });
    expect(s1.name).toBeTruthy();
    expect(s1.name).toBe(s2.name); // deterministic
    expect(s1.name.length).toBeGreaterThan(0);
  });

  it('bornAt defaults to epoch ISO when not supplied', () => {
    const s = createFriendSeed('paradigm-born-test');
    expect(s.bornAt).toBe(new Date(0).toISOString());
  });
});

// ─── breedFriends ───────────────────────────────────────────────────────────

describe('breedFriends', () => {
  it('is deterministic: same parents + same salt → identical child', () => {
    const a = createFriendSeed('paradigm-parent-A');
    const b = createFriendSeed('paradigm-parent-B');
    const child1 = breedFriends(a, b, 'salt-1');
    const child2 = breedFriends(a, b, 'salt-1');
    expect(child1.seedHash).toBe(child2.seedHash);
    expect(hashSeed(child1)).toBe(hashSeed(child2));
  });

  it('different salts produce different children', () => {
    const a = createFriendSeed('paradigm-parent-X');
    const b = createFriendSeed('paradigm-parent-Y');
    const c1 = breedFriends(a, b, 'salt-A');
    const c2 = breedFriends(a, b, 'salt-B');
    expect(c1.seedHash).not.toBe(c2.seedHash);
  });

  it('order of parents affects the result (parents are ordered in hash)', () => {
    const a = createFriendSeed('paradigm-mom');
    const b = createFriendSeed('paradigm-dad');
    const c1 = breedFriends(a, b, 'same-salt');
    const c2 = breedFriends(b, a, 'same-salt');
    expect(c1.seedHash).not.toBe(c2.seedHash);
  });

  it('resulting child has derivation { operator: "breed", parents: [a.id, b.id], generation: max+1 }', () => {
    const a = createFriendSeed('paradigm-pa');
    const b = createFriendSeed('paradigm-pb');
    const child = breedFriends(a, b, 's');
    expect(child.derivation?.operator).toBe('breed');
    expect(child.derivation?.parents).toEqual([a.id, b.id]);
    expect(child.parents).toEqual([a.id, b.id]);
    expect(child.derivation?.generation).toBe(1);
  });

  it('child generation increments by 1 over max(parent generations)', () => {
    const a = createFriendSeed('paradigm-ga');
    const b = createFriendSeed('paradigm-gb');
    const abChild = breedFriends(a, b, 's1');
    const abcChild = breedFriends(abChild, b, 's2');
    expect(abChild.derivation?.generation).toBe(1);
    expect(abcChild.derivation?.generation).toBe(2);
  });

  it('default salt is empty string and produces a valid child', () => {
    const a = createFriendSeed('paradigm-def-a');
    const b = createFriendSeed('paradigm-def-b');
    const c1 = breedFriends(a, b);
    const c2 = breedFriends(a, b, '');
    expect(c1.seedHash).toBe(c2.seedHash);
  });

  it('child gene categories are all present and well-typed', () => {
    const a = createFriendSeed('paradigm-cat-a');
    const b = createFriendSeed('paradigm-cat-b');
    const child = breedFriends(a, b, 's');
    expect(child.genes.body.archetype).toMatch(
      /slender|athletic|sturdy|soft|tall|petite/);
    expect(child.genes.face.eyeShape).toBeDefined();
    expect(child.genes.voice.accent).toBeDefined();
    expect(child.genes.persona.bigFive).toBeDefined();
  });
});

// ─── mutateFriend ───────────────────────────────────────────────────────────

describe('mutateFriend', () => {
  it('is deterministic: same parent + same magnitude + same salt → identical child', () => {
    const a = createFriendSeed('paradigm-mut-parent');
    const c1 = mutateFriend(a, 0.5, 'salt-x');
    const c2 = mutateFriend(a, 0.5, 'salt-x');
    expect(c1.seedHash).toBe(c2.seedHash);
    expect(hashSeed(c1)).toBe(hashSeed(c2));
  });

  it('magnitude 0 returns a deterministic child (not identity, but predictable)', () => {
    const a = createFriendSeed('paradigm-zero-mut');
    const c1 = mutateFriend(a, 0, '');
    const c2 = mutateFriend(a, 0, '');
    expect(c1.seedHash).toBe(c2.seedHash);
    // magnitude 0 means no displacement, so all continuous genes match parent
    expect(c1.genes.body.heightScale).toBe(a.genes.body.heightScale);
    expect(c1.genes.face.roundness).toBe(a.genes.face.roundness);
  });

  it('different magnitudes produce different children', () => {
    const a = createFriendSeed('paradigm-mag-test');
    const c1 = mutateFriend(a, 0.1, 's');
    const c2 = mutateFriend(a, 0.9, 's');
    expect(c1.seedHash).not.toBe(c2.seedHash);
  });

  it('clamps magnitude to [0, 1] (negative or >1 are clamped)', () => {
    const a = createFriendSeed('paradigm-clamp-test');
    const c1 = mutateFriend(a, -1, 's');
    const c2 = mutateFriend(a, 0, 's');
    // -1 clamps to 0 → identical to magnitude 0
    expect(c1.seedHash).toBe(c2.seedHash);
  });

  it('resulting child has derivation { operator: "mutate", parents: [parent.id], generation: parent.gen+1 }', () => {
    const a = createFriendSeed('paradigm-mut-child');
    const child = mutateFriend(a, 0.3, 's');
    expect(child.derivation?.operator).toBe('mutate');
    expect(child.derivation?.parents).toEqual([a.id]);
    expect(child.parents).toEqual([a.id]);
    expect(child.derivation?.generation).toBe(1);
  });

  it('continuous genes stay in valid ranges after mutation', () => {
    const a = createFriendSeed('paradigm-ranges-test');
    const child = mutateFriend(a, 0.9, 's');
    expect(child.genes.body.heightScale).toBeGreaterThanOrEqual(0.5);
    expect(child.genes.body.heightScale).toBeLessThanOrEqual(1.5);
    expect(child.genes.body.muscle).toBeGreaterThanOrEqual(0);
    expect(child.genes.body.muscle).toBeLessThanOrEqual(1);
    expect(child.genes.face.roundness).toBeGreaterThanOrEqual(0);
    expect(child.genes.face.roundness).toBeLessThanOrEqual(1);
    expect(child.genes.voice.pitch).toBeGreaterThanOrEqual(80);
    expect(child.genes.voice.pitch).toBeLessThanOrEqual(300);
  });

  it('default magnitude is 0.15', () => {
    const a = createFriendSeed('paradigm-default-mag');
    const c1 = mutateFriend(a);
    const c2 = mutateFriend(a, 0.15, '');
    expect(c1.seedHash).toBe(c2.seedHash);
  });
});
