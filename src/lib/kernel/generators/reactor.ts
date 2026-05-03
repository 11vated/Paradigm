/**
 * Reactor Generator — produces fusion reactor designs
 * Tokamak, stellarator, inertial confinement
 * $5T market: Energy (fusion reactors)
 */

import * as fs from 'fs';
import * as path from 'path';
import type { Seed } from '../engines';
import { Xoshiro256StarStar, rngFromHash } from '../rng';

interface ReactorParams {
  type: 'tokamak' | 'stellarator' | 'inertial' | 'magnetic';
  powerOutput: number; // MW
  temperature: number; // million Kelvin
  magneticField: number; // Tesla
  quality: 'low' | 'medium' | 'high' | 'photorealistic';
}

export async function generateReactor(seed: Seed, outputPath: string): Promise<{ filePath: string; schematicPath: string; powerOutput: number }> {
  const rng = rngFromHash(seed.$hash || '');
  const params = extractParams(seed, rng);

  // Generate reactor design
  const design = generateDesign(params, rng);

  // Generate plasma physics config
  const plasma = generatePlasma(params, rng);

  // Generate safety systems
  const safety = generateSafety(params, rng);

  const config = {
    reactor: {
      type: params.type,
      powerOutput: params.powerOutput,
      temperature: params.temperature,
      magneticField: params.magneticField,
      quality: params.quality
    },
    design,
    plasma,
    safety,
    gridConnection: {
      voltage: 500000, // 500kV
      frequency: 60, // Hz
      phaseCount: 3,
      maxExport: params.powerOutput * 0.9 // 90% export
    }
  };

  const dir = path.dirname(outputPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  const jsonPath = outputPath.replace(/\.json$/, '_reactor.json');
  fs.writeFileSync(jsonPath, JSON.stringify(config, null, 2));

  // Write schematic (SVG placeholder)
  const schematicPath = outputPath.replace(/\.json$/, '_schematic.svg');
  fs.writeFileSync(schematicPath, generateSchematicSVG(params, rng));

  return {
    filePath: jsonPath,
    schematicPath,
    powerOutput: params.powerOutput
  };
}

function generateDesign(params: ReactorParams, rng: Xoshiro256StarStar): any {
  const majorRadius = params.type === 'tokamak' ? 6 + rng.nextF64() * 4 : 0; // meters
  const minorRadius = params.type === 'tokamak' ? 2 + rng.nextF64() * 1 : 0;

  return {
    geometry: params.type,
    dimensions: {
      majorRadius,
      minorRadius,
      height: params.type === 'tokamak' ? majorRadius * 2 : 10 + rng.nextF64() * 5
    },
    materials: ['tungsten', 'beryllium', 'lithium', 'deuterium', 'tritium'],
    blanket: {
      type: 'lithium-lead',
      thickness: 0.5 + rng.nextF64() * 0.5 // meters
    },
    magnets: {
      type: params.magneticField > 5 ? 'superconducting' : 'copper',
      fieldStrength: params.magneticField,
      cooling: 'liquid helium'
    }
  };
}

function generatePlasma(params: ReactorParams, rng: Xoshiro256StarStar): any {
  return {
    temperature: params.temperature, // million Kelvin
    density: rng.nextF64() * 1e21, // particles/m^3
    confinementTime: 1 + rng.nextF64() * 1000, // seconds
    beta: rng.nextF64() * 0.05, // plasma pressure / magnetic pressure
    qFactor: 1 + rng.nextF64() * 2, // safety factor
    fuel: ['deuterium-tritium', 'deuterium-deuterium', 'helium-3'][rng.nextInt(0, 2)]
  };
}

function generateSafety(params: ReactorParams, rng: Xoshiro256StarStar): any {
  return {
    shielding: {
      type: 'concrete + water + boron',
      thickness: 2 + rng.nextF64() * 3 // meters
    },
    emergency: {
      scramTime: 0.1 + rng.nextF64() * 0.9, // seconds
      coolingSystems: Math.floor(rng.nextF64() * 10) + 5,
      redundancy: '2N+1'
    },
    radiation: {
      neutronFlux: rng.nextF64() * 1e14, // neutrons/cm^2/s
      gammaDose: rng.nextF64() * 1000 // Gy/hr
    }
  };
}

function generateSchematicSVG(params: ReactorParams, rng: Xoshiro256StarStar): string {
  const width = 800;
  const height = 600;

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
  <rect width="100%" height="100%" fill="#1a1a1a"/>
  <text x="50%" y="30" text-anchor="middle" font-size="20" fill="white">${params.type} Fusion Reactor</text>
  <text x="50%" y="60" text-anchor="middle" font-size="14" fill="#aaa">${params.powerOutput} MW | ${params.temperature}M K | ${params.magneticField}T</text>
  
  <!-- Reactor vessel -->
  <ellipse cx="${width/2}" cy="${height/2}" rx="${150 + rng.nextF64() * 50}" ry="${100 + rng.nextF64() * 30}" fill="#333" stroke="#666" stroke-width="3"/>
  
  <!-- Plasma -->
  <ellipse cx="${width/2}" cy="${height/2}" rx="${100 + rng.nextF64() * 30}" ry="${60 + rng.nextF64() * 20}" fill="#f00" opacity="0.5"/>
  
  <!-- Magnets -->
  ${Array.from({ length: 8 }, (_, i) => {
    const angle = (i / 8) * Math.PI * 2;
    const x = width/2 + Math.cos(angle) * 200;
    const y = height/2 + Math.sin(angle) * 150;
    return `<rect x="${x - 10}" y="${y - 10}" width="20" height="20" fill="#00f" opacity="0.7"/>`;
  }).join('\n  ')}
  
  <text x="50%" y="${height - 30}" text-anchor="middle" font-size="12" fill="#aaa">Paradigm GSPL Beyond Omega — Fusion Energy</text>
</svg>`;
}

function extractParams(seed: Seed, rng: Xoshiro256StarStar): ReactorParams {
  const quality = seed.genes?.quality?.value || 'medium';

  return {
     type: seed.genes?.type?.value || ['tokamak', 'stellarator', 'inertial', 'magnetic'][rng.nextInt(0, 3)],
      powerOutput: Math.floor(((seed.genes?.powerOutput?.value as number || rng.nextF64()) * 1000) + 100), // 100-1100 MW
      temperature: Math.floor(((seed.genes?.temperature?.value as number || rng.nextF64()) * 150) + 50), // 50-200 million K
     magneticField: ((seed.genes?.magneticField?.value as number || rng.nextF64()) * 10) + 2, // 2-12 Tesla
    quality: ['low', 'medium', 'high', 'photorealistic'].includes(quality) ? quality : 'medium'
  };
}

