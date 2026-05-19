/**
 * Visual2D Generator — produces actual PNG files from seed genes
 * Uses canvas (node-canvas) to render generative art
 */

import { createCanvas } from 'canvas';
import * as fs from 'fs';
import * as path from 'path';
import type { Seed } from '../engines';
import { Xoshiro256StarStar, rngFromHash } from '../rng';

// Configuration
const QUALITY_TIERS = ['low', 'medium', 'high', 'photorealistic'] as const;
export type QualityTier = typeof QUALITY_TIERS[number];

interface Visual2DParams {
  style: string;
  complexity: number;
  palette: number[];
  composition: string;
  layers: number;
  resolution: number;
  quality: QualityTier;
}

// Theory/database - customize per domain
// Example:
// const DOMAIN_THEORY: Record<string, any> = {
//   'visual2d': { /* visual2d-specific data */ }
// };

export function generateVisual2D(seed: Seed, outputPath: string): Promise<{ filePath: string; width: number; height: number }> {
  const rng = rngFromHash(seed.$hash || '');
  const params = extractParams(seed, rng);
  const { width, height } = getResolution(params.quality, params.resolution);
   
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');
  
  // Fill background
  const bgColor = hslToRgb(params.palette[0] || 0.5, 0.3, 0.15);
  ctx.fillStyle = `rgb(${bgColor[0]}, ${bgColor[1]}, ${bgColor[2]})`;
  ctx.fillRect(0, 0, width, height);
  
  // Draw layers based on genes
  for (let layer = 0; layer < params.layers; layer++) {
    const hue = (params.palette[layer % params.palette.length] || 0.5) + (layer * 0.1);
    const color = hslToRgb(hue % 1, 0.6, 0.5);
    ctx.fillStyle = `rgb(${color[0]}, ${color[1]}, ${color[2]})`;
    
    // Simple pattern based on composition gene
    if (params.composition === 'radial') {
      const radius = (width/2) * (layer + 1) / params.layers;
      ctx.beginPath();
      ctx.arc(width/2, height/2, radius, 0, Math.PI * 2);
      ctx.fill();
    } else if (params.composition === 'grid') {
      const cellSize = Math.min(width, height) / Math.sqrt(params.layers);
      const cols = Math.floor(width / cellSize);
      for (let i = 0; i < params.layers; i++) {
        const x = (i % cols) * cellSize;
        const y = Math.floor(i / cols) * cellSize;
        ctx.fillRect(x, y, cellSize, cellSize);
      }
    } else {
      // Default: random circles
      const count = Math.max(1, params.layers * 5);
      for (let i = 0; i < count; i++) {
        const x = rng.nextF64() * width;
        const y = rng.nextF64() * height;
        const radius = rng.nextF64() * 50 + 10;
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
  
  // Export as PNG
  const buffer = canvas.toBuffer('image/png');
  
  const dir = path.dirname(outputPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  
  // Save PNG file
  const pngPath = outputPath.replace(/\.[^.]+$/, '.png');
  fs.writeFileSync(pngPath, buffer);
  
  // Save JSON config
  const jsonPath = outputPath.replace(/\.[^.]+$/, '.json');
  const config = {
    // Include the parameters and other metadata
    ...params,
    pngFile: pngPath,
    width: width,
    height: height
  };
  fs.writeFileSync(jsonPath, JSON.stringify(config, null, 2));

  return { 
    filePath: pngPath, 
    width: width, 
    height: height 
  };
}

// Helper function to extract parameters from seed genes - CUSTOMIZE PER DOMAIN
function extractParams(seed: Seed, rng: Xoshiro256StarStar): Visual2DParams {
  // Extract and validate parameters from seed genes
  // Provide sensible defaults and fallback to RNG-based values when needed
  
  const quality = (seed.genes?.quality?.value as QualityTier) || 
                  QUALITY_TIERS[rng.nextInt(0, QUALITY_TIERS.length)];
                  
  // Parameter extraction for visual2d domain:
  const styleOptions = ['abstract', 'geometric', 'organic', 'minimalist'] as const;
  const style = seed.genes?.style?.value as typeof styleOptions[number] || styleOptions[rng.nextInt(0, styleOptions.length)];
  
  const complexity = (seed.genes?.complexity?.value as number || rng.nextF64() * 10) + 1; // 1-11
  
  const paletteCount = 5;
  const palette = Array.from({ length: paletteCount }, () => rng.nextF64()); // 0-1 for each
  
  const compositionOptions = ['radial', 'grid', 'random'] as const;
  const composition = seed.genes?.composition?.value as typeof compositionOptions[number] || compositionOptions[rng.nextInt(0, compositionOptions.length)];
  
  const layers = Math.floor((seed.genes?.layers?.value as number || rng.nextF64() * 20)) + 1; // 1-20
  
  const resolutionOptions = [72, 150, 300, 600] as const; // DPI options
  const resolution = seed.genes?.resolution?.value as typeof resolutionOptions[number] || resolutionOptions[rng.nextInt(0, resolutionOptions.length)];
  
  return {
    // Return extracted parameters:
    style,
    complexity: complexity as number,
    palette,
    composition,
    layers: layers as number,
    quality: quality as QualityTier,
    resolution: resolution as number,
  };
}

// Helper function to generate preview/support files - OPTIONAL
function generatePreview(params: Visual2DParams, rng: Xoshiro256StarStar): any {
  // TODO: Implement preview generation if applicable
  // This could generate thumbnails, low-res versions, or metadata for quick viewing
  
  return {
    // Preview data structure
    type: 'preview',
    parameters: params
  };
}

// Domain-specific helper functions (keep these outside the template structure)
function getResolution(quality: QualityTier, baseResolution: number): { width: number; height: number } {
  // Base size on quality tier
  let sizeMultiplier = 1;
  switch (quality) {
    case 'low': sizeMultiplier = 0.5; break;
    case 'medium': sizeMultiplier = 1; break;
    case 'high': sizeMultiplier = 1.5; break;
    case 'photorealistic': sizeMultiplier = 2; break;
  }
  
  const size = baseResolution * sizeMultiplier;
  return { width: size, height: size };
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  h = ((h % 1) + 1) % 1;
  const r = l + s * Math.min(l, 1 - l) * (2 * ((h * 6) % 1) - 1);
  const g = l + s * Math.min(l, 1 - l) * (2 * ((h * 6 + 4) % 1) - 1);
  const b = l + s * Math.min(l, 1 - l) * (2 * ((h * 6 + 2) % 1) - 1);
  return [Math.floor(Math.min(1, Math.max(0, r)) * 255), Math.floor(Math.min(1, Math.max(0, g)) * 255), Math.floor(Math.min(1, Math.max(0, b)) * 255)];
}

// Theory/database - customize per domain
// Example:
// const DOMAIN_THEORY: Record<string, any> = {
//   'visual2d': { /* visual2d-specific data */ }
// };

export function generateVisual2D(seed: Seed, outputPath: string): Promise<{ filePath: string; width: number; height: number }> {
  const rng = rngFromHash(seed.$hash || '');
  const params = extractParams(seed, rng);
  const { width, height } = getResolution(params.quality, params.resolution);
   
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');
  
  // Fill background
  const bgColor = hslToRgb(params.palette[0] || 0.5, 0.3, 0.15);
  ctx.fillStyle = `rgb(${bgColor[0]}, ${bgColor[1]}, ${bgColor[2]})`;
  ctx.fillRect(0, 0, width, height);
  
  // Draw layers based on genes
  for (let layer = 0; layer < params.layers; layer++) {
    const hue = (params.palette[layer % params.palette.length] || 0.5) + (layer * 0.1);
    const color = hslToRgb(hue % 1, 0.6, 0.5);
    ctx.fillStyle = `rgb(${color[0]}, ${color[1]}, ${color[2]})`;
    
    // Simple pattern based on composition gene
    if (params.composition === 'radial') {
      const radius = (width/2) * (layer + 1) / params.layers;
      ctx.beginPath();
      ctx.arc(width/2, height/2, radius, 0, Math.PI * 2);
      ctx.fill();
    } else if (params.composition === 'grid') {
      const cellSize = Math.min(width, height) / Math.sqrt(params.layers);
      const cols = Math.floor(width / cellSize);
      for (let i = 0; i < params.layers; i++) {
        const x = (i % cols) * cellSize;
        const y = Math.floor(i / cols) * cellSize;
        ctx.fillRect(x, y, cellSize, cellSize);
      }
    } else {
      // Default: random circles
      const count = Math.max(1, params.layers * 5);
      for (let i = 0; i < count; i++) {
        const x = rng.nextF64() * width;
        const y = rng.nextF64() * height;
        const radius = rng.nextF64() * 50 + 10;
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
  
  // Export as PNG
  const buffer = canvas.toBuffer('image/png');
  
  const dir = path.dirname(outputPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  
  // Save PNG file
  const pngPath = outputPath.replace(/\.[^.]+$/, '.png');
  fs.writeFileSync(pngPath, buffer);
  
  // Save JSON config
  const jsonPath = outputPath.replace(/\.[^.]+$/, '.json');
  const config = {
    // Include the parameters and other metadata
    ...params,
    pngFile: pngPath,
    width: width,
    height: height
  };
  fs.writeFileSync(jsonPath, JSON.stringify(config, null, 2));

  return { 
    filePath: pngPath, 
    width: width, 
    height: height 
  };
}

// Helper function to extract parameters from seed genes - CUSTOMIZE PER DOMAIN
function extractParams(seed: Seed, rng: Xoshiro256StarStar): Visual2DParams {
  // Extract and validate parameters from seed genes
  // Provide sensible defaults and fallback to RNG-based values when needed
  
  const quality = (seed.genes?.quality?.value as QualityTier) || 
                  QUALITY_TIERS[rng.nextInt(0, QUALITY_TIERS.length)];
                  
  // Parameter extraction for visual2d domain:
  const styleOptions = ['abstract', 'geometric', 'organic', 'minimalist'] as const;
  const style = seed.genes?.style?.value as typeof styleOptions[number] || styleOptions[rng.nextInt(0, styleOptions.length)];
  
  const complexity = (seed.genes?.complexity?.value as number || rng.nextF64() * 10) + 1; // 1-11
  
  const paletteCount = 5;
  const palette = Array.from({ length: paletteCount }, () => rng.nextF64()); // 0-1 for each
  
  const compositionOptions = ['radial', 'grid', 'random'] as const;
  const composition = seed.genes?.composition?.value as typeof compositionOptions[number] || compositionOptions[rng.nextInt(0, compositionOptions.length)];
  
  const layers = Math.floor((seed.genes?.layers?.value as number || rng.nextF64() * 20)) + 1; // 1-20
  
  const resolutionOptions = [72, 150, 300, 600] as const; // DPI options
  const resolution = seed.genes?.resolution?.value as typeof resolutionOptions[number] || resolutionOptions[rng.nextInt(0, resolutionOptions.length)];
  
  return {
    // Return extracted parameters:
    style,
    complexity: complexity as number,
    palette,
    composition,
    layers: layers as number,
    quality: quality as QualityTier,
    resolution: resolution as number,
  };
}

// Helper function to generate preview/support files - OPTIONAL
function generatePreview(params: Visual2DParams, rng: Xoshiro256StarStar): any {
  // TODO: Implement preview generation if applicable
  // This could generate thumbnails, low-res versions, or metadata for quick viewing
  
  return {
    // Preview data structure
    type: 'preview',
    parameters: params
  };
}

// Domain-specific helper functions (keep these outside the template structure)
function getResolution(quality: QualityTier, baseResolution: number): { width: number; height: number } {
  // Base size on quality tier
  let sizeMultiplier = 1;
  switch (quality) {
    case 'low': sizeMultiplier = 0.5; break;
    case 'medium': sizeMultiplier = 1; break;
    case 'high': sizeMultiplier = 1.5; break;
    case 'photorealistic': sizeMultiplier = 2; break;
  }
  
  const size = baseResolution * sizeMultiplier;
  return { width: size, height: size };
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  let r, g, b;
  
  if (s === 0) {
    r = g = b = l; // achromatic
  } else {
    const hue2rgb = (p: number, q: number, t: number): number => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1/6) return p + (q - p) * 6 * t;
      if (t < 1/2) return q;
      if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
      return p;
    };
    
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1/3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1/3);
  }
  
  return [
    Math.round(r * 255),
    Math.round(g * 255),
    Math.round(b * 255)
  ];
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
  const quality = (seed.genes?.quality?.value as string) || 'medium';
  const resolution = (seed.genes?.resolution?.value as number) || 512;
  return {
    style: (seed.genes?.style?.value as string) || 'abstract',
    complexity: (seed.genes?.complexity?.value as number) || 0.5,
    palette: seed.genes?.palette?.value || [0.5, 0.3, 0.8],
    composition: (seed.genes?.composition?.value as string) || 'centered',
    layers: Math.max(3, Math.floor(((seed.genes?.complexity?.value as number) || 0.5) * 10)),
    resolution: typeof resolution === 'number' && resolution <= 1 ? Math.floor(resolution * 1024) : resolution,
    quality: (['low', 'medium', 'high', 'photorealistic'].includes(quality) ? quality : 'medium') as 'low' | 'medium' | 'high' | 'photorealistic'
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
