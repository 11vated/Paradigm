/**
 * Tourism Generator — produces tourism experiences
 * Hotels, resorts, tours, eco-tourism
 * $1T market: Tourism & Hospitality
 */

import * as fs from 'fs';
import * as path from 'path';
import type { Seed } from '../engines';
import { Xoshiro256StarStar, rngFromHash } from '../rng';

interface TourismParams {
  experienceType: 'hotel' | 'resort' | 'tour' | 'cruise' | 'eco';
  duration: number; // days
  capacity: number; // guests
  quality: 'low' | 'medium' | 'high' | 'photorealistic';
}

export async function generateTourism(seed: Seed, outputPath: string): Promise<{ filePath: string; brochurePath: string; experienceType: string }> {
  const rng = rngFromHash(seed.$hash || '');
  const params = extractParams(seed, rng);

  const experience = generateExperience(params, rng);
  const amenities = generateAmenities(params, rng);
  const pricing = generatePricing(params, rng);

  const config = {
    tourism: { experienceType: params.experienceType, duration: params.duration, capacity: params.capacity, quality: params.quality },
    experience,
    amenities,
    pricing,
    sustainability: {
      carbonOffset: rng.nextF64() > 0.5,
      localSourcing: rng.nextF64() * 0.8 + 0.2,
      conservation: rng.nextF64() > 0.6
    }
  };

  const dir = path.dirname(outputPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const jsonPath = outputPath.replace(/\.json$/, '_tourism.json');
  fs.writeFileSync(jsonPath, JSON.stringify(config, null, 2));

  const brochurePath = outputPath.replace(/\.json$/, '_brochure.md');
  fs.writeFileSync(brochurePath, generateBrochure(params, rng));

  return { filePath: jsonPath, brochurePath, experienceType: params.experienceType };
}

function generateExperience(params: TourismParams, rng: Xoshiro256StarStar): any {
  return {
    activities: ['hiking', 'swimming', 'sightseeing', 'dining', 'spa'].slice(0, Math.floor(rng.nextF64() * 5) + 1),
    highlights: Array.from({ length: 3 }, () => `Amazing experience ${rng.nextInt(1, 100)}`),
    rating: rng.nextF64() * 2 + 3 // 3-5 stars
  };
}

function generateAmenities(params: TourismParams, rng: Xoshiro256StarStar): any {
  return {
    rooms: params.experienceType === 'hotel' || params.experienceType === 'resort' ? Math.floor(rng.nextF64() * 500) + 50 : 0,
    restaurants: Math.floor(rng.nextF64() * 5) + 1,
    pools: Math.floor(rng.nextF64() * 3),
    wifi: true,
    parking: rng.nextF64() > 0.3
  };
}

function generatePricing(params: TourismParams, rng: Xoshiro256StarStar): any {
  return {
    pricePerNight: rng.nextF64() * 500 + 50,
    package: rng.nextF64() * 2000 + 200,
    discounts: Math.floor(rng.nextF64() * 3),
    cancellation: ['free', 'partial', 'none'][rng.nextInt(0, 2)]
  };
}

function generateBrochure(params: TourismParams, rng: Xoshiro256StarStar): string {
  return `# ${params.experienceType.toUpperCase()} EXPERIENCE\n\nDuration: ${params.duration} days\nCapacity: ${params.capacity} guests\n\n## Activities\n- Hiking\n- Dining\n- Sightseeing\n\nBook now for an unforgettable experience!\n\n*Paradigm GSPL Beyond Omega — Tourism*`;
}

function extractParams(seed: Seed, rng: Xoshiro256StarStar): TourismParams {
  const quality = seed.genes?.quality?.value || 'medium';
  return {
    experienceType: seed.genes?.experienceType?.value || ['hotel', 'resort', 'tour', 'cruise', 'eco'][rng.nextInt(0, 4)],
    duration: Math.floor(((seed.genes?.duration?.value as number || rng.nextF64()) * 27) + 3),
    capacity: Math.floor(((seed.genes?.capacity?.value as number || rng.nextF64()) * 9900) + 100),
    quality: ['low', 'medium', 'high', 'photorealistic'].includes(quality) ? quality : 'medium'
  };
}
