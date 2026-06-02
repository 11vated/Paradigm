/**
 * Architecture Generator — CANONICAL (Doctrine v2 Phase 2 Consolidation)
 *
 * PRIMARY / canonical implementation for architecture/building generation.
 * All engine dispatch, contracts, paradigm make, and new development MUST target this file + architecture-contract.ts.
 *
 * Siblings (architecture-3d.ts) carry deprecation banners + PARADIGM-RENAME-OK waivers (sunset 2026-08-25).
 * Real dispatch enforcement + golden regeneration in progress.
 *
 * Features: Multi-floor buildings, room layouts, 3D models
 * Export: JSON, SVG floorplan, GLTF 3D model
 *
 * PHASE 2 NOTE: Canonical primary. Target architecture.ts exclusively for new work.
 */

import * as fs from 'fs';
import * as path from 'path';
import * as THREE from 'three';
import { Xoshiro256StarStar } from '../rng';
import type { Seed } from '../engines';
import { createCanvas, canvasToDataTexture } from './canvas-utils.js';
import { exportGLTF, stripTextureMapsForServer } from './gltf-exporter';
import { exportOBJ } from './obj-exporter';

// Seed type imported from '../engines'; local duplicate removed for canonical consistency.

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
  objPath?: string;
  htmlPath?: string;
  floorCount: number;
  roomCount: number;
}> {
  const rng = new Xoshiro256StarStar(seed.$hash || 'architecture-default');
  const params = extractArchitectureParams(seed, rng);

  // Generate floors (data)
  const floors = generateFloors(params, rng);

  // Real 3D building
  const building = buildArchitectureMesh(floors, params, rng);

  const scene3D = new THREE.Scene();
  scene3D.add(building);
  scene3D.add(new THREE.AmbientLight(0xffffff, 0.65));
  const sun = new THREE.DirectionalLight(0xfff, 0.95);
  sun.position.set(30, 60, 20);
  scene3D.add(sun);

  const dir = outputPath.endsWith('.json') || outputPath.endsWith('.svg') ? path.dirname(outputPath) : outputPath;
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  stripTextureMapsForServer(scene3D);
  const gltfBuffer = await exportGLTF(scene3D, { binary: false, embedImages: true, trs: false });
  const gltfPath = path.join(dir, `architecture_${seed.$hash || 'unknown'}.gltf`);
  fs.writeFileSync(gltfPath, gltfBuffer);

  const objData = exportOBJ(building, { includeNormals: true, includeUVs: true });
  const objPath = path.join(dir, `architecture_${seed.$hash || 'unknown'}.obj`);
  fs.writeFileSync(objPath, objData.obj);
  fs.writeFileSync(path.join(dir, `architecture_${seed.$hash || 'unknown'}.mtl`), objData.mtl);

  const jsonPath = await exportJSON({ params, floors }, outputPath, seed);
  const floorplanPath = await exportFloorplanSVG(floors, outputPath, seed);
  const htmlPath = await exportArchitectureHTML(floors, params, outputPath, seed);

  const totalRooms = floors.reduce((sum, f) => sum + f.rooms.length, 0);

  return {
    jsonPath,
    floorplanPath,
    gltfPath,
    objPath,
    htmlPath,
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

function buildArchitectureMesh(floors: Floor[], params: ArchitectureParams, rng: Xoshiro256StarStar): THREE.Group {
  const group = new THREE.Group();
  group.name = `building_${params.type}`;
  const floorH = 3.2;
  const wallMat = createArchPBRMaterial(params.style, [0.82, 0.78, 0.7], 0.1, 0.88, rng);
  const floorMat = createArchPBRMaterial('concrete', [0.55, 0.52, 0.48], 0.0, 0.95, rng);
  const roofMat = createArchPBRMaterial(params.style, [0.2, 0.2, 0.22], 0.6, 0.5, rng);

  floors.forEach((fl, fi) => {
    const yBase = fi * floorH;
    // Floor slab
    const slab = new THREE.Mesh(new THREE.BoxGeometry(params.lotSize[0], 0.18, params.lotSize[1]), floorMat);
    slab.position.set(params.lotSize[0] / 2, yBase + 0.09, params.lotSize[1] / 2);
    group.add(slab);

    // Walls per room (extruded boxes)
    fl.rooms.forEach((room) => {
      const cx = room.x + room.width / 2;
      const cz = room.y + room.height / 2;
      // Perimeter walls (thin boxes)
      const wTh = 0.22;
      const north = new THREE.Mesh(new THREE.BoxGeometry(room.width + wTh, floorH * 0.96, wTh), wallMat);
      north.position.set(cx, yBase + floorH * 0.48, room.y);
      group.add(north);
      const south = north.clone(); south.position.z = room.y + room.height; group.add(south);
      const east = new THREE.Mesh(new THREE.BoxGeometry(wTh, floorH * 0.96, room.height + wTh), wallMat);
      east.position.set(room.x + room.width, yBase + floorH * 0.48, cz);
      group.add(east);
      const west = east.clone(); west.position.x = room.x; group.add(west);
    });
  });

  // Roof
  const topFloor = floors.length;
  const roofY = topFloor * floorH;
  const roof = new THREE.Mesh(
    params.style === 'modern'
      ? new THREE.BoxGeometry(params.lotSize[0] + 0.6, 0.3, params.lotSize[1] + 0.6)
      : new THREE.ConeGeometry(Math.max(params.lotSize[0], params.lotSize[1]) * 0.72, 2.4, 4),
    roofMat
  );
  roof.position.set(params.lotSize[0] / 2, roofY + 1.1, params.lotSize[1] / 2);
  if (params.style !== 'modern') roof.rotation.y = Math.PI / 4 * (rng.nextF64() > 0.5 ? 1 : 0);
  group.add(roof);

  return group;
}

function createArchPBRMaterial(style: string, base: [number, number, number], metal: number, rough: number, rng: Xoshiro256StarStar): THREE.MeshStandardMaterial {
  const res = 256;
  const canvas = createCanvas(res, res);
  const ctx = canvas ? canvas.getContext('2d', { willReadFrequently: true } as any /* canvas interop */) : null;
  let tex: any = null;
  if (ctx && canvas) {
    (ctx as any).fillStyle = `rgb(${Math.floor(base[0]*255)},${Math.floor(base[1]*255)},${Math.floor(base[2]*255)})`;
    (ctx as any).fillRect(0, 0, res, res);
    (ctx as any).globalAlpha = 0.15;
    for (let i = 0; i < 260; i++) {
      const x = rng.nextInt(0, res), y = rng.nextInt(0, res), sz = rng.nextInt(3, 11);
      (ctx as any).fillStyle = `rgb(${Math.floor((base[0] + (rng.nextF64()-0.5)*0.1)*255)},${Math.floor((base[1]+(rng.nextF64()-0.5)*0.1)*255)},${Math.floor((base[2]+(rng.nextF64()-0.5)*0.1)*255)})`;
      (ctx as any).fillRect(x, y, sz, sz);
    }
    (ctx as any).globalAlpha = 1;
    tex = canvasToDataTexture(canvas); if (tex) tex.flipY = false;
  }
  return new THREE.MeshStandardMaterial({ color: new THREE.Color(base[0], base[1], base[2]), map: tex || undefined, metalness: metal, roughness: rough });
}

async function exportJSON(data: any, outputPath: string, seed: Seed): Promise<string> {
  const dir = outputPath.endsWith('.json') || outputPath.endsWith('.svg') ? path.dirname(outputPath) : outputPath;
  const filename = `architecture_${seed.$hash || 'unknown'}.json`;
  const filePath = path.join(dir, filename);
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

// exportGLTF stub removed — inline real exportGLTF from buildArchitectureMesh in generate.

async function exportArchitectureHTML(floors: Floor[], params: ArchitectureParams, outputPath: string, seed: Seed): Promise<string> {
  const dir = outputPath.endsWith('.json') || outputPath.endsWith('.svg') ? path.dirname(outputPath) : outputPath;
  const filePath = path.join(dir, `architecture_${seed.$hash || 'unknown'}.html`);
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Paradigm Architecture — ${seed.$hash}</title>
<style>body{margin:0;font-family:system-ui;background:#0b0b0d;color:#ccc}#c{width:100vw;height:70vh;display:block}.p{position:absolute;top:8px;left:8px;background:#16161a;padding:8px 12px;border-radius:6px;font-size:12px}</style></head>
<body><canvas id="c"></canvas><div class="p"><b>${params.type} ${params.style}</b> — ${floors.length} floors, ${floors.reduce((s,f)=>s+f.rooms.length,0)} rooms</div>
<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>
<script>
const c=document.getElementById('c');const r=new THREE.WebGLRenderer({canvas:c,antialias:true});r.setSize(innerWidth,innerHeight*.7);
const sc=new THREE.Scene();sc.background=new THREE.Color(0x0b0b0d);
const cam=new THREE.PerspectiveCamera(48,innerWidth/(innerHeight*.7),0.2,200);cam.position.set(28,22,32);
const amb=new THREE.AmbientLight(0xeee,0.7);sc.add(amb);const sun=new THREE.DirectionalLight(0xfff,1);sun.position.set(40,80,30);sc.add(sun);
const fh=3.2,ls0=${params.lotSize[0]},ls1=${params.lotSize[1]};
const wm=new THREE.MeshStandardMaterial({color:0xc8c4b3,roughness:0.9});
${floors.map((fl,fi)=>`{
  const y=${fi}*fh;
  const slab=new THREE.Mesh(new THREE.BoxGeometry(ls0,.18,ls1),new THREE.MeshStandardMaterial({color:0x7d766b,roughness:.95}));slab.position.set(ls0/2,y+.09,ls1/2);sc.add(slab);
  ${fl.rooms.map(rm=>`{const cx=${rm.x}+${rm.width}/2,cz=${rm.y}+${rm.height}/2,th=.22;
  const n=new THREE.Mesh(new THREE.BoxGeometry(${rm.width}+th,fh*.96,th),wm);n.position.set(cx,y+fh*.48,${rm.y});sc.add(n);
  const s=n.clone();s.position.z=${rm.y}+${rm.height};sc.add(s);
  const e=new THREE.Mesh(new THREE.BoxGeometry(th,fh*.96,${rm.height}+th),wm);e.position.set(${rm.x}+${rm.width},y+fh*.48,cx);sc.add(e);
  const w=e.clone();w.position.x=${rm.x};sc.add(w);} `).join('')}
}`).join('')}
const roof=new THREE.Mesh(new THREE.BoxGeometry(ls0+0.6,.3,ls1+0.6),new THREE.MeshStandardMaterial({color:0x2a2a2e,metalness:.5,roughness:.6}));roof.position.set(ls0/2,${floors.length}*fh+1.1,ls1/2);sc.add(roof);
let yaw=0.8,pitch=0.55,dist=46;function uc(){cam.position.x=Math.cos(yaw)*Math.cos(pitch)*dist;cam.position.z=Math.sin(yaw)*Math.cos(pitch)*dist;cam.position.y=14+Math.sin(pitch)*14;cam.lookAt(ls0/2,${Math.max(1,floors.length)}*fh*0.6,ls1/2);}uc();
let d=false,lx=0,ly=0;c.onmousedown=e=>{d=true;lx=e.clientX;ly=e.clientY};onmouseup=()=>d=false;onmousemove=e=>{if(!d)return;yaw-=(e.clientX-lx)*0.0035;pitch=Math.max(0.1,Math.min(1.1,pitch-(e.clientY-ly)*0.0035));lx=e.clientX;ly=e.clientY;uc();};c.onwheel=e=>{dist=Math.max(12,Math.min(110,dist+e.deltaY*0.04));uc();e.preventDefault();};
function f(){r.render(sc,cam);requestAnimationFrame(f)}f();onresize=()=>{r.setSize(innerWidth,innerHeight*.7);cam.aspect=innerWidth/(innerHeight*.7);cam.updateProjectionMatrix();};
</script></body></html>`;
  fs.writeFileSync(filePath, html); return filePath;
}

// ── Canonical aliases (added by phase-0.5 consolidation) ──
export { generateArchitectureV3 as generateArchitecture };
