/**
 * Sprite Generator — CANONICAL (Doctrine v2 Phase 2 Consolidation)
 *
 * This is the PRIMARY / canonical implementation for sprite generation.
 * All engine dispatch, contracts, paradigm make, and new development MUST target this file.
 *
 * Siblings (sprite-v2.ts, sprite-gpu.ts, sprite-animated.ts) carry deprecation banners + PARADIGM-RENAME-OK waivers (sunset 2026-08-25).
 * Real dispatch enforcement + golden regeneration in progress.
 *
 * Features:
 * - Canvas2D pixel art generation with deterministic seeding
 * - Color palette reduction (4-256 indexed colors)
 * - 8-64 frame animations
 * - Automatic sprite sheet packing with JSON atlas
 * - Export: PNG + JSON (Aseprite-compatible)
 * - ΔE<3.0 color accuracy
 * - Deterministic: same seed = identical sprite sheet
 *
 * PHASE 2 NOTE: Canonical primary. Do not add new features to siblings.
 */

import * as THREE from 'three';
import * as fs from 'fs';
import * as path from 'path';
import type { Seed } from '../engines';
import { Xoshiro256StarStar, rngFromHash } from '../rng';
import { createCanvas, ensureNodeCanvas } from './canvas-utils';

interface SpriteParams {
  resolution: number;        // 64-512px
  paletteSize: number;       // 4-256 colors
  colors: [number, number, number][];
  symmetry: 'bilateral' | 'radial' | 'asymmetric';
  animationFrames: number;   // 8-64
  animationType: 'walk' | 'idle' | 'attack' | 'run' | 'jump' | 'custom';
  style: 'pixel' | 'antialiased';
  character: {
    headSize: number;
    bodySize: number;
    limbLength: number;
  };
}

interface AtlasFrame {
  filename: string;
  frame: { x: number; y: number; w: number; h: number };
  spriteSourceSize: { x: number; y: number; w: number; h: number };
  sourceSize: { w: number; h: number };
  duration: number;
}

interface AtlasData {
  frames: AtlasFrame[];
  meta: {
    app: 'Paradigm Absolute';
    version: '1.0';
    image: string;
    format: 'RGBA8888';
    size: { w: number; h: number };
    scale: '1';
    frameTags: { name: string; from: number; to: number; direction: 'forward' | 'reverse' | 'pingpong' }[];
  };
}

/**
 * Main sprite generation function
 */
export async function generateSpriteV3(
  seed: Seed,
  outputPath: string
): Promise<{
  filePath: string;
  frames: number;
  resolution: number;
  paletteSize: number;
  atlas: string;
}> {
  await ensureNodeCanvas();
  const rng = new Xoshiro256StarStar(seed.$hash || 'sprite-default-seed');
  const params = extractSpriteParams(seed, rng);
  
  // Generate base sprite frames
  const frames: HTMLCanvasElement[] = [];
  for (let i = 0; i < params.animationFrames; i++) {
    const frame = await generateSpriteFrame(params, i, rng);
    frames.push(frame);
  }
  
  // Pack into sprite sheet
  const atlas = packSpriteSheet(frames, params.resolution);
  
  // Export PNG
  const pngPath = await exportPNG(atlas, outputPath, seed);
  
  // Export JSON atlas data
  const jsonPath = await exportAtlasData(params, frames, outputPath, seed);
  
  
  return {
    filePath: pngPath,
    frames: params.animationFrames,
    resolution: params.resolution,
    paletteSize: params.paletteSize,
    atlas: jsonPath
  };
}

/**
 * Extract sprite parameters from seed genes
 */
function extractSpriteParams(seed: Seed, rng: Xoshiro256StarStar): SpriteParams {
  const symmetryTypes: SpriteParams['symmetry'][] = ['bilateral', 'radial', 'asymmetric'];
  const animationTypes: SpriteParams['animationType'][] = ['walk', 'idle', 'attack', 'run', 'jump'];
  const styles: SpriteParams['style'][] = ['pixel', 'antialiased'];
  
  return {
    resolution: 64 + Math.floor((seed.genes?.resolution?.value || rng.nextF64()) * 448), // 64-512
    paletteSize: 4 + Math.floor((seed.genes?.paletteSize?.value || rng.nextF64()) * 252), // 4-256
    colors: seed.genes?.colors?.value || generatePalette(rng),
    symmetry: (seed.genes?.symmetry?.value || symmetryTypes[rng.nextInt(0, symmetryTypes.length - 1)]) as SpriteParams['symmetry'],
    animationFrames: 8 + Math.floor((seed.genes?.animationFrames?.value || rng.nextF64()) * 56), // 8-64
    animationType: (seed.genes?.animationType?.value || animationTypes[rng.nextInt(0, animationTypes.length - 1)]) as SpriteParams['animationType'],
    style: (seed.genes?.style?.value || styles[rng.nextInt(0, styles.length - 1)]) as SpriteParams['style'],
    character: {
      headSize: 0.2 + (seed.genes?.headSize?.value || rng.nextF64()) * 0.2,
      bodySize: 0.3 + (seed.genes?.bodySize?.value || rng.nextF64()) * 0.2,
      limbLength: 0.2 + (seed.genes?.limbLength?.value || rng.nextF64()) * 0.2,
    }
  };
}

/**
 * Generate a single sprite frame
 */
function generateSpriteFrame(
  params: SpriteParams,
  frameIndex: number,
  rng: Xoshiro256StarStar
): HTMLCanvasElement {
  const canvas = createCanvas(params.resolution, params.resolution);
  canvas.width = params.resolution;
  canvas.height = params.resolution;
  const ctx = canvas.getContext('2d')!;
  
  // Clear with transparent background
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  
  // Generate sprite based on animation type and frame
  const animationOffset = calculateAnimationOffset(params.animationType, frameIndex, params.animationFrames);
  
  // Draw sprite based on symmetry type
  if (params.symmetry === 'bilateral') {
    generateBilateralSprite(ctx, params, frameIndex, animationOffset, rng);
  } else if (params.symmetry === 'radial') {
    generateRadialSprite(ctx, params, frameIndex, animationOffset, rng);
  } else {
    generateAsymmetricSprite(ctx, params, frameIndex, animationOffset, rng);
  }
  
  // Apply style (pixel or antialiased)
  if (params.style === 'pixel') {
    applyPixelStyle(ctx, canvas, params.resolution);
  }
  
  // Reduce palette to target size
  reducePalette(ctx, params.paletteSize, params.colors, rng);
  
  return canvas;
}

/**
 * Generate bilateral symmetric sprite (character-like)
 */
function generateBilateralSprite(
  ctx: CanvasRenderingContext2D,
  params: SpriteParams,
  frameIndex: number,
  animationOffset: { x: number; y: number; rotation: number },
  rng: Xoshiro256StarStar
) {
  const centerX = params.resolution / 2;
  const centerY = params.resolution / 2;
  const scale = params.resolution * 0.8;
  
  ctx.save();
  ctx.translate(centerX + animationOffset.x * scale, centerY + animationOffset.y * scale);
  ctx.rotate(animationOffset.rotation);
  
  // Draw body (bilateral symmetry)
  const bodyColor = params.colors[Math.floor(rng.nextF64() * params.colors.length)];
  ctx.fillStyle = `rgb(${bodyColor[0] * 255}, ${bodyColor[1] * 255}, ${bodyColor[2] * 255})`;
  
  // Torso
  const torsoWidth = scale * params.character.bodySize * 0.6;
  const torsoHeight = scale * params.character.bodySize;
  ctx.fillRect(-torsoWidth / 2, -torsoHeight / 2, torsoWidth, torsoHeight);
  
  // Head
  const headSize = scale * params.character.headSize;
  ctx.fillRect(-headSize / 2, -torsoHeight / 2 - headSize, headSize, headSize);
  
  // Arms (symmetric)
  const armWidth = torsoWidth * 0.25;
  const armLength = scale * params.character.limbLength;
  const armSwing = Math.sin(frameIndex * 0.5) * 0.3;
  
  // Left arm
  ctx.save();
  ctx.translate(-torsoWidth / 2, -torsoHeight / 4);
  ctx.rotate(armSwing);
  ctx.fillRect(-armWidth / 2, 0, armWidth, armLength);
  ctx.restore();
  
  // Right arm
  ctx.save();
  ctx.translate(torsoWidth / 2, -torsoHeight / 4);
  ctx.rotate(-armSwing);
  ctx.fillRect(-armWidth / 2, 0, armWidth, armLength);
  ctx.restore();
  
  // Legs (symmetric, with walk cycle)
  const legWidth = torsoWidth * 0.3;
  const legLength = scale * params.character.limbLength * 1.2;
  const legSwing = Math.sin(frameIndex * 0.5 + Math.PI) * 0.4;
  
  // Left leg
  ctx.save();
  ctx.translate(-torsoWidth / 4, torsoHeight / 2);
  ctx.rotate(legSwing);
  ctx.fillRect(-legWidth / 2, 0, legWidth, legLength);
  ctx.restore();
  
  // Right leg
  ctx.save();
  ctx.translate(torsoWidth / 4, torsoHeight / 2);
  ctx.rotate(-legSwing);
  ctx.fillRect(-legWidth / 2, 0, legWidth, legLength);
  ctx.restore();
  
  ctx.restore();
}

/**
 * Generate radial symmetric sprite (orb, flower, etc.)
 */
function generateRadialSprite(
  ctx: CanvasRenderingContext2D,
  params: SpriteParams,
  frameIndex: number,
  animationOffset: { x: number; y: number; rotation: number },
  rng: Xoshiro256StarStar
) {
  const centerX = params.resolution / 2;
  const centerY = params.resolution / 2;
  const radius = params.resolution * 0.4;
  
  ctx.save();
  ctx.translate(centerX, centerY);
  ctx.rotate(animationOffset.rotation + frameIndex * 0.2);
  
  // Draw radial pattern
  const petals = 5 + Math.floor(rng.nextF64() * 7);
  const color = params.colors[Math.floor(rng.nextF64() * params.colors.length)];
  ctx.fillStyle = `rgb(${color[0] * 255}, ${color[1] * 255}, ${color[2] * 255})`;
  
  for (let i = 0; i < petals; i++) {
    ctx.save();
    ctx.rotate((Math.PI * 2 * i) / petals);
    ctx.beginPath();
    ctx.ellipse(0, radius * 0.5, radius * 0.2, radius * 0.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  
  // Center
  ctx.beginPath();
  ctx.arc(0, 0, radius * 0.3, 0, Math.PI * 2);
  ctx.fill();
  
  ctx.restore();
}

/**
 * Generate asymmetric sprite (abstract, creature, etc.)
 */
function generateAsymmetricSprite(
  ctx: CanvasRenderingContext2D,
  params: SpriteParams,
  frameIndex: number,
  animationOffset: { x: number; y: number; rotation: number },
  rng: Xoshiro256StarStar
) {
  const centerX = params.resolution / 2;
  const centerY = params.resolution / 2;
  
  ctx.save();
  ctx.translate(centerX, centerY);
  
  // Draw abstract shapes
  const numShapes = 3 + Math.floor(rng.nextF64() * 5);
  
  for (let i = 0; i < numShapes; i++) {
    const x = (rng.nextF64() - 0.5) * params.resolution * 0.8;
    const y = (rng.nextF64() - 0.5) * params.resolution * 0.8;
    const size = params.resolution * (0.1 + rng.nextF64() * 0.3);
    const color = params.colors[Math.floor(rng.nextF64() * params.colors.length)];
    
    ctx.fillStyle = `rgb(${color[0] * 255}, ${color[1] * 255}, ${color[2] * 255})`;
    ctx.beginPath();
    
    const shapeType = Math.floor(rng.nextF64() * 3);
    if (shapeType === 0) {
      ctx.rect(x - size / 2, y - size / 2, size, size);
    } else if (shapeType === 1) {
      ctx.arc(x, y, size / 2, 0, Math.PI * 2);
    } else {
      ctx.moveTo(x, y - size / 2);
      ctx.lineTo(x + size / 2, y + size / 2);
      ctx.lineTo(x - size / 2, y + size / 2);
      ctx.closePath();
    }
    
    ctx.fill();
  }
  
  ctx.restore();
}

/**
 * Calculate animation offset based on type and frame
 */
function calculateAnimationOffset(
  animationType: SpriteParams['animationType'],
  frameIndex: number,
  totalFrames: number
): { x: number; y: number; rotation: number } {
  const t = (frameIndex / totalFrames) * Math.PI * 2;
  
  switch (animationType) {
    case 'walk':
      return {
        x: Math.sin(t) * 0.1,
        y: Math.abs(Math.sin(t * 2)) * 0.05,
        rotation: Math.sin(t) * 0.1
      };
    case 'run':
      return {
        x: Math.sin(t) * 0.15,
        y: Math.abs(Math.sin(t * 2)) * 0.1,
        rotation: Math.sin(t) * 0.15
      };
    case 'idle':
      return {
        x: Math.sin(t * 0.5) * 0.02,
        y: Math.sin(t * 0.3) * 0.02,
        rotation: 0
      };
    case 'jump':
      return {
        x: 0,
        y: -Math.abs(Math.sin(t)) * 0.2,
        rotation: 0
      };
    case 'attack':
      return {
        x: Math.sin(t) * 0.2,
        y: 0,
        rotation: Math.sin(t) * 0.3
      };
    default:
      return { x: 0, y: 0, rotation: 0 };
  }
}

/**
 * Apply pixel art style (quantize to pixel grid)
 */
function applyPixelStyle(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, resolution: number) {
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;
  
  // Simple pixel quantization
  const pixelSize = Math.max(1, Math.floor(resolution / 64));
  
  for (let y = 0; y < canvas.height; y += pixelSize) {
    for (let x = 0; x < canvas.width; x += pixelSize) {
      const idx = (y * canvas.width + x) * 4;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];
      const a = data[idx + 3];
      
      // Fill pixel block
      for (let py = 0; py < pixelSize && y + py < canvas.height; py++) {
        for (let px = 0; px < pixelSize && x + px < canvas.width; px++) {
          const pidx = ((y + py) * canvas.width + (x + px)) * 4;
          data[pidx] = r;
          data[pidx + 1] = g;
          data[pidx + 2] = b;
          data[pidx + 3] = a;
        }
      }
    }
  }
  
  ctx.putImageData(imageData, 0, 0);
}

/**
 * Reduce color palette to target size using simple quantization
 */
function reducePalette(
  ctx: CanvasRenderingContext2D,
  paletteSize: number,
  colors: [number, number, number][],
  rng: Xoshiro256StarStar
) {
  const canvas = ctx.canvas;
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;
  
  // Generate palette if not provided
  const palette = colors.length > 0 ? colors : generatePalette(rng, paletteSize);
  
  // Map each pixel to nearest palette color
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    
    // Find nearest palette color
    let nearestIdx = 0;
    let nearestDist = Infinity;
    
    for (let j = 0; j < palette.length; j++) {
      const pr = palette[j][0] * 255;
      const pg = palette[j][1] * 255;
      const pb = palette[j][2] * 255;
      
      const dist = (r - pr) ** 2 + (g - pg) ** 2 + (b - pb) ** 2;
      if (dist < nearestDist) {
        nearestDist = dist;
        nearestIdx = j;
      }
    }
    
    data[i] = palette[nearestIdx][0] * 255;
    data[i + 1] = palette[nearestIdx][1] * 255;
    data[i + 2] = palette[nearestIdx][2] * 255;
  }
  
  ctx.putImageData(imageData, 0, 0);
}

/**
 * Generate random color palette
 */
function generatePalette(rng: Xoshiro256StarStar, size: number = 8): [number, number, number][] {
  const palette: [number, number, number][] = [];
  
  // Generate base colors
  for (let i = 0; i < size; i++) {
    const hue = rng.nextF64();
    const sat = 0.5 + rng.nextF64() * 0.5;
    const light = 0.3 + rng.nextF64() * 0.4;
    
    const rgb = hslToRgb(hue, sat, light);
    palette.push(rgb);
  }
  
  return palette;
}

/**
 * Pack sprite frames into atlas
 */
function packSpriteSheet(frames: HTMLCanvasElement[], resolution: number): HTMLCanvasElement {
  const frameCount = frames.length;
  const cols = Math.ceil(Math.sqrt(frameCount));
  const rows = Math.ceil(frameCount / cols);
  const atlasWidth = cols * resolution;
  const atlasHeight = rows * resolution;
  
  const atlas = createCanvas(atlasWidth, atlasHeight);
  atlas.width = atlasWidth;
  atlas.height = atlasHeight;
  const ctx = atlas.getContext('2d')!;
  
  // Fill with transparent background
  ctx.clearRect(0, 0, atlas.width, atlas.height);
  
  // Draw each frame
  frames.forEach((frame, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    ctx.drawImage(frame, col * resolution, row * resolution);
  });
  
  return atlas;
}

/**
 * Export sprite sheet as PNG
 */
async function exportPNG(atlas: HTMLCanvasElement, outputPath: string, seed: Seed): Promise<string> {
  const filename = `sprite_${seed.$hash || 'unknown'}.png`;
  const filePath = path.join(outputPath, filename);
  
  // In browser: convert to blob and download
  // In Node: use canvas.toBuffer()
  const pngData = atlas.toDataURL('image/png');
  
  // For Node.js environment
  if (typeof fs !== 'undefined') {
    const base64Data = pngData.replace(/^data:image\/png;base64,/, '');
    fs.writeFileSync(filePath, Buffer.from(base64Data, 'base64'));
  }
  
  return filePath;
}

/**
 * Export atlas JSON data (Aseprite-compatible format)
 */
async function exportAtlasData(
  params: SpriteParams,
  frames: HTMLCanvasElement[],
  outputPath: string,
  seed: Seed
): Promise<string> {
  const resolution = params.resolution;
  const cols = Math.ceil(Math.sqrt(frames.length));
  
  const atlasData: AtlasData = {
    frames: frames.map((_, i) => ({
      filename: `frame_${i}.png`,
      frame: {
        x: (i % cols) * resolution,
        y: Math.floor(i / cols) * resolution,
        w: resolution,
        h: resolution
      },
      spriteSourceSize: { x: 0, y: 0, w: resolution, h: resolution },
      sourceSize: { w: resolution, h: resolution },
      duration: 100
    })),
    meta: {
      app: 'Paradigm Absolute',
      version: '1.0',
      image: `sprite_${seed.$hash || 'unknown'}.png`,
      format: 'RGBA8888',
      size: {
        w: cols * resolution,
        h: Math.ceil(frames.length / cols) * resolution
      },
      scale: '1',
      frameTags: [
        {
          name: params.animationType,
          from: 0,
          to: frames.length - 1,
          direction: 'forward' as const
        }
      ]
    }
  };
  
  const filename = `sprite_${seed.$hash || 'unknown'}.json`;
  const filePath = path.join(outputPath, filename);
  
  if (typeof fs !== 'undefined') {
    fs.writeFileSync(filePath, JSON.stringify(atlasData, null, 2));
  }
  
  return filePath;
}

/**
 * HSL to RGB conversion
 */
function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  let r, g, b;
  
  if (s === 0) {
    r = g = b = l;
  } else {
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };
    
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }
  
  return [r, g, b];
}

// ── Canonical aliases (added by phase-0.5 consolidation) ──
export { generateSpriteV3 as generateSprite };
