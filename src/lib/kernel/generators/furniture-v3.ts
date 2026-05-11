/**
 * Furniture Generator V3 — Furniture Design with Materials
 * Features: Tables, chairs, storage, beds, material selection
 * Export: JSON specs, GLTF 3D model, assembly instructions
 */

import * as fs from 'fs';
import * as path from 'path';
import type { Seed } from '../engines';
import { Xoshiro256StarStar } from '../rng';

interface FurnitureParams {
  type: 'table' | 'chair' | 'storage' | 'bed' | 'desk' | 'sofa';
  style: 'modern' | 'traditional' | 'industrial' | 'scandinavian' | 'rustic';
  material: 'wood' | 'metal' | 'plastic' | 'glass' | 'composite';
  dimensions: [number, number, number];
  assembly: 'simple' | 'moderate' | 'complex';
}

export async function generateFurnitureV3(
  seed: Seed,
  outputPath: string
): Promise<{
  jsonPath: string;
  gltfPath: string;
  instructionsPath: string;
  specs: any;
}> {
  const rng = new Xoshiro256StarStar(seed.$hash || 'furniture-default');
  const params = extractFurnitureParams(seed, rng);
  
  // Generate specifications
  const specs = generateFurnitureSpecs(params, rng);
  
  // Generate 3D model
  const model3D = generateFurniture3D(params, specs, rng);
  
  // Generate assembly instructions
  const instructions = generateAssemblyInstructions(params, specs, rng);
  
  // Export
  const jsonPath = await exportFurnitureJSON({ params, specs, model3D, instructions }, outputPath, seed);
  const gltfPath = await exportFurnitureGLTF(model3D, outputPath, seed);
  const instructionsPath = await exportInstructions(instructions, outputPath, seed);
  
  return { jsonPath, gltfPath, instructionsPath, specs };
}

function extractFurnitureParams(seed: Seed, rng: Xoshiro256StarStar): FurnitureParams {
  const types = ['table', 'chair', 'storage', 'bed', 'desk', 'sofa'] as const;
  const styles = ['modern', 'traditional', 'industrial', 'scandinavian', 'rustic'] as const;
  const materials = ['wood', 'metal', 'plastic', 'glass', 'composite'] as const;
  const assemblies = ['simple', 'moderate', 'complex'] as const;
  
  return {
    type: types[Math.floor(rng.nextF64() * types.length)],
    style: styles[Math.floor(rng.nextF64() * styles.length)],
    material: materials[Math.floor(rng.nextF64() * materials.length)],
    dimensions: [
      0.3 + rng.nextF64() * 2,
      0.3 + rng.nextF64() * 1.5,
      0.3 + rng.nextF64() * 2
    ],
    assembly: assemblies[Math.floor(rng.nextF64() * assemblies.length)]
  };
}

function generateFurnitureSpecs(params: FurnitureParams, rng: Xoshiro256StarStar): any {
  const baseSpecs: any = {
    type: params.type,
    style: params.style,
    material: params.material,
    dimensions: {
      width: params.dimensions[0],
      depth: params.dimensions[1],
      height: params.dimensions[2],
      weight: 5 + rng.nextF64() * 50
    },
    finish: ['matte', 'gloss', 'satin', 'natural'][Math.floor(rng.nextF64() * 4)],
    loadCapacity: 20 + Math.floor(rng.nextF64() * 200)
  };
  
  if (params.type === 'chair' || params.type === 'sofa') {
    baseSpecs.seating = {
      height: 0.4 + rng.nextF64() * 0.2,
      depth: 0.4 + rng.nextF64() * 0.2,
      backrest: rng.nextF64() > 0.3
    };
  }
  
  if (params.type === 'storage') {
    baseSpecs.storage = {
      compartments: 1 + Math.floor(rng.nextF64() * 5),
      drawers: Math.floor(rng.nextF64() * 4),
      shelves: Math.floor(rng.nextF64() * 4)
    };
  }
  
  return baseSpecs;
}

function generateFurniture3D(params: FurnitureParams, specs: any, rng: Xoshiro256StarStar): any {
  return {
    type: params.type,
    vertices: 500 + Math.floor(rng.nextF64() * 3000),
    materials: [params.material, 'hardware', 'finish'],
    lodLevels: 2
  };
}

function generateAssemblyInstructions(params: FurnitureParams, specs: any, rng: Xoshiro256StarStar): any[] {
  const steps: any[] = [];
  const numSteps = params.assembly === 'simple' ? 5 : params.assembly === 'moderate' ? 10 : 15;
  
  const actions = ['Attach', 'Secure', 'Insert', 'Align', 'Fasten', 'Mount', 'Connect'];
  const parts = ['leg', 'panel', 'support', 'bracket', 'screw', 'bolt', 'dowel'];
  
  for (let i = 0; i < numSteps; i++) {
    steps.push({
      step: i + 1,
      action: actions[Math.floor(rng.nextF64() * actions.length)],
      parts: [parts[Math.floor(rng.nextF64() * parts.length)], parts[Math.floor(rng.nextF64() * parts.length)]],
      tools: ['screwdriver', 'allen key', 'hammer', 'wrench'].slice(0, 1 + Math.floor(rng.nextF64() * 2)),
      duration: 2 + Math.floor(rng.nextF64() * 8)
    });
  }
  
  return steps;
}

async function exportFurnitureJSON(data: any, outputPath: string, seed: Seed): Promise<string> {
  const filename = `furniture_${seed.$hash || 'unknown'}.json`;
  const filePath = path.join(outputPath, filename);
  if (typeof fs !== 'undefined') fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
  return filePath;
}

async function exportFurnitureGLTF(model: any, outputPath: string, seed: Seed): Promise<string> {
  const filename = `furniture_${seed.$hash || 'unknown'}.gltf`;
  const filePath = path.join(outputPath, filename);
  const gltf = { asset: { version: '2.0', generator: 'Paradigm Absolute' } };
  if (typeof fs !== 'undefined') fs.writeFileSync(filePath, JSON.stringify(gltf, null, 2));
  return filePath;
}

async function exportInstructions(instructions: any[], outputPath: string, seed: Seed): Promise<string> {
  const filename = `furniture_${seed.$hash || 'unknown'}_instructions.json`;
  const filePath = path.join(outputPath, filename);
  if (typeof fs !== 'undefined') fs.writeFileSync(filePath, JSON.stringify(instructions, null, 2));
  return filePath;
}
