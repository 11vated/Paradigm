/**
 * Coffee Generator — produces coffee designs
 * Beans, roasts, blends, brewing methods
 * $0.5T market: Coffee Industry
 */

import * as fs from 'fs';
import * as path from 'path';
import type { Seed } from '../engines';
import { Xoshiro256StarStar, rngFromHash } from '../rng';

interface CoffeeParams {
  bean: 'arabica' | 'robusta' | 'liberica' | 'excelsa';
  roast: 'light' | 'medium' | 'dark' | 'espresso';
  origin: string;
  quality: 'low' | 'medium' | 'high' | 'photorealistic';
}

export async function generateCoffee(seed: Seed, outputPath: string): Promise<{ filePath: string; bagPath: string; bean: string }> {
  const rng = rngFromHash(seed.$hash || '');
  const params = extractParams(seed, rng);

  const config = {
    coffee: { bean: params.bean, roast: params.roast, origin: params.origin, quality: params.quality },
    profile: { acidity: rng.nextF64(), body: rng.nextF64(), aroma: rng.nextF64(), flavor: ['fruity', 'nutty', 'chocolatey', 'floral'][rng.nextInt(0, 3)] },
    brewing: { method: ['espresso', 'pour_over', 'french_press', 'cold_brew'][rng.nextInt(0, 3)], temp: rng.nextF64() * 30 + 85, ratio: rng.nextF64() * 5 + 10 },
    economics: { price: rng.nextF64() * 50 + 10, bagSize: 340, rating: rng.nextF64() * 2 + 3 }
  };

  const dir = path.dirname(outputPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const jsonPath = outputPath.replace(/\.json$/, '_coffee.json');
  fs.writeFileSync(jsonPath, JSON.stringify(config, null, 2));

  const bagPath = outputPath.replace(/\.json$/, '_bag.svg');
  fs.writeFileSync(bagPath, generateSVG(params, rng));

  return { filePath: jsonPath, bagPath, bean: params.bean };
}

function generateSVG(params: CoffeeParams, rng: Xoshiro256StarStar): string {
  return `<?xml version="1.0"?>
<svg width="400" height="500" xmlns="http://www.w3.org/2000/svg">
  <rect width="100%" height="100%" fill="#8b4513"/>
  <text x="200" y="30" text-anchor="middle" font-size="18" fill="white">${params.bean.toUpperCase()}</text>
  <rect x="100" y="80" width="200" height="340" fill="#d2691e" stroke="#333" stroke-width="2"/>
  <text x="200" y="270" text-anchor="middle" fill="white" font-size="14">${params.roast.toUpperCase()}</text>
  <text x="200" y="470" text-anchor="middle" font-size="12" fill="#aaa">Paradigm GSPL — Coffee</text>
</svg>`;
}

function extractParams(seed: Seed, rng: Xoshiro256StarStar): CoffeeParams {
  const quality = seed.genes?.quality?.value || 'medium';
  const origins = ['Ethiopia', 'Colombia', 'Brazil', 'Guatemala', 'Kenya'];
  return {
    bean: seed.genes?.bean?.value || ['arabica', 'robusta', 'liberica', 'excelsa'][rng.nextInt(0, 3)],
    roast: seed.genes?.roast?.value || ['light', 'medium', 'dark', 'espresso'][rng.nextInt(0, 3)],
    origin: seed.genes?.origin?.value || origins[rng.nextInt(0, origins.length - 1)],
    quality: ['low', 'medium', 'high', 'photorealistic'].includes(quality) ? quality : 'medium'
  };
}
