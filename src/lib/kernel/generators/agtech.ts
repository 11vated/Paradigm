/**
 * Agriculture Tech Generator — produces agtech solutions
 * Precision ag, drones, automated harvesting
 * $0.5T market: AgTech
 */

import * as fs from 'fs';
import * as path from 'path';
import type { Seed } from '../engines';
import { Xoshiro256StarStar, rngFromHash } from '../rng';

interface AgTechParams {
  techType: 'precision' | 'drones' | 'automated_harvest' | 'vertical_farm';
  area: number; // hectares
  automation: number; // 0-1
  quality: 'low' | 'medium' | 'high' | 'photorealistic';
}

export async function generateAgTech(seed: Seed, outputPath: string): Promise<{ filePath: string; layoutPath: string; techType: string }> {
  const rng = rngFromHash(seed.$hash || '');
  const params = extractParams(seed, rng);

  const config = {
    agTech: { techType: params.techType, area: params.area, automation: params.automation, quality: params.quality },
    equipment: { drones: Math.floor(rng.nextF64() * 20) + 5, sensors: Math.floor(params.area * 10), tractors: Math.floor(rng.nextF64() * 10) + 2 },
    cropping: { yield: rng.nextF64() * 20 + 5, waterSaving: rng.nextF64() * 50 + 30, pesticideReduction: rng.nextF64() * 80 + 20 },
    economics: { capex: params.area * (rng.nextF64() * 5000 + 1000), opex: params.area * (rng.nextF64() * 500 + 100), roi: rng.nextF64() * 3 + 1 }
  };

  const dir = path.dirname(outputPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const jsonPath = outputPath.replace(/\.json$/, '_agtech.json');
  fs.writeFileSync(jsonPath, JSON.stringify(config, null, 2));

  const layoutPath = outputPath.replace(/\.json$/, '_layout.svg');
  fs.writeFileSync(layoutPath, generateSVG(params, rng));

  return { filePath: jsonPath, layoutPath, techType: params.techType };
}

function generateSVG(params: AgTechParams, rng: Xoshiro256StarStar): string {
  return `<?xml version="1.0"?>
<svg width="800" height="600" xmlns="http://www.w3.org/2000/svg">
  <rect width="100%" height="100%" fill="#2a4a2a"/>
  <text x="400" y="30" text-anchor="middle" font-size="20" fill="white">${params.techType} — ${params.area}ha</text>
  ${Array.from({ length: 10 }, (_, i) => `<rect x="${i%5*140+80}" y="${Math.floor(i/5)*220+80}" width="120" height="180" fill="#3a5a3a" stroke="#4a4" stroke-width="1"/>`).join('\n  ')}
  <text x="400" y="570" text-anchor="middle" font-size="12" fill="#aaa">Paradigm GSPL — AgTech</text>
</svg>`;
}

function extractParams(seed: Seed, rng: Xoshiro256StarStar): AgTechParams {
  const quality = seed.genes?.quality?.value || 'medium';
  return {
    techType: seed.genes?.techType?.value || ['precision', 'drones', 'automated_harvest', 'vertical_farm'][rng.nextInt(0, 3)],
    area: Math.floor(((seed.genes?.area?.value as number || rng.nextF64()) * 9900) + 100),
    automation: (seed.genes?.automation?.value as number || rng.nextF64()),
    quality: ['low', 'medium', 'high', 'photorealistic'].includes(quality) ? quality : 'medium'
  };
}
