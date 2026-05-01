/**
 * Furniture Generator — produces GLTF furniture
 * Enhanced with detailed 3D models and PBR materials
 */

import * as THREE from 'three';
import { exportGLTF } from './gltf-exporter';
import * as fs from 'fs';
import * as path from 'path';
import type { Seed } from '../engines';

interface FurnitureParams {
  furnitureType: string;
  style: string;
  dimensions: [number, number, number];
  hasDetails: boolean;
  quality: 'low' | 'medium' | 'high' | 'photorealistic';
}

export async function generateFurniture3D(seed: Seed, outputPath: string): Promise<{ filePath: string; vertices: number; parts: number }> {
  const params = extractParams(seed);

  // Create furniture group
  const furniture = new THREE.Group();

  // Generate main furniture piece
  const mainPiece = createMainPiece(params);
  furniture.add(mainPiece);

  // Add details for higher quality
  if (params.hasDetails || params.quality !== 'low') {
    const details = createFurnitureDetails(params);
    details.forEach(d => furniture.add(d));
  }

  // Create scene and export
  const scene = new THREE.Scene();
  scene.add(furniture);

  // Export to GLTF
  const gltfBuffer = await exportGLTF(scene, { binary: true });

  // Ensure output directory exists
  const dir = path.dirname(outputPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  // Write GLTF file
  const gltfPath = outputPath.replace(/\.png$/, '.gltf');
  fs.writeFileSync(gltfPath, gltfBuffer);

  // Count parts
  let partCount = 1; // main piece
  if (params.hasDetails) partCount += 3; // details add ~3 parts

  return {
    filePath: gltfPath,
    vertices: mainPiece.geometry?.attributes?.position?.count || 0,
    parts: partCount
  };
}

function createMainPiece(params: FurnitureParams): THREE.Mesh {
  const [width, height, depth] = params.dimensions;
  
  let geometry: THREE.BufferGeometry;
  switch (params.furnitureType) {
    case 'chair':
      geometry = new THREE.BoxGeometry(width, height, depth);
      break;
    case 'table':
      geometry = new THREE.BoxGeometry(width, 0.1, depth);
      break;
    case 'sofa':
      geometry = new THREE.BoxGeometry(width, height * 0.5, depth);
      break;
    case 'bed':
      geometry = new THREE.BoxGeometry(width, 0.5, depth * 2);
      break;
    default:
      geometry = new THREE.BoxGeometry(width, height, depth);
  }

  const material = getFurnitureMaterial(params.style, 'main');
  return new THREE.Mesh(geometry, material);
}

function createFurnitureDetails(params: FurnitureParams): THREE.Mesh[] {
  const details: THREE.Mesh[] = [];
  const [width, height, depth] = params.dimensions;

  // Add legs for tables and chairs
  if (params.furnitureType === 'table' || params.furnitureType === 'chair') {
    const legPositions = [
      [-width/2 + 0.1, -height/2, -depth/2 + 0.1],
      [width/2 - 0.1, -height/2, -depth/2 + 0.1],
      [-width/2 + 0.1, -height/2, depth/2 - 0.1],
      [width/2 - 0.1, -height/2, depth/2 - 0.1]
    ];

    legPositions.forEach(pos => {
      const legGeometry = new THREE.CylinderGeometry(0.05, 0.05, height, 8);
      const legMaterial = getFurnitureMaterial(params.style, 'wood');
      const leg = new THREE.Mesh(legGeometry, legMaterial);
      leg.position.set(pos[0], pos[1], pos[2]);
      details.push(leg);
    });
  }

  // Add cushions for sofas and chairs
  if (params.furnitureType === 'sofa' || params.furnitureType === 'chair') {
    const cushionGeometry = new THREE.BoxGeometry(width * 0.9, height * 0.3, depth * 0.9);
    const cushionMaterial = getFurnitureMaterial(params.style, 'fabric');
    const cushion = new THREE.Mesh(cushionGeometry, cushionMaterial);
    cushion.position.y = height * 0.15;
    details.push(cushion);
  }

  // Add headboard for beds
  if (params.furnitureType === 'bed') {
    const headboardGeometry = new THREE.BoxGeometry(width, height * 1.5, 0.1);
    const headboardMaterial = getFurnitureMaterial(params.style, 'wood');
    const headboard = new THREE.Mesh(headboardGeometry, headboardMaterial);
    headboard.position.set(0, height * 0.75, -depth);
    details.push(headboard);
  }

  return details;
}

function getFurnitureMaterial(style: string, part: string): THREE.MeshStandardMaterial {
  const materials: Record<string, Record<string, THREE.MeshStandardMaterial>> = {
    modern: {
      main: new THREE.MeshStandardMaterial({ color: 0xcccccc, metalness: 0.1, roughness: 0.9 }),
      wood: new THREE.MeshStandardMaterial({ color: 0x8b4513, metalness: 0.0, roughness: 1.0 }),
      fabric: new THREE.MeshStandardMaterial({ color: 0x2e8b57, metalness: 0.0, roughness: 1.0 }),
      leather: new THREE.MeshStandardMaterial({ color: 0x654321, metalness: 0.1, roughness: 0.8 })
    },
    classic: {
      main: new THREE.MeshStandardMaterial({ color: 0xd2b48c, metalness: 0.0, roughness: 1.0 }),
      wood: new THREE.MeshStandardMaterial({ color: 0x8b4513, metalness: 0.0, roughness: 1.0 }),
      fabric: new THREE.MeshStandardMaterial({ color: 0xb22222, metalness: 0.0, roughness: 1.0 }),
      leather: new THREE.MeshStandardMaterial({ color: 0x3c1414, metalness: 0.1, roughness: 0.9 })
    },
    minimalist: {
      main: new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: 0.0, roughness: 0.5 }),
      wood: new THREE.MeshStandardMaterial({ color: 0xf5deb3, metalness: 0.0, roughness: 0.8 }),
      fabric: new THREE.MeshStandardMaterial({ color: 0xf0f0f0, metalness: 0.0, roughness: 0.9 }),
      leather: new THREE.MeshStandardMaterial({ color: 0x333333, metalness: 0.1, roughness: 0.7 })
    }
  };

  return materials[style]?.[part] || materials.modern[part];
}

function extractParams(seed: Seed): FurnitureParams {
  const quality = seed.genes?.quality?.value || 'medium';
  const dimensions = seed.genes?.dimensions?.value || [1, 1, 1];

  return {
    furnitureType: seed.genes?.furnitureType?.value || 'chair',
    style: seed.genes?.style?.value || 'modern',
    dimensions: Array.isArray(dimensions) && dimensions.length === 3 ? [dimensions[0], dimensions[1], dimensions[2]] : [1, 1, 1],
    hasDetails: seed.genes?.hasDetails?.value !== false,
    quality: ['low', 'medium', 'high', 'photorealistic'].includes(quality) ? quality : 'medium'
  };
}
