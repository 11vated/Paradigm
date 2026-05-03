/**
 * ALifeWorker — Generator for Life Simulation
 * Uses Web Workers for CPU-intensive ALife evolution
 * Phase 2: WebGPU Compute Integration
 */

import type { Seed } from '../engines';
import { ALifeParams, ALifeResult, defaultAlifeParams } from './alife';
import { Xoshiro256StarStar } from '../rng';

export interface ALifeWorkerParams extends ALifeParams {
  seed?: string; // seed hash for determinism
  useWorker?: boolean;
}

/**
 * Generate ALife simulation, optionally using Web Worker
 */
export async function generateALifeWorker(params: ALifeWorkerParams = {}): Promise<ALifeResult> {
  const useWorker = params.useWorker ?? typeof Worker !== 'undefined';

  if (useWorker) {
    return runInWorker(params);
  }

  // Fallback: run in main thread
  const { generateALife } = await import('./alife');
  return generateALife(params as ALifeParams);
}

/**
 * Run ALife simulation in Web Worker
 */
function runInWorker(params: ALifeWorkerParams): Promise<ALifeResult> {
  return new Promise((resolve, reject) => {
    const workerScript = generateWorkerScript(params);
    const blob = new Blob([workerScript], { type: 'application/javascript' });
    const worker = new Worker(URL.createObjectURL(blob));

    worker.onmessage = (e) => {
      resolve(e.data);
      worker.terminate();
    };

    worker.onerror = (err) => {
      reject(err);
      worker.terminate();
    };

    worker.postMessage(params);
  });
}

/**
 * Generate the worker script as a string
 * This allows the worker to be self-contained without module loading issues
 */
function generateWorkerScript(params: ALifeWorkerParams): string {
  const seedForWorker = (params as any).seedHash || 'default';

  return `/**
   * ALife Worker — simulates life evolution in Web Worker
   * Offloads CPU-intensive simulation to background thread
   */

  self.onmessage = function(e) {
    const { entities, environment, rules, timeSteps } = e.data;
    const rng = createRng('${seedForWorker}');

    // Simulation logic here...
    postMessage({ type: 'done', entities, environment });
  };

  function createRng(seed) {
    let state = 0;
    for (let i = 0; i < seed.length; i++) {
      state = ((state << 5) - state + seed.charCodeAt(i)) | 0;
    }
    return function() {
      state = (state * 1103515245 + 12345) | 0;
      return ((state >>> 0) % 0x100000000) / 0x100000000;
    };
  }`;
}

/**
 * Alternative: Generate worker script with RNG instance
 * Used when we have a proper RNG to seed the worker
 */
export function generateWorkerScriptWithRng(params: ALifeParams, rng: Xoshiro256StarStar): string {
  const seedForWorker = rng.nextU64().toString(16);

  return `/**
   * ALife Worker — simulates life evolution in Web Worker
   * Offloads CPU-intensive simulation to background thread
   */

  self.onmessage = function(e) {
    const { entities, environment, rules, timeSteps } = e.data;
    const results = [];

    // Deterministic RNG seeded from host
    const ctx = self;
    function createRng(seed) {
      let state = 0;
      for (let i = 0; i < seed.length; i++) {
        state = ((state << 5) - state + seed.charCodeAt(i)) | 0;
      }
      return function() {
        state = (state * 1103515245 + 12345) | 0;
        return ((state >>> 0) % 0x100000000) / 0x100000000;
      };
    }
    const rng = createRng('${seedForWorker}');

    // Simulation logic here...
    postMessage({ type: 'done', results });
  };`;
}

/**
 * Default ALife Worker parameters
 */
export const defaultALifeWorkerParams: ALifeWorkerParams = {
  ...defaultAlifeParams,
  useWorker: typeof Worker !== 'undefined',
  seed: 'default',
};
