/**
 * Architecture Generator — produces architectural designs
 * Residential, commercial, public buildings, monuments
 * $0.8T market: Architecture
 */

import * as fs from 'fs';
import * as path from 'path';
import type { Seed } from '../engines';
import { Xoshiro256StarStar, rngFromHash } from '../rng';

interface ArchitectureParams {
  buildingType: 'residential' | 'commercial' | 'public' | 'monument';
  style: string;
  floors: number;
  quality: 'low' | 'medium' | 'high' | 'photorealistic';
}

export async function generateArchitecture(seed: Seed, outputPath: string): Promise<{ filePath: string; blueprintPath: string; buildingType: string }> {
  const rng = rngFromHash(seed.$hash || '');
  const params = extractParams(seed, rng);

  const config = {
    architecture: { buildingType: params.buildingType, style: params.style, floors: params.floors, quality: params.quality },
    design: generateDesign(params, rng),
    sustainability: { leed: rng.nextF64() > 0.5, energyStar: rng.nextF64() > 0.3, solar: rng.nextF64() > 0.6 },
    cost: { estimate: params.floors * rng.nextF64() * 1000000, perSqFt: rng.nextF64() * 500 + 100 }
  };

  const dir = path.dirname(outputPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const jsonPath = outputPath.replace(/\.json$/, '_architecture.json');
  fs.writeFileSync(jsonPath, JSON.stringify(config, null, 2));

  const blueprintPath = outputPath.replace(/\.json$/, '_blueprint.svg');
  fs.writeFileSync(blueprintPath, generateSVG(params, rng));

  return { filePath: jsonPath, blueprintPath, buildingType: params.buildingType };
}

function generateDesign(params: ArchitectureParams, rng: Xoshiro256StarStar): any {
  return {
    footprint: { width: rng.nextF64() * 50 + 20, depth: rng.nextF64() * 50 + 20 },
    height: params.floors * (rng.nextF64() * 4 + 3),
    materials: ['concrete', 'steel', 'glass', 'wood'].slice(0, Math.floor(rng.nextF64() * 4) + 1),
    features: ['balcony', 'atrium', 'green_roof', 'courtyard'].slice(0, Math.floor(rng.nextF64() * 4) + 1)
  };
}

function generateSVG(params: ArchitectureParams, rng: Xoshiro256StarStar): string {
  const width = 800, height = 600;
  const floorHeight = 45;
  const buildingWidth = 400;
  const buildingX = (width - buildingWidth) / 2;
  let svg = `<?xml version="1.0"?>
<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
  <rect width="100%" height="100%" fill="#f5f5f0"/>
  <text x="${width/2}" y="30" text-anchor="middle" font-size="20" fill="#333">${params.style} — ${params.buildingType}</text>`;

  // Draw each floor with rooms
  for (let f = 0; f < params.floors; f++) {
    const y = 60 + f * (floorHeight + 5);
    // Floor rectangle
    svg += `\n  <rect x="${buildingX}" y="${y}" width="${buildingWidth}" height="${floorHeight}" fill="#ddd" stroke="#333" stroke-width="1"/>`;
    svg += `\n  <text x="${buildingX - 10}" y="${y + floorHeight/2}" text-anchor="end" font-size="10" fill="#666">Floor ${f + 1}</text>`;

    // Generate rooms for this floor
    const roomCount = Math.floor(rng.nextF64() * 4) + 2;
    const roomWidth = buildingWidth / roomCount;
    for (let r = 0; r < roomCount; r++) {
      const rx = buildingX + r * roomWidth;
      const roomTypes = ['bedroom', 'kitchen', 'living', 'bath', 'office', 'storage'][r % 6];
      svg += `\n  <rect x="${rx + 2}" y="${y + 2}" width="${roomWidth - 4}" height="${floorHeight - 4}" fill="${rng.nextF64() > 0.5 ? '#e8f4f8' : '#f8f4e8'}" stroke="#999" stroke-width="0.5"/>`;
      svg += `\n  <text x="${rx + roomWidth/2}" y="${y + floorHeight/2}" text-anchor="middle" font-size="8" fill="#666">${roomTypes}</text>`;
    }
  }

  // Dimensions
  svg += `\n  <text x="${width/2}" y="${height - 30}" text-anchor="middle" font-size="12" fill="#aaa">${params.floors} floors | Paradigm GSPL — Architecture</text>`;
  svg += `\n</svg>`;
  return svg;
}

function extractParams(seed: Seed, rng: Xoshiro256StarStar): ArchitectureParams {
  const quality = seed.genes?.quality?.value || 'medium';
  const styles = ['modern', 'brutalist', 'art_deco', 'gothic', 'minimalist', 'biophilic'];
  return {
    buildingType: seed.genes?.buildingType?.value || ['residential', 'commercial', 'public', 'monument'][rng.nextInt(0, 3)],
    style: seed.genes?.style?.value || styles[rng.nextInt(0, styles.length - 1)],
    floors: Math.floor(((seed.genes?.floors?.value as number || rng.nextF64()) * 99) + 1),
    quality: ['low', 'medium', 'high', 'photorealistic'].includes(quality) ? quality : 'medium'
  };
}
