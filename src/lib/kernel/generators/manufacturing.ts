/**
 * Manufacturing Generator — produces manufacturing systems
 * CNC, 3D printing, assembly lines, Industry 4.0
 * $1.5T market: Manufacturing
 */

import * as fs from 'fs';
import * as path from 'path';
import type { Seed } from '../engines';
import { Xoshiro256StarStar, rngFromHash } from '../rng';

interface ManufacturingParams {
  process: 'cnc' | '3d_printing' | 'assembly' | 'injection_molding';
  throughput: number; // units/hour
  automation: number; // 0-1
  quality: 'low' | 'medium' | 'high' | 'photorealistic';
}

export async function generateManufacturing(seed: Seed, outputPath: string): Promise<{ filePath: string; layoutPath: string; process: string }> {
  const rng = rngFromHash(seed.$hash || '');
  const params = extractParams(seed, rng);

  const line = generateLine(params, rng);
  const equipment = generateEquipment(params, rng);
  const quality = generateQuality(params, rng);

  const config = {
    manufacturing: { process: params.process, throughput: params.throughput, automation: params.automation, quality: params.quality },
    line,
    equipment,
    quality,
    economics: {
      capex: rng.nextF64() * 50e6 + 1e6,
      opex: rng.nextF64() * 1e6 + 100000,
      margin: rng.nextF64() * 0.3 + 0.1
    }
  };

  const dir = path.dirname(outputPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const jsonPath = outputPath.replace(/\.json$/, '_manufacturing.json');
  fs.writeFileSync(jsonPath, JSON.stringify(config, null, 2));

  const layoutPath = outputPath.replace(/\.json$/, '_layout.svg');
  fs.writeFileSync(layoutPath, generateLayoutSVG(params, rng));

  return { filePath: jsonPath, layoutPath, process: params.process };
}

function generateLine(params: ManufacturingParams, rng: Xoshiro256StarStar): any {
  return {
    stations: Math.floor(rng.nextF64() * 20) + 5,
    cycleTime: rng.nextF64() * 60 + 10, // seconds
    uptime: rng.nextF64() * 0.1 + 0.9, // 90-100%
    workers: Math.floor(params.throughput * (1 - params.automation) / 10)
  };
}

function generateEquipment(params: ManufacturingParams, rng: Xoshiro256StarStar): any {
  const equip: any[] = [];
  const types = params.process === '3d_printing' ? ['FDM', 'SLA', 'SLS'] : ['CNC_mill', 'lathe', 'robot_arm'];
  types.forEach(t => equip.push({ type: t, count: Math.floor(rng.nextF64() * 10) + 1 }));
  return equip;
}

function generateQuality(params: ManufacturingParams, rng: Xoshiro256StarStar): any {
  return {
    defectRate: rng.nextF64() * 0.01, // 0-1%
    sixSigma: rng.nextF64() > 0.7,
    testing: ['visual', 'automated', 'statistical'][rng.nextInt(0, 2)],
    certifications: ['ISO9001', 'ISO13485', 'AS9100'].slice(0, Math.floor(rng.nextF64() * 3) + 1)
  };
}

function generateLayoutSVG(params: ManufacturingParams, rng: Xoshiro256StarStar): string {
  return `<?xml version="1.0"?>
<svg width="800" height="600" xmlns="http://www.w3.org/2000/svg">
  <rect width="100%" height="100%" fill="#2a2a2a"/>
  <text x="400" y="30" text-anchor="middle" font-size="20" fill="white">${params.process} Line — ${params.throughput}/hr</text>
  ${Array.from({ length: 8 }, (_, i) => {
    const x = (i % 4) * 180 + 50;
    const y = Math.floor(i / 4) * 250 + 80;
    return `<rect x="${x}" y="${y}" width="150" height="150" fill="#444" stroke="#4a4" stroke-width="2"/>
    <text x="${x+75}" y="${y+80}" text-anchor="middle" fill="white" font-size="12">Station ${i+1}</text>`;
  }).join('\n  ')}
  <text x="400" y="570" text-anchor="middle" font-size="12" fill="#aaa">Paradigm GSPL — Manufacturing</text>
</svg>`;
}

function extractParams(seed: Seed, rng: Xoshiro256StarStar): ManufacturingParams {
  const quality = seed.genes?.quality?.value || 'medium';
  return {
    process: seed.genes?.process?.value || ['cnc', '3d_printing', 'assembly', 'injection_molding'][rng.nextInt(0, 3)],
    throughput: Math.floor(((seed.genes?.throughput?.value as number || rng.nextF64()) * 990) + 10),
    automation: (seed.genes?.automation?.value as number || rng.nextF64()),
    quality: ['low', 'medium', 'high', 'photorealistic'].includes(quality) ? quality : 'medium'
  };
}
