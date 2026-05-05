/**
 * Aerospace Defense Generator — produces defense aerospace
 * Fighter jets, drones, missiles, satellites
 * $0.5T market: Aerospace Defense
 */

import * as fs from 'fs';
import * as path from 'path';
import type { Seed } from '../engines';
import { Xoshiro256StarStar, rngFromHash } from '../rng';

interface AerospaceDefenseParams {
  systemType: 'fighter' | 'drone' | 'missile' | 'satellite';
  range: number; // km
  speed: number; // mach
  quality: 'low' | 'medium' | 'high' | 'photorealistic';
}

export async function generateAerospaceDefense(seed: Seed, outputPath: string): Promise<{ filePath: string; specPath: string; systemType: string }> {
  const rng = rngFromHash(seed.$hash || '');
  const params = extractParams(seed, rng);

  const config = {
    aerospaceDefense: { systemType: params.systemType, range: params.range, speed: params.speed, quality: params.quality },
    propulsion: { engine: ['turbofan', 'ramjet', 'rocket'][rng.nextInt(0, 2)], thrust: rng.nextF64() * 200000 + 50000, fuel: rng.nextF64() * 10000 },
    avionics: { radar: 'AESA', ew: rng.nextF64() > 0.5, datalink: rng.nextF64() > 0.3, stealth: rng.nextF64() > 0.5 },
    economics: { unitCost: rng.nextF64() * 100e6 + 10e6, programCost: rng.nextF64() * 10e9 + 1e9, quantity: Math.floor(rng.nextF64() * 1000) + 100 }
  };

  const dir = path.dirname(outputPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const jsonPath = outputPath.replace(/\.json$/, '_aerospace_defense.json');
  fs.writeFileSync(jsonPath, JSON.stringify(config, null, 2));

  const specPath = outputPath.replace(/\.json$/, '_spec.txt');
  fs.writeFileSync(specPath, `Defense System: ${params.systemType}\nRange: ${params.range} km\nSpeed: Mach ${params.speed}\n\nParadigm GSPL — Aerospace Defense`);

  return { filePath: jsonPath, specPath, systemType: params.systemType };
}

function extractParams(seed: Seed, rng: Xoshiro256StarStar): AerospaceDefenseParams {
  const quality = seed.genes?.quality?.value || 'medium';
  return {
    systemType: seed.genes?.systemType?.value || ['fighter', 'drone', 'missile', 'satellite'][rng.nextInt(0, 3)],
    range: Math.floor(((seed.genes?.range?.value as number || rng.nextF64()) * 9900) + 100),
    speed: (seed.genes?.speed?.value as number || rng.nextF64()) * 4 + 0.5,
    quality: ['low', 'medium', 'high', 'photorealistic'].includes(quality) ? quality : 'medium'
  };
}
