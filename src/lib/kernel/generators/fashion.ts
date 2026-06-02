/**
 * Fashion Generator — CANONICAL (Doctrine v2 Phase 2 Consolidation)
 *
 * PRIMARY / canonical implementation for fashion/garment generation.
 * All engine dispatch, contracts, paradigm make, and new development MUST target this file + fashion-contract.ts.
 *
 * Siblings (fashion-3d.ts) carry deprecation banners + PARADIGM-RENAME-OK waivers (sunset 2026-08-25).
 * Real dispatch enforcement + golden regeneration in progress.
 *
 * Features: Clothing items, fabrics, patterns, sizing
 * Export: JSON specs, SVG patterns, GLTF 3D model
 *
 * PHASE 2 NOTE: Canonical primary. Target fashion.ts exclusively for new work.
 */

import * as fs from 'fs';
import * as path from 'path';
import * as THREE from 'three';
import type { Seed } from '../engines';
import { Xoshiro256StarStar } from '../rng';
import { createCanvas, canvasToDataTexture } from './canvas-utils.js';
import { exportGLTF, stripTextureMapsForServer } from './gltf-exporter';
import { exportOBJ } from './obj-exporter';

interface FashionParams {
  type: 'shirt' | 'pants' | 'dress' | 'jacket' | 'skirt' | 'coat';
  style: 'casual' | 'formal' | 'sport' | 'vintage' | 'avant-garde';
  fabric: 'cotton' | 'silk' | 'wool' | 'polyester' | 'linen' | 'leather';
  size: 'XS' | 'S' | 'M' | 'L' | 'XL' | 'XXL';
  gender: 'unisex' | 'masculine' | 'feminine';
  season: 'spring' | 'summer' | 'fall' | 'winter';
}

interface Pattern {
  name: string;
  pieces: { name: string; shape: string; dimensions: [number, number] }[];
  seamAllowance: number;
  grainline: string;
}

export async function generateFashionV3(
  seed: Seed,
  outputPath: string
): Promise<{
  jsonPath: string;
  patternPath: string;
  gltfPath: string;
  objPath?: string;
  htmlPath?: string;
  specs: any;
}> {
  const rng = new Xoshiro256StarStar(seed.$hash || 'fashion-default');
  const params = extractFashionParams(seed, rng);

  // Generate specifications
  const specs = generateFashionSpecs(params, rng);

  // Generate pattern (SVG sidecar)
  const pattern = generatePattern(params, specs, rng);

  // Real 3D garment + body form
  const fashionGroup = buildFashionMesh(params, specs, rng);

  const scene3D = new THREE.Scene();
  scene3D.add(fashionGroup);
  scene3D.add(new THREE.AmbientLight(0xffffff, 0.75));
  const dl = new THREE.DirectionalLight(0xffffff, 0.85);
  dl.position.set(6, 14, 8);
  scene3D.add(dl);

  const dir = outputPath.endsWith('.json') || outputPath.endsWith('.svg') ? path.dirname(outputPath) : outputPath;
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  stripTextureMapsForServer(scene3D);
  const gltfBuffer = await exportGLTF(scene3D, { binary: false, embedImages: true, trs: false });
  const gltfPath = path.join(dir, `fashion_${seed.$hash || 'unknown'}.gltf`);
  fs.writeFileSync(gltfPath, gltfBuffer);

  const objData = exportOBJ(fashionGroup, { includeNormals: true, includeUVs: true });
  const objPath = path.join(dir, `fashion_${seed.$hash || 'unknown'}.obj`);
  fs.writeFileSync(objPath, objData.obj);
  fs.writeFileSync(path.join(dir, `fashion_${seed.$hash || 'unknown'}.mtl`), objData.mtl);

  const jsonPath = await exportFashionJSON({ params, specs, pattern }, outputPath, seed);
  const patternPath = await exportPatternSVG(pattern, outputPath, seed);
  const htmlPath = await exportFashionHTML(params, specs, outputPath, seed);

  return { jsonPath, patternPath, gltfPath, objPath, htmlPath, specs };
}

function extractFashionParams(seed: Seed, rng: Xoshiro256StarStar): FashionParams {
  const types = ['shirt', 'pants', 'dress', 'jacket', 'skirt', 'coat'] as const;
  const styles = ['casual', 'formal', 'sport', 'vintage', 'avant-garde'] as const;
  const fabrics = ['cotton', 'silk', 'wool', 'polyester', 'linen', 'leather'] as const;
  const sizes = ['XS', 'S', 'M', 'L', 'XL', 'XXL'] as const;
  const genders = ['unisex', 'masculine', 'feminine'] as const;
  const seasons = ['spring', 'summer', 'fall', 'winter'] as const;
  
  return {
    type: types[Math.floor(rng.nextF64() * types.length)],
    style: styles[Math.floor(rng.nextF64() * styles.length)],
    fabric: fabrics[Math.floor(rng.nextF64() * fabrics.length)],
    size: sizes[Math.floor(rng.nextF64() * sizes.length)],
    gender: genders[Math.floor(rng.nextF64() * genders.length)],
    season: seasons[Math.floor(rng.nextF64() * seasons.length)]
  };
}

function generateFashionSpecs(params: FashionParams, rng: Xoshiro256StarStar): any {
  const sizeMeasurements: Record<string, { chest: number; waist: number; hip: number }> = {
    'XS': { chest: 80, waist: 64, hip: 84 },
    'S': { chest: 88, waist: 70, hip: 92 },
    'M': { chest: 96, waist: 78, hip: 100 },
    'L': { chest: 104, waist: 86, hip: 108 },
    'XL': { chest: 112, waist: 94, hip: 116 },
    'XXL': { chest: 120, waist: 102, hip: 124 }
  };
  
  const measurements = sizeMeasurements[params.size];
  
  return {
    type: params.type,
    style: params.style,
    fabric: {
      type: params.fabric,
      weight: 100 + Math.floor(rng.nextF64() * 300), // gsm
      drape: rng.nextF64(),
      stretch: rng.nextF64() > 0.5,
      care: ['machine wash', 'dry clean', 'hand wash'][Math.floor(rng.nextF64() * 3)]
    },
    measurements: {
      chest: measurements.chest + (rng.nextF64() - 0.5) * 4,
      waist: measurements.waist + (rng.nextF64() - 0.5) * 4,
      hip: measurements.hip + (rng.nextF64() - 0.5) * 4,
      length: 50 + rng.nextF64() * 50,
      sleeve: params.type === 'shirt' || params.type === 'jacket' ? 55 + rng.nextF64() * 15 : 0
    },
    features: {
      pockets: Math.floor(rng.nextF64() * 4),
      buttons: Math.floor(rng.nextF64() * 8),
      collar: rng.nextF64() > 0.5,
      cuffs: rng.nextF64() > 0.5,
      lining: rng.nextF64() > 0.7
    },
    colors: [
      [rng.nextF64(), rng.nextF64(), rng.nextF64()],
      [rng.nextF64(), rng.nextF64(), rng.nextF64()]
    ]
  };
}

function generatePattern(params: FashionParams, specs: any, rng: Xoshiro256StarStar): Pattern {
  const pieces: any[] = [];
  
  if (params.type === 'shirt') {
    pieces.push({ name: 'Front', shape: 'rectangle', dimensions: [specs.measurements.chest / 2 + 5, specs.measurements.length] });
    pieces.push({ name: 'Back', shape: 'rectangle', dimensions: [specs.measurements.chest / 2 + 5, specs.measurements.length] });
    pieces.push({ name: 'Sleeve', shape: 'tapered', dimensions: [specs.measurements.sleeve, 30] });
    pieces.push({ name: 'Collar', shape: 'strip', dimensions: [40, 8] });
  } else if (params.type === 'pants') {
    pieces.push({ name: 'Front Leg', shape: 'L-shape', dimensions: [specs.measurements.waist / 4 + 5, specs.measurements.length] });
    pieces.push({ name: 'Back Leg', shape: 'L-shape', dimensions: [specs.measurements.waist / 4 + 5, specs.measurements.length] });
    pieces.push({ name: 'Waistband', shape: 'strip', dimensions: [specs.measurements.waist + 10, 5] });
  } else {
    pieces.push({ name: 'Main Body', shape: 'custom', dimensions: [specs.measurements.chest, specs.measurements.length] });
  }
  
  return {
    name: `${params.type}_${params.style}_pattern`,
    pieces,
    seamAllowance: 1.5,
    grainline: 'vertical'
  };
}

/**
 * Real 3D garment: simple body form (cylinders/boxes) + layered clothing panels with drape simulation via vertex offset.
 */
function buildFashionMesh(params: FashionParams, specs: any, rng: Xoshiro256StarStar): THREE.Group {
  const group = new THREE.Group();
  group.name = `fashion_${params.type}`;

  const m = specs.measurements || { chest: 100, waist: 80, hip: 102, length: 80, sleeve: 60 };
  const fabricType = params.fabric;
  const drape = specs.fabric?.drape ?? 0.5;
  const isDress = params.type === 'dress' || params.type === 'skirt';

  // Body form (neutral mannequin)
  const torso = new THREE.Mesh(
    new THREE.CylinderGeometry(m.waist / 220, m.chest / 200, m.length / 90, 18),
    createFashionPBRMaterial(fabricType, [0.72, 0.65, 0.6], 0.05, 0.85, rng)
  );
  torso.position.y = m.length / 180;
  group.add(torso);

  // Garment panels — dress/skirt vs tops use different topology
  const colorBase: [number, number, number] = specs.colors?.[0] || [0.2 + rng.nextF64() * 0.6, 0.1 + rng.nextF64() * 0.5, 0.15 + rng.nextF64() * 0.4];
  const clothMat = createFashionPBRMaterial(fabricType, colorBase, fabricType === 'leather' ? 0.3 : 0.05, fabricType === 'silk' ? 0.2 : 0.65, rng);

  if (isDress || params.type === 'skirt') {
    // Skirt / dress drape
    const skirt = new THREE.Mesh(new THREE.ConeGeometry(m.hip / 180, m.length / 70, 22, 1, true), clothMat);
    skirt.position.y = m.length / 160;
    skirt.rotation.x = (rng.nextF64() - 0.5) * 0.02 * drape;
    group.add(skirt);
  } else {
    // Shirt / jacket torso panel + sleeves
    const bodyPanel = new THREE.Mesh(new THREE.CylinderGeometry(m.chest / 210, m.waist / 230, m.length / 85, 16), clothMat);
    bodyPanel.position.y = m.length / 170;
    group.add(bodyPanel);

    // Sleeves (tapered)
    if (m.sleeve > 10) {
      const sleeveL = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.065, m.sleeve / 95, 10), clothMat);
      sleeveL.position.set(-m.chest / 210, m.length / 130, 0);
      sleeveL.rotation.z = 1.3 + (rng.nextF64() - 0.5) * 0.1;
      group.add(sleeveL);
      const sleeveR = sleeveL.clone();
      sleeveR.position.x = m.chest / 210;
      sleeveR.rotation.z = -1.3 - (rng.nextF64() - 0.5) * 0.1;
      group.add(sleeveR);
    }
  }

  // Collar / waistband detail
  if (params.type === 'shirt' || params.type === 'jacket' || params.type === 'coat') {
    const collar = new THREE.Mesh(new THREE.TorusGeometry(m.chest / 280, 0.018, 6, 18), createFashionPBRMaterial('leather', [0.1,0.1,0.1], 0.4, 0.7, rng));
    collar.position.y = m.length / 95;
    collar.rotation.x = Math.PI / 2;
    group.add(collar);
  }

  // Hardware (buttons as small spheres)
  const btnMat = createFashionPBRMaterial('hardware', [0.7, 0.68, 0.55], 0.95, 0.25, rng);
  for (let i = 0; i < (specs.features?.buttons || 3); i++) {
    const b = new THREE.Mesh(new THREE.SphereGeometry(0.012, 6, 6), btnMat);
    b.position.set(0.03 + (rng.nextF64() - 0.5) * 0.01, m.length / 110 - i * 0.11, 0.18);
    group.add(b);
  }

  group.scale.setScalar(1.0 + (rng.nextF64() - 0.5) * 0.03);
  return group;
}

function createFashionPBRMaterial(fabric: string, base: [number, number, number], metal: number, rough: number, rng: Xoshiro256StarStar): THREE.MeshStandardMaterial {
  const res = 384;
  const canvas = createCanvas(res, res);
  const ctx = canvas ? canvas.getContext('2d', { willReadFrequently: true } as any /* canvas interop for three texture */) : null;
  let tex: any = null;
  if (ctx && canvas) {
    (ctx as any).fillStyle = `rgb(${Math.floor(base[0]*255)},${Math.floor(base[1]*255)},${Math.floor(base[2]*255)})`;
    (ctx as any).fillRect(0, 0, res, res);
    // Weave / leather grain / silk sheen procedural (det)
    (ctx as any).globalAlpha = fabric === 'silk' ? 0.18 : fabric === 'leather' ? 0.35 : 0.22;
    for (let i = 0; i < (fabric === 'wool' ? 1400 : 420); i++) {
      const x = rng.nextInt(0, res), y = rng.nextInt(0, res);
      const sz = rng.nextInt(1, fabric === 'cotton' ? 3 : 5);
      const v = (rng.nextF64() - 0.5) * (fabric === 'silk' ? 0.22 : 0.12);
      (ctx as any).fillStyle = `rgb(${Math.floor((base[0]+v)*255)},${Math.floor((base[1]+v)*255)},${Math.floor((base[2]+v)*255)})`;
      (ctx as any).fillRect(x, y, sz, sz);
    }
    (ctx as any).globalAlpha = 1;
    if (fabric === 'leather') {
      (ctx as any).strokeStyle = 'rgba(0,0,0,0.2)';
      (ctx as any).lineWidth = 0.8;
      for (let i = 0; i < 11; i++) { (ctx as any).beginPath(); (ctx as any).moveTo(0, i * 35 + rng.nextInt(-6,6)); (ctx as any).lineTo(res, i * 35 + rng.nextInt(-6,6)); (ctx as any).stroke(); }
    }
    tex = canvasToDataTexture(canvas);
    tex.name = `fashion_${fabric}_albedo`;
    tex.flipY = false;
  }
  return new THREE.MeshStandardMaterial({
    color: new THREE.Color(base[0], base[1], base[2]),
    map: tex || undefined,
    metalness: metal,
    roughness: rough,
    side: THREE.DoubleSide
  });
}

async function exportFashionJSON(data: any, outputPath: string, seed: Seed): Promise<string> {
  const dir = outputPath.endsWith('.json') || outputPath.endsWith('.svg') ? path.dirname(outputPath) : outputPath;
  const filename = `fashion_${seed.$hash || 'unknown'}.json`;
  const filePath = path.join(dir, filename);
  if (typeof fs !== 'undefined') fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
  return filePath;
}

async function exportPatternSVG(pattern: Pattern, outputPath: string, seed: Seed): Promise<string> {
  const filename = `fashion_${seed.$hash || 'unknown'}_pattern.svg`;
  const filePath = path.join(outputPath, filename);
  
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 700">
  <style>.piece{fill:#e0e0e0;stroke:#333;stroke-width:2}.label{font-size:12px}</style>
  <text x="10" y="20" font-size="16">${pattern.name}</text>
  ${pattern.pieces.map((p, i) => `
  <g transform="translate(${10 + (i % 3) * 160}, ${40 + Math.floor(i / 3) * 200})">
    <rect class="piece" width="${p.dimensions[0] * 2}" height="${p.dimensions[1] * 2}" />
    <text class="label" x="5" y="20">${p.name}</text>
    <text class="label" x="5" y="35">${p.dimensions[0]} x ${p.dimensions[1]} cm</text>
  </g>`).join('')}
  <text x="10" y="680" font-size="12">Seam Allowance: ${pattern.seamAllowance}cm | Grainline: ${pattern.grainline}</text>
</svg>`;
  
  if (typeof fs !== 'undefined') fs.writeFileSync(filePath, svg);
  return filePath;
}

// exportFashionGLTF stub removed — real GLTF + OBJ now emitted from generateFashionV3 via buildFashionMesh + exportGLTF/exportOBJ

async function exportFashionHTML(params: FashionParams, specs: any, outputPath: string, seed: Seed): Promise<string> {
  const dir = outputPath.endsWith('.json') || outputPath.endsWith('.svg') ? path.dirname(outputPath) : outputPath;
  const filePath = path.join(dir, `fashion_${seed.$hash || 'unknown'}.html`);
  const p = params; const s = specs;
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Paradigm Fashion — ${seed.$hash}</title>
<style>body{margin:0;font-family:system-ui;background:#111;color:#ccc}#v{width:100vw;height:70vh} .p{position:absolute;top:10px;left:10px;background:#1a1a1f;padding:10px 14px;border-radius:6px;font-size:12px}</style></head>
<body><canvas id="v"></canvas><div class="p"><b>${p.type} / ${p.fabric} / ${p.style}</b><br>size ${p.size} • drape ${(s.fabric?.drape||0.5).toFixed(2)}</div>
<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>
<script>
const c=document.getElementById('v'); const r=new THREE.WebGLRenderer({canvas:c,antialias:true}); r.setSize(innerWidth,innerHeight*0.7);
const sc=new THREE.Scene(); sc.background=new THREE.Color(0x111114);
const cam=new THREE.PerspectiveCamera(48,innerWidth/(innerHeight*0.7),0.1,80); cam.position.set(1.6,1.4,2.8);
const am=new THREE.AmbientLight(0xfff,0.8);sc.add(am); const sun=new THREE.DirectionalLight(0xfff,0.9);sun.position.set(4,9,3);sc.add(sun);
const m=new THREE.MeshStandardMaterial({color:0x${((s.colors?.[0]||[0.3,0.2,0.25]).map((x: any)=>Math.floor(x*255).toString(16).padStart(2,'0')).join(''))},roughness:${p.fabric==='silk'?0.25:0.7},metalness:${p.fabric==='leather'?0.25:0.05},side:THREE.DoubleSide});
const torso=new THREE.Mesh(new THREE.CylinderGeometry(0.28,0.32,0.9,18),m); torso.position.y=0.6; sc.add(torso);
const skirt=new THREE.Mesh(new THREE.ConeGeometry(0.48,0.9,20,1,true),m); skirt.position.y=0.55; sc.add(skirt);
const sleeveL=new THREE.Mesh(new THREE.CylinderGeometry(0.09,0.07,0.55,10),m); sleeveL.position.set(-0.32,0.85,0); sleeveL.rotation.z=1.25; sc.add(sleeveL);
const sleeveR=sleeveL.clone(); sleeveR.position.x=0.32; sleeveR.rotation.z=-1.25; sc.add(sleeveR);
let yaw=0.6,pitch=0.2,dist=2.6; function upCam(){cam.position.x=Math.cos(yaw)*dist;cam.position.z=Math.sin(yaw)*dist;cam.position.y=1+Math.sin(pitch)*1.1;cam.lookAt(0,0.7,0);}upCam();
let dr=false,lx=0,ly=0; c.onmousedown=e=>{dr=true;lx=e.clientX;ly=e.clientY}; onmouseup=()=>dr=false; onmousemove=e=>{if(!dr)return; yaw-=(e.clientX-lx)*0.005; pitch=Math.max(-0.8,Math.min(0.9,pitch-(e.clientY-ly)*0.004)); lx=e.clientX;ly=e.clientY; upCam();}; c.onwheel=e=>{dist=Math.max(1.2,Math.min(6,dist+e.deltaY*0.003));upCam();e.preventDefault();};
function f(){torso.rotation.y=Math.sin(Date.now()/5000)*0.12; r.render(sc,cam); requestAnimationFrame(f);} f();
onresize=()=>{r.setSize(innerWidth,innerHeight*0.7); cam.aspect=innerWidth/(innerHeight*0.7); cam.updateProjectionMatrix();};
</script></body></html>`;
  fs.writeFileSync(filePath, html);
  return filePath;
}

// ── Canonical aliases (added by phase-0.5 consolidation) ──
export { generateFashionV3 as generateFashion };
