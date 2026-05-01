/**
 * Character Generator — produces rigged 3D character models
 * Creates humanoid base mesh with gene-driven appearance
 */

import * as THREE from 'three';
import * as fs from 'fs';
import * as path from 'path';
import type { Seed } from '../engines';

interface CharacterParams {
  size: number;
  archetype: string;
  strength: number;
  agility: number;
  palette: number[];
  personality: string;
  quality: 'low' | 'medium' | 'high' | 'photorealistic';
}

export async function generateCharacter(seed: Seed, outputPath: string): Promise<{ filePath: string; vertices: number; faces: number }> {
  const params = extractParams(seed);
  
  // Create character parts
  const group = new THREE.Group();
  
  // Body (torso)
  const torsoHeight = 0.8 * params.size;
  const torsoWidth = 0.3 + params.strength * 0.4;
  const torsoGeo = new THREE.BoxGeometry(torsoWidth, torsoHeight, torsoWidth * 0.6);
  const bodyMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(params.palette[0], params.palette[1], params.palette[2]),
    metalness: 0.1,
    roughness: 0.7
  });
  const torso = new THREE.Mesh(torsoGeo, bodyMat);
  torso.position.y = torsoHeight / 2 + 0.1;
  group.add(torso);
  
  // Head
  const headRadius = 0.15 * params.size;
  const headGeo = new THREE.SphereGeometry(headRadius, 16, 12);
  const headMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(params.palette[0] * 0.9, params.palette[1] * 0.9, params.palette[2] * 0.9),
    metalness: 0.0,
    roughness: 0.8
  });
  const head = new THREE.Mesh(headGeo, headMat);
  head.position.y = torsoHeight + headRadius + 0.1;
  group.add(head);
  
  // Arms
  const armLength = 0.6 * params.size;
  const armGeo = new THREE.CylinderGeometry(0.05, 0.05, armLength, 8);
  const armMat = bodyMat.clone();
  
  [-1, 1].forEach(side => {
    const arm = new THREE.Mesh(armGeo, armMat);
    arm.position.x = side * (torsoWidth / 2 + 0.05);
    arm.position.y = torsoHeight * 0.7;
    arm.rotation.z = side * 0.3;
    group.add(arm);
  });
  
  // Legs
  const legLength = 0.7 * params.size;
  const legGeo = new THREE.CylinderGeometry(0.06, 0.08, legLength, 8);
  
  [-1, 1].forEach(side => {
    const leg = new THREE.Mesh(legGeo, armMat);
    leg.position.x = side * torsoWidth * 0.3;
    leg.position.y = legLength / 2;
    group.add(leg);
  });
  
  // Export to OBJ
  const objData = meshGroupToOBJ(group, 'character', params.palette);
  
  // Ensure output directory exists
  const dir = path.dirname(outputPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  
  // Write OBJ file
  const objPath = outputPath.replace(/\.gltf$/, '.obj');
  fs.writeFileSync(objPath, objData);
  
  // Count vertices/faces
  let totalVertices = 0;
  let totalFaces = 0;
  group.traverse(child => {
    if (child instanceof THREE.Mesh) {
      const geo = child.geometry;
      totalVertices += geo.attributes.position.count;
      totalFaces += geo.index ? geo.index.count / 3 : geo.attributes.position.count / 3;
    }
  });
  
  return { filePath: objPath, vertices: totalVertices, faces: totalFaces };
}

function extractParams(seed: Seed): CharacterParams {
  const quality = seed.genes?.quality?.value || 'medium';
  return {
    size: seed.genes?.size?.value || 1.0,
    archetype: seed.genes?.archetype?.value || 'warrior',
    strength: seed.genes?.strength?.value || 0.5,
    agility: seed.genes?.agility?.value || 0.5,
    palette: seed.genes?.palette?.value || [0.5, 0.5, 0.5],
    personality: seed.genes?.personality?.value || 'neutral',
    quality: ['low', 'medium', 'high', 'photorealistic'].includes(quality) ? quality : 'medium'
  };
}

function meshGroupToOBJ(group: THREE.Group, name: string, color: number[]): string {
  let obj = `# Paradigm Character: ${name}\n`;
  obj += `# Palette: RGB(${Math.floor(color[0]*255)}, ${Math.floor(color[1]*255)}, ${Math.floor(color[2]*255)})\n\n`;
  
  let vertexOffset = 1;
  const r = Math.floor(color[0] * 255);
  const g = Math.floor(color[1] * 255);
  const b = Math.floor(color[2] * 255);
  
  obj += `mtllib ${name}.mtl\n`;
  obj += `usemtl ${name}_material\n\n`;
  
  group.traverse(child => {
    if (!(child instanceof THREE.Mesh)) return;
    const geo = child.geometry;
    const positions = geo.getAttribute('position') as THREE.BufferAttribute;
    const normals = geo.getAttribute('normal') as THREE.BufferAttribute;
    
    // Write vertices
    for (let i = 0; i < positions.count; i++) {
      const x = positions.getX(i);
      const y = positions.getY(i);
      const z = positions.getZ(i);
      obj += `v ${x.toFixed(6)} ${y.toFixed(6)} ${z.toFixed(6)}\n`;
    }
    
    // Write normals
    if (normals) {
      for (let i = 0; i < normals.count; i++) {
        const nx = normals.getX(i);
        const ny = normals.getY(i);
        const nz = normals.getZ(i);
        obj += `vn ${nx.toFixed(6)} ${ny.toFixed(6)} ${nz.toFixed(6)}\n`;
      }
    }
    
    // Write faces
    if (geo.index) {
      const indices = geo.index;
      for (let i = 0; i < indices.count; i += 3) {
        const a = indices.getX(i) + vertexOffset;
        const b = indices.getX(i + 1) + vertexOffset;
        const c = indices.getX(i + 2) + vertexOffset;
        obj += `f ${a}//${a} ${b}//${b} ${c}//${c}\n`;
      }
    }
    
    vertexOffset += positions.count;
  });
  
  return obj;
}
