/**
 * Electronics Generator — produces electronics designs
 * Consumer electronics, PCBs, embedded systems
 * $1T market: Electronics
 */

import * as fs from 'fs';
import * as path from 'path';
import type { Seed } from '../engines';
import { Xoshiro256StarStar, rngFromHash } from '../rng';

interface ElectronicsParams {
  deviceType: 'smartphone' | 'laptop' | 'tablet' | 'wearable' | 'iot';
  processor: string;
  ram: number; // GB
  quality: 'low' | 'medium' | 'high' | 'photorealistic';
}

export async function generateElectronics(seed: Seed, outputPath: string): Promise<{ filePath: string; schematicPath: string; deviceType: string }> {
  const rng = rngFromHash(seed.$hash || '');
  const params = extractParams(seed, rng);

  const config = {
    electronics: { deviceType: params.deviceType, processor: params.processor, ram: params.ram, quality: params.quality },
    specs: { storage: rng.nextF64() * 1000 + 64, battery: rng.nextF64() * 5000 + 2000, display: ['LCD', 'OLED', 'AMOLED'][rng.nextInt(0, 2)] },
    connectivity: { wifi: true, bluetooth: true, cellular: params.deviceType === 'smartphone', nfc: rng.nextF64() > 0.5 },
    economics: { bom: rng.nextF64() * 500 + 50, retail: rng.nextF64() * 1500 + 200, margin: rng.nextF64() * 0.4 + 0.2 }
  };

  const dir = path.dirname(outputPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const jsonPath = outputPath.replace(/\.json$/, '_electronics.json');
  fs.writeFileSync(jsonPath, JSON.stringify(config, null, 2));

  const schematicPath = outputPath.replace(/\.json$/, '_schematic.svg');
  fs.writeFileSync(schematicPath, generateSVG(params, rng));

  return { filePath: jsonPath, schematicPath, deviceType: params.deviceType };
}

function generateSVG(params: ElectronicsParams, rng: Xoshiro256StarStar): string {
  return `<?xml version="1.0"?>
<svg width="400" height="600" xmlns="http://www.w3.org/2000/svg">
  <rect width="100%" height="100%" fill="#1a1a2a"/>
  <text x="200" y="30" text-anchor="middle" font-size="18" fill="white">${params.deviceType.toUpperCase()}</text>
  <rect x="80" y="80" width="240" height="440" fill="#2a2a3a" stroke="#4a4" stroke-width="2"/>
  <text x="200" y="320" text-anchor="middle" fill="#4a4" font-size="14">${params.processor}</text>
  <text x="400" y="570" text-anchor="middle" font-size="12" fill="#aaa">Paradigm GSPL — Electronics</text>
</svg>`;
}

function extractParams(seed: Seed, rng: Xoshiro256StarStar): ElectronicsParams {
  const quality = seed.genes?.quality?.value || 'medium';
  const processors = ['Snapdragon 8 Gen 3', 'Apple M3', 'Intel i9', 'AMD Ryzen 9', 'MediaTek Dimensity'];
  return {
    deviceType: seed.genes?.deviceType?.value || ['smartphone', 'laptop', 'tablet', 'wearable', 'iot'][rng.nextInt(0, 4)],
    processor: seed.genes?.processor?.value || processors[rng.nextInt(0, processors.length - 1)],
    ram: Math.floor(((seed.genes?.ram?.value as number || rng.nextF64()) * 124) + 4),
    quality: ['low', 'medium', 'high', 'photorealistic'].includes(quality) ? quality : 'medium'
  };
}
