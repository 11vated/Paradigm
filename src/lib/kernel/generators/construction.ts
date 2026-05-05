/**
 * Construction Generator — produces construction designs
 * Residential, commercial, infrastructure, smart buildings
 * $10T market: Construction
 */

import * as fs from 'fs';
import * as path from 'path';
import type { Seed } from '../engines';
import { Xoshiro256StarStar, rngFromHash } from '../rng';

interface ConstructionParams {
  projectType: 'residential' | 'commercial' | 'infrastructure' | 'renovation';
  area: number; // sq meters
  floors: number;
  quality: 'low' | 'medium' | 'high' | 'photorealistic';
}

export async function generateConstruction(seed: Seed, outputPath: string): Promise<{ filePath: string; blueprintPath: string; projectType: string }> {
  const rng = rngFromHash(seed.$hash || '');
  const params = extractParams(seed, rng);

  const design = generateDesign(params, rng);
  const materials = generateMaterials(params, rng);
  const schedule = generateSchedule(params, rng);

  const config = {
    construction: { projectType: params.projectType, area: params.area, floors: params.floors, quality: params.quality },
    design,
    materials,
    schedule,
    cost: {
      total: params.area * (rng.nextF64() * 3000 + 1000), // USD per sq m
      labor: rng.nextF64() * 0.4 + 0.3, // % of total
      materials: rng.nextF64() * 0.4 + 0.3
    }
  };

  const dir = path.dirname(outputPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const jsonPath = outputPath.replace(/\.json$/, '_construction.json');
  fs.writeFileSync(jsonPath, JSON.stringify(config, null, 2));

  const blueprintPath = outputPath.replace(/\.json$/, '_blueprint.svg');
  fs.writeFileSync(blueprintPath, generateBlueprintSVG(params, rng));

  return { filePath: jsonPath, blueprintPath, projectType: params.projectType };
}

function generateDesign(params: ConstructionParams, rng: Xoshiro256StarStar): any {
  return {
    structure: params.projectType === 'infrastructure' ? 'bridge' : 'frame',
    height: params.floors * (rng.nextF64() * 4 + 3), // meters
    footprint: params.area / params.floors,
    occupancy: Math.floor(params.area / 20) // people
  };
}

function generateMaterials(params: ConstructionParams, rng: Xoshiro256StarStar): any {
  return {
    concrete: params.area * rng.nextF64() * 0.5, // cubic meters
    steel: params.area * rng.nextF64() * 0.1, // tons
    glass: params.area * rng.nextF64() * 0.3, // sq meters
    wood: params.projectType === 'residential' ? params.area * 0.2 : 0
  };
}

function generateSchedule(params: ConstructionParams, rng: Xoshiro256StarStar): any {
  return {
    duration: params.area * rng.nextF64() * 0.01 + 6, // months
    phases: ['design', 'permits', 'foundation', 'structure', 'finishing'],
    workers: Math.floor(rng.nextF64() * 200) + 50,
    milestones: Math.floor(rng.nextF64() * 10) + 5
  };
}

function generateBlueprintSVG(params: ConstructionParams, rng: Xoshiro256StarStar): string {
  return `<?xml version="1.0"?>
<svg width="800" height="600" xmlns="http://www.w3.org/2000/svg">
  <rect width="100%" height="100%" fill="#f5f5f0"/>
  <text x="400" y="30" text-anchor="middle" font-size="20" fill="#333">${params.projectType} — ${params.area}m²</text>
  ${Array.from({ length: params.floors }, (_, f) => {
    const y = f * 100 + 80;
    return `<rect x="150" y="${y}" width="500" height="80" fill="#ddd" stroke="#333" stroke-width="1"/>
    <text x="400" y="${y+45}" text-anchor="middle" fill="#333" font-size="14">Floor ${f+1}</text>`;
  }).join('\n  ')}
  <text x="400" y="570" text-anchor="middle" font-size="12" fill="#aaa">Paradigm GSPL — Construction</text>
</svg>`;
}

function extractParams(seed: Seed, rng: Xoshiro256StarStar): ConstructionParams {
  const quality = seed.genes?.quality?.value || 'medium';
  return {
    projectType: seed.genes?.projectType?.value || ['residential', 'commercial', 'infrastructure', 'renovation'][rng.nextInt(0, 3)],
    area: Math.floor(((seed.genes?.area?.value as number || rng.nextF64()) * 99000) + 1000),
    floors: Math.floor(((seed.genes?.floors?.value as number || rng.nextF64()) * 99) + 1),
    quality: ['low', 'medium', 'high', 'photorealistic'].includes(quality) ? quality : 'medium'
  };
}
