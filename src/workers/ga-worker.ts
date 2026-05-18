/**
 * GA Web Worker — Parallel genetic algorithm operations
 * Handles: evaluate, crossover, mutate, select
 * Uses deterministic xoshiro256** RNG for reproducibility
 */

import { Xoshiro256StarStar, rngFromHash } from '../lib/kernel/rng';

interface WorkerMessage {
  type: 'init' | 'evaluate' | 'crossover' | 'mutate' | 'select';
  data: any;
  id: string;
}

interface WorkerResult {
  type: 'result';
  data: any;
  id: string;
  error?: string;
}

let config: any = {};
let workerId = 0;

function postResult(data: any, id: string, error?: string) {
  const msg: WorkerResult = { type: 'result', data, id };
  if (error) msg.error = error;
  self.postMessage(msg);
}

function evaluatePopulation(population: any[]): number[] {
  return population.map(seed => {
    const genes = seed.genes || {};
    let fitness = 0;
    let count = 0;
    for (const key in genes) {
      const val = genes[key];
      if (typeof val === 'number') {
        fitness += val;
        count++;
      } else if (val && typeof val.value === 'number') {
        fitness += val.value;
        count++;
      }
    }
    const avg = count > 0 ? fitness / count : 0.5;
    const novelty = seed.$fitness?.novelty || 0;
    return avg + novelty;
  });
}

function tournamentSelect(population: any[], scores: number[], tournamentSize: number, count: number, rng: Xoshiro256StarStar): any[] {
  const selected: any[] = [];
  for (let i = 0; i < count; i++) {
    let bestIdx = -1;
    let bestScore = -Infinity;
    for (let j = 0; j < tournamentSize; j++) {
      const idx = rng.nextInt(0, population.length - 1);
      if (scores[idx] > bestScore) {
        bestScore = scores[idx];
        bestIdx = idx;
      }
    }
    if (bestIdx >= 0) selected.push(population[bestIdx]);
  }
  return selected;
}

function crossoverPopulation(population: any[], crossoverRate: number, rng: Xoshiro256StarStar): any[] {
  const offspring: any[] = [];
  for (let i = 0; i < population.length; i += 2) {
    if (i + 1 >= population.length) {
      offspring.push(population[i]);
      break;
    }
    const p1 = population[i];
    const p2 = population[i + 1];
    if (rng.nextF64() < crossoverRate) {
      const child: any = { ...p1, genes: { ...p1.genes } };
      for (const key in p1.genes) {
        if (p2.genes && p2.genes[key] !== undefined) {
          const alpha = rng.nextF64();
          const v1 = typeof p1.genes[key] === 'number' ? p1.genes[key] : p1.genes[key].value;
          const v2 = typeof p2.genes[key] === 'number' ? p2.genes[key] : p2.genes[key].value;
          if (typeof v1 === 'number' && typeof v2 === 'number') {
            child.genes[key] = v1 * alpha + v2 * (1 - alpha);
          }
        }
      }
      child.$hash = `cross_${rng.nextU64()}`;
      offspring.push(child);
    } else {
      offspring.push(p1, p2);
    }
  }
  return offspring;
}

function mutatePopulation(population: any[], mutationRate: number, rng: Xoshiro256StarStar): any[] {
  return population.map(seed => {
    const mutated: any = { ...seed, genes: { ...seed.genes } };
    for (const key in mutated.genes) {
      if (rng.nextF64() < mutationRate) {
        const val = mutated.genes[key];
        if (typeof val === 'number') {
          mutated.genes[key] = Math.max(0, Math.min(1, val + (rng.nextF64() - 0.5) * mutationRate));
        } else if (val && typeof val.value === 'number') {
          mutated.genes[key] = { ...val, value: Math.max(0, Math.min(1, val.value + (rng.nextF64() - 0.5) * mutationRate)) };
        }
      }
    }
    return mutated;
  });
}

self.onmessage = (e: MessageEvent<WorkerMessage>) => {
  const { type, data, id } = e.data;
  try {
    let result: any;
    switch (type) {
      case 'init':
        config = data.config;
        workerId = data.workerId;
        result = { success: true };
        break;
      case 'evaluate':
        result = evaluatePopulation(data.population);
        break;
      case 'select': {
        const rng = new Xoshiro256StarStar(`ga-worker:${workerId}:select:${id}`);
        result = tournamentSelect(data.population, data.scores, data.tournamentSize, data.count, rng);
        break;
      }
      case 'crossover': {
        const rng = new Xoshiro256StarStar(`ga-worker:${workerId}:crossover:${id}`);
        result = crossoverPopulation(data.population, data.crossoverRate, rng);
        break;
      }
      case 'mutate': {
        const rng = new Xoshiro256StarStar(`ga-worker:${workerId}:mutate:${id}`);
        result = mutatePopulation(data.population, data.mutationRate, rng);
        break;
      }
      default:
        postResult(null, id, `Unknown message type: ${type}`);
        return;
    }
    postResult(result, id);
  } catch (err: any) {
    postResult(null, id, err.message);
  }
};

export {};
