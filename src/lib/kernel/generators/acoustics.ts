/**
 * Acoustics Generator — produces acoustic designs
 * Concert halls, recording studios, home theaters
 * $0.2T market: Acoustics
 */

import * as fs from 'fs';
import * as path from 'path';
import type { Seed } from '../engines';
import { Xoshiro256StarStar, rngFromHash } from '../rng';

interface AcousticsParams {
  roomType: 'concert_hall' | 'studio' | 'home_theater' | 'office';
  volume: number; // cubic meters
  rt60: number; // seconds
  quality: 'low' | 'medium' | 'high' | 'photorealistic';
}

export async function generateAcoustics(seed: Seed, outputPath: string): Promise<{ filePath: string; planPath: string; roomType: string }> {
  const rng = rngFromHash(seed.$hash || '');
  const params = extractParams(seed, rng);

  const config = {
    acoustics: { roomType: params.roomType, volume: params.volume, rt60: params.rt60, quality: params.quality },
    treatment: generateTreatment(params, rng),
    performance: { clarity: rng.nextF64() * 0.5 + 0.5, warmth: rng.nextF64(), intimacy: rng.nextF64(), liveness: rng.nextF64() },
    equipment: { speakers: Math.floor(rng.nextF64() * 10) + 2, amps: Math.floor(rng.nextF64() * 3) + 1, dac: rng.nextF64() > 0.5 }
  };

  const dir = path.dirname(outputPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const jsonPath = outputPath.replace(/\.json$/, '_acoustics.json');
  fs.writeFileSync(jsonPath, JSON.stringify(config, null, 2));

  const planPath = outputPath.replace(/\.json$/, '_plan.svg');
  fs.writeFileSync(planPath, generateSVG(params, rng));

  return { filePath: jsonPath, planPath, roomType: params.roomType };
}

function generateTreatment(params: AcousticsParams, rng: Xoshiro256StarStar): any {
  return {
    absorbers: Math.floor(rng.nextF64() * 20) + 5,
    diffusers: Math.floor(rng.nextF64() * 10) + 2,
    bassTraps: Math.floor(rng.nextF64() * 8) + 2,
    materials: ['fiberglass', 'foam', 'fabric', 'wood'][rng.nextInt(0, 3)]
  };
}

function generateSVG(params: AcousticsParams, rng: Xoshiro256StarStar): string {
  return `<?xml version="1.0"?>
<svg width="800" height="600" xmlns="http://www.w3.org/2000/svg">
  <rect width="100%" height="100%" fill="#1a1a2a"/>
  <text x="400" y="30" text-anchor="middle" font-size="20" fill="white">${params.roomType} — RT60: ${params.rt60}s</text>
  <ellipse cx="400" cy="300" rx="300" ry="200" fill="#2a2a3a" stroke="#4a4" stroke-width="2"/>
  <text x="400" y="310" text-anchor="middle" fill="#4a4" font-size="14">ACOUSTIC SPACE</text>
  <text x="400" y="570" text-anchor="middle" font-size="12" fill="#aaa">Paradigm GSPL — Acoustics</text>
</svg>`;
}

function extractParams(seed: Seed, rng: Xoshiro256StarStar): AcousticsParams {
  const quality = seed.genes?.quality?.value || 'medium';
  return {
    roomType: seed.genes?.roomType?.value || ['concert_hall', 'studio', 'home_theater', 'office'][rng.nextInt(0, 3)],
    volume: Math.floor(((seed.genes?.volume?.value as number || rng.nextF64()) * 9900) + 100),
    rt60: (seed.genes?.rt60?.value as number || rng.nextF64()) * 2 + 0.3, // 0.3-2.3s
    quality: ['low', 'medium', 'high', 'photorealistic'].includes(quality) ? quality : 'medium'
  };
}
