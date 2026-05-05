/**
 * Sports Generator — produces sports facilities and equipment
 * Stadiums, gyms, equipment, training facilities
 * $0.5T market: Sports
 */

import * as fs from 'fs';
import * as path from 'path';
import type { Seed } from '../engines';
import { Xoshiro256StarStar, rngFromHash } from '../rng';

interface SportsParams {
  facilityType: 'stadium' | 'gym' | 'training_center' | 'arena';
  sport: string;
  capacity: number;
  quality: 'low' | 'medium' | 'high' | 'photorealistic';
}

export async function generateSports(seed: Seed, outputPath: string): Promise<{ filePath: string; layoutPath: string; facilityType: string }> {
  const rng = rngFromHash(seed.$hash || '');
  const params = extractParams(seed, rng);

  const config = {
    sports: { facilityType: params.facilityType, sport: params.sport, capacity: params.capacity, quality: params.quality },
    fields: generateFields(params, rng),
    equipment: generateEquipment(params, rng),
    economics: { buildCost: params.capacity * 5000, maintenance: params.capacity * 100, events: Math.floor(rng.nextF64() * 100) + 10 }
  };

  const dir = path.dirname(outputPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const jsonPath = outputPath.replace(/\.json$/, '_sports.json');
  fs.writeFileSync(jsonPath, JSON.stringify(config, null, 2));

  const layoutPath = outputPath.replace(/\.json$/, '_facility.svg');
  fs.writeFileSync(layoutPath, generateSVG(params, rng));

  return { filePath: jsonPath, layoutPath, facilityType: params.facilityType };
}

function generateFields(params: SportsParams, rng: Xoshiro256StarStar): any {
  return {
    count: Math.floor(rng.nextF64() * 5) + 1,
    surfaces: ['grass', 'turf', 'hardwood', 'synthetic'][rng.nextInt(0, 3)],
    lighting: true,
    seating: params.capacity
  };
}

function generateEquipment(params: SportsParams, rng: Xoshiro256StarStar): any {
  return {
    items: Array.from({ length: Math.floor(rng.nextF64() * 20) + 5 }, (_, i) => ({
      name: `Equipment ${i+1}`,
      quantity: Math.floor(rng.nextF64() * 50) + 10,
      condition: ['new', 'good', 'fair'][rng.nextInt(0, 2)]
    }))
  };
}

function generateSVG(params: SportsParams, rng: Xoshiro256StarStar): string {
  return `<?xml version="1.0"?>
<svg width="800" height="600" xmlns="http://www.w3.org/2000/svg">
  <rect width="100%" height="100%" fill="#0a2a0a"/>
  <text x="400" y="30" text-anchor="middle" font-size="20" fill="white">${params.sport} — ${params.facilityType}</text>
  <rect x="150" y="100" width="500" height="300" fill="#1a3a1a" stroke="#4a4" stroke-width="2"/>
  <text x="400" y="270" text-anchor="middle" fill="#4a4" font-size="16">${params.sport.toUpperCase()} FIELD</text>
  <text x="400" y="570" text-anchor="middle" font-size="12" fill="#aaa">Paradigm GSPL — Sports</text>
</svg>`;
}

function extractParams(seed: Seed, rng: Xoshiro256StarStar): SportsParams {
  const quality = seed.genes?.quality?.value || 'medium';
  const sports = ['football', 'basketball', 'soccer', 'tennis', 'swimming', 'track'];
  return {
    facilityType: seed.genes?.facilityType?.value || ['stadium', 'gym', 'training_center', 'arena'][rng.nextInt(0, 3)],
    sport: seed.genes?.sport?.value || sports[rng.nextInt(0, sports.length - 1)],
    capacity: Math.floor(((seed.genes?.capacity?.value as number || rng.nextF64()) * 99000) + 1000),
    quality: ['low', 'medium', 'high', 'photorealistic'].includes(quality) ? quality : 'medium'
  };
}
