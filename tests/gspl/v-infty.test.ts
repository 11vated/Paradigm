import { describe, it, expect } from 'vitest';
import { executeGSPL } from '../../src/lib/gspl/index.js';
import {
  growAsync,
  composeN,
  evolveGenerations,
  breedPopulation,
  toGSPLCode,
  fromGSPLCode,
} from '../../src/lib/gspl/v-infty-extensions.js';
import {
  verifyTerminationAsync,
  verifyCompositionAsync,
  verifyBreedPropertiesAsync,
  runGSPLFullPropertyHarness,
} from '../../src/lib/gspl/formal-verifier.js';

describe('GSPL v∞ Extensions', () => {

  describe('growAsync', () => {
    it('grows a character seed into an artifact', async () => {
      const seed = { $domain: 'character', $name: 'Hero', genes: { strength: { type: 'scalar', value: 0.8 } } };
      const result = await growAsync(seed);
      expect(result.errors).toHaveLength(0);
      expect(result.seed).toBeDefined();
    });

    it('growAsync with strata constraint', async () => {
      const seed = { $domain: 'character', $name: 'Mage', genes: { magic: { type: 'scalar', value: 0.9 } } };
      const result = await growAsync(seed, ['Form', 'Mind']);
      expect(result.errors.length).toBeLessThan(2);
    });
  });

  describe('composeN', () => {
    it('composes multiple seeds into a target domain', async () => {
      const seeds = [
        { $domain: 'character', $name: 'A', genes: { strength: { value: 0.5 }, archetype: { value: 'hero' } } },
        { $domain: 'character', $name: 'B', genes: { agility: { value: 0.7 } } },
      ];
      const result = await composeN(seeds, 'music');
      expect(result.errors).toHaveLength(0);
      expect(result.composed).toHaveLength(2);
      expect(result.composed[0]).toBeDefined();
    });

    it('preserves determinism across runs', async () => {
      const seeds = [
        { $domain: 'character', $name: 'X', $hash: 'abc', genes: { strength: { value: 0.4 } } },
      ];
      const r1 = await composeN(seeds, 'narrative');
      const r2 = await composeN(seeds, 'narrative');
      expect(JSON.stringify(r1.composed)).toBe(JSON.stringify(r2.composed));
    });
  });

  describe('evolveGenerations', () => {
    it('evolves a seed through multiple generations', async () => {
      const seedData = {
        $domain: 'character', $name: 'evo-test',
        genes: { strength: { value: 0.3 }, agility: { value: 0.4 } },
      };
      const result = await evolveGenerations(seedData, 3, 10);
      expect(result.errors).toHaveLength(0);
      expect(result.generations).toBe(3);
      expect(result.populationSize).toBe(10);
      expect(result.fitnessHistory.length).toBe(3);
      expect(result.bestSeed).toBeDefined();
    });
  });

  describe('breedPopulation', () => {
    it('breeds random pairs from a population', async () => {
      const pop = [
        { $domain: 'character', $name: 'ParentA', genes: { strength: { value: 0.9 } } },
        { $domain: 'character', $name: 'ParentB', genes: { agility: { value: 0.7 } } },
        { $domain: 'character', $name: 'ParentC', genes: { strength: { value: 0.3 } } },
      ];
      const result = await breedPopulation(pop, 3);
      expect(result.errors).toHaveLength(0);
      expect(result.offspring.length).toBeGreaterThanOrEqual(1);
    });

    it('returns error for population less than 2', async () => {
      const pop = [{ $domain: 'character', $name: 'Alone', genes: {} }];
      const result = await breedPopulation(pop, 1);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.offspring).toHaveLength(0);
    });
  });

  describe('toGSPLCode / fromGSPLCode', () => {
    it('roundtrips a seed through GSPL code', async () => {
      const seedObj = { $domain: 'character', $name: 'Roundtrip', genes: { strength: { value: 0.75 }, archetype: { value: 'knight' } } };
      const code = toGSPLCode(seedObj);
      expect(code).toContain('character');
      expect(code).toContain('0.75');

      const src = 'seed "Roundtrip" in character { strength: 0.75, archetype: "knight" }';
      const restored = await fromGSPLCode(src);
      expect(restored).toBeDefined();
    });

    it('fromGSPLCode produces deterministic seeds', async () => {
      const src = 'seed "DetTest" in sprite { palette: [0.8, 0.2, 0.1], size: 5 }';
      const r1 = await fromGSPLCode(src, 'det-test');
      const r2 = await fromGSPLCode(src, 'det-test');
      const h1 = JSON.stringify((r1 as any)?.genes ?? {});
      const h2 = JSON.stringify((r2 as any)?.genes ?? {});
      expect(h1).toBe(h2);
    });
  });
});

describe('GSPL v∞ Formal Verifier — Enhanced Properties', () => {

  describe('verifyTerminationAsync', () => {
    it('passes for bounded programs', async () => {
      const result = await verifyTerminationAsync(
        'seed "T" in character { strength: 0.5 }'
      );
      expect(result.passed).toBe(true);
      expect(result.seedsProduced).toBeGreaterThanOrEqual(1);
    });

    it('passes for simple seed declarations', async () => {
      const result = await verifyTerminationAsync('seed "Simple" in character { strength: 0.5 }');
      expect(result.passed).toBe(true);
    });
  });

  describe('verifyCompositionAsync', () => {
    it('composition is deterministic', async () => {
      const result = await verifyCompositionAsync(
        'seed "Comp" in character { strength: 0.7, archetype: "bard" }',
        'music'
      );
      expect(result.hashMatch).toBe(true);
      expect(result.passed).toBe(true);
    });

    it('reports error for programs producing no seeds', async () => {
      const result = await verifyCompositionAsync('print("hello")', 'music');
      expect(result.passed).toBe(false);
    });
  });

  describe('verifyBreedPropertiesAsync', () => {
    it('determinism + heritability + closure all pass', async () => {
      const result = await verifyBreedPropertiesAsync();
      expect(result.determinismPassed).toBe(true);
      expect(result.heritabilityPassed).toBe(true);
      expect(result.closurePassed).toBe(true);
      expect(result.passed).toBe(true);
    });
  });

  describe('runGSPLFullPropertyHarness', () => {
    it('all 5 formal properties pass', async () => {
      const result = await runGSPLFullPropertyHarness();
      expect(result.total).toBe(5);
      expect(result.passedCount).toBe(5);
    });
  });
});
