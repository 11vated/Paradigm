/**
 * GENETIC ALGORITHM TESTS
 * 
 * Unit tests for the GA implementation including determinism.
 * Uses UniversalSeed as the canonical seed class.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { GeneticAlgorithm } from '../ga';
import { Xoshiro256StarStar, rngFromHash } from '../../kernel/rng';
import { UniversalSeed } from '../../../seeds/universal-seed';

function createTestSeed(name: string, scalarValue: number = 0.5): UniversalSeed {
  const seed = new UniversalSeed({
    metadata: {
      id: `seed-${name}`,
      name,
      version: '1.0.0',
      created: 0,
      updated: 0,
      tags: [],
      lineage: [],
      fitness: undefined,
    }
  });
  seed.setGene('scalar' as any, scalarValue, {
    name: 'scalar',
    description: 'Test scalar gene',
    mutable: true,
    dominant: false,
    hidden: false,
    locked: false,
    mutationRate: 0.01
  });
  return seed;
}

function makeTestPopulation(rng: Xoshiro256StarStar, size: number, domain: string = 'character'): UniversalSeed[] {
  const pop: UniversalSeed[] = [];
  for (let i = 0; i < size; i++) {
    const s = createTestSeed(`${domain}-${i}`, rng.nextF64());
    pop.push(s);
  }
  return pop;
}

describe('Genetic Algorithm', () => {
  let rng: Xoshiro256StarStar;

  const mockFitnessFn = (seed: any): number => {
    const scalar = seed.getGeneValue?.('scalar') as number | undefined;
    return scalar ?? 0.5;
  };

  beforeEach(() => {
    rng = rngFromHash('ga-test-seed');
  });

  describe('Evolution Run', () => {
    it('should evolve over generations', async () => {
      const ga = new GeneticAlgorithm(rng);
      const population = makeTestPopulation(rng, 20);

      const result = await ga.evolve(population as any, mockFitnessFn, { 
        populationSize: 20, generationLimit: 10, mutationRate: 0.1,
        crossoverRate: 0.7, tournamentSize: 3, elitismCount: 2 
      });

      expect(result).toBeDefined();
      expect(result.generation).toBeGreaterThan(0);
      expect(result.best).toBeDefined();
    });

    it('should improve fitness over generations', async () => {
      const ga = new GeneticAlgorithm(rng);
      const pop = makeTestPopulation(rng, 10);
      
      // Set known fitness values
      for (let i = 0; i < pop.length; i++) {
        pop[i].setGene('scalar' as any, i / pop.length, {
          name: 'scalar', description: '', mutable: true,
          dominant: false, hidden: false, locked: false, mutationRate: 0.1
        });
      }

      const result = await ga.evolve(pop as any, mockFitnessFn, {
        populationSize: 10, generationLimit: 5, mutationRate: 0.2,
        crossoverRate: 0.8, tournamentSize: 3, elitismCount: 1
      });

      // Best fitness should be high (higher scalar = higher fitness)
      expect(result.fitness).toBeGreaterThan(0.5);
    });
  });

  describe('Determinism', () => {
    it('should produce same results with same RNG seed', async () => {
      const rng1 = rngFromHash('deterministic-ga-seed');
      const rng2 = rngFromHash('deterministic-ga-seed');

      const ga1 = new GeneticAlgorithm(rng1);
      const ga2 = new GeneticAlgorithm(rng2);

      const pop1 = makeTestPopulation(rng1, 10);
      const pop2 = makeTestPopulation(rng2, 10);

      const result1 = await ga1.evolve(pop1 as any, mockFitnessFn, {
        populationSize: 10, generationLimit: 3, mutationRate: 0.1,
        crossoverRate: 0.7, tournamentSize: 3, elitismCount: 1
      });
      const result2 = await ga2.evolve(pop2 as any, mockFitnessFn, {
        populationSize: 10, generationLimit: 3, mutationRate: 0.1,
        crossoverRate: 0.7, tournamentSize: 3, elitismCount: 1
      });

      // Best seed ID should be identical with same RNG
      // Note: IDs may differ since UniversalSeed uses a deterministic counter
      // But the best seed's gene values should match
      const best1 = result1.best.getGeneValue?.('scalar');
      const best2 = result2.best.getGeneValue?.('scalar');
      expect(best1).toEqual(best2);
    });
  });
});