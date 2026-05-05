/**
 * Optics Generator — produces optical designs
 * Lenses, microscopes, telescopes, fiber optics
 * $0.3T market: Optics
 */

import * as fs from 'fs';
import * as path from 'path';
import type { Seed } from '../engines';
import { Xoshiro256StarStar, rngFromHash } from '../rng';

interface OpticsParams {
  lensType: 'convex' | 'concave' | 'fresnel' | 'aspherical';
  focalLength: number; // mm
  aperture: number; // mm
  quality: 'low' | 'medium' | 'high' | 'photorealistic';
}

export async function generateOptics(seed: Seed, outputPath: string): Promise<{ filePath: string; diagramPath: string; lensType: string }> {
  const rng = rngFromHash(seed.$hash || '');
  const params = extractParams(seed, rng);

  const config = {
    optics: { lensType: params.lensType, focalLength: params.focalLength, aperture: params.aperture, quality: params.quality },
    coating: { type: ['anti-reflection', 'mirror', 'filter'][rng.nextInt(0, 2)], layers: Math.floor(rng.nextF64() * 10) + 1, transmission: rng.nextF64() * 0.1 + 0.9 },
    aberrations: { spherical: rng.nextF64() * 0.1, chromatic: rng.nextF64() * 0.05, astigmatism: rng.nextF64() * 0.02 },
    economics: { materialCost: rng.nextF64() * 500 + 50, coatingCost: rng.nextF64() * 200 + 20, yield: rng.nextF64() * 0.2 + 0.8 }
  };

  const dir = path.dirname(outputPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const jsonPath = outputPath.replace(/\.json$/, '_optics.json');
  fs.writeFileSync(jsonPath, JSON.stringify(config, null, 2));

  const diagramPath = outputPath.replace(/\.json$/, '_diagram.svg');
  fs.writeFileSync(diagramPath, generateSVG(params, rng));

  return { filePath: jsonPath, diagramPath, lensType: params.lensType };
}

function generateSVG(params: OpticsParams, rng: Xoshiro256StarStar): string {
  return `<?xml version="1.0"?>
<svg width="600" height="400" xmlns="http://www.w3.org/2000/svg">
  <rect width="100%" height="100%" fill="#f5f5f0"/>
  <text x="300" y="30" text-anchor="middle" font-size="18" fill="#333">${params.lensType} Lens — f=${params.focalLength}mm</text>
  <ellipse cx="300" cy="200" rx="${params.aperture}" ry="100" fill="#e8e8e8" stroke="#333" stroke-width="2"/>
  <text x="300" y="380" text-anchor="middle" font-size="12" fill="#aaa">Paradigm GSPL — Optics</text>
</svg>`;
}

function extractParams(seed: Seed, rng: Xoshiro256StarStar): OpticsParams {
  const quality = seed.genes?.quality?.value || 'medium';
  return {
    lensType: seed.genes?.lensType?.value || ['convex', 'concave', 'fresnel', 'aspherical'][rng.nextInt(0, 3)],
    focalLength: Math.floor(((seed.genes?.focalLength?.value as number || rng.nextF64()) * 490) + 10),
    aperture: Math.floor(((seed.genes?.aperture?.value as number || rng.nextF64()) * 90) + 10),
    quality: ['low', 'medium', 'high', 'photorealistic'].includes(quality) ? quality : 'medium'
  };
}
