import { UniversalSeed } from '../seeds';

export interface FeatureVector {
  dimensions: number[];
  values: number[];
}

export interface MapElitesConfig {
  gridSize: number[];
  mutationRate: number;
  numFeatures: number;
  fillRate: number;
}

export interface EliteCell {
  seed: UniversalSeed;
  fitness: number;
  feature: FeatureVector;
}

export interface MapElitesResult {
  elites: Map<string, EliteCell>;
  convergence: number;
  coverage: number;
}

export class MAPElites {
  private config: MapElitesConfig;
  private grid: Map<string, EliteCell> = new Map();
  private rng: { nextFloat: () => number; nextInt: (min: number, max: number) => number };

  constructor(config: Partial<MapElitesConfig> = {}, rng?: { nextFloat: () => number; nextInt: (min: number, max: number) => number }) {
    this.config = {
      gridSize: config.gridSize ?? [10, 10],
      mutationRate: config.mutationRate ?? 0.2,
      numFeatures: config.numFeatures ?? 2,
      fillRate: config.fillRate ?? 0.1
    };
    this.rng = rng ?? {
      nextFloat: () => Math.random(),
      nextInt: (min, max) => Math.floor(Math.random() * (max - min + 1)) + min
    };
  }

  initGrid(seeds: UniversalSeed[], featureFn: (seed: UniversalSeed) => FeatureVector, fitnessFn: (seed: UniversalSeed) => number): void {
    this.grid.clear();

    for (const seed of seeds) {
      const feature = featureFn(seed);
      const fitness = fitnessFn(seed);
      const key = this.getGridKey(feature);

      const existing = this.grid.get(key);
      if (!existing || fitness > existing.fitness) {
        this.grid.set(key, { seed, fitness, feature });
      }
    }
  }

  async evolve(
    seedBank: UniversalSeed[],
    featureFn: (seed: UniversalSeed) => FeatureVector,
    fitnessFn: (seed: UniversalSeed) => number,
    iterations: number = 1000
  ): Promise<MapElitesResult> {
    if (this.grid.size === 0) {
      this.initGrid(seedBank, featureFn, fitnessFn);
    }

    let noImprovement = 0;
    const maxNoImprovement = 100;

    for (let i = 0; i < iterations; i++) {
      const cell = this.randomCell();
      if (!cell) continue;

      const mutated = cell.seed.mutate(this.rng, this.config.mutationRate);
      const feature = featureFn(mutated);
      const fitness = fitnessFn(mutated);
      const key = this.getGridKey(feature);

      const existing = this.grid.get(key);
      if (!existing || fitness > existing.fitness) {
        this.grid.set(key, { seed: mutated, fitness, feature });
        noImprovement = 0;
      } else {
        noImprovement++;
      }

      if (noImprovement > maxNoImprovement) break;

      if ((i + 1) % 100 === 0) {
        console.log(`Iteration ${i + 1}: ${this.getCoverage().toFixed(1)}% coverage`);
      }
    }

    return {
      elites: new Map(this.grid),
      convergence: this.getConvergence(),
      coverage: this.getCoverage()
    };
  }

  private getGridKey(feature: FeatureVector): string {
    const cellSize = this.config.gridSize.map((size, i) => {
      const dimMax = Math.max(...feature.dimensions);
      const cell = Math.floor((feature.values[i] / dimMax) * size);
      return Math.min(cell, size - 1);
    });
    return cellSize.join(',');
  }

  private randomCell(): EliteCell | null {
    if (this.grid.size === 0) return null;
    const keys = Array.from(this.grid.keys());
    return this.grid.get(keys[this.rng.nextInt(0, keys.length - 1)])!;
  }

  private getConvergence(): number {
    if (this.grid.size === 0) return 0;
    const fitnesses = Array.from(this.grid.values()).map(c => c.fitness);
    const max = Math.max(...fitnesses);
    const min = Math.min(...fitnesses);
    return max > min ? (fitnesses.reduce((sum, f) => sum + (max - f), 0) / this.grid.size / max) : 0;
  }

  getCoverage(): number {
    const totalCells = this.config.gridSize.reduce((prod, size) => prod * size, 1);
    return (this.grid.size / totalCells) * 100;
  }

  getElites(): Map<string, EliteCell> {
    return new Map(this.grid);
  }

  getBestElite(): EliteCell | null {
    let best: EliteCell | null = null;
    for (const cell of this.grid.values()) {
      if (!best || cell.fitness > best.fitness) {
        best = cell;
      }
    }
    return best;
  }

  getConfig(): MapElitesConfig {
    return { ...this.config };
  }
}