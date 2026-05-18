/**
 * Determinism: Self-Replay Test
 * 
 * Verifies that growing the same seed twice produces
 * byte-identical output. This is the most basic determinism test.
 */
import { describe, it, expect } from 'vitest';
import { UniversalSeed } from '../../src/seeds/universal-seed';
import { Xoshiro256StarStar } from '../../src/lib/kernel/rng';
import { growSeed } from '../../src/lib/kernel/engines';

describe('Determinism: Self-Replay', () => {
  const testDomains = [
    'character', 'sprite', 'music', 'visual2d', 'geometry3d',
    'animation', 'narrative', 'physics', 'audio'
  ];

  for (const domain of testDomains) {
    it(`grow(${domain}) produces identical output on replay`, async () => {
      const seed = new UniversalSeed({
        metadata: {
          id: `det-${domain}`,
          name: `Determinism test ${domain}`,
          version: '1.0.0',
          created: 0,
          updated: 0,
          tags: [domain],
          lineage: []
        }
      });

      const hash1 = JSON.stringify(await growSeed(seed as any))
      const hash2 = JSON.stringify(await growSeed(seed as any))

      expect(hash1).toBe(hash2)
    })
  }

  it('seed.mutate() produces same result with same RNG', () => {
    const seed = new UniversalSeed({
      metadata: { id: 'det-mut', name: 'mut test', version: '1.0.0', created: 0, updated: 0, tags: ['character'], lineage: [] }
    })
    const rng1 = new Xoshiro256StarStar(12345n)
    const rng2 = new Xoshiro256StarStar(12345n)

    const result1 = seed.mutate(rng1 as any, 0.5)
    const result2 = seed.mutate(rng2 as any, 0.5)

    expect(JSON.stringify(result1)).toBe(JSON.stringify(result2))
  })

  it('seed.cross() produces same result with same RNG', () => {
    const seedA = new UniversalSeed({
      metadata: { id: 'det-a', name: 'parent a', version: '1.0.0', created: 0, updated: 0, tags: ['character'], lineage: [] }
    })
    const seedB = new UniversalSeed({
      metadata: { id: 'det-b', name: 'parent b', version: '1.0.0', created: 0, updated: 0, tags: ['character'], lineage: [] }
    })
    const rng1 = new Xoshiro256StarStar(99999n)
    const rng2 = new Xoshiro256StarStar(99999n)

    const child1 = seedA.cross(seedB, rng1 as any)
    const child2 = seedA.cross(seedB, rng2 as any)

    expect(JSON.stringify(child1)).toBe(JSON.stringify(child2))
  })
})
