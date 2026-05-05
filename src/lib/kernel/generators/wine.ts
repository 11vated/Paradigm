/**
 * Wine Generator — produces wine designs
 * Vineyard, vintages, blends, labels
 * $0.4T market: Wine Industry
 */

import * as fs from 'fs';
import * as path from 'path';
import type { Seed } from '../engines';
import { Xoshiro256StarStar, rngFromHash } from '../rng';

interface WineParams {
  type: 'red' | 'white' | 'rose' | 'sparkling';
  region: string;
  vintage: number;
  quality: 'low' | 'medium' | 'high' | 'photorealistic';
}

export async function generateWine(seed: Seed, outputPath: string): Promise<{ filePath: string; labelPath: string; type: string }> {
  const rng = rngFromHash(seed.$hash || '');
  const params = extractParams(seed, rng);

  const config = {
    wine: { type: params.type, region: params.region, vintage: params.vintage, quality: params.quality },
    vineyard: { size: rng.nextF64() * 1000 + 10, soil: ['clay', 'limestone', 'sand', 'gravel'][rng.nextInt(0, 3)], altitude: rng.nextF64() * 1000 + 100 },
    tasting: { acidity: rng.nextF64(), tannins: rng.nextF64(), fruit: rng.nextF64(), oak: rng.nextF64() > 0.5 },
    economics: { price: rng.nextF64() * 500 + 10, production: rng.nextF64() * 100000, rating: rng.nextF64() * 2 + 3 }
  };

  const dir = path.dirname(outputPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const jsonPath = outputPath.replace(/\.json$/, '_wine.json');
  fs.writeFileSync(jsonPath, JSON.stringify(config, null, 2));

  const labelPath = outputPath.replace(/\.json$/, '_label.svg');
  fs.writeFileSync(labelPath, generateSVG(params, rng));

  return { filePath: jsonPath, labelPath, type: params.type };
}

function generateSVG(params: WineParams, rng: Xoshiro256StarStar): string {
  return `<?xml version="1.0"?>
<svg width="400" height="600" xmlns="http://www.w3.org/2000/svg">
  <rect width="100%" height="100%" fill="#8b0000"/>
  <text x="200" y="30" text-anchor="middle" font-size="20" fill="white">${params.type.toUpperCase()} ${params.vintage}</text>
  <rect x="100" y="100" width="200" height="400" fill="#fff" stroke="#333" stroke-width="2"/>
  <text x="200" y="320" text-anchor="middle" fill="#333" font-size="16">${params.region}</text>
  <text x="200" y="570" text-anchor="middle" font-size="12" fill="#aaa">Paradigm GSPL — Wine</text>
</svg>`;
}

function extractParams(seed: Seed, rng: Xoshiro256StarStar): WineParams {
  const quality = seed.genes?.quality?.value || 'medium';
  const regions = ['Bordeaux', 'Napa', 'Tuscany', 'Rioja', 'Barossa'];
  return {
    type: seed.genes?.type?.value || ['red', 'white', 'rose', 'sparkling'][rng.nextInt(0, 3)],
    region: seed.genes?.region?.value || regions[rng.nextInt(0, regions.length - 1)],
    vintage: Math.floor(((seed.genes?.vintage?.value as number || rng.nextF64()) * 44) + 1980),
    quality: ['low', 'medium', 'high', 'photorealistic'].includes(quality) ? quality : 'medium'
  };
}
