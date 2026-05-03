/**
 * Wearables Generator — produces wearable technology
 * Smartwatches, fitness trackers, smart glasses
 * $0.5T market: Wearables
 */

import * as fs from 'fs';
import * as path from 'path';
import type { Seed } from '../engines';
import { Xoshiro256StarStar, rngFromHash } from '../rng';

interface WearablesParams {
  deviceType: 'smartwatch' | 'fitness_tracker' | 'smart_glasses' | 'hearables';
  sensors: string[];
  batteryLife: number; // days
  quality: 'low' | 'medium' | 'high' | 'photorealistic';
}

export async function generateWearables(seed: Seed, outputPath: string): Promise<{ filePath: string; designPath: string; deviceType: string }> {
  const rng = rngFromHash(seed.$hash || '');
  const params = extractParams(seed, rng);

  const config = {
    wearables: { deviceType: params.deviceType, sensors: params.sensors, batteryLife: params.batteryLife, quality: params.quality },
    specs: { display: ['OLED', 'AMOLED', 'LCD'][rng.nextInt(0, 2)], resolution: '390x390', waterResistant: true, nfc: rng.nextF64() > 0.5 },
    health: { heartRate: true, spo2: rng.nextF64() > 0.3, ecg: rng.nextF64() > 0.7, sleepTracking: true },
    connectivity: { bluetooth: true, wifi: rng.nextF64() > 0.5, gps: params.deviceType === 'smartwatch', lte: rng.nextF64() > 0.7 }
  };

  const dir = path.dirname(outputPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const jsonPath = outputPath.replace(/\.json$/, '_wearables.json');
  fs.writeFileSync(jsonPath, JSON.stringify(config, null, 2));

  const designPath = outputPath.replace(/\.json$/, '_design.svg');
  fs.writeFileSync(designPath, generateSVG(params, rng));

  return { filePath: jsonPath, designPath, deviceType: params.deviceType };
}

function generateSVG(params: WearablesParams, rng: Xoshiro256StarStar): string {
  return `<?xml version="1.0"?>
<svg width="400" height="600" xmlns="http://www.w3.org/2000/svg">
  <rect width="100%" height="100%" fill="#1a1a2a"/>
  <text x="200" y="30" text-anchor="middle" font-size="16" fill="white">${params.deviceType}</text>
  <rect x="80" y="80" width="240" height="440" fill="#2a2a3a" stroke="#4a4" stroke-width="2" rx="40"/>
  <text x="200" y="320" text-anchor="middle" fill="#4a4" font-size="14">${params.batteryLife} DAYS</text>
  <text x="200" y="570" text-anchor="middle" font-size="12" fill="#aaa">Paradigm GSPL — Wearables</text>
</svg>`;
}

function extractParams(seed: Seed, rng: Xoshiro256StarStar): WearablesParams {
  const quality = seed.genes?.quality?.value || 'medium';
  const allSensors = ['accelerometer', 'gyroscope', 'heart_rate', 'spo2', 'gps', 'barometer'];
  return {
    deviceType: seed.genes?.deviceType?.value || ['smartwatch', 'fitness_tracker', 'smart_glasses', 'hearables'][rng.nextInt(0, 3)],
    sensors: (seed.genes?.sensors as string[]) || allSensors.slice(0, Math.floor(rng.nextF64() * 5) + 2),
    batteryLife: Math.floor(((seed.genes?.batteryLife?.value as number || rng.nextF64()) * 29) + 1),
    quality: ['low', 'medium', 'high', 'photorealistic'].includes(quality) ? quality : 'medium'
  };
}
