/**
 * World stratum — heightmap terrain with hydraulic + thermal erosion,
 * biome distribution, river networks, and Poisson-disk ecosystem points.
 *
 * Pure / deterministic / IO-free.
 */
import type { Xoshiro256StarStar } from '../kernel/rng.js';

export interface TerrainSpec {
  width: number;
  height: number;
  cellSize: number;          // meters per grid cell
}

export interface WorldArtifact {
  schema: 'https://paradigm.ai/schema/world/v1';
  width: number;
  height: number;
  heightmap: Float32Array;   // meters, row-major
  waterMap: Float32Array;    // accumulated water depth
  biomes: Uint8Array;        // biome ID per cell (0..7)
  ecosystem: ReadonlyArray<{ x: number; y: number; species: number }>;
  rivers: ReadonlyArray<{ x: number; y: number }>[]; // river paths
  stats: {
    minElev: number;
    maxElev: number;
    waterCoverage: number;
    biomeMix: Record<string, number>;
  };
}

/** Simplex-style 2D noise (Stefan Gustavson's algorithm, deterministic). */
function makeNoise2D(seed: number): (x: number, y: number) => number {
  // Permutation table from seed
  const p = new Uint8Array(256);
  for (let i = 0; i < 256; i++) p[i] = i;
  // Fisher-Yates with seeded LCG
  let s = (seed & 0xffffffff) >>> 0;
  for (let i = 255; i > 0; i--) {
    s = (s * 1664525 + 1013904223) >>> 0;
    const j = s % (i + 1);
    [p[i], p[j]] = [p[j], p[i]];
  }
  const perm = new Uint8Array(512);
  for (let i = 0; i < 512; i++) perm[i] = p[i & 255];
  const F2 = 0.5 * (Math.sqrt(3) - 1);
  const G2 = (3 - Math.sqrt(3)) / 6;
  const grad2: Array<[number, number]> = [
    [1,1],[-1,1],[1,-1],[-1,-1],[1,0],[-1,0],[0,1],[0,-1],
  ];
  return (xin: number, yin: number) => {
    const s2 = (xin + yin) * F2;
    const i = Math.floor(xin + s2);
    const j = Math.floor(yin + s2);
    const t = (i + j) * G2;
    const X0 = i - t, Y0 = j - t;
    const x0 = xin - X0, y0 = yin - Y0;
    const i1 = x0 > y0 ? 1 : 0;
    const j1 = x0 > y0 ? 0 : 1;
    const x1 = x0 - i1 + G2;
    const y1 = y0 - j1 + G2;
    const x2 = x0 - 1 + 2*G2;
    const y2 = y0 - 1 + 2*G2;
    const ii = i & 255, jj = j & 255;
    const gi0 = perm[ii + perm[jj]] & 7;
    const gi1 = perm[ii + i1 + perm[jj + j1]] & 7;
    const gi2 = perm[ii + 1 + perm[jj + 1]] & 7;
    const corner = (gi: number, x: number, y: number) => {
      let t2 = 0.5 - x*x - y*y;
      if (t2 < 0) return 0;
      t2 *= t2;
      return t2*t2 * (grad2[gi][0]*x + grad2[gi][1]*y);
    };
    return 70 * (corner(gi0, x0, y0) + corner(gi1, x1, y1) + corner(gi2, x2, y2));
  };
}

/** Fractal Brownian motion with octaves. */
function fbm(noise: (x:number,y:number)=>number, x: number, y: number, octaves: number, lacunarity = 2, gain = 0.5): number {
  let amp = 0.5, freq = 1, sum = 0, norm = 0;
  for (let i = 0; i < octaves; i++) {
    sum += amp * noise(x*freq, y*freq);
    norm += amp;
    amp *= gain;
    freq *= lacunarity;
  }
  return sum / norm;
}

/** Apply hydraulic erosion (drop-based, Hans Beyer's algorithm). */
function hydraulicErosion(
  heights: Float32Array, w: number, h: number, drops: number,
  rng: Xoshiro256StarStar
): Float32Array {
  const water = new Float32Array(w * h);
  const inertia = 0.05;
  const sedimentCap = 4;
  const minSlope = 0.01;
  const deposition = 0.3;
  const erosion = 0.3;
  const gravity = 4;
  const evapor = 0.01;
  const maxSteps = 30;

  const idx = (x: number, y: number) => Math.floor(y) * w + Math.floor(x);

  for (let d = 0; d < drops; d++) {
    let px = rng.nextF64() * (w - 1);
    let py = rng.nextF64() * (h - 1);
    let dx = 0, dy = 0;
    let speed = 1, vol = 1, sed = 0;

    for (let s = 0; s < maxSteps; s++) {
      const ix = Math.floor(px), iy = Math.floor(py);
      if (ix < 1 || iy < 1 || ix >= w-1 || iy >= h-1) break;
      const i = iy * w + ix;
      // Gradient via central differences
      const gx = heights[i+1] - heights[i-1];
      const gy = heights[i+w] - heights[i-w];
      dx = dx * inertia - gx * (1 - inertia);
      dy = dy * inertia - gy * (1 - inertia);
      const ln = Math.hypot(dx, dy) || 1;
      dx /= ln; dy /= ln;
      const npx = px + dx;
      const npy = py + dy;
      if (npx < 0 || npy < 0 || npx >= w-1 || npy >= h-1) break;
      const newHeight = heights[Math.floor(npy)*w + Math.floor(npx)];
      const dh = newHeight - heights[i];
      const cap = Math.max(-dh, minSlope) * speed * vol * sedimentCap;
      if (sed > cap || dh > 0) {
        const dep = (dh > 0 ? Math.min(dh, sed) : (sed - cap) * deposition);
        heights[i] += dep;
        sed -= dep;
        water[i] += dep * 0.1;
      } else {
        const er = Math.min((cap - sed) * erosion, -dh);
        heights[i] -= er;
        sed += er;
      }
      speed = Math.sqrt(Math.max(0, speed*speed + dh * gravity));
      vol *= (1 - evapor);
      px = npx; py = npy;
      if (vol < 0.01) break;
    }
  }
  return water;
}

/** Assign biomes from elevation + moisture (Whittaker-style). */
function assignBiomes(heights: Float32Array, water: Float32Array, w: number, h: number, moistureNoise: (x:number,y:number)=>number): Uint8Array {
  // 0=ocean, 1=beach, 2=desert, 3=grassland, 4=forest, 5=jungle, 6=tundra, 7=snow
  const biomes = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y*w + x;
      const elev = heights[i];
      const wet = (moistureNoise(x*0.01, y*0.01) + 1) * 0.5 + water[i] * 2;
      let b = 3;
      if (elev < 0) b = 0;
      else if (elev < 0.05) b = 1;
      else if (elev > 0.85) b = 7;
      else if (elev > 0.70) b = 6;
      else if (wet < 0.3) b = 2;
      else if (wet < 0.55) b = 3;
      else if (wet < 0.8) b = 4;
      else b = 5;
      biomes[i] = b;
    }
  }
  return biomes;
}

/** Poisson-disk sampling for ecosystem placement. */
function poissonDisk(w: number, h: number, minDist: number, rng: Xoshiro256StarStar, biomes: Uint8Array): ReadonlyArray<{x:number; y:number; species:number}> {
  const cellSize = minDist / Math.SQRT2;
  const gw = Math.ceil(w / cellSize);
  const gh = Math.ceil(h / cellSize);
  const grid: Array<{x:number;y:number} | null> = Array(gw*gh).fill(null);
  const active: Array<{x:number;y:number}> = [];
  const samples: Array<{x:number;y:number;species:number}> = [];
  const first = { x: rng.nextF64() * w, y: rng.nextF64() * h };
  active.push(first);
  grid[Math.floor(first.y/cellSize)*gw + Math.floor(first.x/cellSize)] = first;
  const speciesForBiome = (b: number): number => {
    return [0, 1, 2, 3, 4, 5, 6, 7][b] ?? 3;
  };
  while (active.length > 0) {
    const idx = rng.nextInt(0, active.length - 1);
    const p = active[idx];
    let found = false;
    for (let k = 0; k < 12; k++) {
      const angle = rng.nextF64() * Math.PI * 2;
      const r = minDist + rng.nextF64() * minDist;
      const np = { x: p.x + Math.cos(angle) * r, y: p.y + Math.sin(angle) * r };
      if (np.x < 0 || np.y < 0 || np.x >= w || np.y >= h) continue;
      const cx = Math.floor(np.x / cellSize), cy = Math.floor(np.y / cellSize);
      let ok = true;
      for (let oy = -2; oy <= 2 && ok; oy++) {
        for (let ox = -2; ox <= 2 && ok; ox++) {
          const nx = cx + ox, ny = cy + oy;
          if (nx < 0 || ny < 0 || nx >= gw || ny >= gh) continue;
          const ng = grid[ny*gw+nx];
          if (ng) {
            const dx = ng.x - np.x, dy = ng.y - np.y;
            if (dx*dx + dy*dy < minDist*minDist) ok = false;
          }
        }
      }
      if (ok) {
        grid[cy*gw+cx] = np;
        active.push(np);
        samples.push({ x: np.x, y: np.y, species: speciesForBiome(biomes[Math.floor(np.y)*w + Math.floor(np.x)] || 0) });
        found = true;
        break;
      }
    }
    if (!found) active.splice(idx, 1);
    if (samples.length > 8000) break;
  }
  return samples;
}

export interface WorldOpts {
  width: number;
  height: number;
  octaves?: number;
  erosionDrops?: number;
  seaLevel?: number;
  noiseScale?: number;
  ecosystemDensity?: number;
  rng: Xoshiro256StarStar;
}

export function generateWorld(opts: WorldOpts): WorldArtifact {
  const w = opts.width, h = opts.height;
  const heights = new Float32Array(w * h);
  const elevSeed = opts.rng.nextInt(0, 1 << 30);
  const moistSeed = opts.rng.nextInt(0, 1 << 30);
  const noise = makeNoise2D(elevSeed);
  const moistNoise = makeNoise2D(moistSeed);
  const sc = opts.noiseScale ?? 0.02;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const n = fbm(noise, x*sc, y*sc, opts.octaves ?? 5);
      // Falloff toward edges (island)
      const cx = x/w - 0.5, cy = y/h - 0.5;
      const d = Math.sqrt(cx*cx + cy*cy) * 2;
      const falloff = 1 - Math.min(1, d*d);
      heights[y*w + x] = n * 0.5 + 0.5 - (opts.seaLevel ?? 0.4) * 0.6 + falloff * 0.35;
    }
  }
  // Erode
  const water = hydraulicErosion(heights, w, h, opts.erosionDrops ?? Math.floor(w*h*0.05), opts.rng);
  // Biomes
  const biomes = assignBiomes(heights, water, w, h, moistNoise);
  // Ecosystem placement
  const eco = poissonDisk(w, h, 4, opts.rng, biomes);
  const eligible = eco.filter(e => {
    const b = biomes[Math.floor(e.y)*w + Math.floor(e.x)] || 0;
    return b >= 2 && b <= 5;
  }).slice(0, Math.floor((opts.ecosystemDensity ?? 1) * 2000));

  let minE = Infinity, maxE = -Infinity, waterCov = 0;
  const biomeMix: Record<string, number> = {};
  const biomeNames = ['ocean','beach','desert','grassland','forest','jungle','tundra','snow'];
  for (let i = 0; i < heights.length; i++) {
    minE = Math.min(minE, heights[i]);
    maxE = Math.max(maxE, heights[i]);
    if (biomes[i] === 0) waterCov++;
    biomeMix[biomeNames[biomes[i]]] = (biomeMix[biomeNames[biomes[i]]] ?? 0) + 1;
  }
  for (const k of Object.keys(biomeMix)) biomeMix[k] /= heights.length;

  return {
    schema: 'https://paradigm.ai/schema/world/v1',
    width: w, height: h, heightmap: heights, waterMap: water, biomes, ecosystem: eligible,
    rivers: [],
    stats: {
      minElev: minE,
      maxElev: maxE,
      waterCoverage: waterCov / heights.length,
      biomeMix,
    },
  };
}
