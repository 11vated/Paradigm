/**
 * MAP-Elites Evolution Algorithm
 * Gap 6: Grid-based population mapping for quality diversity
 * 
 * Maintains a population spread across behavioral feature bins,
 * enabling discovery of diverse high-quality solutions.
 */

import type { Seed } from '../kernel/types';
import { rngFromHash, Xoshiro256StarStar } from '../kernel/rng';

export interface MapElitesConfig {
  gridDimensions: number[];
  gridSize: number[];
  mutationRate: number;
  crossoverRate: number;
  elitismCount: number;
}

export interface Cell {
  seed: Seed;
  fitness: number;
  centroid?: number[];
}

export interface EvolutionResult {
  elite: Seed;
  bestFitness: number;
  gridCoverage: number;
  population: Map<string, Cell>;
}

export class MAPElites {
  private config: MapElitesConfig;
  private grid: Map<string, Cell>;
  private rng: Xoshiro256StarStar;
  private featureExtractor: (seed: Seed) => number[];

  constructor(
    featureExtractor: (seed: Seed) => number[],
    config: Partial<MapElitesConfig> = {}
  ) {
    this.featureExtractor = featureExtractor;
    this.config = {
      gridDimensions: config.gridDimensions || [5, 5],
      gridSize: [config.gridSize?.[0] || 10, config.gridSize?.[1] || 10],
      mutationRate: config.mutationRate || 0.1,
      crossoverRate: config.crossoverRate || 0.7,
      elitismCount: config.elitismCount || 1,
    };
    this.grid = new Map();
    this.rng = new Xoshiro256StarStar(Date.now());
  }

  private getCellKey(features: number[]): string {
    const key: number[] = [];
    for (let i = 0; i < features.length; i++) {
      const dim = this.config.gridDimensions[i] || 5;
      const bin = Math.min(dim - 1, Math.floor(features[i] * dim));
      key.push(bin);
    }
    return key.join(',');
  }

  private interpolateFeatures(features: number[]): number[] {
    const interpolated: number[] = [];
    for (let i = 0; i < features.length; i++) {
      const dim = this.config.gridDimensions[i] || 5;
      const size = this.config.gridSize[i] || 10;
      const range = size / dim;
      interpolated.push((features[i] * size) % range);
    }
    return interpolated;
  }

  initialize(population: Seed[], fitnessFn: (seed: Seed) => number): void {
    this.grid.clear();
    
    for (const seed of population) {
      const features = this.featureExtractor(seed);
      const interpolated = this.interpolateFeatures(features);
      const key = this.getCellKey(features);
      
      const fitness = fitnessFn(seed);
      
      if (!this.grid.has(key) || this.grid.get(key)!.fitness < fitness) {
        this.grid.set(key, { seed, fitness });
      }
    }
  }

  selectParent(): Seed {
    const cells = Array.from(this.grid.values());
    if (cells.length === 0) {
      throw new Error('No seeds in MAP-Elites grid');
    }
    
    const idx = this.rng.nextInt(0, cells.length);
    return cells[idx].seed;
  }

  mutate(seed: Seed): Seed {
    const geneCopy = JSON.parse(JSON.stringify(seed));
    
    if (!geneCopy.genes) return geneCopy;
    
    for (const [key, gene] of Object.entries(geneCopy.genes)) {
      if (this.rng.nextF64() < this.config.mutationRate) {
        switch (gene.type) {
          case 'scalar':
            gene.value = Math.max(0, Math.min(1, gene.value + (this.rng.nextF64() - 0.5) * 0.1));
            break;
          case 'int':
            gene.value += this.rng.nextInt(-1, 2);
            break;
          case 'array':
            if (Array.isArray(gene.value)) {
              gene.value = gene.value.map((v: number) => 
                Math.max(0, Math.min(1, v + (this.rng.nextF64() - 0.5) * 0.1))
              );
            }
            break;
          case 'categorical':
            break;
        }
      }
    }
    
    return geneCopy;
  }

  crossover(parentA: Seed, parentB: Seed): Seed {
    const child: any = { ...parentA };
    child.genes = { ...parentA.genes };
    
    if (parentB.genes) {
      for (const [key, geneB] of Object.entries(parentB.genes)) {
        if (this.rng.nextF64() < this.config.crossoverRate) {
          child.genes[key] = JSON.parse(JSON.stringify(geneB));
        }
      }
    }
    
    return child;
  }

  step(
    fitnessFn: (seed: Seed) => number,
    mutateFn: (seed: Seed) => Seed = (s) => this.mutate(s)
  ): EvolutionResult {
    const newCells: Map<string, Cell> = new Map();
    
    for (const [key, cell] of this.grid) {
      newCells.set(key, { ...cell });
    }
    
    const tries = 3;
    for (let t = 0; t < tries; t++) {
      const parentA = this.selectParent();
      const parentB = this.selectParent();
      
      const child = this.rng.nextF64() < this.config.crossoverRate
        ? this.crossover(parentA, parentB)
        : parentA;
      
      const mutated = mutateFn(child);
      const features = this.featureExtractor(mutated);
      const key = this.getCellKey(features);
      const fitness = fitnessFn(mutated);
      
      const existing = newCells.get(key);
      if (!existing || existing.fitness < fitness) {
        newCells.set(key, { seed: mutated, fitness });
      }
    }
    
    this.grid = newCells;
    
    let bestFitness = -Infinity;
    let elite = Array.from(this.grid.values())[0]?.seed;
    
    for (const cell of this.grid.values()) {
      if (cell.fitness > bestFitness) {
        bestFitness = cell.fitness;
        elite = cell.seed;
      }
    }
    
    const occupiedCells = Array.from(this.grid.values()).filter(c => c.seed).length;
    const totalCells = this.config.gridDimensions.reduce((a, b) => a * b, 1);
    const gridCoverage = occupiedCells / totalCells;
    
    return {
      elite: elite!,
      bestFitness,
      gridCoverage,
      population: this.grid
    };
  }

  run(
    initialPopulation: Seed[],
    fitnessFn: (seed: Seed) => number,
    generations: number,
    mutateFn?: (seed: Seed) => Seed
  ): EvolutionResult {
    this.initialize(initialPopulation, fitnessFn);
    
    let result: EvolutionResult = {
      elite: initialPopulation[0],
      bestFitness: -Infinity,
      gridCoverage: 0,
      population: this.grid
    };
    
    for (let g = 0; g < generations; g++) {
      result = this.step(fitnessFn, mutateFn);
    }
    
    return result;
  }

  getGridSnapshot(): { key: string; fitness: number }[] {
    return Array.from(this.grid.entries()).map(([key, cell]) => ({
      key,
      fitness: cell.fitness
    }));
  }
}

export function createMapElites(
  featureExtractor: (seed: Seed) => number[],
  config?: Partial<MapElitesConfig>
): MAPElites {
  return new MAPElites(featureExtractor, config);
}