/**
 * Sensors Generator — produces sensor designs
 * Temperature, pressure, proximity, IMU sensors
 * $0.2T market: Sensors
 */

import * as fs from 'fs';
import * as path from 'path';
import type { Seed } from '../engines';
import { Xoshiro256StarStar, rngFromHash } from '../rng';

interface SensorsParams {
  sensorType: 'temperature' | 'pressure' | 'proximity' | 'imu' | 'optical';
  accuracy: number; // %
  range: number; // max value
  quality: 'low' | 'medium' | 'high' | 'photorealistic';
}

export async function generateSensors(seed: Seed, outputPath: string): Promise<{ filePath: string; schematicPath: string; sensorType: string }> {
  const rng = rngFromHash(seed.$hash || '');
  const params = extractParams(seed, rng);

  const config = {
    sensors: { sensorType: params.sensorType, accuracy: params.accuracy, range: params.range, quality: params.quality },
    output: { type: ['analog', 'digital', 'i2c', 'spi'][rng.nextInt(0, 3)], resolution: Math.floor(rng.nextF64() * 16) + 8, samplingRate: rng.nextF64() * 1000 + 10 },
    packaging: { type: ['dip', 'smd', 'qfn', 'bga'][rng.nextInt(0, 3)], pins: Math.floor(rng.nextF64() * 20) + 4, size: rng.nextF64() * 10 + 1 },
    economics: { unitCost: rng.nextF64() * 50 + 1, volume: rng.nextF64() * 1e6, margin: rng.nextF64() * 0.5 + 0.3 }
  };

  const dir = path.dirname(outputPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const jsonPath = outputPath.replace(/\.json$/, '_sensors.json');
  fs.writeFileSync(jsonPath, JSON.stringify(config, null, 2));

  const schematicPath = outputPath.replace(/\.json$/, '_schematic.svg');
  fs.writeFileSync(schematicPath, generateSVG(params, rng));

  return { filePath: jsonPath, schematicPath, sensorType: params.sensorType };
}

function generateSVG(params: SensorsParams, rng: Xoshiro256StarStar): string {
  return `<?xml version="1.0"?>
<svg width="400" height="400" xmlns="http://www.w3.org/2000/svg">
  <rect width="100%" height="100%" fill="#1a1a2a"/>
  <text x="200" y="30" text-anchor="middle" font-size="18" fill="white">${params.sensorType.toUpperCase()}</text>
  <rect x="100" y="100" width="200" height="200" fill="#2a2a3a" stroke="#4a4" stroke-width="2"/>
  <text x="200" y="220" text-anchor="middle" fill="#4a4" font-size="14">${params.accuracy}% ACCURACY</text>
  <text x="200" y="370" text-anchor="middle" font-size="12" fill="#aaa">Paradigm GSPL — Sensors</text>
</svg>`;
}

function extractParams(seed: Seed, rng: Xoshiro256StarStar): SensorsParams {
  const quality = seed.genes?.quality?.value || 'medium';
  return {
    sensorType: seed.genes?.sensorType?.value || ['temperature', 'pressure', 'proximity', 'imu', 'optical'][rng.nextInt(0, 4)],
    accuracy: (seed.genes?.accuracy?.value as number || rng.nextF64()) * 0.99 + 0.01,
    range: Math.floor(((seed.genes?.range?.value as number || rng.nextF64()) * 990) + 10),
    quality: ['low', 'medium', 'high', 'photorealistic'].includes(quality) ? quality : 'medium'
  };
}
