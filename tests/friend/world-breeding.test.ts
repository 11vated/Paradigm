/**
 * World breeding + mutation — deterministic recombination.
 */
import { describe, it, expect } from 'vitest';
import { createWorldSeed } from '../../src/lib/world/genesis';
import { breedWorlds, mutateWorld } from '../../src/lib/world/breeding';

describe('World breeding', () => {
  it('same parents + salt → same child id', () => {
    const a = createWorldSeed('alpha');
    const b = createWorldSeed('beta');
    const c1 = breedWorlds(a, b, { salt: 'x' });
    const c2 = breedWorlds(a, b, { salt: 'x' });
    expect(c1.id).toBe(c2.id);
  });

  it('child has both parents in derivation', () => {
    const a = createWorldSeed('p1');
    const b = createWorldSeed('p2');
    const c = breedWorlds(a, b);
    expect(c.derivation?.parents).toEqual([a.id, b.id]);
    expect(c.derivation?.operator).toBe('breed');
    expect(c.derivation?.generation).toBeGreaterThan(0);
  });

  it('child inherits era from A, biome from B', () => {
    const a = createWorldSeed('era-test-a');
    const b = createWorldSeed('biome-test-b');
    const c = breedWorlds(a, b);
    expect(c.genes.setting.era).toBe(a.genes.setting.era);
    expect(c.genes.setting.biome).toBe(b.genes.setting.biome);
  });

  it('continuous genes are averaged', () => {
    const a = createWorldSeed('avg-a');
    const b = createWorldSeed('avg-b');
    const c = breedWorlds(a, b);
    expect(c.genes.setting.magic).toBeCloseTo((a.genes.setting.magic + b.genes.setting.magic) / 2, 9);
  });

  it('mutate is deterministic + bounded', () => {
    const p = createWorldSeed('mutate-p');
    const c1 = mutateWorld(p, { salt: 'x' });
    const c2 = mutateWorld(p, { salt: 'x' });
    expect(c1.id).toBe(c2.id);
    expect(c1.genes.setting.magic).toBeGreaterThanOrEqual(0);
    expect(c1.genes.setting.magic).toBeLessThanOrEqual(1);
  });
});
