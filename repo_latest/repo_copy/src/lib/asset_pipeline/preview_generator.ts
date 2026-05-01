/**
 * Domain-Specific Preview Generator
 *
 * Generates lightweight 3D meshData directly from engine artifacts,
 * bypassing the heavy QFT pipeline. Used for real-time previews.
 *
 * Each domain maps its artifact properties to procedural geometry:
 * - character → humanoid wireframe proportioned by stats
 * - geometry3d → actual primitive mesh (sphere, cube, torus)
 * - architecture → parametric building from floors/dimensions
 * - particle → point cloud from emitter config
 * - Default → Marching Cubes mesh from a seed-derived implicit field
 *   (NOT a sphere — see generateDefaultImplicitMesh below).
 */

import { marchingCubes } from './marching_cubes.js';

interface MeshData {
  vertices: number[];
  indices: number[];
  normals: number[];
  colors?: number[];
}

// ─── Primitive Generators ────────────────────────────────────────────────────

function generateSphere(radius: number, segments: number = 16): MeshData {
  const vertices: number[] = [];
  const normals: number[] = [];
  const indices: number[] = [];

  for (let lat = 0; lat <= segments; lat++) {
    const theta = (lat / segments) * Math.PI;
    const sinT = Math.sin(theta);
    const cosT = Math.cos(theta);
    for (let lon = 0; lon <= segments; lon++) {
      const phi = (lon / segments) * Math.PI * 2;
      const x = sinT * Math.cos(phi);
      const y = cosT;
      const z = sinT * Math.sin(phi);
      vertices.push(x * radius, y * radius, z * radius);
      normals.push(x, y, z);
    }
  }

  for (let lat = 0; lat < segments; lat++) {
    for (let lon = 0; lon < segments; lon++) {
      const a = lat * (segments + 1) + lon;
      const b = a + segments + 1;
      indices.push(a, b, a + 1, b, b + 1, a + 1);
    }
  }

  return { vertices, indices, normals };
}

function generateBox(w: number, h: number, d: number): MeshData {
  const hw = w / 2, hh = h / 2, hd = d / 2;
  const vertices = [
    // Front
    -hw, -hh, hd, hw, -hh, hd, hw, hh, hd, -hw, hh, hd,
    // Back
    hw, -hh, -hd, -hw, -hh, -hd, -hw, hh, -hd, hw, hh, -hd,
    // Top
    -hw, hh, hd, hw, hh, hd, hw, hh, -hd, -hw, hh, -hd,
    // Bottom
    -hw, -hh, -hd, hw, -hh, -hd, hw, -hh, hd, -hw, -hh, hd,
    // Right
    hw, -hh, hd, hw, -hh, -hd, hw, hh, -hd, hw, hh, hd,
    // Left
    -hw, -hh, -hd, -hw, -hh, hd, -hw, hh, hd, -hw, hh, -hd,
  ];
  const normals = [
    0,0,1, 0,0,1, 0,0,1, 0,0,1,
    0,0,-1, 0,0,-1, 0,0,-1, 0,0,-1,
    0,1,0, 0,1,0, 0,1,0, 0,1,0,
    0,-1,0, 0,-1,0, 0,-1,0, 0,-1,0,
    1,0,0, 1,0,0, 1,0,0, 1,0,0,
    -1,0,0, -1,0,0, -1,0,0, -1,0,0,
  ];
  const indices: number[] = [];
  for (let i = 0; i < 6; i++) {
    const o = i * 4;
    indices.push(o, o + 1, o + 2, o, o + 2, o + 3);
  }
  return { vertices, indices, normals };
}

function generateCylinder(radius: number, height: number, segments: number = 16): MeshData {
  const vertices: number[] = [];
  const normals: number[] = [];
  const indices: number[] = [];
  const hh = height / 2;

  // Side vertices
  for (let i = 0; i <= segments; i++) {
    const angle = (i / segments) * Math.PI * 2;
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;
    // Bottom
    vertices.push(x, -hh, z);
    normals.push(Math.cos(angle), 0, Math.sin(angle));
    // Top
    vertices.push(x, hh, z);
    normals.push(Math.cos(angle), 0, Math.sin(angle));
  }

  for (let i = 0; i < segments; i++) {
    const a = i * 2, b = a + 1, c = a + 2, d = a + 3;
    indices.push(a, c, b, b, c, d);
  }

  return { vertices, indices, normals };
}

// ─── Domain-Specific Generators ──────────────────────────────────────────────

function generateCharacterMesh(artifact: any): MeshData {
  const bodyW = artifact.visual?.body_width || 0.5;
  const bodyH = artifact.visual?.body_height || 0.8;
  const sizeFactor = artifact.visual?.size_factor || 1;

  // Torso
  const torso = generateBox(bodyW * sizeFactor, bodyH * sizeFactor * 0.5, bodyW * 0.6 * sizeFactor);
  // Head
  const head = generateSphere(bodyW * 0.35 * sizeFactor, 8);
  // Offset head upward
  for (let i = 1; i < head.vertices.length; i += 3) {
    head.vertices[i] += bodyH * sizeFactor * 0.45;
  }
  // Legs (two cylinders)
  const legL = generateCylinder(bodyW * 0.12 * sizeFactor, bodyH * sizeFactor * 0.5, 6);
  const legR = generateCylinder(bodyW * 0.12 * sizeFactor, bodyH * sizeFactor * 0.5, 6);
  for (let i = 0; i < legL.vertices.length; i += 3) {
    legL.vertices[i] -= bodyW * 0.2 * sizeFactor;
    legL.vertices[i + 1] -= bodyH * sizeFactor * 0.5;
    legR.vertices[i] += bodyW * 0.2 * sizeFactor;
    legR.vertices[i + 1] -= bodyH * sizeFactor * 0.5;
  }

  return combineMeshes([torso, head, legL, legR]);
}

function generateArchitectureMesh(artifact: any): MeshData {
  const floors = artifact.building?.floors || 3;
  const floorH = 0.15;
  const baseW = 0.8;
  const meshes: MeshData[] = [];

  for (let f = 0; f < floors; f++) {
    const shrink = 1 - (f / (floors + 2)) * 0.3; // Slight taper
    const floor = generateBox(baseW * shrink, floorH, baseW * shrink * 0.8);
    for (let i = 1; i < floor.vertices.length; i += 3) {
      floor.vertices[i] += f * floorH * 1.05;
    }
    meshes.push(floor);
  }

  return combineMeshes(meshes);
}

function generateGeometry3dMesh(artifact: any): MeshData {
  const prim = artifact.mesh?.primitive || 'sphere';
  const scale = artifact.mesh?.scale || [1, 1, 1];
  const sx = scale[0] || 1, sy = scale[1] || 1, sz = scale[2] || 1;
  const detail = artifact.mesh?.subdivisions || 4;

  let mesh: MeshData;
  if (prim === 'cube') {
    mesh = generateBox(sx, sy, sz);
  } else if (prim === 'cylinder') {
    mesh = generateCylinder(sx * 0.5, sy, Math.max(8, detail * 4));
  } else {
    // sphere, icosahedron, torus → sphere for now
    mesh = generateSphere(sx * 0.5, Math.max(8, detail * 2));
    // Apply non-uniform scale
    for (let i = 0; i < mesh.vertices.length; i += 3) {
      mesh.vertices[i + 1] *= sy / sx;
      mesh.vertices[i + 2] *= sz / sx;
    }
  }

  return mesh;
}

function generateParticleMesh(artifact: any): MeshData {
  const count = artifact.particles?.count || 100;
  const spread = 1.5;
  const vertices: number[] = [];
  const normals: number[] = [];
  const indices: number[] = [];

  // Generate small tetrahedra as particles
  const pointCount = Math.min(count, 200);
  for (let i = 0; i < pointCount; i++) {
    // Deterministic pseudo-random from index
    const hash = i * 2654435761;
    const x = ((hash & 0xFFF) / 0xFFF - 0.5) * spread * 2;
    const y = ((hash >> 12 & 0xFFF) / 0xFFF) * spread * 2;
    const z = ((hash >> 24 & 0xFF) / 0xFF - 0.5) * spread * 2;
    const s = 0.02; // particle size

    const base = vertices.length / 3;
    vertices.push(x, y + s, z, x - s, y - s, z + s, x + s, y - s, z + s, x, y - s, z - s);
    normals.push(0, 1, 0, -1, -1, 1, 1, -1, 1, 0, -1, -1);
    indices.push(base, base + 1, base + 2, base, base + 2, base + 3, base, base + 3, base + 1, base + 1, base + 3, base + 2);
  }

  return { vertices, indices, normals };
}

// ─── Default: seed-derived implicit mesh (kills the sphere fallback) ────────

/**
 * Deterministic 32-bit hash derived from the artifact. We avoid pulling in
 * any crypto dependency — a small xorshift mixer over a string identifier is
 * plenty for seeding "which shape do we get for this artifact?".
 *
 * Why do we need a hash at all? Because the *entire point* of Phase 4 is that
 * every seed gets its own recognizable shape instead of the same sphere. The
 * hash drives a handful of implicit-field parameters (twist, warp, radii)
 * downstream so two different artifacts never collapse onto the same mesh.
 */
function artifactHash(artifact: any): number {
  const key = `${artifact?.type ?? 'unknown'}::${artifact?.id ?? ''}::${artifact?.seed_id ?? ''}::${artifact?.name ?? ''}`;
  let h = 0x811c9dc5; // FNV-1a offset basis
  for (let i = 0; i < key.length; i++) {
    h ^= key.charCodeAt(i);
    // xorshift-style avalanche (matches 32-bit wraparound via Math.imul)
    h = Math.imul(h, 0x01000193);
  }
  // Final mix so short keys still spread across the range.
  h ^= h >>> 16;
  h = Math.imul(h, 0x7feb352d);
  h ^= h >>> 15;
  h = Math.imul(h, 0x846ca68b);
  h ^= h >>> 16;
  return h >>> 0; // to unsigned
}

/**
 * Build a scalar field from artifact-derived parameters and run Marching Cubes.
 *
 * The field is a signed-distance-ish blend of:
 *   - a central twisted-sphere SDF (gives the overall volume)
 *   - a low-frequency gyroid-like term (gives each artifact its own topology)
 *   - a small set of orbiting metaballs whose positions come from the hash
 *     (gives recognizable lobes/appendages at a glance)
 *
 * Inside is F > 0, outside is F < 0. MC extracts the level set F = 0.
 *
 * Why this recipe: we need something visually distinctive *without* running
 * the heavy QFT pipeline. A pure sphere said "nothing rendered"; this recipe
 * guarantees topology variety while staying cheap (O(N³) for N=32 ≈ 32k evals).
 */
function generateDefaultImplicitMesh(artifact: any): MeshData {
  const h = artifactHash(artifact);

  // Pull a handful of stable [0,1) reals out of the 32-bit hash.
  const r0 = ((h        & 0x3FF) / 0x3FF);
  const r1 = (((h >>> 10) & 0x3FF) / 0x3FF);
  const r2 = (((h >>> 20) & 0x3FF) / 0x3FF);
  const r3 = (((h >>> 5)  & 0x3FF) / 0x3FF);

  // Topology params: keep ranges modest so MC always finds a closed surface
  // inside the grid bounds.
  const baseRadius = 0.55 + r0 * 0.15;    // 0.55..0.70 (in grid-normalized units)
  const twist      = 0.6  + r1 * 2.2;     // 0.6..2.8
  const gyroidAmp  = 0.12 + r2 * 0.18;    // 0.12..0.30
  const gyroidFreq = 1.5  + r3 * 2.5;     // 1.5..4.0

  // Three metaballs whose positions drift with the hash — think "lobes".
  const metaballs: Array<[number, number, number, number]> = [];
  for (let i = 0; i < 3; i++) {
    const a = ((h >>> (i * 7)) & 0xFF) / 0xFF;
    const b = ((h >>> (i * 7 + 3)) & 0xFF) / 0xFF;
    const c = ((h >>> (i * 7 + 5)) & 0xFF) / 0xFF;
    const radius = 0.12 + ((h >>> (i * 5)) & 0x3F) / 0x3F * 0.08;
    metaballs.push([
      (a - 0.5) * 0.6,
      (b - 0.5) * 0.6,
      (c - 0.5) * 0.6,
      radius,
    ]);
  }

  const N = 32; // resolution — 32³ ≈ 32k field evaluations
  const field = new Float32Array(N * N * N);
  const step = 2 / (N - 1); // grid spans [-1, 1] in each axis

  for (let z = 0; z < N; z++) {
    const zw = -1 + z * step;
    for (let y = 0; y < N; y++) {
      const yw = -1 + y * step;
      // Twist makes the shape chiral — xz coords rotate about y as y varies.
      const ang = yw * twist;
      const sA = Math.sin(ang), cA = Math.cos(ang);
      for (let x = 0; x < N; x++) {
        const xw = -1 + x * step;
        // Rotated xz
        const xr = xw * cA - zw * sA;
        const zr = xw * sA + zw * cA;

        // Twisted-sphere SDF (positive inside).
        const r = Math.hypot(xr, yw, zr);
        let f = baseRadius - r;

        // Gyroid-ish term. True gyroid is sin(x)cos(y)+sin(y)cos(z)+sin(z)cos(x).
        const g =
          Math.sin(xr * gyroidFreq) * Math.cos(yw * gyroidFreq) +
          Math.sin(yw * gyroidFreq) * Math.cos(zr * gyroidFreq) +
          Math.sin(zr * gyroidFreq) * Math.cos(xr * gyroidFreq);
        f += g * gyroidAmp;

        // Metaballs add local bulges.
        for (const [mx, my, mz, mr] of metaballs) {
          const dx = xw - mx, dy = yw - my, dz = zw - mz;
          const d = Math.hypot(dx, dy, dz);
          // Soft metaball contribution: 1/(d/R)^2 clamped near the center.
          const t = Math.max(d / mr, 0.25);
          f += 0.05 / (t * t);
        }

        field[x + y * N + z * N * N] = f;
      }
    }
  }

  // MC wants the grid index form and returns Float32Array/Uint32Array.
  // Our legacy preview MeshData uses number[] — convert once here.
  const mc = marchingCubes(field, [N, N, N], {
    threshold: 0,
    scale: step,
    // Center the mesh at the world origin.
    center: [1, 1, 1],
  });

  return {
    vertices: Array.from(mc.vertices),
    indices: Array.from(mc.indices),
    normals: Array.from(mc.normals),
  };
}

// ─── Mesh Combiner ───────────────────────────────────────────────────────────

function combineMeshes(meshes: MeshData[]): MeshData {
  const vertices: number[] = [];
  const normals: number[] = [];
  const indices: number[] = [];

  let indexOffset = 0;
  for (const m of meshes) {
    vertices.push(...m.vertices);
    normals.push(...m.normals);
    for (const idx of m.indices) indices.push(idx + indexOffset);
    indexOffset += m.vertices.length / 3;
  }

  return { vertices, indices, normals };
}

// ─── Color Applicator ────────────────────────────────────────────────────────

function applyColor(mesh: MeshData, r: number, g: number, b: number): MeshData {
  const vertexCount = mesh.vertices.length / 3;
  const colors: number[] = [];
  for (let i = 0; i < vertexCount; i++) {
    colors.push(r, g, b);
  }
  return { ...mesh, colors };
}

// ─── Public API ──────────────────────────────────────────────────────────────

export function generatePreviewMesh(artifact: any): MeshData | null {
  if (!artifact || !artifact.type) return null;

  let mesh: MeshData;

  switch (artifact.type) {
    case 'character':
      mesh = generateCharacterMesh(artifact);
      break;
    case 'architecture':
      mesh = generateArchitectureMesh(artifact);
      break;
    case 'geometry3d':
      mesh = generateGeometry3dMesh(artifact);
      break;
    case 'particle':
      mesh = generateParticleMesh(artifact);
      break;
    default:
      // Seed-derived implicit surface via Marching Cubes.
      // Phase 4 killed the old `generateSphere(0.8, 4)` fallback: every
      // unknown/unmapped artifact now gets its own distinctive topology
      // driven by a deterministic hash of its identity.
      mesh = generateDefaultImplicitMesh(artifact);
      break;
  }

  // Apply domain color from artifact visual if available
  if (artifact.visual?.color) {
    const match = artifact.visual.color.match(/rgb\((\d+),(\d+),(\d+)\)/);
    if (match) {
      mesh = applyColor(mesh, +match[1] / 255, +match[2] / 255, +match[3] / 255);
    }
  }

  return mesh;
}
