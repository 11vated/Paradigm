/**
 * Ecosystem Generator — produces ecosystem simulation data
 * Creates species interactions and environment config
 */

import * as fs from 'fs';
import * as path from 'path';
import type { Seed } from '../engines';

interface EcosystemParams {
  speciesCount: number;
  environment: string;
  stability: number;
  interactions: string[];
  quality: 'low' | 'medium' | 'high' | 'photorealistic';
}

export async function generateEcosystem(seed: Seed, outputPath: string): Promise<{ filePath: string; speciesCount: number }> {
  const params = extractParams(seed);

  const species = Array.from({ length: params.speciesCount }, (_, i) => ({
    id: `species_${i}`,
    name: `Species_${String.fromCharCode(65 + i)}`,
    population: Math.floor(100 + Math.random() * 900),
    traits: {
      aggression: Math.random(),
      reproduction: 0.1 + Math.random() * 0.5,
      adaptability: Math.random()
    }
  }));

  const config = {
    environment: {
      type: params.environment,
      resources: Math.floor(params.stability * 1000),
      climate: getClimate(params.environment)
    },
    species,
    interactions: generateInteractions(species, params.interactions),
    stability: params.stability,
    quality: params.quality
  };

  const dir = path.dirname(outputPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  const jsonPath = outputPath.replace(/\.gltf$/, '.json');
  fs.writeFileSync(jsonPath, JSON.stringify(config, null, 2));

  return {
    filePath: jsonPath,
    speciesCount: species.length
  };
}

function getClimate(env: string): string {
  const climates: Record<string, string> = {
    forest: 'temperate',
    desert: 'arid',
    ocean: 'marine',
    tundra: 'frigid',
    grassland: 'moderate'
  };
  return climates[env] || 'temperate';
}

function generateInteractions(species: any[], types: string[]): any[] {
  const interactions = [];
  for (let i = 0; i < species.length; i++) {
    for (let j = i + 1; j < species.length; j++) {
      const type = types[Math.floor(Math.random() * types.length)];
      interactions.push({
        from: species[i].id,
        to: species[j].id,
        type,
        strength: Math.random()
      });
    }
  }
  return interactions;
}

function extractParams(seed: Seed): EcosystemParams {
  const quality = seed.genes?.quality?.value || 'medium';

  return {
    speciesCount: Math.max(2, Math.floor((seed.genes?.speciesCount?.value || 0.5) * 20)),
    environment: seed.genes?.environment?.value || 'forest',
    stability: seed.genes?.stability?.value || 0.6,
    interactions: (() => {
      const i = seed.genes?.interactions?.value || ['predation', 'symbiosis', 'competition'];
      return Array.isArray(i) ? i : ['predation', 'symbiosis', 'competition'];
    })(),
    quality: ['low', 'medium', 'high', 'photorealistic'].includes(quality) ? quality : 'medium'
  };
}
