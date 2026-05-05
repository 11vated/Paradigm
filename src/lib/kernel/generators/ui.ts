/**
 * UI Generator — produces UI mockups
 * Generates user interface layouts as PNG
 */

import { createCanvas } from 'canvas';
import * as fs from 'fs';
import * as path from 'path';
import type { Seed } from '../engines';

interface UIParams {
  layout: string;
  theme: string;
  components: string[];
  quality: 'low' | 'medium' | 'high' | 'photorealistic';
}

export async function generateUI(seed: Seed, outputPath: string): Promise<{ filePath: string; width: number; height: number }> {
  const params = extractParams(seed);
  const width = 800;
  const height = 600;

  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  // Background
  const isDark = params.theme === 'dark';
  ctx.fillStyle = isDark ? '#1a1a2e' : '#f5f5f5';
  ctx.fillRect(0, 0, width, height);

  // Header
  ctx.fillStyle = isDark ? '#16213e' : '#ffffff';
  ctx.fillRect(0, 0, width, 60);

  // Title
  ctx.fillStyle = isDark ? '#ffffff' : '#000000';
  ctx.font = '24px Arial';
  ctx.fillText('Paradigm UI', 20, 40);

  let y = 100;

  // Components
  params.components.forEach(comp => {
    if (comp === 'header') return; // Already drawn
    if (comp === 'sidebar') {
      ctx.fillStyle = isDark ? '#0f3460' : '#e0e0e0';
      ctx.fillRect(0, 60, 200, height - 60);
      y = 100;
    } else if (comp === 'button') {
      ctx.fillStyle = '#e94560';
      ctx.fillRect(250, y, 120, 40);
      ctx.fillStyle = '#ffffff';
      ctx.font = '16px Arial';
      ctx.fillText('Button', 280, y + 25);
      y += 60;
    } else if (comp === 'input') {
      ctx.fillStyle = isDark ? '#16213e' : '#ffffff';
      ctx.fillRect(250, y, 200, 30);
      ctx.strokeStyle = '#0f3460';
      ctx.strokeRect(250, y, 200, 30);
      y += 50;
    } else if (comp === 'card') {
      ctx.fillStyle = isDark ? '#16213e' : '#ffffff';
      ctx.fillRect(250, y, 300, 150);
      ctx.strokeStyle = '#0f3460';
      ctx.strokeRect(250, y, 300, 150);
      ctx.fillStyle = isDark ? '#ffffff' : '#000000';
      ctx.font = '18px Arial';
      ctx.fillText('Card Title', 270, y + 30);
      y += 180;
    } else {
      // Generic component
      ctx.fillStyle = isDark ? '#16213e' : '#e0e0e0';
      ctx.fillRect(250, y, 200, 50);
      y += 70;
    }
  });

  // Ensure output directory exists
  const dir = path.dirname(outputPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  // Write PNG
  const pngPath = outputPath.replace(/\.gltf$/, '.png');
  const buffer = canvas.toBuffer('image/png');
  fs.writeFileSync(pngPath, buffer);

  return { filePath: pngPath, width, height };
}

function extractParams(seed: Seed): UIParams {
  const quality = seed.genes?.quality?.value || 'medium';
  return {
    layout: seed.genes?.layout?.value || 'dashboard',
    theme: seed.genes?.theme?.value || 'dark',
    components: (() => {
      const c = seed.genes?.components?.value || ['header', 'sidebar', 'main'];
      return Array.isArray(c) ? c : ['header', 'main'];
    })(),
    quality: ['low', 'medium', 'high', 'photorealistic'].includes(quality) ? quality : 'medium'
  };
}
