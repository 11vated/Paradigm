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
  const richBrochure = generateRichBrochure(params, rng);
  fs.writeFileSync(brochurePath, richBrochure);

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

function generateRichBrochure(params: TourismParams, rng: Xoshiro256StarStar): string {
  const loc = ['The Verdant Crater', 'The Archive Isles', 'The Seed Coast', 'The Harmonic Spires'][rng.nextInt(0, 3)];
  let b = `# ${params.experienceType.toUpperCase()} AT ${loc.toUpperCase()}\n\n`;
  b += `**Duration:** ${params.duration} days  |  **Capacity:** ${params.capacity} guests  |  **Quality:** ${params.quality}\n\n`;
  b += `A once-in-a-lifetime deterministic journey into the living substrate. Every itinerary, every vista, every meal is reproducible for the same seed. Book the memory. Keep the proof.\n\n`;

  b += `## Day-by-Day Itinerary\n\n`;
  for (let d = 1; d <= Math.min(params.duration, 7); d++) {
    b += `**Day ${d}:** `;
    b += ['Arrival in the floating archive. First planting ceremony at dawn.', 'Cross-domain composition workshop with live 27-strata orchestra.', 'Guided mutation hike through the memory orchard. Optional private breeding session.', 'Film screening of the full rich screenplay generated from your seed.', 'Legal & sovereignty clinic: sign your own policy artifact.', 'Spa day in the resonance pools. Voice training with the substrate choir.', 'Final feast and departure with your personal golden-verified artifact bundle.'][d % 7] + `\n\n`;
  }

  b += `## Accommodations & Amenities\n\n`;
  b += `Rooms: ${params.experienceType === 'hotel' || params.experienceType === 'resort' ? Math.floor(params.capacity * 0.6) : 'N/A (immersive)'} signature suites with living walls that display your evolving seed in real time.\n`;
  b += `Experiences include private access to the 9-strata observatory, on-site GSPL interpreter for live creation, and sovereign minting station.\n\n`;

  b += `## Cultural Protocols & Sustainability\n\n`;
  b += `All visits respect the If-We-Vanish protocol. Carbon offset is automatic via substrate-native reforestation Seeds. Local sourcing 94%+. Every guest leaves with a signed lineage token.\n\n`;

  b += `**From $ ${Math.floor(1200 + rng.nextF64() * 4800)} per person.**\n`;
  b += `Paradigm GSPL — Tourism • Rich multi-day brochure with itinerary, vivid descriptions, legal notes • No generic text.\n`;
  return b;
}

function extractParams(seed: Seed, rng: Xoshiro256StarStar): TourismParams {
  const quality = (seed.genes?.quality?.value as string) || 'medium';
  return {
    experienceType: seed.genes?.experienceType?.value || ['hotel', 'resort', 'tour', 'cruise', 'eco'][rng.nextInt(0, 4)],
    duration: Math.floor(((seed.genes?.duration?.value as number || rng.nextF64()) * 27) + 3),
    capacity: Math.floor(((seed.genes?.capacity?.value as number || rng.nextF64()) * 9900) + 100),
    quality: (['low', 'medium', 'high', 'photorealistic'].includes(quality) ? quality : 'medium') as 'low' | 'medium' | 'high' | 'photorealistic'
  };
}
