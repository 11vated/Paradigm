/**
 * Textiles Generator — produces textile designs
 * Fabrics, carpets, upholstery, technical textiles
 * $0.8T market: Textiles
 */

import * as fs from 'fs';
import * as path from 'path';
import type { Seed } from '../engines';
import { Xoshiro256StarStar, rngFromHash } from '../rng';

interface TextilesParams {
  type: 'fabric' | 'carpet' | 'upholstery' | 'technical';
  fiber: string;
  weave: string;
  quality: 'low' | 'medium' | 'high' | 'photorealistic';
}

export async function generateTextiles(seed: Seed, outputPath: string): Promise<{ filePath: string; designPath: string; type: string }> {
  const rng = rngFromHash(seed.$hash || '');
  const params = extractParams(seed, rng);

  const config = {
    textiles: { type: params.type, fiber: params.fiber, weave: params.weave, quality: params.quality },
    specifications: { width: rng.nextF64() * 2 + 0.5, weight: rng.nextF64() * 300 + 50, colorfastness: rng.nextF64() * 4 + 1, shrinkage: rng.nextF64() * 5 },
    production: { capacity: rng.nextF64() * 1000000, leadTime: rng.nextF64() * 60 + 14, moq: Math.floor(rng.nextF64() * 5000) + 500 },
    pricing: { perMeter: rng.nextF64() * 50 + 5, cost: rng.nextF64() * 20 + 1, margin: rng.nextF64() * 0.4 + 0.1 }
  };

  const dir = path.dirname(outputPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const jsonPath = outputPath.replace(/\.json$/, '_textiles.json');
  fs.writeFileSync(jsonPath, JSON.stringify(config, null, 2));

  const designPath = outputPath.replace(/\.json$/, '_pattern.svg');
  fs.writeFileSync(designPath, generateSVG(params, rng));

  return { filePath: jsonPath, designPath, type: params.type };
}

function generateSVG(params: TextilesParams, rng: Xoshiro256StarStar): string {
  return `<?xml version="1.0"?>
<svg width="800" height="600" xmlns="http://www.w3.org/2000/svg">
  <rect width="100%" height="100%" fill="#faf5f0"/>
  <text x="400" y="30" text-anchor="middle" font-size="20" fill="#333">${params.fiber} ${params.type} — ${params.weave}</text>
  ${Array.from({ length: 20 }, (_, i) => `<rect x="${i%5*140+80}" y="${Math.floor(i/5)*140+80}" width="120" height="120" fill="rgb(${rng.nextF64()*100+155},${rng.nextF64()*100+155},${rng.nextF64()*100+155})"/>`).join('\n  ')}
  <text x="400" y="570" text-anchor="middle" font-size="12" fill="#aaa">Paradigm GSPL — Textiles</text>
</svg>`;
}

function extractParams(seed: Seed, rng: Xoshiro256StarStar): TextilesParams {
  const quality = seed.genes?.quality?.value || 'medium';
  const fibers = ['cotton', 'polyester', 'silk', 'wool', 'nylon', 'hemp'];
  const weaves = ['plain', 'twill', 'satin', 'jacquard', 'knit'];
  return {
    type: seed.genes?.type?.value || ['fabric', 'carpet', 'upholstery', 'technical'][rng.nextInt(0, 3)],
    fiber: seed.genes?.fiber?.value || fibers[rng.nextInt(0, fibers.length - 1)],
    weave: seed.genes?.weave?.value || weaves[rng.nextInt(0, weaves.length - 1)],
    quality: ['low', 'medium', 'high', 'photorealistic'].includes(quality) ? quality : 'medium'
  };
}
