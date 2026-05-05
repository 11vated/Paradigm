/**
 * Gardening Generator — produces gardening designs
 * Vegetable gardens, flower beds, landscapes, urban gardens
 * $0.2T market: Gardening Industry
 */

import * as fs from 'fs';
import * as path from 'path';
import type { Seed } from '../engines';
import { Xoshiro256StarStar, rngFromHash } from '../rng';

interface GardeningParams {
  gardenType: 'vegetable' | 'flower' | 'herb' | 'succulent' | 'rock';
  size: number; // sq meters
  season: 'spring' | 'summer' | 'fall' | 'winter';
  quality: 'low' | 'medium' | 'high' | 'photorealistic';
}

export async function generateGardening(seed: Seed, outputPath: string): Promise<{ filePath: string; layoutPath: string; gardenType: string }> {
  const rng = rngFromHash(seed.$hash || '');
  const params = extractParams(seed, rng);

  const config = {
    gardening: { gardenType: params.gardenType, size: params.size, season: params.season, quality: params.quality },
    plants: Array.from({ length: Math.floor(rng.nextF64() * 20) + 5 }, () => ({ name: `Plant ${rng.nextInt(1, 50)}`, type: params.gardenType, spacing: rng.nextF64() * 0.5 + 0.1 })),
    features: ['path', 'pond', 'bench', 'trellis'].slice(0, Math.floor(rng.nextF64() * 4) + 1),
    maintenance: { watering: rng.nextF64() > 0.5, fertilizing: rng.nextF64() > 0.5, pruning: rng.nextF64() > 0.3, pestControl: rng.nextF64() > 0.5 }
  };

  const dir = path.dirname(outputPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const jsonPath = outputPath.replace(/\.json$/, '_gardening.json');
  fs.writeFileSync(jsonPath, JSON.stringify(config, null, 2));

  const layoutPath = outputPath.replace(/\.json$/, '_layout.svg');
  fs.writeFileSync(layoutPath, generateSVG(params, rng));

  return { filePath: jsonPath, layoutPath, gardenType: params.gardenType };
}

function generateSVG(params: GardeningParams, rng: Xoshiro256StarStar): string {
  return `<?xml version="1.0"?>
<svg width="800" height="600" xmlns="http://www.w3.org/2000/svg">
  <rect width="100%" height="100%" fill="#228b22"/>
  <text x="400" y="30" text-anchor="middle" font-size="20" fill="white">${params.gardenType.toUpperCase()} GARDEN</text>
  ${Array.from({ length: 15 }, (_, i) => `<circle cx="${rng.nextF64()*700+50}" cy="${rng.nextF64()*400+80}" r="${rng.nextF64()*15+5}" fill="#32cd32"/>`).join('\n  ')}
  <text x="400" y="570" text-anchor="middle" font-size="12" fill="#aaa">Paradigm GSPL — Gardening</text>
</svg>`;
}

function extractParams(seed: Seed, rng: Xoshiro256StarStar): GardeningParams {
  const quality = seed.genes?.quality?.value || 'medium';
  return {
    gardenType: seed.genes?.gardenType?.value || ['vegetable', 'flower', 'herb', 'succulent', 'rock'][rng.nextInt(0, 4)],
    size: Math.floor(((seed.genes?.size?.value as number || rng.nextF64()) * 9900) + 100),
    season: seed.genes?.season?.value || ['spring', 'summer', 'fall', 'winter'][rng.nextInt(0, 3)],
    quality: ['low', 'medium', 'high', 'photorealistic'].includes(quality) ? quality : 'medium'
  };
}
