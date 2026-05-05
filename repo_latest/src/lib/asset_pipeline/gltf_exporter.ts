/**
 * glTF 2.0 Binary (.glb) Exporter — Zero dependencies.
 *
 * Takes mesh data (vertices, indices, normals, colors) and produces a valid
 * GLB binary that can be opened in any glTF viewer or imported into game engines.
 *
 * Follows the glTF 2.0 specification:
 *   - JSON chunk (structured header)
 *   - Binary chunk (interleaved vertex data + indices)
 */

import type { PBRMaterial } from './material_generator.js';

export interface MeshData {
  vertices: Float32Array;
  indices: Uint32Array;
  normals: Float32Array;
  colors?: Float32Array;
}

// ─── GLB Constants ───────────────────────────────────────────────────────────

const GLB_MAGIC = 0x46546C67;       // 'glTF'
const GLB_VERSION = 2;
const JSON_CHUNK_TYPE = 0x4E4F534A; // 'JSON'
const BIN_CHUNK_TYPE = 0x004E4942;  // 'BIN\0'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function padToFour(n: number): number {
  return (n + 3) & ~3;
}

function computeBoundingBox(vertices: Float32Array): { min: number[]; max: number[] } {
  const min = [Infinity, Infinity, Infinity];
  const max = [-Infinity, -Infinity, -Infinity];
  for (let i = 0; i < vertices.length; i += 3) {
    for (let j = 0; j < 3; j++) {
      if (vertices[i + j] < min[j]) min[j] = vertices[i + j];
      if (vertices[i + j] > max[j]) max[j] = vertices[i + j];
    }
  }
  return { min, max };
}

// ─── Exporter ────────────────────────────────────────────────────────────────

export function exportToGLB(mesh: MeshData, name: string = 'Paradigm Seed', material?: PBRMaterial): Uint8Array {
  const vertexCount = mesh.vertices.length / 3;
  const indexCount = mesh.indices.length;
  const hasColors = !!mesh.colors && mesh.colors.length >= vertexCount * 3;

  // ── Build binary buffer ──────────────────────────────────────────────
  // Layout: [positions][normals][colors?][indices]

  const posBytes = mesh.vertices.byteLength;
  const normBytes = mesh.normals.byteLength;
  const colorBytes = hasColors ? vertexCount * 4 * 4 : 0; // VEC4 float for colors
  const idxBytes = mesh.indices.byteLength;
  const totalBinSize = padToFour(posBytes + normBytes + colorBytes + idxBytes);

  const binBuffer = new ArrayBuffer(totalBinSize);
  const binView = new DataView(binBuffer);
  const binU8 = new Uint8Array(binBuffer);

  let offset = 0;

  // Positions (vec3 float)
  const posOffset = offset;
  binU8.set(new Uint8Array(mesh.vertices.buffer, mesh.vertices.byteOffset, posBytes), offset);
  offset += posBytes;

  // Normals (vec3 float)
  const normOffset = offset;
  binU8.set(new Uint8Array(mesh.normals.buffer, mesh.normals.byteOffset, normBytes), offset);
  offset += normBytes;

  // Colors (vec4 float, alpha = 1.0)
  let colorOffset = offset;
  if (hasColors) {
    for (let i = 0; i < vertexCount; i++) {
      const base = offset + i * 16;
      binView.setFloat32(base, mesh.colors![i * 3], true);
      binView.setFloat32(base + 4, mesh.colors![i * 3 + 1], true);
      binView.setFloat32(base + 8, mesh.colors![i * 3 + 2], true);
      binView.setFloat32(base + 12, 1.0, true);
    }
    offset += colorBytes;
  }

  // Indices (uint32)
  const idxOffset = offset;
  binU8.set(new Uint8Array(mesh.indices.buffer, mesh.indices.byteOffset, idxBytes), offset);
  offset += idxBytes;

  // ── Build JSON header ────────────────────────────────────────────────

  const { min: posMin, max: posMax } = computeBoundingBox(mesh.vertices);

  const bufferViews: any[] = [
    { buffer: 0, byteOffset: posOffset, byteLength: posBytes, target: 34962 },
    { buffer: 0, byteOffset: normOffset, byteLength: normBytes, target: 34962 },
  ];
  const accessors: any[] = [
    { bufferView: 0, componentType: 5126, count: vertexCount, type: 'VEC3', min: posMin, max: posMax },
    { bufferView: 1, componentType: 5126, count: vertexCount, type: 'VEC3' },
  ];

  const meshAttributes: Record<string, number> = { POSITION: 0, NORMAL: 1 };
  let nextAccessor = 2;

  if (hasColors) {
    bufferViews.push({ buffer: 0, byteOffset: colorOffset, byteLength: colorBytes, target: 34962 });
    accessors.push({ bufferView: nextAccessor - 1 + 1, componentType: 5126, count: vertexCount, type: 'VEC4' });
    meshAttributes.COLOR_0 = nextAccessor;
    nextAccessor++;
  }

  // Index accessor
  bufferViews.push({ buffer: 0, byteOffset: idxOffset, byteLength: idxBytes, target: 34963 });
  accessors.push({ bufferView: bufferViews.length - 1, componentType: 5125, count: indexCount, type: 'SCALAR' });
  const indexAccessor = nextAccessor;

  // Material
  const materials: any[] = [{
    name: material?.name || 'Default',
    pbrMetallicRoughness: {
      baseColorFactor: material?.baseColor || [0.7, 0.7, 0.7, 1.0],
      metallicFactor: material?.metallic ?? 0.5,
      roughnessFactor: material?.roughness ?? 0.5,
    },
    emissiveFactor: material?.emissiveFactor || [0, 0, 0],
    doubleSided: true,
  }];

  const gltfJson = {
    asset: { version: '2.0', generator: 'Paradigm GSPL Engine' },
    scene: 0,
    scenes: [{ name, nodes: [0] }],
    nodes: [{ name, mesh: 0 }],
    meshes: [{
      name,
      primitives: [{
        attributes: meshAttributes,
        indices: indexAccessor,
        material: 0,
      }],
    }],
    materials,
    accessors,
    bufferViews,
    buffers: [{ byteLength: totalBinSize }],
  };

  // ── Assemble GLB ─────────────────────────────────────────────────────

  const jsonStr = JSON.stringify(gltfJson);
  const jsonBytes = new TextEncoder().encode(jsonStr);
  const jsonPadded = padToFour(jsonBytes.length);

  const totalSize = 12 + 8 + jsonPadded + 8 + totalBinSize;
  const glb = new ArrayBuffer(totalSize);
  const view = new DataView(glb);
  const u8 = new Uint8Array(glb);

  // GLB header (12 bytes)
  view.setUint32(0, GLB_MAGIC, true);
  view.setUint32(4, GLB_VERSION, true);
  view.setUint32(8, totalSize, true);

  // JSON chunk
  view.setUint32(12, jsonPadded, true);
  view.setUint32(16, JSON_CHUNK_TYPE, true);
  u8.set(jsonBytes, 20);
  // Pad with spaces (0x20)
  for (let i = jsonBytes.length; i < jsonPadded; i++) u8[20 + i] = 0x20;

  // BIN chunk
  const binChunkOffset = 20 + jsonPadded;
  view.setUint32(binChunkOffset, totalBinSize, true);
  view.setUint32(binChunkOffset + 4, BIN_CHUNK_TYPE, true);
  u8.set(binU8, binChunkOffset + 8);

  return new Uint8Array(glb);
}

/**
 * Validate a GLB buffer has correct magic number and version.
 */
export function validateGLB(data: Uint8Array): { valid: boolean; version: number; size: number } {
  if (data.length < 12) return { valid: false, version: 0, size: 0 };
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  const magic = view.getUint32(0, true);
  const version = view.getUint32(4, true);
  const size = view.getUint32(8, true);
  return { valid: magic === GLB_MAGIC && version === 2, version, size };
}
