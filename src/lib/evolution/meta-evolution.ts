/**
 * L9 Meta-Evolution System
 * 
 * Evolution of evolution: optimizes the parameters and strategies
 * of the evolutionary algorithms themselves.
 * 
 * Layers:
 * - Meta-genes encode algorithm parameters (mutation rate, population size, selection pressure)
 * - Meta-fitness measures how well a configuration discovers high-quality seeds
 * - Meta-mutation applies changes to algorithm configurations
 * - Cross-algorithm breeding combines successful strategies
 */

import { rngFromHash, Xoshiro256StarStar } from '../kernel/rng';
import { type Seed } from '../kernel/seed-class';
import { kernelNow, kernelNowIso } from '../kernel/clock';

export interface MetaGene {
  key: string;
  value: number;
  min: number;
  max: number;
  mutationStep: number;
}

export interface MetaConfig {
  id: string;
  genes: MetaGene[];
  fitness: number;
  generation: number;
  parentIds: string[];
  algorithmType: 'GA' | 'CMAES' | 'MAP_ELITES' | 'POET' | 'DQD' | 'AURORA' | 'NSLC';
  timestamp: number;
}

export interface MetaEvolutionConfig {
  populationSize: number;
  generationLimit: number;
  metaMutationRate: number;
  metaCrossoverRate: number;
  elitismCount: number;
  tournamentSize: number;
  seedHash: string;
}

export interface MetaResult {
  bestConfig: MetaConfig;
  history: MetaConfig[];
  fitnessProgression: number[];
  generationsRun: number;
  totalEvaluations: number;
}

const META_GENE_DEFINITIONS: Omit<MetaGene, 'value'>[] = [
  { key: 'mutation_rate', min: 0.001, max: 0.5, mutationStep: 0.02 },
  { key: 'crossover_rate', min: 0.1, max: 1.0, mutationStep: 0.05 },
  { key: 'population_size_log', min: 4, max: 10, mutationStep: 0.3 },
  { key: 'tournament_size', min: 2, max: 20, mutationStep: 1 },
  { key: 'elitism_ratio', min: 0.01, max: 0.5, mutationStep: 0.02 },
  { key: 'selection_pressure', min: 0.5, max: 3.0, mutationStep: 0.1 },
  { key: 'diversity_weight', min: 0, max: 1.0, mutationStep: 0.05 },
  { key: 'novelty_threshold', min: 0.01, max: 0.5, mutationStep: 0.02 },
  { key: 'archive_resolution', min: 5, max: 50, mutationStep: 2 },
  { key: 'exploration_rate', min: 0, max: 1.0, mutationStep: 0.05 },
  { key: 'convergence_threshold', min: 0.001, max: 0.1, mutationStep: 0.005 },
  { key: 'restart_probability', min: 0, max: 0.3, mutationStep: 0.02 },
];

export class MetaEvolutionEngine {
  private population: MetaConfig[] = [];
  private archive: Map<string, MetaConfig> = new Map();
  private fitnessHistory: number[] = [];
  private totalEvaluations = 0;

  constructor(private config: MetaEvolutionConfig) {}

  async run(evaluateFn: (config: MetaConfig) => Promise<number>): Promise<MetaResult> {
    this.initializePopulation();

    for (let gen = 0; gen < this.config.generationLimit; gen++) {
      const fitnesses: number[] = [];

      for (const individual of this.population) {
        const fitness = await evaluateFn(individual);
        individual.fitness = fitness;
        fitnesses.push(fitness);
        this.totalEvaluations++;
      }

      const bestFitness = Math.max(...fitnesses);
      this.fitnessHistory.push(bestFitness);

      if (gen % 10 === 0) {
        console.log(`[Meta-Evolution] Gen ${gen}: best=${bestFitness.toFixed(4)}, avg=${(fitnesses.reduce((a, b) => a + b, 0) / fitnesses.length).toFixed(4)}`);
      }

      this.population = this.nextGeneration(fitnesses);
    }

    const best = [...this.population].sort((a, b) => b.fitness - a.fitness)[0];
    return {
      bestConfig: best,
      history: this.population,
      fitnessProgression: this.fitnessHistory,
      generationsRun: this.config.generationLimit,
      totalEvaluations: this.totalEvaluations,
    };
  }

  private initializePopulation(): void {
    const rng = rngFromHash(`${this.config.seedHash}:meta-init`);
    this.population = [];

    for (let i = 0; i < this.config.populationSize; i++) {
      const genes: MetaGene[] = META_GENE_DEFINITIONS.map(def => ({
        ...def,
        value: def.min + rng.nextF64() * (def.max - def.min),
      }));

      this.population.push({
        id: `meta-${rng.nextU64()}`,
        genes,
        fitness: 0,
        generation: 0,
        parentIds: [],
        algorithmType: this.selectAlgorithmType(rng),
        timestamp: kernelNow(),
      });
    }
  }

  private nextGeneration(fitnesses: number[]): MetaConfig[] {
    const rng = rngFromHash(`meta-gen:${this.population.length}:${fitnesses.join(',')}`);
    const nextGen: MetaConfig[] = [];

    const sorted = this.population
      .map((ind, i) => ({ ind, fitness: fitnesses[i] }))
      .sort((a, b) => b.fitness - a.fitness);

    const eliteCount = Math.max(1, Math.floor(this.config.populationSize * 0.1));
    for (let i = 0; i < eliteCount; i++) {
      nextGen.push({ ...sorted[i].ind, generation: sorted[i].ind.generation + 1 });
      this.archive.set(sorted[i].ind.id, sorted[i].ind);
    }

    while (nextGen.length < this.config.populationSize) {
      const parentA = this.tournamentSelect(fitnesses, rng);
      const parentB = this.tournamentSelect(fitnesses, rng);

      let child: MetaConfig;
      if (rng.nextF64() < this.config.metaCrossoverRate) {
        child = this.crossover(parentA, parentB, rng);
      } else {
        child = { ...parentA, id: `meta-${rng.nextU64()}` };
      }

      child = this.mutate(child, rng);
      child.generation = (parentA.generation + parentB.generation) / 2 + 1;
      child.parentIds = [parentA.id, parentB.id];
      child.timestamp = kernelNow();

      nextGen.push(child);
    }

    return nextGen;
  }

  private tournamentSelect(fitnesses: number[], rng: Xoshiro256StarStar): MetaConfig {
    let bestIdx = -1;
    let bestFitness = -Infinity;

    for (let i = 0; i < this.config.tournamentSize; i++) {
      const idx = rng.nextInt(0, this.population.length - 1);
      if (fitnesses[idx] > bestFitness) {
        bestFitness = fitnesses[idx];
        bestIdx = idx;
      }
    }

    return this.population[bestIdx];
  }

  private crossover(a: MetaConfig, b: MetaConfig, rng: Xoshiro256StarStar): MetaConfig {
    const childGenes: MetaGene[] = [];

    for (let i = 0; i < a.genes.length; i++) {
      const geneA = a.genes[i];
      const geneB = b.genes[i];

      if (geneA.key === geneB.key) {
        const alpha = rng.nextF64();
        const blended = geneA.value * alpha + geneB.value * (1 - alpha);
        childGenes.push({
          ...geneA,
          value: Math.max(geneA.min, Math.min(geneA.max, blended)),
        });
      } else {
        childGenes.push(rng.nextF64() > 0.5 ? { ...geneA } : { ...geneB });
      }
    }

    return {
      id: `meta-${rng.nextU64()}`,
      genes: childGenes,
      fitness: 0,
      generation: 0,
      parentIds: [a.id, b.id],
      algorithmType: rng.nextF64() > 0.5 ? a.algorithmType : b.algorithmType,
      timestamp: kernelNow(),
    };
  }

  private mutate(individual: MetaConfig, rng: Xoshiro256StarStar): MetaConfig {
    const mutatedGenes = individual.genes.map(gene => {
      if (rng.nextF64() < this.config.metaMutationRate) {
        const step = gene.mutationStep * (rng.nextF64() * 2 - 1);
        let newValue = gene.value + step;

        if (rng.nextF64() < 0.1) {
          newValue = gene.min + rng.nextF64() * (gene.max - gene.min);
        }

        return {
          ...gene,
          value: Math.max(gene.min, Math.min(gene.max, newValue)),
        };
      }
      return { ...gene };
    });

    if (rng.nextF64() < 0.05) {
      individual = {
        ...individual,
        algorithmType: this.selectAlgorithmType(rng),
      };
    }

    return {
      ...individual,
      genes: mutatedGenes,
    };
  }

  private selectAlgorithmType(rng: Xoshiro256StarStar): MetaConfig['algorithmType'] {
    const types: MetaConfig['algorithmType'][] = ['GA', 'CMAES', 'MAP_ELITES', 'POET', 'DQD', 'AURORA', 'NSLC'];
    return types[rng.nextInt(0, types.length - 1)];
  }

  toAlgorithmParams(config: MetaConfig): Record<string, any> {
    const params: Record<string, any> = {};
    for (const gene of config.genes) {
      switch (gene.key) {
        case 'mutation_rate':
          params.mutationRate = gene.value;
          break;
        case 'crossover_rate':
          params.crossoverRate = gene.value;
          break;
        case 'population_size_log':
          params.populationSize = Math.round(Math.pow(2, gene.value));
          break;
        case 'tournament_size':
          params.tournamentSize = Math.round(gene.value);
          break;
        case 'elitism_ratio':
          params.elitism = gene.value;
          break;
        case 'selection_pressure':
          params.selectionPressure = gene.value;
          break;
        case 'diversity_weight':
          params.diversityWeight = gene.value;
          break;
        case 'novelty_threshold':
          params.noveltyThreshold = gene.value;
          break;
        case 'archive_resolution':
          params.archiveResolution = Math.round(gene.value);
          break;
        case 'exploration_rate':
          params.explorationRate = gene.value;
          break;
        case 'convergence_threshold':
          params.convergenceThreshold = gene.value;
          break;
        case 'restart_probability':
          params.restartProbability = gene.value;
          break;
      }
    }
    return params;
  }

  getArchive(): MetaConfig[] {
    return Array.from(this.archive.values());
  }

  getFitnessHistory(): number[] {
    return [...this.fitnessHistory];
  }
}

export function createMetaEvolutionEngine(config: MetaEvolutionConfig): MetaEvolutionEngine {
  return new MetaEvolutionEngine(config);
}
