/**
 * Architecture Generator — produces GLTF buildings
 * Enhanced with procedural architecture and PBR materials
 */

import * as THREE from 'three';
import { exportGLTF } from './gltf-exporter';
import * as fs from 'fs';
import * as path from 'path';
import type { Seed } from '../engines';

interface ArchitectureParams {
  buildingType: string;
  floors: number;
  footprint: [number, number];
  style: string;
  hasDetails: boolean;
  quality: 'low' | 'medium' | 'high' | 'photorealistic';
}

export async function generateArchitecture3D(seed: Seed, outputPath: string): Promise<{ filePath: string; vertices: number; materials: number }> {
  const params = extractParams(seed);

  // Create building group
  const building = new THREE.Group();

  // Generate main structure
  const structure = createMainStructure(params);
  building.add(structure);

  // Add floors
  for (let i = 0; i < params.floors; i++) {
    const floor = createFloor(params, i);
    building.add(floor);
  }

  // Add architectural details for higher quality
  if (params.hasDetails || params.quality !== 'low') {
    const details = createArchitecturalDetails(params);
    details.forEach(d => building.add(d));
  }

  // Add roof
  const roof = createRoof(params);
  building.add(roof);

  // Create scene and export
  const scene = new THREE.Scene();
  scene.add(building);

  // Export to GLTF
  const gltfBuffer = await exportGLTF(scene, { binary: true });

  // Ensure output directory exists
  const dir = path.dirname(outputPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  // Write GLTF file
  const gltfPath = outputPath.replace(/\.png$/, '.gltf');
  fs.writeFileSync(gltfPath, gltfBuffer);

  // Count materials
  let materialCount = 0;
  scene.traverse(obj => {
    if (obj instanceof THREE.Mesh && obj.material) materialCount++;
  });

  return {
    filePath: gltfPath,
    vertices: structure.geometry?.attributes?.position?.count || 0,
    materials: materialCount
  };
}

function createMainStructure(params: ArchitectureParams): THREE.Mesh {
  const [width, depth] = params.footprint;
  const height = params.floors * 3; // 3m per floor

  const geometry = new THREE.BoxGeometry(width, height, depth);
  const material = getBuildingMaterial(params.style, 'wall');

  return new THREE.Mesh(geometry, material);
}

function createFloor(params: ArchitectureParams, floorIndex: number): THREE.Mesh {
  const [width, depth] = params.footprint;
  const height = 0.3;
  const y = floorIndex * 3;

  const geometry = new THREE.BoxGeometry(width - 0.2, height, depth - 0.2);
  const material = getBuildingMaterial(params.style, 'floor');

  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.y = y;
  return mesh;
}

function createRoof(params: ArchitectureParams): THREE.Mesh {
  const [width, depth] = params.footprint;
  const roofHeight = 2;

  let geometry: THREE.BufferGeometry;
  if (params.style === 'modern') {
    geometry = new THREE.BoxGeometry(width + 0.5, roofHeight, depth + 0.5);
  } else if (params.style === 'classical') {
    geometry = new THREE.ConeGeometry(Math.max(width, depth) / 2, roofHeight * 2, 4);
  } else {
    geometry = new THREE.BoxGeometry(width + 0.5, roofHeight, depth + 0.5);
  }

  const material = getBuildingMaterial(params.style, 'roof');
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.y = params.floors * 3 + roofHeight / 2;
  return mesh;
}

function createArchitecturalDetails(params: ArchitectureParams): THREE.Mesh[] {
  const details: THREE.Mesh[] = [];
  const [width, depth] = params.footprint;

  // Windows
  for (let floor = 0; floor < params.floors; floor++) {
    for (let i = 0; i < 4; i++) {
      const windowGeometry = new THREE.PlaneGeometry(1.5, 2);
      const windowMaterial = getBuildingMaterial(params.style, 'window');
      const windowMesh = new THREE.Mesh(windowGeometry, windowMaterial);

      // Position windows on each side
      const angle = (i / 4) * Math.PI * 2;
      windowMesh.position.x = Math.cos(angle) * (width / 2 + 0.1);
      windowMesh.position.z = Math.sin(angle) * (depth / 2 + 0.1);
      windowMesh.position.y = floor * 3 + 1.5;
      windowMesh.rotation.y = angle;

      details.push(windowMesh);
    }
  }

  // Door
  const doorGeometry = new THREE.BoxGeometry(2, 3, 0.2);
  const doorMaterial = getBuildingMaterial(params.style, 'door');
  const door = new THREE.Mesh(doorGeometry, doorMaterial);
  door.position.set(0, 1.5, depth / 2 + 0.1);
  details.push(door);

  return details;
}

function getBuildingMaterial(style: string, part: string): THREE.MeshStandardMaterial {
  const materials: Record<string, Record<string, THREE.MeshStandardMaterial>> = {
    modern: {
      wall: new THREE.MeshStandardMaterial({ color: 0xcccccc, metalness: 0.1, roughness: 0.9 }),
      floor: new THREE.MeshStandardMaterial({ color: 0x888888, metalness: 0.2, roughness: 0.8 }),
      roof: new THREE.MeshStandardMaterial({ color: 0x333333, metalness: 0.5, roughness: 0.5 }),
      window: new THREE.MeshStandardMaterial({ color: 0x88ccff, metalness: 0.9, roughness: 0.1, transparent: true, opacity: 0.7 }),
      door: new THREE.MeshStandardMaterial({ color: 0x8b4513, metalness: 0.1, roughness: 0.8 })
    },
    classical: {
      wall: new THREE.MeshStandardMaterial({ color: 0xf5f5dc, metalness: 0.0, roughness: 1.0 }),
      floor: new THREE.MeshStandardMaterial({ color: 0xd2b48c, metalness: 0.1, roughness: 0.9 }),
      roof: new THREE.MeshStandardMaterial({ color: 0x8b0000, metalness: 0.2, roughness: 0.7 }),
      window: new THREE.MeshStandardMaterial({ color: 0xadd8e6, metalness: 0.8, roughness: 0.2, transparent: true, opacity: 0.6 }),
      door: new THREE.MeshStandardMaterial({ color: 0x654321, metalness: 0.1, roughness: 0.9 })
    },
    gothic: {
      wall: new THREE.MeshStandardMaterial({ color: 0x2f4f4f, metalness: 0.3, roughness: 0.7 }),
      floor: new THREE.MeshStandardMaterial({ color: 0x696969, metalness: 0.4, roughness: 0.6 }),
      roof: new THREE.MeshStandardMaterial({ color: 0x2f4f4f, metalness: 0.3, roughness: 0.7 }),
      window: new THREE.MeshStandardMaterial({ color: 0x4169e1, metalness: 0.7, roughness: 0.3, transparent: true, opacity: 0.5 }),
      door: new THREE.MeshStandardMaterial({ color: 0x3c1414, metalness: 0.2, roughness: 0.8 })
    }
  };

  return materials[style]?.[part] || materials.modern[part];
}

function extractParams(seed: Seed): ArchitectureParams {
  const quality = seed.genes?.quality?.value || 'medium';
  let floors = seed.genes?.floors?.value || 3;
  if (typeof floors === 'number' && floors <= 1) floors = Math.max(1, Math.floor(floors * 20));

  return {
    buildingType: seed.genes?.buildingType?.value || 'residential',
    floors,
    footprint: [10, 10], // Default footprint
    style: seed.genes?.style?.value || 'modern',
    hasDetails: seed.genes?.hasDetails?.value !== false,
    quality: ['low', 'medium', 'high', 'photorealistic'].includes(quality) ? quality : 'medium'
  };
}
