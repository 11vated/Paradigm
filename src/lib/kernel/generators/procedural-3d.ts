/**
 * Procedural Generator — produces GLTF terrain
 * Creates 3D terrain meshes with heightmaps
 */

import * as THREE from 'three';
import { exportGLTF } from './gltf-exporter';
import * as fs from 'fs';
import * as path from 'path';
import type { Seed } from '../engines';

interface ProceduralParams {
  octaves: number;
  persistence: number;
  scale: number;
  biome: string;
  heightmapSize: number;
  quality: 'low' | 'medium' | 'high' | 'photorealistic';
}

export async function generateProcedural3D(seed: Seed, outputPath: string): Promise<{ filePath: string; vertices: number; faces: number }> {
  const params = extractParams(seed);

  // Generate heightmap
  const heightmap = generateHeightmap(params);

  // Create terrain mesh from heightmap
  const geometry = createTerrainMesh(heightmap, params);

  // Apply biome-based material
  const material = createBiomeMaterial(params.biome);

  const mesh = new THREE.Mesh(geometry, material);
  const scene = new THREE.Scene();
  scene.add(mesh);

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
    vertices: geometry.attributes.position.count,
    faces: geometry.index ? geometry.index.count / 3 : geometry.attributes.position.count / 3
  };
}

function generateHeightmap(params: ProceduralParams): number[][] {
  const size = params.heightmapSize;
  const heightmap: number[][] = [];

  for (let y = 0; y < size; y++) {
    heightmap[y] = [];
    for (let x = 0; x < size; x++) {
      const nx = x / size;
      const ny = y / size;

      let value = 0;
      let amplitude = 1;
      let frequency = params.scale;

      for (let o = 0; o < params.octaves; o++) {
        value += amplitude * noise2D(nx * frequency, ny * frequency);
        amplitude *= params.persistence;
        frequency *= 2;
      }

      // Normalize to 0-1
      value = (value + 1) / 2;
      heightmap[y][x] = value;
    }
  }

  return heightmap;
}

function createTerrainMesh(heightmap: number[][], params: ProceduralParams): THREE.BufferGeometry {
  const size = heightmap.length;
  const geometry = new THREE.PlaneGeometry(size - 1, size - 1, size - 1, size - 1);

  // Adjust vertex heights based on heightmap
  const positions = geometry.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < positions.count; i++) {
    const x = Math.floor(i / size);
    const y = i % size;
    if (x < size && y < size) {
      const z = heightmap[y][x] * 5; // Scale height
      positions.setZ(i, z);
    }
  }

  geometry.computeVertexNormals();
  return geometry;
}

function createBiomeMaterial(biome: string): THREE.MeshStandardMaterial {
  const biomeColors: Record<string, [number, number, number]> = {
    desert: [0.76, 0.70, 0.50],
    snow: [0.90, 0.90, 0.95],
    temperate: [0.30, 0.70, 0.30],
    tropical: [0.20, 0.60, 0.20],
    ocean: [0.10, 0.30, 0.80]
  };

  const color = biomeColors[biome] || biomeColors.temperate;
  return new THREE.MeshStandardMaterial({
    color: new THREE.Color(color[0], color[1], color[2]),
    metalness: 0.1,
    roughness: 0.8
  });
}

function noise2D(x: number, y: number): number {
  const n = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
  return n - Math.floor(n);
}

function extractParams(seed: Seed): ProceduralParams {
  const quality = seed.genes?.quality?.value || 'medium';
  const qualitySizes: Record<string, number> = { low: 128, medium: 256, high: 512, photorealistic: 1024 };

  let octaves = seed.genes?.octaves?.value || 4;
  if (typeof octaves === 'number' && octaves <= 1) octaves = Math.max(1, Math.floor(octaves * 8));

  return {
    octaves,
    persistence: seed.genes?.persistence?.value || 0.5,
    scale: seed.genes?.scale?.value || 1.0,
    biome: seed.genes?.biome?.value || 'temperate',
    heightmapSize: qualitySizes[quality] || 256,
    quality: ['low', 'medium', 'high', 'photorealistic'].includes(quality) ? quality : 'medium'
  };
}
