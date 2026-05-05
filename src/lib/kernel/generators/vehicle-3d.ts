/**
 * Vehicle Generator — produces GLTF vehicles
 * Enhanced with detailed 3D models and PBR materials
 */

import * as THREE from 'three';
import { exportGLTF } from './gltf-exporter';
import * as fs from 'fs';
import * as path from 'path';
import type { Seed } from '../engines';

interface VehicleParams {
  vehicleType: string;
  style: string;
  wheelCount: number;
  hasDetails: boolean;
  quality: 'low' | 'medium' | 'high' | 'photorealistic';
}

export async function generateVehicle3D(seed: Seed, outputPath: string): Promise<{ filePath: string; vertices: number; parts: number }> {
  const params = extractParams(seed);

  // Create vehicle group
  const vehicle = new THREE.Group();

  // Generate chassis
  const chassis = createChassis(params);
  vehicle.add(chassis);

  // Add wheels
  for (let i = 0; i < params.wheelCount; i++) {
    const wheel = createWheel(params, i);
    vehicle.add(wheel);
  }

  // Add details for higher quality
  if (params.hasDetails || params.quality !== 'low') {
    const details = createVehicleDetails(params);
    details.forEach(d => vehicle.add(d));
  }

  // Create scene and export
  const scene = new THREE.Scene();
  scene.add(vehicle);

  // Export to GLTF
  const gltfBuffer = await exportGLTF(scene, { binary: true });

  // Ensure output directory exists
  const dir = path.dirname(outputPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  // Write GLTF file
  const gltfPath = outputPath.replace(/\.png$/, '.gltf');
  fs.writeFileSync(gltfPath, gltfBuffer);

  // Count parts
  let partCount = 1 + params.wheelCount; // chassis + wheels
  if (params.hasDetails) partCount += 3; // details add ~3 parts

  return {
    filePath: gltfPath,
    vertices: chassis.geometry?.attributes?.position?.count || 0,
    parts: partCount
  };
}

function createChassis(params: VehicleParams): THREE.Mesh {
  let geometry: THREE.BufferGeometry;
  
  switch (params.vehicleType) {
    case 'car':
      geometry = new THREE.BoxGeometry(4, 1.5, 2);
      break;
    case 'truck':
      geometry = new THREE.BoxGeometry(6, 2.5, 2.5);
      break;
    case 'motorcycle':
      geometry = new THREE.CylinderGeometry(0.5, 0.5, 2, 16);
      break;
    case 'bicycle':
      geometry = new THREE.CylinderGeometry(0.3, 0.3, 1.5, 8);
      break;
    default:
      geometry = new THREE.BoxGeometry(4, 1.5, 2);
  }

  const material = getVehicleMaterial(params.style, 'chassis');
  return new THREE.Mesh(geometry, material);
}

function createWheel(params: VehicleParams, index: number): THREE.Mesh {
  const geometry = new THREE.CylinderGeometry(0.4, 0.4, 0.3, 16);
  geometry.rotateZ(Math.PI / 2); // Rotate to make it look like a wheel
  
  const material = getVehicleMaterial(params.style, 'wheel');
  const mesh = new THREE.Mesh(geometry, material);
  
  // Position wheels based on vehicle type and index
  const wheelSpacing = params.vehicleType === 'truck' ? 2 : 1.5;
  const side = index % 2 === 0 ? -1 : 1;
  const axel = Math.floor(index / 2);
  
  mesh.position.set(
    (axel - 0.5) * wheelSpacing,
    -0.5,
    side * (params.vehicleType === 'bicycle' ? 0.5 : 1)
  );
  
  return mesh;
}

function createVehicleDetails(params: VehicleParams): THREE.Mesh[] {
  const details: THREE.Mesh[] = [];
  
  // Headlights
  const headlightGeometry = new THREE.SphereGeometry(0.15, 8, 8);
  const headlightMaterial = new THREE.MeshStandardMaterial({ 
    color: 0xffffcc, 
    emissive: 0xffffcc, 
    emissiveIntensity: 0.5 
  });
  
  for (let i = 0; i < 2; i++) {
    const headlight = new THREE.Mesh(headlightGeometry, headlightMaterial);
    headlight.position.set(2, 0, i === 0 ? -0.7 : 0.7);
    details.push(headlight);
  }
  
  // Tail lights
  const taillightMaterial = new THREE.MeshStandardMaterial({ 
    color: 0xff0000, 
    emissive: 0xff0000, 
    emissiveIntensity: 0.5 
  });
  
  for (let i = 0; i < 2; i++) {
    const taillight = new THREE.Mesh(headlightGeometry, taillightMaterial);
    taillight.position.set(-2, 0, i === 0 ? -0.7 : 0.7);
    details.push(taillight);
  }
  
  // Windshield (for cars and trucks)
  if (params.vehicleType === 'car' || params.vehicleType === 'truck') {
    const windshieldGeometry = new THREE.PlaneGeometry(1.5, 1);
    const windshieldMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x88ccff, 
      transparent: true, 
      opacity: 0.6,
      metalness: 0.9,
      roughness: 0.1
    });
    const windshield = new THREE.Mesh(windshieldGeometry, windshieldMaterial);
    windshield.position.set(1, 0.8, 0);
    windshield.rotation.y = Math.PI / 2;
    details.push(windshield);
  }
  
  return details;
}

function getVehicleMaterial(style: string, part: string): THREE.MeshStandardMaterial {
  const materials: Record<string, Record<string, THREE.MeshStandardMaterial>> = {
    modern: {
      chassis: new THREE.MeshStandardMaterial({ color: 0x333333, metalness: 0.8, roughness: 0.2 }),
      wheel: new THREE.MeshStandardMaterial({ color: 0x111111, metalness: 0.9, roughness: 0.8 }),
      glass: new THREE.MeshStandardMaterial({ color: 0x88ccff, metalness: 0.9, roughness: 0.1, transparent: true, opacity: 0.6 })
    },
    classic: {
      chassis: new THREE.MeshStandardMaterial({ color: 0x8b4513, metalness: 0.3, roughness: 0.7 }),
      wheel: new THREE.MeshStandardMaterial({ color: 0x222222, metalness: 0.7, roughness: 0.9 }),
      glass: new THREE.MeshStandardMaterial({ color: 0xadd8e6, metalness: 0.8, roughness: 0.2, transparent: true, opacity: 0.5 })
    },
    sport: {
      chassis: new THREE.MeshStandardMaterial({ color: 0xff0000, metalness: 0.9, roughness: 0.1 }),
      wheel: new THREE.MeshStandardMaterial({ color: 0x000000, metalness: 1.0, roughness: 0.3 }),
      glass: new THREE.MeshStandardMaterial({ color: 0x00aaff, metalness: 0.95, roughness: 0.05, transparent: true, opacity: 0.4 })
    }
  };

  return materials[style]?.[part] || materials.modern[part];
}

function extractParams(seed: Seed): VehicleParams {
  const quality = seed.genes?.quality?.value || 'medium';
  let wheelCount = seed.genes?.wheelCount?.value || 4;
  if (typeof wheelCount === 'number' && wheelCount <= 1) wheelCount = Math.max(2, Math.floor(wheelCount * 8));

  return {
    vehicleType: seed.genes?.vehicleType?.value || 'car',
    style: seed.genes?.style?.value || 'modern',
    wheelCount,
    hasDetails: seed.genes?.hasDetails?.value !== false,
    quality: ['low', 'medium', 'high', 'photorealistic'].includes(quality) ? quality : 'medium'
  };
}
