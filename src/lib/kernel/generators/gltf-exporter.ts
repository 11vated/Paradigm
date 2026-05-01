/**
 * GLTF Exporter Utility
 * Exports Three.js scenes to GLTF 2.0 format with PBR materials
 */

import * as THREE from 'three';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter';

export interface GLTFExportOptions {
  binary?: boolean;
  trs?: boolean;
  onlyVisible?: boolean;
  embedImages?: boolean;
}

export async function exportGLTF(
  scene: THREE.Scene | THREE.Group,
  options: GLTFExportOptions = {}
): Promise<Buffer> {
  const exporter = new GLTFExporter();
  
  return new Promise((resolve, reject) => {
    exporter.parse(
      scene,
      (result) => {
        if (options.binary && result instanceof ArrayBuffer) {
          resolve(Buffer.from(result));
        } else if (typeof result === 'object') {
          const json = JSON.stringify(result);
          resolve(Buffer.from(json));
        } else {
          reject(new Error('Invalid GLTF export result'));
        }
      },
      (error) => reject(error),
      {
        binary: options.binary ?? true,
        trs: options.trs ?? false,
        onlyVisible: options.onlyVisible ?? true,
        embedImages: options.embedImages ?? true,
      }
    );
  });
}

export function createPBRMaterial(params: {
  color: number[];
  metalness: number;
  roughness: number;
  emissive?: number[];
}): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color: new THREE.Color(params.color[0], params.color[1], params.color[2]),
    metalness: params.metalness,
    roughness: params.roughness,
    emissive: params.emissive 
      ? new THREE.Color(params.emissive[0], params.emissive[1], params.emissive[2])
      : new THREE.Color(0, 0, 0),
  });
}
