/**
 * Genetic Algorithm (GA)
 * 
 * Core evolutionary algorithm for optimizing seed populations.
 * Implements tournament selection, crossover, mutation, and elitism.
 * 
 * Fully deterministic via seeded RNG (xoshiro256**)
 */

import { Seed } from '../kernel/seed-class';
import { Xoshiro256StarStar } from '../kernel/rng';

// ─────────────────────────────────────────────────────────────────────────────

export interface GAConfig {
  populationSize: number;
  generationLimit: number;
  mutationRate: number;
  crossoverRate: number;
  tournamentSize: number;
  elitismCount: number;
}

export interface GAResult {
  best: Seed;
  fitness: number;
  generation: number;
  population: Seed[];
  history: GenerationRecord[];
}

export interface GenerationRecord {
  generation: number;
  bestFitness: number;
  avgFitness: number;
  diversity: number;
  topSeeds: Seed[];
}

// ─────────────────────────────────────────────────────────────────────────────

export class GeneticAlgorithm {
  private rng: Xoshiro256StarStar;

  constructor(rng: Xoshiro256StarStar) {
    this.rng = rng;
  }

  /**
   * Run genetic algorithm on population
   */
  async evolve(
    initialPopulation: Seed[],
    fitnessFn: (seed: Seed) => Promise<number> | number,
    config: GAConfig
  ): Promise<GAResult> {
    if (initialPopulation.length === 0) {
      throw new Error('GA: Initial population cannot be empty');
    }

    let population = [...initialPopulation];
    const history: GenerationRecord[] = [];
    let bestSeed = population[0];
    let bestFitness = 0;

    // Evaluate initial population
    const scores = await this.evaluatePopulation(population, fitnessFn);
    for (let i = 0; i < population.length; i++) {
      if (scores[i] > bestFitness) {
        bestFitness = scores[i];
        bestSeed = population[i];
      }
    }

    // Main evolutionary loop
    for (let gen = 0; gen < config.generationLimit; gen++) {
      // Tournament selection
      const selected = this.tournamentSelect(
        population,
        scores,
        config.tournamentSize,
        Math.ceil(population.length * 0.5)
      );

      // Create offspring via crossover + mutation
      const offspring: Seed[] = [];
      for (let i = 0; i < config.populationSize - config.elitismCount; i++) {
        const parent1 = selected[this.rng.nextInt(0, selected.length - 1)];
        const parent2 = selected[this.rng.nextInt(0, selected.length - 1)];

        let child = parent1.cross(parent2, this.rng);

        // Mutation
        if (this.rng.nextF64() < config.mutationRate) {
          child = child.mutate(this.rng, config.mutationRate);
        }

        offspring.push(child);
      }

      // Elitism: keep best individuals
      const elite = this.selectElite(population, scores, config.elitismCount);

      // Form new population
      population = [...elite, ...offspring].slice(0, config.populationSize);

      // Evaluate new population
      const newScores = await this.evaluatePopulation(population, fitnessFn);

      // Track best
      for (let i = 0; i < population.length; i++) {
        if (newScores[i] > bestFitness) {
          bestFitness = newScores[i];
          bestSeed = population[i];
        }
      }

      // Record generation
      const avgFitness = newScores.reduce((a, b) => a + b, 0) / newScores.length;
      const diversity = this.calculateDiversity(population);
      const topSeeds = this.getTopSeeds(population, newScores, 5);

      history.push({
        generation: gen,
        bestFitness,
        avgFitness,
        diversity,
        topSeeds,
      });

      // Update scores for next iteration
      scores.length = 0;
      scores.push(...newScores);
    }

    return {
      best: bestSeed,
      fitness: bestFitness,
      generation: config.generationLimit,
      population,
      history,
    };
  }

  /**
   * Evaluate fitness of all seeds in population
   */
  private async evaluatePopulation(
    population: Seed[],
    fitnessFn: (seed: Seed) => Promise<number> | number
  ): Promise<number[]> {
    const scores: number[] = [];

    for (const seed of population) {
      try {
        const score = await fitnessFn(seed);
        scores.push(Math.max(0, Math.min(1, score)));  // Clamp to [0, 1]
      } catch (error) {
        scores.push(0);
      }
    }

    return scores;
  }

  /**
   * Tournament selection
   */
  private tournamentSelect(
    population: Seed[],
    scores: number[],
    tournamentSize: number,
    count: number
  ): Seed[] {
    const selected: Seed[] = [];

    for (let i = 0; i < count; i++) {
      // Pick random tournament
      const tournament: { seed: Seed; score: number }[] = [];

      for (let j = 0; j < tournamentSize && j < population.length; j++) {
        const idx = this.rng.nextInt(0, population.length - 1);
        tournament.push({ seed: population[idx], score: scores[idx] });
      }

      // Select best from tournament
      const winner = tournament.reduce((best, current) =>
        current.score > best.score ? current : best
      );

      selected.push(winner.seed);
    }

    return selected;
  }

  /**
   * Select elite seeds
   */
  private selectElite(population: Seed[], scores: number[], count: number): Seed[] {
    const indexed = population.map((seed, idx) => ({ seed, score: scores[idx] }));
    indexed.sort((a, b) => b.score - a.score);
    return indexed.slice(0, count).map(x => x.seed);
  }

  /**
   * Get top N seeds by fitness
   */
  private getTopSeeds(population: Seed[], scores: number[], n: number): Seed[] {
    const indexed = population.map((seed, idx) => ({ seed, score: scores[idx] }));
    indexed.sort((a, b) => b.score - a.score);
    return indexed.slice(0, n).map(x => x.seed);
  }

  /**
   * Calculate population diversity (average pairwise genetic distance)
   */
  private calculateDiversity(population: Seed[]): number {
    if (population.length < 2) return 0;

    let totalDistance = 0;
    let count = 0;

    // Sample pairs for performance (don't do all pairs for large populations)
    const sampleSize = Math.min(population.length, 20);

    for (let i = 0; i < sampleSize; i++) {
      for (let j = i + 1; j < sampleSize; j++) {
        totalDistance += population[i].distance(population[j]);
        count++;
      }
    }

    return count > 0 ? totalDistance / count : 0;
  }
}

// ─────────────────────────────────────────────────────────────────────────────

export default GeneticAlgorithm;
