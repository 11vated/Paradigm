/**
 * VR Generator — produces VR experiences
 * Gaming, simulation, training, entertainment VR
 * $0.4T market: Virtual Reality
 */

import * as fs from 'fs';
import * as path from 'path';
import type { Seed } from '../engines';
import { Xoshiro256StarStar, rngFromHash } from '../rng';

interface VRParams {
  experienceType: 'gaming' | 'simulation' | 'training' | 'entertainment';
  resolution: string;
  refreshRate: number; // Hz
  quality: 'low' | 'medium' | 'high' | 'photorealistic';
}

export async function generateVR(seed: Seed, outputPath: string): Promise<{ filePath: string; scenePath: string; experienceType: string }> {
  const rng = rngFromHash(seed.$hash || '');
  const params = extractParams(seed, rng);

  const config = {
    vr: { experienceType: params.experienceType, resolution: params.resolution, refreshRate: params.refreshRate, quality: params.quality },
    headset: { type: ['Oculus', 'Vive', 'PlayStation VR', 'Pico'][rng.nextInt(0, 3)], tracking: ['inside-out', 'outside-in'][rng.nextInt(0, 1)], fov: rng.nextF64() * 40 + 90 },
    interaction: { controllers: rng.nextF64() > 0.3, handTracking: rng.nextF64() > 0.5, haptics: rng.nextF64() > 0.5 },
    economics: { devCost: rng.nextF64() * 1e6 + 100000, content: rng.nextF64() * 500000, platforms: Math.floor(rng.nextF64() * 3) + 1 }
  };

  const dir = path.dirname(outputPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const jsonPath = outputPath.replace(/\.json$/, '_vr.json');
  fs.writeFileSync(jsonPath, JSON.stringify(config, null, 2));

  const scenePath = outputPath.replace(/\.json$/, '_scene.svg');
  fs.writeFileSync(scenePath, generateSVG(params, rng));

  return { filePath: jsonPath, scenePath, experienceType: params.experienceType };
}

function generateSVG(params: VRParams, rng: Xoshiro256StarStar): string {
  return `<?xml version="1.0"?>
<svg width="800" height="600" xmlns="http://www.w3.org/2000/svg">
  <rect width="100%" height="100%" fill="#0a0a1a"/>
  <text x="400" y="30" text-anchor="middle" font-size="20" fill="white">VR: ${params.experienceType}</text>
  <ellipse cx="400" cy="300" rx="200" ry="150" fill="#1a1a2a" stroke="#4a4" stroke-width="2"/>
  <text x="400" y="310" text-anchor="middle" fill="#4a4" font-size="16">${params.resolution} @ ${params.refreshRate}Hz</text>
  <text x="400" y="570" text-anchor="middle" font-size="12" fill="#aaa">Paradigm GSPL — VR</text>
</svg>`;
}

function extractParams(seed: Seed, rng: Xoshiro256StarStar): VRParams {
  const quality = seed.genes?.quality?.value || 'medium';
  return {
    experienceType: seed.genes?.experienceType?.value || ['gaming', 'simulation', 'training', 'entertainment'][rng.nextInt(0, 3)],
    resolution: seed.genes?.resolution?.value || ['2160x2160', '2880x2880', '4K'][rng.nextInt(0, 2)],
    refreshRate: Math.floor(((seed.genes?.refreshRate?.value as number || rng.nextF64()) * 60) + 60),
    quality: ['low', 'medium', 'high', 'photorealistic'].includes(quality) ? quality : 'medium'
  };
}
