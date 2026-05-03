/**
 * Battery Generator — produces battery designs
 * Li-ion, solid-state, flow, sodium-ion
 * $0.3T market: Battery Technology
 */

import * as fs from 'fs';
import * as path from 'path';
import type { Seed } from '../engines';
import { Xoshiro256StarStar, rngFromHash } from '../rng';

interface BatteryParams {
  chemistry: 'li_ion' | 'solid_state' | 'flow' | 'sodium_ion';
  capacity: number; // kWh
  voltage: number; // V
  quality: 'low' | 'medium' | 'high' | 'photorealistic';
}

export async function generateBattery(seed: Seed, outputPath: string): Promise<{ filePath: string; specPath: string; chemistry: string }> {
  const rng = rngFromHash(seed.$hash || '');
  const params = extractParams(seed, rng);

  const config = {
    battery: { chemistry: params.chemistry, capacity: params.capacity, voltage: params.voltage, quality: params.quality },
    performance: { energyDensity: rng.nextF64() * 300 + 100, powerDensity: rng.nextF64() * 1000 + 100, cycleLife: Math.floor(rng.nextF64() * 10000) + 1000 },
    safety: { thermalRunaway: rng.nextF64() > 0.7, bms: true, certification: ['UL', 'IEC', 'UN38.3'][rng.nextInt(0, 2)] },
    economics: { cellCost: rng.nextF64() * 200 + 50, packCost: rng.nextF64() * 500 + 100, recycling: rng.nextF64() > 0.5 }
  };

  const dir = path.dirname(outputPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const jsonPath = outputPath.replace(/\.json$/, '_battery.json');
  fs.writeFileSync(jsonPath, JSON.stringify(config, null, 2));

  const specPath = outputPath.replace(/\.json$/, '_spec.pdf');
  fs.writeFileSync(specPath, `Battery: ${params.chemistry}\nCapacity: ${params.capacity} kWh\nVoltage: ${params.voltage}V\n\nParadigm GSPL — Battery`);

  return { filePath: jsonPath, specPath, chemistry: params.chemistry };
}

function extractParams(seed: Seed, rng: Xoshiro256StarStar): BatteryParams {
  const quality = seed.genes?.quality?.value || 'medium';
  return {
    chemistry: seed.genes?.chemistry?.value || ['li_ion', 'solid_state', 'flow', 'sodium_ion'][rng.nextInt(0, 3)],
    capacity: (seed.genes?.capacity?.value as number || rng.nextF64()) * 100 + 1,
    voltage: (seed.genes?.voltage?.value as number || rng.nextF64()) * 400 + 3,
    quality: ['low', 'medium', 'high', 'photorealistic'].includes(quality) ? quality : 'medium'
  };
}
