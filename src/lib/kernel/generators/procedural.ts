/**
 * Procedural Generator — produces terrain heightmaps
 * Generates procedural terrain using Perlin noise
 */

import { createCanvas } from 'canvas';
import * as fs from 'fs';
import * as path from 'path';
import type { Seed } from '../engines';

interface ProceduralParams {
  octaves: number;
  persistence: number;
  scale: number;
  biome: string;
  heightmapSize: number;
  quality: 'low' | 'medium' | 'high' | 'photorealistic';
}

export async function generateProcedural(seed: Seed, outputPath: string): Promise<{ filePath: string; width: number; height: number }> {
  const params = extractParams(seed);

  const canvas = createCanvas(params.heightmapSize, params.heightmapSize);
  const ctx = canvas.getContext('2d');
  const imageData = ctx.createImageData(params.heightmapSize, params.heightmapSize);

  // Generate Perlin-like noise
  for (let y = 0; y < params.heightmapSize; y++) {
    for (let x = 0; x < params.heightmapSize; x++) {
      const nx = x / params.heightmapSize;
      const ny = y / params.heightmapSize;

      let value = 0;
      let amplitude = 1;
      let frequency = params.scale;

      for (let o = 0; o < params.octaves; o++) {
        value += amplitude * noise2D(nx * frequency, ny * frequency);
        amplitude *= params.persistence;
        frequency *= 2;
      }

      // Normalize to 0-1
      value = (value + 1) / 2;

      // Apply biome coloring
      const color = applyBiome(value, params.biome);

      const idx = (y * params.heightmapSize + x) * 4;
      imageData.data[idx] = color[0];
      imageData.data[idx + 1] = color[1];
      imageData.data[idx + 2] = color[2];
      imageData.data[idx + 3] = 255;
    }
  }

  ctx.putImageData(imageData, 0, 0);

  const dir = path.dirname(outputPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  const pngPath = outputPath.replace(/\.gltf$/, '.png');
  const buffer = canvas.toBuffer('image/png');
  fs.writeFileSync(pngPath, buffer);

  return {
    filePath: pngPath,
    width: params.heightmapSize,
    height: params.heightmapSize
  };
}

function applyBiome(value: number, biome: string): [number, number, number] {
  if (biome === 'desert') return [value * 255, value * 200, value * 100];
  if (biome === 'snow') return [value * 255, value * 255, value * 255];
  if (biome === 'temperate') return [value * 100, value * 180, value * 100];
  if (biome === 'tropical') return [value * 50, value * 150, value * 50];
  return [value * 128, value * 128, value * 128];
}

function noise2D(x: number, y: number): number {
  // Simple pseudo-random noise
  const n = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
  return n - Math.floor(n);
}

function extractParams(seed: Seed): ProceduralParams {
  const quality = seed.genes?.quality?.value || 'medium';
  const qualitySizes: Record<string, number> = { low: 128, medium: 256, high: 512, photorealistic: 1024 };

  let octaves = seed.genes?.octaves?.value || 4;
  if (typeof octaves === 'number' && octaves <= 1) octaves = Math.max(1, Math.floor(octaves * 8));

  return {
    octaves: Math.max(1, octaves),
    persistence: seed.genes?.persistence?.value || 0.5,
    scale: seed.genes?.scale?.value || 1.0,
    biome: seed.genes?.biome?.value || 'temperate',
    heightmapSize: qualitySizes[quality] || 256,
    quality: ['low', 'medium', 'high', 'photorealistic'].includes(quality) ? quality : 'medium'
  };
}
