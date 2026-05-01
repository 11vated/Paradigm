/**
 * Geometry3D Generator — produces actual OBJ files from seed genes
 * Creates 3D meshes and exports to OBJ format (universal 3D format)
 */

import * as THREE from 'three';
import * as fs from 'fs';
import * as path from 'path';
import type { Seed } from '../engines';

interface Geometry3DParams {
  primitive: string;
  detail: number;
  material: string;
  scale: [number, number, number];
  color: number[];
  quality: 'low' | 'medium' | 'high' | 'photorealistic';
}

export async function generateGeometry3D(seed: Seed, outputPath: string): Promise<{ filePath: string; vertices: number; faces: number }> {
  const params = extractParams(seed);
  
  // Create geometry based on primitive type
  let geometry: THREE.BufferGeometry;
  
  const segments = getDetailSegments(params.detail, params.quality);
  
  switch (params.primitive) {
    case 'sphere':
      geometry = new THREE.SphereGeometry(1, segments[0], segments[1]);
      break;
    case 'cube':
    case 'box':
      geometry = new THREE.BoxGeometry(1, 1, 1, segments[0], segments[1], segments[2]);
      break;
    case 'cylinder':
      geometry = new THREE.CylinderGeometry(1, 1, 1, segments[0], segments[1]);
      break;
    case 'cone':
      geometry = new THREE.ConeGeometry(1, 1, segments[0], segments[1]);
      break;
    case 'torus':
      geometry = new THREE.TorusGeometry(1, 0.4, segments[0], segments[1]);
      break;
    default:
      geometry = new THREE.SphereGeometry(1, segments[0], segments[1]);
  }
  
  // Apply scale
  geometry.scale(...params.scale);
  
  // Export to OBJ
  const objData = geometryToOBJ(geometry, params.material, params.color);
  
  // Ensure output directory exists
  const dir = path.dirname(outputPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  
  // Change extension to .obj
  const objPath = outputPath.replace(/\.gltf$/, '.obj');
  
  // Write OBJ file
  fs.writeFileSync(objPath, objData);
  
  return {
    filePath: objPath,
    vertices: geometry.attributes.position.count,
    faces: geometry.index ? geometry.index.count / 3 : geometry.attributes.position.count / 3
  };
}

function geometryToOBJ(geometry: THREE.BufferGeometry, material: string, color: number[]): string {
  const positions = geometry.getAttribute('position') as THREE.BufferAttribute;
  const normals = geometry.getAttribute('normal') as THREE.BufferAttribute;
  const uvs = geometry.getAttribute('uv') as THREE.BufferAttribute;
  
  let obj = '# Paradigm GSPL Generated Mesh\n';
  obj += `# Vertices: ${positions.count}, Faces: ${geometry.index ? geometry.index.count / 3 : positions.count / 3}\n`;
  obj += `# Material: ${material}\n\n`;
  
  // Material definition
  const r = Math.floor((color[0] || 0.5) * 255);
  const g = Math.floor((color[1] || 0.5) * 255);
  const b = Math.floor((color[2] || 0.5) * 255);
  obj += `mtllib mesh.mtl\n`;
  obj += `usemtl ${material}\n\n`;
  
  // Write vertices
  for (let i = 0; i < positions.count; i++) {
    const x = positions.getX(i);
    const y = positions.getY(i);
    const z = positions.getZ(i);
    obj += `v ${x.toFixed(6)} ${y.toFixed(6)} ${z.toFixed(6)}\n`;
  }
  
  // Write texture coordinates if available
  if (uvs) {
    for (let i = 0; i < uvs.count; i++) {
      const u = uvs.getX(i);
      const v = uvs.getY(i);
      obj += `vt ${u.toFixed(6)} ${v.toFixed(6)}\n`;
    }
  }
  
  // Write normals if available
  if (normals) {
    for (let i = 0; i < normals.count; i++) {
      const nx = normals.getX(i);
      const ny = normals.getY(i);
      const nz = normals.getZ(i);
      obj += `vn ${nx.toFixed(6)} ${ny.toFixed(6)} ${nz.toFixed(6)}\n`;
    }
  }
  
  // Write faces
  if (geometry.index) {
    const indices = geometry.index;
    for (let i = 0; i < indices.count; i += 3) {
      const a = indices.getX(i) + 1;
      const b = indices.getX(i + 1) + 1;
      const c = indices.getX(i + 2) + 1;
      if (uvs && normals) {
        obj += `f ${a}/${a}/${a} ${b}/${b}/${b} ${c}/${c}/${c}\n`;
      } else {
        obj += `f ${a} ${b} ${c}\n`;
      }
    }
  }
  
  return obj;
}

function extractParams(seed: Seed): Geometry3DParams {
  const quality = seed.genes?.quality?.value || 'medium';
  const detail = seed.genes?.detail?.value || 0.5;
  
  return {
    primitive: seed.genes?.primitive?.value || 'sphere',
    detail: typeof detail === 'number' ? detail : 0.5,
    material: seed.genes?.material?.value || 'metal',
    scale: seed.genes?.scale?.value || [1, 1, 1],
    color: seed.genes?.color?.value || [0.5, 0.5, 0.5],
    quality: ['low', 'medium', 'high', 'photorealistic'].includes(quality) ? quality : 'medium'
  };
}

function getDetailSegments(detail: number, quality: string): [number, number, number] {
  const qualityMultipliers: Record<string, number> = {
    low: 4,
    medium: 8,
    high: 16,
    photorealistic: 32
  };
  
  const mult = qualityMultipliers[quality] || 8;
  const segments = Math.max(3, Math.floor(detail * mult));
  return [segments, segments, segments];
}
