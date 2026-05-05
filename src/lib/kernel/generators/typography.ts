/**
 * Typography Generator — produces font specimens
 * Generates typeface samples based on seed genes
 */

import { createCanvas } from 'canvas';
import * as fs from 'fs';
import * as path from 'path';
import type { Seed } from '../engines';

interface TypographyParams {
  style: string;
  weightRange: [number, number];
  xHeight: number;
  contrast: number;
  quality: 'low' | 'medium' | 'high' | 'photorealistic';
}

export async function generateTypography(seed: Seed, outputPath: string): Promise<{ filePath: string; width: number; height: number }> {
  const params = extractParams(seed);
  const width = 800;
  const height = 400;

  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  // Background
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);

  // Draw type specimen
  const sampleText = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const fontSize = 32;
  const lineHeight = fontSize * 1.5;

  // Draw different weights
  let y = 50;
  for (let w = params.weightRange[0]; w <= params.weightRange[1]; w += 100) {
    ctx.font = `${w} ${fontSize}px ${params.style.replace('_', ' ')}`;
    ctx.fillStyle = '#000000';
    ctx.fillText(`${w}: ${sampleText.substring(0, 20)}`, 20, y);
    y += lineHeight;
  }

  // Draw x-height demonstration
  ctx.strokeStyle = '#cccccc';
  ctx.beginPath();
  ctx.moveTo(20, y);
  ctx.lineTo(width - 20, y);
  ctx.stroke();

  y += 30;
  ctx.font = `400 ${fontSize}px ${params.style.replace('_', ' ')}`;
  ctx.fillText('x-height demonstration', 20, y);

  // Ensure output directory exists
  const dir = path.dirname(outputPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  // Write PNG
  const pngPath = outputPath.replace(/\.gltf$/, '.png');
  const buffer = canvas.toBuffer('image/png');
  fs.writeFileSync(pngPath, buffer);

  return { filePath: pngPath, width, height };
}

function extractParams(seed: Seed): TypographyParams {
  const quality = seed.genes?.quality?.value || 'medium';
  return {
    style: seed.genes?.style?.value || 'sans_serif',
    weightRange: (() => {
      const r = seed.genes?.weight_range?.value || [100, 900];
      return Array.isArray(r) && r.length === 2 ? [r[0], r[1]] : [100, 900];
    })(),
    xHeight: seed.genes?.xHeight?.value || 0.5,
    contrast: seed.genes?.contrast?.value || 0.3,
    quality: ['low', 'medium', 'high', 'photorealistic'].includes(quality) ? quality : 'medium'
  };
}
