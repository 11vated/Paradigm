/**
 * ALife Generator — produces Web Worker-based life simulation
 * Enhanced with complex ecosystem simulation
 */

import * as fs from 'fs';
import * as path from 'path';
import type { Seed } from '../engines';

interface ALifeParams {
  populationSize: number;
  mutationRate: number;
  environment: string;
  timeSteps: number;
  quality: 'low' | 'medium' | 'high' | 'photorealistic';
}

export async function generateALifeWorker(seed: Seed, outputPath: string): Promise<{ filePath: string; workerPath: string; entityCount: number }> {
  const params = extractParams(seed);

  // Generate simulation config
  const config = {
    simulation: {
      populationSize: params.populationSize,
      mutationRate: params.mutationRate,
      environment: params.environment,
      timeSteps: params.timeSteps,
      quality: params.quality
    },
    entities: generateEntities(params),
    environment: generateEnvironment(params),
    rules: generateRules(params),
    workerScript: 'alife-worker.js'
  };

  // Ensure output directory exists
  const dir = path.dirname(outputPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  // Write simulation config
  const configPath = outputPath.replace(/\.json$/, '_worker.json');
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2));

  // Write Web Worker script
  const workerPath = outputPath.replace(/\.json$/, '_worker.js');
  fs.writeFileSync(workerPath, generateWorkerScript(params));

  return {
    filePath: configPath,
    workerPath,
    entityCount: config.entities.length
  };
}

function generateEntities(params: ALifeParams): any[] {
  const entities = [];
  for (let i = 0; i < params.populationSize; i++) {
    entities.push({
      id: `entity_${i}`,
      type: ['herbivore', 'carnivore', 'omnivore'][i % 3],
      position: [Math.random() * 100, Math.random() * 100],
      energy: 100,
      health: 100,
      age: 0,
      genes: {
        speed: Math.random() * 5 + 1,
        strength: Math.random() * 5 + 1,
        perception: Math.random() * 10 + 5,
        reproductionRate: Math.random() * 0.1
      }
    });
  }
  return entities;
}

function generateEnvironment(params: ALifeParams): any {
  return {
    type: params.environment,
    width: 1000,
    height: 1000,
    resources: generateResources(params),
    hazards: params.quality !== 'low' ? generateHazards() : []
  };
}

function generateResources(params: ALifeParams): any[] {
  const count = params.quality === 'photorealistic' ? 100 : params.quality === 'high' ? 50 : 20;
  const resources = [];
  for (let i = 0; i < count; i++) {
    resources.push({
      type: ['food', 'water', 'shelter'][i % 3],
      position: [Math.random() * 1000, Math.random() * 1000],
      amount: Math.random() * 100,
      regenerationRate: Math.random() * 0.1
    });
  }
  return resources;
}

function generateHazards(): any[] {
  return [
    { type: 'predator', position: [500, 500], strength: 10 },
    { type: 'environmental', type: 'storm', damage: 20 }
  ];
}

function generateRules(params: ALifeParams): any {
  return {
    movement: { speedMultiplier: 1.0, energyCost: 0.1 },
    feeding: { energyGain: 20, searchRadius: 50 },
    reproduction: { energyCost: 50, mutationRate: params.mutationRate },
    death: { healthThreshold: 0, ageLimit: 1000 },
    interaction: { combatDamage: 10, cooperationBonus: 5 }
  };
}

function generateWorkerScript(params: ALifeParams): string {
  return `/**
 * ALife Worker — simulates life evolution in Web Worker
 * Offloads CPU-intensive simulation to background thread
 */

self.onmessage = function(e) {
  const { entities, environment, rules, timeSteps } = e.data;
  const results = [];
  
  for (let step = 0; step < timeSteps; step++) {
    // Update each entity
    entities.forEach(entity => {
      if (entity.health <= 0) return;
      
      // Movement
      const speed = entity.genes.speed * rules.movement.speedMultiplier;
      entity.position[0] += (Math.random() - 0.5) * speed;
      entity.position[1] += (Math.random() - 0.5) * speed;
      entity.energy -= rules.movement.energyCost;
      
      // Feeding
      const nearbyResource = findNearbyResource(entity, environment.resources, rules.feeding.searchRadius);
      if (nearbyResource) {
        entity.energy += rules.feeding.energyGain;
        nearbyResource.amount -= 10;
      }
      
      // Reproduction
      if (entity.energy > 80 && Math.random() < rules.reproduction.reproductionRate) {
        const child = createChild(entity, rules.reproduction.mutationRate);
        entities.push(child);
      }
      
      // Aging
      entity.age++;
      entity.health -= 0.1;
      
      // Death check
      if (entity.health <= rules.death.healthThreshold || entity.age > rules.death.ageLimit) {
        entity.health = 0;
      }
    });
    
    // Remove dead entities
    const alive = entities.filter(e => e.health > 0);
    
    // Report progress
    if (step % 100 === 0) {
      self.postMessage({
        step,
        population: alive.length,
        avgEnergy: alive.reduce((sum, e) => sum + e.energy, 0) / alive.length
      });
    }
  }
  
  self.postMessage({ complete: true, finalPopulation: entities.filter(e => e.health > 0).length });
};

function findNearbyResource(entity, resources, radius) {
  return resources.find(r => {
    const dx = r.position[0] - entity.position[0];
    const dy = r.position[1] - entity.position[1];
    return Math.sqrt(dx*dx + dy*dy) < radius && r.amount > 0;
  });
}

function createChild(parent, mutationRate) {
  return {
    id: 'entity_' + Date.now() + '_' + Math.random(),
    type: parent.type,
    position: [parent.position[0] + (Math.random()-0.5)*10, parent.position[1] + (Math.random()-0.5)*10],
    energy: 50,
    health: 100,
    age: 0,
    genes: {
      speed: parent.genes.speed + (Math.random()-0.5) * mutationRate,
      strength: parent.genes.strength + (Math.random()-0.5) * mutationRate,
      perception: parent.genes.perception + (Math.random()-0.5) * mutationRate,
      reproductionRate: parent.genes.reproductionRate + (Math.random()-0.5) * mutationRate
    }
  };
}
`;
}

function extractParams(seed: Seed): ALifeParams {
  const quality = seed.genes?.quality?.value || 'medium';
  let populationSize = seed.genes?.populationSize?.value || 50;
  if (typeof populationSize === 'number' && populationSize <= 1) populationSize = Math.max(10, Math.floor(populationSize * 100));

  return {
    populationSize,
    mutationRate: seed.genes?.mutationRate?.value || 0.1,
    environment: seed.genes?.environment?.value || 'forest',
    timeSteps: typeof seed.genes?.timeSteps?.value === 'number' ? seed.genes.timeSteps.value : 1000,
    quality: ['low', 'medium', 'high', 'photorealistic'].includes(quality) ? quality : 'medium'
  };
}
