/**
 * Sprite Generator — produces sprite sheets from seed genes
 * Creates pixel art sprites with animation frames
 */

import { createCanvas } from 'canvas';
import * as fs from 'fs';
import * as path from 'path';
import type { Seed } from '../engines';

interface SpriteParams {
  resolution: number;
  paletteSize: number;
  colors: number[];
  symmetry: string;
  animations: string[];
  quality: 'low' | 'medium' | 'high' | 'photorealistic';
}

export async function generateSprite(seed: Seed, outputPath: string): Promise<{ filePath: string; width: number; height: number; frames: number }> {
  const params = extractParams(seed);
  
  // Sprite sheet layout: 4 animations x 4 frames = 4x4 grid
  const framesPerAnim = 4;
  const animCount = params.animations.length;
  const frameSize = params.resolution;
  const sheetWidth = frameSize * framesPerAnim;
  const sheetHeight = frameSize * animCount;
  
  const canvas = createCanvas(sheetWidth, sheetHeight);
  const ctx = canvas.getContext('2d');
  
  // Generate palette
  const palette = generatePalette(params.colors, params.paletteSize);
  
  // Create each animation row
  for (let animIdx = 0; animIdx < animCount; animIdx++) {
    for (let frame = 0; frame < framesPerAnim; frame++) {
      const x = frame * frameSize;
      const y = animIdx * frameSize;
      
      // Draw sprite frame with variation
      drawSpriteFrame(ctx, x, y, frameSize, palette, params, animIdx, frame);
    }
  }
  
  // Ensure output directory exists
  const dir = path.dirname(outputPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  
  // Change extension to .png
  const pngPath = outputPath.replace(/\.gltf$/, '.png');
  
  // Write PNG file
  const buffer = canvas.toBuffer('image/png');
  fs.writeFileSync(pngPath, buffer);
  
  return {
    filePath: pngPath,
    width: sheetWidth,
    height: sheetHeight,
    frames: framesPerAnim * animCount
  };
}

function extractParams(seed: Seed): SpriteParams {
  const quality = seed.genes?.quality?.value || 'medium';
  
  let resolution = seed.genes?.resolution?.value || 32;
  if (typeof resolution === 'number' && resolution <= 1) resolution = Math.floor(resolution * 64);
  
  let paletteSize = seed.genes?.paletteSize?.value || 8;
  if (typeof paletteSize === 'number' && paletteSize <= 1) paletteSize = Math.floor(paletteSize * 16);
  
  return {
    resolution: Math.max(8, Math.min(resolution, 128)),
    paletteSize: Math.max(2, Math.min(paletteSize, 32)),
    colors: seed.genes?.colors?.value || [0.8, 0.2, 0.3],
    symmetry: seed.genes?.symmetry?.value || 'bilateral',
    animations: seed.genes?.animations?.value || ['idle', 'walk', 'attack', 'death'],
    quality: ['low', 'medium', 'high', 'photorealistic'].includes(quality) ? quality : 'medium'
  };
}

function generatePalette(baseColors: number[], size: number): string[] {
  const palette: string[] = [];
  for (let i = 0; i < size; i++) {
    const r = Math.floor(((baseColors[0] || 0.5) + i * 0.1) % 1 * 255);
    const g = Math.floor(((baseColors[1] || 0.5) + i * 0.1) % 1 * 255);
    const b = Math.floor(((baseColors[2] || 0.5) + i * 0.1) % 1 * 255);
    palette.push(`rgb(${r},${g},${b})`);
  }
  return palette;
}

function drawSpriteFrame(
  ctx: any, x: number, y: number, size: number,
  palette: string[], params: SpriteParams, animIdx: number, frame: number
) {
  // Clear frame area
  ctx.fillStyle = 'rgba(0,0,0,0)';
  ctx.clearRect(x, y, size, size);
  
  // Draw pixel art representation
  const pixelSize = Math.max(2, Math.floor(size / 8));
  const rng = createRNG(animIdx * 1000 + frame * 100);
  
  // Simple character shape
  const bodyColor = palette[0];
  const accentColor = palette[1 % palette.length];
  
  // Body (torso)
  ctx.fillStyle = bodyColor;
  ctx.fillRect(x + size * 0.3, y + size * 0.3, size * 0.4, size * 0.4);
  
  // Head
  ctx.fillRect(x + size * 0.35, y + size * 0.15, size * 0.3, size * 0.2);
  
  // Animation offset for movement
  const offsetX = Math.sin(frame * Math.PI / 2) * size * 0.1;
  
  // Legs
  ctx.fillStyle = accentColor;
  ctx.fillRect(x + size * 0.35 + offsetX, y + size * 0.7, size * 0.1, size * 0.25);
  ctx.fillRect(x + size * 0.55 - offsetX, y + size * 0.7, size * 0.1, size * 0.25);
  
  // Arms
  ctx.fillRect(x + size * 0.2 + offsetX, y + size * 0.4, size * 0.1, size * 0.3);
  ctx.fillRect(x + size * 0.7 - offsetX, y + size * 0.4, size * 0.1, size * 0.3);
}

function createRNG(seed: number): () => number {
  let s = seed;
  return () => { s = (s * 16807 + 0) % 2147483647; return s / 2147483647; };
}
