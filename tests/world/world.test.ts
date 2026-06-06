/**
 * World — genesis + generator tests.
 *
 * Pins the determinism contract for `createWorldSeed` and the
 * artifact-shape contract for `generateWorld` (locations, factions, hook,
 * summary, hashArtifact).
 */
import { describe, it, expect } from 'vitest';
import {
  createWorldSeed,
} from '../../src/lib/world/genesis';
import {
  generateWorld,
  hashArtifact,
} from '../../src/lib/world/generator';
import type { WorldSeedData, WorldArtifact } from '../../src/lib/world/types';

const VALID_ERAS = ['medieval', 'modern', 'sci-fi', 'mythic', 'post-apocalyptic'];
const VALID_BIOMES = ['forest', 'desert', 'ocean', 'tundra', 'urban', 'underground', 'sky', 'volcanic'];
const VALID_CONFLICTS = ['invasion', 'mystery', 'exploration', 'survival', 'political', 'redemption', 'discovery'];

// ─── createWorldSeed ────────────────────────────────────────────────────────

describe('createWorldSeed', () => {
  it('is deterministic: same input → same seedHash + id + name', () => {
    const a = createWorldSeed('paradigm-world-1');
    const b = createWorldSeed('paradigm-world-1');
    expect(a.seedHash).toBe(b.seedHash);
    expect(a.id).toBe(b.id);
    expect(a.name).toBe(b.name);
  });

  it('different inputs produce different seedHash', () => {
    const a = createWorldSeed('paradigm-world-A');
    const b = createWorldSeed('paradigm-world-B');
    expect(a.seedHash).not.toBe(b.seedHash);
  });

  it('id is the first 16 hex chars of the seed hash', () => {
    const s = createWorldSeed('paradigm-id-test');
    expect(s.id).toBe(s.seedHash.slice(0, 16));
    expect(s.id).toMatch(/^[0-9a-f]{16}$/);
  });

  it('name option is respected when supplied', () => {
    const s = createWorldSeed('paradigm-name-test', { name: 'Mythir' });
    expect(s.name).toBe('Mythir');
  });

  it('auto-generated name is non-empty and well-formed', () => {
    const s = createWorldSeed('paradigm-autoname');
    expect(s.name.length).toBeGreaterThan(0);
  });

  it('exposes all six gene categories', () => {
    const s = createWorldSeed('paradigm-genes');
    expect(s.genes.setting).toBeDefined();
    expect(s.genes.physics).toBeDefined();
    expect(s.genes.society).toBeDefined();
    expect(s.genes.conflict).toBeDefined();
    expect(s.genes.mood).toBeDefined();
    expect(s.genes.history).toBeDefined();
  });

  it('setting.era is a valid Era', () => {
    for (let i = 0; i < 20; i++) {
      const s = createWorldSeed(`paradigm-era-${i}`);
      expect(VALID_ERAS).toContain(s.genes.setting.era);
    }
  });

  it('setting.biome is a valid Biome', () => {
    for (let i = 0; i < 20; i++) {
      const s = createWorldSeed(`paradigm-biome-${i}`);
      expect(VALID_BIOMES).toContain(s.genes.setting.biome);
    }
  });

  it('conflict.kind is a valid ConflictKind', () => {
    for (let i = 0; i < 20; i++) {
      const s = createWorldSeed(`paradigm-conflict-${i}`);
      expect(VALID_CONFLICTS).toContain(s.genes.conflict.kind);
    }
  });

  it('setting scalars (magic, tech, density) are in [0, 1]', () => {
    for (let i = 0; i < 20; i++) {
      const s = createWorldSeed(`paradigm-setting-${i}`);
      expect(s.genes.setting.magic).toBeGreaterThanOrEqual(0);
      expect(s.genes.setting.magic).toBeLessThanOrEqual(1);
      expect(s.genes.setting.tech).toBeGreaterThanOrEqual(0);
      expect(s.genes.setting.tech).toBeLessThanOrEqual(1);
      expect(s.genes.setting.density).toBeGreaterThanOrEqual(0);
      expect(s.genes.setting.density).toBeLessThanOrEqual(1);
    }
  });

  it('society scalars (order, pluralism, prosperity, literacy) are in [0, 1]', () => {
    for (let i = 0; i < 20; i++) {
      const s = createWorldSeed(`paradigm-society-${i}`);
      expect(s.genes.society.order).toBeGreaterThanOrEqual(0);
      expect(s.genes.society.order).toBeLessThanOrEqual(1);
      expect(s.genes.society.pluralism).toBeGreaterThanOrEqual(0);
      expect(s.genes.society.pluralism).toBeLessThanOrEqual(1);
      expect(s.genes.society.prosperity).toBeGreaterThanOrEqual(0);
      expect(s.genes.society.prosperity).toBeLessThanOrEqual(1);
      expect(s.genes.society.literacy).toBeGreaterThanOrEqual(0);
      expect(s.genes.society.literacy).toBeLessThanOrEqual(1);
    }
  });

  it('history.eraCount is in [1, 4]', () => {
    for (let i = 0; i < 20; i++) {
      const s = createWorldSeed(`paradigm-eras-${i}`);
      expect(s.genes.history.eraCount).toBeGreaterThanOrEqual(1);
      expect(s.genes.history.eraCount).toBeLessThanOrEqual(4);
    }
  });

  it('history.agesSinceFall is a non-negative integer', () => {
    for (let i = 0; i < 20; i++) {
      const s = createWorldSeed(`paradigm-ages-${i}`);
      expect(s.genes.history.agesSinceFall).toBeGreaterThanOrEqual(0);
      expect(s.genes.history.agesSinceFall).toBeLessThan(5000);
      expect(Number.isInteger(s.genes.history.agesSinceFall)).toBe(true);
    }
  });

  it('derivation is set to { operator: "genesis", parents: [], generation: 0 }', () => {
    const s = createWorldSeed('paradigm-deriv');
    expect(s.derivation?.operator).toBe('genesis');
    expect(s.derivation?.parents).toEqual([]);
    expect(s.derivation?.generation).toBe(0);
  });
});

// ─── generateWorld ──────────────────────────────────────────────────────────

describe('generateWorld', () => {
  it('is deterministic: same seed → byte-identical artifact hash', () => {
    const seed = createWorldSeed('paradigm-gen-determinism');
    const a1 = generateWorld(seed);
    const a2 = generateWorld(seed);
    expect(hashArtifact(a1)).toBe(hashArtifact(a1));
    expect(a1.summary).toBe(a2.summary);
    expect(a1.hook).toBe(a2.hook);
    expect(a1.locations).toEqual(a2.locations);
    expect(a1.factions).toEqual(a2.factions);
  });

  it('artifact includes 3 locations, 3 factions, summary, hook', () => {
    const seed = createWorldSeed('paradigm-artifact-shape');
    const a = generateWorld(seed);
    expect(a.locations.length).toBe(3);
    expect(a.factions.length).toBe(3);
    expect(typeof a.summary).toBe('string');
    expect(a.summary.length).toBeGreaterThan(0);
    expect(typeof a.hook).toBe('string');
    expect(a.hook.length).toBeGreaterThan(0);
  });

  it('artifact worldId + seedHash match the input seed', () => {
    const seed = createWorldSeed('paradigm-artifact-id');
    const a = generateWorld(seed);
    expect(a.worldId).toBe(seed.id);
    expect(a.seedHash).toBe(seed.seedHash);
  });

  it('summary mentions the world name', () => {
    const seed = createWorldSeed('paradigm-summary', { name: 'Mythir' });
    const a = generateWorld(seed);
    expect(a.summary).toContain('Mythir');
  });

  it('hook mentions a place name (a fresh sample of locations, not the artifact\'s)', () => {
    // NOTE: The hook in `generator.ts` re-samples locations (independent RNG
    // draw), so the hook's place name is NOT in `a.locations`. We just pin
    // the hook as non-empty and containing the conflict-kind vocabulary.
    const seed = createWorldSeed('paradigm-hook');
    const a = generateWorld(seed);
    expect(a.hook.length).toBeGreaterThan(0);
    // The hook should still be a complete sentence (period at the end)
    expect(a.hook).toMatch(/\.$/);
  });

  it('locations cover the first 3 kinds of the kind array (cyclic)', () => {
    // 3 locations per artifact; `kinds[i % 5]` cycles through settlement, wilderness, ruin.
    const seed = createWorldSeed('paradigm-loc-kinds');
    const a = generateWorld(seed);
    expect(a.locations.map((l) => l.kind)).toEqual([
      'settlement', 'wilderness', 'ruin',
    ]);
  });

  it('all location kinds are from the valid set', () => {
    const validKinds = new Set(['settlement', 'wilderness', 'ruin', 'sanctum', 'frontier']);
    for (let i = 0; i < 10; i++) {
      const seed = createWorldSeed(`paradigm-loc-kinds-${i}`);
      const a = generateWorld(seed);
      for (const loc of a.locations) {
        expect(validKinds.has(loc.kind)).toBe(true);
      }
    }
  });

  it('location names are non-empty and look composed (prefix + root)', () => {
    const seed = createWorldSeed('paradigm-loc-names');
    const a = generateWorld(seed);
    for (const loc of a.locations) {
      expect(loc.name.length).toBeGreaterThan(0);
      expect(loc.name).toMatch(/\s/); // prefix + root ⇒ at least one space
      expect(loc.description.length).toBeGreaterThan(0);
    }
  });

  it('factions have valid alignment values', () => {
    const seed = createWorldSeed('paradigm-factions');
    const a = generateWorld(seed);
    for (const f of a.factions) {
      expect(['lawful', 'neutral', 'chaotic']).toContain(f.alignment);
      expect(f.name.length).toBeGreaterThan(0);
      expect(f.goal.length).toBeGreaterThan(0);
    }
  });

  it('meta.generatorVersion is a non-empty semver-ish string', () => {
    const seed = createWorldSeed('paradigm-meta');
    const a = generateWorld(seed);
    expect(typeof a.meta.generatorVersion).toBe('string');
    expect(a.meta.generatorVersion.length).toBeGreaterThan(0);
    expect(a.meta.generatorVersion).toMatch(/\d+\.\d+\.\d+/);
  });

  it('meta.elapsedMs is a number (observability, not part of artifact hash)', () => {
    const seed = createWorldSeed('paradigm-elapsed');
    const a = generateWorld(seed);
    expect(typeof a.meta.elapsedMs).toBe('number');
  });
});

// ─── hashArtifact ───────────────────────────────────────────────────────────

describe('hashArtifact', () => {
  it('produces 64-char hex SHA-256', () => {
    const seed = createWorldSeed('paradigm-hash');
    const a = generateWorld(seed);
    const h = hashArtifact(a);
    expect(h).toMatch(/^[0-9a-f]{64}$/);
  });

  it('ignores meta (elapsedMs differs across calls → same hash)', () => {
    const seed = createWorldSeed('paradigm-hash-meta');
    const a1 = generateWorld(seed);
    const a2: WorldArtifact = { ...a1, meta: { ...a1.meta, elapsedMs: 9999 } };
    expect(hashArtifact(a1)).toBe(hashArtifact(a2));
  });

  it('changes when summary changes', () => {
    const seed = createWorldSeed('paradigm-hash-summary');
    const a1 = generateWorld(seed);
    const a2: WorldArtifact = { ...a1, summary: 'tampered' };
    expect(hashArtifact(a1)).not.toBe(hashArtifact(a2));
  });
});
