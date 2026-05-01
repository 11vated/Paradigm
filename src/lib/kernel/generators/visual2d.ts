/**
 * Visual2D Generator — produces actual PNG files from seed genes
 * Uses canvas (node-canvas) to render generative art
 */

import { createCanvas } from 'canvas';
import * as fs from 'fs';
import * as path from 'path';
import type { Seed } from '../engines';

interface Visual2DParams {
  style: string;
  complexity: number;
  palette: number[];
  composition: string;
  layers: number;
  resolution: number;
  quality: 'low' | 'medium' | 'high' | 'photorealistic';
}

export function generateVisual2D(seed: Seed, outputPath: string): Promise<{ filePath: string; width: number; height: number }> {
  const params = extractParams(seed);
  const { width, height } = getResolution(params.quality, params.resolution);
  
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');
  
  // Fill background
  const bgColor = hslToRgb(params.palette[0] || 0.5, 0.3, 0.15);
  ctx.fillStyle = `rgb(${bgColor[0]}, ${bgColor[1]}, ${bgColor[2]})`;
  ctx.fillRect(0, 0, width, height);
  
  // Generate layers
  for (let i = 0; i < params.layers; i++) {
    const layerAlpha = 0.3 + (i / params.layers) * 0.7;
    ctx.globalAlpha = layerAlpha;
    
    if (params.style === 'abstract') {
      drawAbstractShape(ctx, width, height, params.palette, i);
    } else if (params.style === 'geometric') {
      drawGeometricPattern(ctx, width, height, params.palette, i);
    } else {
      drawOrganicPattern(ctx, width, height, params.palette, i);
    }
  }
  
  ctx.globalAlpha = 1.0;
  
  // Save to file
  const dir = path.dirname(outputPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  
  const buffer = canvas.toBuffer('image/png');
  fs.writeFileSync(outputPath, buffer);
  
  return Promise.resolve({ filePath: outputPath, width, height });
}

function extractParams(seed: Seed): Visual2DParams {
  const quality = seed.genes?.quality?.value || 'medium';
  const resolution = seed.genes?.resolution?.value || 512;
  return {
    style: seed.genes?.style?.value || 'abstract',
    complexity: seed.genes?.complexity?.value || 0.5,
    palette: seed.genes?.palette?.value || [0.5, 0.3, 0.8],
    composition: seed.genes?.composition?.value || 'centered',
    layers: Math.max(3, Math.floor((seed.genes?.complexity?.value || 0.5) * 10)),
    resolution: typeof resolution === 'number' && resolution <= 1 ? Math.floor(resolution * 1024) : resolution,
    quality: ['low', 'medium', 'high', 'photorealistic'].includes(quality) ? quality : 'medium'
  };
}

function getResolution(quality: string, baseResolution: number): { width: number; height: number } {
  const multipliers: Record<string, number> = {
    low: 0.25,
    medium: 0.5,
    high: 1.0,
    photorealistic: 2.0
  };
  const mult = multipliers[quality] || 0.5;
  const size = Math.floor(baseResolution * mult);
  return { width: size, height: size };
}

function drawAbstractShape(ctx: any, w: number, h: number, palette: number[], seed: number) {
  const rng = createRNG(seed * 12345);
  const x = rng() * w;
  const y = rng() * h;
  const radius = 20 + rng() * 100;
  const color = hslToRgb((palette[0] + seed * 0.1) % 1, 0.7, 0.5 + rng() * 0.3);
  
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fillStyle = `rgba(${color[0]}, ${color[1]}, ${color[2]}, 0.6)`;
  ctx.fill();
}

function drawGeometricPattern(ctx: any, w: number, h: number, palette: number[], seed: number) {
  const rng = createRNG(seed * 54321);
  const x = rng() * w;
  const y = rng() * h;
  const size = 30 + rng() * 80;
  const color = hslToRgb((palette[1] + seed * 0.2) % 1, 0.8, 0.4 + rng() * 0.4);
  
  ctx.fillStyle = `rgba(${color[0]}, ${color[1]}, ${color[2]}, 0.7)`;
  ctx.fillRect(x, y, size, size);
}

function drawOrganicPattern(ctx: any, w: number, h: number, palette: number[], seed: number) {
  const rng = createRNG(seed * 98765);
  const points = [];
  const numPoints = 5 + Math.floor(rng() * 8);
  for (let i = 0; i < numPoints; i++) {
    points.push({ x: rng() * w, y: rng() * h });
  }
  
  const color = hslToRgb((palette[2] + seed * 0.3) % 1, 0.6, 0.3 + rng() * 0.5);
  ctx.fillStyle = `rgba(${color[0]}, ${color[1]}, ${color[2]}, 0.5)`;
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length; i++) ctx.lineTo(points[i].x, points[i].y);
  ctx.closePath();
  ctx.fill();
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  h = ((h % 1) + 1) % 1;
  const r = l + s * Math.min(l, 1 - l) * (2 * ((h * 6) % 1) - 1);
  const g = l + s * Math.min(l, 1 - l) * (2 * ((h * 6 + 4) % 1) - 1);
  const b = l + s * Math.min(l, 1 - l) * (2 * ((h * 6 + 2) % 1) - 1);
  return [Math.floor(Math.min(1, Math.max(0, r)) * 255), Math.floor(Math.min(1, Math.max(0, g)) * 255), Math.floor(Math.min(1, Math.max(0, b)) * 255)];
}

function createRNG(seed: number): () => number {
  let s = seed;
  return () => { s = (s * 16807 + 0) % 2147483647; return s / 2147483647; };
}
