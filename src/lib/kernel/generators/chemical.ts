/**
 * Chemical Generator — produces chemical processes and compounds
 * Petrochemical, pharmaceutical, specialty chemicals
 * $1T market: Chemical Industry
 */

import * as fs from 'fs';
import * as path from 'path';
import type { Seed } from '../engines';
import { Xoshiro256StarStar, rngFromHash } from '../rng';

interface ChemicalParams {
  process: 'distillation' | 'catalysis' | 'polymerization' | 'electrolysis';
  scale: number; // tons/year
  purity: number; // 0-1
  quality: 'low' | 'medium' | 'high' | 'photorealistic';
}

export async function generateChemical(seed: Seed, outputPath: string): Promise<{ filePath: string; flowsheetPath: string; process: string }> {
  const rng = rngFromHash(seed.$hash || '');
  const params = extractParams(seed, rng);

  const reaction = generateReaction(params, rng);
  const plant = generatePlant(params, rng);
  const safety = generateSafety(params, rng);

  const config = {
    chemical: { process: params.process, scale: params.scale, purity: params.purity, quality: params.quality },
    reaction,
    plant,
    safety,
    economics: {
      capex: params.scale * (rng.nextF64() * 1000 + 100), // USD per ton/year
      opex: rng.nextF64() * 500, // USD per ton
      margin: rng.nextF64() * 0.4 + 0.1
    }
  };

  const dir = path.dirname(outputPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const jsonPath = outputPath.replace(/\.json$/, '_chemical.json');
  fs.writeFileSync(jsonPath, JSON.stringify(config, null, 2));

  const flowsheetPath = outputPath.replace(/\.json$/, '_flowsheet.csv');
  fs.writeFileSync(flowsheetPath, generateCSV(params, rng));

  return { filePath: jsonPath, flowsheetPath, process: params.process };
}

function generateReaction(params: ChemicalParams, rng: Xoshiro256StarStar): any {
  return {
    stoichiometry: `A + B → C`,
    yield: rng.nextF64() * 0.3 + 0.6,
    selectivity: rng.nextF64() * 0.2 + 0.8,
    catalyst: params.process === 'catalysis' ? 'Zeolite' : 'None',
    temperature: rng.nextF64() * 500 + 100, // °C
    pressure: rng.nextF64() * 100 + 1 // atm
  };
}

function generatePlant(params: ChemicalParams, rng: Xoshiro256StarStar): any {
  return {
    reactors: Math.floor(rng.nextF64() * 10) + 1,
    columns: Math.floor(rng.nextF64() * 5) + 1,
    storageTanks: Math.floor(rng.nextF64() * 20) + 5,
    pipeLength: rng.nextF64() * 10000 + 1000 // meters
  };
}

function generateSafety(params: ChemicalParams, rng: Xoshiro256StarStar): any {
  return {
    hazardClass: ['flammable', 'toxic', 'corrosive', 'reactive'][rng.nextInt(0, 3)],
    ppe: ['gloves', 'respirator', 'face_shield', 'suit'].slice(0, Math.floor(rng.nextF64() * 4) + 1),
    emergencyShowers: Math.floor(rng.nextF64() * 10) + 2
  };
}

function generateCSV(params: ChemicalParams, rng: Xoshiro256StarStar): string {
  const lines = ['Stream,Temperature_C,Pressure_atm,Flow_kg_h'];
  for (let i = 0; i < 10; i++) {
    lines.push(`S${i},${rng.nextF64()*500+50},${rng.nextF64()*50+1},${rng.nextF64()*10000}`);
  }
  return lines.join('\n');
}

function extractParams(seed: Seed, rng: Xoshiro256StarStar): ChemicalParams {
  const quality = seed.genes?.quality?.value || 'medium';
  return {
    process: seed.genes?.process?.value || ['distillation', 'catalysis', 'polymerization', 'electrolysis'][rng.nextInt(0, 3)],
    scale: Math.floor(((seed.genes?.scale?.value as number || rng.nextF64()) * 990000) + 10000),
    purity: (seed.genes?.purity?.value as number || rng.nextF64()) * 0.99 + 0.01,
    quality: ['low', 'medium', 'high', 'photorealistic'].includes(quality) ? quality : 'medium'
  };
}
