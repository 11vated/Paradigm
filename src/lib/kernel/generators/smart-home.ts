/**
 * Smart Home Generator — produces smart home systems
 * Home automation, IoT devices, energy management
 * $0.3T market: Smart Home
 */

import * as fs from 'fs';
import * as path from 'path';
import type { Seed } from '../engines';
import { Xoshiro256StarStar, rngFromHash } from '../rng';

interface SmartHomeParams {
  systemType: 'starter' | 'comprehensive' | 'luxury' | 'eco_friendly';
  deviceCount: number;
  automation: number; // 0-1
  quality: 'low' | 'medium' | 'high' | 'photorealistic';
}

export async function generateSmartHome(seed: Seed, outputPath: string): Promise<{ filePath: string; layoutPath: string; systemType: string }> {
  const rng = rngFromHash(seed.$hash || '');
  const params = extractParams(seed, rng);

  const config = {
    smartHome: { systemType: params.systemType, deviceCount: params.deviceCount, automation: params.automation, quality: params.quality },
    devices: { lighting: Math.floor(rng.nextF64() * 30) + 10, climate: Math.floor(rng.nextF64() * 5) + 2, security: rng.nextF64() > 0.5, entertainment: rng.nextF64() > 0.3 },
    hub: { type: ['SmartThings', 'HomeKit', 'Google Home', 'Alexa'][rng.nextInt(0, 3)], protocols: ['Zigbee', 'Z-Wave', 'WiFi', 'Thread'][rng.nextInt(0, 3)], voiceControl: true },
    energy: { solar: rng.nextF64() > 0.5, battery: rng.nextF64() > 0.3, smartMeter: true, savings: rng.nextF64() * 0.4 + 0.1 }
  };

  const dir = path.dirname(outputPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const jsonPath = outputPath.replace(/\.json$/, '_smart_home.json');
  fs.writeFileSync(jsonPath, JSON.stringify(config, null, 2));

  const layoutPath = outputPath.replace(/\.json$/, '_layout.svg');
  fs.writeFileSync(layoutPath, generateSVG(params, rng));

  return { filePath: jsonPath, layoutPath, systemType: params.systemType };
}

function generateSVG(params: SmartHomeParams, rng: Xoshiro256StarStar): string {
  return `<?xml version="1.0"?>
<svg width="800" height="600" xmlns="http://www.w3.org/2000/svg">
  <rect width="100%" height="100%" fill="#f5f0e8"/>
  <text x="400" y="30" text-anchor="middle" font-size="20" fill="#333">${params.systemType} — ${params.deviceCount} devices</text>
  ${Array.from({ length: 12 }, (_, i) => `<rect x="${i%4*160+100}" y="${Math.floor(i/4)*150+80}" width="140" height="120" fill="#fff" stroke="#333" stroke-width="1"/>`).join('\n  ')}
  <text x="400" y="570" text-anchor="middle" font-size="12" fill="#aaa">Paradigm GSPL — Smart Home</text>
</svg>`;
}

function extractParams(seed: Seed, rng: Xoshiro256StarStar): SmartHomeParams {
  const quality = seed.genes?.quality?.value || 'medium';
  return {
    systemType: seed.genes?.systemType?.value || ['starter', 'comprehensive', 'luxury', 'eco_friendly'][rng.nextInt(0, 3)],
    deviceCount: Math.floor(((seed.genes?.deviceCount?.value as number || rng.nextF64()) * 990) + 10),
    automation: (seed.genes?.automation?.value as number || rng.nextF64()),
    quality: ['low', 'medium', 'high', 'photorealistic'].includes(quality) ? quality : 'medium'
  };
}
