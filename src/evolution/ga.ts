import { UniversalSeed } from '../seeds';
import { Xoshiro256StarStar, rngFromHash } from '../lib/kernel/rng';

export interface GeneticConfig {
  populationSize: number;
  generationLimit: number;
  mutationRate: number;
  crossoverRate: number;
  elitismCount: number;
  tournamentSize: number;
}

export interface GeneticResult {
  bestSeed: UniversalSeed;
  bestFitness: number;
  generation: number;
  history: FitnessHistory[];
  population: UniversalSeed[];
}

export interface FitnessHistory {
  generation: number;
  bestFitness: number;
  avgFitness: number;
  worstFitness: number;
}

export class GeneticAlgorithm {
  private config: GeneticConfig;
  private rng: ReturnType<typeof rngFromHash>;

  constructor(config: Partial<GeneticConfig> = {}, rng?: ReturnType<typeof rngFromHash>) {
    this.config = {
      populationSize: config.populationSize ?? 100,
      generationLimit: config.generationLimit ?? 100,
      mutationRate: config.mutationRate ?? 0.1,
      crossoverRate: config.crossoverRate ?? 0.7,
      elitismCount: config.elitismCount ?? 2,
      tournamentSize: config.tournamentSize ?? 5
    };
    this.rng = rng ?? rngFromHash('ga-default');
  }

  /**
   * Bind a Xoshiro256StarStar instance to this GA for full determinism.
   * Call this before evolve() to ensure reproducible runs.
   */
  bindRng(rng: ReturnType<typeof rngFromHash>): void {
    this.rng = rng;
  }

  async evolve(
    initialPopulation: UniversalSeed[],
    fitnessFn: (seed: UniversalSeed) => number
  ): Promise<GeneticResult> {
    let population = [...initialPopulation];
    const history: FitnessHistory[] = [];
    let bestSeed = population[0];
    let bestFitness = -Infinity;
    let generation = 0;

    for (let i = 0; i < this.config.generationLimit; i++) {
      population = await this.evaluateAndSelect(population, fitnessFn);

      const currentBest = this.getFittest(population);
      if (currentBest.metadata.fitness! > bestFitness) {
        bestSeed = currentBest;
        bestFitness = currentBest.metadata.fitness!;
      }

      history.push({
        generation: i + 1,
        bestFitness,
        avgFitness: this.getAverageFitness(population),
        worstFitness: this.getWorstFitness(population)
      });

      if (this.hasConverged(history)) break;

      population = await this.createNextGeneration(population);
      generation = i + 1;

      if ((i + 1) % 10 === 0) {
        console.log(`Generation ${i + 1}: Best fitness = ${bestFitness.toFixed(4)}`);
      }
    }

    return {
      bestSeed,
      bestFitness,
      generation,
      history,
      population
    };
  }

  private async evaluateAndSelect(
    population: UniversalSeed[],
    fitnessFn: (seed: UniversalSeed) => number
  ): Promise<UniversalSeed[]> {
    for (const seed of population) {
      seed.evaluate(fitnessFn);
    }

    return population.sort((a, b) => (b.metadata.fitness ?? 0) - (a.metadata.fitness ?? 0));
  }

  private async createNextGeneration(population: UniversalSeed[]): Promise<UniversalSeed[]> {
    const newPopulation: UniversalSeed[] = [];

    for (let i = 0; i < this.config.elitismCount; i++) {
      newPopulation.push(population[i].clone());
    }

    while (newPopulation.length < this.config.populationSize) {
      const parentA = this.tournamentSelect(population);
      let parentB = this.tournamentSelect(population);

      let child: UniversalSeed;
      if (this.rng.nextF64() < this.config.crossoverRate) {
        child = parentA.cross(parentB, { nextFloat: () => this.rng.nextF64() });
      } else {
        child = parentA.clone();
      }

      if (this.rng.nextF64() < this.config.mutationRate) {
        child = child.mutate(this.rng);
      }

      newPopulation.push(child);
    }

    return newPopulation;
  }

  private tournamentSelect(population: UniversalSeed[]): UniversalSeed {
    const tournament: UniversalSeed[] = [];
    for (let i = 0; i < this.config.tournamentSize; i++) {
      tournament.push(population[this.rng.nextInt(0, population.length - 1)]);
    }
    return tournament.sort((a, b) => (b.metadata.fitness ?? 0) - (a.metadata.fitness ?? 0))[0];
  }

  private getFittest(population: UniversalSeed[]): UniversalSeed {
    return population.reduce((best, seed) =>
      (seed.metadata.fitness ?? 0) > (best.metadata.fitness ?? 0) ? seed : best
    );
  }

  private getAverageFitness(population: UniversalSeed[]): number {
    const total = population.reduce((sum, seed) => sum + (seed.metadata.fitness ?? 0), 0);
    return total / population.length;
  }

  private getWorstFitness(population: UniversalSeed[]): number {
    return Math.min(...population.map(s => s.metadata.fitness ?? 0));
  }

  private hasConverged(history: FitnessHistory[]): boolean {
    if (history.length < 10) return false;
    const recent = history.slice(-10);
    const fitnessDiff = Math.abs(recent[0].bestFitness - recent[recent.length - 1].bestFitness);
    return fitnessDiff < 0.0001;
  }

  getConfig(): GeneticConfig {
    return { ...this.config };
  }

  setMutationRate(rate: number): void {
    this.config.mutationRate = rate;
  }

  setCrossoverRate(rate: number): void {
    this.config.crossoverRate = rate;
  }
}
