/**
 * DQD (Differentiable Quality Diversity)
 *
 * Combines quality-diversity search with gradient-based optimization.
 * Uses measurable behavioral characteristics to maintain diversity
 * while optimizing for quality via approximate gradients.
 */

import type { Seed } from '../kernel/types';
import { rngFromHash } from '../kernel/rng';

export interface DQDConfig {
  gridDimensions: number[];
  populationSize: number;
  generations: number;
  mutationRate: number;
  gradientSteps: number;
  stepSize: number;
}

export interface DQDResult {
  archive: Map<string, { seed: Seed; fitness: number; measures: number[] }>;
  best: Seed;
  bestFitness: number;
  coverage: number;
  history: { generation: number; bestFitness: number; coverage: number }[];
}

export class DQD {
  private config: DQDConfig;

  constructor(config: Partial<DQDConfig> = {}) {
    this.config = {
      gridDimensions: config.gridDimensions || [10, 10],
      populationSize: config.populationSize || 100,
      generations: config.generations || 50,
      mutationRate: config.mutationRate || 0.15,
      gradientSteps: config.gradientSteps || 3,
      stepSize: config.stepSize || 0.05,
    };
  }

  async run(
    initialPopulation: Seed[],
    fitnessFn: (seed: Seed) => Promise<number>,
    measureFn: (seed: Seed) => number[]
  ): Promise<DQDResult> {
    const rng = rngFromHash(initialPopulation[0]?.$hash || 'dqd-default');
    const archive = new Map<string, { seed: Seed; fitness: number; measures: number[] }>();

    for (const seed of initialPopulation) {
      const fitness = await fitnessFn(seed);
      const measures = measureFn(seed);
      const key = this.getCellKey(measures);
      const existing = archive.get(key);
      if (!existing || existing.fitness < fitness) {
        archive.set(key, { seed, fitness, measures });
      }
    }

    const history: DQDResult['history'] = [];
    let bestFitness = -Infinity;
    let best = initialPopulation[0];

    for (let gen = 0; gen < this.config.generations; gen++) {
      const entries = Array.from(archive.values());
      const newEntries: typeof entries = [];

      for (const entry of entries) {
        for (let s = 0; s < this.config.gradientSteps; s++) {
          const perturbed = this.perturb(entry.seed, rng, this.config.stepSize);
          const fitness = await fitnessFn(perturbed);
          const measures = measureFn(perturbed);
          const key = this.getCellKey(measures);
          const existing = archive.get(key);

          if (!existing || existing.fitness < fitness) {
            archive.set(key, { seed: perturbed, fitness, measures });
          }

          if (fitness > bestFitness) {
            bestFitness = fitness;
            best = perturbed;
          }
        }

        const mutated = this.mutate(entry.seed, rng);
        const fitness = await fitnessFn(mutated);
        const measures = measureFn(mutated);
        const key = this.getCellKey(measures);
        const existing = archive.get(key);

        if (!existing || existing.fitness < fitness) {
          archive.set(key, { seed: mutated, fitness, measures });
        }

        if (fitness > bestFitness) {
          bestFitness = fitness;
          best = mutated;
        }
      }

      const coverage = archive.size / this.config.gridDimensions.reduce((a, b) => a * b, 1);
      history.push({ generation: gen, bestFitness, coverage });
    }

    return { archive, best, bestFitness, coverage: archive.size / this.config.gridDimensions.reduce((a, b) => a * b, 1), history };
  }

  private getCellKey(measures: number[]): string {
    return measures.map((m, i) => {
      const dim = this.config.gridDimensions[i] || 10;
      return Math.min(dim - 1, Math.floor(Math.max(0, Math.min(1, m)) * dim));
    }).join(',');
  }

  private perturb(seed: Seed, rng: { nextF64: () => number }, step: number): Seed {
    const child = JSON.parse(JSON.stringify(seed));
    if (!child.genes) return child;
    for (const [, gene] of Object.entries(child.genes)) {
      const g = gene as any;
      if (typeof g.value === 'number') {
        g.value = Math.max(0, Math.min(1, g.value + (rng.nextF64() - 0.5) * step));
      }
    }
    return child;
  }

  private mutate(seed: Seed, rng: { nextF64: () => number }): Seed {
    const child = JSON.parse(JSON.stringify(seed));
    if (!child.genes) return child;
    for (const [, gene] of Object.entries(child.genes)) {
      if (rng.nextF64() < this.config.mutationRate) {
        const g = gene as any;
        if (typeof g.value === 'number') {
          g.value = Math.max(0, Math.min(1, g.value + (rng.nextF64() - 0.5) * 0.3));
        }
      }
    }
    return child;
  }
}

export function createDQD(config?: Partial<DQDConfig>): DQD {
  return new DQD(config);
}
