/**
 * Robotics Generator — produces GLTF robots
 * Enhanced with detailed 3D robot models and PBR materials
 */

import * as THREE from 'three';
import { exportGLTF } from './gltf-exporter';
import * as fs from 'fs';
import * as path from 'path';
import type { Seed } from '../engines';

interface RoboticsParams {
  robotType: string;
  mobility: string;
  armCount: number;
  hasDetails: boolean;
  quality: 'low' | 'medium' | 'high' | 'photorealistic';
}

export async function generateRobotics3D(seed: Seed, outputPath: string): Promise<{ filePath: string; vertices: number; parts: number }> {
  const params = extractParams(seed);

  // Create robot group
  const robot = new THREE.Group();

  // Generate main body
  const body = createRobotBody(params);
  robot.add(body);

  // Add arms
  for (let i = 0; i < params.armCount; i++) {
    const arm = createRobotArm(params, i);
    robot.add(arm);
  }

  // Add mobility (legs/wheels)
  const mobility = createMobility(params);
  mobility.forEach(m => robot.add(m));

  // Add details for higher quality
  if (params.hasDetails || params.quality !== 'low') {
    const details = createRobotDetails(params);
    details.forEach(d => robot.add(d));
  }

  // Create scene and export
  const scene = new THREE.Scene();
  scene.add(robot);

  // Export to GLTF
  const gltfBuffer = await exportGLTF(scene, { binary: true });

  // Ensure output directory exists
  const dir = path.dirname(outputPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  // Write GLTF file
  const gltfPath = outputPath.replace(/\.png$/, '.gltf');
  fs.writeFileSync(gltfPath, gltfBuffer);

  // Count parts
  const partCount = 1 + params.armCount + (params.mobility === 'wheels' ? 2 : 2) + (params.hasDetails ? 3 : 0);

  return {
    filePath: gltfPath,
    vertices: body.geometry?.attributes?.position?.count || 0,
    parts: partCount
  };
}

function createRobotBody(params: RoboticsParams): THREE.Mesh {
  let geometry: THREE.BufferGeometry;

  switch (params.robotType) {
    case 'humanoid':
      geometry = new THREE.BoxGeometry(1, 2, 0.8);
      break;
    case 'drone':
      geometry = new THREE.BoxGeometry(1.5, 0.5, 1.5);
      break;
    case 'rover':
      geometry = new THREE.BoxGeometry(2, 1, 3);
      break;
    default:
      geometry = new THREE.BoxGeometry(1, 2, 0.8);
  }

  const material = getRoboticsMaterial(params.robotType, 'body');
  return new THREE.Mesh(geometry, material);
}

function createRobotArm(params: RoboticsParams, index: number): THREE.Mesh {
  const geometry = new THREE.CylinderGeometry(0.1, 0.1, 1, 8);
  const material = getRoboticsMaterial(params.robotType, 'arm');

  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(index === 0 ? -0.8 : 0.8, 0.5, 0);
  mesh.rotation.z = Math.PI / 2;

  return mesh;
}

function createMobility(params: RoboticsParams): THREE.Mesh[] {
  const parts: THREE.Mesh[] = [];

  if (params.mobility === 'wheels') {
    for (let i = 0; i < 2; i++) {
      const wheelGeometry = new THREE.CylinderGeometry(0.3, 0.3, 0.2, 16);
      wheelGeometry.rotateZ(Math.PI / 2);
      const wheelMaterial = getRoboticsMaterial(params.robotType, 'wheel');
      const wheel = new THREE.Mesh(wheelGeometry, wheelMaterial);
      wheel.position.set(i === 0 ? -0.8 : 0.8, -1, 0);
      parts.push(wheel);
    }
  } else if (params.mobility === 'legs') {
    for (let i = 0; i < 2; i++) {
      const legGeometry = new THREE.CylinderGeometry(0.15, 0.15, 1.2, 8);
      const legMaterial = getRoboticsMaterial(params.robotType, 'leg');
      const leg = new THREE.Mesh(legGeometry, legMaterial);
      leg.position.set(i === 0 ? -0.4 : 0.4, -1.6, 0);
      parts.push(leg);
    }
  }

  return parts;
}

function createRobotDetails(params: RoboticsParams): THREE.Mesh[] {
  const details: THREE.Mesh[] = [];

  // Head/sensor array
  const headGeometry = new THREE.SphereGeometry(0.3, 16, 16);
  const headMaterial = getRoboticsMaterial(params.robotType, 'sensor');
  const head = new THREE.Mesh(headGeometry, headMaterial);
  head.position.y = 1.3;
  details.push(head);

  // Antenna for drones
  if (params.robotType === 'drone') {
    const antennaGeometry = new THREE.CylinderGeometry(0.02, 0.02, 0.5, 4);
    const antennaMaterial = getRoboticsMaterial(params.robotType, 'antenna');
    const antenna = new THREE.Mesh(antennaGeometry, antennaMaterial);
    antenna.position.y = 1.8;
    details.push(antenna);
  }

  // Treads for rovers
  if (params.robotType === 'rover') {
    const treadGeometry = new THREE.BoxGeometry(2.2, 0.3, 0.4);
    const treadMaterial = getRoboticsMaterial(params.robotType, 'tread');
    for (let i = 0; i < 2; i++) {
      const tread = new THREE.Mesh(treadGeometry, treadMaterial);
      tread.position.set(0, -0.65, i === 0 ? -0.8 : 0.8);
      details.push(tread);
    }
  }

  return details;
}

function getRoboticsMaterial(robotType: string, part: string): THREE.MeshStandardMaterial {
  const materials: Record<string, Record<string, THREE.MeshStandardMaterial>> = {
    humanoid: {
      body: new THREE.MeshStandardMaterial({ color: 0xcccccc, metalness: 0.8, roughness: 0.2 }),
      arm: new THREE.MeshStandardMaterial({ color: 0x888888, metalness: 0.9, roughness: 0.1 }),
      wheel: new THREE.MeshStandardMaterial({ color: 0x333333, metalness: 0.7, roughness: 0.8 }),
      leg: new THREE.MeshStandardMaterial({ color: 0x888888, metalness: 0.9, roughness: 0.1 }),
      sensor: new THREE.MeshStandardMaterial({ color: 0x00ff00, metalness: 0.5, roughness: 0.5, emissive: 0x00ff00, emissiveIntensity: 0.5 }),
      antenna: new THREE.MeshStandardMaterial({ color: 0x333333, metalness: 0.9, roughness: 0.3 }),
      tread: new THREE.MeshStandardMaterial({ color: 0x222222, metalness: 0.6, roughness: 0.9 })
    },
    drone: {
      body: new THREE.MeshStandardMaterial({ color: 0x333333, metalness: 0.9, roughness: 0.1 }),
      arm: new THREE.MeshStandardMaterial({ color: 0x555555, metalness: 0.8, roughness: 0.2 }),
      sensor: new THREE.MeshStandardMaterial({ color: 0xff0000, metalness: 0.5, roughness: 0.5, emissive: 0xff0000, emissiveIntensity: 0.5 }),
      antenna: new THREE.MeshStandardMaterial({ color: 0x333333, metalness: 0.9, roughness: 0.3 })
    },
    rover: {
      body: new THREE.MeshStandardMaterial({ color: 0x888888, metalness: 0.7, roughness: 0.3 }),
      arm: new THREE.MeshStandardMaterial({ color: 0x666666, metalness: 0.8, roughness: 0.2 }),
      wheel: new THREE.MeshStandardMaterial({ color: 0x333333, metalness: 0.7, roughness: 0.8 }),
      tread: new THREE.MeshStandardMaterial({ color: 0x222222, metalness: 0.6, roughness: 0.9 }),
      sensor: new THREE.MeshStandardMaterial({ color: 0x00aaff, metalness: 0.5, roughness: 0.5, emissive: 0x00aaff, emissiveIntensity: 0.5 })
    }
  };

  return materials[robotType]?.[part] || materials.humanoid[part];
}

function extractParams(seed: Seed): RoboticsParams {
  const quality = seed.genes?.quality?.value || 'medium';
  let armCount = seed.genes?.armCount?.value || 2;
  if (typeof armCount === 'number' && armCount <= 1) armCount = Math.max(2, Math.floor(armCount * 10));

  return {
    robotType: seed.genes?.robotType?.value || 'humanoid',
    mobility: seed.genes?.mobility?.value || 'wheels',
    armCount,
    hasDetails: seed.genes?.hasDetails?.value !== false,
    quality: ['low', 'medium', 'high', 'photorealistic'].includes(quality) ? quality : 'medium'
  };
}
