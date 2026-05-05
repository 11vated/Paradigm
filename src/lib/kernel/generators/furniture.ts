/**
 * Furniture Generator — produces furniture designs
 * Residential, office, outdoor, smart furniture
 * $0.5T market: Furniture
 */

import * as fs from 'fs';
import * as path from 'path';
import type { Seed } from '../engines';
import { Xoshiro256StarStar, rngFromHash } from '../rng';

interface FurnitureParams {
  category: 'residential' | 'office' | 'outdoor' | 'smart';
  material: string;
  style: string;
  quality: 'low' | 'medium' | 'high' | 'photorealistic';
}

export async function generateFurniture(seed: Seed, outputPath: string): Promise<{ filePath: string; designPath: string; category: string }> {
  const rng = rngFromHash(seed.$hash || '');
  const params = extractParams(seed, rng);

  const config = {
    furniture: { category: params.category, material: params.material, style: params.style, quality: params.quality },
    dimensions: { length: rng.nextF64() * 2 + 0.5, width: rng.nextF64() * 1.5 + 0.3, height: rng.nextF64() * 1.5 + 0.3, weight: rng.nextF64() * 100 + 5 },
    manufacturing: { leadTime: rng.nextF64() * 60 + 14, moq: Math.floor(rng.nextF64() * 500) + 50, assembly: rng.nextF64() > 0.5 },
    pricing: { msrp: rng.nextF64() * 3000 + 100, cost: rng.nextF64() * 1000 + 30, margin: rng.nextF64() * 0.5 + 0.2 }
  };

  const dir = path.dirname(outputPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const jsonPath = outputPath.replace(/\.json$/, '_furniture.json');
  fs.writeFileSync(jsonPath, JSON.stringify(config, null, 2));

  const designPath = outputPath.replace(/\.json$/, '_design.svg');
  fs.writeFileSync(designPath, generateSVG(params, rng));

  return { filePath: jsonPath, designPath, category: params.category };
}

function generateSVG(params: FurnitureParams, rng: Xoshiro256StarStar): string {
  return `<?xml version="1.0"?>
<svg width="800" height="600" xmlns="http://www.w3.org/2000/svg">
  <rect width="100%" height="100%" fill="#f5f0e8"/>
  <text x="400" y="30" text-anchor="middle" font-size="20" fill="#333">${params.style} ${params.category} — ${params.material}</text>
  <rect x="250" y="100" width="300" height="300" fill="#deb887" stroke="#8b4513" stroke-width="2"/>
  <text x="400" y="270" text-anchor="middle" fill="#333" font-size="16">${params.category.toUpperCase()}</text>
  <text x="400" y="570" text-anchor="middle" font-size="12" fill="#aaa">Paradigm GSPL — Furniture</text>
</svg>`;
}

function extractParams(seed: Seed, rng: Xoshiro256StarStar): FurnitureParams {
  const quality = seed.genes?.quality?.value || 'medium';
  const materials = ['wood', 'metal', 'plastic', 'glass', 'composite', 'bamboo'];
  const styles = ['modern', 'traditional', 'minimalist', 'industrial', 'scandinavian', 'rustic'];
  return {
    category: seed.genes?.category?.value || ['residential', 'office', 'outdoor', 'smart'][rng.nextInt(0, 3)],
    material: seed.genes?.material?.value || materials[rng.nextInt(0, materials.length - 1)],
    style: seed.genes?.style?.value || styles[rng.nextInt(0, styles.length - 1)],
    quality: ['low', 'medium', 'high', 'photorealistic'].includes(quality) ? quality : 'medium'
  };
}
