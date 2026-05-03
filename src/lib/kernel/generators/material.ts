/**
 * Material Generator — produces new material designs
 * Metamaterials, superconductors, smart materials
 * $1T market: Advanced Materials
 */

import * as fs from 'fs';
import * as path from 'path';
import type { Seed } from '../engines';
import { Xoshiro256StarStar, rngFromHash } from '../rng';

interface MaterialParams {
  type: 'metamaterial' | 'superconductor' | 'smart' | 'composite' | '2d_material';
  strength: number; // GPa
  conductivity: number; // S/m
  density: number; // g/cm^3
  quality: 'low' | 'medium' | 'high' | 'photorealistic';
}

export async function generateMaterial(seed: Seed, outputPath: string): Promise<{ filePath: string; formulaPath: string; type: string }> {
  const rng = rngFromHash(seed.$hash || '');
  const params = extractParams(seed, rng);

  // Generate material structure
  const structure = generateStructure(params, rng);

  // Generate properties
  const properties = generateProperties(params, rng);

  // Generate synthesis method
  const synthesis = generateSynthesis(params, rng);

  const config = {
    material: {
      type: params.type,
      strength: params.strength,
      conductivity: params.conductivity,
      density: params.density,
      quality: params.quality
    },
    structure,
    properties,
    synthesis,
    applications: [
      'aerospace', 'electronics', 'energy', 'medical', 'construction'
    ].slice(0, Math.floor(rng.nextF64() * 5) + 1)
  };

  const dir = path.dirname(outputPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  const jsonPath = outputPath.replace(/\.json$/, '_material.json');
  fs.writeFileSync(jsonPath, JSON.stringify(config, null, 2));

  // Write chemical formula
  const formulaPath = outputPath.replace(/\.json$/, '_formula.txt');
  fs.writeFileSync(formulaPath, generateFormula(params, rng));

  return {
    filePath: jsonPath,
    formulaPath,
    type: params.type
  };
}

function generateStructure(params: MaterialParams, rng: Xoshiro256StarStar): any {
  const crystalStructures = ['FCC', 'BCC', 'HCP', 'diamond', 'graphene_lattice'];

  return {
    crystalStructure: params.type === '2d_material' ? 'graphene_lattice' : crystalStructures[rng.nextInt(0, 4)],
    latticeConstant: rng.nextF64() * 5 + 2, // Angstroms
    unitCells: Math.floor(rng.nextF64() * 1000) + 100,
    defects: {
      vacancies: rng.nextF64() * 0.01,
      dislocations: rng.nextF64() * 100 // per cm^2
    },
    layers: params.type === '2d_material' ? rng.nextInt(1, 10) : 1
  };
}

function generateProperties(params: MaterialParams, rng: Xoshiro256StarStar): any {
  return {
    mechanical: {
      youngsModulus: params.strength * 1000, // GPa to MPa
      tensileStrength: params.strength,
      ductility: rng.nextF64(),
      hardness: rng.nextF64() * 10 // GPa
    },
    electrical: {
      conductivity: params.conductivity,
      bandGap: rng.nextF64() * 5, // eV
      dielectricConstant: rng.nextF64() * 20 + 1
    },
    thermal: {
      conductivity: rng.nextF64() * 500, // W/mK
      expansion: rng.nextF64() * 20e-6 // per K
    },
    density: params.density
  };
}

function generateSynthesis(params: MaterialParams, rng: Xoshiro256StarStar): any {
  const methods = {
    metamaterial: 'lithography',
    superconductor: 'thin_film_deposition',
    smart: 'self_assembly',
    composite: 'layup_curing',
    '2d_material': 'CVD'
  };

  return {
    method: methods[params.type] || 'unknown',
    temperature: rng.nextF64() * 1000 + 100, // °C
    pressure: rng.nextF64() * 100 + 1, // atm
    time: rng.nextF64() * 48 + 1, // hours
    purity: rng.nextF64() * 0.2 + 0.8 // 80-100%
  };
}

function generateFormula(params: MaterialParams, rng: Xoshiro256StarStar): string {
  const formulas: Record<string, string> = {
    metamaterial: 'Meta[SiO2/Ag]n',
    superconductor: 'YBa2Cu3O7-x',
    smart: 'ShapeMemory[NiTi]',
    composite: 'Cf/Epoxy',
    '2d_material': 'C(Graphene)'
  };
  return `Material Formula: ${formulas[params.type] || 'XaYbZc'}
Density: ${params.density} g/cm³
Strength: ${params.strength} GPa
Conductivity: ${params.conductivity} S/m`;
}

function extractParams(seed: Seed, rng: Xoshiro256StarStar): MaterialParams {
  const quality = seed.genes?.quality?.value || 'medium';

  return {
    type: seed.genes?.type?.value || ['metamaterial', 'superconductor', 'smart', 'composite', '2d_material'][rng.nextInt(0, 4)],
    strength: ((seed.genes?.strength?.value as number || rng.nextF64()) * 99) + 1, // 1-100 GPa
    conductivity: Math.pow(10, (seed.genes?.conductivity?.value as number || rng.nextF64()) * 8 + 2), // 10^2 to 10^10 S/m
    density: ((seed.genes?.density?.value as number || rng.nextF64()) * 19) + 1, // 1-20 g/cm^3
    quality: ['low', 'medium', 'high', 'photorealistic'].includes(quality) ? quality : 'medium'
  };
}
