/**
 * Aerospace Generator — produces aerospace designs
 * Spacecraft, satellites, propulsion systems
 * $1T market: Aerospace & Defense
 */

import * as fs from 'fs';
import * as path from 'path';
import type { Seed } from '../engines';
import { Xoshiro256StarStar, rngFromHash } from '../rng';

interface AerospaceParams {
  vehicleType: 'satellite' | 'rocket' | 'spaceship' | 'space_station' | 'probe';
  mass: number; // kg
  payload: number; // kg
  range: number; // km
  quality: 'low' | 'medium' | 'high' | 'photorealistic';
}

export async function generateAerospace(seed: Seed, outputPath: string): Promise<{ filePath: string; specPath: string; vehicleType: string }> {
  const rng = rngFromHash(seed.$hash || '');
  const params = extractParams(seed, rng);

  // Generate vehicle design
  const design = generateDesign(params, rng);

  // Generate propulsion system
  const propulsion = generatePropulsion(params, rng);

  // Generate mission profile
  const mission = generateMission(params, rng);

  const config = {
    aerospace: {
      vehicleType: params.vehicleType,
      mass: params.mass,
      payload: params.payload,
      range: params.range,
      quality: params.quality
    },
    design,
    propulsion,
    mission,
    materials: {
      primary: ['aluminum_lithium', 'carbon_composite', 'titanium', 'inconel'][rng.nextInt(0, 3)],
      thermalProtection: params.vehicleType === 'rocket' ? 'ablative_shield' : 'MLI'
    }
  };

  const dir = path.dirname(outputPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  const jsonPath = outputPath.replace(/\.json$/, '_aerospace.json');
  fs.writeFileSync(jsonPath, JSON.stringify(config, null, 2));

  // Write mission spec
  const specPath = outputPath.replace(/\.json$/, '_mission.txt');
  fs.writeFileSync(specPath, generateMissionSpec(params, rng));

  return {
    filePath: jsonPath,
    specPath,
    vehicleType: params.vehicleType
  };
}

function generateDesign(params: AerospaceParams, rng: Xoshiro256StarStar): any {
  return {
    dimensions: {
      length: params.vehicleType === 'rocket' ? 50 + rng.nextF64() * 50 : 5 + rng.nextF64() * 20,
      width: params.vehicleType === 'spaceship' ? 20 + rng.nextF64() * 30 : 2 + rng.nextF64() * 10,
      height: params.vehicleType === 'space_station' ? 40 + rng.nextF64() * 60 : 2 + rng.nextF64() * 10
    },
    stages: params.vehicleType === 'rocket' ? Math.floor(rng.nextF64() * 3) + 1 : 0,
    crewCapacity: params.vehicleType === 'spaceship' || params.vehicleType === 'space_station' 
      ? Math.floor(rng.nextF64() * 100) + 1 : 0,
    dockingPorts: params.vehicleType === 'space_station' ? Math.floor(rng.nextF64() * 10) + 2 : 0
  };
}

function generatePropulsion(params: AerospaceParams, rng: Xoshiro256StarStar): any {
  const type = params.vehicleType === 'probe' ? 'ion' : (params.vehicleType === 'rocket' ? 'chemical' : 'electric');
  return {
    type,
    thrust: type === 'chemical' ? rng.nextF64() * 10000e3 : rng.nextF64() * 1000, // N
    isp: type === 'chemical' ? 300 + rng.nextF64() * 200 : 3000 + rng.nextF64() * 5000, // seconds
    fuel: type === 'chemical' ? 'LOX_LH2' : 'xenon',
    fuelMass: params.mass * (type === 'chemical' ? 0.8 : 0.1)
  };
}

function generateMission(params: AerospaceParams, rng: Xoshiro256StarStar): any {
  return {
    target: ['LEO', 'GEO', 'Moon', 'Mars', 'Jupiter', 'Interstellar'][rng.nextInt(0, 5)],
    duration: params.vehicleType === 'probe' ? rng.nextF64() * 20 + 5 : rng.nextF64() * 5 + 0.5, // years
    objectives: ['deploy', 'explore', 'colonize', 'research'].slice(0, Math.floor(rng.nextF64() * 4) + 1),
    cost: params.mass * (rng.nextF64() * 10000 + 1000) // USD per kg
  };
}

function generateMissionSpec(params: AerospaceParams, rng: Xoshiro256StarStar): string {
  return `AEROSPACE MISSION SPECIFICATION
===============================
Vehicle: ${params.vehicleType}
Mass: ${params.mass} kg
Payload: ${params.payload} kg
Range: ${params.range} km

Propulsion: ${params.vehicleType === 'rocket' ? 'Chemical (LOX/LH2)' : 'Electric/Ion'}
Mission Target: ${['LEO', 'GEO', 'Moon', 'Mars'][rng.nextInt(0, 3)]}
Estimated Cost: $${(params.mass * 10000).toLocaleString()}

Paradigm GSPL Beyond Omega — Aerospace`;
}

function extractParams(seed: Seed, rng: Xoshiro256StarStar): AerospaceParams {
  const quality = seed.genes?.quality?.value || 'medium';

  return {
    vehicleType: seed.genes?.vehicleType?.value || ['satellite', 'rocket', 'spaceship', 'space_station', 'probe'][rng.nextInt(0, 4)],
    mass: ((seed.genes?.mass?.value as number || rng.nextF64()) * 99900) + 100, // 100-100000 kg
    payload: ((seed.genes?.payload?.value as number || rng.nextF64()) * 9900) + 100, // 100-10000 kg
    range: ((seed.genes?.range?.value as number || rng.nextF64()) * 999000) + 1000, // 1000-1000000 km
    quality: ['low', 'medium', 'high', 'photorealistic'].includes(quality) ? quality : 'medium'
  };
}
