/**
 * Space Tourism Generator — produces space tourism experiences
 * Orbital flights, lunar tourism, space hotels
 * $0.3T market: Space Tourism
 */

import * as fs from 'fs';
import * as path from 'path';
import type { Seed } from '../engines';
import { Xoshiro256StarStar, rngFromHash } from '../rng';

interface SpaceTourismParams {
  experienceType: 'orbital' | 'suborbital' | 'lunar' | 'space_hotel';
  duration: number; // days
  price: number; // USD
  quality: 'low' | 'medium' | 'high' | 'photorealistic';
}

export async function generateSpaceTourism(seed: Seed, outputPath: string): Promise<{ filePath: string; brochurePath: string; experienceType: string }> {
  const rng = rngFromHash(seed.$hash || '');
  const params = extractParams(seed, rng);

  const config = {
    spaceTourism: { experienceType: params.experienceType, duration: params.duration, price: params.price, quality: params.quality },
    vehicle: { type: params.experienceType === 'suborbital' ? 'New Shepard' : 'Starship', capacity: Math.floor(rng.nextF64() * 10) + 2, gForce: rng.nextF64() * 3 + 2 },
    experience: { weightlessness: params.experienceType !== 'suborbital', earthViews: true, spacewalk: params.experienceType === 'space_hotel' && rng.nextF64() > 0.5, food: 'space_optimized' },
    training: { days: Math.floor(rng.nextF64() * 14) + 3, medical: true, simulations: rng.nextF64() > 0.5 }
  };

  const dir = path.dirname(outputPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const jsonPath = outputPath.replace(/\.json$/, '_space_tourism.json');
  fs.writeFileSync(jsonPath, JSON.stringify(config, null, 2));

  const brochurePath = outputPath.replace(/\.json$/, '_brochure.md');
  fs.writeFileSync(brochurePath, `# ${params.experienceType.toUpperCase()} SPACE EXPERIENCE\n\nDuration: ${params.duration} days\nPrice: $${params.price.toLocaleString()}\n\nExperience weightlessness and see Earth from space!\n\n*Paradigm GSPL — Space Tourism*`);

  return { filePath: jsonPath, brochurePath, experienceType: params.experienceType };
}

function extractParams(seed: Seed, rng: Xoshiro256StarStar): SpaceTourismParams {
  const quality = seed.genes?.quality?.value || 'medium';
  return {
    experienceType: seed.genes?.experienceType?.value || ['orbital', 'suborbital', 'lunar', 'space_hotel'][rng.nextInt(0, 3)],
    duration: Math.floor(((seed.genes?.duration?.value as number || rng.nextF64()) * 27) + 1),
    price: Math.floor(((seed.genes?.price?.value as number || rng.nextF64()) * 99000000) + 100000),
    quality: ['low', 'medium', 'high', 'photorealistic'].includes(quality) ? quality : 'medium'
  };
}
