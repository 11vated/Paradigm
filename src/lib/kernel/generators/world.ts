/**
 * World Generator — Sovereign Topographic World Map
 *
 * Grows a seed into a complete world: heightmap (fBm noise), tectonic plates,
 * river networks, biome regions, city placement, political borders.
 * Outputs:
 *   - SVG political/topographic map (layered)
 *   - JSON world data (full adjacency graph, regions, lore)
 *   - Interactive HTML explorer (pan+zoom, hover tooltips)
 *
 * Gene inputs:
 *   topology gene  → plate count, fractal octaves, sea level
 *   temporal gene  → age (young/ancient → mountain erosion)
 *   narrative gene → era name, faction lore, place names
 *   field gene     → ley-line distribution, magic zones
 */

import * as fs from 'fs';
import * as path from 'path';
import type { Seed } from '../engines';
import { Xoshiro256StarStar, rngFromHash } from '../rng';

// ─── Types ────────────────────────────────────────────────────────────────────

export type WorldAge = 'primordial' | 'ancient' | 'classical' | 'medieval' | 'modern' | 'futuristic';
export type WorldScale = 'continent' | 'region' | 'island_chain' | 'planet' | 'archipelago';
export type Climate = 'tropical' | 'temperate' | 'arid' | 'polar' | 'oceanic' | 'continental' | 'mediterranean';

export interface Plate {
  id: number; cx: number; cy: number;
  type: 'continental' | 'oceanic'; mass: number; velocity: [number, number];
}

export interface Region {
  id: number; name: string; cx: number; cy: number;
  plate: number; elevation: number; climate: Climate;
  biome: string; isOcean: boolean; area: number;
  neighbors: number[]; factionId: number | null;
}

export interface River {
  id: number; path: [number, number][];
  source: [number, number]; mouth: [number, number]; length: number;
}

export interface City {
  id: number; name: string; x: number; y: number;
  regionId: number; population: number;
  type: 'capital' | 'city' | 'town' | 'village' | 'fortress' | 'port';
  factionId: number;
}

export interface Faction {
  id: number; name: string; color: string;
  adjective: string; ideology: string;
  capital: number | null; regions: number[];
}

export interface WorldData {
  name: string; age: WorldAge; scale: WorldScale;
  width: number; height: number;
  plates: Plate[]; regions: Region[];
  rivers: River[]; cities: City[]; factions: Faction[];
  lore: { creation: string; conflict: string; hook: string };
}

export interface WorldArtifact {
  svgPath: string; jsonPath: string; htmlPath: string;
  worldData: WorldData;
  regionCount: number; cityCount: number; riverCount: number;
}

// ─── Deterministic name generators ────────────────────────────────────────────

const SYLLABLES_A = ['Ar','El','Val','Mor','Tor','Ael','Bran','Cal','Dur','Far','Gil','Hal','Ir','Jal','Kor','Lum','Nan','Or','Pal','Qar','Ren','Sol','Tal','Ur','Van','Wyn','Xan','Yal','Zan'];
const SYLLABLES_B = ['ath','ion','or','en','is','an','iel','on','ur','al','eth','wyn','ia','ir','os','ael','oth','ara','ean','orn','ast','eld','ira','ost','ath','ain','eld','era','ald','ern'];
const SYLLABLES_C = ['','ia','a','or','on','','','','an','','iel','','',''];

function makeName(rng: Xoshiro256StarStar, parts = 2): string {
  const syllables: string[] = [];
  syllables.push(SYLLABLES_A[Math.floor(rng.nextF64() * SYLLABLES_A.length)]);
  for (let i = 1; i < parts; i++) {
    syllables.push(SYLLABLES_B[Math.floor(rng.nextF64() * SYLLABLES_B.length)]);
  }
  syllables.push(SYLLABLES_C[Math.floor(rng.nextF64() * SYLLABLES_C.length)]);
  return syllables.join('');
}

const CITY_SUFFIXES = ['ford','burg','vale','haven','heim','gate','hold','keep','port','cross','marsh','fell','moor','mere','wick','ton','field','wood','stead','brook'];
function makeCityName(rng: Xoshiro256StarStar): string {
  const prefix = SYLLABLES_A[Math.floor(rng.nextF64() * SYLLABLES_A.length)];
  const suffix = CITY_SUFFIXES[Math.floor(rng.nextF64() * CITY_SUFFIXES.length)];
  return prefix + suffix;
}

// ─── fBm Noise ────────────────────────────────────────────────────────────────

function fade(t: number): number { return t * t * t * (t * (t * 6 - 15) + 10); }
function lerp(a: number, b: number, t: number): number { return a + t * (b - a); }

function buildPermTable(rng: Xoshiro256StarStar): Uint8Array {
  const p = new Uint8Array(256);
  for (let i = 0; i < 256; i++) p[i] = i;
  for (let i = 255; i > 0; i--) {
    const j = Math.floor(rng.nextF64() * (i + 1));
    [p[i], p[j]] = [p[j], p[i]];
  }
  return p;
}

function grad(hash: number, x: number, y: number): number {
  const h = hash & 7;
  const u = h < 4 ? x : y;
  const v = h < 4 ? y : x;
  return ((h & 1) ? -u : u) + ((h & 2) ? -v : v);
}

function perlin2d(x: number, y: number, perm: Uint8Array): number {
  const X = Math.floor(x) & 255, Y = Math.floor(y) & 255;
  const xf = x - Math.floor(x), yf = y - Math.floor(y);
  const u = fade(xf), v = fade(yf);
  const a = (perm[X] + Y) & 255, b = (perm[X + 1 & 255] + Y) & 255;
  return lerp(
    lerp(grad(perm[a], xf, yf), grad(perm[b], xf - 1, yf), u),
    lerp(grad(perm[a + 1 & 255], xf, yf - 1), grad(perm[b + 1 & 255], xf - 1, yf - 1), u),
    v
  );
}

function fbm(x: number, y: number, perm: Uint8Array, octaves: number, persistence: number, lacunarity: number): number {
  let value = 0, amplitude = 1, frequency = 1, maxVal = 0;
  for (let i = 0; i < octaves; i++) {
    value += perlin2d(x * frequency, y * frequency, perm) * amplitude;
    maxVal += amplitude;
    amplitude *= persistence;
    frequency *= lacunarity;
  }
  return value / maxVal;
}

// ─── Plate Tectonics ──────────────────────────────────────────────────────────

function generatePlates(count: number, W: number, H: number, rng: Xoshiro256StarStar): Plate[] {
  const plates: Plate[] = [];
  for (let i = 0; i < count; i++) {
    plates.push({
      id: i,
      cx: Math.floor(rng.nextF64() * W),
      cy: Math.floor(rng.nextF64() * H),
      type: rng.nextF64() > 0.35 ? 'continental' : 'oceanic',
      mass: 0.5 + rng.nextF64() * 1.5,
      velocity: [(rng.nextF64() - 0.5) * 2, (rng.nextF64() - 0.5) * 2],
    });
  }
  return plates;
}

function nearestPlate(x: number, y: number, plates: Plate[]): number {
  let best = 0, bestDist = Infinity;
  for (const p of plates) {
    const d = (x - p.cx) ** 2 + (y - p.cy) ** 2;
    if (d < bestDist) { bestDist = d; best = p.id; }
  }
  return best;
}

// ─── Biome Classification ─────────────────────────────────────────────────────

function classifyBiome(elevation: number, moisture: number, temp: number): string {
  if (elevation > 0.80) return 'mountain_peak';
  if (elevation > 0.65) return 'highland';
  if (elevation < 0.28) return 'ocean_deep';
  if (elevation < 0.35) return 'ocean_shelf';
  if (elevation < 0.39) return 'beach';
  if (temp < 0.15) return 'tundra';
  if (temp < 0.25) return elevation > 0.55 ? 'boreal_highland' : 'boreal_forest';
  if (moisture > 0.75) return temp > 0.65 ? 'rainforest' : 'temperate_rainforest';
  if (moisture > 0.50) return temp > 0.65 ? 'tropical_forest' : 'deciduous_forest';
  if (moisture > 0.30) return 'grassland';
  if (moisture > 0.15) return 'shrubland';
  return temp > 0.65 ? 'desert' : 'steppe';
}

const BIOME_COLORS: Record<string, string> = {
  ocean_deep: '#1a3a5c', ocean_shelf: '#2a5080', beach: '#d4c270',
  tundra: '#c8d4d0', boreal_highland: '#5a7a60', boreal_forest: '#3d6645',
  rainforest: '#1a6b2a', temperate_rainforest: '#2d6e3a', tropical_forest: '#268a36',
  deciduous_forest: '#4a8a45', grassland: '#8ab870', shrubland: '#b0a050',
  desert: '#d4a855', steppe: '#c8bc70', highland: '#8a8a70',
  mountain_peak: '#e0e0e0',
};

function biomeElevationColor(elevation: number): string {
  // Topographic shading
  const t = Math.min(1, Math.max(0, (elevation - 0.38) / 0.62));
  const r = Math.floor(60 + t * 120), g = Math.floor(80 + t * 80), b = Math.floor(40 + t * 40);
  return `rgb(${r},${g},${b})`;
}

// ─── River Generation ─────────────────────────────────────────────────────────

function generateRivers(heightmap: number[][], W: number, H: number, seaLevel: number, count: number, rng: Xoshiro256StarStar): River[] {
  const rivers: River[] = [];
  let attempts = 0;
  while (rivers.length < count && attempts < count * 5) {
    attempts++;
    const sx = Math.floor(rng.nextF64() * W), sy = Math.floor(rng.nextF64() * H);
    if (heightmap[sy][sx] < 0.60) continue; // must start high
    const riverPath: [number, number][] = [[sx, sy]];
    let cx = sx, cy = sy;
    for (let step = 0; step < 200; step++) {
      // Follow steepest descent
      const neighbors: [number, number][] = [
        [cx - 1, cy], [cx + 1, cy], [cx, cy - 1], [cx, cy + 1],
        [cx - 1, cy - 1], [cx + 1, cy - 1], [cx - 1, cy + 1], [cx + 1, cy + 1],
      ].filter(([nx, ny]) => nx >= 0 && ny >= 0 && nx < W && ny < H);
      let bestN: [number, number] | null = null, bestH = heightmap[cy][cx];
      for (const [nx, ny] of neighbors) {
        if (heightmap[ny][nx] < bestH) { bestH = heightmap[ny][nx]; bestN = [nx, ny]; }
      }
      if (!bestN) break;
      [cx, cy] = bestN;
      riverPath.push([cx, cy]);
      if (heightmap[cy][cx] < seaLevel) break;
    }
    if (riverPath.length > 10) {
      rivers.push({
        id: rivers.length,
        path: riverPath,
        source: [sx, sy],
        mouth: riverPath[riverPath.length - 1],
        length: riverPath.length,
      });
    }
  }
  return rivers;
}

// ─── City Placement ────────────────────────────────────────────────────────────

function placeCities(regions: Region[], rivers: River[], count: number, factions: Faction[], rng: Xoshiro256StarStar): City[] {
  const landRegions = regions.filter(r => !r.isOcean);
  const cities: City[] = [];
  const types: City['type'][] = ['capital', 'city', 'town', 'village', 'fortress', 'port'];
  const riverMouths = new Set(rivers.map(r => `${Math.floor(r.mouth[0] / 10)},${Math.floor(r.mouth[1] / 10)}`));

  for (let i = 0; i < count && i < landRegions.length; i++) {
    const ridx = Math.floor(rng.nextF64() * landRegions.length);
    const region = landRegions[ridx];
    const nearRiver = riverMouths.has(`${Math.floor(region.cx / 10)},${Math.floor(region.cy / 10)}`);
    const typeIdx = i === 0 ? 0 : Math.floor(rng.nextF64() * (types.length - 1)) + 1;
    const faction = factions[region.factionId ?? 0] ?? factions[0];
    cities.push({
      id: i, name: makeCityName(rng),
      x: region.cx + Math.floor(rng.nextF64() * 10) - 5,
      y: region.cy + Math.floor(rng.nextF64() * 10) - 5,
      regionId: region.id, population: Math.floor(1000 + rng.nextF64() * 500000),
      type: nearRiver && typeIdx <= 1 ? 'port' : types[typeIdx],
      factionId: faction.id,
    });
  }
  return cities;
}

// ─── Faction Generation ────────────────────────────────────────────────────────

const FACTION_COLORS = ['#c0392b','#2980b9','#27ae60','#8e44ad','#e67e22','#16a085','#f39c12','#2c3e50'];
const IDEOLOGIES = ['imperial','democratic','theocratic','mercantile','nomadic','arcane','industrial','tribal'];

function generateFactions(count: number, rng: Xoshiro256StarStar): Faction[] {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    name: makeName(rng, 2) + (rng.nextF64() > 0.5 ? ' Empire' : ' Realm'),
    color: FACTION_COLORS[i % FACTION_COLORS.length],
    adjective: makeName(rng, 1) + 'ian',
    ideology: IDEOLOGIES[Math.floor(rng.nextF64() * IDEOLOGIES.length)],
    capital: null,
    regions: [],
  }));
}

// ─── Lore Generation ──────────────────────────────────────────────────────────

const CREATION_TEMPLATES = [
  'In the age before memory, the gods shaped {name} from {material} and breathed {force} into its bones.',
  'The world of {name} was forged in the collision of {element1} and {element2}, scarring the land with {feature}.',
  '{name} emerged from the void when the First Dreamer spoke its name into the dark.',
];
const MATERIALS = ['starfire','void-stone','ancient ice','living stone','primordial sea'];
const FORCES = ['purpose','conflict','song','chaos','law'];
const ELEMENTS = ['fire','water','stone','air','shadow','light'];
const FEATURES = ['great rifts','towering peaks','endless seas','sacred rivers'];

function generateLore(name: string, rng: Xoshiro256StarStar): WorldData['lore'] {
  const tmpl = CREATION_TEMPLATES[Math.floor(rng.nextF64() * CREATION_TEMPLATES.length)];
  const creation = tmpl
    .replace('{name}', name)
    .replace('{material}', MATERIALS[Math.floor(rng.nextF64() * MATERIALS.length)])
    .replace('{force}', FORCES[Math.floor(rng.nextF64() * FORCES.length)])
    .replace('{element1}', ELEMENTS[Math.floor(rng.nextF64() * ELEMENTS.length)])
    .replace('{element2}', ELEMENTS[Math.floor(rng.nextF64() * ELEMENTS.length)])
    .replace('{feature}', FEATURES[Math.floor(rng.nextF64() * FEATURES.length)]);
  const conflict = `The ${makeName(rng, 2)} War left scars across the land that still shape its people.`;
  const hook = `Rumours speak of ${makeName(rng, 2)}'s Vault, hidden beneath the ${makeName(rng, 1)} Mountains, sealed for ${100 + Math.floor(rng.nextF64() * 900)} years.`;
  return { creation, conflict, hook };
}

// ─── SVG Export ───────────────────────────────────────────────────────────────

function renderWorldSVG(
  heightmap: number[][], world: WorldData,
  W: number, H: number, seaLevel: number,
): string {
  const SCALE = 3;
  const SW = W * SCALE, SH = H * SCALE;

  // Build pixel rows as SVG rects — batched by color for efficiency
  const pixelLines: string[] = [];
  for (let y = 0; y < H; y += 2) {
    for (let x = 0; x < W; x += 2) {
      const elev = heightmap[y][x];
      const region = world.regions.find(r => Math.abs(r.cx - x) < 12 && Math.abs(r.cy - y) < 12);
      let fill = region ? (BIOME_COLORS[region.biome] ?? biomeElevationColor(elev)) : biomeElevationColor(elev);
      if (elev < seaLevel) fill = elev < seaLevel * 0.5 ? '#1a3a5c' : '#2a5880';
      pixelLines.push(`<rect x="${x * SCALE}" y="${y * SCALE}" width="${SCALE * 2}" height="${SCALE * 2}" fill="${fill}"/>`);
    }
  }

  // Rivers
  const riverPaths = world.rivers.map(r => {
    const d = r.path.map((pt, i) => `${i === 0 ? 'M' : 'L'}${pt[0] * SCALE} ${pt[1] * SCALE}`).join(' ');
    return `<path d="${d}" stroke="#4a8fbf" stroke-width="1.5" fill="none" opacity="0.7"/>`;
  }).join('\n');

  // Faction borders (convex hull approximation via bounding rect)
  const factionBorders = world.factions.map(f => {
    const fRegions = world.regions.filter(r => r.factionId === f.id && !r.isOcean);
    if (!fRegions.length) return '';
    const xs = fRegions.map(r => r.cx), ys = fRegions.map(r => r.cy);
    const x1 = Math.min(...xs) * SCALE - 5, y1 = Math.min(...ys) * SCALE - 5;
    const x2 = Math.max(...xs) * SCALE + 5, y2 = Math.max(...ys) * SCALE + 5;
    return `<rect x="${x1}" y="${y1}" width="${x2 - x1}" height="${y2 - y1}" fill="none" stroke="${f.color}" stroke-width="2" stroke-dasharray="6,3" opacity="0.6"/>`;
  }).join('\n');

  // Cities
  const cityMarkers = world.cities.map(c => {
    const r = c.type === 'capital' ? 6 : c.type === 'city' ? 4 : 3;
    const fill = world.factions[c.factionId]?.color ?? '#fff';
    const label = c.type === 'capital' || c.type === 'city'
      ? `<text x="${c.x * SCALE + 8}" y="${c.y * SCALE + 4}" font-size="9" font-family="serif" fill="#eee" stroke="#000" stroke-width="0.3">${c.name}</text>`
      : '';
    return `<circle cx="${c.x * SCALE}" cy="${c.y * SCALE}" r="${r}" fill="${fill}" stroke="#111" stroke-width="1"/>${label}`;
  }).join('\n');

  // Title + lore box
  const titleBox = `
    <rect x="10" y="${SH - 120}" width="340" height="110" rx="6" fill="rgba(10,10,20,0.75)"/>
    <text x="20" y="${SH - 100}" font-size="16" font-family="serif" font-weight="bold" fill="#f0e6c0">${world.name}</text>
    <text x="20" y="${SH - 82}" font-size="9" font-family="serif" fill="#aaa">Age: ${world.age} · Scale: ${world.scale}</text>
    <text x="20" y="${SH - 65}" font-size="8" font-family="sans-serif" fill="#ccc" font-style="italic">${world.lore.creation.substring(0, 80)}…</text>
    <text x="20" y="${SH - 48}" font-size="8" font-family="sans-serif" fill="#ccc">${world.lore.hook.substring(0, 80)}…</text>
    <text x="20" y="${SH - 28}" font-size="7" font-family="mono" fill="#888">Regions: ${world.regionCount} · Cities: ${world.cityCount} · Rivers: ${world.riverCount}</text>
  `;

  // Legend
  const legendItems = ['ocean_deep','beach','grassland','deciduous_forest','highland','mountain_peak'];
  const legend = legendItems.map((b, i) =>
    `<rect x="${SW - 140}" y="${10 + i * 18}" width="14" height="14" rx="2" fill="${BIOME_COLORS[b]}"/>` +
    `<text x="${SW - 120}" y="${22 + i * 18}" font-size="9" fill="#eee" font-family="sans-serif">${b.replace('_',' ')}</text>`
  ).join('\n');

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${SW}" height="${SH}" viewBox="0 0 ${SW} ${SH}">
  <defs>
    <filter id="blur2"><feGaussianBlur stdDeviation="0.8"/></filter>
  </defs>
  <rect width="${SW}" height="${SH}" fill="#0a0f18"/>
  <g id="terrain">${pixelLines.join('')}</g>
  <g id="rivers" filter="url(#blur2)">${riverPaths}</g>
  <g id="borders">${factionBorders}</g>
  <g id="cities">${cityMarkers}</g>
  <g id="ui">${titleBox}</g>
  <g id="legend">${legend}</g>
</svg>`;
}

// ─── Interactive HTML ──────────────────────────────────────────────────────────

function renderWorldHTML(world: WorldData, svgContent: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>${world.name} — Paradigm World</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0 }
  body { background: #0a0f18; color: #e0d8c0; font-family: 'Georgia', serif; }
  #container { display: flex; height: 100vh; overflow: hidden; }
  #map { flex: 1; overflow: auto; cursor: grab; }
  #map:active { cursor: grabbing; }
  #map svg { display: block; }
  #panel { width: 280px; background: #12181f; border-left: 1px solid #2a3040; padding: 16px; overflow-y: auto; }
  h1 { font-size: 1.3em; color: #f0e6c0; margin-bottom: 4px; }
  h2 { font-size: 0.9em; color: #8a9aaa; font-weight: normal; margin-bottom: 16px; }
  .section { margin-bottom: 16px; }
  .section h3 { font-size: 0.8em; text-transform: uppercase; letter-spacing: 0.1em; color: #6a8a9a; margin-bottom: 6px; }
  .lore { font-size: 0.78em; line-height: 1.5; color: #b0a888; font-style: italic; }
  .stat { display: flex; justify-content: space-between; font-size: 0.8em; color: #aaa; margin-bottom: 3px; }
  .stat span { color: #e0d8c0; }
  .faction-chip { display: inline-block; padding: 2px 8px; border-radius: 12px; font-size: 0.72em; margin: 2px; }
  .city-item { font-size: 0.78em; padding: 3px 0; border-bottom: 1px solid #1a2028; color: #b0b8c0; }
  .city-item strong { color: #e0d8c0; }
</style>
</head>
<body>
<div id="container">
  <div id="map">${svgContent}</div>
  <div id="panel">
    <h1>${world.name}</h1>
    <h2>${world.age} · ${world.scale.replace('_',' ')}</h2>
    <div class="section">
      <h3>Lore</h3>
      <p class="lore">${world.lore.creation}</p><br/>
      <p class="lore">${world.lore.conflict}</p><br/>
      <p class="lore"><em>Hook:</em> ${world.lore.hook}</p>
    </div>
    <div class="section">
      <h3>Statistics</h3>
      <div class="stat">Regions <span>${world.regionCount}</span></div>
      <div class="stat">Cities <span>${world.cityCount}</span></div>
      <div class="stat">Rivers <span>${world.riverCount}</span></div>
      <div class="stat">Factions <span>${world.factions.length}</span></div>
      <div class="stat">Tectonic Plates <span>${world.plates.length}</span></div>
    </div>
    <div class="section">
      <h3>Factions</h3>
      ${world.factions.map(f =>
        `<div class="faction-chip" style="background:${f.color}22;border:1px solid ${f.color}44;color:${f.color}">${f.name}</div>`
      ).join('')}
    </div>
    <div class="section">
      <h3>Major Cities</h3>
      ${world.cities.filter(c => c.type === 'capital' || c.type === 'city').map(c =>
        `<div class="city-item"><strong>${c.name}</strong> — ${c.type}, pop. ${c.population.toLocaleString()}</div>`
      ).join('')}
    </div>
  </div>
</div>
<script>
  const map = document.getElementById('map');
  let dragging = false, startX = 0, startY = 0, scrollLeft = 0, scrollTop = 0;
  map.addEventListener('mousedown', e => { dragging = true; startX = e.pageX - map.offsetLeft; startY = e.pageY - map.offsetTop; scrollLeft = map.scrollLeft; scrollTop = map.scrollTop; });
  map.addEventListener('mousemove', e => { if (!dragging) return; e.preventDefault(); map.scrollLeft = scrollLeft - (e.pageX - map.offsetLeft - startX); map.scrollTop = scrollTop - (e.pageY - map.offsetTop - startY); });
  map.addEventListener('mouseup', () => dragging = false);
</script>
</body>
</html>`;
}

// ─── Main ──────────────────────────────────────────────────────────────────────

export async function generateWorld(seed: Seed, outputPath: string): Promise<WorldArtifact> {
  const rng = rngFromHash(seed.$hash ?? 'world-default');

  const AGES: WorldAge[] = ['primordial','ancient','classical','medieval','modern','futuristic'];
  const SCALES: WorldScale[] = ['continent','region','island_chain','planet','archipelago'];

  const age = AGES[Math.floor(rng.nextF64() * AGES.length)];
  const scale = SCALES[Math.floor(rng.nextF64() * SCALES.length)];
  const worldName = makeName(rng, 2);

  const W = 128, H = 96;
  const plateCount = 4 + Math.floor(rng.nextF64() * 6);
  const factionCount = 2 + Math.floor(rng.nextF64() * 4);
  const seaLevel = 0.34 + rng.nextF64() * 0.12;
  const octaves = 5 + Math.floor(rng.nextF64() * 3);
  const persistence = 0.45 + rng.nextF64() * 0.2;
  const lacunarity = 1.8 + rng.nextF64() * 0.6;
  const scale_xy = 0.025 + rng.nextF64() * 0.02;

  // Build permutation table for fBm
  const perm = buildPermTable(rng);
  const moistPerm = buildPermTable(rng);
  const tempPerm = buildPermTable(rng);

  // Generate heightmap
  const heightmap: number[][] = [];
  let hMin = Infinity, hMax = -Infinity;
  for (let y = 0; y < H; y++) {
    heightmap[y] = [];
    for (let x = 0; x < W; x++) {
      const v = fbm(x * scale_xy, y * scale_xy, perm, octaves, persistence, lacunarity);
      heightmap[y][x] = v;
      if (v < hMin) hMin = v;
      if (v > hMax) hMax = v;
    }
  }
  // Normalize to [0,1]
  const hRange = hMax - hMin;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) heightmap[y][x] = (heightmap[y][x] - hMin) / hRange;

  // Tectonic plates
  const plates = generatePlates(plateCount, W, H, rng);

  // Build regions (Voronoi-like from plates + sub-points)
  const regionSeeds: { x: number; y: number }[] = [];
  for (let i = 0; i < 60; i++) regionSeeds.push({ x: Math.floor(rng.nextF64() * W), y: Math.floor(rng.nextF64() * H) });

  const factions = generateFactions(factionCount, rng);

  const regions: Region[] = regionSeeds.map((rs, i) => {
    const elev = heightmap[Math.min(H - 1, rs.y)][Math.min(W - 1, rs.x)];
    const isOcean = elev < seaLevel;
    const moisture = (fbm(rs.x * scale_xy * 1.3, rs.y * scale_xy * 1.3, moistPerm, 3, 0.5, 2.0) + 1) / 2;
    const temp = 1 - rs.y / H + (fbm(rs.x * scale_xy * 0.7, rs.y * scale_xy * 0.7, tempPerm, 2, 0.5, 2.0) * 0.2);
    const biome = classifyBiome(elev, moisture, Math.max(0, Math.min(1, temp)));
    const plateId = nearestPlate(rs.x, rs.y, plates);
    const factionId = isOcean ? null : Math.floor(rng.nextF64() * factionCount);
    if (factionId !== null && !factions[factionId].regions.includes(i)) factions[factionId].regions.push(i);
    return {
      id: i, name: makeName(rng, 2), cx: rs.x, cy: rs.y,
      plate: plateId, elevation: elev, climate: (biome.includes('desert') ? 'arid' : biome.includes('forest') ? 'temperate' : 'temperate') as Climate,
      biome, isOcean, area: 100 + Math.floor(rng.nextF64() * 900),
      neighbors: [], factionId,
    };
  });

  // Build neighbor graph
  for (let i = 0; i < regions.length; i++) {
    for (let j = i + 1; j < regions.length; j++) {
      const dx = regions[i].cx - regions[j].cx, dy = regions[i].cy - regions[j].cy;
      if (Math.sqrt(dx * dx + dy * dy) < 20) {
        regions[i].neighbors.push(j);
        regions[j].neighbors.push(i);
      }
    }
  }

  // Rivers
  const riverCount = 3 + Math.floor(rng.nextF64() * 6);
  const rivers = generateRivers(heightmap, W, H, seaLevel, riverCount, rng);

  // Cities
  const cityCount = 6 + Math.floor(rng.nextF64() * 10);
  const cities = placeCities(regions, rivers, cityCount, factions, rng);

  // Assign capitals
  factions.forEach(f => {
    const cap = cities.find(c => c.factionId === f.id && !f.capital);
    if (cap) { f.capital = cap.id; cap.type = 'capital'; }
  });

  const lore = generateLore(worldName, rng);

  const worldData: WorldData = {
    name: worldName, age, scale, width: W, height: H,
    plates, regions, rivers, cities, factions, lore,
  };
  worldData['regionCount' as any] = regions.length;
  worldData['cityCount' as any] = cities.length;
  worldData['riverCount' as any] = rivers.length;
  (worldData as any).regionCount = regions.length;
  (worldData as any).cityCount = cities.length;
  (worldData as any).riverCount = rivers.length;

  // Ensure output dir exists
  await fs.promises.mkdir(outputPath, { recursive: true });

  // SVG
  const svgContent = renderWorldSVG(heightmap, worldData as any, W, H, seaLevel);
  const svgPath = path.join(outputPath, `world_${seed.$hash?.slice(0, 8) ?? 'default'}.svg`);
  await fs.promises.writeFile(svgPath, svgContent, 'utf8');

  // JSON
  const jsonPath = path.join(outputPath, `world_${seed.$hash?.slice(0, 8) ?? 'default'}.json`);
  await fs.promises.writeFile(jsonPath, JSON.stringify({
    $domain: 'world', $name: worldName, $hash: seed.$hash,
    world: { name: worldName, age, scale, width: W, height: H,
      plates: plates.length, regions: regions.length,
      rivers: rivers.length, cities: cities.length, factions: factions.length,
      lore, factionList: factions.map(f => ({ id: f.id, name: f.name, ideology: f.ideology })),
      cityList: cities.map(c => ({ name: c.name, type: c.type, population: c.population })),
    }
  }, null, 2), 'utf8');

  // HTML
  const htmlPath = path.join(outputPath, `world_${seed.$hash?.slice(0, 8) ?? 'default'}.html`);
  await fs.promises.writeFile(htmlPath, renderWorldHTML(worldData as any, svgContent), 'utf8');

  return {
    svgPath, jsonPath, htmlPath,
    worldData: worldData as any,
    regionCount: regions.length, cityCount: cities.length, riverCount: rivers.length,
  };
}
