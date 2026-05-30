/**
 * Vehicle Generator — CANONICAL (Doctrine v2 Phase 2 Consolidation)
 *
 * PRIMARY / canonical implementation for vehicle design generation.
 * All engine dispatch, contracts, paradigm make, and new development MUST target this file + vehicle-contract.ts.
 *
 * Siblings (vehicle-3d.ts) carry deprecation banners + PARADIGM-RENAME-OK waivers (sunset 2026-08-25).
 * Real dispatch enforcement + golden regeneration in progress.
 *
 * Features: Cars, boats, aircraft, physics properties
 * Export: JSON specs, GLTF 3D model, interactive HTML
 *
 * PHASE 2 NOTE: Canonical primary. Target vehicle.ts exclusively for new work.
 *
 * GOLDEN CORPUS STABILITY TODO (high priority):
 * Vehicle golden hashes are still drifting between runs even after synthesize fix.
 * Root cause investigation + hardening required before vehicle can be marked PINNED.
 * See golden/vehicle-golden-hashes.json and scripts/capture-golden-vehicles.ts.
 */

import * as fs from 'fs';
import * as path from 'path';
import type { Seed } from '../engines';
import { Xoshiro256StarStar } from '../rng';

interface VehicleParams {
  type: 'car' | 'boat' | 'aircraft' | 'motorcycle' | 'truck';
  purpose: 'passenger' | 'cargo' | 'racing' | 'military';
  propulsion: 'combustion' | 'electric' | 'hybrid' | 'steam' | 'solar';
  wheels: number;
  maxSpeed: number;
  capacity: number;
}

export async function generateVehicleV3(
  seed: Seed,
  outputPath: string
): Promise<{
  jsonPath: string;
  gltfPath: string;
  htmlPath: string;
  specs: any;
}> {
  const rng = new Xoshiro256StarStar(seed.$hash || 'vehicle-default');
  const params = extractVehicleParams(seed, rng);
  
  // Generate specifications
  const specs = generateVehicleSpecs(params, rng);
  
  // Generate 3D model
  const model3D = generateVehicle3D(params, specs, rng);
  
  // Export
  const jsonPath = await exportVehicleJSON({ params, specs, model3D }, outputPath, seed);
  const gltfPath = await exportVehicleGLTF(model3D, outputPath, seed);
  const htmlPath = await exportVehicleHTML(params, specs, outputPath, seed);
  
  return { jsonPath, gltfPath, htmlPath, specs };
}

function extractVehicleParams(seed: Seed, rng: Xoshiro256StarStar): VehicleParams {
  const types = ['car', 'boat', 'aircraft', 'motorcycle', 'truck'] as const;
  const purposes = ['passenger', 'cargo', 'racing', 'military'] as const;
  const propulsions = ['combustion', 'electric', 'hybrid', 'steam', 'solar'] as const;
  
  return {
    type: types[Math.floor(rng.nextF64() * types.length)],
    purpose: purposes[Math.floor(rng.nextF64() * purposes.length)],
    propulsion: propulsions[Math.floor(rng.nextF64() * propulsions.length)],
    wheels: rng.nextF64() > 0.8 ? 2 : rng.nextF64() > 0.5 ? 4 : 6 + Math.floor(rng.nextF64() * 10),
    maxSpeed: 50 + Math.floor(rng.nextF64() * 350),
    capacity: 1 + Math.floor(rng.nextF64() * 100)
  };
}

function generateVehicleSpecs(params: VehicleParams, rng: Xoshiro256StarStar): any {
  return {
    engine: {
      type: params.propulsion,
      power: 50 + Math.floor(rng.nextF64() * 950), // HP
      torque: 100 + Math.floor(rng.nextF64() * 900), // Nm
      displacement: params.propulsion === 'electric' ? 0 : 1 + rng.nextF64() * 7 // Liters
    },
    dimensions: {
      length: 2 + rng.nextF64() * 6, // meters
      width: 1 + rng.nextF64() * 2,
      height: 1 + rng.nextF64() * 3,
      wheelbase: 1.5 + rng.nextF64() * 2
    },
    weight: 500 + Math.floor(rng.nextF64() * 4500), // kg
    acceleration: {
      '0-60': 2 + rng.nextF64() * 10, // seconds
      '0-100': 5 + rng.nextF64() * 20
    },
    fuel: {
      type: params.propulsion === 'electric' ? 'battery' : params.propulsion === 'steam' ? 'water' : 'gasoline',
      capacity: params.propulsion === 'electric' ? 50 + rng.nextF64() * 150 : 30 + rng.nextF64() * 70,
      consumption: 3 + rng.nextF64() * 15
    }
  };
}

function generateVehicle3D(params: VehicleParams, specs: any, rng: Xoshiro256StarStar): any {
  return {
    type: params.type,
    vertices: 1000 + Math.floor(rng.nextF64() * 5000),
    materials: ['body', 'glass', 'interior', 'wheels'],
    lodLevels: 3
  };
}

async function exportVehicleJSON(data: any, outputPath: string, seed: Seed): Promise<string> {
  const filename = `vehicle_${seed.$hash || 'unknown'}.json`;
  const filePath = path.join(outputPath, filename);
  if (typeof fs !== 'undefined') fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
  return filePath;
}

async function exportVehicleGLTF(model: any, outputPath: string, seed: Seed): Promise<string> {
  const filename = `vehicle_${seed.$hash || 'unknown'}.gltf`;
  const filePath = path.join(outputPath, filename);
  const gltf = { asset: { version: '2.0', generator: 'Paradigm Absolute' } };
  if (typeof fs !== 'undefined') fs.writeFileSync(filePath, JSON.stringify(gltf, null, 2));
  return filePath;
}

async function exportVehicleHTML(params: VehicleParams, specs: any, outputPath: string, seed: Seed): Promise<string> {
  const filename = `vehicle_${seed.$hash || 'unknown'}.html`;
  const filePath = path.join(outputPath, filename);
  
  const html = `<!DOCTYPE html><html><head><title>Vehicle - ${seed.$hash}</title>
<style>body{font-family:system-ui;padding:20px;background:#1a1a1a;color:#fff;max-width:800px;margin:0 auto}
.spec{display:grid;grid-template-columns:1fr 1fr;gap:10px;background:#2a2a2a;padding:16px;margin:8px 0;border-radius:8px}
.label{color:#888}</style></head><body>
<h1>${params.type.toUpperCase()} - ${params.purpose} ${params.propulsion}</h1>
<div class="spec"><span class="label">Max Speed</span><span>${specs.engine.power} HP / ${params.maxSpeed} km/h</span></div>
<div class="spec"><span class="label">Engine</span><span>${params.propulsion} / ${specs.engine.displacement}L / ${specs.engine.torque} Nm</span></div>
<div class="spec"><span class="label">Dimensions</span><span>${specs.dimensions.length}m x ${specs.dimensions.width}m x ${specs.dimensions.height}m</span></div>
<div class="spec"><span class="label">Weight</span><span>${specs.weight} kg</span></div>
<div class="spec"><span class="label">0-60 mph</span><span>${specs.acceleration['0-60'].toFixed(1)}s</span></div>
<div class="spec"><span class="label">Capacity</span><span>${params.capacity} ${params.purpose === 'cargo' ? 'tons' : 'passengers'}</span></div>
</body></html>`;
  
  if (typeof fs !== 'undefined') fs.writeFileSync(filePath, html);
  return filePath;
}

// ── Canonical aliases (added by phase-0.5 consolidation) ──
export { generateVehicleV3 as generateVehicle };
