/**
 * Smart Grid Generator — produces smart grid designs
 * Demand response, grid storage, smart meters
 * $0.3T market: Smart Grid
 */

import * as fs from 'fs';
import * as path from 'path';
import type { Seed } from '../engines';
import { Xoshiro256StarStar, rngFromHash } from '../rng';

interface SmartGridParams {
  gridType: 'transmission' | 'distribution' | 'microgrid' | 'virtual_power_plant';
  capacity: number; // MW
  iotDevices: number;
  quality: 'low' | 'medium' | 'high' | 'photorealistic';
}

export async function generateSmartGrid(seed: Seed, outputPath: string): Promise<{ filePath: string; diagramPath: string; gridType: string }> {
  const rng = rngFromHash(seed.$hash || '');
  const params = extractParams(seed, rng);

  const config = {
    smartGrid: { gridType: params.gridType, capacity: params.capacity, iotDevices: params.iotDevices, quality: params.quality },
    infrastructure: { substations: Math.floor(rng.nextF64() * 50) + 10, feeders: Math.floor(rng.nextF64() * 100) + 20, smartMeters: params.iotDevices },
    controls: { demandResponse: rng.nextF64() > 0.5, voltVar: rng.nextF64() > 0.3, faultDetection: true, selfHealing: rng.nextF64() > 0.5 },
    economics: { capex: params.capacity * (rng.nextF64() * 1000 + 200), opex: params.capacity * (rng.nextF64() * 50 + 10), saidi: rng.nextF64() * 2 }
  };

  const dir = path.dirname(outputPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const jsonPath = outputPath.replace(/\.json$/, '_smart_grid.json');
  fs.writeFileSync(jsonPath, JSON.stringify(config, null, 2));

  const diagramPath = outputPath.replace(/\.json$/, '_diagram.svg');
  fs.writeFileSync(diagramPath, generateSVG(params, rng));

  return { filePath: jsonPath, diagramPath, gridType: params.gridType };
}

function generateSVG(params: SmartGridParams, rng: Xoshiro256StarStar): string {
  return `<?xml version="1.0"?>
<svg width="800" height="600" xmlns="http://www.w3.org/2000/svg">
  <rect width="100%" height="100%" fill="#0a1a2a"/>
  <text x="400" y="30" text-anchor="middle" font-size="20" fill="white">${params.gridType.toUpperCase()} — ${params.capacity} MW</text>
  ${Array.from({ length: 10 }, (_, i) => `<circle cx="${rng.nextF64()*700+50}" cy="${rng.nextF64()*400+80}" r="20" fill="#4a4" opacity="0.7"/>`).join('\n  ')}
  <text x="400" y="570" text-anchor="middle" font-size="12" fill="#aaa">Paradigm GSPL — Smart Grid</text>
</svg>`;
}

function extractParams(seed: Seed, rng: Xoshiro256StarStar): SmartGridParams {
  const quality = seed.genes?.quality?.value || 'medium';
  return {
    gridType: seed.genes?.gridType?.value || ['transmission', 'distribution', 'microgrid', 'virtual_power_plant'][rng.nextInt(0, 3)],
    capacity: Math.floor(((seed.genes?.capacity?.value as number || rng.nextF64()) * 990) + 10),
    iotDevices: Math.floor(((seed.genes?.iotDevices?.value as number || rng.nextF64()) * 990000) + 10000),
    quality: ['low', 'medium', 'high', 'photorealistic'].includes(quality) ? quality : 'medium'
  };
}
