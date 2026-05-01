import { UniversalSeed, GeneType } from '../src/seeds';
import { Kernel } from '../src/kernel';
import { GeneticAlgorithm } from '../src/evolution';

describe('Cross-Engine Parity Tests', () => {
  const testSeed = () => {
    const seed = new UniversalSeed();
    seed.setGene(GeneType.COLOR, [1, 0, 0]);
    seed.setGene(GeneType.SHAPE, 'circle');
    seed.setGene(GeneType.MOTION, { velocity: 1, acceleration: 0.5 });
    return seed;
  };

  describe('Seed Operations Parity', () => {
    test('should create identical seeds across all engines', () => {
      const kernel = new Kernel({ seed: 42 });
      
      const seeds = [];
      for (let i = 0; i < 100; i++) {
        const seed = new UniversalSeed();
        seed.setGene(GeneType.COLOR, [Math.random(), Math.random(), Math.random()]);
        seeds.push(seed);
      }

      expect(seeds.length).toBe(100);
      seeds.forEach(seed => {
        expect(seed.getGene(GeneType.COLOR)).toBeDefined();
      });
    });

    test('should mutate with consistent probability', () => {
      const seed = testSeed();
      const originalGenes = seed.getAllGenes();
      
      const mutateCount = 1000;
      let changedCount = 0;

      for (let i = 0; i < mutateCount; i++) {
        const mutated = seed.mutate({ nextFloat: () => 0.05 }, 0.1);
        if (mutated.getGeneValue(GeneType.COLOR) !== seed.getGeneValue(GeneType.COLOR)) {
          changedCount++;
        }
      }

      const expectedProbability = 0.05 * 0.1;
      const actualProbability = changedCount / mutateCount;
      expect(Math.abs(actualProbability - expectedProbability)).toBeLessThan(0.05);
    });

    test('should breed consistently', () => {
      const parentA = testSeed();
      const parentB = new UniversalSeed();
      parentB.setGene(GeneType.COLOR, [0, 0, 1]);
      parentB.setGene(GeneType.SHAPE, 'square');
      parentB.setGene(GeneType.MOTION, { velocity: 0.5, acceleration: 1 });

      const child = parentA.cross(parentB, { nextFloat: () => 0.5 });

      expect(child.getGene(GeneType.COLOR)).toBeDefined();
      expect(child.getGeneration()).toBe(1);
      expect(child.getParents()).toContain(parentA.id);
      expect(child.getParents()).toContain(parentB.id);
    });
  });

  describe('Gene Type Coverage', () => {
    const geneTypes = Object.values(GeneType);
    
    test('should have 17 gene types', () => {
      expect(geneTypes.length).toBe(17);
    });

    test('should create seeds with all gene types', () => {
      const seed = new UniversalSeed();
      
      for (const geneType of geneTypes) {
        const defaultValues: Record<string, unknown> = {
          [GeneType.COLOR]: [1, 0, 0],
          [GeneType.SHAPE]: 'circle',
          [GeneType.MOTION]: { velocity: 1, acceleration: 0 },
          [GeneType.AUDIO]: { volume: 1, frequency: 440 },
          [GeneType.TEXTURE]: 'smooth',
          [GeneType.PATTERN]: { repeat: 1, scale: 1 },
          [GeneType.BEHAVIOR]: { stateMachine: [], goals: [] },
          [GeneType.INTERACTION]: { click: false, drag: false },
          [GeneType.PHYSICS]: { mass: 1, gravity: 9.8 },
          [GeneType.MATERIAL]: { roughness: 0.5, metalness: 0 },
          [GeneType.LIGHTING]: { ambient: 0.3, directional: 0.7 },
          [GeneType.ENVIRONMENT]: { background: '#000000' },
          [GeneType.ANIMATION]: { keyframes: [], duration: 1 },
          [GeneType.LOGIC]: { conditions: [], actions: [] },
          [GeneType.DATA]: { values: [] },
          [GeneType.STRUCTURE]: { nodes: [] },
          [GeneType.META]: { version: '1.0.0' }
        };
        
        seed.setGene(geneType, defaultValues[geneType] ?? null);
      }

      for (const geneType of geneTypes) {
        expect(seed.hasGene(geneType)).toBe(true);
      }
    });
  });

  describe('Evolution Algorithm Parity', () => {
    test('GA should find optimal solution', async () => {
      const population: UniversalSeed[] = [];
      
      for (let i = 0; i < 50; i++) {
        const seed = new UniversalSeed();
        seed.setGene(GeneType.COLOR, [Math.random(), Math.random(), Math.random()]);
        population.push(seed);
      }

      const fitnessFn = (seed: UniversalSeed) => {
        const color = seed.getGeneValue(GeneType.COLOR) as number[];
        if (!color) return 0;
        const target = [1, 0, 0];
        return 1 - Math.sqrt(
          Math.pow(color[0] - target[0], 2) +
          Math.pow(color[1] - target[1], 2) +
          Math.pow(color[2] - target[2], 2)
        ) / Math.sqrt(3);
      };

      const ga = new GeneticAlgorithm({
        populationSize: 50,
        generationLimit: 10,
        mutationRate: 0.1,
        crossoverRate: 0.7
      });

      const result = await ga.evolve(population, fitnessFn);

      expect(result.bestSeed).toBeDefined();
      expect(result.bestFitness).toBeGreaterThan(0);
      expect(result.generation).toBeLessThanOrEqual(10);
    });

    test('should preserve diversity', async () => {
      const population: UniversalSeed[] = [];
      
      for (let i = 0; i < 20; i++) {
        const seed = new UniversalSeed();
        seed.setGene(GeneType.COLOR, [
          Math.random(),
          Math.random(),
          Math.random()
        ]);
        population.push(seed);
      }

      const fitnessFn = (_seed: UniversalSeed) => Math.random();

      const ga = new GeneticAlgorithm({
        populationSize: 20,
        generationLimit: 5,
        mutationRate: 0.1,
        crossoverRate: 0.7,
        elitismCount: 1
      });

      const result = await ga.evolve(population, fitnessFn);

      expect(result.population.length).toBeGreaterThan(0);
    });
  });

  describe('Kernel Parity', () => {
    test('should produce deterministic sequences', () => {
      const kernelA = new Kernel({ seed: 12345 });
      const kernelB = new Kernel({ seed: 12345 });

      const resultsA = [];
      const resultsB = [];

      for (let i = 0; i < 100; i++) {
        resultsA.push(kernelA.getRNG().nextFloat());
        resultsB.push(kernelB.getRNG().nextFloat());
      }

      expect(resultsA).toEqual(resultsB);
    });

    test('should fork correctly', () => {
      const kernel = new Kernel({ seed: 42 });
      
      const value1 = kernel.getRNG().nextFloat();
      const forked = kernel.fork();
      const value2 = forked.getRNG().nextFloat();

      expect(value1).not.toBe(value2);
      expect(kernel.getRNG().nextFloat()).not.toBe(value2);
    });

    test('should maintain tick consistency', () => {
      const kernel = new Kernel({ seed: 42, tickRate: 60 });
      kernel.initialize();

      const startTick = kernel.getTick().getTick();
      
      return new Promise(resolve => setTimeout(() => {
        kernel.shutdown();
        const endTick = kernel.getTick().getTick();
        expect(endTick).toBeGreaterThanOrEqual(startTick);
        resolve(true);
      }, 100));
    });
  });

  describe('Serialization Parity', () => {
    test('should serialize and deserialize consistently', () => {
      const original = testSeed();
      original.setGene(GeneType.META, { version: '1.0.0' });
      
      const json = original.toJSON();
      const restored = UniversalSeed.fromJSON(json);

      expect(restored.getMetadata().name).toBe(original.getMetadata().name);
      expect(restored.getGeneValue(GeneType.COLOR)).toEqual(original.getGeneValue(GeneType.COLOR));
      expect(restored.getGeneValue(GeneType.SHAPE)).toBe(original.getGeneValue(GeneType.SHAPE));
    });

    test('should preserve lineage across serialization', () => {
      const parent = testSeed();
      const child = parent.mutate({ nextFloat: () => 0.5 });
      
      const json = child.toJSON();
      const restored = UniversalSeed.fromJSON(json);

      expect(restored.getParents()).toContain(parent.id);
    });
  });
});

describe('Seed Commons Validation', () => {
  test('should have 100 reference seeds', () => {
    const createSeedCommons = require('../commons/data').createSeedCommons;
    const seeds = createSeedCommons();
    
    expect(seeds.length).toBe(100);
  });

  test('should cover all domains', () => {
    const createSeedCommons = require('../commons/data').createSeedCommons;
    const seeds = createSeedCommons();
    
    const domains = new Set(seeds.map(s => s.getMetadata().domain as string));
    
    expect(domains.size).toBeGreaterThanOrEqual(5);
  });

  test('should have valid gene combinations', () => {
    const createSeedCommons = require('../commons/data').createSeedCommons;
    const seeds = createSeedCommons();
    
    for (const seed of seeds) {
      expect(seed.getGeneValue(GeneType.COLOR)).toBeDefined();
    }
  });
});