/**
 * Beer Generator — produces beer designs
 * Craft beer, lagers, ales, IPAs
 * $0.5T market: Beer Industry
 */

import * as fs from 'fs';
import * as path from 'path';
import type { Seed } from '../engines';
import { Xoshiro256StarStar, rngFromHash } from '../rng';

interface BeerParams {
  style: 'lager' | 'ale' | 'ipa' | 'stout' | 'pilsner';
  abv: number; // alcohol by volume
  ibu: number; // bitterness
  quality: 'low' | 'medium' | 'high' | 'photorealistic';
}

export async function generateBeer(seed: Seed, outputPath: string): Promise<{ filePath: string; labelPath: string; style: string }> {
  const rng = rngFromHash(seed.$hash || '');
  const params = extractParams(seed, rng);

  const config = {
    beer: { style: params.style, abv: params.abv, ibu: params.ibu, quality: params.quality },
    brewing: { batchSize: rng.nextF64() * 1000 + 100, fermentation: rng.nextF64() * 14 + 7, conditioning: rng.nextF64() * 30 + 14 },
    ingredients: { malt: ['pale', 'caramel', 'roasted'][rng.nextInt(0, 2)], hops: ['citra', 'saaz', 'fuggles'][rng.nextInt(0, 2)], yeast: ['ale', 'lager'][rng.nextInt(0, 1)] },
    economics: { price: rng.nextF64() * 20 + 5, pack: ['6-pack', '12-pack', 'case'][rng.nextInt(0, 2)], rating: rng.nextF64() * 2 + 3 }
  };

  const dir = path.dirname(outputPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const jsonPath = outputPath.replace(/\.json$/, '_beer.json');
  fs.writeFileSync(jsonPath, JSON.stringify(config, null, 2));

  const labelPath = outputPath.replace(/\.json$/, '_label.svg');
  fs.writeFileSync(labelPath, generateSVG(params, rng));

  return { filePath: jsonPath, labelPath, style: params.style };
}

function generateSVG(params: BeerParams, rng: Xoshiro256StarStar): string {
  return `<?xml version="1.0"?>
<svg width="300" height="500" xmlns="http://www.w3.org/2000/svg">
  <rect width="100%" height="100%" fill="#f4a460"/>
  <text x="150" y="30" text-anchor="middle" font-size="18" fill="#333">${params.style.toUpperCase()}</text>
  <rect x="80" y="80" width="140" height="340" fill="#ffe4b5" stroke="#8b4513" stroke-width="2"/>
  <text x="150" y="270" text-anchor="middle" fill="#333" font-size="14">ABV: ${params.abv}%</text>
  <text x="150" y="470" text-anchor="middle" font-size="12" fill="#aaa">Paradigm GSPL — Beer</text>
</svg>`;
}

function extractParams(seed: Seed, rng: Xoshiro256StarStar): BeerParams {
  const quality = seed.genes?.quality?.value || 'medium';
  return {
    style: seed.genes?.style?.value || ['lager', 'ale', 'ipa', 'stout', 'pilsner'][rng.nextInt(0, 4)],
    abv: (seed.genes?.abv?.value as number || rng.nextF64()) * 10 + 3,
    ibu: Math.floor(((seed.genes?.ibu?.value as number || rng.nextF64()) * 90) + 10),
    quality: ['low', 'medium', 'high', 'photorealistic'].includes(quality) ? quality : 'medium'
  };
}
