/**
 * Physics Generator — produces simulation config with Web Worker support
 * Enhanced with multiple physics engines and quality tiers
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

export async function generatePhysicsEnhanced(seed: Seed, outputPath: string): Promise<{ filePath: string; bodyCount: number }> {
  const params = extractParams(seed);

  // Generate enhanced simulation config
  const config = {
    simulation: {
      type: params.simulationType,
      gravity: params.gravity,
      friction: params.friction,
      elasticity: params.elasticity,
      steps: params.steps,
      timeStep: 1 / 60,
      solver: getSolver(params.quality),
      quality: params.quality
    },
    bodies: generateBodiesEnhanced(params),
    constraints: generateConstraintsEnhanced(params),
    qualitySettings: getQualitySettings(params.quality),
    workerScript: 'physics-worker.js', // For Web Worker offloading
    metadata: {
      generated: new Date().toISOString(),
      seed_hash: seed.$hash ?? 'unknown',
      engine_version: '2.0.0'
    }
  };

  // Ensure output directory exists
  const dir = path.dirname(outputPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  // Write enhanced JSON config
  const jsonPath = outputPath.replace(/\.json$/, '_enhanced.json');
  fs.writeFileSync(jsonPath, JSON.stringify(config, null, 2));

  // Write Web Worker script for offloading
  const workerPath = outputPath.replace(/\.json$/, '_worker.js');
  fs.writeFileSync(workerPath, generateWorkerScript());

  return { filePath: jsonPath, bodyCount: config.bodies.length };
}

function generateBodiesEnhanced(params: PhysicsParams): any[] {
  const bodyCount = getBodyCount(params.quality);
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
      dimensions: [1, 1, 1],
      material: {
        friction: params.friction,
        restitution: params.elasticity,
        density: 1.0
      }
    });
  }

  return bodies;
}

function generateConstraintsEnhanced(params: PhysicsParams): any[] {
  return [
    {
      type: 'gravity',
      value: params.gravity,
      direction: [0, -1, 0]
    },
    {
      type: 'ground',
      position: [0, 0, 0],
      normal: [0, 1, 0],
      restitution: params.elasticity
    },
    {
      type: 'contact',
      friction: params.friction,
      restitution: params.elasticity
    }
  ];
}

function getBodyCount(quality: string): number {
  const counts: Record<string, number> = {
    low: 10,
    medium: 30,
    high: 100,
    photorealistic: 500
  };
  return counts[quality] || 30;
}

function getSolver(quality: string): string {
  const solvers: Record<string, string> = {
    low: 'sequential_impulse',
    medium: 'sequential_impulse',
    high: 'projected_gauss_seidel',
    photorealistic: 'projected_gauss_seidel'
  };
  return solvers[quality] || 'sequential_impulse';
}

function getQualitySettings(quality: string): any {
  const settings: Record<string, any> = {
    low: { timeStep: 1/30, subSteps: 1, solverIterations: 10 },
    medium: { timeStep: 1/60, subSteps: 2, solverIterations: 20 },
    high: { timeStep: 1/120, subSteps: 4, solverIterations: 40 },
    photorealistic: { timeStep: 1/240, subSteps: 8, solverIterations: 80 }
  };
  return settings[quality] || settings.medium;
}

function generateWorkerScript(): string {
  return `/**
 * Physics Worker — offloads simulation to Web Worker
 * Handles physics step calculations in background thread
 */

self.onmessage = function(e) {
  const { bodies, constraints, timeStep } = e.data;
  
  // Simple physics simulation step
  bodies.forEach(body => {
    if (body.type !== 'dynamic') return;
    
    // Apply gravity
    body.velocity = body.velocity || [0, 0, 0];
    body.velocity[1] -= 9.8 * timeStep;
    
    // Update position
    body.position[0] += body.velocity[0] * timeStep;
    body.position[1] += body.velocity[1] * timeStep;
    body.position[2] += body.velocity[2] * timeStep;
    
    // Ground collision
    if (body.position[1] < body.dimensions[1]/2) {
      body.position[1] = body.dimensions[1]/2;
      body.velocity[1] = -body.velocity[1] * 0.7; // restitution
    }
  });
  
  self.postMessage({ bodies });
};
`;
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
