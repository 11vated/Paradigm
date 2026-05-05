/**
 * Geometry3D Generator — produces GLTF 2.0 files from seed genes
 * Creates 3D meshes with PBR materials and exports to GLTF 2.0 (binary)
 */

import * as THREE from 'three';
import * as fs from 'fs';
import * as path from 'path';
import type { Seed } from '../engines';
import { exportGLTF, createPBRMaterial } from './gltf-exporter';

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
  
  // Create PBR material
  const material = createPBRMaterial({
    color: params.color,
    metalness: params.material === 'metal' ? 0.9 : 0.1,
    roughness: params.material === 'metal' ? 0.2 : 0.7,
  });
  
  const mesh = new THREE.Mesh(geometry, material);
  
  // Create scene for export
  const scene = new THREE.Scene();
  scene.add(mesh);
  
  // Export to GLTF 2.0 (binary)
  const gltfBuffer = await exportGLTF(scene, { binary: true });
  
  // Ensure output directory exists
  const dir = path.dirname(outputPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  
  // Write GLTF file
  const gltfPath = outputPath.replace(/\.obj$/, '.gltf');
  fs.writeFileSync(gltfPath, gltfBuffer);
  
  return {
    filePath: gltfPath,
    vertices: geometry.attributes.position.count,
    faces: geometry.index ? geometry.index.count / 3 : geometry.attributes.position.count / 3
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

function extractParams(seed: Seed): Geometry3DParams {
  const quality = seed.genes?.quality?.value || 'medium';
  
  return {
    primitive: seed.genes?.primitive?.value || 'sphere',
    detail: typeof seed.genes?.detail?.value === 'number' ? seed.genes.detail.value : 0.5,
    material: seed.genes?.material?.value || 'metal',
    scale: seed.genes?.scale?.value || [1, 1, 1],
    color: seed.genes?.color?.value || [0.5, 0.5, 0.5],
    quality: ['low', 'medium', 'high', 'photorealistic'].includes(quality) ? quality : 'medium'
  };
}
