/**
 * Space Generator — produces space infrastructure
 * Satellites, space stations, lunar bases, Mars colonies
 * $1T market: Space Economy
 */

import * as fs from 'fs';
import * as path from 'path';
import type { Seed } from '../engines';
import { Xoshiro256StarStar, rngFromHash } from '../rng';

interface SpaceParams {
  infrastructureType: 'satellite' | 'space_station' | 'lunar_base' | 'mars_colony';
  capacity: number; // crew/payload
  orbit: string;
  quality: 'low' | 'medium' | 'high' | 'photorealistic';
}

export async function generateSpace(seed: Seed, outputPath: string): Promise<{ filePath: string; specPath: string; infrastructureType: string }> {
  const rng = rngFromHash(seed.$hash || '');
  const params = extractParams(seed, rng);

  // Generate infrastructure design
  const design = generateDesign(params, rng);

  // Generate life support
  const lifeSupport = generateLifeSupport(params, rng);

  // Generate mission profile
  const mission = generateMission(params, rng);

  const config = {
    space: {
      infrastructureType: params.infrastructureType,
      capacity: params.capacity,
      orbit: params.orbit,
      quality: params.quality
    },
    design,
    lifeSupport,
    mission,
    economics: {
      cost: rng.nextF64() * 100e9, // USD
      roi: rng.nextF64() * 0.2, // 0-20%
      funding: ['government', 'private', 'mixed'][rng.nextInt(0, 2)]
    }
  };

  const dir = path.dirname(outputPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  const jsonPath = outputPath.replace(/\.json$/, '_space.json');
  fs.writeFileSync(jsonPath, JSON.stringify(config, null, 2));

  // Write spec sheet
  const specPath = outputPath.replace(/\.json$/, '_spec.txt');
  fs.writeFileSync(specPath, generateSpecSheet(params, rng));

  return {
    filePath: jsonPath,
    specPath,
    infrastructureType: params.infrastructureType
  };
}

function generateDesign(params: SpaceParams, rng: Xoshiro256StarStar): any {
  return {
    dimensions: {
      length: params.infrastructureType === 'satellite' ? 5 + rng.nextF64() * 10 : 50 + rng.nextF64() * 100,
      width: params.infrastructureType === 'satellite' ? 3 + rng.nextF64() * 5 : 30 + rng.nextF64() * 50,
      height: params.infrastructureType === 'satellite' ? 3 + rng.nextF64() * 5 : 30 + rng.nextF64() * 50
    },
    mass: params.infrastructureType === 'satellite' ? rng.nextF64() * 10000 : rng.nextF64() * 1000000, // kg
    power: {
      source: params.infrastructureType === 'satellite' ? 'solar' : 'nuclear',
      output: rng.nextF64() * 100000 // watts
    }
  };
}

function generateLifeSupport(params: SpaceParams, rng: Xoshiro256StarStar): any {
  if (params.infrastructureType === 'satellite') return null;
  return {
    oxygen: {
      source: 'electrolysis',
      storage: params.capacity * 100, // kg
      regeneration: rng.nextF64() > 0.5
    },
    water: {
      recyclingRate: rng.nextF64() * 0.3 + 0.7, // 70-100%
      storage: params.capacity * 50 // kg
    },
    food: {
      type: 'dehydrated',
      storage: params.capacity * 30 // days
    }
  };
}

function generateMission(params: SpaceParams, rng: Xoshiro256StarStar): any {
  return {
    duration: params.infrastructureType === 'satellite' ? rng.nextF64() * 15 + 5 : rng.nextF64() * 50 + 10, // years
    crew: params.infrastructureType !== 'satellite' ? params.capacity : 0,
    objectives: ['research', 'tourism', 'mining', 'colonization'].slice(0, Math.floor(rng.nextF64() * 4) + 1),
    launchVehicle: ['Falcon 9', 'Starship', 'New Glenn', 'Vulcan'][rng.nextInt(0, 3)]
  };
}

function generateSpecSheet(params: SpaceParams, rng: Xoshiro256StarStar): string {
  return `SPACE INFRASTRUCTURE SPECIFICATION
=====================================
Type: ${params.infrastructureType}
Capacity: ${params.capacity}
Orbit: ${params.orbit}
Mass: ${rng.nextF64() * 1000000} kg
Power: ${rng.nextF64() * 100000} W
Mission Duration: ${rng.nextF64() * 50 + 10} years

Cost: $${(rng.nextF64() * 100e9).toLocaleString()}

Paradigm GSPL Beyond Omega — Space Economy`;
}

function extractParams(seed: Seed, rng: Xoshiro256StarStar): SpaceParams {
  const quality = seed.genes?.quality?.value || 'medium';

  return {
    infrastructureType: seed.genes?.infrastructureType?.value || ['satellite', 'space_station', 'lunar_base', 'mars_colony'][rng.nextInt(0, 3)],
    capacity: Math.floor(((seed.genes?.capacity?.value as number || rng.nextF64()) * 9900) + 100), // 100-10000
    orbit: seed.genes?.orbit?.value || ['LEO', 'GEO', 'Lunar', 'Mars'][rng.nextInt(0, 3)],
    quality: ['low', 'medium', 'high', 'photorealistic'].includes(quality) ? quality : 'medium'
  };
}

