#!/usr/bin/env bun
/**
 * render-spectral.ts — render a sovereign multi-channel spectral image.
 *
 * Produces six PNGs per seed (rgb, uv, ir, depth, normal, matid) plus
 * a 3x2 composite grid showing all channels.
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { createCanvas, ImageData } from 'canvas';
import { rngFromHash } from '../src/lib/kernel/rng';
import {
  v3, sdSphere, sdBox, sdPlane, sdTorus, sdCylinder,
  translate, rotateY, opUnion, opSmoothUnion, opSubtract,
  withMat, sceneUnion, type SdfSceneFn,
} from '../src/lib/spectral/sdf';
import { renderSpectral, rgbToRGBA8, DEFAULT_MATERIALS, type Camera, type Light } from '../src/lib/spectral/raymarch';

const seedHash = process.argv[2] || 'paradigm-spectral-default';
const outDir = process.argv[3] || `/tmp/spectral-${seedHash.slice(0, 12)}`;
const width = Number(process.argv[4] || 384);
const height = Number(process.argv[5] || 256);

mkdirSync(outDir, { recursive: true });
const rng = rngFromHash(seedHash);

// Build a procedural scene with deterministic variation
const groundSdf = sdPlane(v3(0, 1, 0), 1.0);
const ground = withMat(1, groundSdf);

// Procedural city: 9 buildings on a 3x3 grid with deterministic heights & material
const buildings: SdfSceneFn[] = [];
for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) {
  const h = 0.8 + rng.nextF64() * 2.2;
  const w = 0.4 + rng.nextF64() * 0.3;
  const matChoice = rng.nextInt(2, 6);
  const x = (i - 1) * 1.4;
  const z = (j - 1) * 1.4;
  const b = translate(v3(x, -1 + h/2, z), sdBox(v3(w, h/2, w)));
  buildings.push(withMat(matChoice, b));
}

// A floating crystal centerpiece (smooth union of sphere + box)
const crystal = withMat(3, translate(v3(0, 1.2, 0),
  opSmoothUnion(sdSphere(0.55), rotateY(rng.nextF64()*Math.PI, sdBox(v3(0.4, 0.4, 0.4))), 0.25)));

// A torus halo around the crystal
const halo = withMat(2, translate(v3(0, 1.2, 0),
  rotateY(rng.nextF64()*Math.PI, sdTorus(0.95, 0.045))));

// A small ember sphere
const ember = withMat(4, translate(v3(rng.nextF64()*1.5 - 0.75, -0.3, rng.nextF64()*1.5 - 0.75), sdSphere(0.18)));

const scene: SdfSceneFn = sceneUnion(ground, ...buildings, crystal, halo, ember);

const cam: Camera = {
  origin: v3(3.5, 2.0, 4.5),
  target: v3(0, 0.6, 0),
  up: v3(0, 1, 0),
  fovDeg: 42,
};
const light: Light = {
  direction: v3(0.4, 0.85, 0.35),
  color: v3(1.6, 1.45, 1.2),
  ambient: v3(0.08, 0.1, 0.14),
};

console.log(`rendering ${width}×${height} 6-channel spectral image...`);
const t0 = Date.now();
const frame = renderSpectral(scene, cam, light, DEFAULT_MATERIALS, {
  width, height, samples: 1, maxSteps: 96, minDist: 0.003, maxDist: 60, exposure: 1.3,
});
const elapsed = Date.now() - t0;
console.log(`  rendered in ${elapsed}ms`);

const channels = ['rgb', 'uv', 'ir', 'depth', 'normal', 'matId'] as const;
const paths: Record<string, string> = {};
for (const ch of channels) {
  const cv = createCanvas(width, height);
  const ctx = cv.getContext('2d');
  const id = ctx.createImageData(width, height);
  const bytes = rgbToRGBA8(frame, ch);
  id.data.set(bytes);
  ctx.putImageData(id, 0, 0);
  const p = `${outDir}/${ch}.png`;
  writeFileSync(p, cv.toBuffer('image/png'));
  paths[ch] = p;
  console.log(`  ${ch.padEnd(6)} → ${p}`);
}
console.log(`Done. Channels in ${outDir}`);
