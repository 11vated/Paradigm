/**
 * PARADIGM TEST SUITE — Phase 1
 * Unit tests for kernel operations, genetic algorithms, and GSPL integration
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { Seed } from '../../src/lib/kernel/seed-class';
import { Xoshiro256StarStar, rngFromHash } from '../../src/lib/kernel/rng';
import { GeneticAlgorithm } from '../../src/lib/evolution/ga';
import { GeneSystem } from '../../src/lib/kernel/gene_system';

describe('Seed Class', () => {
  let seed: Seed;
  let rng: Xoshiro256StarStar;

  beforeEach(() => {
    seed = new Seed('character', 'TestCharacter');
    rng = rngFromHash('test-seed-123');
  });

  it('should create a seed with a unique ID', () => {
    expect(seed.id).toBeDefined();
    expect(typeof seed.id).toBe('string');
  });

  it('should compute deterministic content hash', () => {
    const seed1 = new Seed('character', 'Test');
    seed1.setGene('scalar', 0.5, { min: 0, max: 1 });
    
    const hash1 = seed1.hash;
    const hash2 = seed1.hash;
    
    expect(hash1).toBe(hash2);
  });

  it('should add and retrieve genes', () => {
    const modified = seed.setGene('scalar', 0.75, { min: 0, max: 1 });
    expect(modified.getGeneValue('scalar')).toBe(0.75);
  });

  it('should mutate and return new Seed', () => {
    const original = seed.setGene('scalar', 0.5, { min: 0, max: 1 });
    const mutated = original.mutate(rng, 0.1);
    
    expect(mutated).not.toBe(original);
    expect(mutated.id).not.toBe(original.id);
  });

  it('should breed two seeds via crossover', () => {
    const parent1 = seed.setGene('scalar', 0.3, { min: 0, max: 1 });
    const parent2 = seed.setGene('scalar', 0.7, { min: 0, max: 1 });
    
    const child = parent1.cross(parent2, rng);
    
    expect(child.getGeneValue('scalar')).toBeGreaterThanOrEqual(0.3);
    expect(child.getGeneValue('scalar')).toBeLessThanOrEqual(0.7);
  });

  it('should calculate genetic distance', () => {
    const s1 = new Seed('character');
    s1.setGene('scalar', 0.2, { min: 0, max: 1 });
    
    const s2 = new Seed('character');
    s2.setGene('scalar', 0.8, { min: 0, max: 1 });
    
    const distance = s1.distance(s2);
    expect(distance).toBeGreaterThan(0);
    expect(distance).toBeLessThanOrEqual(1);
  });

  it('should serialize and deserialize', () => {
    const modified = seed.setGene('scalar', 0.42, { min: 0, max: 1 });
    const json = modified.toJSON();
    const restored = Seed.fromJSON(json);
    
    expect(restored.getGeneValue('scalar')).toBe(0.42);
    expect(restored.metadata.name).toBe(modified.metadata.name);
  });

  it('should track lineage through mutations', () => {
    const original = seed.setGene('scalar', 0.5, { min: 0, max: 1 });
    const mutated = original.mutate(rng, 0.1);
    
    expect(mutated.lineage.parents).toContain(original.id);
    expect(mutated.lineage.operators).toContain('mutate');
    expect(mutated.lineage.generation).toBeGreaterThan(original.lineage.generation);
  });

  it('should track lineage through breeding', () => {
    const p1 = new Seed('character').setGene('scalar', 0.3, { min: 0, max: 1 });
    const p2 = new Seed('character').setGene('scalar', 0.7, { min: 0, max: 1 });
    
    const child = p1.cross(p2, rng);
    
    expect(child.lineage.parents).toContain(p1.id);
    expect(child.lineage.parents).toContain(p2.id);
    expect(child.lineage.operators).toContain('breed');
  });
});

describe('Gene System', () => {
  let rng: Xoshiro256StarStar;

  beforeEach(() => {
    rng = rngFromHash('gene-system-test');
  });

  it('should validate scalar genes', () => {
    const ops = GeneSystem.getOps('scalar');
    expect(ops.validate(0.5, { min: 0, max: 1 })).toBe(true);
    expect(ops.validate(1.5, { min: 0, max: 1 })).toBe(false);
  });

  it('should mutate scalar genes deterministically', () => {
    const ops = GeneSystem.getOps('scalar');
    const rng1 = rngFromHash('test-1');
    const rng2 = rngFromHash('test-1');
    
    const v1 = ops.mutate(0.5, 0.1, rng1, { min: 0, max: 1 });
    const v2 = ops.mutate(0.5, 0.1, rng2, { min: 0, max: 1 });
    
    expect(v1).toBe(v2);  // Same RNG state = same result
  });

  it('should crossover scalar genes', () => {
    const ops = GeneSystem.getOps('scalar');
    const result = ops.crossover(0.3, 0.7, rng);
    
    expect(result).toBeGreaterThanOrEqual(0.3);
    expect(result).toBeLessThanOrEqual(0.7);
  });

  it('should calculate genetic distance', () => {
    const ops = GeneSystem.getOps('scalar');
    const dist1 = ops.distance(0.3, 0.7, { min: 0, max: 1 });
    const dist2 = ops.distance(0.3, 0.3, { min: 0, max: 1 });
    
    expect(dist1).toBeGreaterThan(dist2);
  });

  it('should handle categorical genes', () => {
    const ops = GeneSystem.getOps('categorical');
    const schema = { choices: ['red', 'green', 'blue'] };
    
    expect(ops.validate('red', schema)).toBe(true);
    expect(ops.validate('yellow', schema)).toBe(false);
  });

  it('should handle vector genes', () => {
    const ops = GeneSystem.getOps('vector');
    const v1 = [0.1, 0.2, 0.3];
    const v2 = [0.4, 0.5, 0.6];
    
    const result = ops.crossover(v1, v2, rng);
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBe(3);
  });

  it('should handle quantum genes', () => {
    const ops = GeneSystem.getOps('quantum');
    const quantum = {
      amplitudes: [0.7071, 0.7071],  // Normalized
      basis: ['|0>', '|1>']
    };
    
    expect(ops.validate(quantum)).toBe(true);
    
    const mutated = ops.mutate(quantum, 0.1, rng);
    expect(mutated.amplitudes).toBeDefined();
  });

  it('should handle gematria genes', () => {
    const ops = GeneSystem.getOps('gematria');
    const gematria = {
      sequence: 'hello',
      system: 'ascii',
      computed_value: 0
    };
    
    expect(ops.validate(gematria)).toBe(true);
  });
});

describe('Genetic Algorithm', () => {
  let ga: GeneticAlgorithm;
  let rng: Xoshiro256StarStar;

  beforeEach(() => {
    rng = rngFromHash('ga-test');
    ga = new GeneticAlgorithm(rng);
  });

  it('should initialize with population', async () => {
    const seeds = Array(10)
      .fill(null)
      .map((_, i) => {
        const s = new Seed('character', `Seed_${i}`);
        return s.setGene('scalar', Math.random(), { min: 0, max: 1 });
      });

    const fitnessFn = async (seed: Seed) => {
      const val = seed.getGeneValue('scalar') as number;
      return Math.abs(val - 0.5);  // Fitness: closeness to 0.5
    };

    const config = {
      populationSize: 10,
      generationLimit: 5,
      mutationRate: 0.15,
      crossoverRate: 0.8,
      tournamentSize: 3,
      elitismCount: 2
    };

    const result = await ga.evolve(seeds, fitnessFn, config);

    expect(result.best).toBeDefined();
    expect(result.fitness).toBeGreaterThanOrEqual(0);
    expect(result.history.length).toBe(5);
  });

  it('should improve fitness over generations', async () => {
    const seeds = Array(20)
      .fill(null)
      .map(() => {
        const s = new Seed('character');
        return s.setGene('scalar', Math.random(), { min: 0, max: 1 });
      });

    // Fitness: maximize value (closer to 1.0 is better)
    const fitnessFn = async (seed: Seed) => {
      const val = seed.getGeneValue('scalar') as number;
      return val;
    };

    const config = {
      populationSize: 20,
      generationLimit: 20,
      mutationRate: 0.1,
      crossoverRate: 0.8,
      tournamentSize: 5,
      elitismCount: 4
    };

    const result = await ga.evolve(seeds, fitnessFn, config);

    // Best fitness should be close to 1.0
    expect(result.fitness).toBeGreaterThan(0.7);
  });

  it('should maintain diversity', async () => {
    const seeds = Array(10)
      .fill(null)
      .map(() => {
        const s = new Seed('character');
        return s.setGene('scalar', Math.random(), { min: 0, max: 1 });
      });

    const fitnessFn = async (seed: Seed) => {
      return Math.random();  // Random fitness
    };

    const config = {
      populationSize: 10,
      generationLimit: 10,
      mutationRate: 0.2,
      crossoverRate: 0.8,
      tournamentSize: 2,
      elitismCount: 1
    };

    const result = await ga.evolve(seeds, fitnessFn, config);

    // Population should have diversity
    const distances = [];
    for (let i = 0; i < result.population.length; i++) {
      for (let j = i + 1; j < Math.min(i + 3, result.population.length); j++) {
        distances.push(result.population[i].distance(result.population[j]));
      }
    }

    const avgDiversity = distances.reduce((a, b) => a + b, 0) / distances.length;
    expect(avgDiversity).toBeGreaterThan(0.01);  // Some diversity preserved
  });
});

describe('Determinism', () => {
  it('same seed hash always produces same result', () => {
    const rng1 = rngFromHash('determinism-test');
    const rng2 = rngFromHash('determinism-test');

    const s1 = new Seed('character');
    const s2 = new Seed('character');

    const m1 = s1.setGene('scalar', 0.5, { min: 0, max: 1 }).mutate(rng1, 0.1);
    const m2 = s2.setGene('scalar', 0.5, { min: 0, max: 1 }).mutate(rng2, 0.1);

    expect(m1.getGeneValue('scalar')).toBe(m2.getGeneValue('scalar'));
  });
});
