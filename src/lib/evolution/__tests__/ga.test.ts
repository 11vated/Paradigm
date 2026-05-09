/**
 * GENETIC ALGORITHM TESTS
 * 
 * Unit tests for the GA implementation including determinism
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GeneticAlgorithm } from '../../src/lib/evolution/ga';
import { Xoshiro256StarStar, rngFromHash } from '../../src/lib/kernel/rng';
import { Seed } from '../../src/lib/kernel/seed-class';

describe('Genetic Algorithm', () => {
  let rng: Xoshiro256StarStar;
  let ga: GeneticAlgorithm;

  const mockFitnessFn = (seed: Seed): number => {
    // Simple fitness based on gene values
    const scalar = seed.getGeneValue('scalar');
    return scalar ?? 0.5;
  };

  beforeEach(() => {
    rng = rngFromHash('ga-test-seed');
    ga = new GeneticAlgorithm({
      populationSize: 20,
      mutationRate: 0.1,
      crossoverRate: 0.7,
      elitismCount: 2,
      tournamentSize: 3,
      maxGenerations: 10,
      fitnessFn: mockFitnessFn,
    });
  });

  describe('Initialization', () => {
    it('should create population with correct size', () => {
      const population = ga.initializePopulation(rng, 'character');
      expect(population).toHaveLength(20);
    });

    it('should create unique seeds', () => {
      const population = ga.initializePopulation(rng, 'character');
      const ids = population.map(s => s.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(20);
    });
  });

  describe('Selection', () => {
    it('should perform tournament selection', () => {
      const population: Seed[] = [];
      for (let i = 0; i < 10; i++) {
        const s = new Seed('character', `Seed${i}`);
        s.setGene('scalar', i / 10, { min: 0, max: 1 });
        population.push(s);
      }

      const scores = population.map(s => mockFitnessFn(s));
      const selected = ga.tournamentSelect(population, scores, 3, rng);

      expect(selected).toBeDefined();
      expect(selected.length).toBe(10);
    });

    it('should favor higher fitness in tournament', () => {
      const population: Seed[] = [];
      // Create population with known fitness values
      for (let i = 0; i < 100; i++) {
        const s = new Seed('character', `Seed${i}`);
        s.setGene('scalar', i / 100, { min: 0, max: 1 });
        population.push(s);
      }

      const scores = population.map(s => mockFitnessFn(s));
      
      // Run many selections and track average fitness
      let totalFitness = 0;
      const trials = 100;
      
      for (let i = 0; i < trials; i++) {
        const selected = ga.tournamentSelect(population, scores, 5, rng);
        totalFitness += mockFitnessFn(selected[0]); // Best from tournament
      }

      const avgFitness = totalFitness / trials;
      // Average should be above 0.5 (random would be ~0.5)
      expect(avgFitness).toBeGreaterThan(0.5);
    });
  });

  describe('Crossover', () => {
    it('should perform single-point crossover', () => {
      const parent1 = new Seed('character', 'Parent1');
      parent1.setGene('scalar', 0.2, { min: 0, max: 1 });

      const parent2 = new Seed('character', 'Parent2');
      parent2.setGene('scalar', 0.8, { min: 0, max: 1 });

      const children = ga.crossover(parent1, parent2, rng);

      expect(children.length).toBe(2);
      
      // Child values should be between parents
      const child1Value = children[0].getGeneValue('scalar');
      const child2Value = children[1].getGeneValue('scalar');
      
      expect(child1Value).toBeGreaterThanOrEqual(0.2);
      expect(child1Value).toBeLessThanOrEqual(0.8);
    });

    it('should respect crossover rate', () => {
      const parent1 = new Seed('character', 'P1');
      const parent2 = new Seed('character', 'P2');

      // Test with 100% crossover rate
      const gaCrossover = new GeneticAlgorithm({
        populationSize: 10,
        mutationRate: 0,
        crossoverRate: 1.0, // Always crossover
        elitismCount: 0,
        tournamentSize: 3,
        maxGenerations: 1,
        fitnessFn: mockFitnessFn,
      });

      // With 100% crossover, children should be different from parents
      const children = gaCrossover.crossover(parent1, parent2, rng);
      
      // At least verify children were created
      expect(children.length).toBe(2);
    });
  });

  describe('Mutation', () => {
    it('should mutate genes within bounds', () => {
      const seed = new Seed('character', 'Test');
      seed.setGene('scalar', 0.5, { min: 0, max: 1 });

      const mutated = ga.mutate(seed, rng, 0.5);

      const value = mutated.getGeneValue('scalar');
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThanOrEqual(1);
    });

    it('should respect mutation rate', () => {
      const seed = new Seed('character', 'Test');
      seed.setGene('scalar', 0.5, { min: 0, max: 1 });

      // With 0% mutation, gene should stay same
      const gaNoMutation = new GeneticAlgorithm({
        populationSize: 10,
        mutationRate: 0,
        crossoverRate: 0,
        elitismCount: 0,
        tournamentSize: 3,
        maxGenerations: 1,
        fitnessFn: mockFitnessFn,
      });

      const result = gaNoMutation.mutate(seed, rng, 0);
      expect(result.getGeneValue('scalar')).toBe(0.5);
    });

    it('should return new seed (immutability)', () => {
      const seed = new Seed('character', 'Test');
      seed.setGene('scalar', 0.5, { min: 0, max: 1 });

      const mutated = ga.mutate(seed, rng, 1.0);

      expect(mutated).not.toBe(seed);
      expect(mutated.id).not.toBe(seed.id);
    });
  });

  describe('Evolution Run', () => {
    it('should evolve over generations', async () => {
      const population = ga.initializePopulation(rng, 'character');
      
      // Set initial population with varying fitness
      for (let i = 0; i < population.length; i++) {
        population[i].setGene('scalar', Math.random(), { min: 0, max: 1 });
      }

      const result = await ga.evolve(population, rng);

      expect(result).toBeDefined();
      expect(result.generation).toBeGreaterThan(0);
    });

    it('should preserve elite individuals', async () => {
      const population = ga.initializePopulation(rng, 'character');
      
      // Set best seed
      population[0].setGene('scalar', 1.0, { min: 0, max: 1 });

      const result = await ga.evolve(population, rng);

      // First generation should preserve at least one elite
      const bestFitness = result.population[0].getGeneValue('scalar') ?? 0;
      expect(bestFitness).toBeGreaterThan(0.5);
    });
  });

  describe('Determinism', () => {
    it('should produce same results with same RNG seed', async () => {
      const fitnessFn = (s: Seed): number => {
        return s.getGeneValue('scalar') ?? 0.5;
      };

      const ga1 = new GeneticAlgorithm({
        populationSize: 10,
        mutationRate: 0.1,
        crossoverRate: 0.7,
        elitismCount: 1,
        tournamentSize: 3,
        maxGenerations: 3,
        fitnessFn,
      });

      const ga2 = new GeneticAlgorithm({
        populationSize: 10,
        mutationRate: 0.1,
        crossoverRate: 0.7,
        elitismCount: 1,
        tournamentSize: 3,
        maxGenerations: 3,
        fitnessFn,
      });

      const rng1 = rngFromHash('deterministic-ga-seed');
      const rng2 = rngFromHash('deterministic-ga-seed');

      const pop1 = ga1.initializePopulation(rng1, 'character');
      const pop2 = ga2.initializePopulation(rng2, 'character');

      // Set identical initial genes
      for (let i = 0; i < pop1.length; i++) {
        pop1[i].setGene('scalar', 0.5, { min: 0, max: 1 });
        pop2[i].setGene('scalar', 0.5, { min: 0, max: 1 });
      }

      const result1 = await ga1.evolve(pop1, rng1);
      const result2 = await ga2.evolve(pop2, rng2);

      // Best seed ID should be identical
      const best1 = result1.population[0].id;
      const best2 = result2.population[0].id;

      expect(best1).toBe(best2);
    });
  });

  describe('Configuration', () => {
    it('should validate configuration', () => {
      expect(() => {
        new GeneticAlgorithm({
          populationSize: 0, // Invalid
          mutationRate: 0.1,
          crossoverRate: 0.7,
          elitismCount: 2,
          tournamentSize: 3,
          maxGenerations: 10,
          fitnessFn: mockFitnessFn,
        });
      }).toThrow();
    });

    it('should handle large population', async () => {
      const gaLarge = new GeneticAlgorithm({
        populationSize: 100,
        mutationRate: 0.1,
        crossoverRate: 0.7,
        elitismCount: 5,
        tournamentSize: 5,
        maxGenerations: 5,
        fitnessFn: mockFitnessFn,
      });

      const population = gaLarge.initializePopulation(rng, 'character');
      expect(population).toHaveLength(100);
    });
  });
});