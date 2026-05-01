/**
 * Physics Generator — produces simulation configuration files
 * Exports physics parameters for use in external engines
 */

import * as fs from 'fs';
import * as path from 'path';
import type { Seed } from '../engines';

interface PhysicsParams {
  gravity: number;
  friction: number;
  elasticity: number;
  simulationType: string;
  steps: number;
  quality: 'low' | 'medium' | 'high' | 'photorealistic';
}

export async function generatePhysics(seed: Seed, outputPath: string): Promise<{ filePath: string; configSize: number }> {
  const params = extractParams(seed);

  // Generate physics simulation config
  const config = {
    simulation: {
      type: params.simulationType,
      gravity: params.gravity,
      friction: params.friction,
      elasticity: params.elasticity,
      steps: params.steps,
      timeStep: 1 / 60,
      solver: 'sequential_impulse',
      quality: params.quality
    },
    bodies: generateBodies(params),
    constraints: generateConstraints(params),
    metadata: {
      generated: new Date().toISOString(),
      seed_hash: seed.$hash ?? 'unknown',
      engine_version: '2.0.0'
    }
  };

  // Ensure output directory exists
  const dir = path.dirname(outputPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  // Write JSON config
  const jsonPath = outputPath.replace(/\.gltf$/, '.json');
  fs.writeFileSync(jsonPath, JSON.stringify(config, null, 2));

  return {
    filePath: jsonPath,
    configSize: JSON.stringify(config).length
  };
}

function generateBodies(params: PhysicsParams): any[] {
  const bodyCount = params.quality === 'photorealistic' ? 50 :
                   params.quality === 'high' ? 30 :
                   params.quality === 'medium' ? 15 : 8;

  const bodies = [];
  for (let i = 0; i < bodyCount; i++) {
    bodies.push({
      id: `body_${i}`,
      type: i === 0 ? 'dynamic' : 'static',
      shape: ['box', 'sphere', 'cylinder'][i % 3],
      position: [Math.random() * 10 - 5, Math.random() * 10, Math.random() * 10 - 5],
      rotation: [0, 0, 0],
      mass: i === 0 ? 1.0 : 0,
      friction: params.friction,
      restitution: params.elasticity,
      dimensions: [1, 1, 1]
    });
  }

  return bodies;
}

function generateConstraints(params: PhysicsParams): any[] {
  return [
    {
      type: 'gravity',
      value: params.gravity,
      direction: [0, -1, 0]
    },
    {
      type: 'ground',
      position: [0, 0, 0],
      normal: [0, 1, 0]
    }
  ];
}

function extractParams(seed: Seed): PhysicsParams {
  const quality = seed.genes?.quality?.value || 'medium';
  const grav = seed.genes?.gravity?.value || 0.5;

  return {
    gravity: typeof grav === 'number' ? +(grav * 20).toFixed(2) : 9.8,
    friction: seed.genes?.friction?.value || 0.3,
    elasticity: seed.genes?.elasticity?.value || 0.8,
    simulationType: seed.genes?.simulationType?.value || 'rigid_body',
    steps: typeof seed.genes?.steps?.value === 'number' ? seed.genes.steps.value : 1000,
    quality: ['low', 'medium', 'high', 'photorealistic'].includes(quality) ? quality : 'medium'
  };
}
