/**
 * PARADIGM PARALLEL GENETIC ALGORITHM
 * 
 * Web Worker-based parallel evolution for:
 * - Parallel fitness evaluation
 * - Distributed population management
 * - Multi-threaded crossover & mutation
 */

import { rngFromHash } from '../kernel/rng';

export interface WorkerMessage {
  type: 'init' | 'evaluate' | 'crossover' | 'mutate' | 'select' | 'result';
  data?: any;
  id?: string;
}

export interface WorkerResult {
  type: string;
  data: any;
  error?: string;
  id?: string;
}

export interface ParallelGAConfig {
  populationSize: number;
  generationLimit: number;
  mutationRate: number;
  crossoverRate: number;
  elitismCount: number;
  tournamentSize: number;
  numWorkers: number;
  evaluationBatchSize: number;
}

/**
 * Main thread orchestrator for parallel GA
 */
export class ParallelGeneticAlgorithm {
  private workers: Worker[] = [];
  private config: ParallelGAConfig;
  private pendingPromises: Map<string, (result: any) => void> = new Map();
  
  constructor(config: ParallelGAConfig) {
    this.config = config;
  }
  
  /**
   * Initialize worker pool
   */
  async initWorkers(workerScript: string): Promise<void> {
    const numWorkers = Math.min(this.config.numWorkers, navigator.hardwareConcurrency || 4);
    
    for (let i = 0; i < numWorkers; i++) {
      const worker = new Worker(workerScript);
      
      worker.onmessage = (event: MessageEvent<WorkerResult>) => {
        const { type, data, id, error } = event.data;
        
        if (id && this.pendingPromises.has(id)) {
          if (error) {
            this.pendingPromises.get(id)!(new Error(error));
          } else {
            this.pendingPromises.get(id)!(data);
          }
          this.pendingPromises.delete(id);
        }
      };
      
      worker.onerror = (error) => {
        console.error(`Worker ${i} error:`, error);
      };
      
      // Initialize worker
      worker.postMessage({ type: 'init', data: { config: this.config, workerId: i } });
      
      this.workers.push(worker);
    }
    
    console.log(`Initialized ${numWorkers} GA workers`);
  }
  
  /**
   * Evaluate fitness in parallel across workers
   */
  async evaluatePopulationParallel(population: any[], fitnessFn: (seed: any) => Promise<number>): Promise<number[]> {
    const batchSize = Math.ceil(population.length / this.workers.length);
    const promises: Promise<number[]>[] = [];
    
    // Distribute evaluation across workers
    for (let i = 0; i < this.workers.length; i++) {
      const start = i * batchSize;
      const end = Math.min(start + batchSize, population.length);
      const batch = population.slice(start, end);
      
      if (batch.length === 0) continue;
      
      const id = `eval_${Date.now()}_${i}`;
      
      const promise = new Promise<number[]>((resolve, reject) => {
        this.pendingPromises.set(id, resolve);
        
        this.workers[i].postMessage({
          type: 'evaluate',
          data: { population: batch, fitnessFn: fitnessFn.toString() },
          id,
        });
        
        // Timeout after 30 seconds
        setTimeout(() => {
          if (this.pendingPromises.has(id)) {
            this.pendingPromises.delete(id);
            reject(new Error('Evaluation timeout'));
          }
        }, 30000);
      });
      
      promises.push(promise);
    }
    
    const results = await Promise.all(promises);
    return results.flat();
  }
  
  /**
   * Parallel tournament selection
   */
  async selectParallel(population: any[], scores: number[]): Promise<any[]> {
    const id = `select_${Date.now()}`;
    
    // Use first available worker for selection
    return new Promise((resolve, reject) => {
      this.pendingPromises.set(id, resolve);
      
      this.workers[0].postMessage({
        type: 'select',
        data: { population, scores, tournamentSize: this.config.tournamentSize, count: population.length },
        id,
      });
      
      setTimeout(() => {
        if (this.pendingPromises.has(id)) {
          this.pendingPromises.delete(id);
          // Fallback to main thread selection
          resolve(this.tournamentSelect(population, scores, this.config.tournamentSize, population.length));
        }
      }, 5000);
    });
  }
  
  /**
   * Parallel crossover
   */
  async crossoverParallel(population: any[]): Promise<any[]> {
    const batchSize = Math.ceil(population.length / this.workers.length);
    const promises: Promise<any[]>[] = [];
    
    for (let i = 0; i < this.workers.length; i++) {
      const start = i * batchSize;
      const end = Math.min(start + batchSize, population.length);
      const batch = population.slice(start, end);
      
      if (batch.length === 0) continue;
      
      const id = `cross_${Date.now()}_${i}`;
      
      const promise = new Promise<any[]>((resolve, reject) => {
        this.pendingPromises.set(id, resolve);
        
        this.workers[i].postMessage({
          type: 'crossover',
          data: { population: batch, crossoverRate: this.config.crossoverRate },
          id,
        });
      });
      
      promises.push(promise);
    }
    
    const results = await Promise.all(promises);
    return results.flat();
  }
  
  /**
   * Parallel mutation
   */
  async mutateParallel(population: any[]): Promise<any[]> {
    const batchSize = Math.ceil(population.length / this.workers.length);
    const promises: Promise<any[]>[] = [];
    
    for (let i = 0; i < this.workers.length; i++) {
      const start = i * batchSize;
      const end = Math.min(start + batchSize, population.length);
      const batch = population.slice(start, end);
      
      if (batch.length === 0) continue;
      
      const id = `mutate_${Date.now()}_${i}`;
      
      const promise = new Promise<any[]>((resolve, reject) => {
        this.pendingPromises.set(id, resolve);
        
        this.workers[i].postMessage({
          type: 'mutate',
          data: { population: batch, mutationRate: this.config.mutationRate },
          id,
        });
      });
      
      promises.push(promise);
    }
    
    const results = await Promise.all(promises);
    return results.flat();
  }
  
  /**
   * Fallback main-thread selection
   */
  private tournamentSelect(population: any[], scores: number[], tournamentSize: number, count: number): any[] {
    const selected: any[] = [];
    const rng = rngFromHash(`parallel-ga:tournament:${population.length}:${scores.join(',')}:${tournamentSize}:${count}`);
    
    for (let i = 0; i < count; i++) {
      let best: any = null;
      let bestScore = -Infinity;
      
      for (let j = 0; j < tournamentSize; j++) {
        const idx = rng.nextInt(0, population.length - 1);
        if (scores[idx] > bestScore) {
          bestScore = scores[idx];
          best = population[idx];
        }
      }
      
      selected.push(best);
    }
    
    return selected;
  }
  
  /**
   * Terminate all workers
   */
  terminate() {
    for (const worker of this.workers) {
      worker.terminate();
    }
    this.workers = [];
  }
}

/**
 * Worker script content (to be saved as separate file)
 */
export const GA_WORKER_SCRIPT = `
let config = {};
let workerId = 0;

// Simple seeded RNG
class SeededRandom {
  constructor(seed) {
    this.seed = seed;
  }
  
  next() {
    this.seed = (this.seed * 1103515245 + 12345) & 0x7fffffff;
    return this.seed / 0x7fffffff;
  }
}

self.onmessage = async function(event) {
  const { type, data, id } = event.data;
  
  try {
    let result;
    
    switch (type) {
      case 'init':
        config = data.config;
        workerId = data.workerId;
        result = { success: true };
        break;
        
      case 'evaluate':
        // Evaluate batch of seeds
        const fitnessFn = new Function('return ' + data.fitnessFn)();
        const results = data.population.map(seed => {
          try {
            return typeof fitnessFn === 'function' ? fitnessFn(seed) : 0.5;
          } catch {
            return 0.5;
          }
        });
        result = results;
        break;
        
      case 'crossover':
        // Perform crossover on batch
        const offspring = [];
        const rng = new SeededRandom(workerId + data.population.length + Math.floor(data.crossoverRate * 1000000));
        
        for (let i = 0; i < data.population.length; i += 2) {
          if (i + 1 >= data.population.length) break;
          
          const parent1 = data.population[i];
          const parent2 = data.population[i + 1];
          
          if (rng.next() < data.crossoverRate) {
            // Single-point crossover
            const child = { ...parent1 };
            child.genes = { ...parent1.genes };
            
            // Blend genes (simplified)
            for (const key in parent1.genes) {
              if (parent2.genes[key]) {
                const alpha = rng.next();
                child.genes[key] = parent1.genes[key] * alpha + parent2.genes[key] * (1 - alpha);
              }
            }
            
            offspring.push(child);
          } else {
            offspring.push(parent1);
            offspring.push(parent2);
          }
        }
        result = offspring;
        break;
        
      case 'mutate':
        // Mutate batch
        const mutated = data.population.map(seed => {
          const newSeed = { ...seed };
          newSeed.genes = { ...seed.genes };
          
          const rng = new SeededRandom(workerId + data.population.length + Math.floor(data.mutationRate * 1000000));
          for (const key in newSeed.genes) {
            if (typeof newSeed.genes[key] === 'number' && rng.next() < data.mutationRate) {
              newSeed.genes[key] += (rng.next() - 0.5) * data.mutationRate;
              newSeed.genes[key] = Math.max(0, Math.min(1, newSeed.genes[key]));
            }
          }
          
          return newSeed;
        });
        result = mutated;
        break;
        
      case 'select':
        // Tournament selection
        const selected = [];
        const rng = new SeededRandom(workerId + data.population.length + data.count + data.tournamentSize);
        
        for (let i = 0; i < data.count; i++) {
          let best = null;
          let bestScore = -Infinity;
          
          for (let j = 0; j < data.tournamentSize; j++) {
            const idx = Math.floor(rng.next() * data.population.length);
            // Assume population has fitness property or use default
            const score = data.population[idx]?.fitness ?? 0.5;
            if (score > bestScore) {
              bestScore = score;
              best = data.population[idx];
            }
          }
          
          if (best) selected.push(best);
        }
        result = selected;
        break;
        
      default:
        result = { error: 'Unknown message type' };
    }
    
    self.postMessage({ type: 'result', data: result, id });
    
  } catch (error) {
    self.postMessage({ type: 'result', error: error.message, id });
  }
};
`;

export default ParallelGeneticAlgorithm;