/**
 * Animation Generator — produces animated GIF or sprite sheet
 * Creates frame-by-frame animation from seed genes
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

export async function generateAnimation(seed: Seed, outputPath: string): Promise<{ filePath: string; frameCount: number; fps: number }> {
  const params = extractParams(seed);
  
  // For simplicity, generate a PNG sprite sheet of animation frames
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
    
    drawAnimationFrame(ctx, x, y, frameWidth, frameHeight, frame, params);
  }
  
  // Ensure output directory exists
  const dir = path.dirname(outputPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  
  // Write PNG sprite sheet
  const pngPath = outputPath.replace(/\.gltf$/, '_spritesheet.png');
  const buffer = canvas.toBuffer('image/png');
  fs.writeFileSync(pngPath, buffer);
  
  // Write metadata JSON
  const metaPath = outputPath.replace(/\.gltf$/, '_meta.json');
  fs.writeFileSync(metaPath, JSON.stringify({
    frameCount: params.frameCount,
    fps: params.fps,
    motionType: params.motionType,
    loop: params.loop,
    frameWidth,
    frameHeight,
    cols,
    rows,
    totalFrames: params.frameCount
  }, null, 2));
  
  return {
    filePath: pngPath,
    frameCount: params.frameCount,
    fps: params.fps
  };
}

function drawAnimationFrame(
  ctx: any, x: number, y: number, w: number, h: number,
  frame: number, params: AnimationParams
) {
  // Clear frame area
  ctx.fillStyle = 'rgba(0,0,0,0)';
  ctx.clearRect(x, y, w, h);
  
  // Draw simple animated character
  const phase = (frame / params.frameCount) * Math.PI * 2;
  
  // Body
  ctx.fillStyle = '#4a90e2';
  ctx.fillRect(x + w * 0.3, y + h * 0.3, w * 0.4, h * 0.4);
  
  // Head
  ctx.fillStyle = '#f5d0a9';
  ctx.beginPath();
  ctx.arc(x + w * 0.5, y + h * 0.2, w * 0.15, 0, Math.PI * 2);
  ctx.fill();
  
  // Animated limbs
  ctx.fillStyle = '#4a90e2';
  const armSwing = Math.sin(phase) * 20;
  ctx.fillRect(x + w * 0.2 + armSwing, y + h * 0.4, w * 0.1, h * 0.3);
  ctx.fillRect(x + w * 0.7 - armSwing, y + h * 0.4, w * 0.1, h * 0.3);
  
  // Legs
  const legSwing = Math.sin(phase + Math.PI) * 15;
  ctx.fillRect(x + w * 0.35 + legSwing, y + h * 0.7, w * 0.1, h * 0.25);
  ctx.fillRect(x + w * 0.55 - legSwing, y + h * 0.7, w * 0.1, h * 0.25);
}

function extractParams(seed: Seed): AnimationParams {
  const quality = seed.genes?.quality?.value || 'medium';
  
  let frameCount = seed.genes?.frameCount?.value || 0.5;
  if (typeof frameCount === 'number' && frameCount <= 1) frameCount = Math.floor(frameCount * 60);
  
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
