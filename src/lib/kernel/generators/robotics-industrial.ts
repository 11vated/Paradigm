/**
 * Robotics Industrial Generator — produces industrial robotics
 * Assembly robots, welding robots, palletizing
 * $0.3T market: Industrial Robotics
 */

import * as fs from 'fs';
import * as path from 'path';
import type { Seed } from '../engines';
import { Xoshiro256StarStar, rngFromHash } from '../rng';

interface RoboticsIndustrialParams {
  robotType: 'assembly' | 'welding' | 'palletizing' | 'cnc_loading';
  reach: number; // meters
  payload: number; // kg
  quality: 'low' | 'medium' | 'high' | 'photorealistic';
}

export async function generateRoboticsIndustrial(seed: Seed, outputPath: string): Promise<{ filePath: string; layoutPath: string; robotType: string }> {
  const rng = rngFromHash(seed.$hash || '');
  const params = extractParams(seed, rng);

  const config = {
    roboticsIndustrial: { robotType: params.robotType, reach: params.reach, payload: params.payload, quality: params.quality },
    kinematics: { dof: Math.floor(rng.nextF64() * 4) + 4, repeatability: rng.nextF64() * 0.1, speed: rng.nextF64() * 2 },
    controller: { type: ['PLC', 'IPC', 'Embedded'][rng.nextInt(0, 2)], language: ['Structured Text', 'Ladder', 'C++'][rng.nextInt(0, 2)], cycleTime: rng.nextF64() * 10 + 1 },
    economics: { capex: rng.nextF64() * 200000 + 50000, opex: rng.nextF64() * 10000 + 1000, roi: rng.nextF64() * 3 + 1 }
  };

  const dir = path.dirname(outputPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const jsonPath = outputPath.replace(/\.json$/, '_robotics_industrial.json');
  fs.writeFileSync(jsonPath, JSON.stringify(config, null, 2));

  const layoutPath = outputPath.replace(/\.json$/, '_cell.svg');
  fs.writeFileSync(layoutPath, generateSVG(params, rng));

  return { filePath: jsonPath, layoutPath, robotType: params.robotType };
}

function generateSVG(params: RoboticsIndustrialParams, rng: Xoshiro256StarStar): string {
  return `<?xml version="1.0"?>
<svg width="600" height="600" xmlns="http://www.w3.org/2000/svg">
  <rect width="100%" height="100%" fill="#1a1a2a"/>
  <text x="300" y="30" text-anchor="middle" font-size="18" fill="white">${params.robotType.toUpperCase()}</text>
  <circle cx="300" cy="320" r="200" fill="none" stroke="#4a4" stroke-width="2" stroke-dasharray="${params.reach * 100}"/>
  <circle cx="300" cy="320" r="30" fill="#2a2a3a" stroke="#4a4" stroke-width="2"/>
  <text x="300" y="330" text-anchor="middle" fill="#4a4" font-size="14">ROBOT</text>
  <text x="300" y="570" text-anchor="middle" font-size="12" fill="#aaa">Paradigm GSPL — Industrial Robotics</text>
</svg>`;
}

function extractParams(seed: Seed, rng: Xoshiro256StarStar): RoboticsIndustrialParams {
  const quality = seed.genes?.quality?.value || 'medium';
  return {
    robotType: seed.genes?.robotType?.value || ['assembly', 'welding', 'palletizing', 'cnc_loading'][rng.nextInt(0, 3)],
    reach: (seed.genes?.reach?.value as number || rng.nextF64()) * 2 + 0.5,
    payload: (seed.genes?.payload?.value as number || rng.nextF64()) * 50 + 5,
    quality: ['low', 'medium', 'high', 'photorealistic'].includes(quality) ? quality : 'medium'
  };
}
