/**
 * PARADIGM PARALLEL GENETIC ALGORITHM
 * 
 * Web Worker-based parallel evolution for:
 * - Parallel fitness evaluation
 * - Distributed population management
 * - Multi-threaded crossover & mutation
 */

import { rngFromHash } from '../kernel/rng';
import { kernelNow, kernelNowIso } from '../kernel/clock';

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
   * Initialize worker pool using dedicated GA worker
   */
  async initWorkers(): Promise<void> {
    const numWorkers = Math.min(this.config.numWorkers, typeof navigator !== 'undefined' ? navigator.hardwareConcurrency || 4 : 4);
    
    for (let i = 0; i < numWorkers; i++) {
      const worker = new Worker(new URL('../../workers/ga-worker.ts', import.meta.url), { type: 'module' });
      
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
      
      const id = `eval_${kernelNow()}_${i}`;
      
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
    const id = `select_${kernelNow()}`;
    
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
      
      const id = `cross_${kernelNow()}_${i}`;
      
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
      
      const id = `mutate_${kernelNow()}_${i}`;
      
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

export default ParallelGeneticAlgorithm;