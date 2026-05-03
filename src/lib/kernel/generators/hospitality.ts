/**
 * Hospitality Generator — produces hospitality designs
 * Hotels, resorts, serviced apartments
 * $1T market: Hospitality
 */

import * as fs from 'fs';
import * as path from 'path';
import type { Seed } from '../engines';
import { Xoshiro256StarStar, rngFromHash } from '../rng';

interface HospitalityParams {
  propertyType: 'hotel' | 'resort' | 'serviced_apartment' | 'hostel';
  rooms: number;
  starRating: number; // 1-5
  quality: 'low' | 'medium' | 'high' | 'photorealistic';
}

export async function generateHospitality(seed: Seed, outputPath: string): Promise<{ filePath: string; layoutPath: string; propertyType: string }> {
  const rng = rngFromHash(seed.$hash || '');
  const params = extractParams(seed, rng);

  const config = {
    hospitality: { propertyType: params.propertyType, rooms: params.rooms, starRating: params.starRating, quality: params.quality },
    amenities: { restaurants: Math.floor(rng.nextF64() * 5) + 1, pool: rng.nextF64() > 0.5, gym: rng.nextF64() > 0.3, spa: rng.nextF64() > 0.6 },
    services: ['room_service', 'concierge', 'valet', 'laundry'].slice(0, Math.floor(rng.nextF64() * 4) + 1),
    economics: { adr: rng.nextF64() * 300 + 50, occupancy: rng.nextF64() * 0.3 + 0.6, revpar: rng.nextF64() * 200 + 40 }
  };

  const dir = path.dirname(outputPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const jsonPath = outputPath.replace(/\.json$/, '_hospitality.json');
  fs.writeFileSync(jsonPath, JSON.stringify(config, null, 2));

  const layoutPath = outputPath.replace(/\.json$/, '_layout.svg');
  fs.writeFileSync(layoutPath, generateSVG(params, rng));

  return { filePath: jsonPath, layoutPath, propertyType: params.propertyType };
}

function generateSVG(params: HospitalityParams, rng: Xoshiro256StarStar): string {
  return `<?xml version="1.0"?>
<svg width="800" height="600" xmlns="http://www.w3.org/2000/svg">
  <rect width="100%" height="100%" fill="#f5f0e8"/>
  <text x="400" y="30" text-anchor="middle" font-size="20" fill="#333">${params.propertyType} — ${params.starRating} Stars</text>
  ${Array.from({ length: Math.min(params.rooms / 20, 20) }, (_, i) => `<rect x="${i%5*140+80}" y="${Math.floor(i/5)*120+80}" width="120" height="100" fill="#fff" stroke="#333" stroke-width="1"/>`).join('\n  ')}
  <text x="400" y="570" text-anchor="middle" font-size="12" fill="#aaa">Paradigm GSPL — Hospitality</text>
</svg>`;
}

function extractParams(seed: Seed, rng: Xoshiro256StarStar): HospitalityParams {
  const quality = seed.genes?.quality?.value || 'medium';
  return {
    propertyType: seed.genes?.propertyType?.value || ['hotel', 'resort', 'serviced_apartment', 'hostel'][rng.nextInt(0, 3)],
    rooms: Math.floor(((seed.genes?.rooms?.value as number || rng.nextF64()) * 990) + 10),
    starRating: Math.floor(((seed.genes?.starRating?.value as number || rng.nextF64()) * 4) + 1),
    quality: ['low', 'medium', 'high', 'photorealistic'].includes(quality) ? quality : 'medium'
  };
}
