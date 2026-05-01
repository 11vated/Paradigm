/**
 * Ecosystem Generator — produces Web Worker-based ecosystem simulation
 * Enhanced with complex food webs and environmental factors
 */

import * as fs from 'fs';
import * as path from 'path';
import type { Seed } from '../engines';

interface EcosystemParams {
  speciesCount: number;
  foodWebComplexity: number;
  climateZones: number;
  timeSteps: number;
  quality: 'low' | 'medium' | 'high' | 'photorealistic';
}

export async function generateEcosystemWorker(seed: Seed, outputPath: string): Promise<{ filePath: string; workerPath: string; speciesCount: number }> {
  const params = extractParams(seed);

  // Generate ecosystem config
  const config = {
    ecosystem: {
      speciesCount: params.speciesCount,
      foodWebComplexity: params.foodWebComplexity,
      climateZones: params.climateZones,
      timeSteps: params.timeSteps,
      quality: params.quality
    },
    species: generateSpecies(params),
    environment: generateEnvironmentZones(params),
    foodWeb: generateFoodWeb(params),
    events: generateEvents(params),
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

function generateSpecies(params: EcosystemParams): any[] {
  const species = [];
  const types = ['producer', 'herbivore', 'carnivore', 'omnivore', 'decomposer'];
  
  for (let i = 0; i < params.speciesCount; i++) {
    const type = types[i % types.length];
    species.push({
      id: `species_${i}`,
      name: `${type}_${i}`,
      type,
      population: Math.floor(Math.random() * 1000) + 100,
      reproductiveRate: Math.random() * 0.5 + 0.1,
      carryingCapacity: Math.floor(Math.random() * 5000) + 1000,
      energyRequirement: Math.random() * 100 + 10,
      habitat: ['forest', 'grassland', 'aquatic', 'mountain'][i % 4],
      traits: {
        speed: Math.random() * 10 + 1,
        size: Math.random() * 100 + 1,
        lifespan: Math.random() * 20 + 1,
        camouflage: Math.random()
      },
      threats: [],
      prey: []
    });
  }
  
  return species;
}

function generateEnvironmentZones(params: EcosystemParams): any[] {
  const zones = [];
  const zoneTypes = ['forest', 'grassland', 'desert', 'aquatic', 'mountain', 'tundra'];
  
  for (let i = 0; i < params.climateZones; i++) {
    zones.push({
      id: `zone_${i}`,
      type: zoneTypes[i % zoneTypes.length],
      area: Math.random() * 10000 + 1000,
      temperature: Math.random() * 40 - 10, // -10 to 30 C
      rainfall: Math.random() * 2000 + 100, // mm/year
      resources: {
        food: Math.random() * 1000 + 100,
        water: Math.random() * 1000 + 100,
        shelter: Math.random() * 500 + 50
      },
      carryingCapacityMultiplier: Math.random() * 2 + 0.5
    });
  }
  
  return zones;
}

function generateFoodWeb(params: EcosystemParams): any {
  return {
    interactions: generateInteractions(params.speciesCount),
    energyFlow: generateEnergyFlow(params.speciesCount),
    trophicLevels: params.speciesCount > 0 ? Math.ceil(Math.log2(params.speciesCount)) : 1
  };
}

function generateInteractions(speciesCount: number): any[] {
  const interactions = [];
  for (let i = 0; i < speciesCount; i++) {
    for (let j = 0; j < speciesCount; j++) {
      if (i !== j && Math.random() < 0.3) {
        interactions.push({
          predator: `species_${i}`,
          prey: `species_${j}`,
          strength: Math.random()
        });
      }
    }
  }
  return interactions;
}

function generateEnergyFlow(speciesCount: number): any {
  return {
    producers: Math.floor(speciesCount * 0.3),
    consumers: Math.floor(speciesCount * 0.6),
    decomposers: Math.floor(speciesCount * 0.1),
    energyEfficiency: 0.1 // 10% energy transfer between trophic levels
  };
}

function generateEvents(params: EcosystemParams): any[] {
  return [
    { type: 'drought', probability: 0.1, severity: 0.5, duration: 100 },
    { type: 'fire', probability: 0.05, severity: 0.8, duration: 50 },
    { type: 'migration', probability: 0.2, affectedSpecies: Math.floor(params.speciesCount * 0.5) },
    { type: 'disease', probability: 0.15, lethality: 0.3, spreadRate: 0.1 }
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
  
  // Simulation loop
  for (let step = 0; step < timeSteps; step++) {
    // Environmental effects
    const drought = Math.random() < 0.001 ? 0.5 : 1.0; // Rare drought event
    const temperature = environment[0].temperature + (Math.random() - 0.5) * 5;
    
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
