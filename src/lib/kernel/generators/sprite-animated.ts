/**
 * Sprite Generator — produces animated sprite sheets (pixel art)
 * Creates animated sprites with multiple animations
 */

import { createCanvas } from 'canvas';
import * as fs from 'fs';
import * as path from 'path';
import type { Seed } from '../engines';

interface SpriteParams {
  resolution: number;
  paletteSize: number;
  colors: number[][];
  symmetry: string;
  animations: string[];
  quality: 'low' | 'medium' | 'high' | 'photorealistic';
}

export async function generateSpriteAnimated(seed: Seed, outputPath: string): Promise<{ filePath: string; width: number; height: number; frames: number }> {
  const params = extractParams(seed);
  
  // Sprite sheet: 4 animations x 4 frames
  const frameWidth = params.resolution;
  const frameHeight = params.resolution;
  const cols = 4; // frames per animation
  const rows = params.animations.length;
  
  const canvas = createCanvas(frameWidth * cols, frameHeight * rows);
  const ctx = canvas.getContext('2d');
  
  // Generate each animation row
  for (let animIdx = 0; animIdx < params.animations.length; animIdx++) {
    for (let frame = 0; frame < cols; frame++) {
      const x = frame * frameWidth;
      const y = animIdx * frameHeight;
      
      // Draw sprite frame with animation offset
      drawSpriteFrame(ctx, x, y, frameWidth, frameHeight, params, animIdx, frame);
    }
  }
  
  // Ensure output directory exists
  const dir = path.dirname(outputPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  
  // Write PNG sprite sheet
  const pngPath = outputPath.replace(/\.png$/, '_animated.png');
  const buffer = canvas.toBuffer('image/png');
  fs.writeFileSync(pngPath, buffer);
  
  return {
    filePath: pngPath,
    width: frameWidth * cols,
    height: frameHeight * rows,
    frames: cols * rows
  };
}

function drawSpriteFrame(
  ctx: any, x: number, y: number, w: number, h: number,
  params: SpriteParams, animIdx: number, frame: number
) {
  // Clear frame area
  ctx.fillStyle = 'rgba(0,0,0,0)';
  ctx.clearRect(x, y, w, h);
  
  // Animation offset
  const phase = (frame / 4) * Math.PI * 2;
  
  // Draw character (simple humanoid)
  const centerX = x + w / 2;
  const centerY = y + h / 2;
  
  // Body
  ctx.fillStyle = `rgb(${Math.floor(params.colors[0][0]*255)}, ${Math.floor(params.colors[0][1]*255)}, ${Math.floor(params.colors[0][2]*255)})`;
  ctx.fillRect(centerX - w * 0.2, centerY - h * 0.2, w * 0.4, h * 0.4);
  
  // Head
  ctx.beginPath();
  ctx.arc(centerX, centerY - h * 0.3, w * 0.15, 0, Math.PI * 2);
  ctx.fillStyle = `rgb(${Math.floor(params.colors[0][0]*255*0.9)}, ${Math.floor(params.colors[0][1]*255*0.9)}, ${Math.floor(params.colors[0][2]*255*0.9)})`;
  ctx.fill();
  
  // Arms with animation
  const armSwing = Math.sin(phase) * w * 0.15;
  ctx.fillStyle = `rgb(${Math.floor(params.colors[1 % params.colors.length][0]*255)}, ${Math.floor(params.colors[1 % params.colors.length][1]*255)}, ${Math.floor(params.colors[1 % params.colors.length][2]*255)})`;
  ctx.fillRect(centerX - w * 0.3 + armSwing, centerY - h * 0.15, w * 0.1, h * 0.3);
  ctx.fillRect(centerX + w * 0.2 - armSwing, centerY - h * 0.15, w * 0.1, h * 0.3);
  
  // Legs with animation
  const legSwing = Math.sin(phase + Math.PI) * w * 0.1;
  ctx.fillRect(centerX - w * 0.15 + legSwing, centerY + h * 0.2, w * 0.08, h * 0.25);
  ctx.fillRect(centerX + w * 0.07 - legSwing, centerY + h * 0.2, w * 0.08, h * 0.25);
}

function extractParams(seed: Seed): SpriteParams {
  const quality = seed.genes?.quality?.value || 'medium';
  
  let resolution = seed.genes?.resolution?.value || 32;
  if (typeof resolution === 'number' && resolution <= 1) resolution = Math.floor(resolution * 128);
  
  let paletteSize = seed.genes?.paletteSize?.value || 8;
  if (typeof paletteSize === 'number' && paletteSize <= 1) paletteSize = Math.floor(paletteSize * 16);
  
  const qualityRes: Record<string, number> = {
    low: 32,
    medium: 64,
    high: 128,
    photorealistic: 256
  };
  
  return {
    resolution: qualityRes[quality] || resolution,
    paletteSize: Math.max(2, Math.min(paletteSize, 32)),
    colors: seed.genes?.colors?.value || [[0.8, 0.2, 0.3], [0.2, 0.5, 0.8]],
    symmetry: seed.genes?.symmetry?.value || 'bilateral',
    animations: seed.genes?.animations?.value || ['idle', 'walk', 'attack', 'death'],
    quality: ['low', 'medium', 'high', 'photorealistic'].includes(quality) ? quality : 'medium'
  };
}
