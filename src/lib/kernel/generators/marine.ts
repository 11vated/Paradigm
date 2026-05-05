/**
 * Marine Generator — produces marine vessel designs
 * Cargo ships, tankers, cruise ships, submarines
 * $0.5T market: Maritime
 */

import * as fs from 'fs';
import * as path from 'path';
import type { Seed } from '../engines';
import { Xoshiro256StarStar, rngFromHash } from '../rng';

interface MarineParams {
  vesselType: 'cargo' | 'tanker' | 'cruise' | 'submarine' | 'yacht';
  length: number; // meters
  deadweight: number; // tons
  quality: 'low' | 'medium' | 'high' | 'photorealistic';
}

export async function generateMarine(seed: Seed, outputPath: string): Promise<{ filePath: string; layoutPath: string; vesselType: string }> {
  const rng = rngFromHash(seed.$hash || '');
  const params = extractParams(seed, rng);

  const design = generateDesign(params, rng);
  const propulsion = generatePropulsion(params, rng);
  const navigation = generateNavigation(params, rng);

  const config = {
    marine: { vesselType: params.vesselType, length: params.length, deadweight: params.deadweight, quality: params.quality },
    design,
    propulsion,
    navigation,
    economics: {
      buildCost: params.deadweight * (rng.nextF64() * 1000 + 500),
      dailyOpCost: rng.nextF64() * 50000 + 10000,
      cargoRate: rng.nextF64() * 100 + 20 // USD per ton
    }
  };

  const dir = path.dirname(outputPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const jsonPath = outputPath.replace(/\.json$/, '_marine.json');
  fs.writeFileSync(jsonPath, JSON.stringify(config, null, 2));

  const layoutPath = outputPath.replace(/\.json$/, '_layout.svg');
  fs.writeFileSync(layoutPath, generateLayoutSVG(params, rng));

  return { filePath: jsonPath, layoutPath, vesselType: params.vesselType };
}

function generateDesign(params: MarineParams, rng: Xoshiro256StarStar): any {
  return {
    beam: params.length * (rng.nextF64() * 0.1 + 0.1), // width
    draft: params.length * (rng.nextF64() * 0.05 + 0.03), // depth below water
    grossTonnage: params.deadweight * (rng.nextF64() * 0.5 + 0.5),
    crew: Math.floor(rng.nextF64() * 30) + 10,
    passengers: params.vesselType === 'cruise' ? Math.floor(rng.nextF64() * 5000) + 1000 : 0
  };
}

function generatePropulsion(params: MarineParams, rng: Xoshiro256StarStar): any {
  return {
    type: params.vesselType === 'submarine' ? 'nuclear' : 'diesel_electric',
    power: rng.nextF64() * 50000 + 10000, // kW
    speed: rng.nextF64() * 15 + 10, // knots
    fuelCapacity: rng.nextF64() * 5000 + 1000 // tons
  };
}

function generateNavigation(params: MarineParams, rng: Xoshiro256StarStar): any {
  return {
    radar: true,
    gps: true,
    ais: true,
    autopilot: rng.nextF64() > 0.5,
    weatherRouting: true
  };
}

function generateLayoutSVG(params: MarineParams, rng: Xoshiro256StarStar): string {
  return `<?xml version="1.0"?>
<svg width="800" height="400" xmlns="http://www.w3.org/2000/svg">
  <rect width="100%" height="100%" fill="#0a1628"/>
  <text x="400" y="30" text-anchor="middle" font-size="20" fill="white">${params.vesselType} — ${params.length}m</text>
  <ellipse cx="400" cy="200" rx="${300 + params.length * 0.5}" ry="40" fill="#1a2a3a" stroke="#4aa" stroke-width="2"/>
  <text x="400" y="210" text-anchor="middle" fill="#4aa" font-size="14">${params.vesselType.toUpperCase()}</text>
  <text x="400" y="370" text-anchor="middle" font-size="12" fill="#aaa">Paradigm GSPL — Marine</text>
</svg>`;
}

function extractParams(seed: Seed, rng: Xoshiro256StarStar): MarineParams {
  const quality = seed.genes?.quality?.value || 'medium';
  return {
    vesselType: seed.genes?.vesselType?.value || ['cargo', 'tanker', 'cruise', 'submarine', 'yacht'][rng.nextInt(0, 4)],
    length: Math.floor(((seed.genes?.length?.value as number || rng.nextF64()) * 390) + 10),
    deadweight: Math.floor(((seed.genes?.deadweight?.value as number || rng.nextF64()) * 199000) + 1000),
    quality: ['low', 'medium', 'high', 'photorealistic'].includes(quality) ? quality : 'medium'
  };
}
