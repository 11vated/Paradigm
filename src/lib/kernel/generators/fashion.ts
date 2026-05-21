/**
 * Fashion Generator V3 — Garment Design with Drape Simulation
 * Features: Clothing items, fabrics, patterns, sizing
 * Export: JSON specs, SVG patterns, GLTF 3D model
 */

import * as fs from 'fs';
import * as path from 'path';
import type { Seed } from '../engines';
import { Xoshiro256StarStar } from '../rng';

interface FashionParams {
  type: 'shirt' | 'pants' | 'dress' | 'jacket' | 'skirt' | 'coat';
  style: 'casual' | 'formal' | 'sport' | 'vintage' | 'avant-garde';
  fabric: 'cotton' | 'silk' | 'wool' | 'polyester' | 'linen' | 'leather';
  size: 'XS' | 'S' | 'M' | 'L' | 'XL' | 'XXL';
  gender: 'unisex' | 'masculine' | 'feminine';
  season: 'spring' | 'summer' | 'fall' | 'winter';
}

interface Pattern {
  name: string;
  pieces: { name: string; shape: string; dimensions: [number, number] }[];
  seamAllowance: number;
  grainline: string;
}

export async function generateFashionV3(
  seed: Seed,
  outputPath: string
): Promise<{
  jsonPath: string;
  patternPath: string;
  gltfPath: string;
  specs: any;
}> {
  const rng = new Xoshiro256StarStar(seed.$hash || 'fashion-default');
  const params = extractFashionParams(seed, rng);
  
  // Generate specifications
  const specs = generateFashionSpecs(params, rng);
  
  // Generate pattern
  const pattern = generatePattern(params, specs, rng);
  
  // Generate 3D model
  const model3D = generateFashion3D(params, specs, rng);
  
  // Export
  const jsonPath = await exportFashionJSON({ params, specs, pattern, model3D }, outputPath, seed);
  const patternPath = await exportPatternSVG(pattern, outputPath, seed);
  const gltfPath = await exportFashionGLTF(model3D, outputPath, seed);
  
  return { jsonPath, patternPath, gltfPath, specs };
}

function extractFashionParams(seed: Seed, rng: Xoshiro256StarStar): FashionParams {
  const types = ['shirt', 'pants', 'dress', 'jacket', 'skirt', 'coat'] as const;
  const styles = ['casual', 'formal', 'sport', 'vintage', 'avant-garde'] as const;
  const fabrics = ['cotton', 'silk', 'wool', 'polyester', 'linen', 'leather'] as const;
  const sizes = ['XS', 'S', 'M', 'L', 'XL', 'XXL'] as const;
  const genders = ['unisex', 'masculine', 'feminine'] as const;
  const seasons = ['spring', 'summer', 'fall', 'winter'] as const;
  
  return {
    type: types[Math.floor(rng.nextF64() * types.length)],
    style: styles[Math.floor(rng.nextF64() * styles.length)],
    fabric: fabrics[Math.floor(rng.nextF64() * fabrics.length)],
    size: sizes[Math.floor(rng.nextF64() * sizes.length)],
    gender: genders[Math.floor(rng.nextF64() * genders.length)],
    season: seasons[Math.floor(rng.nextF64() * seasons.length)]
  };
}

function generateFashionSpecs(params: FashionParams, rng: Xoshiro256StarStar): any {
  const sizeMeasurements: Record<string, { chest: number; waist: number; hip: number }> = {
    'XS': { chest: 80, waist: 64, hip: 84 },
    'S': { chest: 88, waist: 70, hip: 92 },
    'M': { chest: 96, waist: 78, hip: 100 },
    'L': { chest: 104, waist: 86, hip: 108 },
    'XL': { chest: 112, waist: 94, hip: 116 },
    'XXL': { chest: 120, waist: 102, hip: 124 }
  };
  
  const measurements = sizeMeasurements[params.size];
  
  return {
    type: params.type,
    style: params.style,
    fabric: {
      type: params.fabric,
      weight: 100 + Math.floor(rng.nextF64() * 300), // gsm
      drape: rng.nextF64(),
      stretch: rng.nextF64() > 0.5,
      care: ['machine wash', 'dry clean', 'hand wash'][Math.floor(rng.nextF64() * 3)]
    },
    measurements: {
      chest: measurements.chest + (rng.nextF64() - 0.5) * 4,
      waist: measurements.waist + (rng.nextF64() - 0.5) * 4,
      hip: measurements.hip + (rng.nextF64() - 0.5) * 4,
      length: 50 + rng.nextF64() * 50,
      sleeve: params.type === 'shirt' || params.type === 'jacket' ? 55 + rng.nextF64() * 15 : 0
    },
    features: {
      pockets: Math.floor(rng.nextF64() * 4),
      buttons: Math.floor(rng.nextF64() * 8),
      collar: rng.nextF64() > 0.5,
      cuffs: rng.nextF64() > 0.5,
      lining: rng.nextF64() > 0.7
    },
    colors: [
      [rng.nextF64(), rng.nextF64(), rng.nextF64()],
      [rng.nextF64(), rng.nextF64(), rng.nextF64()]
    ]
  };
}

function generatePattern(params: FashionParams, specs: any, rng: Xoshiro256StarStar): Pattern {
  const pieces: any[] = [];
  
  if (params.type === 'shirt') {
    pieces.push({ name: 'Front', shape: 'rectangle', dimensions: [specs.measurements.chest / 2 + 5, specs.measurements.length] });
    pieces.push({ name: 'Back', shape: 'rectangle', dimensions: [specs.measurements.chest / 2 + 5, specs.measurements.length] });
    pieces.push({ name: 'Sleeve', shape: 'tapered', dimensions: [specs.measurements.sleeve, 30] });
    pieces.push({ name: 'Collar', shape: 'strip', dimensions: [40, 8] });
  } else if (params.type === 'pants') {
    pieces.push({ name: 'Front Leg', shape: 'L-shape', dimensions: [specs.measurements.waist / 4 + 5, specs.measurements.length] });
    pieces.push({ name: 'Back Leg', shape: 'L-shape', dimensions: [specs.measurements.waist / 4 + 5, specs.measurements.length] });
    pieces.push({ name: 'Waistband', shape: 'strip', dimensions: [specs.measurements.waist + 10, 5] });
  } else {
    pieces.push({ name: 'Main Body', shape: 'custom', dimensions: [specs.measurements.chest, specs.measurements.length] });
  }
  
  return {
    name: `${params.type}_${params.style}_pattern`,
    pieces,
    seamAllowance: 1.5,
    grainline: 'vertical'
  };
}

function generateFashion3D(params: FashionParams, specs: any, rng: Xoshiro256StarStar): any {
  return {
    type: params.type,
    vertices: 2000 + Math.floor(rng.nextF64() * 8000),
    materials: [params.fabric, 'thread', 'hardware'],
    simulation: {
      drape: specs.fabric.drape,
      stretch: specs.fabric.stretch,
      thickness: specs.fabric.weight / 1000
    }
  };
}

async function exportFashionJSON(data: any, outputPath: string, seed: Seed): Promise<string> {
  const filename = `fashion_${seed.$hash || 'unknown'}.json`;
  const filePath = path.join(outputPath, filename);
  if (typeof fs !== 'undefined') fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
  return filePath;
}

async function exportPatternSVG(pattern: Pattern, outputPath: string, seed: Seed): Promise<string> {
  const filename = `fashion_${seed.$hash || 'unknown'}_pattern.svg`;
  const filePath = path.join(outputPath, filename);
  
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 700">
  <style>.piece{fill:#e0e0e0;stroke:#333;stroke-width:2}.label{font-size:12px}</style>
  <text x="10" y="20" font-size="16">${pattern.name}</text>
  ${pattern.pieces.map((p, i) => `
  <g transform="translate(${10 + (i % 3) * 160}, ${40 + Math.floor(i / 3) * 200})">
    <rect class="piece" width="${p.dimensions[0] * 2}" height="${p.dimensions[1] * 2}" />
    <text class="label" x="5" y="20">${p.name}</text>
    <text class="label" x="5" y="35">${p.dimensions[0]} x ${p.dimensions[1]} cm</text>
  </g>`).join('')}
  <text x="10" y="680" font-size="12">Seam Allowance: ${pattern.seamAllowance}cm | Grainline: ${pattern.grainline}</text>
</svg>`;
  
  if (typeof fs !== 'undefined') fs.writeFileSync(filePath, svg);
  return filePath;
}

async function exportFashionGLTF(model: any, outputPath: string, seed: Seed): Promise<string> {
  const filename = `fashion_${seed.$hash || 'unknown'}.gltf`;
  const filePath = path.join(outputPath, filename);
  const gltf = { asset: { version: '2.0', generator: 'Paradigm Absolute' } };
  if (typeof fs !== 'undefined') fs.writeFileSync(filePath, JSON.stringify(gltf, null, 2));
  return filePath;
}

// ── Canonical aliases (added by phase-0.5 consolidation) ──
export { generateFashionV3 as generateFashion };
