/**
 * Ecosystem Generator V3 — Species Interaction Graphs
 * Features: Food webs, population dynamics, biome simulation
 * Export: JSON, interactive HTML visualization
 */

import * as fs from 'fs';
import * as path from 'path';
import type { Seed } from '../engines';
import { Xoshiro256StarStar } from '../rng';

interface EcosystemParams {
  biomes: number;
  species: number;
  complexity: 'simple' | 'medium' | 'complex';
  climate: 'tropical' | 'temperate' | 'arid' | 'polar';
}

interface Species {
  id: string;
  name: string;
  type: 'producer' | 'herbivore' | 'carnivore' | 'omnivore' | 'decomposer';
  population: number;
  growthRate: number;
  predators: string[];
  prey: string[];
}

interface Biome {
  name: string;
  species: string[];
  climate: string;
  resources: number;
}

export async function generateEcosystemV3(
  seed: Seed,
  outputPath: string
): Promise<{
  jsonPath: string;
  htmlPath: string;
  speciesCount: number;
  biomeCount: number;
}> {
  const rng = new Xoshiro256StarStar(seed.$hash || 'ecosystem-default');
  const params = extractEcosystemParams(seed, rng);
  
  // Generate biomes
  const biomes = generateBiomes(params, rng);
  
  // Generate species
  const species = generateSpecies(params, biomes, rng);
  
  // Create food web
  const foodWeb = createFoodWeb(species, rng);
  
  // Run simulation
  const simulation = runEcosystemSimulation(species, foodWeb, 100, rng);
  
  // Export
  const jsonPath = await exportEcosystemJSON({ biomes, species, foodWeb, simulation }, outputPath, seed);
  const htmlPath = await exportInteractiveHTML(biomes, species, foodWeb, outputPath, seed);
  
  return {
    jsonPath,
    htmlPath,
    speciesCount: species.length,
    biomeCount: biomes.length
  };
}

function extractEcosystemParams(seed: Seed, rng: Xoshiro256StarStar): EcosystemParams {
  const complexities = ['simple', 'medium', 'complex'] as const;
  const climates = ['tropical', 'temperate', 'arid', 'polar'] as const;
  
  return {
    biomes: 2 + Math.floor(rng.nextF64() * 4),
    species: 5 + Math.floor(rng.nextF64() * 20),
    complexity: complexities[Math.floor(rng.nextF64() * complexities.length)],
    climate: climates[Math.floor(rng.nextF64() * climates.length)]
  };
}

function generateBiomes(params: EcosystemParams, rng: Xoshiro256StarStar): Biome[] {
  const biomeNames = ['Forest', 'Grassland', 'Wetland', 'Desert', 'Tundra', 'Mountain', 'Ocean', 'River'];
  const biomes: Biome[] = [];
  
  for (let i = 0; i < params.biomes; i++) {
    biomes.push({
      name: biomeNames[Math.floor(rng.nextF64() * biomeNames.length)],
      species: [],
      climate: params.climate,
      resources: 0.5 + rng.nextF64() * 0.5
    });
  }
  
  return biomes;
}

function generateSpecies(params: EcosystemParams, biomes: Biome[], rng: Xoshiro256StarStar): Species[] {
  const species: Species[] = [];
  const types = ['producer', 'herbivore', 'carnivore', 'omnivore', 'decomposer'] as const;
  const prefixes = ['Green', 'Swift', 'Fierce', 'Tiny', 'Great', 'Dark', 'Golden', 'Shadow'];
  const roots = ['Wolf', 'Deer', 'Eagle', 'Snake', 'Bear', 'Fox', 'Hawk', 'Lion'];
  
  for (let i = 0; i < params.species; i++) {
    const type = types[i < 3 ? 0 : i < 10 ? 1 : i < 15 ? 2 : i < 18 ? 3 : 4];
    species.push({
      id: `sp_${i}`,
      name: `${prefixes[Math.floor(rng.nextF64() * prefixes.length)]} ${roots[Math.floor(rng.nextF64() * roots.length)]}`,
      type,
      population: 10 + Math.floor(rng.nextF64() * 990),
      growthRate: 0.01 + rng.nextF64() * 0.1,
      predators: [],
      prey: []
    });
    
    // Assign to biomes
    const biomeCount = 1 + Math.floor(rng.nextF64() * biomes.length);
    for (let b = 0; b < biomeCount; b++) {
      const biome = biomes[Math.floor(rng.nextF64() * biomes.length)];
      if (!biome.species.includes(`sp_${i}`)) biome.species.push(`sp_${i}`);
    }
  }
  
  return species;
}

function createFoodWeb(species: Species[], rng: Xoshiro256StarStar): Species[] {
  const producers = species.filter(s => s.type === 'producer');
  const consumers = species.filter(s => s.type !== 'producer');
  
  consumers.forEach(consumer => {
    // Assign prey
    const preyCount = 1 + Math.floor(rng.nextF64() * 3);
    for (let i = 0; i < preyCount; i++) {
      const prey = producers.length > 0 ? producers[Math.floor(rng.nextF64() * producers.length)] : species[Math.floor(rng.nextF64() * species.length)];
      if (!consumer.prey.includes(prey.id)) consumer.prey.push(prey.id);
      if (!prey.predators.includes(consumer.id)) prey.predators.push(consumer.id);
    }
  });
  
  return species;
}

function runEcosystemSimulation(species: Species[], _foodWeb: Species[], generations: number, rng: Xoshiro256StarStar): any[] {
  const results: any[] = [];
  const popHistory = species.map(s => s.population);
  
  for (let gen = 0; gen < generations; gen++) {
    const snapshot: any = { generation: gen, populations: {} };
    
    species.forEach((s, i) => {
      // Population dynamics (simplified Lotka-Volterra)
      const preyBonus = s.prey.length > 0 ? 0.1 : 0;
      const predPenalty = s.predators.length > 0 ? -0.05 : 0;
      const growth = s.growthRate + preyBonus + predPenalty + (rng.nextF64() - 0.5) * 0.1;
      
      popHistory[i] = Math.max(0, Math.floor(popHistory[i] * (1 + growth)));
      snapshot.populations[s.id] = popHistory[i];
    });
    
    results.push(snapshot);
  }
  
  return results;
}

async function exportEcosystemJSON(data: any, outputPath: string, seed: Seed): Promise<string> {
  const filename = `ecosystem_${seed.$hash || 'unknown'}.json`;
  const filePath = path.join(outputPath, filename);
  if (typeof fs !== 'undefined') fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
  return filePath;
}

async function exportInteractiveHTML(biomes: Biome[], species: Species[], _foodWeb: Species[], outputPath: string, seed: Seed): Promise<string> {
  const filename = `ecosystem_${seed.$hash || 'unknown'}.html`;
  const filePath = path.join(outputPath, filename);
  
  const html = `<!DOCTYPE html><html><head><title>Ecosystem - ${seed.$hash}</title>
<style>body{font-family:system-ui;padding:20px;background:#1a1a1a;color:#fff}
.biome{background:#2a2a2a;padding:16px;margin:8px 0;border-radius:8px}
.species{display:inline-block;padding:4px 8px;margin:4px;background:#3b82f6;border-radius:4px}</style></head>
<body><h1>Ecosystem Simulation</h1>
${biomes.map(b => `<div class="biome"><h3>${b.name}</h3><p>Climate: ${b.climate} | Resources: ${(b.resources*100).toFixed(0)}%</p>
${b.species.map(s => `<span class="species">${s}</span>`).join('')}</div>`).join('')}
<h2>Food Web</h2><p>${species.length} species | ${biomes.length} biomes</p></body></html>`;
  
  if (typeof fs !== 'undefined') fs.writeFileSync(filePath, html);
  return filePath;
}

// ── Canonical aliases (added by phase-0.5 consolidation) ──
export { generateEcosystemV3 as generateEcosystem };
