/**
 * Energy Generator — produces energy system designs
 * Solar, wind, hydro, nuclear, grid systems
 * $5T market: Energy (Beyond fusion)
 */

import * as fs from 'fs';
import * as path from 'path';
import type { Seed } from '../engines';
import { Xoshiro256StarStar, rngFromHash } from '../rng';

interface EnergyParams {
  source: 'solar' | 'wind' | 'hydro' | 'nuclear' | 'geothermal';
  capacity: number; // MW
  storage: 'battery' | 'pumped_hydro' | 'hydrogen' | 'none';
  quality: 'low' | 'medium' | 'high' | 'photorealistic';
}

export async function generateEnergy(seed: Seed, outputPath: string): Promise<{ filePath: string; layoutPath: string; source: string }> {
  const rng = rngFromHash(seed.$hash || '');
  const params = extractParams(seed, rng);

  const design = generateDesign(params, rng);
  const grid = generateGrid(params, rng);
  const storage = generateStorage(params, rng);

  const config = {
    energy: { source: params.source, capacity: params.capacity, storage: params.storage, quality: params.quality },
    design,
    grid,
    storage,
    economics: {
      capex: params.capacity * (rng.nextF64() * 2000000 + 500000), // USD per MW
      opex: rng.nextF64() * 50000, // USD per MW per year
      lcoe: rng.nextF64() * 0.1 + 0.03 // USD/kWh
    }
  };

  const dir = path.dirname(outputPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const jsonPath = outputPath.replace(/\.json$/, '_energy.json');
  fs.writeFileSync(jsonPath, JSON.stringify(config, null, 2));

  const layoutPath = outputPath.replace(/\.json$/, '_plant.svg');
  fs.writeFileSync(layoutPath, generateLayoutSVG(params, rng));

  return { filePath: jsonPath, layoutPath, source: params.source };
}

function generateDesign(params: EnergyParams, rng: Xoshiro256StarStar): any {
  return {
    plantSize: params.capacity,
    efficiency: rng.nextF64() * 0.3 + 0.3,
    landUse: params.source === 'solar' ? params.capacity * 5 : params.capacity * 0.1, // km^2
    lifespan: rng.nextF64() * 20 + 20 // years
  };
}

function generateGrid(params: EnergyParams, rng: Xoshiro256StarStar): any {
  return {
    voltage: params.capacity > 500 ? 765 : 345, // kV
    interconnection: rng.nextF64() > 0.5,
    smartGrid: true,
    transmissionLoss: rng.nextF64() * 0.05
  };
}

function generateStorage(params: EnergyParams, rng: Xoshiro256StarStar): any {
  if (params.storage === 'none') return null;
  return {
    type: params.storage,
    capacity: params.capacity * (rng.nextF64() * 4 + 1), // MWh
    duration: rng.nextF64() * 8 + 2, // hours
    cycles: Math.floor(rng.nextF64() * 5000) + 1000
  };
}

function generateLayoutSVG(params: EnergyParams, rng: Xoshiro256StarStar): string {
  return `<?xml version="1.0"?>
<svg width="800" height="600" xmlns="http://www.w3.org/2000/svg">
  <rect width="100%" height="100%" fill="#1a1a2a"/>
  <text x="400" y="30" text-anchor="middle" font-size="20" fill="white">${params.source} Plant — ${params.capacity} MW</text>
  <rect x="150" y="80" width="500" height="400" fill="#2a2a3a" stroke="#4a4" stroke-width="2"/>
  <text x="400" y="300" text-anchor="middle" fill="#4a4" font-size="16">${params.source.toUpperCase()} GENERATION</text>
  <text x="400" y="570" text-anchor="middle" font-size="12" fill="#aaa">Paradigm GSPL — Energy Systems</text>
</svg>`;
}

function extractParams(seed: Seed, rng: Xoshiro256StarStar): EnergyParams {
  const quality = seed.genes?.quality?.value || 'medium';
  return {
    source: seed.genes?.source?.value || ['solar', 'wind', 'hydro', 'nuclear', 'geothermal'][rng.nextInt(0, 4)],
    capacity: Math.floor(((seed.genes?.capacity?.value as number || rng.nextF64()) * 9900) + 100),
    storage: seed.genes?.storage?.value || ['battery', 'pumped_hydro', 'hydrogen', 'none'][rng.nextInt(0, 3)],
    quality: ['low', 'medium', 'high', 'photorealistic'].includes(quality) ? quality : 'medium'
  };
}
