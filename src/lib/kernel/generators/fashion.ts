/**
 * Fashion Generator — produces clothing designs
 * Generates fashion sketches as PNG
 */

import { createCanvas } from 'canvas';
import * as fs from 'fs';
import * as path from 'path';
import type { Seed } from '../engines';

interface FashionParams {
  type: string;
  style: string;
  colors: number[][];
  quality: 'low' | 'medium' | 'high' | 'photorealistic';
}

export async function generateFashion(seed: Seed, outputPath: string): Promise<{ filePath: string; width: number; height: number }> {
  const params = extractParams(seed);
  const width = 400;
  const height = 600;

  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  // Background
  ctx.fillStyle = '#f5f5f5';
  ctx.fillRect(0, 0, width, height);

  // Draw dress form / mannequin
  const cx = width / 2;
  
  // Head
  ctx.fillStyle = '#ffd7b5';
  ctx.beginPath();
  ctx.arc(cx, 80, 30, 0, Math.PI * 2);
  ctx.fill();

  // Body
  ctx.fillStyle = `rgb(${Math.floor(params.colors[0][0]*255)}, ${Math.floor(params.colors[0][1]*255)}, ${Math.floor(params.colors[0][2]*255)})`;
  
  if (params.type === 'dress') {
    // Dress shape
    ctx.beginPath();
    ctx.moveTo(cx - 40, 120);
    ctx.lineTo(cx - 60, 450);
    ctx.lineTo(cx + 60, 450);
    ctx.lineTo(cx + 40, 120);
    ctx.fill();
  } else if (params.type === 'suit') {
    // Suit jacket
    ctx.fillRect(cx - 50, 120, 100, 200);
    // Pants
    ctx.fillRect(cx - 30, 320, 25, 200);
    ctx.fillRect(cx + 5, 320, 25, 200);
  } else {
    // Generic shirt
    ctx.fillRect(cx - 40, 120, 80, 150);
    // Pants
    ctx.fillRect(cx - 25, 270, 20, 200);
    ctx.fillRect(cx + 5, 270, 20, 200);
  }

  // Ensure output directory exists
  const dir = path.dirname(outputPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  // Write PNG
  const pngPath = outputPath.replace(/\.gltf$/, '.png');
  const buffer = canvas.toBuffer('image/png');
  fs.writeFileSync(pngPath, buffer);

  return { filePath: pngPath, width, height };
}

function extractParams(seed: Seed): FashionParams {
  const quality = seed.genes?.quality?.value || 'medium';
  return {
    type: seed.genes?.type?.value || 'dress',
    style: seed.genes?.style?.value || 'casual',
    colors: seed.genes?.colors?.value || [[0.8, 0.2, 0.3], [0.2, 0.5, 0.8]],
    quality: ['low', 'medium', 'high', 'photorealistic'].includes(quality) ? quality : 'medium'
  };
}
