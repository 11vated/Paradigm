/**
 * POET (Paired Open-Ended Trailblazer)
 *
 * Co-evolves environments and solutions simultaneously.
 * Each environment is a seed, and each solution is also a seed.
 * Environments that are too easy or too hard are discarded.
 */

import type { Seed } from '../kernel/types';
import { rngFromHash } from '../kernel/rng';

export interface POETConfig {
  maxEnvironments: number;
  generations: number;
  mutationRate: number;
  difficultyThreshold: number;
}

export interface POETResult {
  environments: { env: Seed; solution: Seed; fitness: number }[];
  bestSolution: Seed;
  bestFitness: number;
  history: { generation: number; envCount: number; bestFitness: number }[];
}

export class POET {
  private config: POETConfig;

  constructor(config: Partial<POETConfig> = {}) {
    this.config = {
      maxEnvironments: config.maxEnvironments || 50,
      generations: config.generations || 100,
      mutationRate: config.mutationRate || 0.2,
      difficultyThreshold: config.difficultyThreshold || 0.8,
    };
  }

  async run(
    initialEnvs: Seed[],
    fitnessFn: (env: Seed, solution: Seed) => Promise<number>,
    createSolution: (env: Seed, rng: { nextF64: () => number }) => Seed
  ): Promise<POETResult> {
    const rng = rngFromHash(initialEnvs[0]?.$hash || 'poet-default');
    const envs: { env: Seed; solution: Seed; fitness: number; attempts: number }[] = [];

    for (const env of initialEnvs) {
      const sol = createSolution(env, rng);
      envs.push({ env, solution: sol, fitness: 0, attempts: 0 });
    }

    const history: POETResult['history'] = [];
    let bestSolution = envs[0]?.solution;
    let bestFitness = 0;

    for (let gen = 0; gen < this.config.generations; gen++) {
      for (const entry of envs) {
        const fitness = await fitnessFn(entry.env, entry.solution);
        entry.fitness = fitness;
        entry.attempts++;

        if (fitness > bestFitness) {
          bestFitness = fitness;
          bestSolution = entry.solution;
        }

        if (fitness < 0.1 && entry.attempts > 5) {
          entry.solution = createSolution(entry.env, rng);
          entry.attempts = 0;
        }

        if (fitness > this.config.difficultyThreshold && entry.attempts > 3) {
          const mutatedEnv = this.mutateSeed(entry.env, rng);
          const newSol = createSolution(mutatedEnv, rng);
          if (envs.length < this.config.maxEnvironments) {
            envs.push({ env: mutatedEnv, solution: newSol, fitness: 0, attempts: 0 });
          }
        }
      }

      envs.sort((a, b) => b.fitness - a.fitness);
      if (envs.length > this.config.maxEnvironments) {
        envs.splice(this.config.maxEnvironments);
      }

      history.push({ generation: gen, envCount: envs.length, bestFitness });
    }

    return {
      environments: envs.map(e => ({ env: e.env, solution: e.solution, fitness: e.fitness })),
      bestSolution,
      bestFitness,
      history,
    };
  }

  private mutateSeed(seed: Seed, rng: { nextF64: () => number }): Seed {
    const child = JSON.parse(JSON.stringify(seed));
    if (!child.genes) return child;
    for (const [, gene] of Object.entries(child.genes)) {
      if (rng.nextF64() < this.config.mutationRate) {
        const g = gene as any;
        if (typeof g.value === 'number') {
          g.value = Math.max(0, Math.min(1, g.value + (rng.nextF64() - 0.5) * 0.2));
        }
      }
    }
    return child;
  }
}

export function createPOET(config?: Partial<POETConfig>): POET {
  return new POET(config);
}
