/**
 * Smart City Generator — produces smart city designs
 * IoT networks, traffic optimization, energy grids
 * $2T market: Smart Cities
 */

import * as fs from 'fs';
import * as path from 'path';
import type { Seed } from '../engines';
import { Xoshiro256StarStar, rngFromHash } from '../rng';

interface CityParams {
  population: number;
  area: number; // km^2
  districtCount: number;
  techLevel: number; // 0-1
  quality: 'low' | 'medium' | 'high' | 'photorealistic';
}

export async function generateCity(seed: Seed, outputPath: string): Promise<{ filePath: string; layoutPath: string; districtCount: number }> {
  const rng = rngFromHash(seed.$hash || '');
  const params = extractParams(seed, rng);

  // Generate city layout
  const layout = generateLayout(params, rng);

  // Generate infrastructure
  const infrastructure = generateInfrastructure(params, rng);

  // Generate IoT network
  const iot = generateIoT(params, rng);

  const config = {
    city: {
      population: params.population,
      area: params.area,
      districtCount: params.districtCount,
      techLevel: params.techLevel,
      quality: params.quality
    },
    layout,
    infrastructure,
    iot,
    sustainability: {
      renewablePercent: rng.nextF64() * 100,
      greenSpace: rng.nextF64() * 40 + 10, // 10-50%
      walkabilityScore: rng.nextF64() * 100
    }
  };

  const dir = path.dirname(outputPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  const jsonPath = outputPath.replace(/\.json$/, '_city.json');
  fs.writeFileSync(jsonPath, JSON.stringify(config, null, 2));

  // Write layout SVG
  const layoutPath = outputPath.replace(/\.json$/, '_layout.svg');
  fs.writeFileSync(layoutPath, generateLayoutSVG(params, rng));

  return {
    filePath: jsonPath,
    layoutPath,
    districtCount: params.districtCount
  };
}

function generateLayout(params: CityParams, rng: Xoshiro256StarStar): any {
  const districts: any[] = [];

  for (let i = 0; i < params.districtCount; i++) {
    districts.push({
      id: `district_${i}`,
      type: ['residential', 'commercial', 'industrial', 'recreational'][rng.nextInt(0, 3)],
      population: Math.floor(params.population / params.districtCount),
      area: params.area / params.districtCount,
      position: [rng.nextF64() * 100, rng.nextF64() * 100], // grid coordinates
      buildings: Math.floor(rng.nextF64() * 500) + 50
    });
  }

  return {
    totalDistricts: districts.length,
    districts,
    transport: {
      metroLines: Math.floor(rng.nextF64() * 10) + 2,
      busRoutes: Math.floor(rng.nextF64() * 50) + 10,
      bikeLanes: rng.nextF64() > 0.5
    }
  };
}

function generateInfrastructure(params: CityParams, rng: Xoshiro256StarStar): any {
  return {
    energy: {
      gridType: 'smart',
      sources: ['solar', 'wind', 'fusion', 'geothermal'].slice(0, Math.floor(rng.nextF64() * 4) + 1),
      storage: 'battery_grid',
      capacity: params.population * 2 // MWh
    },
    water: {
      treatment: 'advanced_membrane',
      recycling: rng.nextF64() * 100
    },
    waste: {
      method: 'plasma_gasification',
      recyclingRate: rng.nextF64() * 100
    }
  };
}

function generateIoT(params: CityParams, rng: Xoshiro256StarStar): any {
  return {
    sensors: {
      total: params.population * 10, // 10 per person
      types: ['traffic', 'air_quality', 'noise', 'energy', 'water'],
      density: rng.nextF64() * 1000 // per km^2
    },
    network: {
      protocol: '5G_NB-IoT',
      latency: rng.nextF64() * 10, // ms
      bandwidth: rng.nextF64() * 1000 // Gbps
    },
    dataProcessing: {
      edgeNodes: Math.floor(params.area * 10),
      cloudIntegration: true
    }
  };
}

function generateLayoutSVG(params: CityParams, rng: Xoshiro256StarStar): string {
  const width = 800;
  const height = 600;

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
  <rect width="100%" height="100%" fill="#1a2a1a"/>
  <text x="50%" y="30" text-anchor="middle" font-size="20" fill="white">Smart City — Pop: ${params.population}</text>
  
  ${Array.from({ length: params.districtCount }, (_, i) => {
    const x = (i % 5) * 150 + 50;
    const y = Math.floor(i / 5) * 150 + 80;
    const color = ['#4a4', '#44a', '#aa4', '#4aa'][i % 4];
    return `<rect x="${x}" y="${y}" width="120" height="120" fill="${color}" opacity="0.6" stroke="#fff" stroke-width="1"/>
    <text x="${x + 60}" y="${y + 60}" text-anchor="middle" fill="white" font-size="10">District ${i}</text>`;
  }).join('\n  ')}
  
  <text x="50%" y="${height - 30}" text-anchor="middle" font-size="12" fill="#aaa">Paradigm GSPL — Smart City ${params.area}km²</text>
</svg>`;
}

function extractParams(seed: Seed, rng: Xoshiro256StarStar): CityParams {
  const quality = seed.genes?.quality?.value || 'medium';

  return {
    population: Math.floor(((seed.genes?.population?.value as number || rng.nextF64()) * 20000000) + 100000),
    area: ((seed.genes?.area?.value as number || rng.nextF64()) * 9900) + 100, // 100-10000 km^2
    districtCount: Math.floor(((seed.genes?.districtCount?.value as number || rng.nextF64()) * 48) + 2),
    techLevel: (seed.genes?.techLevel?.value as number || rng.nextF64()),
    quality: ['low', 'medium', 'high', 'photorealistic'].includes(quality) ? quality : 'medium'
  };
}
