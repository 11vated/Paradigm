/**
 * Semiconductors Generator — produces semiconductor designs
 * Chips, wafers, fabrication processes
 * $0.5T market: Semiconductors
 */

import * as fs from 'fs';
import * as path from 'path';
import type { Seed } from '../engines';
import { Xoshiro256StarStar, rngFromHash } from '../rng';

interface SemiconductorsParams {
  nodeSize: number; // nm
  transistorCount: number; // billions
  architecture: string;
  quality: 'low' | 'medium' | 'high' | 'photorealistic';
}

export async function generateSemiconductors(seed: Seed, outputPath: string): Promise<{ filePath: string; layoutPath: string; nodeSize: number }> {
  const rng = rngFromHash(seed.$hash || '');
  const params = extractParams(seed, rng);

  const config = {
    semiconductors: { nodeSize: params.nodeSize, transistorCount: params.transistorCount, architecture: params.architecture, quality: params.quality },
    wafer: { diameter: 300, defects: rng.nextF64() * 10, yield: rng.nextF64() * 0.3 + 0.7 },
    design: { layers: Math.floor(rng.nextF64() * 50) + 10, clockSpeed: rng.nextF64() * 3 + 2, tdp: rng.nextF64() * 250 + 15 },
    economics: { waferCost: rng.nextF64() * 20000 + 5000, chipPrice: rng.nextF64() * 500 + 50, margin: rng.nextF64() * 0.6 + 0.4 }
  };

  const dir = path.dirname(outputPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const jsonPath = outputPath.replace(/\.json$/, '_semiconductors.json');
  fs.writeFileSync(jsonPath, JSON.stringify(config, null, 2));

  const layoutPath = outputPath.replace(/\.json$/, '_layout.svg');
  fs.writeFileSync(layoutPath, generateSVG(params, rng));

  return { filePath: jsonPath, layoutPath, nodeSize: params.nodeSize };
}

function generateSVG(params: SemiconductorsParams, rng: Xoshiro256StarStar): string {
  return `<?xml version="1.0"?>
<svg width="600" height="600" xmlns="http://www.w3.org/2000/svg">
  <rect width="100%" height="100%" fill="#0a0a1a"/>
  <text x="300" y="30" text-anchor="middle" font-size="18" fill="white">${params.nodeSize}nm Process</text>
  <circle cx="300" cy="320" r="200" fill="#1a1a2a" stroke="#4a4" stroke-width="2"/>
  <text x="300" y="330" text-anchor="middle" fill="#4a4" font-size="14">${params.transistorCount}B TRANSISTORS</text>
  <text x="300" y="570" text-anchor="middle" font-size="12" fill="#aaa">Paradigm GSPL — Semiconductors</text>
</svg>`;
}

function extractParams(seed: Seed, rng: Xoshiro256StarStar): SemiconductorsParams {
  const quality = seed.genes?.quality?.value || 'medium';
  return {
    nodeSize: Math.floor(((seed.genes?.nodeSize?.value as number || rng.nextF64()) * 195) + 5), // 5-200nm
    transistorCount: Math.floor(((seed.genes?.transistorCount?.value as number || rng.nextF64()) * 99) + 1),
    architecture: seed.genes?.architecture?.value || ['x86', 'ARM', 'RISC-V'][rng.nextInt(0, 2)],
    quality: ['low', 'medium', 'high', 'photorealistic'].includes(quality) ? quality : 'medium'
  };
}

