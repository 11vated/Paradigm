/**
 * Fashion Generator — produces GLTF clothing
 * Enhanced with detailed 3D garments and PBR materials
 */

import * as THREE from 'three';
import { exportGLTF } from './gltf-exporter';
import * as fs from 'fs';
import * as path from 'path';
import type { Seed } from '../engines';

interface FashionParams {
  clothingType: string;
  style: string;
  size: string;
  hasDetails: boolean;
  quality: 'low' | 'medium' | 'high' | 'photorealistic';
}

export async function generateFashion3D(seed: Seed, outputPath: string): Promise<{ filePath: string; vertices: number; garments: number }> {
  const params = extractParams(seed);

  // Create garment group
  const garment = new THREE.Group();

  // Generate main garment
  const mainGarment = createGarment(params);
  garment.add(mainGarment);

  // Add details for higher quality
  if (params.hasDetails || params.quality !== 'low') {
    const details = createGarmentDetails(params);
    details.forEach(d => garment.add(d));
  }

  // Create scene and export
  const scene = new THREE.Scene();
  scene.add(garment);

  // Export to GLTF
  const gltfBuffer = await exportGLTF(scene, { binary: true });

  // Ensure output directory exists
  const dir = path.dirname(outputPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  // Write GLTF file
  const gltfPath = outputPath.replace(/\.png$/, '.gltf');
  fs.writeFileSync(gltfPath, gltfBuffer);

  return {
    filePath: gltfPath,
    vertices: mainGarment.geometry?.attributes?.position?.count || 0,
    garments: 1 + (params.hasDetails ? 3 : 0)
  };
}

function createGarment(params: FashionParams): THREE.Mesh {
  let geometry: THREE.BufferGeometry;

  switch (params.clothingType) {
    case 'shirt':
      geometry = new THREE.CylinderGeometry(0.5, 0.5, 1.5, 16, 1, true);
      break;
    case 'pants':
      geometry = new THREE.CylinderGeometry(0.3, 0.3, 2, 16, 1, true);
      break;
    case 'dress':
      geometry = new THREE.CylinderGeometry(0.6, 0.8, 2, 16, 1, true);
      break;
    case 'jacket':
      geometry = new THREE.BoxGeometry(1.2, 1.5, 0.6);
      break;
    default:
      geometry = new THREE.CylinderGeometry(0.5, 0.5, 1.5, 16);
  }

  const material = getFashionMaterial(params.style, params.clothingType);
  return new THREE.Mesh(geometry, material);
}

function createGarmentDetails(params: FashionParams): THREE.Mesh[] {
  const details: THREE.Mesh[] = [];

  // Buttons
  if (params.clothingType === 'shirt' || params.clothingType === 'jacket') {
    for (let i = 0; i < 5; i++) {
      const buttonGeometry = new THREE.SphereGeometry(0.05, 8, 8);
      const buttonMaterial = new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: 0.8, roughness: 0.2 });
      const button = new THREE.Mesh(buttonGeometry, buttonMaterial);
      button.position.set(0, 0.5 - i * 0.3, params.clothingType === 'jacket' ? 0.31 : 0.26);
      details.push(button);
    }
  }

  // Collar for shirts
  if (params.clothingType === 'shirt') {
    const collarGeometry = new THREE.TorusGeometry(0.5, 0.1, 8, 16, Math.PI);
    const collarMaterial = getFashionMaterial(params.style, 'collar');
    const collar = new THREE.Mesh(collarGeometry, collarMaterial);
    collar.position.y = 0.75;
    collar.rotation.x = Math.PI / 2;
    details.push(collar);
  }

  // Sleeves for shirts and jackets
  if (params.clothingType === 'shirt' || params.clothingType === 'jacket') {
    for (let i = 0; i < 2; i++) {
      const sleeveGeometry = new THREE.CylinderGeometry(0.15, 0.12, 0.8, 8);
      const sleeveMaterial = getFashionMaterial(params.style, params.clothingType);
      const sleeve = new THREE.Mesh(sleeveGeometry, sleeveMaterial);
      sleeve.position.set(i === 0 ? -0.65 : 0.65, 0.4, 0);
      sleeve.rotation.z = Math.PI / 2;
      details.push(sleeve);
    }
  }

  return details;
}

function getFashionMaterial(style: string, garment: string): THREE.MeshStandardMaterial {
  const materials: Record<string, Record<string, THREE.MeshStandardMaterial>> = {
    casual: {
      shirt: new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: 0.0, roughness: 0.9 }),
      pants: new THREE.MeshStandardMaterial({ color: 0x000080, metalness: 0.0, roughness: 0.8 }),
      dress: new THREE.MeshStandardMaterial({ color: 0xff69b4, metalness: 0.0, roughness: 0.9 }),
      jacket: new THREE.MeshStandardMaterial({ color: 0x8b4513, metalness: 0.1, roughness: 0.8 }),
      collar: new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: 0.0, roughness: 0.9 })
    },
    formal: {
      shirt: new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: 0.0, roughness: 0.7 }),
      pants: new THREE.MeshStandardMaterial({ color: 0x000000, metalness: 0.0, roughness: 0.8 }),
      dress: new THREE.MeshStandardMaterial({ color: 0x000000, metalness: 0.1, roughness: 0.7 }),
      jacket: new THREE.MeshStandardMaterial({ color: 0x000000, metalness: 0.1, roughness: 0.7 }),
      collar: new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: 0.0, roughness: 0.7 })
    },
    sport: {
      shirt: new THREE.MeshStandardMaterial({ color: 0x00ff00, metalness: 0.0, roughness: 1.0 }),
      pants: new THREE.MeshStandardMaterial({ color: 0x0000ff, metalness: 0.0, roughness: 1.0 }),
      dress: new THREE.MeshStandardMaterial({ color: 0xff00ff, metalness: 0.0, roughness: 1.0 }),
      jacket: new THREE.MeshStandardMaterial({ color: 0xff0000, metalness: 0.1, roughness: 0.9 }),
      collar: new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: 0.0, roughness: 1.0 })
    }
  };

  return materials[style]?.[garment] || materials.casual[garment];
}

function extractParams(seed: Seed): FashionParams {
  const quality = seed.genes?.quality?.value || 'medium';

  return {
    clothingType: seed.genes?.clothingType?.value || 'shirt',
    style: seed.genes?.style?.value || 'casual',
    size: seed.genes?.size?.value || 'M',
    hasDetails: seed.genes?.hasDetails?.value !== false,
    quality: ['low', 'medium', 'high', 'photorealistic'].includes(quality) ? quality : 'medium'
  };
}
