/**
 * Animation Generator — produces animated sequences
 * Creates frame-by-frame animation with motion paths
 */

import { createCanvas } from 'canvas';
import * as fs from 'fs';
import * as path from 'path';
import type { Seed } from '../engines';

interface AnimationParams {
  frameCount: number;
  fps: number;
  motionType: string;
  loop: string;
  quality: 'low' | 'medium' | 'high' | 'photorealistic';
}

export async function generateAnimationEnhanced(seed: Seed, outputPath: string): Promise<{ filePath: string; frameCount: number; fps: number }> {
  const params = extractParams(seed);
  
  // Create animated PNG (APNG) or sprite sheet
  const frameWidth = 128;
  const frameHeight = 128;
  const cols = Math.min(params.frameCount, 8);
  const rows = Math.ceil(params.frameCount / cols);
  
  const canvas = createCanvas(frameWidth * cols, frameHeight * rows);
  const ctx = canvas.getContext('2d');
  
  // Generate each frame
  for (let frame = 0; frame < params.frameCount; frame++) {
    const col = frame % cols;
    const row = Math.floor(frame / cols);
    const x = col * frameWidth;
    const y = row * frameHeight;
    
    drawAnimationFrameEnhanced(ctx, x, y, frameWidth, frameHeight, frame, params);
  }
  
  // Ensure output directory exists
  const dir = path.dirname(outputPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  
  // Write PNG sprite sheet
  const pngPath = outputPath.replace(/\.png$/, '_enhanced.png');
  const buffer = canvas.toBuffer('image/png');
  fs.writeFileSync(pngPath, buffer);
  
  // Write metadata JSON with motion paths
  const metaPath = outputPath.replace(/\.png$/, '_meta.json');
  const metadata = {
    frameCount: params.frameCount,
    fps: params.fps,
    motionType: params.motionType,
    loop: params.loop,
    frameWidth,
    frameHeight,
    cols,
    rows,
    totalFrames: params.frameCount,
    motionPaths: generateMotionPaths(params)
  };
  fs.writeFileSync(metaPath, JSON.stringify(metadata, null, 2));
  
  return {
    filePath: pngPath,
    frameCount: params.frameCount,
    fps: params.fps
  };
}

function drawAnimationFrameEnhanced(
  ctx: any, x: number, y: number, w: number, h: number,
  frame: number, params: AnimationParams
) {
  // Clear frame area
  ctx.fillStyle = 'rgba(0,0,0,0)';
  ctx.clearRect(x, y, w, h);
  
  const phase = (frame / params.frameCount) * Math.PI * 2;
  const centerX = x + w / 2;
  const centerY = y + h / 2;
  
  if (params.motionType === 'skeletal') {
    // Draw simple skeletal animation
    drawSkeletalAnimation(ctx, centerX, centerY, w, h, phase);
  } else if (params.motionType === 'particle') {
    // Draw particle animation
    drawParticleAnimation(ctx, x, y, w, h, frame, params.frameCount);
  } else {
    // Generic motion
    drawGenericMotion(ctx, centerX, centerY, w, h, phase);
  }
}

function drawSkeletalAnimation(ctx: any, cx: number, cy: number, w: number, h: number, phase: number) {
  // Body
  ctx.fillStyle = '#4a90e2';
  ctx.fillRect(cx - w * 0.2, cy - h * 0.25, w * 0.4, h * 0.5);
  
  // Head
  ctx.beginPath();
  ctx.arc(cx, cy - h * 0.4, w * 0.15, 0, Math.PI * 2);
  ctx.fillStyle = '#f5d742';
  ctx.fill();
  
  // Animated limbs
  const armSwing = Math.sin(phase) * w * 0.2;
  const legSwing = Math.sin(phase + Math.PI) * w * 0.15;
  
  // Arms
  ctx.fillStyle = '#4a90e2';
  ctx.fillRect(cx - w * 0.35 + armSwing, cy - h * 0.1, w * 0.1, h * 0.3);
  ctx.fillRect(cx + w * 0.25 - armSwing, cy - h * 0.1, w * 0.1, h * 0.3);
  
  // Legs
  ctx.fillRect(cx - w * 0.15 + legSwing, cy + h * 0.25, w * 0.1, h * 0.25);
  ctx.fillRect(cx + w * 0.05 - legSwing, cy + h * 0.25, w * 0.1, h * 0.25);
}

function drawParticleAnimation(ctx: any, x: number, y: number, w: number, h: number, frame: number, totalFrames: number) {
  ctx.fillStyle = 'rgba(74, 144, 226, 0.5)';
  const rng = createRNG(frame * 12345);
  
  for (let i = 0; i < 20; i++) {
    const px = x + rng() * w;
    const py = y + rng() * h;
    const size = 2 + rng() * 5;
    ctx.beginPath();
    ctx.arc(px, py, size, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawGenericMotion(ctx: any, cx: number, cy: number, w: number, h: number, phase: number) {
  // Simple bouncing ball
  const bounce = Math.abs(Math.sin(phase)) * h * 0.3;
  ctx.beginPath();
  ctx.arc(cx, cy + bounce, w * 0.1, 0, Math.PI * 2);
  ctx.fillStyle = '#e94560';
  ctx.fill();
}

function generateMotionPaths(params: AnimationParams): any[] {
  const paths = [];
  for (let i = 0; i < params.frameCount; i++) {
    const t = i / params.frameCount;
    paths.push({
      frame: i,
      time: t * (params.frameCount / params.fps),
      position: {
        x: Math.sin(t * Math.PI * 2) * 50,
        y: Math.cos(t * Math.PI * 2) * 30
      }
    });
  }
  return paths;
}

function createRNG(seed: number): () => number {
  let s = seed;
  return () => { s = (s * 16807 + 0) % 2147483647; return s / 2147483647; };
}

function extractParams(seed: Seed): AnimationParams {
  const quality = seed.genes?.quality?.value || 'medium';
  
  const qualityFrames: Record<string, number> = {
    low: 8,
    medium: 16,
    high: 32,
    photorealistic: 64
  };
  
  let frameCount = seed.genes?.frameCount?.value || 0.5;
  if (typeof frameCount === 'number' && frameCount <= 1) frameCount = Math.floor(frameCount * qualityFrames[quality]);
  
  let fps = seed.genes?.fps?.value || 0.5;
  if (typeof fps === 'number' && fps <= 1) fps = Math.floor(fps * 60);
  
  return {
    frameCount: Math.max(4, Math.min(frameCount, 64)),
    fps: Math.max(8, Math.min(fps, 60)),
    motionType: seed.genes?.motionType?.value || 'skeletal',
    loop: seed.genes?.loop?.value || 'loop',
    quality: ['low', 'medium', 'high', 'photorealistic'].includes(quality) ? quality : 'medium'
  };
}
