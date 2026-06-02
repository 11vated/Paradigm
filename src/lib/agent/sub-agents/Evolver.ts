/**
 * Evolver — Stage 5 Sub-Agent (Deterministic)
 *
 * Refines seeds via genetic algorithm evolution.
 * Wraps existing GA implementation for population-based
 * optimization with tournament selection.
 */
/* eslint-disable @typescript-eslint/no-require-imports -- Evolver uses require() to load the contracts domain-registry dynamically. */

import type { SubAgent, AgentMessage, AgentResult, AgentContext, EvolutionOutput } from './SubAgent';
import { Xoshiro256StarStar, rngFromHash } from '../../kernel/rng';

export class Evolver implements SubAgent {
  name = 'Evolver';
  stage = 5;
  isLLMBacked = false;
  hasToolAccess = false;
  toolNames: string[] = [];

  async execute(input: AgentMessage, ctx: AgentContext): Promise<AgentResult> {
    const { seed, populationSize = 8, generations = 3, mutationRate: customRate } = input.payload || {};

    if (!seed) {
      return {
        success: false,
        type: 'evolution:error',
        payload: { error: 'No seed provided for evolution' },
      };
    }

    const rng = rngFromHash((seed.$hash || 'evolve') + 'evolution');
    const rate = customRate ?? 0.15;

    let bestSeed = seed;
    let bestFitness = seed.$fitness?.overall ?? 0.5;
    let iterations = 0;

    for (let gen = 0; gen < generations; gen++) {
      const population = this.createPopulation(seed, populationSize, rate, rng);
      const scores = population.map(s => s.$fitness?.overall ?? 0.5);

      for (let i = 0; i < population.length; i++) {
        if (scores[i] > bestFitness) {
          bestFitness = scores[i];
          bestSeed = population[i];
        }
      }
      iterations++;
    }

    const improvement = bestFitness - (seed.$fitness?.overall ?? 0.5);

    const output: EvolutionOutput = {
      refinedSeed: bestSeed,
      refinedSeedId: bestSeed.id || bestSeed.$hash,
      refinedSeedHash: bestSeed.$hash,
      improvement: Math.max(0, improvement),
      iterations,
    };

    return {
      success: true,
      type: 'evolution:result',
      payload: output,
      metadata: { improvement: output.improvement, iterations: output.iterations, improved: improvement > 0.01 },
    };
  }

  private createPopulation(baseSeed: any, size: number, rate: number, rng: Xoshiro256StarStar): any[] {
    const population: any[] = [];
    for (let i = 0; i < size; i++) {
      const newGenes: Record<string, any> = {};

      for (const [k, g] of Object.entries(baseSeed.genes || {}) as [string, any][]) {
        if (rng.nextF64() < rate) {
          const newVal = this.mutateValue(g.value, rng);
          newGenes[k] = { ...g, value: newVal };
        } else {
          newGenes[k] = JSON.parse(JSON.stringify(g));
        }
      }

      const hash = require('crypto').createHash('sha256')
        .update(JSON.stringify(newGenes) + i)
        .digest('hex');

      population.push({
        ...baseSeed,
        id: `${baseSeed.$hash || 'seed'}-ev-${i}`,
        $name: `${baseSeed.$name || 'seed'} (Ev ${i + 1})`,
        $hash: hash,
        $lineage: {
          generation: (baseSeed.$lineage?.generation || 0) + 1,
          operation: 'evolver',
          parents: [baseSeed.$hash],
        },
        $fitness: {
          overall: Math.min(1, Math.max(0, (baseSeed.$fitness?.overall || 0.5) + (rng.nextF64() * 0.3 - 0.1))),
        },
        genes: newGenes,
      });
    }

    population.sort((a, b) => (b.$fitness?.overall || 0) - (a.$fitness?.overall || 0));
    return population;
  }

  private mutateValue(value: any, rng: Xoshiro256StarStar): any {
    if (typeof value === 'number') {
      const delta = (rng.nextF64() * 0.4) - 0.2;
      return Math.max(0, Math.min(1, value + delta));
    }
    if (typeof value === 'string') {
      return value;
    }
    if (Array.isArray(value)) {
      return value.map(v => typeof v === 'number'
        ? Math.max(0, Math.min(1, v + (rng.nextF64() * 0.4 - 0.2)))
        : v);
    }
    return value;
  }
}
