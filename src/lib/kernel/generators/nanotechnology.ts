/**
 * Nanotechnology Generator — produces nanotechnology designs
 * Nanomaterials, nanoelectronics, nanomedicine
 * $0.3T market: Nanotechnology
 */

import * as fs from 'fs';
import * as path from 'path';
import type { Seed } from '../engines';
import { Xoshiro256StarStar, rngFromHash } from '../rng';

interface NanotechnologyParams {
  application: 'materials' | 'electronics' | 'medicine' | 'energy';
  scale: number; // nm
  novelty: number; // 0-1
  quality: 'low' | 'medium' | 'high' | 'photorealistic';
}

export async function generateNanotechnology(seed: Seed, outputPath: string): Promise<{ filePath: string; diagramPath: string; application: string }> {
  const rng = rngFromHash(seed.$hash || '');
  const params = extractParams(seed, rng);

  const config = {
    nanotechnology: { application: params.application, scale: params.scale, novelty: params.novelty, quality: params.quality },
    structure: { type: ['nanotube', 'nanowire', 'quantum_dot', 'dendrimer'][rng.nextInt(0, 3)], diameter: params.scale, length: rng.nextF64() * 1000 + 100 },
    properties: { conductivity: rng.nextF64() * 1e6, strength: rng.nextF64() * 100 + 10, reactivity: rng.nextF64() * 0.5 },
    economics: { synthesisCost: rng.nextF64() * 10000 + 1000, scalability: rng.nextF64() > 0.5, market: rng.nextF64() * 1e9 }
  };

  const dir = path.dirname(outputPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const jsonPath = outputPath.replace(/\.json$/, '_nanotechnology.json');
  fs.writeFileSync(jsonPath, JSON.stringify(config, null, 2));

  const diagramPath = outputPath.replace(/\.json$/, '_diagram.svg');
  fs.writeFileSync(diagramPath, generateSVG(params, rng));

  return { filePath: jsonPath, diagramPath, application: params.application };
}

function generateSVG(params: NanotechnologyParams, rng: Xoshiro256StarStar): string {
  return `<?xml version="1.0"?>
<svg width="600" height="400" xmlns="http://www.w3.org/2000/svg">
  <rect width="100%" height="100%" fill="#0a1a2a"/>
  <text x="300" y="30" text-anchor="middle" font-size="18" fill="white">${params.application.toUpperCase()}</text>
  ${Array.from({ length: 20 }, (_, i) => `<circle cx="${rng.nextF64()*500+50}" cy="${rng.nextF64()*300+50}" r="${params.scale/10}" fill="#4af" opacity="0.7"/>`).join('\n  ')}
  <text x="300" y="370" text-anchor="middle" font-size="12" fill="#aaa">Paradigm GSPL — Nanotechnology</text>
</svg>`;
}

function extractParams(seed: Seed, rng: Xoshiro256StarStar): NanotechnologyParams {
  const quality = seed.genes?.quality?.value || 'medium';
  return {
    application: seed.genes?.application?.value || ['materials', 'electronics', 'medicine', 'energy'][rng.nextInt(0, 3)],
    scale: (seed.genes?.scale?.value as number || rng.nextF64()) * 990 + 10,
    novelty: (seed.genes?.novelty?.value as number || rng.nextF64()),
    quality: ['low', 'medium', 'high', 'photorealistic'].includes(quality) ? quality : 'medium'
  };
}
