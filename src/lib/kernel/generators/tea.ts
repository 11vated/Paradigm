/**
 * Tea Generator — produces tea designs
 * Green, black, oolong, white, herbal teas
 * $0.2T market: Tea Industry
 */

import * as fs from 'fs';
import * as path from 'path';
import type { Seed } from '../engines';
import { Xoshiro256StarStar, rngFromHash } from '../rng';

interface TeaParams {
  type: 'green' | 'black' | 'oolong' | 'white' | 'herbal';
  origin: string;
  grade: string;
  quality: 'low' | 'medium' | 'high' | 'photorealistic';
}

export async function generateTea(seed: Seed, outputPath: string): Promise<{ filePath: string; tinPath: string; type: string }> {
  const rng = rngFromHash(seed.$hash || '');
  const params = extractParams(seed, rng);

  const config = {
    tea: { type: params.type, origin: params.origin, grade: params.grade, quality: params.quality },
    profile: { aroma: rng.nextF64(), body: rng.nextF64(), astringency: rng.nextF64(), flavor: ['floral', 'fruity', 'earthy', 'vegetal'][rng.nextInt(0, 3)] },
    brewing: { temp: rng.nextF64() * 50 + 70, time: rng.nextF64() * 3 + 2, multiple: rng.nextF64() > 0.5 },
    economics: { price: rng.nextF64() * 100 + 5, tinSize: 100, rating: rng.nextF64() * 2 + 3 }
  };

  const dir = path.dirname(outputPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const jsonPath = outputPath.replace(/\.json$/, '_tea.json');
  fs.writeFileSync(jsonPath, JSON.stringify(config, null, 2));

  const tinPath = outputPath.replace(/\.json$/, '_tin.svg');
  fs.writeFileSync(tinPath, generateSVG(params, rng));

  return { filePath: jsonPath, tinPath, type: params.type };
}

function generateSVG(params: TeaParams, rng: Xoshiro256StarStar): string {
  return `<?xml version="1.0"?>
<svg width="400" height="500" xmlns="http://www.w3.org/2000/svg">
  <rect width="100%" height="100%" fill="#228b22"/>
  <text x="200" y="30" text-anchor="middle" font-size="18" fill="white">${params.type.toUpperCase()} TEA</text>
  <rect x="120" y="80" width="160" height="340" fill="#fff" stroke="#333" stroke-width="2"/>
  <text x="200" y="270" text-anchor="middle" fill="#333" font-size="14">${params.origin}</text>
  <text x="200" y="470" text-anchor="middle" font-size="12" fill="#aaa">Paradigm GSPL — Tea</text>
</svg>`;
}

function extractParams(seed: Seed, rng: Xoshiro256StarStar): TeaParams {
  const quality = seed.genes?.quality?.value || 'medium';
  const origins = ['China', 'India', 'Sri Lanka', 'Japan', 'Taiwan'];
  return {
    type: seed.genes?.type?.value || ['green', 'black', 'oolong', 'white', 'herbal'][rng.nextInt(0, 4)],
    origin: seed.genes?.origin?.value || origins[rng.nextInt(0, origins.length - 1)],
    grade: seed.genes?.grade?.value || ['OP', 'BOP', 'FOP', 'GFOP'][rng.nextInt(0, 3)],
    quality: ['low', 'medium', 'high', 'photorealistic'].includes(quality) ? quality : 'medium'
  };
}
