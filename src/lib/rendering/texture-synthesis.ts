/**
 * Texture Synthesis — Procedural Texture Generation
 * Features: Perlin noise, Voronoi, fractal patterns, PBR texture sets
 */

import * as THREE from 'three';

export interface TextureMapSet {
  albedo: THREE.Texture;
  normal: THREE.Texture;
  roughness: THREE.Texture;
  metallic: THREE.Texture;
  ao: THREE.Texture;
  height: THREE.Texture;
}

export type TextureResolution = 256 | 512 | 1024 | 2048 | 4096;
export type TexturePattern = 'noise' | 'voronoi' | 'fractal' | 'brick' | 'wood' | 'marble';

export interface TextureParams {
  resolution: number;
  seed: number;
  pattern: TexturePattern;
  scale?: number;
  octaves?: number;
  lacunarity?: number;
  gain?: number;
}

export class TextureSynthesisEngine {
  constructor(private defaultSeed: number = 0) {}
  
  generateTextureMaps(params: TextureParams): TextureMapSet {
    return generatePBRTextureSet(params);
  }
}

export function generateTextureMaps(params: TextureParams): TextureMapSet {
  return generatePBRTextureSet(params);
}

export function generatePBRTextureSet(params: TextureParams): TextureMapSet {
  const albedoCanvas = document.createElement('canvas');
  albedoCanvas.width = params.resolution;
  albedoCanvas.height = params.resolution;
  const albedoCtx = albedoCanvas.getContext('2d')!;
  
  const normalCanvas = document.createElement('canvas');
  normalCanvas.width = params.resolution;
  normalCanvas.height = params.resolution;
  const normalCtx = normalCanvas.getContext('2d')!;
  
  const roughnessCanvas = document.createElement('canvas');
  roughnessCanvas.width = params.resolution;
  roughnessCanvas.height = params.resolution;
  const roughnessCtx = roughnessCanvas.getContext('2d')!;
  
  const metallicCanvas = document.createElement('canvas');
  metallicCanvas.width = params.resolution;
  metallicCanvas.height = params.resolution;
  const metallicCtx = metallicCanvas.getContext('2d')!;
  
  const aoCanvas = document.createElement('canvas');
  aoCanvas.width = params.resolution;
  aoCanvas.height = params.resolution;
  const aoCtx = aoCanvas.getContext('2d')!;
  
  const heightCanvas = document.createElement('canvas');
  heightCanvas.width = params.resolution;
  heightCanvas.height = params.resolution;
  const heightCtx = heightCanvas.getContext('2d')!;
  
  // Generate base noise pattern
  const noiseData = generateNoise(params.resolution, params.resolution, params);
  
  // Apply to all texture maps
  renderAlbedo(albedoCtx, noiseData, params);
  renderNormal(normalCtx, noiseData, params);
  renderRoughness(roughnessCtx, noiseData, params);
  renderMetallic(metallicCtx, noiseData, params);
  renderAO(aoCtx, noiseData, params);
  renderHeight(heightCtx, noiseData, params);
  
  return {
    albedo: new THREE.CanvasTexture(albedoCanvas),
    normal: new THREE.CanvasTexture(normalCanvas),
    roughness: new THREE.CanvasTexture(roughnessCanvas),
    metallic: new THREE.CanvasTexture(metallicCanvas),
    ao: new THREE.CanvasTexture(aoCanvas),
    height: new THREE.CanvasTexture(heightCanvas)
  };
}

function generateNoise(width: number, height: number, params: TextureParams): number[][] {
  const scale = params.scale || 1.0;
  const octaves = params.octaves || 4;
  const lacunarity = params.lacunarity || 2.0;
  const gain = params.gain || 0.5;
  
  const noise: number[][] = [];
  
  for (let y = 0; y < height; y++) {
    noise[y] = [];
    for (let x = 0; x < width; x++) {
      let value = 0;
      let amplitude = 1.0;
      let frequency = 1.0;
      let maxValue = 0;
      
      for (let i = 0; i < octaves; i++) {
        const nx = x * scale * frequency / width;
        const ny = y * scale * frequency / height;
        value += perlinNoise(nx, ny, params.seed + i) * amplitude;
        maxValue += amplitude;
        amplitude *= gain;
        frequency *= lacunarity;
      }
      
      noise[y][x] = (value / maxValue + 1) / 2;
    }
  }
  
  return noise;
}

function perlinNoise(x: number, y: number, seed: number): number {
  const X = Math.floor(x) & 255;
  const Y = Math.floor(y) & 255;
  const xf = x - Math.floor(x);
  const yf = y - Math.floor(y);
  
  const u = fade(xf);
  const v = fade(yf);
  
  const hash = (xi: number, yi: number) => {
    const n = xi + yi * 57 + seed * 131;
    return ((n * 34) + (n >> 5)) & 255;
  };
  
  const grad = (hash: number, x: number, y: number) => {
    const h = hash & 3;
    const u = h < 2 ? x : y;
    const v = h < 2 ? y : x;
    return ((h & 1) === 0 ? u : -u) + ((h & 2) === 0 ? v : -v);
  };
  
  const aa = hash(X, Y);
  const ab = hash(X, Y + 1);
  const ba = hash(X + 1, Y);
  const bb = hash(X + 1, Y + 1);
  
  const x1 = lerp(grad(aa, xf, yf), grad(ba, xf - 1, yf), u);
  const x2 = lerp(grad(ab, xf, yf - 1), grad(bb, xf - 1, yf - 1), u);
  
  return lerp(x1, x2, v);
}

function fade(t: number): number {
  return t * t * t * (t * (t * 6 - 15) + 10);
}

function lerp(a: number, b: number, t: number): number {
  return a + t * (b - a);
}

function renderAlbedo(ctx: CanvasRenderingContext2D, noise: number[][], params: TextureParams) {
  const imageData = ctx.createImageData(params.resolution, params.resolution);
  const data = imageData.data;
  
  for (let y = 0; y < params.resolution; y++) {
    for (let x = 0; x < params.resolution; x++) {
      const n = noise[y][x];
      const idx = (y * params.resolution + x) * 4;
      
      // Color based on noise value
      const r = Math.floor(n * 200 + 55);
      const g = Math.floor(n * 180 + 40);
      const b = Math.floor(n * 160 + 30);
      
      data[idx] = r;
      data[idx + 1] = g;
      data[idx + 2] = b;
      data[idx + 3] = 255;
    }
  }
  
  ctx.putImageData(imageData, 0, 0);
}

function renderNormal(ctx: CanvasRenderingContext2D, noise: number[][], params: TextureParams) {
  const imageData = ctx.createImageData(params.resolution, params.resolution);
  const data = imageData.data;
  
  for (let y = 0; y < params.resolution; y++) {
    for (let x = 0; x < params.resolution; x++) {
      const idx = (y * params.resolution + x) * 4;
      
      // Calculate normal from height gradient
      const h = noise[y][x];
      const hx = x < params.resolution - 1 ? noise[y][x + 1] : h;
      const hy = y < params.resolution - 1 ? noise[y + 1][x] : h;
      
      const nx = (h - hx) * 10;
      const ny = (h - hy) * 10;
      const nz = 1.0;
      
      const len = Math.sqrt(nx * nx + ny * ny + nz * nz);
      
      data[idx] = Math.floor((nx / len + 1) * 127.5);
      data[idx + 1] = Math.floor((ny / len + 1) * 127.5);
      data[idx + 2] = Math.floor((nz / len + 1) * 127.5);
      data[idx + 3] = 255;
    }
  }
  
  ctx.putImageData(imageData, 0, 0);
}

function renderRoughness(ctx: CanvasRenderingContext2D, noise: number[][], params: TextureParams) {
  const imageData = ctx.createImageData(params.resolution, params.resolution);
  const data = imageData.data;
  
  for (let y = 0; y < params.resolution; y++) {
    for (let x = 0; x < params.resolution; x++) {
      const idx = (y * params.resolution + x) * 4;
      const n = Math.floor(noise[y][x] * 255);
      
      data[idx] = n;
      data[idx + 1] = n;
      data[idx + 2] = n;
      data[idx + 3] = 255;
    }
  }
  
  ctx.putImageData(imageData, 0, 0);
}

function renderMetallic(ctx: CanvasRenderingContext2D, noise: number[][], params: TextureParams) {
  const imageData = ctx.createImageData(params.resolution, params.resolution);
  const data = imageData.data;
  
  for (let y = 0; y < params.resolution; y++) {
    for (let x = 0; x < params.resolution; x++) {
      const idx = (y * params.resolution + x) * 4;
      const n = Math.floor(noise[y][x] * 50);
      
      data[idx] = n;
      data[idx + 1] = n;
      data[idx + 2] = n;
      data[idx + 3] = 255;
    }
  }
  
  ctx.putImageData(imageData, 0, 0);
}

function renderAO(ctx: CanvasRenderingContext2D, noise: number[][], params: TextureParams) {
  const imageData = ctx.createImageData(params.resolution, params.resolution);
  const data = imageData.data;
  
  for (let y = 0; y < params.resolution; y++) {
    for (let x = 0; x < params.resolution; x++) {
      const idx = (y * params.resolution + x) * 4;
      const n = Math.floor((0.5 + noise[y][x] * 0.5) * 255);
      
      data[idx] = n;
      data[idx + 1] = n;
      data[idx + 2] = n;
      data[idx + 3] = 255;
    }
  }
  
  ctx.putImageData(imageData, 0, 0);
}

function renderHeight(ctx: CanvasRenderingContext2D, noise: number[][], params: TextureParams) {
  const imageData = ctx.createImageData(params.resolution, params.resolution);
  const data = imageData.data;
  
  for (let y = 0; y < params.resolution; y++) {
    for (let x = 0; x < params.resolution; x++) {
      const idx = (y * params.resolution + x) * 4;
      const n = Math.floor(noise[y][x] * 255);
      
      data[idx] = n;
      data[idx + 1] = n;
      data[idx + 2] = n;
      data[idx + 3] = 255;
    }
  }
  
  ctx.putImageData(imageData, 0, 0);
}
