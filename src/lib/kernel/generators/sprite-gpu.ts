/**
 * WebGPU Compute Shaders for Sprite V2 Generator
 * Pixel-level operations in parallel (10,000+ pixels updated simultaneously)
 * Enables real-time pixel art generation and animation
 */

import type { SpriteParams } from './sprite-v2';

/**
 * WGSL Compute Shader for sprite sheet generation
 * Generates all animation frames in parallel
 */
export const SPRITE_COMPUTE_WGSL = `
struct Pixel {
  color: vec4<f32>,
  alpha: f32,
}

struct SpriteUniforms {
  resolution: u32,
  frameCount: u32,
  animationCount: u32,
  paletteSize: u32,
  seedHash: u64, // For RNG
}

@group(0) @binding(0) var<uniform> uniforms: SpriteUniforms;
@group(0) @binding(1) var<storage, read_write> spriteSheet: array<Pixel>;
@group(0) @binding(2) var<storage, read> palette: array<vec4<f32>>;
@group(0) @binding(3) var<storage, read_write> rngState: array<u64, 4>;

// xoshiro256** RNG (same as CPU version)
fn rng_next() -> u64 {
  let result = rotl(rngState[1] * 5u, 7u) * 9u;
  
  let t = rngState[1] << 17u;
  rngState[2] = rngState[2] ^ rngState[0];
  rngState[3] = rngState[3] ^ rngState[1];
  rngState[1] = rngState[1] ^ rngState[2];
  rngState[0] = rngState[0] ^ rngState[3];
  rngState[2] = rngState[2] ^ t;
  rngState[3] = rotl(rngState[3], 45u);
  
  return result;
}

fn rng_next_f32() -> f32 {
  let u = rng_next() >> 11u;
  return f32(u) / f32(0x1_0000_0000u);
}

// Convert 1D index to 2D coordinates
fn indexTo2D(idx: u32, width: u32) -> vec2<u32> {
  return vec2<u32>(idx % width, idx / width);
}

// Character body type enum
const BODY_HUMANOID: u32 = 0u;
const BODY_QUADRUPED: u32 = 1u;
const BODY_FLYING: u32 = 2u;
const BODY_SLIME: u32 = 3u;

@compute @workgroup_size(8, 8)
fn generateSpriteSheet(@builtin(global_invocation_id) id: vec3<u32>) {
  let pixelIdx = id.x + id.y * uniforms.resolution * uniforms.frameCount;
  let totalWidth = uniforms.resolution * uniforms.frameCount;
  
  if (pixelIdx >= arrayLength(&spriteSheet)) { return; }
  
  // Calculate which frame and position within frame
  let frameX = id.x / uniforms.resolution;
  let frameY = id.y / uniforms.resolution;
  let localX = id.x % uniforms.resolution;
  let localY = id.y % uniforms.resolution;
  
  let animIdx = frameY;
  let frameIdx = frameX;
  
  // Normalize local coordinates (0-1)
  let u = f32(localX) / f32(uniforms.resolution);
  let v = f32(localY) / f32(uniforms.resolution);
  
  // Generate pixel based on body type (hardcoded to humanoid for this shader)
  var color: vec4<f32> = palette[0]; // Default body color
  
  // Body (torso): 0.3-0.7 in both axes
  if (u > 0.3 && u < 0.7 && v > 0.3 && v < 0.55) {
    color = palette[0]; // Body color
    
    // Shading: bottom slightly darker
    if (v > 0.5) {
      color = palette[1]; // Darker variant
    }
  }
  
  // Head: 0.35-0.65 in X, 0.15-0.35 in Y
  if (u > 0.35 && u < 0.65 && v > 0.15 && v < 0.35) {
    color = palette[0];
    
    // Eyes: 0.4-0.45 and 0.55-0.6 in X, 0.2-0.22 in Y
    if ((u > 0.4 && u < 0.45 || u > 0.55 && u < 0.6) && v > 0.2 && v < 0.22) {
      color = vec4<f32>(0.0, 0.0, 0.0, 1.0); // Black
    }
    
    // Mouth: 0.45-0.55 in X, 0.28-0.29 in Y
    if (u > 0.45 && u < 0.55 && v > 0.28 && v < 0.29) {
      color = vec4<f32>(0.0, 0.0, 0.0, 1.0);
    }
  }
  
  // Left arm: 0.2-0.28 in X, 0.4-0.6 in Y
  if (u > 0.2 && u < 0.28 && v > 0.4 && v < 0.6) {
    color = palette[0];
  }
  
  // Right arm: 0.72-0.8 in X, 0.4-0.6 in Y
  if (u > 0.72 && u < 0.8 && v > 0.4 && v < 0.6) {
    color = palette[0];
  }
  
  // Left leg: 0.35-0.43 in X, 0.7-0.95 in Y
  if (u > 0.35 && u < 0.43 && v > 0.7 && v < 0.95) {
    color = palette[1]; // Leg color (darker)
  }
  
  // Right leg: 0.57-0.65 in X, 0.7-0.95 in Y
  if (u > 0.57 && u < 0.65 && v > 0.7 && v < 0.95) {
    color = palette[1];
  }
  
  // Animation offset (simple walk cycle)
  if ((animIdx == 1u || animIdx == 2u) && (v > 0.7 && v < 0.95)) {
    // Legs move based on frame
    let offset = sin(f32(frameIdx) * 0.5) * 0.05;
    if ((u > 0.35 && u < 0.43) || (u > 0.57 && u < 0.65)) {
      color = mix(color, palette[2], abs(offset) * 10.0);
    }
  }
  
  spriteSheet[pixelIdx].color = color;
  spriteSheet[pixelIdx].alpha = 1.0;
}
`;

/**
 * Create GPU buffers for sprite generation
 */
export async function createSpriteBuffers(
  device: GPUDevice,
  params: SpriteParams,
  seedHash: string
): Promise<{
  uniformBuffer: GPUBuffer;
  spriteBuffer: GPUBuffer;
  paletteBuffer: GPUBuffer;
  rngBuffer: GPUBuffer;
}> {
  // Uniform buffer
  const uniformData = new Uint32Array([
    params.resolution,
    params.framesPerAnim,
    params.animations.length,
    params.paletteSize
  ]);

  const uniformBuffer = device.createBuffer({
    size: uniformData.byteLength,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
  });
  device.queue.writeBuffer(uniformBuffer, 0, uniformData);

  // Sprite sheet buffer (resolution × resolution × frameCount × animationCount)
  const totalPixels = params.resolution * params.resolution *
                    params.framesPerAnim * params.animations.length;
  const spriteBuffer = device.createBuffer({
    size: totalPixels * 4 * 4, // 4 components (RGBA) × 4 bytes per f32
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC
  });

  // Palette buffer (RGBA for each palette color)
  const paletteData = new Float32Array(params.paletteSize * 4);
  // Initialize with some default colors (would use actual palette in real impl)
  for (let i = 0; i < params.paletteSize; i++) {
    const offset = i * 4;
    paletteData[offset] = params.baseColors[0];     // R
    paletteData[offset + 1] = params.baseColors[1]; // G
    paletteData[offset + 2] = params.baseColors[2]; // B
    paletteData[offset + 3] = 1.0;                    // A
  }

  const paletteBuffer = device.createBuffer({
    size: paletteData.byteLength,
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST
  });
  device.queue.writeBuffer(paletteBuffer, 0, paletteData);

  // RNG state buffer (initialized from seed hash)
  const rngSeed = BigInt('0x' + (seedHash.replace(/[^0-9a-fA-F]/g, '').slice(0, 16) || '0'));
  const s0 = rngSeed + 0x9e3779b97f4a7c15n;
  let z = s0;
  z = (z ^ (z >> 30n)) * 0xbf58476d1ce4e5b9n;
  z = (z ^ (z >> 27n)) * 0x94d049bb133111ebn;
  z = z ^ (z >> 31n);
  const state0 = z;

  // Repeat for s1, s2, s3...
  const s1 = state0 + 0x9e3779b97f4a7c15n;
  z = s1;
  z = (z ^ (z >> 30n)) * 0xbf58476d1ce4e5b9n;
  z = (z ^ (z >> 27n)) * 0x94d049bb133111ebn;
  z = z ^ (z >> 31n);
  const state1 = z;

  const s2 = state1 + 0x9e3779b97f4a7c15n;
  z = s2;
  z = (z ^ (z >> 30n)) * 0xbf58476d1ce4e5b9n;
  z = (z ^ (z >> 27n)) * 0x94d049bb133111ebn;
  z = z ^ (z >> 31n);
  const state2 = z;

  const s3 = state2 + 0x9e3779b97f4a7c15n;
  z = s3;
  z = (z ^ (z >> 30n)) * 0xbf58476d1ce4e5b9n;
  z = (z ^ (z >> 27n)) * 0x94d049bb133111ebn;
  z = z ^ (z >> 31n);
  const state3 = z;

  const rngData = new BigUint64Array([state0, state1, state2, state3]);
  const rngBuffer = device.createBuffer({
    size: 32, // 4 × u64
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST
  });
  device.queue.writeBuffer(rngBuffer, 0, rngData);

  return { uniformBuffer, spriteBuffer, paletteBuffer, rngBuffer };
}

/**
 * Build compute pipeline for sprite generation
 */
export async function buildSpritePipeline(
  device: GPUDevice,
  shaderCode: string
): Promise<GPUComputePipeline> {
  const module = device.createShaderModule({ code: shaderCode });

  return await device.createComputePipelineAsync({
    layout: 'auto',
    compute: { module, entryPoint: 'generateSpriteSheet' }
  });
}

/**
 * Read back sprite data from GPU and save as PNG
 */
export async function readSpriteFromGPU(
  device: GPUDevice,
  spriteBuffer: GPUBuffer,
  params: SpriteParams
): Promise<Buffer> {
  // Create staging buffer for readback
  const totalPixels = params.resolution * params.resolution *
                    params.framesPerAnim * params.animations.length;
  const stagingBuffer = device.createBuffer({
    size: totalPixels * 4 * 4, // RGBA f32
    usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST
  });

  // Copy from storage buffer to staging buffer
  const commandEncoder = device.createCommandEncoder();
  commandEncoder.copyBufferToBuffer(spriteBuffer, stagingBuffer, totalPixels * 4 * 4);
  device.queue.submit([commandEncoder.finish()]);

  // Map and read
  await stagingBuffer.mapAsync(GPUMapMode.READ);
  const mappedRange = stagingBuffer.getMappedRange();
  const data = new Float32Array(mappedRange);
  stagingBuffer.unmap();

  // Convert to RGBA byte array (simplified — would use canvas/png lib in real impl)
  const canvas = require('canvas');
  const { createCanvas } = canvas;
  const c = createCanvas(params.resolution * params.framesPerAnim, params.resolution * params.animations.length);
  const ctx = c.getContext('2d');
  const imageData = ctx.createImageData(c.width, c.height);

  for (let i = 0; i < totalPixels; i++) {
    const offset = i * 4;
    imageData.data[i * 4] = Math.floor(data[offset] * 255);
    imageData.data[i * 4 + 1] = Math.floor(data[offset + 1] * 255);
    imageData.data[i * 4 + 2] = Math.floor(data[offset + 2] * 255);
    imageData.data[i * 4 + 3] = Math.floor(data[offset + 3] * 255);
  }

  ctx.putImageData(imageData, 0, 0);
  return c.toBuffer('image/png');
}
