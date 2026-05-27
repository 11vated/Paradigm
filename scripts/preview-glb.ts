#!/usr/bin/env bun
/**
 * preview-glb.ts — pure-node-canvas orthographic preview of a GLB mesh.
 * 100% local, no WebGL.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { createCanvas } from 'canvas';

function parseGLB(buf: Uint8Array): { vertices: Float32Array; indices: Uint32Array; normals?: Float32Array; colors?: Float32Array } {
  const dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  // Header
  if (dv.getUint32(0, true) !== 0x46546C67) throw new Error('not a GLB');
  // Skip 12-byte header, parse JSON chunk
  const jsonLen = dv.getUint32(12, true);
  const jsonBytes = new Uint8Array(buf.buffer, buf.byteOffset + 20, jsonLen);
  const json = JSON.parse(new TextDecoder().decode(jsonBytes));
  // BIN chunk follows
  const binOffset = 20 + jsonLen + 8;
  const binBytes = new Uint8Array(buf.buffer, buf.byteOffset + binOffset, dv.getUint32(20 + jsonLen, true));

  // Pull POSITION, NORMAL, COLOR_0, indices from the first primitive
  const prim = json.meshes[0].primitives[0];
  const get = (accessorIdx: number) => {
    const acc = json.accessors[accessorIdx];
    const bv = json.bufferViews[acc.bufferView];
    const offset = (bv.byteOffset ?? 0) + (acc.byteOffset ?? 0);
    return { acc, offset, count: acc.count, componentType: acc.componentType, type: acc.type };
  };
  const posMeta = get(prim.attributes.POSITION);
  const vertices = new Float32Array(binBytes.buffer, binBytes.byteOffset + posMeta.offset, posMeta.count * 3);
  let indices: Uint32Array;
  if (prim.indices !== undefined) {
    const iMeta = get(prim.indices);
    if (iMeta.componentType === 5125) indices = new Uint32Array(binBytes.buffer, binBytes.byteOffset + iMeta.offset, iMeta.count);
    else if (iMeta.componentType === 5123) {
      const u16 = new Uint16Array(binBytes.buffer, binBytes.byteOffset + iMeta.offset, iMeta.count);
      indices = Uint32Array.from(u16);
    } else throw new Error('unsupported index componentType ' + iMeta.componentType);
  } else {
    indices = new Uint32Array(vertices.length / 3);
    for (let i = 0; i < indices.length; i++) indices[i] = i;
  }
  let normals: Float32Array | undefined;
  if (prim.attributes.NORMAL !== undefined) {
    const nm = get(prim.attributes.NORMAL);
    normals = new Float32Array(binBytes.buffer, binBytes.byteOffset + nm.offset, nm.count * 3);
  }
  let colors: Float32Array | undefined;
  if (prim.attributes.COLOR_0 !== undefined) {
    const cm = get(prim.attributes.COLOR_0);
    const comps = cm.type === 'VEC4' ? 4 : 3;
    colors = new Float32Array(binBytes.buffer, binBytes.byteOffset + cm.offset, cm.count * comps);
  }
  return { vertices, indices, normals, colors };
}

function render(glbBuf: Uint8Array, size = 512, rotateDeg = 25): Buffer {
  const { vertices, indices, normals, colors } = parseGLB(glbBuf);

  // Bounding box → centered, scaled to fit -0.5..0.5
  let minX = Infinity, minY = Infinity, minZ = Infinity, maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
  for (let i = 0; i < vertices.length; i += 3) {
    if (vertices[i] < minX) minX = vertices[i]; if (vertices[i] > maxX) maxX = vertices[i];
    if (vertices[i+1] < minY) minY = vertices[i+1]; if (vertices[i+1] > maxY) maxY = vertices[i+1];
    if (vertices[i+2] < minZ) minZ = vertices[i+2]; if (vertices[i+2] > maxZ) maxZ = vertices[i+2];
  }
  const cx = (minX + maxX) / 2, cy = (minY + maxY) / 2, cz = (minZ + maxZ) / 2;
  const span = Math.max(maxX - minX, maxY - minY, maxZ - minZ) || 1;
  const scale = 0.85 / span;

  // Rotation matrix (yaw) so we see depth
  const yaw = rotateDeg * Math.PI / 180;
  const cosY = Math.cos(yaw), sinY = Math.sin(yaw);
  const pitch = 22 * Math.PI / 180;
  const cosP = Math.cos(pitch), sinP = Math.sin(pitch);

  function project(x: number, y: number, z: number) {
    let nx = (x - cx) * scale, ny = (y - cy) * scale, nz = (z - cz) * scale;
    // yaw around Y
    const tx = cosY * nx + sinY * nz;
    const tz = -sinY * nx + cosY * nz;
    // pitch around X
    const ty = cosP * ny - sinP * tz;
    const fz = sinP * ny + cosP * tz;
    return { sx: size * (0.5 + tx), sy: size * (0.5 - ty), depth: fz };
  }

  // Project light direction
  const lightDir = { x: 0.4, y: 0.7, z: 0.6 };
  const ldLen = Math.hypot(lightDir.x, lightDir.y, lightDir.z);
  lightDir.x /= ldLen; lightDir.y /= ldLen; lightDir.z /= ldLen;

  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');
  // Background gradient
  const grad = ctx.createLinearGradient(0, 0, 0, size);
  grad.addColorStop(0, '#0a0a14');
  grad.addColorStop(1, '#1a1828');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);

  // Build triangles + depth for painter's algorithm
  type Tri = { p0: any; p1: any; p2: any; depth: number; lambert: number; color: string };
  const tris: Tri[] = [];
  for (let t = 0; t < indices.length; t += 3) {
    const i0 = indices[t], i1 = indices[t+1], i2 = indices[t+2];
    const p0 = project(vertices[i0*3], vertices[i0*3+1], vertices[i0*3+2]);
    const p1 = project(vertices[i1*3], vertices[i1*3+1], vertices[i1*3+2]);
    const p2 = project(vertices[i2*3], vertices[i2*3+1], vertices[i2*3+2]);
    // Face normal in screen space (after rotation) for shading
    let nx = 0, ny = 0, nz = 1;
    if (normals) {
      nx = (normals[i0*3] + normals[i1*3] + normals[i2*3]) / 3;
      ny = (normals[i0*3+1] + normals[i1*3+1] + normals[i2*3+1]) / 3;
      nz = (normals[i0*3+2] + normals[i1*3+2] + normals[i2*3+2]) / 3;
      const nl = Math.hypot(nx, ny, nz) || 1; nx/=nl; ny/=nl; nz/=nl;
    }
    const lambert = Math.max(0.15, nx*lightDir.x + ny*lightDir.y + nz*lightDir.z);
    // Vertex color (use first vertex's color)
    let r = 0.7, g = 0.7, b = 0.8;
    if (colors) {
      r = colors[i0*3] ?? 0.7; g = colors[i0*3+1] ?? 0.7; b = colors[i0*3+2] ?? 0.8;
    }
    const rr = Math.round(255 * Math.min(1, r * lambert + 0.06));
    const gg = Math.round(255 * Math.min(1, g * lambert + 0.06));
    const bb = Math.round(255 * Math.min(1, b * lambert + 0.10));
    tris.push({ p0, p1, p2, depth: (p0.depth + p1.depth + p2.depth) / 3, lambert, color: `rgb(${rr},${gg},${bb})` });
  }
  // Painter's algorithm: back to front
  tris.sort((a, b) => a.depth - b.depth);
  for (const tri of tris) {
    ctx.fillStyle = tri.color;
    ctx.strokeStyle = `rgba(0,0,0,0.15)`;
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.moveTo(tri.p0.sx, tri.p0.sy);
    ctx.lineTo(tri.p1.sx, tri.p1.sy);
    ctx.lineTo(tri.p2.sx, tri.p2.sy);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }
  return canvas.toBuffer('image/png');
}

function main() {
  const args = process.argv.slice(2);
  if (args.length < 2) { console.error('usage: preview-glb <in.glb> <out.png> [--size N] [--rotate deg]'); process.exit(1); }
  const [inPath, outPath] = args;
  const size = Number(args.find(a => a.startsWith('--size='))?.split('=')[1] ?? 512);
  const rotate = Number(args.find(a => a.startsWith('--rotate='))?.split('=')[1] ?? 25);
  const glb = readFileSync(inPath);
  const png = render(glb, size, rotate);
  writeFileSync(outPath, png);
  console.log(`✓ rendered ${inPath} → ${outPath}  (${png.byteLength.toLocaleString()} bytes)`);
}
main();
