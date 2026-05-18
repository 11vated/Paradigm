import { Xoshiro256StarStar } from '../kernel/rng';
import type { Seed } from '../kernel/types';
import {
  computeGeneGradient, gradientGuidedMutate,
  type GeneGradient, type QualityDelta,
} from '../kernel/gene-gradients';
import { GeneticAlgorithm, type GAConfig, type GAResult } from './ga';

export interface GradientEvolutionConfig extends GAConfig {
  gradientStepSize: number;
  gradientThreshold: number;
}

export interface GradientRecord {
  generation: number;
  geneGradients: Record<string, GeneGradient>;
  topGradient: { gene: string; magnitude: number; direction: string };
}

/**
 * Wraps the standard GA with gradient-guided mutation.
 * After each generation, computes approximate gradients from fitness deltas
 * and uses them to guide the next generation's mutation direction.
 */
export class GradientEvolution {
  private rng: Xoshiro256StarStar;
  private ga: GeneticAlgorithm;
  private lastScores: Map<string, number> = new Map();
  private lastValues: Map<string, Record<string, any>> = new Map();
  public gradientHistory: GradientRecord[] = [];

  constructor(rng: Xoshiro256StarStar) {
    this.rng = rng;
    this.ga = new GeneticAlgorithm(rng);
  }

  /**
   * Run gradient-guided evolution.
   */
  async evolve(
    initialPopulation: Seed[],
    fitnessFn: (seed: Seed) => Promise<number> | number,
    config: GradientEvolutionConfig,
  ): Promise<GAResult> {
    let population = [...initialPopulation];
    let prevScores: number[] = [];

    // Evaluate initial population
    prevScores = await this.evaluateScores(population, fitnessFn);
    this.cacheScores(population, prevScores);
    this.cacheGenes(population);

    let bestSeed = population[0];
    let bestFitness = Math.max(...prevScores);

    const history: GAResult['history'] = [];

    for (let gen = 0; gen < config.generationLimit; gen++) {
      // Compute gene gradients from last generation delta
      const gradients = this.computePopulationGradients(population, prevScores);

      // Record gradient info
      this.recordGradients(gen, gradients);

      // Run one GA generation
      const generationResult = await this.ga.evolve(population, fitnessFn, {
        ...config,
        generationLimit: 1,
      });

      population = generationResult.population;
      const newScores = await this.evaluateScores(population, fitnessFn);

      // Apply gradient-guided mutation to a subset of the population
      if (gen > 0 && Object.keys(gradients).length > 0) {
        population = this.applyGradientMutation(
          population, newScores, gradients, config.gradientStepSize, config.gradientThreshold,
        );
      }

      // Re-evaluate after gradient mutation
      const finalScores = await this.evaluateScores(population, fitnessFn);

      // Track best
      for (let i = 0; i < population.length; i++) {
        if (finalScores[i] > bestFitness) {
          bestFitness = finalScores[i];
          bestSeed = population[i];
        }
      }

      const avgFitness = finalScores.reduce((a, b) => a + b, 0) / finalScores.length;
      history.push({ generation: gen, bestFitness, avgFitness, diversity: 0, topSeeds: [bestSeed] });

      prevScores = finalScores;
      this.cacheScores(population, finalScores);
      this.cacheGenes(population);
    }

    return { best: bestSeed, fitness: bestFitness, generation: config.generationLimit, population, history };
  }

  /**
   * Compute per-gene gradients across the population.
   */
  private computePopulationGradients(
    population: Seed[],
    scores: number[],
  ): Record<string, GeneGradient> {
    const geneGradients: Record<string, GeneGradient> = {};
    const geneDeltas: Record<string, { qBefore: number; qAfter: number; valueBefore: any }[]> = {};

    for (let i = 0; i < population.length; i++) {
      const seed = population[i];
      const currentScore = scores[i];
      const prevScore = this.lastScores.get(seed.id ?? '') ?? currentScore;

      if (seed.genes) {
        for (const [name, gene] of Object.entries(seed.genes)) {
          if (!geneDeltas[name]) geneDeltas[name] = [];
          const rawValue = gene.value ?? gene;
          const prevGeneState = this.lastValues.get(seed.id ?? '');
          const prevValue = prevGeneState?.[name]?.value ?? prevGeneState?.[name] ?? rawValue;

          geneDeltas[name].push({
            qBefore: prevScore,
            qAfter: currentScore,
            valueBefore: prevValue,
          });
        }
      }
    }

    // Average gradients per gene
    for (const [geneName, deltas] of Object.entries(geneDeltas)) {
      if (deltas.length < 2) continue;

      const avgDelta = deltas.reduce((s, d) => s + (d.qAfter - d.qBefore), 0) / deltas.length;
      const grad = computeGeneGradient({
        geneName,
        geneValue: deltas[0].valueBefore,
        geneType: 'scalar',
        qualityBefore: scalarToQuality(0.5),
        qualityAfter: scalarToQuality(0.5 + avgDelta),
      });
      geneGradients[geneName] = grad;
    }

    return geneGradients;
  }

  /**
   * Apply gradient-guided mutation to low-performing seeds.
   */
  private applyGradientMutation(
    population: Seed[],
    scores: number[],
    gradients: Record<string, GeneGradient>,
    stepSize: number,
    threshold: number,
  ): Seed[] {
    const result = [...population];
    const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;

    for (let i = 0; i < result.length; i++) {
      if (scores[i] >= avgScore) continue;
      if (!result[i].genes) continue;

      const mutatedGenes = gradientGuidedMutate(
        result[i].genes as Record<string, any>,
        gradients,
        threshold,
        this.rng,
      );

      (result[i] as any).genes = mutatedGenes;
    }

    return result;
  }

  private async evaluateScores(
    population: Seed[],
    fitnessFn: (seed: Seed) => Promise<number> | number,
  ): Promise<number[]> {
    const scores: number[] = [];
    for (const seed of population) {
      try {
        const s = await fitnessFn(seed);
        scores.push(Math.max(0, Math.min(1, s)));
      } catch {
        scores.push(0);
      }
    }
    return scores;
  }

  private cacheScores(population: Seed[], scores: number[]): void {
    for (let i = 0; i < population.length; i++) {
      this.lastScores.set(population[i].id ?? `s${i}`, scores[i]);
    }
  }

  private cacheGenes(population: Seed[]): void {
    for (const seed of population) {
      this.lastValues.set(seed.id ?? '', { ...(seed.genes ?? {}) });
    }
  }

  private recordGradients(gen: number, gradients: Record<string, GeneGradient>): void {
    let topMag = 0;
    let topGene = '';
    let topDir = '';
    for (const [name, g] of Object.entries(gradients)) {
      const mag = typeof g.dOutput_dGene === 'number' ? Math.abs(g.dOutput_dGene) : 0;
      if (mag > topMag) { topMag = mag; topGene = name; topDir = g.suggestedDirection; }
    }
    this.gradientHistory.push({ generation: gen, geneGradients: gradients, topGradient: { gene: topGene, magnitude: topMag, direction: topDir } });
  }
}

function scalarToQuality(v: number): QualityDelta {
  return { geometry: v, texture: v, animation: v, coherence: v, style: v, novelty: v };
}

export { GAResult };
