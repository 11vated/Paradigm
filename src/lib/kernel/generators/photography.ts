/**
 * Photography Generator — produces photography specs
 * Portrait, landscape, commercial, drone photography
 * $0.3T market: Photography
 */

import * as fs from 'fs';
import * as path from 'path';
import type { Seed } from '../engines';
import { Xoshiro256StarStar, rngFromHash } from '../rng';

interface PhotographyParams {
  type: 'portrait' | 'landscape' | 'commercial' | 'drone';
  equipment: string;
  resolution: string;
  quality: 'low' | 'medium' | 'high' | 'photorealistic';
}

export async function generatePhotography(seed: Seed, outputPath: string): Promise<{ filePath: string; shotPath: string; type: string }> {
  const rng = rngFromHash(seed.$hash || '');
  const params = extractParams(seed, rng);

  const config = {
    photography: { type: params.type, equipment: params.equipment, resolution: params.resolution, quality: params.quality },
    settings: generateSettings(params, rng),
    postProcessing: generatePostProcessing(params, rng),
    pricing: { session: rng.nextF64() * 500 + 100, print: rng.nextF64() * 200 + 20, rights: rng.nextF64() > 0.5 }
  };

  const dir = path.dirname(outputPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const jsonPath = outputPath.replace(/\.json$/, '_photography.json');
  fs.writeFileSync(jsonPath, JSON.stringify(config, null, 2));

  const shotPath = outputPath.replace(/\.json$/, '_shot.svg');
  fs.writeFileSync(shotPath, generateSVG(params, rng));

  return { filePath: jsonPath, shotPath, type: params.type };
}

function generateSettings(params: PhotographyParams, rng: Xoshiro256StarStar): any {
  return {
    aperture: rng.nextF64() * 16 + 1.4,
    shutterSpeed: rng.nextF64() * 1000 + 1,
    iso: Math.pow(2, rng.nextInt(6, 14)),
    focalLength: rng.nextF64() * 200 + 20
  };
}

function generatePostProcessing(params: PhotographyParams, rng: Xoshiro256StarStar): any {
  return {
    software: ['Lightroom', 'Photoshop', 'CaptureOne', 'GIMP'][rng.nextInt(0, 3)],
    edits: ['exposure', 'color', 'crop', 'retouch'].slice(0, Math.floor(rng.nextF64() * 4) + 1),
    style: ['natural', 'vibrant', 'moody', 'vintage'][rng.nextInt(0, 3)]
  };
}

function generateSVG(params: PhotographyParams, rng: Xoshiro256StarStar): string {
  return `<?xml version="1.0"?>
<svg width="800" height="600" xmlns="http://www.w3.org/2000/svg">
  <rect width="100%" height="100%" fill="#1a1a1a"/>
  <text x="400" y="30" text-anchor="middle" font-size="20" fill="white">${params.type} Photography</text>
  <rect x="150" y="80" width="500" height="400" fill="#2a2a2a" stroke="#4a4" stroke-width="2"/>
  <text x="400" y="300" text-anchor="middle" fill="#4a4" font-size="16">${params.equipment.toUpperCase()}</text>
  <text x="400" y="570" text-anchor="middle" font-size="12" fill="#aaa">Paradigm GSPL — Photography</text>
</svg>`;
}

function extractParams(seed: Seed, rng: Xoshiro256StarStar): PhotographyParams {
  const quality = seed.genes?.quality?.value || 'medium';
  const equipment = ['DSLR', 'Mirrorless', 'Medium Format', 'Drone', 'Smartphone'];
  return {
    type: seed.genes?.type?.value || ['portrait', 'landscape', 'commercial', 'drone'][rng.nextInt(0, 3)],
    equipment: seed.genes?.equipment?.value || equipment[rng.nextInt(0, equipment.length - 1)],
    resolution: seed.genes?.resolution?.value || ['24MP', '45MP', '100MP'][rng.nextInt(0, 2)],
    quality: ['low', 'medium', 'high', 'photorealistic'].includes(quality) ? quality : 'medium'
  };
}
