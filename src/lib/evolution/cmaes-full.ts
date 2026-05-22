/**
 * CMA-ES (Covariance Matrix Adaptation Evolution Strategy)
 *
 * Full implementation for continuous optimization of seed gene vectors.
 * Adapts the covariance matrix to learn the landscape structure.
 * Deterministic via xoshiro256**.
 */

import type { Seed } from '../kernel/types';
import { rngFromHash } from '../kernel/rng';

export interface CMAESConfig {
  populationSize: number;
  generations: number;
  initialSigma: number;
  learningRate?: number;
}

export interface CMAESResult {
  best: Seed;
  bestFitness: number;
  mean: number[];
  sigma: number;
  history: { generation: number; bestFitness: number; avgFitness: number }[];
}

export class CMAES {
  private config: CMAESConfig;

  constructor(config: Partial<CMAESConfig> = {}) {
    this.config = {
      populationSize: config.populationSize || 20,
      generations: config.generations || 50,
      initialSigma: config.initialSigma || 0.5,
      learningRate: config.learningRate || 0.3,
    };
  }

  async optimize(
    seed: Seed,
    fitnessFn: (seed: Seed) => Promise<number> | number,
    geneKeys: string[]
  ): Promise<CMAESResult> {
    const rng = rngFromHash(seed.$hash ?? 'cmaes-default');
    const dim = geneKeys.length;
    const lambda = this.config.populationSize;
    const mu = Math.floor(lambda / 2);
    const weights = Array.from({ length: mu }, (_, i) => Math.log(mu + 0.5) - Math.log(i + 1));
    const muEff = weights.reduce((a, b) => a + b, 0) ** 2 / weights.reduce((a, b) => a + b * b, 0);

    const cs = (muEff + 2) / (dim + muEff + 5);
    const cc = (4 + muEff / dim) / (dim + 4 + 2 * muEff / dim);
    const c1 = 2 / ((dim + 1.3) ** 2 + muEff);
    const cmu = Math.min(1 - c1, 2 * (muEff - 2 + 1 / muEff) / ((dim + 2) ** 2 + muEff));
    const ds = 1 + cs + 2 * Math.max(0, Math.sqrt((muEff - 1) / (dim + 1)) - 1);
    const chiN = Math.sqrt(dim) * (1 - 1 / (4 * dim) + 1 / (21 * dim ** 2));

    let xmean = this.extractGenes(seed, geneKeys);
    let sigma = this.config.initialSigma;
    let C: number[][] = Array.from({ length: dim }, (_, i) =>
      Array.from({ length: dim }, (_, j) => (i === j ? 1 : 0))
    );
    let pSigma = new Array(dim).fill(0);
    let pC = new Array(dim).fill(0);
    let hSigma = 1;

    const history: CMAESResult['history'] = [];
    let bestEver = seed;
    let bestEverFitness = -Infinity;

    for (let gen = 0; gen < this.config.generations; gen++) {
      const offspring: { seed: Seed; fitness: number; z: number[] }[] = [];

      for (let i = 0; i < lambda; i++) {
        const z = Array.from({ length: dim }, () => this.randNorm(rng));
        const x = xmean.map((v, j) => v + sigma * this.mvMult(C, z)[j]);
        const childSeed = this.applyGenes(seed, geneKeys, x);
        const fitness = await fitnessFn(childSeed);
        offspring.push({ seed: childSeed, fitness, z });

        if (fitness > bestEverFitness) {
          bestEverFitness = fitness;
          bestEver = childSeed;
        }
      }

      offspring.sort((a, b) => b.fitness - a.fitness);
      const selected = offspring.slice(0, mu);
      const avgFitness = selected.reduce((a, b) => a + b.fitness, 0) / mu;

      xmean = selected.reduce(
        (sum, ind) => sum.map((v, j) => v + weights[ind.z.length - 1] * ind.z[j] * sigma + v * 0),
        new Array(dim).fill(0)
      ).map((_, j) => selected.reduce((s, ind, idx) => s + weights[idx] * (ind.z[j] * sigma + xmean[j]), 0) / weights.reduce((a, b) => a + b, 0));

      const xmeanNew = selected.reduce(
        (sum, ind, idx) => sum.map((v, j) => v + (weights[idx] / weights.reduce((a, b) => a + b, 0)) * ind.z[j]),
        new Array(dim).fill(0)
      );

      pSigma = pSigma.map((v, j) => (1 - cs) * v + Math.sqrt(cs * (2 - cs) * muEff) * xmeanNew[j]);
      const psNorm = Math.sqrt(pSigma.reduce((a, b) => a + b * b, 0));
      hSigma = ((psNorm / (1 - (1 - cs) ** (2 * (gen + 1))) < (1.4 + 2 / (dim + 1)) * chiN) ? 1 : 0) as 0 | 1;

      pC = pC.map((v, j) => (1 - cc) * v + hSigma * Math.sqrt(cc * (2 - cc) * muEff) * xmeanNew[j]);

      for (let i = 0; i < dim; i++) {
        for (let j = 0; j < dim; j++) {
           C[i][j] = (1 - c1 - cmu) * C[i][j] + c1 * (pC[i] * pC[j] + (1 - hSigma) * cc * (2 - cc) * C[i][j]);
          for (let k = 0; k < mu; k++) {
            C[i][j] += cmu * weights[k] * selected[k].z[i] * selected[k].z[j];
          }
        }
      }

      sigma *= Math.exp((cs / ds) * (psNorm / chiN - 1));
      sigma = Math.max(sigma, 1e-10);

      history.push({ generation: gen, bestFitness: selected[0].fitness, avgFitness });
    }

    return { best: bestEver, bestFitness: bestEverFitness, mean: xmean, sigma, history };
  }

  private extractGenes(seed: Seed, keys: string[]): number[] {
    return keys.map(k => {
      const g = (seed.genes as any)?.[k];
      return typeof g?.value === 'number' ? g.value : 0.5;
    });
  }

  private applyGenes(seed: Seed, keys: string[], values: number[]): Seed {
    const child = JSON.parse(JSON.stringify(seed));
    for (let i = 0; i < keys.length; i++) {
      if (child.genes?.[keys[i]]) {
        child.genes[keys[i]].value = Math.max(0, Math.min(1, values[i]));
      }
    }
    return child;
  }

  private mvMult(C: number[][], z: number[]): number[] {
    const dim = z.length;
    const result = new Array(dim).fill(0);
    for (let i = 0; i < dim; i++) {
      for (let j = 0; j < dim; j++) {
        result[i] += C[i][j] * z[j];
      }
    }
    return result;
  }

  private randNorm(rng: { nextF64: () => number }): number {
    let u = 0, v = 0;
    while (u === 0) u = rng.nextF64();
    while (v === 0) v = rng.nextF64();
    return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
  }
}

export function createCMAES(config?: Partial<CMAESConfig>): CMAES {
  return new CMAES(config);
}
