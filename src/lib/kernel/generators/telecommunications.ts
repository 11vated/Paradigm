/**
 * Telecommunications Generator — produces telecom infrastructure
 * 5G/6G networks, fiber optics, satellite comms
 * $1T market: Telecommunications
 */

import * as fs from 'fs';
import * as path from 'path';
import type { Seed } from '../engines';
import { Xoshiro256StarStar, rngFromHash } from '../rng';

interface TelecomParams {
  networkType: '5G' | '6G' | 'fiber' | 'satellite';
  coverage: number; // km^2
  bandwidth: number; // Gbps
  quality: 'low' | 'medium' | 'high' | 'photorealistic';
}

export async function generateTelecom(seed: Seed, outputPath: string): Promise<{ filePath: string; layoutPath: string; networkType: string }> {
  const rng = rngFromHash(seed.$hash || '');
  const params = extractParams(seed, rng);

  const config = {
    telecom: { networkType: params.networkType, coverage: params.coverage, bandwidth: params.bandwidth, quality: params.quality },
    infrastructure: generateInfrastructure(params, rng),
    spectrum: generateSpectrum(params, rng),
    economics: { capex: params.coverage * 50000, opex: params.coverage * 5000, arpu: rng.nextF64() * 100 + 20 }
  };

  const dir = path.dirname(outputPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const jsonPath = outputPath.replace(/\.json$/, '_telecom.json');
  fs.writeFileSync(jsonPath, JSON.stringify(config, null, 2));

  const layoutPath = outputPath.replace(/\.json$/, '_network.svg');
  fs.writeFileSync(layoutPath, generateSVG(params, rng));

  return { filePath: jsonPath, layoutPath, networkType: params.networkType };
}

function generateInfrastructure(params: TelecomParams, rng: Xoshiro256StarStar): any {
  return {
    towers: params.networkType === '5G' || params.networkType === '6G' ? Math.floor(params.coverage / 10) : 0,
    fiberLength: params.networkType === 'fiber' ? params.coverage * 0.1 : 0, // km
    satellites: params.networkType === 'satellite' ? Math.floor(rng.nextF64() * 1000) + 100 : 0,
    dataCenters: Math.floor(rng.nextF64() * 10) + 1
  };
}

function generateSpectrum(params: TelecomParams, rng: Xoshiro256StarStar): any {
  return {
    frequency: params.networkType === '5G' ? '3.5 GHz' : (params.networkType === '6G' ? '100 GHz' : '193 THz'),
    channels: Math.floor(rng.nextF64() * 100) + 10,
    latency: params.networkType === '6G' ? rng.nextF64() * 0.1 : rng.nextF64() * 10, // ms
    reliability: rng.nextF64() * 0.01 + 0.99 // 99-99.99%
  };
}

function generateSVG(params: TelecomParams, rng: Xoshiro256StarStar): string {
  return `<?xml version="1.0"?>
<svg width="800" height="600" xmlns="http://www.w3.org/2000/svg">
  <rect width="100%" height="100%" fill="#0a0a1a"/>
  <text x="400" y="30" text-anchor="middle" font-size="20" fill="white">${params.networkType} Network — ${params.bandwidth} Gbps</text>
  ${Array.from({ length: 10 }, (_, i) => `<circle cx="${rng.nextF64()*700+50}" cy="${rng.nextF64()*400+80}" r="20" fill="#4af" opacity="0.7"/>`).join('\n  ')}
  <text x="400" y="570" text-anchor="middle" font-size="12" fill="#aaa">Paradigm GSPL — Telecommunications</text>
</svg>`;
}

function extractParams(seed: Seed, rng: Xoshiro256StarStar): TelecomParams {
  const quality = seed.genes?.quality?.value || 'medium';
  return {
    networkType: seed.genes?.networkType?.value || ['5G', '6G', 'fiber', 'satellite'][rng.nextInt(0, 3)],
    coverage: Math.floor(((seed.genes?.coverage?.value as number || rng.nextF64()) * 9900) + 100),
    bandwidth: Math.floor(((seed.genes?.bandwidth?.value as number || rng.nextF64()) * 990) + 10),
    quality: ['low', 'medium', 'high', 'photorealistic'].includes(quality) ? quality : 'medium'
  };
}
