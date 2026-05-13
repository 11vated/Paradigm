/**
 * Evolution Web Worker — Background evolution computation
 * Features: Offloads evolution to worker thread, 60fps UI performance
 */

interface Seed {
  $hash: string;
  $name?: string;
  $domain: string;
  genes?: Record<string, { value: number }>;
  fitness?: number;
  novelty?: number;
}

interface EvolutionMessage {
  type: 'start' | 'stop' | 'step';
  config?: {
    populationSize: number;
    generations: number;
    mutationRate: number;
    elitism: number;
    algorithm: 'GA' | 'MAP_ELITES';
  };
  population?: Seed[];
}

interface EvolutionResult {
  type: 'generation_complete';
  population: Seed[];
  stats: {
    generation: number;
    avgFitness: number;
    maxFitness: number;
    minFitness: number;
  };
}

import { Xoshiro256StarStar } from '../lib/kernel/rng';

let isRunning = false;
let population: Seed[] = [];
let config: any = {};
let generation = 0;

// Fitness evaluation
function evaluateFitness(seed: Seed): number {
  const genes = seed.genes || {};
  let fitness = 0;
  for (const key in genes) {
    const value = genes[key].value;
    if (typeof value === 'number') {
      fitness += value;
    }
  }
  const localRng = new Xoshiro256StarStar(seed.$hash || 'default');
  const novelty = seed.novelty || localRng.nextF64() * 0.1;
  return fitness + novelty;
}

// Tournament selection
function tournamentSelect(pop: Seed[], tournamentSize: number, rng: Xoshiro256StarStar): Seed {
  let best: Seed | null = null;
  let bestFitness = -Infinity;
  for (let i = 0; i < tournamentSize; i++) {
    const idx = rng.nextInt(0, pop.length - 1);
    const candidate = pop[idx];
    const fitness = candidate.fitness || evaluateFitness(candidate);
    if (fitness > bestFitness) {
      bestFitness = fitness;
      best = candidate;
    }
  }
  return best!;
}

// Crossover two seeds
function crossover(parent1: Seed, parent2: Seed, rng: Xoshiro256StarStar): Seed {
  const child: Seed = {
    $hash: `child_${rng.nextU64()}_${rng.nextU64()}`,
    $domain: parent1.$domain,
    genes: {}
  };
  for (const key in parent1.genes) {
    if (parent2.genes && parent2.genes[key]) {
      const t = rng.nextF64();
      const v1 = parent1.genes[key].value;
      const v2 = parent2.genes[key].value;
      if (typeof v1 === 'number' && typeof v2 === 'number') {
        child.genes[key] = { value: v1 * (1 - t) + v2 * t };
      } else {
        child.genes[key] = rng.nextF64() > 0.5 ? parent1.genes[key] : parent2.genes[key];
      }
    } else {
      child.genes[key] = parent1.genes[key];
    }
  }
  return child;
}

// Mutate a seed
function mutate(seed: Seed, rate: number, rng: Xoshiro256StarStar): Seed {
  const mutated: Seed = { ...seed, genes: { ...seed.genes } };
  for (const key in mutated.genes) {
    if (rng.nextF64() < rate) {
      const gene = mutated.genes[key];
      if (typeof gene.value === 'number') {
        const mutation = (rng.nextF64() - 0.5) * 0.2;
        mutated.genes[key] = { value: gene.value + mutation };
      }
    }
  }
  return mutated;
}

// Run one generation of evolution
function evolveGeneration(pop: Seed[], cfg: any): Seed[] {
  const rng = new Xoshiro256StarStar(`evolution_${generation}`);
  const newPop: Seed[] = [];
  
  // Elitism: keep best individuals
  const sorted = [...pop].sort((a, b) => (b.fitness || 0) - (a.fitness || 0));
  const eliteCount = Math.floor(pop.length * cfg.elitism);
  
  for (let i = 0; i < eliteCount; i++) {
    newPop.push({ ...sorted[i] });
  }
  
  // Generate rest of population through selection, crossover, mutation
  while (newPop.length < pop.length) {
    const parent1 = tournamentSelect(pop, 3, rng);
    const parent2 = tournamentSelect(pop, 3, rng);
    
    let child = crossover(parent1, parent2, rng);
    child = mutate(child, cfg.mutationRate, rng);
    
    // Evaluate fitness
    child.fitness = evaluateFitness(child);
    
    newPop.push(child);
  }
  
  return newPop;
}

// Main evolution loop
async function runEvolution() {
  while (isRunning) {
    // Run one generation
    population = evolveGeneration(population, config);
    generation++;
    
    // Calculate stats
    const fitnesses = population.map(s => s.fitness || 0);
    const stats = {
      generation,
      avgFitness: fitnesses.reduce((a, b) => a + b, 0) / fitnesses.length,
      maxFitness: Math.max(...fitnesses),
      minFitness: Math.min(...fitnesses)
    };
    
    // Send result to main thread
    const result: EvolutionResult = {
      type: 'generation_complete',
      population,
      stats
    };
    
    self.postMessage(result);
    
    // Small delay to prevent blocking
    await new Promise(resolve => setTimeout(resolve, 16)); // ~60fps
  }
}

// Message handler
self.onmessage = (e: MessageEvent<EvolutionMessage>) => {
  const { type, config: newConfig, population: newPop } = e.data;
  
  switch (type) {
    case 'start':
      if (newConfig) config = newConfig;
      if (newPop) population = newPop;
      
      // Initialize fitness if not set
      population = population.map(s => ({
        ...s,
        fitness: s.fitness || evaluateFitness(s)
      }));
      
      isRunning = true;
      runEvolution();
      break;
      
    case 'stop':
      isRunning = false;
      break;
      
    case 'step':
      if (newConfig) config = newConfig;
      if (newPop) population = newPop;
      
      population = evolveGeneration(population, config);
      generation++;
      
      const fitnesses = population.map(s => s.fitness || 0);
      const result: EvolutionResult = {
        type: 'generation_complete',
        population,
        stats: {
          generation,
          avgFitness: fitnesses.reduce((a, b) => a + b, 0) / fitnesses.length,
          maxFitness: Math.max(...fitnesses),
          minFitness: Math.min(...fitnesses)
        }
      };
      
      self.postMessage(result);
      break;
  }
};

export {};
