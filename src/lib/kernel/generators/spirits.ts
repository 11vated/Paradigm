/**
 * Spirits Generator — produces spirits designs
 * Whiskey, vodka, gin, rum, tequila
 * $0.5T market: Spirits Industry
 */

import * as fs from 'fs';
import * as path from 'path';
import type { Seed } from '../engines';
import { Xoshiro256StarStar, rngFromHash } from '../rng';

interface SpiritsParams {
  type: 'whiskey' | 'vodka' | 'gin' | 'rum' | 'tequila';
  age: number; // years
  abv: number; // alcohol by volume
  quality: 'low' | 'medium' | 'high' | 'photorealistic';
}

export async function generateSpirits(seed: Seed, outputPath: string): Promise<{ filePath: string; labelPath: string; type: string }> {
  const rng = rngFromHash(seed.$hash || '');
  const params = extractParams(seed, rng);

  const config = {
    spirits: { type: params.type, age: params.age, abv: params.abv, quality: params.quality },
    distillation: { runs: params.type === 'vodka' ? 5 : 2, proof: params.abv * 2, barrels: params.type === 'whiskey' ? Math.floor(rng.nextF64() * 100) + 10 : 0 },
    flavor: { profile: ['smooth', 'spicy', 'fruity', 'smoky'][rng.nextInt(0, 3)], notes: Array.from({ length: 3 }, () => ['oak', 'vanilla', 'caramel', 'citrus'][rng.nextInt(0, 3)]) },
    economics: { price: rng.nextF64() * 200 + 20, bottleSize: 750, rating: rng.nextF64() * 2 + 3 }
  };

  const dir = path.dirname(outputPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const jsonPath = outputPath.replace(/\.json$/, '_spirits.json');
  fs.writeFileSync(jsonPath, JSON.stringify(config, null, 2));

  const labelPath = outputPath.replace(/\.json$/, '_label.svg');
  fs.writeFileSync(labelPath, generateSVG(params, rng));

  return { filePath: jsonPath, labelPath, type: params.type };
}

function generateSVG(params: SpiritsParams, rng: Xoshiro256StarStar): string {
  return `<?xml version="1.0"?>
<svg width="300" height="500" xmlns="http://www.w3.org/2000/svg">
  <rect width="100%" height="100%" fill="#8b4513"/>
  <text x="150" y="30" text-anchor="middle" font-size="18" fill="white">${params.type.toUpperCase()}</text>
  <rect x="80" y="80" width="140" height="340" fill="#fff" stroke="#333" stroke-width="2"/>
  <text x="150" y="270" text-anchor="middle" fill="#333" font-size="14">AGE: ${params.age} YEARS</text>
  <text x="150" y="470" text-anchor="middle" font-size="12" fill="#aaa">Paradigm GSPL — Spirits</text>
</svg>`;
}

function extractParams(seed: Seed, rng: Xoshiro256StarStar): SpiritsParams {
  const quality = seed.genes?.quality?.value || 'medium';
  return {
    type: seed.genes?.type?.value || ['whiskey', 'vodka', 'gin', 'rum', 'tequila'][rng.nextInt(0, 4)],
    age: Math.floor(((seed.genes?.age?.value as number || rng.nextF64()) * 30) + 1),
    abv: (seed.genes?.abv?.value as number || rng.nextF64()) * 40 + 35,
    quality: ['low', 'medium', 'high', 'photorealistic'].includes(quality) ? quality : 'medium'
  };
}
