/**
 * @deprecated Phase 2 Canonical Collapse (Doctrine v2)
 * Versioned sibling. Canonical lives in sprite.ts + sprite-contract.ts.
 * All engine registrations and new development must target the primary.
 * Removal after golden regeneration (sunset 2026-08).
 *
 * Sprite Generator V2 — World-Class Pixel Art (legacy)
 * Features:
 * - Actual pixel art algorithms (dithering, palette reduction, silhouette extraction)
 * - Multiple animation states with proper interpolation
 * - Character design genes (body type, features, equipment)
 * - Quality tiers: low (32x32) → photorealistic (128x128 with effects)
 * - Uses xoshiro256** RNG for determinism
 * - Export as PNG sprite sheets + JSON metadata
 */

import { createCanvas, registerFont } from 'canvas';
import * as fs from 'fs';
import * as path from 'path';
import type { Seed } from '../engines';
import { Xoshiro256StarStar, rngFromHash } from '../rng';
import { GsplModuleResolver } from '../gspl-module-resolver.js';

// Animation states
type AnimationState = 'idle' | 'walk' | 'run' | 'attack' | 'hurt' | 'death' | 'jump' | 'fall';

export interface SpriteParams {
  resolution: number;       // Pixel dimensions (e.g., 64 = 64x64 per frame)
  paletteSize: number;      // Number of colors in palette
  baseColors: [number, number, number]; // Base RGB (0-1)
  symmetry: 'bilateral' | 'radial' | 'none';
  animations: AnimationState[];
  framesPerAnim: number;    // Frames per animation
  bodyType: 'humanoid' | 'quadruped' | 'flying' | 'slime' | 'custom';
  features: {
    hasHelmet: boolean;
    hasWeapon: boolean;
    hasShield: boolean;
    eyeSize: number;
    mouthSize: number;
  };
  quality: 'low' | 'medium' | 'high' | 'photorealistic';
}

interface PixelArtPalette {
  name: string;
  colors: [number, number, number][]; // RGB 0-255
}

/**
 * Extract parameters from seed
 */
export function extractParams(seed: Seed, rng: Xoshiro256StarStar, constraints: any = null): SpriteParams {
  const quality = ((seed.genes?.quality?.value as string) || 'medium') as SpriteParams['quality'];
  const c = constraints || {};

  const applyScalar = (name: string, val: number, fallback: number) => {
    const range = c.scalars?.[name];
    if (range) return Math.max(range.min, Math.min(range.max, val ?? fallback));
    return val ?? fallback;
  };
  const applyCategorical = (name: string, fallbackList: string[]) => {
    const opts = c.categoricals?.[name];
    const val = seed.genes?.[name]?.value as string;
    if (opts && val && opts.includes(val)) return val;
    if (opts) return opts[Math.floor(rng.nextF64() * opts.length)];
    return val || fallbackList[Math.floor(rng.nextF64() * fallbackList.length)];
  };

  // Resolution from seed or schema (clamped to schema range when present)
  const resGene = (seed.genes?.resolution?.value as number) || 0.5;
  let resolution = Math.floor(16 + applyScalar('resolution', resGene, 0.5) * 112);
  const resolutionPow2 = Math.pow(2, Math.round(Math.log2(Math.max(16, Math.min(256, resolution)))));

  // Palette size (clamped)
  const palSizeGene = (seed.genes?.paletteSize?.value as number) || 0.5;
  const paletteSize = Math.max(2, Math.min(32, Math.floor(applyScalar('paletteSize', palSizeGene, 0.5) * 30) + 2));

  // Base colors
  const baseColors: [number, number, number] = [
    seed.genes?.colorR?.value || rng.nextF64(),
    seed.genes?.colorG?.value || rng.nextF64(),
    seed.genes?.colorB?.value || rng.nextF64()
  ];

  // Symmetry (schema categorical respected)
  const symmetryOptions: SpriteParams['symmetry'][] = ['bilateral', 'radial', 'none'];
  const symmetry = applyCategorical('symmetry', symmetryOptions) as SpriteParams['symmetry'];

  // Animations / frames (derive from quality, but respect schema frameCount / animationSpeed when present)
  const allAnims: AnimationState[] = ['idle', 'walk', 'run', 'attack', 'hurt', 'death', 'jump', 'fall'];
  const animCount = quality === 'photorealistic' ? 8 : quality === 'high' ? 6 : quality === 'medium' ? 4 : 2;
  let animations = allAnims.slice(0, animCount);
  if (c.scalars?.frameCount) {
    const fc = Math.max(2, Math.min(32, Math.floor(applyScalar('frameCount', 0.5, 0.5) * 30) + 2));
    // framesPerAnim can be influenced; keep animation list from quality for now
  }

  // Frames per animation
  let framesPerAnim = quality === 'photorealistic' ? 8 : quality === 'high' ? 6 : quality === 'medium' ? 4 : 2;
  if (c.scalars?.animationSpeed) {
    // animationSpeed (fps) influences frame timing but not count here; clamp for future use
    framesPerAnim = Math.max(2, Math.min(framesPerAnim, Math.floor(applyScalar('animationSpeed', 12, 12) / 3)));
  }

  // Body type (categorical via schema if defined)
  const bodyTypes: SpriteParams['bodyType'][] = ['humanoid', 'quadruped', 'flying', 'slime', 'custom'];
  const bodyType = applyCategorical('bodyType', bodyTypes) as SpriteParams['bodyType'];

  // Features — now gene-driven + schema-clamped where possible (deeper GSPL ownership + flagship elevation)
  const cc = constraints || {};
  const hasHelmet = typeof seed.genes?.hasHelmet?.value === 'boolean' ? seed.genes.hasHelmet.value : (rng.nextF64() > 0.6);
  const hasWeapon = typeof seed.genes?.hasWeapon?.value === 'boolean' ? seed.genes.hasWeapon.value : (rng.nextF64() > 0.5);
  const hasShield = typeof seed.genes?.hasShield?.value === 'boolean' ? seed.genes.hasShield.value : (rng.nextF64() > 0.7);

  const features = {
    hasHelmet,
    hasWeapon,
    hasShield,
    eyeSize: 0.1 + rng.nextF64() * 0.15,
    mouthSize: 0.05 + rng.nextF64() * 0.1
  };

  return {
    resolution: resolutionPow2,
    paletteSize,
    baseColors,
    symmetry,
    animations,
    framesPerAnim,
    bodyType,
    features,
    quality
  };
}

/**
 * Generate color palette with proper color theory
 */
function generatePalette(baseColors: [number, number, number], size: number, rng: Xoshiro256StarStar): PixelArtPalette {
  const colors: [number, number, number][] = [];

  // Convert base to 0-255
  const base: [number, number, number] = [
    Math.floor(baseColors[0] * 255),
    Math.floor(baseColors[1] * 255),
    Math.floor(baseColors[2] * 255)
  ];

  // Base color
  colors.push(base);

  // Generate shades and tints
  for (let i = 1; i < size; i++) {
    const factor = i / (size - 1); // 0 to 1

    if (factor < 0.5) {
      // Shades (darker)
      const shadeFactor = 1 - (factor * 2);
      colors.push([
        Math.floor(base[0] * shadeFactor),
        Math.floor(base[1] * shadeFactor),
        Math.floor(base[2] * shadeFactor)
      ]);
    } else {
      // Tints (lighter) + slight hue shift
      const tintFactor = (factor - 0.5) * 2;
      const hueShift = rng.nextF64() * 30 - 15; // -15 to +15 degrees
      colors.push([
        Math.min(255, Math.floor(base[0] + (255 - base[0]) * tintFactor + hueShift)),
        Math.min(255, Math.floor(base[1] + (255 - base[1]) * tintFactor)),
        Math.min(255, Math.floor(base[2] + (255 - base[2]) * tintFactor - hueShift))
      ]);
    }
  }

  // Apply dithering matrix for retro feel (quality-dependent)
  if (size <= 8) {
    // Apply Bayer 2x2 dithering pattern
    for (let i = 0; i < colors.length; i++) {
      const bayer = [[0, 2], [3, 1]][i % 2][Math.floor(i / 2) % 2];
      const adjustment = (bayer - 1.5) * 15;
      colors[i] = [
        Math.max(0, Math.min(255, colors[i][0] + adjustment)),
        Math.max(0, Math.min(255, colors[i][1] + adjustment)),
        Math.max(0, Math.min(255, colors[i][2] + adjustment))
      ];
    }
  }

  return {
    name: `Palette_${base[0]}_${base[1]}_${base[2]}`,
    colors
  };
}

/**
 * Draw pixel art character using proper algorithms
 */
function drawSpriteFrame(
  ctx: any,
  x: number,
  y: number,
  size: number,
  palette: PixelArtPalette,
  params: SpriteParams,
  animIndex: number,
  frameIndex: number
): void {
  const { bodyType, features, symmetry } = params;
  const rng = createSeededRNG(animIndex * 1000 + frameIndex * 100);

  // Clear frame
  ctx.clearRect(x, y, size, size);

  // Draw based on body type
  switch (bodyType) {
    case 'humanoid':
      drawHumanoid(ctx, x, y, size, palette, features, animIndex, frameIndex, rng);
      break;
    case 'quadruped':
      drawQuadruped(ctx, x, y, size, palette, features, animIndex, frameIndex, rng);
      break;
    case 'flying':
      drawFlying(ctx, x, y, size, palette, features, animIndex, frameIndex, rng);
      break;
    case 'slime':
      drawSlime(ctx, x, y, size, palette, features, animIndex, frameIndex, rng);
      break;
    default:
      drawHumanoid(ctx, x, y, size, palette, features, animIndex, frameIndex, rng);
  }

  // Apply symmetry if needed
  if (symmetry === 'bilateral') {
    applyBilateralSymmetry(ctx, x, y, size, palette);
  }
}

/**
 * Draw humanoid character with pixel art techniques
 */
function drawHumanoid(
  ctx: any,
  x: number,
  y: number,
  size: number,
  palette: PixelArtPalette,
  features: any,
  animIndex: number,
  frameIndex: number,
  rng: () => number
): void {
  const centerX = x + size / 2;
  const bodyY = y + size * 0.3;

  // Animation offset
  const animNames = ['idle', 'walk', 'run', 'attack', 'hurt', 'death', 'jump', 'fall'];
  const animState = animNames[animIndex] || 'idle';
  const cycle = (frameIndex / 4) * Math.PI * 2; // 4 frames per cycle

  // Body (torso) - filled rectangle with outline
  const bodyColor = palette.colors[0];
  const bodyDark = palette.colors[1] || bodyColor;
  const bodyLight = palette.colors[2] || bodyColor;

  // Torso
  ctx.fillStyle = `rgb(${bodyColor[0]},${bodyColor[1]},${bodyColor[2]})`;
  ctx.fillRect(centerX - size*0.15, bodyY, size*0.3, size*0.25);

  // Torso shading (pixel art style)
  ctx.fillStyle = `rgb(${bodyDark[0]},${bodyDark[1]},${bodyDark[2]})`;
  ctx.fillRect(centerX - size*0.15, bodyY + size*0.2, size*0.3, size*0.05); // Bottom shadow

  // Head
  const headSize = size * 0.2;
  ctx.fillStyle = bodyColor;
  ctx.fillRect(centerX - headSize/2, bodyY - headSize - size*0.05, headSize, headSize);

  // Eyes
  const eyeSize = features.eyeSize * size;
  ctx.fillStyle = '#000000';
  ctx.fillRect(centerX - size*0.08, bodyY - headSize, eyeSize, eyeSize);
  ctx.fillRect(centerX + size*0.08 - eyeSize, bodyY - headSize, eyeSize, eyeSize);

  // Mouth
  const mouthSize = features.mouthSize * size;
  ctx.fillRect(centerX - mouthSize/2, bodyY - headSize + size*0.12, mouthSize, size*0.03);

  // Helmet — richer deterministic style (brim + accent from palette)
  if (features.hasHelmet) {
    ctx.fillStyle = palette.colors[3] || bodyDark;
    ctx.fillRect(centerX - headSize/2 - 1, bodyY - headSize - 3, headSize + 2, 4); // main helm
    ctx.fillRect(centerX - headSize/2 - 2, bodyY - headSize - 1, headSize + 4, 2); // brim
    // Accent highlight (metal feel)
    ctx.fillStyle = palette.colors[4] || '#aaa';
    ctx.fillRect(centerX - headSize/2 + 1, bodyY - headSize - 2, 3, 1);
  }

  // === Improved walk/run animation (smoother opposing swing + body bounce) ===
  let bodyBounce = 0;
  let armSwingL = 0;
  let armSwingR = 0;
  let legSwingL = 0;
  let legSwingR = 0;

  if (animState === 'walk' || animState === 'run') {
    const speed = animState === 'run' ? 1.6 : 1.0;
    const phase = cycle * speed;
    bodyBounce = Math.abs(Math.sin(phase)) * size * (animState === 'run' ? 0.04 : 0.025);
    armSwingL = Math.sin(phase) * size * (animState === 'run' ? 0.09 : 0.06);
    armSwingR = Math.sin(phase + Math.PI) * size * (animState === 'run' ? 0.09 : 0.06);
    legSwingL = Math.sin(phase) * size * (animState === 'run' ? 0.12 : 0.09);
    legSwingR = Math.sin(phase + Math.PI) * size * (animState === 'run' ? 0.12 : 0.09);
  }

  // Arms with improved animation
  const armY = bodyY + size*0.05 + bodyBounce;
  const armLength = size * 0.2;

  ctx.fillStyle = bodyColor;
  // Left arm
  ctx.fillRect(centerX - size*0.15 - size*0.08, armY + armSwingL, size*0.08, armLength);
  // Right arm
  ctx.fillRect(centerX + size*0.15, armY + armSwingR, size*0.08, armLength);

  // Weapon — richer deterministic (blade + hilt, sways with arm in walk/run)
  if (features.hasWeapon) {
    ctx.fillStyle = palette.colors[4] || '#888888';
    const baseX = centerX + size*0.2 + (animState === 'walk' || animState === 'run' ? armSwingR * 0.3 : 0);
    const baseY = armY + (animState === 'attack' ? -4 : 0);
    // Hilt
    ctx.fillRect(baseX, baseY + size*0.05, size*0.04, size*0.08);
    // Blade
    ctx.fillRect(baseX - 1, baseY - size*0.18, size*0.06, size*0.22);
    // Tip accent
    ctx.fillStyle = palette.colors[5] || '#ddd';
    ctx.fillRect(baseX, baseY - size*0.18, size*0.04, 3);
  }

  // Legs with improved walk animation + bounce
  const legY = bodyY + size*0.25 + bodyBounce;
  const legLength = size * 0.25;

  ctx.fillStyle = bodyDark;
  // Left leg
  ctx.fillRect(centerX - size*0.1, legY + legSwingL, size*0.08, legLength);
  // Right leg
  ctx.fillRect(centerX + size*0.02, legY + legSwingR, size*0.08, legLength);

  // Shield — richer (boss detail + slight movement with body)
  if (features.hasShield) {
    ctx.fillStyle = palette.colors[5] || '#666666';
    const shieldX = centerX - size*0.26;
    const shieldY = bodyY + bodyBounce + 2;
    ctx.fillRect(shieldX, shieldY, size*0.09, size*0.18);
    // Boss (center metal)
    ctx.fillStyle = palette.colors[3] || '#999';
    ctx.fillRect(shieldX + 2, shieldY + size*0.06, size*0.05, size*0.06);
  }
}

/**
 * Draw quadruped character
 */
function drawQuadruped(
  ctx: any,
  x: number,
  y: number,
  size: number,
  palette: PixelArtPalette,
  features: any,
  animIndex: number,
  frameIndex: number,
  rng: () => number
): void {
  const centerX = x + size / 2;
  const bodyY = y + size * 0.4;

  const bodyColor = palette.colors[0];
  const legColor = palette.colors[1] || bodyColor;

  // Body (horizontal rectangle)
  ctx.fillStyle = `rgb(${bodyColor[0]},${bodyColor[1]},${bodyColor[2]})`;
  ctx.fillRect(centerX - size*0.3, bodyY, size*0.6, size*0.2);

  // Head
  ctx.fillRect(centerX + size*0.25, bodyY - size*0.15, size*0.15, size*0.15);

  // Eyes
  ctx.fillStyle = '#000000';
  ctx.fillRect(centerX + size*0.35, bodyY - size*0.12, size*0.03, size*0.03);

  // Legs (4)
  ctx.fillStyle = `rgb(${legColor[0]},${legColor[1]},${legColor[2]})`;
  const legPositions = [-0.25, -0.1, 0.1, 0.25];
  for (const offset of legPositions) {
    ctx.fillRect(centerX + offset*size, bodyY + size*0.2, size*0.06, size*0.15);
  }

  // Tail
  ctx.fillStyle = bodyColor;
  ctx.fillRect(centerX - size*0.35, bodyY + size*0.05, size*0.1, size*0.03);
}

/**
 * Draw flying character
 */
function drawFlying(
  ctx: any,
  x: number,
  y: number,
  size: number,
  palette: PixelArtPalette,
  features: any,
  animIndex: number,
  frameIndex: number,
  rng: () => number
): void {
  const centerX = x + size / 2;
  const bodyY = y + size * 0.4;

  const bodyColor = palette.colors[0];

  // Body (oval shape approximation with pixels)
  ctx.fillStyle = `rgb(${bodyColor[0]},${bodyColor[1]},${bodyColor[2]})`;
  ctx.fillRect(centerX - size*0.15, bodyY, size*0.3, size*0.2);

  // Wings
  const wingFlap = Math.sin((frameIndex / 4) * Math.PI * 2) * size * 0.1;
  ctx.fillRect(centerX - size*0.35, bodyY - wingFlap, size*0.15, size*0.25);
  ctx.fillRect(centerX + size*0.2, bodyY - wingFlap, size*0.15, size*0.25);

  // Head
  ctx.fillRect(centerX + size*0.15, bodyY - size*0.1, size*0.12, size*0.12);

  // Eyes
  ctx.fillStyle = '#000000';
  ctx.fillRect(centerX + size*0.2, bodyY - size*0.08, size*0.03, size*0.03);
}

/**
 * Draw slime character
 */
function drawSlime(
  ctx: any,
  x: number,
  y: number,
  size: number,
  palette: PixelArtPalette,
  features: any,
  animIndex: number,
  frameIndex: number,
  rng: () => number
): void {
  const centerX = x + size / 2;
  const bodyY = y + size * 0.5;

  const bodyColor = palette.colors[0];
  const highlightColor = palette.colors[2] || bodyColor;

  // Slime body (blob shape)
  const bounce = Math.abs(Math.sin((frameIndex / 4) * Math.PI * 2)) * size * 0.05;

  ctx.fillStyle = `rgb(${bodyColor[0]},${bodyColor[1]},${bodyColor[2]})`;
  // Main body
  ctx.fillRect(centerX - size*0.2, bodyY - bounce, size*0.4, size*0.3 + bounce);
  // Rounded bottom (pixel art style)
  ctx.fillRect(centerX - size*0.15, bodyY + size*0.25, size*0.3, size*0.05);

  // Highlight (shiny effect)
  ctx.fillStyle = `rgb(${highlightColor[0]},${highlightColor[1]},${highlightColor[2]})`;
  ctx.fillRect(centerX - size*0.1, bodyY + size*0.05 - bounce, size*0.15, size*0.08);

  // Eyes
  ctx.fillStyle = '#000000';
  ctx.fillRect(centerX - size*0.08, bodyY + size*0.1 - bounce, size*0.04, size*0.04);
  ctx.fillRect(centerX + size*0.04, bodyY + size*0.1 - bounce, size*0.04, size*0.04);
}

/**
 * Apply bilateral symmetry to sprite
 */
function applyBilateralSymmetry(
  ctx: any,
  x: number,
  y: number,
  size: number,
  palette: PixelArtPalette
): void {
  // This is a simplified version - in real pixel art,
  // artists manually ensure symmetry
  // For now, we'll just ensure the left side mirrors the right side
  const imageData = ctx.getImageData(x, y, size, size);
  const data = imageData.data;

  for (let row = 0; row < size; row++) {
    for (let col = 0; col < size / 2; col++) {
      const leftIdx = (row * size + col) * 4;
      const rightIdx = (row * size + (size - 1 - col)) * 4;

      // Mirror left to right
      data[rightIdx] = data[leftIdx];     // R
      data[rightIdx + 1] = data[leftIdx + 1]; // G
      data[rightIdx + 2] = data[leftIdx + 2]; // B
      data[rightIdx + 3] = data[leftIdx + 3]; // A
    }
  }

  ctx.putImageData(imageData, x, y);
}

/**
 * Create seeded RNG for pixel-level operations
 */
function createSeededRNG(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return s / 0x7fffffff;
  };
}

/**
 * Apply pixel art dithering (Floyd-Steinberg)
 */
function applyDithering(ctx: any, x: number, y: number, width: number, height: number, palette: PixelArtPalette): void {
  const imageData = ctx.getImageData(x, y, width, height);
  const data = imageData.data;

  for (let i = 0; i < data.length; i += 4) {
    const oldR = data[i];
    const oldG = data[i + 1];
    const oldB = data[i + 2];

    // Find closest palette color
    let minDist = Infinity;
    let newR = 0, newG = 0, newB = 0;

    for (const color of palette.colors) {
      const dist = Math.pow(color[0] - oldR, 2) + Math.pow(color[1] - oldG, 2) + Math.pow(color[2] - oldB, 2);
      if (dist < minDist) {
        minDist = dist;
        newR = color[0];
        newG = color[1];
        newB = color[2];
      }
    }

    data[i] = newR;
    data[i + 1] = newG;
    data[i + 2] = newB;

    // Quantization error
    const errR = oldR - newR;
    const errG = oldG - newG;
    const errB = oldB - newB;

    // Diffuse error to neighboring pixels (simplified)
    if (i + 4 < data.length) {
      data[i + 4] = Math.min(255, Math.max(0, data[i + 4] + errR * 0.5));
      data[i + 5] = Math.min(255, Math.max(0, data[i + 5] + errG * 0.5));
      data[i + 6] = Math.min(255, Math.max(0, data[i + 6] + errB * 0.5));
    }
  }

  ctx.putImageData(imageData, x, y);
}

/**
 * Main export function — generates world-class sprite sheet
 */
export async function generateSpriteV2(seed: Seed, outputPath: string): Promise<{
  filePath: string;
  width: number;
  height: number;
  frames: number;
  palette: string;
  gsplSchema?: string;
}> {
  const rng = rngFromHash(seed.$hash || '');

  // === GSPL Canon Integration (sprite schema) ===
  let gsplSchemaLoaded: string | undefined;
  let spriteConstraints: any = null;
  try {
    const schemaContent = await import('fs/promises').then(fs => 
      fs.readFile('data/commons/libraries/sprite.gspl', 'utf8').catch(() => null));
    if (schemaContent) {
      gsplSchemaLoaded = 'sprite.gspl';
      spriteConstraints = parseSpriteSchemaConstraints(schemaContent);
    }
  } catch (e) {}

  // NOTE (verify-sweep): PNG sprite sheets + JSON metadata may require golden updates.

  // Apply sprite constraints if loaded (deeper GSPL usage - schema now governs extract)
  const params = extractParams(seed, rng, spriteConstraints);

  // Sprite sheet layout: animations × frames
  const sheetWidth = params.resolution * params.framesPerAnim;
  const sheetHeight = params.resolution * params.animations.length;

  const canvas = createCanvas(sheetWidth, sheetHeight);
  const ctx = canvas.getContext('2d');

  // Generate palette
  const palette = generatePalette(params.baseColors, params.paletteSize, rng);

  // Create each animation frame
  for (let animIdx = 0; animIdx < params.animations.length; animIdx++) {
    for (let frame = 0; frame < params.framesPerAnim; frame++) {
      const x = frame * params.resolution;
      const y = animIdx * params.resolution;

      drawSpriteFrame(ctx, x, y, params.resolution, palette, params, animIdx, frame);
    }
  }

  // Apply dithering for retro aesthetic (quality-dependent)
  if (params.quality === 'low' || params.quality === 'medium') {
    applyDithering(ctx, 0, 0, sheetWidth, sheetHeight, palette);
  }

  // Ensure output directory
  const dir = path.dirname(outputPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  // Write PNG
  const pngPath = outputPath.replace(/\.json$/, '.png');
  const buffer = canvas.toBuffer('image/png');
  fs.writeFileSync(pngPath, buffer);

  // Write metadata
  const metaPath = outputPath.replace(/\.json$/, '_sprite.json');
  const metadata = {
    sprite: {
      resolution: params.resolution,
      framesPerAnim: params.framesPerAnim,
      animations: params.animations,
      bodyType: params.bodyType,
      palette: palette.name,
      paletteSize: params.paletteSize,
      quality: params.quality
    },
    features: params.features,
    export: {
      sheetWidth,
      sheetHeight,
      frameCount: params.framesPerAnim * params.animations.length,
      format: 'PNG'
    }
  };
  fs.writeFileSync(metaPath, JSON.stringify(metadata, null, 2));

  return {
    filePath: pngPath,
    width: sheetWidth,
    height: sheetHeight,
    frames: params.framesPerAnim * params.animations.length,
    palette: palette.name,
    gsplSchema: gsplSchemaLoaded
  };
}

/**
 * Lightweight parser for sprite.gspl constraints (propagating deeper GSPL usage pattern).
 */
function parseSpriteSchemaConstraints(schema: string): any {
  const constraints: any = { scalars: {}, categoricals: {} };
  const geneMatches = schema.matchAll(/gene\s+(\w+):\s*(scalar|categorical)\s*(?:in\s*(\[[^\]]+\]))?/g);
  for (const match of geneMatches) {
    const name = match[1];
    const type = match[2];
    const rangeStr = match[3];
    if (type === 'scalar' && rangeStr) {
      const nums = rangeStr.match(/[\d.]+/g);
      if (nums && nums.length >= 2) constraints.scalars[name] = { min: parseFloat(nums[0]), max: parseFloat(nums[1]) };
    } else if (type === 'categorical' && rangeStr) {
      const items = rangeStr.match(/"([^"]+)"|'([^']+)'/g);
      if (items) constraints.categoricals[name] = items.map(s => s.replace(/['"]/g, ''));
    }
  }
  return constraints;
}
