/**
 * Transportation Generator — produces transportation systems
 * EV, hyperloop, autonomous vehicles, rail
 * $1T market: Transportation
 */

import * as fs from 'fs';
import * as path from 'path';
import type { Seed } from '../engines';
import { Xoshiro256StarStar, rngFromHash } from '../rng';

interface TransportationParams {
  vehicleType: 'ev' | 'hyperloop' | 'av' | 'rail' | 'drone_delivery';
  speed: number; // km/h
  capacity: number;
  quality: 'low' | 'medium' | 'high' | 'photorealistic';
}

export async function generateTransportation(seed: Seed, outputPath: string): Promise<{ filePath: string; schematicPath: string; vehicleType: string }> {
  const rng = rngFromHash(seed.$hash || '');
  const params = extractParams(seed, rng);

  // Generate vehicle design
  const design = generateDesign(params, rng);

  // Generate powertrain
  const powertrain = generatePowertrain(params, rng);

  // Generate infrastructure
  const infrastructure = generateInfrastructure(params, rng);

  const config = {
    transportation: {
      vehicleType: params.vehicleType,
      speed: params.speed,
      capacity: params.capacity,
      quality: params.quality
    },
    design,
    powertrain,
    infrastructure,
    sustainability: {
      emission: params.vehicleType === 'ev' ? 0 : rng.nextF64() * 200, // g CO2/km
      energySource: params.vehicleType === 'ev' ? 'electric' : 'hydrogen',
      efficiency: rng.nextF64() * 0.4 + 0.6 // 60-100%
    }
  };

  const dir = path.dirname(outputPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  const jsonPath = outputPath.replace(/\.json$/, '_transportation.json');
  fs.writeFileSync(jsonPath, JSON.stringify(config, null, 2));

  // Write schematic SVG
  const schematicPath = outputPath.replace(/\.json$/, '_schematic.svg');
  fs.writeFileSync(schematicPath, generateSchematicSVG(params, rng));

  return {
    filePath: jsonPath,
    schematicPath,
    vehicleType: params.vehicleType
  };
}

function generateDesign(params: TransportationParams, rng: Xoshiro256StarStar): any {
  return {
    dimensions: {
      length: params.vehicleType === 'hyperloop' ? 30 + rng.nextF64() * 20 : 5 + rng.nextF64() * 10,
      width: params.vehicleType === 'rail' ? 3 + rng.nextF64() : 2 + rng.nextF64(),
      height: params.vehicleType === 'av' ? 2 + rng.nextF64() : 1.5 + rng.nextF64()
    },
    weight: rng.nextF64() * 10000 + 1000, // kg
    aerodynamics: {
      dragCoefficient: rng.nextF64() * 0.3 + 0.2 // 0.2-0.5
    }
  };
}

function generatePowertrain(params: TransportationParams, rng: Xoshiro256StarStar): any {
  return {
    type: params.vehicleType === 'ev' ? 'electric' : (params.vehicleType === 'hyperloop' ? 'maglev' : 'hydrogen'),
    power: rng.nextF64() * 500 + 100, // kW
    torque: rng.nextF64() * 1000 + 200, // Nm
    range: params.vehicleType === 'ev' ? rng.nextF64() * 600 + 200 : rng.nextF64() * 1000 + 500, // km
    chargingTime: params.vehicleType === 'ev' ? rng.nextF64() * 60 + 30 : 0 // minutes
  };
}

function generateInfrastructure(params: TransportationParams, rng: Xoshiro256StarStar): any {
  return {
    required: params.vehicleType === 'hyperloop' || params.vehicleType === 'rail',
    trackLength: params.vehicleType === 'hyperloop' ? rng.nextF64() * 1000 + 100 : 0, // km
    stations: Math.floor(rng.nextF64() * 50) + 10,
    maintenance: {
      interval: rng.nextF64() * 10000 + 5000, // km
      cost: rng.nextF64() * 100000
    }
  };
}

function generateSchematicSVG(params: TransportationParams, rng: Xoshiro256StarStar): string {
  const width = 800;
  const height = 600;

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
  <rect width="100%" height="100%" fill="#f0f0f0"/>
  <text x="50%" y="30" text-anchor="middle" font-size="20" fill="#333">${params.vehicleType.toUpperCase()} — ${params.speed} km/h</text>
  
  <!-- Vehicle body -->
  <rect x="200" y="250" width="${300 + rng.nextF64() * 200}" height="100" fill="#4a4" stroke="#333" stroke-width="2"/>
  <circle cx="250" cy="370" r="40" fill="#333"/>
  <circle cx="550" cy="370" r="40" fill="#333"/>
  
  <text x="400" y="310" text-anchor="middle" fill="white" font-size="16">${params.vehicleType}</text>
  <text x="50%" y="${height - 30}" text-anchor="middle" font-size="12" fill="#aaa">Paradigm GSPL — Transportation ${params.capacity} passengers</text>
</svg>`;
}

function extractParams(seed: Seed, rng: Xoshiro256StarStar): TransportationParams {
  const quality = seed.genes?.quality?.value || 'medium';

  return {
    vehicleType: seed.genes?.vehicleType?.value || ['ev', 'hyperloop', 'av', 'rail', 'drone_delivery'][rng.nextInt(0, 4)],
    speed: Math.floor(((seed.genes?.speed?.value as number || rng.nextF64()) * 990) + 10), // 10-1000 km/h
    capacity: Math.floor(((seed.genes?.capacity?.value as number || rng.nextF64()) * 9900) + 100), // 100-10000
    quality: ['low', 'medium', 'high', 'photorealistic'].includes(quality) ? quality : 'medium'
  };
}

