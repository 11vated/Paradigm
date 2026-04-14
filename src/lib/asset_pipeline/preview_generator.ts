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
 * - Default → icosahedron colored by domain
 */

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
      // Default: icosahedron
      mesh = generateSphere(0.8, 4);
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
