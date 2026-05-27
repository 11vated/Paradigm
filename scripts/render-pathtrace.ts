#!/usr/bin/env bun
/**
 * render-pathtrace.ts — render a sovereign path-traced spectral scene.
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { createCanvas } from 'canvas';
import {
  v3, v3Norm, v3Dot, v3Cross,
  sdSphere, sdBox, sdPlane,
  sdUnion, sdSmoothUnion, sdTranslate,
  withMat,
  type SdfSceneFn,
} from '../src/lib/spectral/sdf';
import { pathTrace, type Material } from '../src/lib/spectral/pathtrace';
import { rngFromHash } from '../src/lib/kernel/rng';

const seed = process.argv[2] ?? 'paradigm-aurelis-pathtrace';
const outDir = process.argv[3] ?? '/tmp/pt-aurelis';
const width  = parseInt(process.argv[4] ?? '512', 10);
const height = parseInt(process.argv[5] ?? '384', 10);
const samples = parseInt(process.argv[6] ?? '4', 10);
const bounces = parseInt(process.argv[7] ?? '3', 10);

mkdirSync(outDir, { recursive: true });
const rng = rngFromHash(seed);

// Materials: 0 sky/default, 1 ground, 2 white plaster, 3 polished bronze,
// 4 emerald glass, 5 ember (emissive)
const materials: Record<number, Material> = {
  0: { albedo: [0.5, 0.5, 0.5], roughness: 0.9, metallic: 0, emission: [0,0,0] },
  1: { albedo: [0.34, 0.22, 0.16], roughness: 0.95, metallic: 0, emission: [0,0,0], uvEmission: 0.02 },
  2: { albedo: [0.85, 0.83, 0.78], roughness: 0.7, metallic: 0, emission: [0,0,0], uvEmission: 0.1, irEmission: 0.15 },
  3: { albedo: [0.85, 0.55, 0.28], roughness: 0.2, metallic: 1.0, emission: [0,0,0], irEmission: 0.5 },
  4: { albedo: [0.2, 0.85, 0.55], roughness: 0.05, metallic: 0, emission: [0,0,0], uvEmission: 0.95 },
  5: { albedo: [1.0, 0.6, 0.3], roughness: 0.6, metallic: 0, emission: [3.5, 1.4, 0.5], irEmission: 0.98 },
};

// Build a richer scene: a tiled plaza with 7 spires + a central emerald orb
// + a brazier (emissive) + a bronze pillar.
const items: SdfSceneFn[] = [
  withMat(1, sdPlane(v3(0, 1, 0), 1.0)),
];
const n = 7;
for (let i = 0; i < n; i++) {
  const a = (i / n) * Math.PI * 2;
  const r = 4.2 + (i % 2) * 0.6;
  const h = 2.5 + (i * 0.45) % 1.6;
  const w = 0.6 + (i % 3) * 0.15;
  items.push(withMat(i % 2 === 0 ? 3 : 2, sdTranslate(v3(Math.cos(a)*r, h/2 - 1, Math.sin(a)*r), sdBox(v3(w, h, w)))));
}
// Central emerald orb
items.push(withMat(4, sdTranslate(v3(0, -0.1, 0), sdSphere(0.9))));
// Bronze pillar at +X
items.push(withMat(3, sdTranslate(v3(1.6, 0.4, 1.6), sdBox(v3(0.18, 1.6, 0.18)))));
// Brazier (sphere) at -X
items.push(withMat(5, sdTranslate(v3(-2.0, 0.0, -0.8), sdSphere(0.36))));
let scene: SdfSceneFn = items[0];
for (let i = 1; i < items.length; i++) scene = sdSmoothUnion(scene, items[i], 0.18);

const cam = {
  position: v3(6.0, 2.5, 7.5),
  target:   v3(0, 0.5, 0),
  up:       v3(0, 1, 0),
  fovDeg:   38,
};
const sunDir = v3Norm(v3(0.4, 0.9, 0.35));

console.log(`rendering ${width}x${height} path-traced (spp=${samples} depth=${bounces})...`);
const t0 = Date.now();
const frame = pathTrace(scene, materials, cam, {
  width, height, samples, maxBounces: bounces,
  maxSteps: 96, minDist: 0.003, maxDist: 60,
  rrStart: 2, sunDir, turbidity: 2.5, exposure: 1.0,
}, rng);
console.log(`done in ${Date.now() - t0}ms`);

const canvas = createCanvas(width, height);
const ctx = canvas.getContext('2d');
const img = ctx.createImageData(width, height);
img.data.set(frame.rgb);
ctx.putImageData(img, 0, 0);
writeFileSync(join(outDir, 'rgb.png'), canvas.toBuffer('image/png'));

// UV, IR, depth, normal, matId
for (const [name, src, kind] of [
  ['uv', frame.uv, 'single'],
  ['ir', frame.ir, 'single'],
  ['matId', frame.matId, 'single'],
] as const) {
  const c = createCanvas(width, height);
  const cx = c.getContext('2d');
  const im = cx.createImageData(width, height);
  for (let i = 0; i < width*height; i++) {
    im.data[i*4]   = src[i];
    im.data[i*4+1] = name === 'uv' ? 80 : name === 'ir' ? src[i] : src[i] * 32;
    im.data[i*4+2] = name === 'uv' ? src[i] : 0;
    im.data[i*4+3] = 255;
  }
  cx.putImageData(im, 0, 0);
  writeFileSync(join(outDir, name + '.png'), c.toBuffer('image/png'));
}
// Normal map
{
  const c = createCanvas(width, height);
  const cx = c.getContext('2d');
  const im = cx.createImageData(width, height);
  im.data.set(frame.normal);
  cx.putImageData(im, 0, 0);
  writeFileSync(join(outDir, 'normal.png'), c.toBuffer('image/png'));
}
// Depth map (16-bit → 8-bit visualization)
{
  const c = createCanvas(width, height);
  const cx = c.getContext('2d');
  const im = cx.createImageData(width, height);
  for (let i = 0; i < width*height; i++) {
    const d = Math.round(frame.depth[i] / 65535 * 255);
    im.data[i*4]   = d;
    im.data[i*4+1] = d;
    im.data[i*4+2] = d;
    im.data[i*4+3] = 255;
  }
  cx.putImageData(im, 0, 0);
  writeFileSync(join(outDir, 'depth.png'), c.toBuffer('image/png'));
}
console.log(`wrote 6 channels to ${outDir}`);
