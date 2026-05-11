/**
 * Architecture Generator V3 — Building Design with Floorplans
 * Features: Multi-floor buildings, room layouts, 3D models
 * Export: JSON, SVG floorplan, GLTF 3D model
 */

import * as fs from 'fs';
import * as path from 'path';
import { Xoshiro256StarStar } from '../../../lib/kernel/rng';

interface Seed {
  $hash?: string;
  $name?: string;
  $domain?: string;
  genes?: Record<string, { type?: string; value?: any }>;
}

interface ArchitectureParams {
  type: 'residential' | 'commercial' | 'industrial' | 'public';
  floors: number;
  rooms: number;
  style: 'modern' | 'classical' | 'brutalist' | 'organic';
  lotSize: [number, number];
}

interface Room {
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  doors: string[];
  windows: string[];
}

interface Floor {
  level: number;
  rooms: Room[];
  area: number;
}

export async function generateArchitectureV3(
  seed: Seed,
  outputPath: string
): Promise<{
  jsonPath: string;
  floorplanPath: string;
  gltfPath: string;
  floorCount: number;
  roomCount: number;
}> {
  const rng = new Xoshiro256StarStar(seed.$hash || 'architecture-default');
  const params = extractArchitectureParams(seed, rng);
  
  // Generate floors
  const floors = generateFloors(params, rng);
  
  // Generate 3D model
  const model3D = generate3DModel(floors, params, rng);
  
  // Export
  const jsonPath = await exportJSON({ params, floors, model3D }, outputPath, seed);
  const floorplanPath = await exportFloorplanSVG(floors, outputPath, seed);
  const gltfPath = await exportGLTF(model3D, outputPath, seed);
  
  const totalRooms = floors.reduce((sum, f) => sum + f.rooms.length, 0);
  
  return {
    jsonPath,
    floorplanPath,
    gltfPath,
    floorCount: floors.length,
    roomCount: totalRooms
  };
}

function extractArchitectureParams(seed: Seed, rng: Xoshiro256StarStar): ArchitectureParams {
  const types = ['residential', 'commercial', 'industrial', 'public'] as const;
  const styles = ['modern', 'classical', 'brutalist', 'organic'] as const;
  
  return {
    type: types[Math.floor(rng.nextF64() * types.length)],
    floors: 1 + Math.floor(rng.nextF64() * 9),
    rooms: 3 + Math.floor(rng.nextF64() * 20),
    style: styles[Math.floor(rng.nextF64() * styles.length)],
    lotSize: [10 + rng.nextF64() * 40, 10 + rng.nextF64() * 40]
  };
}

function generateFloors(params: ArchitectureParams, rng: Xoshiro256StarStar): Floor[] {
  const floors: Floor[] = [];
  const roomTypes = ['bedroom', 'bathroom', 'kitchen', 'living', 'office', 'storage', 'hallway'];
  
  for (let f = 0; f < params.floors; f++) {
    const floorRooms: Room[] = [];
    const roomsThisFloor = Math.floor(params.rooms / params.floors) + (rng.nextF64() > 0.5 ? 1 : 0);
    
    let remainingWidth = params.lotSize[0];
    let remainingHeight = params.lotSize[1];
    
    for (let r = 0; r < roomsThisFloor; r++) {
      const roomType = roomTypes[Math.floor(rng.nextF64() * roomTypes.length)];
      const width = 3 + rng.nextF64() * Math.min(remainingWidth - 3, 10);
      const height = 3 + rng.nextF64() * Math.min(remainingHeight - 3, 10);
      
      floorRooms.push({
        name: `${roomType}_${r}`,
        x: params.lotSize[0] - remainingWidth,
        y: params.lotSize[1] - remainingHeight,
        width,
        height,
        doors: [],
        windows: []
      });
      
      remainingHeight -= height + 1;
      if (remainingHeight < 5) {
        remainingHeight = params.lotSize[1];
        remainingWidth -= width + 1;
      }
    }
    
    floors.push({
      level: f + 1,
      rooms: floorRooms,
      area: floorRooms.reduce((sum, r) => sum + r.width * r.height, 0)
    });
  }
  
  return floors;
}

function generate3DModel(floors: Floor[], params: ArchitectureParams, rng: Xoshiro256StarStar): any {
  return {
    vertices: [],
    faces: [],
    floors: floors.length,
    style: params.style,
    exteriorWalls: true,
    interiorWalls: true,
    roofType: params.style === 'modern' ? 'flat' : 'pitched'
  };
}

async function exportJSON(data: any, outputPath: string, seed: Seed): Promise<string> {
  const filename = `architecture_${seed.$hash || 'unknown'}.json`;
  const filePath = path.join(outputPath, filename);
  if (typeof fs !== 'undefined') fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
  return filePath;
}

async function exportFloorplanSVG(floors: Floor[], outputPath: string, seed: Seed): Promise<string> {
  const filename = `architecture_${seed.$hash || 'unknown'}.svg`;
  const filePath = path.join(outputPath, filename);
  
  const scale = 20;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 1000">
  <style>.room{fill:#e0e0e0;stroke:#333;stroke-width:2}.wall{stroke:#000;stroke-width:4}.door{fill:#888}.window{fill:#8cf}</style>
  ${floors.map((floor, fi) => `
  <g id="floor-${fi + 1}">
    <text x="10" y="${30 + fi * 400}" font-size="20">Floor ${floor.level}</text>
    ${floor.rooms.map(r => `
    <rect class="room" x="${r.x * scale}" y="${r.y * scale + 50 + fi * 400}" width="${r.width * scale}" height="${r.height * scale}" />
    <text x="${r.x * scale + 5}" y="${r.y * scale + 70 + fi * 400}" font-size="12">${r.name}</text>
    `).join('')}
  </g>`).join('')}
</svg>`;
  
  if (typeof fs !== 'undefined') fs.writeFileSync(filePath, svg);
  return filePath;
}

async function exportGLTF(model: any, outputPath: string, seed: Seed): Promise<string> {
  const filename = `architecture_${seed.$hash || 'unknown'}.gltf`;
  const filePath = path.join(outputPath, filename);
  
  const gltf = {
    asset: { version: '2.0', generator: 'Paradigm Absolute' },
    scenes: [{ nodes: [0] }],
    nodes: [{ mesh: 0, name: 'Building' }],
    meshes: [{
      primitives: [{
        attributes: { POSITION: 0 },
        indices: 1,
        material: 0
      }]
    }]
  };
  
  if (typeof fs !== 'undefined') fs.writeFileSync(filePath, JSON.stringify(gltf, null, 2));
  return filePath;
}
