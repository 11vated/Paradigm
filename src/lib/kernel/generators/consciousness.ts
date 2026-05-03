/**
 * Consciousness Generator — produces neural patterns and mind-uploading configs
 * BCI integration, neural mapping, thought-to-seed encoding
 * $20T market: AGI/BCI
 */

import * as fs from 'fs';
import * as path from 'path';
import type { Seed } from '../engines';
import { Xoshiro256StarStar, rngFromHash } from '../rng';

interface ConsciousnessParams {
  type: 'thought' | 'memory' | 'personality' | 'qualia';
  neuronCount: number;
  synapseDensity: number;
  plasticity: number;
  quality: 'low' | 'medium' | 'high' | 'photorealistic';
}

export async function generateConsciousness(seed: Seed, outputPath: string): Promise<{ filePath: string; neuralPath: string; neuronCount: number }> {
  const rng = rngFromHash(seed.$hash || '');
  const params = extractParams(seed, rng);

  // Generate neural network config
  const neuralNet = generateNeuralNet(params, rng);

  // Generate BCI mapping
  const bciMapping = generateBCIMapping(params, rng);

  // Generate qualia report (subjective experience)
  const qualia = generateQualia(params, rng);

  const config = {
    consciousness: {
      type: params.type,
      neuronCount: params.neuronCount,
      synapseDensity: params.synapseDensity,
      plasticity: params.plasticity,
      quality: params.quality
    },
    neuralNet,
    bciMapping,
    qualia,
    uploadReadiness: {
      neuralFidelity: rng.nextF64(),
      personalityPreservation: rng.nextF64(),
      memoryRetention: rng.nextF64()
    }
  };

  const dir = path.dirname(outputPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  const jsonPath = outputPath.replace(/\.json$/, '_consciousness.json');
  fs.writeFileSync(jsonPath, JSON.stringify(config, null, 2));

  // Write neural network file
  const neuralPath = outputPath.replace(/\.json$/, '_neural.json');
  fs.writeFileSync(neuralPath, JSON.stringify(neuralNet, null, 2));

  return {
    filePath: jsonPath,
    neuralPath,
    neuronCount: params.neuronCount
  };
}

function generateNeuralNet(params: ConsciousnessParams, rng: Xoshiro256StarStar): any {
  const layers = ['sensory', 'association', 'memory', 'executive', 'motor'];
  const neurons: any[] = [];

  for (let i = 0; i < params.neuronCount; i++) {
    neurons.push({
      id: `neuron_${i}`,
      type: layers[i % layers.length],
      position: [rng.nextF64() * 100 - 50, rng.nextF64() * 100 - 50, rng.nextF64() * 100 - 50],
      connections: Math.floor(rng.nextF64() * 1000),
      firingRate: rng.nextF64() * 200, // Hz
      neurotransmitter: ['glutamate', 'GABA', 'dopamine', 'serotonin'][rng.nextInt(0, 3)],
      membranePotential: -70 + rng.nextF64() * 30 // mV
    });
  }

  return {
    totalNeurons: neurons.length,
    layers: layers.map(l => ({
      name: l,
      count: neurons.filter(n => n.type === l).length
    })),
    connectivity: params.synapseDensity,
    plasticity: params.plasticity,
    neurons: neurons.slice(0, 1000) // First 1000 for file size
  };
}

function generateBCIMapping(params: ConsciousnessParams, rng: Xoshiro256StarStar): any {
  return {
    interface: {
      electrodes: Math.floor(params.neuronCount / 1000),
      samplingRate: 30000, // Hz
      resolution: 'single-unit'
    },
    thoughtToSeed: {
      encoding: 'vectorized',
      dimensions: 1536, // embedding size
      mapping: Array.from({ length: 10 }, () => ({
        concept: ['fear', 'joy', 'sadness', 'anger', 'surprise'][rng.nextInt(0, 4)],
        vector: Array.from({ length: 5 }, () => rng.nextF64())
      }))
    },
    commands: ['focus', 'recall', 'compute', 'simulate', 'meditate']
  };
}

function generateQualia(params: ConsciousnessParams, rng: Xoshiro256StarStar): any {
  return {
    subjectiveExperience: {
      valence: rng.nextF64() * 2 - 1, // -1 to 1
      arousal: rng.nextF64(),
      dominance: rng.nextF64(),
      qualiaType: params.type
    },
    report: `Subjective experience of type "${params.type}" with ${params.neuronCount} neurons`,
    impossibleToDescribe: true,
    hardProblemSolved: false // Still philosophy's hardest problem
  };
}

function extractParams(seed: Seed, rng: Xoshiro256StarStar): ConsciousnessParams {
  const quality = seed.genes?.quality?.value || 'medium';

  return {
    type: seed.genes?.type?.value || 'thought',
    neuronCount: Math.floor((seed.genes?.neuronCount?.value as number || 0.5) * 86000000000), // Up to 86B neurons
    synapseDensity: (seed.genes?.synapseDensity?.value as number || rng.nextF64()) * 10000,
    plasticity: (seed.genes?.plasticity?.value as number || rng.nextF64()),
    quality: ['low', 'medium', 'high', 'photorealistic'].includes(quality) ? quality : 'medium'
  };
}
