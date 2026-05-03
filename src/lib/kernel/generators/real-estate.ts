/**
 * Real Estate Generator — produces real estate designs
 * Residential, commercial, mixed-use, smart buildings
 * $3T market: Real Estate
 */

import * as fs from 'fs';
import * as path from 'path';
import type { Seed } from '../engines';
import { Xoshiro256StarStar, rngFromHash } from '../rng';

interface RealEstateParams {
  propertyType: 'residential' | 'commercial' | 'mixed_use' | 'industrial';
  area: number; // sq meters
  floors: number;
  quality: 'low' | 'medium' | 'high' | 'photorealistic';
}

export async function generateRealEstate(seed: Seed, outputPath: string): Promise<{ filePath: string; blueprintPath: string; propertyType: string }> {
  const rng = rngFromHash(seed.$hash || '');
  const params = extractParams(seed, rng);

  // Generate building design
  const design = generateDesign(params, rng);

  // Generate floor plans
  const floorPlans = generateFloorPlans(params, rng);

  // Generate smart features
  const smart = generateSmart(params, rng);

  const config = {
    realEstate: {
      propertyType: params.propertyType,
      area: params.area,
      floors: params.floors,
      quality: params.quality
    },
    design,
    floorPlans,
    smart,
    market: {
      value: params.area * (rng.nextF64() * 5000 + 1000), // USD per sq m
      rentalYield: rng.nextF64() * 0.08 + 0.02, // 2-10%
      occupancyRate: rng.nextF64() * 0.2 + 0.8 // 80-100%
    }
  };

  const dir = path.dirname(outputPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  const jsonPath = outputPath.replace(/\.json$/, '_realestate.json');
  fs.writeFileSync(jsonPath, JSON.stringify(config, null, 2));

  // Write blueprint SVG
  const blueprintPath = outputPath.replace(/\.json$/, '_blueprint.svg');
  fs.writeFileSync(blueprintPath, generateBlueprintSVG(params, rng));

  return {
    filePath: jsonPath,
    blueprintPath,
    propertyType: params.propertyType
  };
}

function generateDesign(params: RealEstateParams, rng: Xoshiro256StarStar): any {
  return {
    dimensions: {
      width: Math.sqrt(params.area / (params.floors * rng.nextF64() * 2 + 0.5)),
      depth: Math.sqrt(params.area / (params.floors * rng.nextF64() * 2 + 0.5)),
      height: params.floors * (3 + rng.nextF64() * 2) // meters per floor
    },
    materials: ['concrete', 'steel', 'glass', 'wood'].slice(0, Math.floor(rng.nextF64() * 4) + 1),
    style: ['modern', 'brutalist', 'art_deco', 'sustainable'][rng.nextInt(0, 3)]
  };
}

function generateFloorPlans(params: RealEstateParams, rng: Xoshiro256StarStar): any {
  const plans: any[] = [];
  for (let f = 0; f < params.floors; f++) {
    plans.push({
      floor: f + 1,
      area: params.area / params.floors,
      rooms: Math.floor(rng.nextF64() * 10) + 2,
      bathrooms: Math.floor(rng.nextF64() * 3) + 1
    });
  }
  return plans;
}

function generateSmart(params: RealEstateParams, rng: Xoshiro256StarStar): any {
  return {
    iotDevices: Math.floor(params.area / 50), // 1 per 50 sq m
    automation: ['lighting', 'climate', 'security', 'entertainment'].slice(0, Math.floor(rng.nextF64() * 4) + 1),
    energyManagement: true,
    evCharging: rng.nextF64() > 0.5
  };
}

function generateBlueprintSVG(params: RealEstateParams, rng: Xoshiro256StarStar): string {
  const width = 800;
  const height = 600;

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
  <rect width="100%" height="100%" fill="#f5f5f0"/>
  <text x="50%" y="30" text-anchor="middle" font-size="20" fill="#333">${params.propertyType} — ${params.area}m²</text>
  
  ${Array.from({ length: params.floors }, (_, f) => {
    const y = f * 100 + 80;
    return `<rect x="100" y="${y}" width="600" height="80" fill="#ddd" stroke="#333" stroke-width="1"/>
    <text x="400" y="${y + 45}" text-anchor="middle" fill="#333" font-size="14">Floor ${f + 1}</text>`;
  }).join('\n  ')}
  
  <text x="50%" y="${height - 30}" text-anchor="middle" font-size="12" fill="#aaa">Paradigm GSPL — Real Estate ${params.floors} floors</text>
</svg>`;
}

function extractParams(seed: Seed, rng: Xoshiro256StarStar): RealEstateParams {
  const quality = seed.genes?.quality?.value || 'medium';

  return {
    propertyType: seed.genes?.propertyType?.value || ['residential', 'commercial', 'mixed_use', 'industrial'][rng.nextInt(0, 3)],
    area: Math.floor(((seed.genes?.area?.value as number || rng.nextF64()) * 99000) + 1000), // 1000-100000 sq m
    floors: Math.floor(((seed.genes?.floors?.value as number || rng.nextF64()) * 99) + 1), // 1-100 floors
    quality: ['low', 'medium', 'high', 'photorealistic'].includes(quality) ? quality : 'medium'
  };
}

