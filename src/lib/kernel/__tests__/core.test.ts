/**
 * PARADIGM TEST SUITE — Phase 1
 * Unit tests for kernel operations, genetic algorithms, and GSPL integration
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { UniversalSeed } from '../../../seeds/universal-seed';
import { Xoshiro256StarStar, rngFromHash } from '../rng';
import { GeneticAlgorithm } from '../../evolution/ga';
import { GeneSystem } from '../gene_system';

function makeMeta(name: string, domain = 'character'): any {
  return { name, domain, id: `core-test-${name}`, version: '1.0.0', created: 0, updated: 0, tags: [] };
}

describe('Seed Class', () => {
  let seed: UniversalSeed;
  let rng: Xoshiro256StarStar;

  beforeEach(() => {
    seed = new UniversalSeed({ metadata: makeMeta('TestCharacter') });
    rng = rngFromHash('test-seed-123');
  });

  it('should create a seed with a unique ID', () => {
    expect(seed.id).toBeDefined();
    expect(typeof seed.id).toBe('string');
  });

  it('should compute deterministic content hash', () => {
    const seed1 = new UniversalSeed({ metadata: makeMeta('Test') });
    seed1.setGene('scalar', 0.5);
    const h1 = seed1.hash;
    expect(h1).toBe(seed1.hash);
  });

  it('should add and retrieve genes', () => {
    seed.setGene('scalar', 0.75);
    expect(seed.getGeneValue('scalar')).toBe(0.75);
  });

  it('should mutate and return new Seed', () => {
    const original = new UniversalSeed({ metadata: makeMeta('Original') });
    original.setGene('scalar', 0.5);
    const mutated = original.clone().mutate(rng, 0.1) as UniversalSeed;
    
    expect(mutated).not.toBe(original);
    expect(mutated.id).not.toBe(original.id);
  });

  it('should breed two seeds via crossover', () => {
    const parent1 = new UniversalSeed({ metadata: makeMeta('P1') });
    parent1.setGene('scalar', 0.3);
    const parent2 = new UniversalSeed({ metadata: makeMeta('P2') });
    parent2.setGene('scalar', 0.7);
    
    const child = parent1.cross(parent2, rng) as UniversalSeed;
    
    expect(Number(child.getGeneValue('scalar'))).toBeGreaterThanOrEqual(0.3);
    expect(Number(child.getGeneValue('scalar'))).toBeLessThanOrEqual(0.7);
  });

  it('should calculate genetic distance', () => {
    const s1 = new UniversalSeed({ metadata: makeMeta('S1') });
    s1.setGene('scalar', 0.2);
    
    const s2 = new UniversalSeed({ metadata: makeMeta('S2') });
    s2.setGene('scalar', 0.8);
    
    const distance = s1.distance(s2);
    expect(distance).toBeGreaterThan(0);
    expect(distance).toBeLessThanOrEqual(1);
  });

  it('should serialize and deserialize', () => {
    seed.setGene('scalar', 0.42);
    const json = seed.toJSON() as string;
    const restored = UniversalSeed.fromJSON(json);
    
    expect(restored.getGeneValue('scalar')).toBe(0.42);
    expect(restored.metadata.name).toBe(seed.metadata.name);
  });

  it('should track lineage through mutations', () => {
    const original = new UniversalSeed({ metadata: makeMeta('LineageOrig') });
    original.setGene('scalar', 0.5);
    const mutated = original.clone().mutate(rng, 0.1) as UniversalSeed;
    
    expect(mutated.derivation?.parents).toContain(original.id);
    expect(mutated.derivation?.operators).toContain('mutate');
    expect((mutated.derivation?.generation ?? 0)).toBeGreaterThan(original.derivation?.generation ?? -1);
  });

  it('should track lineage through breeding', () => {
    const p1 = new UniversalSeed({ metadata: makeMeta('BreedP1') });
    p1.setGene('scalar', 0.3);
    const p2 = new UniversalSeed({ metadata: makeMeta('BreedP2') });
    p2.setGene('scalar', 0.7);
    
    const child = p1.cross(p2, rng) as UniversalSeed;
    
    expect(child.derivation?.parents).toContain(p1.id);
    expect(child.derivation?.parents).toContain(p2.id);
    expect(child.derivation?.operators).toContain('breed');
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
        const s = new UniversalSeed({ metadata: makeMeta(`Seed_${i}`) });
        s.setGene('scalar', Math.random());
        return s;
      });

    const fitnessFn = async (seed: UniversalSeed) => {
      const val = seed.getGeneValue('scalar') as number;
      return Math.abs(val - 0.5);
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
        const s = new UniversalSeed({ metadata: makeMeta('Pop') });
        s.setGene('scalar', Math.random());
        return s;
      });

    const fitnessFn = async (seed: UniversalSeed) => {
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

    expect(result.fitness).toBeGreaterThan(0.7);
  });

  it('should maintain diversity', async () => {
    const seeds = Array(10)
      .fill(null)
      .map(() => {
        const s = new UniversalSeed({ metadata: makeMeta('Div') });
        s.setGene('scalar', Math.random());
        return s;
      });

    const fitnessFn = async (seed: UniversalSeed) => {
      return Math.random();
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

    const distances = [];
    for (let i = 0; i < result.population.length; i++) {
      for (let j = i + 1; j < Math.min(i + 3, result.population.length); j++) {
        distances.push(result.population[i].distance(result.population[j]));
      }
    }

    const avgDiversity = distances.reduce((a, b) => a + b, 0) / distances.length;
    expect(avgDiversity).toBeGreaterThan(0.01);
  });
});

describe('Determinism', () => {
  it('same seed hash always produces same result', () => {
    const rng1 = rngFromHash('determinism-test');
    const rng2 = rngFromHash('determinism-test');

    const s1 = new UniversalSeed({ metadata: makeMeta('Det1') });
    s1.setGene('scalar', 0.5);
    const s2 = new UniversalSeed({ metadata: makeMeta('Det2') });
    s2.setGene('scalar', 0.5);

    const m1 = s1.clone().mutate(rng1, 0.1) as UniversalSeed;
    const m2 = s2.clone().mutate(rng2, 0.1) as UniversalSeed;

    expect(m1.getGeneValue('scalar')).toBe(m2.getGeneValue('scalar'));
  });
});
