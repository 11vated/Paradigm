/**
 * Particle Generator — produces particle system configuration
 * Exports JSON config for particle effects
 */

import * as fs from 'fs';
import * as path from 'path';
import type { Seed } from '../engines';

interface ParticleParams {
  emitter: string;
  count: number;
  lifetime: number;
  velocity: [number, number, number];
  quality: 'low' | 'medium' | 'high' | 'photorealistic';
}

export async function generateParticle(seed: Seed, outputPath: string): Promise<{ filePath: string; particleCount: number }> {
  const params = extractParams(seed);

  const config = {
    emitter: {
      type: params.emitter,
      position: [0, 0, 0],
      rate: params.count / params.lifetime,
      lifetime: params.lifetime
    },
    particles: Array.from({ length: Math.min(params.count, 1000) }, (_, i) => ({
      id: i,
      initialVelocity: params.velocity,
      size: 0.1 + Math.random() * 0.5,
      color: [Math.random(), Math.random(), Math.random()],
      drag: 0.98
    })),
    physics: {
      gravity: [0, -9.8, 0],
      bounce: 0.3
    },
    quality: params.quality
  };

  const dir = path.dirname(outputPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  const jsonPath = outputPath.replace(/\.gltf$/, '.json');
  fs.writeFileSync(jsonPath, JSON.stringify(config, null, 2));

  return {
    filePath: jsonPath,
    particleCount: config.particles.length
  };
}

function extractParams(seed: Seed): ParticleParams {
  const quality = seed.genes?.quality?.value || 'medium';
  const count = seed.genes?.count?.value || 0.5;

  // Fix: write numbers without any separators
  const qualLow = 100;
  const qualMed = 500;
  const qualHigh = 1000;
  const qualPR = 5000;
  const qualityMultipliers: Record<string, number> = { low: qualLow, medium: qualMed, high: qualHigh, photorealistic: qualPR };

  return {
    emitter: seed.genes?.emitter?.value || 'point',
    count: Math.max(10, Math.floor((typeof count === 'number' ? count : 0.5) * qualityMultipliers[quality])),
    lifetime: seed.genes?.lifetime?.value || 2.0,
    velocity: seed.genes?.velocity?.value || [0, 1, 0],
    quality: ['low', 'medium', 'high', 'photorealistic'].includes(quality) ? quality : 'medium'
  };
}
