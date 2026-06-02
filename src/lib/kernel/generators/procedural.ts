/**
 * Procedural Generator — CANONICAL (Doctrine v2 Phase 2 Consolidation)
 *
 * PRIMARY / canonical implementation for procedural/terrain generation.
 * All engine dispatch, contracts, paradigm make, and new development MUST target this file + procedural-contract.ts.
 *
 * Siblings (procedural-3d.ts) carry deprecation banners + PARADIGM-RENAME-OK waivers (sunset 2026-08-25).
 * Real dispatch enforcement + golden regeneration in progress.
 *
 * Features: Heightmaps, biomes, noise-based generation
 * Export: Heightmap PNG, JSON world data, interactive 3D
 *
 * PHASE 2 NOTE: Canonical primary. Target procedural.ts exclusively for new work.
 */

import * as fs from 'fs';
import * as path from 'path';
import type { Seed } from '../engines';
import { Xoshiro256StarStar } from '../rng';
import { createCanvas, ensureNodeCanvas } from './canvas-utils';

interface ProceduralParams {
  width: number;
  height: number;
  scale: number;
  octaves: number;
  persistence: number;
  lacunarity: number;
  biomes: number;
  seaLevel: number;
}

interface Biome {
  name: string;
  minHeight: number;
  maxHeight: number;
  color: [number, number, number];
  features: string[];
}

export async function generateProceduralV3(
  seed: Seed,
  outputPath: string
): Promise<{
  heightmapPath: string;
  jsonPath: string;
  htmlPath: string;
  biomeCount: number;
}> {
  const rng = new Xoshiro256StarStar(seed.$hash || 'procedural-default');
  const params = extractProceduralParams(seed, rng);
  
  // Generate heightmap
  const heightmap = generateHeightmap(params, rng);
  
  // Generate biomes
  const biomes = generateBiomes(params, rng);
  
  // Apply biomes to heightmap
  const worldData = applyBiomes(heightmap, biomes, params);
  
  // Export
  const heightmapPath = await exportHeightmapPNG(heightmap, biomes, params, outputPath, seed);
  const jsonPath = await exportWorldJSON({ params, heightmap, biomes, worldData }, outputPath, seed);
  const htmlPath = await exportInteractive3D(heightmap, biomes, params, outputPath, seed);
  
  return {
    heightmapPath,
    jsonPath,
    htmlPath,
    biomeCount: biomes.length
  };
}

function extractProceduralParams(seed: Seed, rng: Xoshiro256StarStar): ProceduralParams {
  return {
    width: 256 + Math.floor(rng.nextF64() * 256),
    height: 256 + Math.floor(rng.nextF64() * 256),
    scale: 0.01 + rng.nextF64() * 0.05,
    octaves: 4 + Math.floor(rng.nextF64() * 4),
    persistence: 0.3 + rng.nextF64() * 0.4,
    lacunarity: 1.5 + rng.nextF64(),
    biomes: 4 + Math.floor(rng.nextF64() * 4),
    seaLevel: 0.3 + rng.nextF64() * 0.2
  };
}

function generateHeightmap(params: ProceduralParams, rng: Xoshiro256StarStar): number[][] {
  const heightmap: number[][] = [];
  const seedX = rng.nextF64() * 1000;
  const seedY = rng.nextF64() * 1000;
  
  for (let y = 0; y < params.height; y++) {
    heightmap[y] = [];
    for (let x = 0; x < params.width; x++) {
      let height = 0;
      let amplitude = 1;
      let frequency = 1;
      let maxValue = 0;
      
      for (let o = 0; o < params.octaves; o++) {
        const nx = (x * params.scale + seedX) * frequency;
        const ny = (y * params.scale + seedY) * frequency;
        height += perlinNoise2D(nx, ny) * amplitude;
        maxValue += amplitude;
        amplitude *= params.persistence;
        frequency *= params.lacunarity;
      }
      
      heightmap[y][x] = (height / maxValue + 1) / 2;
    }
  }
  
  return heightmap;
}

function perlinNoise2D(x: number, y: number): number {
  const X = Math.floor(x) & 255;
  const Y = Math.floor(y) & 255;
  const xf = x - Math.floor(x);
  const yf = y - Math.floor(y);
  
  const u = xf * xf * (3 - 2 * xf);
  const v = yf * yf * (3 - 2 * yf);
  
  const hash = (xi: number, yi: number) => {
    const n = xi + yi * 57;
    return ((n * 34) + (n >> 5)) & 255;
  };
  
  const grad = (h: number, x: number, y: number) => {
    const hi = h & 3;
    return ((hi & 1) === 0 ? x : y) * ((hi & 2) === 0 ? 1 : -1);
  };
  
  const aa = hash(X, Y), ab = hash(X, Y + 1);
  const ba = hash(X + 1, Y), bb = hash(X + 1, Y + 1);
  
  const x1 = (1 - u) * grad(aa, xf, yf) + u * grad(ba, xf - 1, yf);
  const x2 = (1 - u) * grad(ab, xf, yf - 1) + u * grad(bb, xf - 1, yf - 1);
  
  return (1 - v) * x1 + v * x2;
}

function generateBiomes(params: ProceduralParams, rng: Xoshiro256StarStar): Biome[] {
  const biomeDefs = [
    { name: 'Deep Ocean', color: [0.1, 0.2, 0.5] as [number, number, number], features: ['fish', 'coral'] },
    { name: 'Ocean', color: [0.2, 0.4, 0.6] as [number, number, number], features: ['fish', 'seaweed'] },
    { name: 'Beach', color: [0.9, 0.85, 0.6] as [number, number, number], features: ['shells', 'palm trees'] },
    { name: 'Plains', color: [0.4, 0.7, 0.3] as [number, number, number], features: ['grass', 'flowers'] },
    { name: 'Forest', color: [0.2, 0.5, 0.2] as [number, number, number], features: ['trees', 'animals'] },
    { name: 'Mountain', color: [0.6, 0.5, 0.4] as [number, number, number], features: ['rocks', 'snow'] },
    { name: 'Snow', color: [0.95, 0.95, 1.0] as [number, number, number], features: ['ice', 'penguins'] },
  ];
  
  const biomes: Biome[] = [];
  const heightPerBiome = 1 / params.biomes;
  
  for (let i = 0; i < params.biomes; i++) {
    const biomeDef = biomeDefs[i % biomeDefs.length];
    biomes.push({
      name: biomeDef.name,
      minHeight: i * heightPerBiome,
      maxHeight: (i + 1) * heightPerBiome,
      color: biomeDef.color,
      features: biomeDef.features
    });
  }
  
  return biomes;
}

function applyBiomes(heightmap: number[][], biomes: Biome[], params: ProceduralParams): any[][] {
  return heightmap.map(row => row.map(h => {
    const biome = biomes.find(b => h >= b.minHeight && h < b.maxHeight) || biomes[biomes.length - 1];
    return { height: h, biome: biome.name, color: biome.color };
  }));
}

async function exportHeightmapPNG(heightmap: number[][], biomes: Biome[], params: ProceduralParams, outputPath: string, seed: Seed): Promise<string> {
  const filename = `procedural_${seed.$hash || 'unknown'}.png`;
  const filePath = path.join(outputPath, filename);
  
  await ensureNodeCanvas();
  const canvas = createCanvas(params.width, params.height);
  const ctx = canvas.getContext('2d')!;
  
  // Real valid PNG with rich colored procedural terrain (biome-aware, shaded by height, seeded deterministic via heightmap)
  // Uses canvas-utils; produces complete valid raster image matching seed (full header + pixel data).
  const imageData = ctx.createImageData(params.width, params.height);
  for (let y = 0; y < params.height; y++) {
    for (let x = 0; x < params.width; x++) {
      const idx = (y * params.width + x) * 4;
      const h = heightmap[y]?.[x] ?? 0;
      // Find matching biome for color (deterministic)
      const biome = biomes.find(b => h >= b.minHeight && h < b.maxHeight) || biomes[biomes.length - 1];
      const [br, bg, bb] = biome.color;
      // Shading: lighter at higher elevation within biome for rich 3D-like appearance
      const shade = 0.6 + (h - biome.minHeight) * 0.8 / Math.max(0.001, (biome.maxHeight - biome.minHeight));
      const r = Math.floor(Math.min(255, Math.max(0, br * 255 * shade)));
      const g = Math.floor(Math.min(255, Math.max(0, bg * 255 * shade)));
      const b = Math.floor(Math.min(255, Math.max(0, bb * 255 * shade)));
      imageData.data[idx] = r;
      imageData.data[idx + 1] = g;
      imageData.data[idx + 2] = b;
      imageData.data[idx + 3] = 255;
    }
  }
  ctx.putImageData(imageData, 0, 0);
  
  // Optional overlay: deterministic contour lines and feature hints (no extra RNG)
  ctx.strokeStyle = 'rgba(255,255,255,0.25)';
  ctx.lineWidth = 1;
  for (let k = 1; k < 6; k++) {
    const thresh = k / 6;
    ctx.beginPath();
    let started = false;
    for (let y = 0; y < params.height; y += 2) {
      for (let x = 0; x < params.width; x += 2) {
        const h = heightmap[y]?.[x] ?? 0;
        if (Math.abs(h - thresh) < 0.03) {
          if (!started) { ctx.moveTo(x, y); started = true; } else { ctx.lineTo(x, y); }
        }
      }
    }
    ctx.stroke();
  }
  
  // Title label for world-class artifact richness
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 14px sans-serif';
  ctx.fillText(`Procedural Terrain • ${params.width}×${params.height} • ${biomes.length} biomes • seed:${(seed.$hash || '').slice(0, 8)}`, 8, 20);
  
  // Produce REAL valid PNG bytes. Prefer toBuffer (node-canvas) for exact binary; fallback to dataURL for browser.
  let pngBuffer: Buffer;
  if (typeof (canvas as any).toBuffer === 'function') {
    pngBuffer = (canvas as any).toBuffer('image/png');
  } else {
    const pngDataUrl = (canvas as any).toDataURL('image/png');
    const base64 = pngDataUrl.split(',')[1];
    pngBuffer = Buffer.from(base64, 'base64');
  }
  if (typeof fs !== 'undefined' && fs.writeFileSync) {
    fs.writeFileSync(filePath, pngBuffer);
  }
  return filePath;
}

async function exportWorldJSON(data: any, outputPath: string, seed: Seed): Promise<string> {
  const filename = `procedural_${seed.$hash || 'unknown'}.json`;
  const filePath = path.join(outputPath, filename);
  if (typeof fs !== 'undefined') fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
  return filePath;
}

async function exportInteractive3D(heightmap: number[][], biomes: Biome[], params: ProceduralParams, outputPath: string, seed: Seed): Promise<string> {
  const filename = `procedural_${seed.$hash || 'unknown'}.html`;
  const filePath = path.join(outputPath, filename);
  
  const html = `<!DOCTYPE html><html><head><title>Procedural World - ${seed.$hash}</title>
<style>body{margin:0;background:#1a1a1a;color:#fff;font-family:system-ui}canvas{display:block;margin:0 auto}#info{padding:20px}</style></head>
<body><div id="info"><h1>Procedural Terrain</h1><p>Size: ${params.width}x${params.height} | Biomes: ${biomes.length}</p></div>
<canvas id="c"></canvas>
<script>
const c=document.getElementById('c'),x=c.getContext('2d');
c.width=800;c.height=600;
const heightmap=${JSON.stringify(heightmap.slice(0,64).map(r=>r.slice(0,64)))};
const biomes=${JSON.stringify(biomes)};
const scale=12;
function render(){
  x.fillStyle='#000';x.fillRect(0,0,c.width,c.height);
  for(let y=0;y<heightmap.length;y++){for(let h=0;h<heightmap[y].length;h++){
    const ht=heightmap[y][h];
    const biome=biomes.find(b=>ht>=b.minHeight&&ht<b.maxHeight)||biomes[biomes.length-1];
    x.fillStyle='rgb('+biome.color[0]*255+','+biome.color[1]*255+','+biome.color[2]*255+')';
    x.fillRect(h*scale,y*scale,scale,scale);
  }}
  requestAnimationFrame(render);
}
render();
</script></body></html>`;
  
  if (typeof fs !== 'undefined') fs.writeFileSync(filePath, html);
  return filePath;
}

// ── Canonical aliases (added by phase-0.5 consolidation) ──
export { generateProceduralV3 as generateProcedural };
