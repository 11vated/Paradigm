/**
 * Food Generator — produces recipes and food images
 * Generates food presentation as PNG
 */

import { createCanvas } from 'canvas';
import * as fs from 'fs';
import * as path from 'path';
import type { Seed } from '../engines';

interface FoodParams {
  type: string;
  cuisine: string;
  ingredients: string[];
  quality: 'low' | 'medium' | 'high' | 'photorealistic';
}

export async function generateFood(seed: Seed, outputPath: string): Promise<{ filePath: string; width: number; height: number }> {
  const params = extractParams(seed);
  const width = 500;
  const height = 500;

  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  // Background (plate)
  ctx.fillStyle = '#f5f5f5';
  ctx.fillRect(0, 0, width, height);

  // Plate circle
  ctx.beginPath();
  ctx.arc(width / 2, height / 2, 200, 0, Math.PI * 2);
  ctx.fillStyle = '#ffffff';
  ctx.fill();
  ctx.strokeStyle = '#cccccc';
  ctx.lineWidth = 3;
  ctx.stroke();

  // Food based on type
  const cx = width / 2;
  const cy = height / 2;

  if (params.type === 'pizza') {
    // Pizza base
    ctx.beginPath();
    ctx.arc(cx, cy, 150, 0, Math.PI * 2);
    ctx.fillStyle = '#f0c040';
    ctx.fill();
    // Toppings
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      const tx = cx + Math.cos(angle) * 80;
      const ty = cy + Math.sin(angle) * 80;
      ctx.beginPath();
      ctx.arc(tx, ty, 15, 0, Math.PI * 2);
      ctx.fillStyle = '#ff4444';
      ctx.fill();
    }
  } else if (params.type === 'pasta') {
    // Pasta shape
    for (let i = 0; i < 20; i++) {
      const x = cx + (Math.random() - 0.5) * 200;
      const y = cy + (Math.random() - 0.5) * 200;
      ctx.beginPath();
      ctx.arc(x, y, 30, 0, Math.PI * 2);
      ctx.fillStyle = '#f5e6d3';
      ctx.fill();
    }
  } else {
    // Generic food
    ctx.beginPath();
    ctx.arc(cx, cy, 100, 0, Math.PI * 2);
    ctx.fillStyle = '#8b4513';
    ctx.fill();
  }

  // Label
  ctx.fillStyle = '#333';
  ctx.font = '16px Arial';
  ctx.textAlign = 'center';
  ctx.fillText(`${params.cuisine} ${params.type}`, cx, height - 30);
  ctx.fillText(`Ingredients: ${params.ingredients.slice(0, 3).join(', ')}`, cx, height - 10);

  // Ensure output directory exists
  const dir = path.dirname(outputPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  // Write PNG
  const pngPath = outputPath.replace(/\.gltf$/, '.png');
  const buffer = canvas.toBuffer('image/png');
  fs.writeFileSync(pngPath, buffer);

  return { filePath: pngPath, width, height };
}

function extractParams(seed: Seed): FoodParams {
  const quality = seed.genes?.quality?.value || 'medium';
  return {
    type: seed.genes?.type?.value || 'pizza',
    cuisine: seed.genes?.cuisine?.value || 'italian',
    ingredients: (() => {
      const i = seed.genes?.ingredients?.value || ['tomato', 'cheese', 'basil'];
      return Array.isArray(i) ? i : ['tomato', 'cheese'];
    })(),
    quality: ['low', 'medium', 'high', 'photorealistic'].includes(quality) ? quality : 'medium'
  };
}
