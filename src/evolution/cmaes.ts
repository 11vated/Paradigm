import { GeneType } from '../seeds/types';
import { UniversalSeed } from '../seeds';
import { Xoshiro256StarStar, rngFromHash } from '../lib/kernel/rng';

export interface CMAESConfig {
  dimension: number;
  populationSize: number;
  initialSigma: number;
  targetFitness?: number;
  maxIterations: number;
}

export interface CMAESResult {
  bestVector: number[];
  bestFitness: number;
  iterations: number;
  history: number[];
}

export class CMAES {
  private config: CMAESConfig;
  private mean: number[];
  private sigma: number;
  private covMatrix: number[][];
  private pc: number[];
  private ps: number[];
  private history: number[] = [];
  private rng: ReturnType<typeof rngFromHash>;
  private eigenDecomp: { eigenvalues: number[]; eigenvectors: number[][] } | null = null;

  constructor(config: Partial<CMAESConfig> = {}, rng?: ReturnType<typeof rngFromHash>) {
    this.config = {
      dimension: config.dimension ?? 10,
      populationSize: config.populationSize ?? 20,
      initialSigma: config.initialSigma ?? 0.5,
      targetFitness: config.targetFitness,
      maxIterations: config.maxIterations ?? 1000
    };
    this.rng = rng ?? rngFromHash('cmaes-default');

    this.mean = new Array(this.config.dimension).fill(0).map(() => this.rng.nextF64());
    this.sigma = this.config.initialSigma;
    this.covMatrix = this.createIdentity(this.config.dimension);
    this.pc = new Array(this.config.dimension).fill(0);
    this.ps = new Array(this.config.dimension).fill(0);
  }

  private createIdentity(n: number): number[][] {
    const matrix = Array(n).fill(null).map(() => Array(n).fill(0));
    for (let i = 0; i < n; i++) matrix[i][i] = 1;
    return matrix;
  }

  async evolve(
    seedToVector: (seed: UniversalSeed) => number[],
    vectorToSeed: (vector: number[]) => UniversalSeed,
    fitnessFn: (seed: UniversalSeed) => number,
    initialSeed?: UniversalSeed
  ): Promise<CMAESResult> {
    if (initialSeed) {
      this.mean = seedToVector(initialSeed);
    }

    const lambda = this.config.populationSize;
    const mu = Math.floor(lambda / 2);
    const weights = this.calculateWeights(mu);
    const muEff = 1 / (2 * mu * mu);

    let bestSeed: UniversalSeed | null = null;
    let bestVector: number[] = [];
    let bestFitness = -Infinity;

    for (let gen = 0; gen < this.config.maxIterations; gen++) {
      const population = this.samplePopulation(lambda);
      const evaluated: { seed: UniversalSeed; fitness: number }[] = [];

      for (const vector of population) {
        const seed = vectorToSeed(vector);
        const fitness = fitnessFn(seed);
        evaluated.push({ seed, fitness });

        if (fitness > bestFitness) {
          bestFitness = fitness;
          bestSeed = seed;
          bestVector = vector;
        }
      }

      evaluated.sort((a, b) => b.fitness - a.fitness);
      this.history.push(bestFitness);

      if (this.config.targetFitness && bestFitness >= this.config.targetFitness) {
        break;
      }

      const selected = evaluated.slice(0, mu).map(e => e.seed);
      this.updateDistribution(selected, weights, muEff);

      if ((gen + 1) % 50 === 0) {
        console.log(`Generation ${gen + 1}: Best fitness = ${bestFitness.toFixed(4)}`);
      }
    }

    return {
      bestVector,
      bestFitness,
      iterations: this.history.length,
      history: this.history
    };
  }

  private calculateWeights(mu: number): number[] {
    const weights: number[] = [];
    const sum = mu * (mu + 1) / 2;
    for (let i = 0; i < mu; i++) {
      weights.push((mu - i) / sum);
    }
    return weights;
  }

  private samplePopulation(lambda: number): number[][] {
    this.eigenDecomp = this.eigenDecomposition(this.covMatrix);
    const population: number[][] = [];

    for (let i = 0; i < lambda; i++) {
      const sample = [...this.mean];
      for (let j = 0; j < this.config.dimension; j++) {
        const normal = this.sampleNormal();
        sample[j] += this.sigma * this.eigenDecomp!.eigenvectors[j].reduce(
          (sum, v, k) => sum + v * this.eigenDecomp!.eigenvalues[k]! ** 0.5 * (k === j ? normal : this.sampleNormal()),
          0
        );
      }
      population.push(sample);
    }

    return population;
  }

    private sampleNormal(): number {
      let u = 0, v = 0;
      while (u === 0) u = this.rng.nextF64();
      while (v === 0) v = this.rng.nextF64();
      return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
    }

    /**
     * Bind a Xoshiro256Star instance to this CMA-ES for full determinism.
     */
    bindRng(rng: ReturnType<typeof rngFromHash>): void {
      this.rng = rng;
    }

  private updateDistribution(selected: UniversalSeed[], weights: number[], muEff: number): void {
    const oldMean = [...this.mean];
    const newMean = new Array(this.config.dimension).fill(0);

      const tempSelected: UniversalSeed[] = [];
      while (tempSelected.length < this.config.dimension * 2 && tempSelected.length < selected.length) {
        tempSelected.push(selected[Math.floor(this.rng.nextF64() * selected.length)]);
      }

    for (let i = 0; i < this.config.dimension; i++) {
      let sum = 0;
      for (let j = 0; j < weights.length; j++) {
        const idx = j % tempSelected.length;
        sum += weights[j] * (((tempSelected[idx].getGeneValue(GeneType.META) as number[])?.[i]) ?? 0);
      }
      newMean[i] = sum;
    }

    this.mean = newMean;

    const cs = (muEff + 2) / (this.config.dimension + muEff + 5);
    const ds = 1 + cs + 2 * Math.sqrt(muEff);
    const damping = 1;

    for (let i = 0; i < this.config.dimension; i++) {
      this.ps[i] = (1 - cs) * this.ps[i] + cs * Math.sqrt(muEff) * (newMean[i] - oldMean[i]) / this.sigma;
    }

    const hs = this.ps.reduce((sum, p) => sum + p * p, 0) < 2 * this.config.dimension * Math.pow(this.config.dimension, 0.5) ? 1 : 0;

    for (let i = 0; i < this.config.dimension; i++) {
      this.pc[i] = (1 - cs) * this.pc[i] + hs * cs * Math.sqrt(muEff) * (newMean[i] - oldMean[i]) / this.sigma;
    }

    for (let i = 0; i < this.config.dimension; i++) {
      for (let j = 0; j <= i; j++) {
        this.covMatrix[i][j] = (1 - cs * (2 - cs)) * this.covMatrix[i][j] +
          cs * (2 - cs) * (this.pc[i] * this.pc[j] / (muEff * this.sigma * this.sigma));
      }
    }

    this.sigma *= Math.exp((cs / damping) * (this.ps.reduce((sum, p) => sum + p * p, 0) / this.config.dimension - 1));
  }

  private eigenDecomposition(matrix: number[][]): { eigenvalues: number[]; eigenvectors: number[][] } {
    const n = matrix.length;
    const eigenvalues = new Array(n).fill(0);
    const eigenvectors = this.createIdentity(n);

    for (let i = 0; i < n; i++) {
      eigenvalues[i] = matrix[i][i];
    }

    return { eigenvalues, eigenvectors };
  }

  getHistory(): number[] {
    return [...this.history];
  }

  getBestFitness(): number {
    return this.history.length > 0 ? Math.max(...this.history) : -Infinity;
  }
}