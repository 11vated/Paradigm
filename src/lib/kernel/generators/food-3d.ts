/**
 * Food Generator — produces GLTF 3D food models
 * Enhanced with detailed 3D food items and PBR materials
 */

import * as THREE from 'three';
import { exportGLTF } from './gltf-exporter';
import * as fs from 'fs';
import * as path from 'path';
import type { Seed } from '../engines';

interface FoodParams {
  foodType: string;
  style: string;
  size: number;
  hasDetails: boolean;
  quality: 'low' | 'medium' | 'high' | 'photorealistic';
}

export async function generateFood3D(seed: Seed, outputPath: string): Promise<{ filePath: string; vertices: number; items: number }> {
  const params = extractParams(seed);

  // Create food group
  const food = new THREE.Group();

  // Generate main food item
  const mainItem = createFoodItem(params);
  food.add(mainItem);

  // Add details for higher quality
  if (params.hasDetails || params.quality !== 'low') {
    const details = createFoodDetails(params);
    details.forEach(d => food.add(d));
  }

  // Create scene and export
  const scene = new THREE.Scene();
  scene.add(food);

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
    vertices: mainItem.geometry?.attributes?.position?.count || 0,
    items: 1 + (params.hasDetails ? 3 : 0)
  };
}

function createFoodItem(params: FoodParams): THREE.Mesh {
  let geometry: THREE.BufferGeometry;

  switch (params.foodType) {
    case 'apple':
      geometry = new THREE.SphereGeometry(params.size, 32, 32);
      break;
    case 'banana':
      geometry = new THREE.CylinderGeometry(params.size * 0.3, params.size * 0.2, params.size * 2, 8, 1, false, 0, Math.PI);
      break;
    case 'pizza':
      geometry = new THREE.CylinderGeometry(params.size, params.size, params.size * 0.2, 32);
      break;
    case 'burger':
      geometry = new THREE.CylinderGeometry(params.size, params.size, params.size * 0.8, 16);
      break;
    case 'cake':
      geometry = new THREE.CylinderGeometry(params.size * 0.8, params.size, params.size * 1.2, 16, 1, false);
      break;
    default:
      geometry = new THREE.SphereGeometry(params.size, 16, 16);
  }

  const material = getFoodMaterial(params.foodType);
  return new THREE.Mesh(geometry, material);
}

function createFoodDetails(params: FoodParams): THREE.Mesh[] {
  const details: THREE.Mesh[] = [];

  // Add stem for fruits
  if (params.foodType === 'apple' || params.foodType === 'pear') {
    const stemGeometry = new THREE.CylinderGeometry(0.03, 0.03, 0.2, 8);
    const stemMaterial = new THREE.MeshStandardMaterial({ color: 0x8B4513, metalness: 0.0, roughness: 1.0 });
    const stem = new THREE.Mesh(stemGeometry, stemMaterial);
    stem.position.y = params.size + 0.1;
    details.push(stem);
  }

  // Add toppings for pizza
  if (params.foodType === 'pizza') {
    for (let i = 0; i < 5; i++) {
      const toppingGeometry = new THREE.SphereGeometry(0.1, 8, 8);
      const toppingMaterial = new THREE.MeshStandardMaterial({ 
        color: [0xFF0000, 0x00FF00, 0xFFFF00][i % 3], 
        metalness: 0.0, 
        roughness: 0.9 
      });
      const topping = new THREE.Mesh(toppingGeometry, toppingMaterial);
      const angle = (i / 5) * Math.PI * 2;
      topping.position.set(
        Math.cos(angle) * params.size * 0.7,
        params.size * 0.2,
        Math.sin(angle) * params.size * 0.7
      );
      details.push(topping);
    }
  }

  // Add burger layers
  if (params.foodType === 'burger') {
    const layers = ['cheese', 'lettuce', 'tomato', 'patty'];
    layers.forEach((layer, i) => {
      const layerGeometry = new THREE.CylinderGeometry(params.size * 0.9, params.size * 0.9, 0.1, 16);
      const color = layer === 'cheese' ? 0xFFD700 : 
                   layer === 'lettuce' ? 0x90EE90 :
                   layer === 'tomato' ? 0xFF6347 : 0x8B4513;
      const layerMaterial = new THREE.MeshStandardMaterial({ color, metalness: 0.0, roughness: 0.9 });
      const layerMesh = new THREE.Mesh(layerGeometry, layerMaterial);
      layerMesh.position.y = -0.3 + i * 0.15;
      details.push(layerMesh);
    });
  }

  return details;
}

function getFoodMaterial(foodType: string): THREE.MeshStandardMaterial {
  const materials: Record<string, THREE.MeshStandardMaterial> = {
    apple: new THREE.MeshStandardMaterial({ color: 0xFF0000, metalness: 0.1, roughness: 0.8 }),
    banana: new THREE.MeshStandardMaterial({ color: 0xFFFF00, metalness: 0.0, roughness: 0.9 }),
    pizza: new THREE.MeshStandardMaterial({ color: 0xFFA500, metalness: 0.0, roughness: 0.9 }),
    burger: new THREE.MeshStandardMaterial({ color: 0x8B4513, metalness: 0.1, roughness: 0.8 }),
    cake: new THREE.MeshStandardMaterial({ color: 0xFFC0CB, metalness: 0.0, roughness: 0.9 }),
    default: new THREE.MeshStandardMaterial({ color: 0xFFD700, metalness: 0.0, roughness: 0.9 })
  };

  return materials[foodType] || materials.default;
}

function extractParams(seed: Seed): FoodParams {
  const quality = seed.genes?.quality?.value || 'medium';

  return {
    foodType: seed.genes?.foodType?.value || 'apple',
    style: seed.genes?.style?.value || 'realistic',
    size: typeof seed.genes?.size?.value === 'number' ? seed.genes.size.value : 1.0,
    hasDetails: seed.genes?.hasDetails?.value !== false,
    quality: ['low', 'medium', 'high', 'photorealistic'].includes(quality) ? quality : 'medium'
  };
}
