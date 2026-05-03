/**
 * Renewable Energy Generator — produces renewable energy designs
 * Solar, wind, hydro, geothermal, tidal
 * $1T market: Renewable Energy
 */

import * as fs from 'fs';
import * as path from 'path';
import type { Seed } from '../engines';
import { Xoshiro256StarStar, rngFromHash } from '../rng';

interface RenewableEnergyParams {
  source: 'solar' | 'wind' | 'hydro' | 'geothermal' | 'tidal';
  capacity: number; // MW
  storage: 'battery' | 'hydrogen' | 'pumped_hydro' | 'none';
  quality: 'low' | 'medium' | 'high' | 'photorealistic';
}

export async function generateRenewableEnergy(seed: Seed, outputPath: string): Promise<{ filePath: string; layoutPath: string; source: string }> {
  const rng = rngFromHash(seed.$hash || '');
  const params = extractParams(seed, rng);

  const config = {
    renewableEnergy: { source: params.source, capacity: params.capacity, storage: params.storage, quality: params.quality },
    generation: { capacityFactor: rng.nextF64() * 0.4 + 0.2, degradation: rng.nextF64() * 0.01, lifetime: rng.nextF64() * 10 + 20 },
    grid: { voltage: params.capacity > 100 ? 345 : 138, interconnection: rng.nextF64() > 0.5, smartGrid: true },
    economics: { lcoe: rng.nextF64() * 0.08 + 0.02, capex: params.capacity * (rng.nextF64() * 2000 + 500), ppa: rng.nextF64() * 0.08 + 0.03 }
  };

  const dir = path.dirname(outputPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const jsonPath = outputPath.replace(/\.json$/, '_renewable_energy.json');
  fs.writeFileSync(jsonPath, JSON.stringify(config, null, 2));

  const layoutPath = outputPath.replace(/\.json$/, '_plant.svg');
  fs.writeFileSync(layoutPath, generateSVG(params, rng));

  return { filePath: jsonPath, layoutPath, source: params.source };
}

function generateSVG(params: RenewableEnergyParams, rng: Xoshiro256StarStar): string {
  return `<?xml version="1.0"?>
<svg width="800" height="600" xmlns="http://www.w3.org/2000/svg">
  <rect width="100%" height="100%" fill="#1a2a1a"/>
  <text x="400" y="30" text-anchor="middle" font-size="20" fill="white">${params.source.toUpperCase()} — ${params.capacity} MW</text>
  ${Array.from({ length: 8 }, (_, i) => `<circle cx="${i%4*160+120}" cy="${Math.floor(i/4)*250+150}" r="60" fill="#2a3a2a" stroke="#4a4" stroke-width="2"/>`).join('\n  ')}
  <text x="400" y="570" text-anchor="middle" font-size="12" fill="#aaa">Paradigm GSPL — Renewable Energy</text>
</svg>`;
}

function extractParams(seed: Seed, rng: Xoshiro256StarStar): RenewableEnergyParams {
  const quality = seed.genes?.quality?.value || 'medium';
  return {
    source: seed.genes?.source?.value || ['solar', 'wind', 'hydro', 'geothermal', 'tidal'][rng.nextInt(0, 4)],
    capacity: Math.floor(((seed.genes?.capacity?.value as number || rng.nextF64()) * 990) + 10),
    storage: seed.genes?.storage?.value || ['battery', 'hydrogen', 'pumped_hydro', 'none'][rng.nextInt(0, 3)],
    quality: ['low', 'medium', 'high', 'photorealistic'].includes(quality) ? quality : 'medium'
  };
}
