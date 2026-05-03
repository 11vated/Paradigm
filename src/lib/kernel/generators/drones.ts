/**
 * Drones Generator — produces drone designs
 * Quadcopters, fixed-wing, delivery drones, racing drones
 * $0.5T market: Drones/UAV
 */

import * as fs from 'fs';
import * as path from 'path';
import type { Seed } from '../engines';
import { Xoshiro256StarStar, rngFromHash } from '../rng';

interface DronesParams {
  droneType: 'quadcopter' | 'fixed_wing' | 'delivery' | 'racing';
  maxFlightTime: number; // minutes
  payload: number; // kg
  quality: 'low' | 'medium' | 'high' | 'photorealistic';
}

export async function generateDrones(seed: Seed, outputPath: string): Promise<{ filePath: string; blueprintPath: string; droneType: string }> {
  const rng = rngFromHash(seed.$hash || '');
  const params = extractParams(seed, rng);

  const config = {
    drones: { droneType: params.droneType, maxFlightTime: params.maxFlightTime, payload: params.payload, quality: params.quality },
    propulsion: { motorType: 'brushless', kv: rng.nextF64() * 2000 + 1000, propSize: rng.nextF64() * 15 + 5, battery: rng.nextF64() * 10000 + 2000 },
    avionics: { gps: true, imu: true, barometer: true, camera: rng.nextF64() > 0.3, obstacleDetection: rng.nextF64() > 0.5 },
    economics: { bom: rng.nextF64() * 2000 + 200, retail: rng.nextF64() * 5000 + 500, margin: rng.nextF64() * 0.4 + 0.2 }
  };

  const dir = path.dirname(outputPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const jsonPath = outputPath.replace(/\.json$/, '_drones.json');
  fs.writeFileSync(jsonPath, JSON.stringify(config, null, 2));

  const blueprintPath = outputPath.replace(/\.json$/, '_blueprint.svg');
  fs.writeFileSync(blueprintPath, generateSVG(params, rng));

  return { filePath: jsonPath, blueprintPath, droneType: params.droneType };
}

function generateSVG(params: DronesParams, rng: Xoshiro256StarStar): string {
  return `<?xml version="1.0"?>
<svg width="600" height="400" xmlns="http://www.w3.org/2000/svg">
  <rect width="100%" height="100%" fill="#0a1a2a"/>
  <text x="300" y="30" text-anchor="middle" font-size="18" fill="white">${params.droneType.toUpperCase()} DRONE</text>
  <ellipse cx="300" cy="200" rx="200" ry="80" fill="#1a2a3a" stroke="#4a4" stroke-width="2"/>
  <text x="300" y="210" text-anchor="middle" fill="#4a4" font-size="14">${params.maxFlightTime} MIN FLIGHT</text>
  <text x="300" y="370" text-anchor="middle" font-size="12" fill="#aaa">Paradigm GSPL — Drones</text>
</svg>`;
}

function extractParams(seed: Seed, rng: Xoshiro256StarStar): DronesParams {
  const quality = seed.genes?.quality?.value || 'medium';
  return {
    droneType: seed.genes?.droneType?.value || ['quadcopter', 'fixed_wing', 'delivery', 'racing'][rng.nextInt(0, 3)],
    maxFlightTime: Math.floor(((seed.genes?.maxFlightTime?.value as number || rng.nextF64()) * 110) + 10),
    payload: (seed.genes?.payload?.value as number || rng.nextF64()) * 25 + 0.1,
    quality: ['low', 'medium', 'high', 'photorealistic'].includes(quality) ? quality : 'medium'
  };
}
