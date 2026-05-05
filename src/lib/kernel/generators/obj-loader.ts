/**
 * OBJ Loader — Parses Wavefront OBJ into Three.js geometry
 * Handles vertices, normals, UVs, and faces (triangles/quads)
 * Works in browser (no Node.js fs module)
 */

import * as THREE from 'three';

export interface OBJMesh {
  name: string;
  vertices: number[];  // Flat array: [x, y, z, x, y, z, ...]
  normals: number[];    // Same format as vertices
  uvs: number[];        // Flat array: [u, v, u, v, ...]
  indices: number[];    // Triangle indices
  material?: string;     // Material name if specified
}

export interface OBJData {
  meshes: OBJMesh[];
  materialLibs: string[]; // MTL file references
}

/**
 * Parse OBJ file content into structured data
 */
export function parseOBJ(objContent: string): OBJData {
  const meshes: OBJMesh[] = [];
  const materialLibs: string[] = [];

  // Temporary arrays for current object
  let currentMesh: OBJMesh = createEmptyMesh('default');
  const vertices: THREE.Vector3[] = [];
  const normals: THREE.Vector3[] = [];
  const uvs: THREE.Vector2[] = [];

  const lines = objContent.split('\n');

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.length === 0 || trimmed.startsWith('#')) continue;

    const parts = trimmed.split(/\s+/);
    const command = parts[0];

    switch (command) {
      case 'v': // Vertex
        vertices.push(new THREE.Vector3(
          parseFloat(parts[1]),
          parseFloat(parts[2]),
          parseFloat(parts[3])
        ));
        break;

      case 'vn': // Normal
        normals.push(new THREE.Vector3(
          parseFloat(parts[1]),
          parseFloat(parts[2]),
          parseFloat(parts[3])
        ));
        break;

      case 'vt': // UV
        uvs.push(new THREE.Vector2(
          parseFloat(parts[1]),
          parseFloat(parts[2])
        ));
        break;

      case 'o': // Object name
        if (currentMesh.vertices.length > 0) {
          meshes.push(currentMesh);
        }
        currentMesh = createEmptyMesh(parts.slice(1).join(' '));
        break;

      case 'g': // Group (treat as new mesh)
        if (currentMesh.vertices.length > 0) {
          meshes.push(currentMesh);
        }
        currentMesh = createEmptyMesh(parts.slice(1).join(' '));
        break;

      case 'usemtl': // Use material
        currentMesh.material = parts[1];
        break;

      case 'mtllib': // Material library
        materialLibs.push(parts[1]);
        break;

      case 'f': // Face
        parseFace(parts, vertices, normals, uvs, currentMesh);
        break;
    }
  }

  // Push last mesh
  if (currentMesh.vertices.length > 0) {
    meshes.push(currentMesh);
  }

  return { meshes, materialLibs };
}

/**
 * Parse face line (supports v, v/vt, v/vt/vn, v//vn formats)
 */
function parseFace(
  parts: string[],
  vertices: THREE.Vector3[],
  normals: THREE.Vector3[],
  uvs: THREE.Vector2[],
  mesh: OBJMesh
): void {
  const faceIndices: { v: number; vt?: number; vn?: number }[] = [];

  // Parse each vertex index
  for (let i = 1; i < parts.length; i++) {
    const indices = parts[i].split('/');
    const vIdx = parseInt(indices[0]) - 1; // OBJ is 1-based

    const entry: { v: number; vt?: number; vn?: number } = { v: vIdx };

    if (indices.length > 1 && indices[1] !== '') {
      entry.vt = parseInt(indices[1]) - 1;
    }

    if (indices.length > 2) {
      entry.vn = parseInt(indices[2]) - 1;
    }

    faceIndices.push(entry);
  }

  // Triangulate (assume convex polygon)
  if (faceIndices.length < 3) return;

  for (let i = 1; i < faceIndices.length - 1; i++) {
    // Triangle: 0, i, i+1
    addTriangle(faceIndices[0], faceIndices[i], faceIndices[i + 1], vertices, normals, uvs, mesh);
  }
}

/**
 * Add triangle to mesh
 */
function addTriangle(
  a: { v: number; vt?: number; vn?: number },
  b: { v: number; vt?: number; vn?: number },
  c: { v: number; vt?: number; vn?: number },
  vertices: THREE.Vector3[],
  normals: THREE.Vector3[],
  uvs: THREE.Vector2[],
  mesh: OBJMesh
): void {
  // Get or calculate base index
  const baseIdx = mesh.vertices.length / 3;

  // Vertex positions
  const va = vertices[a.v];
  const vb = vertices[b.v];
  const vc = vertices[c.v];

  mesh.vertices.push(va.x, va.y, va.z);
  mesh.vertices.push(vb.x, vb.y, vb.z);
  mesh.vertices.push(vc.x, vc.y, vc.z);

  // Normals
  if (a.vn !== undefined && b.vn !== undefined && c.vn !== undefined) {
    const na = normals[a.vn];
    const nb = normals[b.vn];
    const nc = normals[c.vn];
    mesh.normals.push(na.x, na.y, na.z);
    mesh.normals.push(nb.x, nb.y, nb.z);
    mesh.normals.push(nc.x, nc.y, nc.z);
  } else {
    // Calculate face normal
    const cb = new THREE.Vector3().subVectors(vb, va);
    const ab = new THREE.Vector3().subVectors(vc, va);
    const normal = new THREE.Vector3().crossVectors(cb, ab).normalize();
    mesh.normals.push(normal.x, normal.y, normal.z);
    mesh.normals.push(normal.x, normal.y, normal.z);
    mesh.normals.push(normal.x, normal.y, normal.z);
  }

  // UVs
  if (a.vt !== undefined && b.vt !== undefined && c.vt !== undefined) {
    const ua = uvs[a.vt];
    const ub = uvs[b.vt];
    const uc = uvs[c.vt];
    mesh.uvs.push(ua.x, ua.y);
    mesh.uvs.push(ub.x, ub.y);
    mesh.uvs.push(uc.x, uc.y);
  }

  // Indices (for indexed geometry)
  mesh.indices.push(baseIdx, baseIdx + 1, baseIdx + 2);
}

/**
 * Create empty mesh container
 */
function createEmptyMesh(name: string): OBJMesh {
  return {
    name,
    vertices: [],
    normals: [],
    uvs: [],
    indices: []
  };
}

/**
 * Convert OBJ data to Three.js BufferGeometry
 */
export function objToBufferGeometry(objData: OBJData): THREE.BufferGeometry {
  const mergedGeo = new THREE.BufferGeometry();

  if (objData.meshes.length === 0) {
    return mergedGeo;
  }

  // If single mesh, return directly
  if (objData.meshes.length === 1) {
    return meshToGeometry(objData.meshes[0]);
  }

  // Merge multiple meshes
  const geometries: THREE.BufferGeometry[] = objData.meshes.map(m => meshToGeometry(m));

  // Simple merge (attributes must match)
  let totalVertices = 0;
  let totalIndices = 0;

  for (const geo of geometries) {
    const posAttr = geo.getAttribute('position') as THREE.BufferAttribute;
    totalVertices += posAttr.count;
    if (geo.index) {
      totalIndices += geo.index.count;
    }
  }

  const positions = new Float32Array(totalVertices * 3);
  const normals = new Float32Array(totalVertices * 3);
  const indices = new Uint32Array(totalIndices);

  let vertexOffset = 0;
  let indexOffset = 0;

  for (const geo of geometries) {
    const posAttr = geo.getAttribute('position') as THREE.BufferAttribute;
    const normAttr = geo.getAttribute('normal') as THREE.BufferAttribute;

    for (let i = 0; i < posAttr.count; i++) {
      positions[(vertexOffset + i) * 3] = posAttr.getX(i);
      positions[(vertexOffset + i) * 3 + 1] = posAttr.getY(i);
      positions[(vertexOffset + i) * 3 + 2] = posAttr.getZ(i);

      if (normAttr) {
        normals[(vertexOffset + i) * 3] = normAttr.getX(i);
        normals[(vertexOffset + i) * 3 + 1] = normAttr.getY(i);
        normals[(vertexOffset + i) * 3 + 2] = normAttr.getZ(i);
      }
    }

    if (geo.index) {
      const idxAttr = geo.index;
      for (let i = 0; i < idxAttr.count; i++) {
        indices[indexOffset + i] = idxAttr.getX(i) + vertexOffset;
      }
      indexOffset += idxAttr.count;
    }

    vertexOffset += posAttr.count;
  }

  mergedGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  mergedGeo.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
  mergedGeo.setIndex(new THREE.BufferAttribute(indices, 1));

  return mergedGeo;
}

/**
 * Convert single mesh to BufferGeometry
 */
function meshToGeometry(mesh: OBJMesh): THREE.BufferGeometry {
  const geo = new THREE.BufferGeometry();

  const positionArray = new Float32Array(mesh.vertices);
  const normalArray = new Float32Array(mesh.normals);

  geo.setAttribute('position', new THREE.BufferAttribute(positionArray, 3));
  geo.setAttribute('normal', new THREE.BufferAttribute(normalArray, 3));

  if (mesh.uvs.length > 0) {
    const uvArray = new Float32Array(mesh.uvs);
    geo.setAttribute('uv', new THREE.BufferAttribute(uvArray, 2));
  }

  if (mesh.indices.length > 0) {
    const indexArray = new Uint32Array(mesh.indices);
    geo.setIndex(new THREE.BufferAttribute(indexArray, 1));
  }

  return geo;
}

/**
 * Load OBJ from URL/fetch (browser-compatible)
 */
export async function loadOBJFromURL(url: string): Promise<THREE.BufferGeometry> {
  try {
    const response = await fetch(url);
    const text = await response.text();
    const objData = parseOBJ(text);
    return objToBufferGeometry(objData);
  } catch (e) {
    console.error('Error loading OBJ from URL:', e);
    return new THREE.BufferGeometry();
  }
}

// Remove the Node.js-specific loadOBJFromFile function
