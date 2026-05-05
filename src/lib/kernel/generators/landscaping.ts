/**
 * Landscaping Generator — produces landscaping designs
 * Gardens, parks, urban green spaces, rooftop gardens
 * $0.3T market: Landscaping
 */

import * as fs from 'fs';
import * as path from 'path';
import type { Seed } from '../engines';
import { Xoshiro256StarStar, rngFromHash } from '../rng';

interface LandscapingParams {
  projectType: 'garden' | 'park' | 'rooftop' | 'courtyard';
  size: number; // sq meters
  style: string;
  quality: 'low' | 'medium' | 'high' | 'photorealistic';
}

export async function generateLandscaping(seed: Seed, outputPath: string): Promise<{ filePath: string; planPath: string; projectType: string }> {
  const rng = rngFromHash(seed.$hash || '');
  const params = extractParams(seed, rng);

  const config = {
    landscaping: { projectType: params.projectType, size: params.size, style: params.style, quality: params.quality },
    plants: generatePlants(params, rng),
    hardscape: generateHardscape(params, rng),
    irrigation: { type: ['drip', 'sprinkler', 'smart'][rng.nextInt(0, 2)], coverage: rng.nextF64() * 100, waterUse: rng.nextF64() * 100 }
  };

  const dir = path.dirname(outputPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const jsonPath = outputPath.replace(/\.json$/, '_landscaping.json');
  fs.writeFileSync(jsonPath, JSON.stringify(config, null, 2));

  const planPath = outputPath.replace(/\.json$/, '_plan.svg');
  fs.writeFileSync(planPath, generateSVG(params, rng));

  return { filePath: jsonPath, planPath, projectType: params.projectType };
}

function generatePlants(params: LandscapingParams, rng: Xoshiro256StarStar): any {
  const types = ['tree', 'shrub', 'flower', 'grass', 'succulent'];
  return {
    species: Array.from({ length: Math.floor(rng.nextF64() * 20) + 5 }, () => types[rng.nextInt(0, 4)]),
    native: rng.nextF64() > 0.5,
    seasonal: rng.nextF64() > 0.3
  };
}

function generateHardscape(params: LandscapingParams, rng: Xoshiro256StarStar): any {
  return {
    features: ['path', 'patio', 'wall', 'pond', 'pergola'].slice(0, Math.floor(rng.nextF64() * 5) + 1),
    materials: ['stone', 'brick', 'concrete', 'wood'][rng.nextInt(0, 3)],
    lighting: rng.nextF64() > 0.5
  };
}

function generateSVG(params: LandscapingParams, rng: Xoshiro256StarStar): string {
  return `<?xml version="1.0"?>
<svg width="800" height="600" xmlns="http://www.w3.org/2000/svg">
  <rect width="100%" height="100%" fill="#2a4a2a"/>
  <text x="400" y="30" text-anchor="middle" font-size="20" fill="white">${params.style} — ${params.projectType}</text>
  ${Array.from({ length: 15 }, (_, i) => `<circle cx="${rng.nextF64()*700+50}" cy="${rng.nextF64()*400+80}" r="${rng.nextF64()*20+5}" fill="#4a4"/>`).join('\n  ')}
  <text x="400" y="570" text-anchor="middle" font-size="12" fill="#aaa">Paradigm GSPL — Landscaping</text>
</svg>`;
}

function extractParams(seed: Seed, rng: Xoshiro256StarStar): LandscapingParams {
  const quality = seed.genes?.quality?.value || 'medium';
  const styles = ['japanese', 'english', 'xeriscape', 'tropical', 'minimalist', 'cottage'];
  return {
    projectType: seed.genes?.projectType?.value || ['garden', 'park', 'rooftop', 'courtyard'][rng.nextInt(0, 3)],
    size: Math.floor(((seed.genes?.size?.value as number || rng.nextF64()) * 9900) + 100),
    style: seed.genes?.style?.value || styles[rng.nextInt(0, styles.length - 1)],
    quality: ['low', 'medium', 'high', 'photorealistic'].includes(quality) ? quality : 'medium'
  };
}
