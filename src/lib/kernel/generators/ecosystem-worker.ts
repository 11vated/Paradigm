/**
 * Ecosystem Generator — produces Web Worker-based ecosystem simulation
 * Enhanced with complex food webs and environmental factors
 */

import * as fs from 'fs';
import * as path from 'path';
import type { Seed } from '../engines';
import { Xoshiro256StarStar, rngFromHash } from '../rng';

interface EcosystemParams {
  speciesCount: number;
  foodWebComplexity: number;
  climateZones: number;
  timeSteps: number;
  quality: 'low' | 'medium' | 'high' | 'photorealistic';
}

export async function generateEcosystemWorker(seed: Seed, outputPath: string): Promise<{ filePath: string; workerPath: string; speciesCount: number }> {
  const rng = rngFromHash(seed.$hash || '');
  const params = extractParams(seed, rng);

  // Generate ecosystem config
  const config = {
    ecosystem: {
      speciesCount: params.speciesCount,
      foodWebComplexity: params.foodWebComplexity,
      climateZones: params.climateZones,
      timeSteps: params.timeSteps,
      quality: params.quality
    },
    species: generateSpecies(params, rng),
    environment: generateEnvironmentZones(params, rng),
    foodWeb: generateFoodWeb(params, rng),
    events: generateEvents(params, rng),
    workerScript: 'ecosystem-worker.js'
  };

  // Ensure output directory exists
  const dir = path.dirname(outputPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  // Write ecosystem config
  const configPath = outputPath.replace(/\.json$/, '_worker.json');
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2));

  // Write Web Worker script
  const workerPath = outputPath.replace(/\.json$/, '_worker.js');
  fs.writeFileSync(workerPath, generateWorkerScript(params));

  return {
    filePath: configPath,
    workerPath,
    speciesCount: config.species.length
  };
}

function generateSpecies(params: EcosystemParams, rng: Xoshiro256StarStar): any[] {
  const species = [];
  const types = ['producer', 'herbivore', 'carnivore', 'omnivore', 'decomposer'];

  for (let i = 0; i < params.speciesCount; i++) {
    const type = types[i % types.length];
    species.push({
      id: `species_${i}`,
      name: `${type}_${i}`,
      type,
      population: Math.floor(rng.nextF64() * 1000) + 100,
      reproductiveRate: rng.nextF64() * 0.5 + 0.1,
      carryingCapacity: Math.floor(rng.nextF64() * 5000) + 1000,
      energyRequirement: rng.nextF64() * 100 + 10,
      habitat: ['forest', 'grassland', 'aquatic', 'mountain'][i % 4],
      traits: {
        speed: rng.nextF64() * 10 + 1,
        size: rng.nextF64() * 100 + 1,
        lifespan: rng.nextF64() * 20 + 1,
        camouflage: rng.nextF64()
      },
      threats: [],
      prey: []
    });
  }

  return species;
}

function generateEnvironmentZones(params: EcosystemParams, rng: Xoshiro256StarStar): any[] {
  const zones = [];
  const zoneTypes = ['forest', 'grassland', 'desert', 'aquatic', 'mountain', 'tundra'];

  for (let i = 0; i < params.climateZones; i++) {
    zones.push({
      id: `zone_${i}`,
      type: zoneTypes[i % zoneTypes.length],
      area: rng.nextF64() * 10000 + 1000,
      temperature: rng.nextF64() * 40 - 10, // -10 to 30 C
      rainfall: rng.nextF64() * 2000 + 100, // mm/year
      resources: {
        food: rng.nextF64() * 1000 + 100,
        water: rng.nextF64() * 1000 + 100,
        shelter: rng.nextF64() * 500 + 50
      },
      carryingCapacityMultiplier: rng.nextF64() * 2 + 0.5
    });
  }

  return zones;
}

function generateFoodWeb(params: EcosystemParams, rng: Xoshiro256StarStar): any {
  return {
    interactions: generateInteractions(params.speciesCount, rng),
    energyFlow: generateEnergyFlow(params.speciesCount, rng),
    trophicLevels: params.speciesCount > 0 ? Math.ceil(Math.log2(params.speciesCount)) : 1
  };
}

function generateInteractions(speciesCount: number, rng: Xoshiro256StarStar): any[] {
  const interactions = [];
  for (let i = 0; i < speciesCount; i++) {
    for (let j = 0; j < speciesCount; j++) {
      if (i !== j && rng.nextF64() < 0.3) {
        interactions.push({
          predator: `species_${i}`,
          prey: `species_${j}`,
          strength: rng.nextF64()
        });
      }
    }
  }
  return interactions;
}

function generateEnergyFlow(speciesCount: number, rng: Xoshiro256StarStar): any {
  return {
    producers: Math.floor(speciesCount * 0.3),
    consumers: Math.floor(speciesCount * 0.6),
    decomposers: Math.floor(speciesCount * 0.1),
    energyEfficiency: 0.1 // 10% energy transfer between trophic levels
  };
}

function generateEvents(params: EcosystemParams, rng: Xoshiro256StarStar): any[] {
  return [
    { type: 'drought', probability: rng.nextF64() * 0.2, severity: 0.5, duration: 100 },
    { type: 'fire', probability: rng.nextF64() * 0.1, severity: 0.8, duration: 50 },
    { type: 'migration', probability: rng.nextF64() * 0.3, affectedSpecies: Math.floor(params.speciesCount * rng.nextF64()) },
    { type: 'disease', probability: rng.nextF64() * 0.2, lethality: 0.3, spreadRate: 0.1 }
  ];
}

function generateWorkerScript(params: EcosystemParams): string {
  return `/**
 * Ecosystem Worker — simulates ecosystem dynamics in Web Worker
 * Handles population dynamics, food web interactions, and environmental events
 */

self.onmessage = function(e) {
  const { species, environment, foodWeb, events, timeSteps } = e.data;
  const results = {
    populations: [],
    interactions: [],
    events: []
  };
  
  // Initialize populations
  const populations = species.map(s => ({
    ...s,
    currentPopulation: s.population,
    history: []
  }));
  
    // Simulation loop — deterministic RNG seeded from species hash
    const ctx = self as any;
    function deterministicRandom(seed: string): () => number {
      let state = 0;
      for (let i = 0; i < seed.length; i++) state = ((state << 5) - state + seed.charCodeAt(i)) | 0;
      return () => { state = (state * 1103515245 + 12345) | 0; return ((state >>> 0) % 0x100000000) / 0x100000000; };
    }
    const rng = deterministicRandom(JSON.stringify(species.map(s => s.id)));

    for (let step = 0; step < timeSteps; step++) {
      // Environmental effects
      const drought = rng() < 0.001 ? 0.5 : 1.0; // Rare drought event
      const temperature = environment[0].temperature + (rng() - 0.5) * 5;
    
    // Update each species
    populations.forEach((pop, idx) => {
      // Birth rate
      const births = pop.currentPopulation * pop.reproductiveRate * (1 - pop.currentPopulation / pop.carryingCapacity);
      
      // Death rate (base + environmental)
      const environmentalDeath = pop.type === 'producer' ? (1 - drought) * 0.1 : 0.05;
      const deaths = pop.currentPopulation * (0.1 + environmentalDeath);
      
      // Food web interactions
      const predation = foodWeb.interactions
        .filter(i => i.prey === pop.id)
        .reduce((sum, i) => sum + populations.find(p => p.id === i.predator)?.currentPopulation * i.strength * 0.01 || 0, 0);
      
      // Update population
      let newPop = pop.currentPopulation + births - deaths - predation;
      newPop = Math.max(0, newPop);
      
      // Record history
      pop.history.push({
        step,
        population: newPop,
        births,
        deaths,
        predation
      });
      
      pop.currentPopulation = newPop;
    });
    
    // Report progress
    if (step % 100 === 0) {
      self.postMessage({
        step,
        populations: populations.map(p => ({ id: p.id, population: p.currentPopulation }))
      });
    }
  }
  
  self.postMessage({
    complete: true,
    finalPopulations: populations.map(p => ({ id: p.id, population: p.currentPopulation })),
    history: populations.map(p => ({ id: p.id, history: p.history }))
  });
};
`;
}

function extractParams(seed: Seed): EcosystemParams {
  const quality = seed.genes?.quality?.value || 'medium';
  let speciesCount = seed.genes?.speciesCount?.value || 10;
  if (typeof speciesCount === 'number' && speciesCount <= 1) speciesCount = Math.max(5, Math.floor(speciesCount * 50));

  return {
    speciesCount,
    foodWebComplexity: typeof seed.genes?.foodWebComplexity?.value === 'number' ? seed.genes.foodWebComplexity.value : 0.5,
    climateZones: typeof seed.genes?.climateZones?.value === 'number' ? seed.genes.climateZones.value : 3,
    timeSteps: typeof seed.genes?.timeSteps?.value === 'number' ? seed.genes.timeSteps.value : 1000,
    quality: ['low', 'medium', 'high', 'photorealistic'].includes(quality) ? quality : 'medium'
  };
}
