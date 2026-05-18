/**
 * AURORA (Adaptive User-guided Retrieval for Open-Ended Runtime Adaptation)
 *
 * Quality-diversity algorithm that uses archive-based novelty search
 * with user-guided preferences. Maintains an archive of diverse solutions
 * and biases search toward user-specified behavioral regions.
 */

import type { Seed } from '../kernel/types';
import { rngFromHash } from '../kernel/rng';

export interface AURORAConfig {
  archiveSize: number;
  generations: number;
  mutationRate: number;
  noveltyK: number;
  userWeight: number;
}

export interface AURORAResult {
  archive: { seed: Seed; fitness: number; measures: number[] }[];
  best: Seed;
  bestFitness: number;
  history: { generation: number; bestFitness: number; archiveSize: number }[];
}

export class AURORA {
  private config: AURORAConfig;

  constructor(config: Partial<AURORAConfig> = {}) {
    this.config = {
      archiveSize: config.archiveSize || 500,
      generations: config.generations || 100,
      mutationRate: config.mutationRate || 0.2,
      noveltyK: config.noveltyK || 15,
      userWeight: config.userWeight || 0.5,
    };
  }

  async run(
    initialPopulation: Seed[],
    fitnessFn: (seed: Seed) => Promise<number>,
    measureFn: (seed: Seed) => number[],
    userPreference?: (measures: number[]) => number
  ): Promise<AURORAResult> {
    const rng = rngFromHash(initialPopulation[0]?.$hash || 'aurora-default');
    const archive: { seed: Seed; fitness: number; measures: number[] }[] = [];

    for (const seed of initialPopulation) {
      const fitness = await fitnessFn(seed);
      const measures = measureFn(seed);
      archive.push({ seed, fitness, measures });
    }

    const history: AURORAResult['history'] = [];
    let bestFitness = -Infinity;
    let best = initialPopulation[0];

    for (let gen = 0; gen < this.config.generations; gen++) {
      const parent = this.selectParent(archive, userPreference, rng);
      const child = this.mutate(parent.seed, rng);
      const fitness = await fitnessFn(child);
      const measures = measureFn(child);

      if (fitness > bestFitness) {
        bestFitness = fitness;
        best = child;
      }

      const novelty = this.computeNovelty(measures, archive);
      const userScore = userPreference ? userPreference(measures) : 0;
      const combinedScore = (1 - this.config.userWeight) * fitness + this.config.userWeight * userScore;

      if (archive.length < this.config.archiveSize || novelty > this.getNoveltyThreshold(archive)) {
        archive.push({ seed: child, fitness: combinedScore, measures });
        if (archive.length > this.config.archiveSize) {
          archive.sort((a, b) => b.fitness - a.fitness);
          archive.splice(this.config.archiveSize);
        }
      }

      history.push({ generation: gen, bestFitness, archiveSize: archive.length });
    }

    return { archive, best, bestFitness, history };
  }

  private selectParent(
    archive: { seed: Seed; fitness: number; measures: number[] }[],
    userPreference: ((measures: number[]) => number) | undefined,
    rng: { nextF64: () => number }
  ): { seed: Seed; fitness: number; measures: number[] } {
    if (archive.length === 0) throw new Error('Empty archive');
    const tournamentSize = Math.min(7, archive.length);
    let best: typeof archive[0] | null = null;

    for (let i = 0; i < tournamentSize; i++) {
      const candidate = archive[Math.floor(rng.nextF64() * archive.length)];
      if (!best || candidate.fitness > best.fitness) {
        best = candidate;
      }
    }
    return best!;
  }

  private computeNovelty(measures: number[], archive: { measures: number[] }[]): number {
    const distances = archive
      .map(a => this.euclideanDistance(measures, a.measures))
      .sort((a, b) => a - b);
    const k = Math.min(this.config.noveltyK, distances.length);
    return distances.slice(0, k).reduce((a, b) => a + b, 0) / k;
  }

  private getNoveltyThreshold(archive: { measures: number[] }[]): number {
    if (archive.length < 10) return 0;
    const novelties = archive.map((_, i) => {
      const others = archive.filter((_, j) => j !== i);
      return this.computeNovelty(others.length > 0 ? others[0].measures : [], archive);
    });
    novelties.sort((a, b) => a - b);
    return novelties[Math.floor(novelties.length * 0.5)] || 0;
  }

  private mutate(seed: Seed, rng: { nextF64: () => number }): Seed {
    const child = JSON.parse(JSON.stringify(seed));
    if (!child.genes) return child;
    for (const [, gene] of Object.entries(child.genes)) {
      if (rng.nextF64() < this.config.mutationRate) {
        const g = gene as any;
        if (typeof g.value === 'number') {
          g.value = Math.max(0, Math.min(1, g.value + (rng.nextF64() - 0.5) * 0.25));
        }
      }
    }
    return child;
  }

  private euclideanDistance(a: number[], b: number[]): number {
    let sum = 0;
    for (let i = 0; i < Math.min(a.length, b.length); i++) {
      const d = a[i] - b[i];
      sum += d * d;
    }
    return Math.sqrt(sum);
  }
}

export function createAURORA(config?: Partial<AURORAConfig>): AURORA {
  return new AURORA(config);
}
