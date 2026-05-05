/**
 * Visual2D SVG Generator — produces vector graphics from seed genes
 * Uses SVG to create scalable generative art
 */

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

export async function generateVisual2DSVG(seed: Seed, outputPath: string): Promise<{ filePath: string; width: number; height: number }> {
  const params = extractParams(seed);
  const { width, height } = getResolution(params.quality, params.resolution);
  
  // Generate SVG
  let svg = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">\n`;
  svg += `<rect width="${width}" height="${height}" fill="rgb(${Math.floor(params.palette[0]*255)},${Math.floor(params.palette[1]*255)},${Math.floor(params.palette[2]*255)})"/>\n`;
  
  // Generate layers
  for (let i = 0; i < params.layers; i++) {
    const layerAlpha = 0.3 + (i / params.layers) * 0.7;
    svg += `<g opacity="${layerAlpha.toFixed(2)}">\n`;
    
    if (params.style === 'abstract') {
      svg += drawAbstractSVG(width, height, params.palette, i);
    } else if (params.style === 'geometric') {
      svg += drawGeometricSVG(width, height, params.palette, i);
    } else {
      svg += drawOrganicSVG(width, height, params.palette, i);
    }
    
    svg += `</g>\n`;
  }
  
  svg += `</svg>`;
  
  // Ensure output directory exists
  const dir = path.dirname(outputPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  
  // Write SVG file
  const svgPath = outputPath.replace(/\.png$/, '.svg');
  fs.writeFileSync(svgPath, svg);
  
  return { filePath: svgPath, width, height };
}

function drawAbstractSVG(w: number, h: number, palette: number[], seed: number): string {
  const rng = createRNG(seed * 12345);
  const x = rng() * w;
  const y = rng() * h;
  const radius = 20 + rng() * 100;
  const color = hslToRgb((palette[0] + seed * 0.1) % 1, 0.7, 0.5 + rng() * 0.3);
  
  return `<circle cx="${x.toFixed(2)}" cy="${y.toFixed(2)}" r="${radius.toFixed(2)}" fill="rgb(${color[0]},${color[1]},${color[2]})" />\n`;
}

function drawGeometricSVG(w: number, h: number, palette: number[], seed: number): string {
  const rng = createRNG(seed * 54321);
  const x = rng() * w;
  const y = rng() * h;
  const size = 30 + rng() * 80;
  const color = hslToRgb((palette[1] + seed * 0.2) % 1, 0.8, 0.4 + rng() * 0.4);
  
  return `<rect x="${(x - size/2).toFixed(2)}" y="${(y - size/2).toFixed(2)}" width="${size.toFixed(2)}" height="${size.toFixed(2)}" fill="rgb(${color[0]},${color[1]},${color[2]})" />\n`;
}

function drawOrganicSVG(w: number, h: number, palette: number[], seed: number): string {
  const rng = createRNG(seed * 98765);
  let path = 'M ';
  const numPoints = 5 + Math.floor(rng() * 8);
  const points = [];
  
  for (let i = 0; i < numPoints; i++) {
    points.push({ x: rng() * w, y: rng() * h });
  }
  
  path += `${points[0].x.toFixed(2)} ${points[0].y.toFixed(2)} `;
  for (let i = 1; i < points.length; i++) {
    path += `L ${points[i].x.toFixed(2)} ${points[i].y.toFixed(2)} `;
  }
  path += 'Z';
  
  const color = hslToRgb((palette[2] + seed * 0.3) % 1, 0.6, 0.3 + rng() * 0.5);
  
  return `<path d="${path}" fill="rgb(${color[0]},${color[1]},${color[2]})" opacity="0.5" />\n`;
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  h = ((h % 1) + 1) % 1;
  const r = l + s * Math.min(l, 1 - l) * (2 * ((h * 6) % 1) - 1);
  const g = l + s * Math.min(l, 1 - l) * (2 * ((h * 6 + 4) % 1) - 1);
  const b = l + s * Math.min(l, 1 - l) * (2 * ((h * 6 + 2) % 1) - 1);
  return [
    Math.floor(Math.min(1, Math.max(0, r)) * 255),
    Math.floor(Math.min(1, Math.max(0, g)) * 255),
    Math.floor(Math.min(1, Math.max(0, b)) * 255)
  ];
}

function createRNG(seed: number): () => number {
  let s = seed;
  return () => { s = (s * 16807 + 0) % 2147483647; return s / 2147483647; };
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
