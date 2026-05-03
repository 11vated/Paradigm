/**
 * Entertainment Generator — produces entertainment venues
 * Theaters, stadiums, amusement parks, casinos
 * $0.8T market: Entertainment
 */

import * as fs from 'fs';
import * as path from 'path';
import type { Seed } from '../engines';
import { Xoshiro256StarStar, rngFromHash } from '../rng';

interface EntertainmentParams {
  venueType: 'theater' | 'stadium' | 'amusement_park' | 'casino';
  capacity: number;
  attractionCount: number;
  quality: 'low' | 'medium' | 'high' | 'photorealistic';
}

export async function generateEntertainment(seed: Seed, outputPath: string): Promise<{ filePath: string; layoutPath: string; venueType: string }> {
  const rng = rngFromHash(seed.$hash || '');
  const params = extractParams(seed, rng);

  const config = {
    entertainment: { venueType: params.venueType, capacity: params.capacity, attractionCount: params.attractionCount, quality: params.quality },
    attractions: generateAttractions(params, rng),
    amenities: generateAmenities(params, rng),
    economics: { ticketPrice: rng.nextF64() * 200 + 20, annualVisitors: params.capacity * 50, revenue: rng.nextF64() * 100e6 + 10e6 }
  };

  const dir = path.dirname(outputPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const jsonPath = outputPath.replace(/\.json$/, '_entertainment.json');
  fs.writeFileSync(jsonPath, JSON.stringify(config, null, 2));

  const layoutPath = outputPath.replace(/\.json$/, '_venue.svg');
  fs.writeFileSync(layoutPath, generateSVG(params, rng));

  return { filePath: jsonPath, layoutPath, venueType: params.venueType };
}

function generateAttractions(params: EntertainmentParams, rng: Xoshiro256StarStar): any {
  return {
    list: Array.from({ length: params.attractionCount }, (_, i) => ({
      name: `Attraction ${i+1}`,
      type: ['ride', 'show', 'game', 'exhibit'][rng.nextInt(0, 3)],
      thrill: rng.nextF64()
    }))
  };
}

function generateAmenities(params: EntertainmentParams, rng: Xoshiro256StarStar): any {
  return {
    restaurants: Math.floor(rng.nextF64() * 20) + 5,
    restrooms: Math.floor(params.capacity / 200) + 2,
    parking: params.capacity * 0.5,
    vip: rng.nextF64() > 0.5
  };
}

function generateSVG(params: EntertainmentParams, rng: Xoshiro256StarStar): string {
  return `<?xml version="1.0"?>
<svg width="800" height="600" xmlns="http://www.w3.org/2000/svg">
  <rect width="100%" height="100%" fill="#1a1a2a"/>
  <text x="400" y="30" text-anchor="middle" font-size="20" fill="white">${params.venueType} — ${params.capacity} capacity</text>
  <ellipse cx="400" cy="300" rx="300" ry="200" fill="#2a2a3a" stroke="#4a4" stroke-width="2"/>
  <text x="400" y="310" text-anchor="middle" fill="#4a4" font-size="16">${params.venueType.toUpperCase()}</text>
  <text x="400" y="570" text-anchor="middle" font-size="12" fill="#aaa">Paradigm GSPL — Entertainment</text>
</svg>`;
}

function extractParams(seed: Seed, rng: Xoshiro256StarStar): EntertainmentParams {
  const quality = seed.genes?.quality?.value || 'medium';
  return {
    venueType: seed.genes?.venueType?.value || ['theater', 'stadium', 'amusement_park', 'casino'][rng.nextInt(0, 3)],
    capacity: Math.floor(((seed.genes?.capacity?.value as number || rng.nextF64()) * 99000) + 1000),
    attractionCount: Math.floor(((seed.genes?.attractionCount?.value as number || rng.nextF64()) * 48) + 2),
    quality: ['low', 'medium', 'high', 'photorealistic'].includes(quality) ? quality : 'medium'
  };
}
