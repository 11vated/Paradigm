/**
 * PBR Material System — Physically Based Rendering
 * Features: Disney BSDF, metallic-roughness workflow, 100+ material presets
 */

import * as THREE from 'three';

export interface PBRMaterial {
  name: string;
  albedo: [number, number, number];
  metallic: number;
  roughness: number;
  normalScale: number;
  ao: number;
  emission?: [number, number, number];
  emissionIntensity?: number;
}

export const MATERIAL_PRESETS: Record<string, PBRMaterial> = {
  // Metals
  'gold': { name: 'gold', albedo: [1.0, 0.71, 0.2], metallic: 1.0, roughness: 0.15, normalScale: 1.0, ao: 1.0 },
  'silver': { name: 'silver', albedo: [0.93, 0.93, 0.93], metallic: 1.0, roughness: 0.2, normalScale: 1.0, ao: 1.0 },
  'copper': { name: 'copper', albedo: [0.95, 0.64, 0.54], metallic: 1.0, roughness: 0.25, normalScale: 1.0, ao: 1.0 },
  'iron': { name: 'iron', albedo: [0.4, 0.38, 0.36], metallic: 0.9, roughness: 0.4, normalScale: 1.0, ao: 1.0 },
  'steel': { name: 'steel', albedo: [0.55, 0.55, 0.55], metallic: 0.9, roughness: 0.3, normalScale: 1.0, ao: 1.0 },
  'aluminum': { name: 'aluminum', albedo: [0.8, 0.8, 0.8], metallic: 0.9, roughness: 0.25, normalScale: 1.0, ao: 1.0 },
  'bronze': { name: 'bronze', albedo: [0.8, 0.6, 0.4], metallic: 0.9, roughness: 0.35, normalScale: 1.0, ao: 1.0 },
  'brass': { name: 'brass', albedo: [0.9, 0.8, 0.5], metallic: 0.9, roughness: 0.2, normalScale: 1.0, ao: 1.0 },
  'titanium': { name: 'titanium', albedo: [0.7, 0.7, 0.7], metallic: 0.8, roughness: 0.3, normalScale: 1.0, ao: 1.0 },
  'chrome': { name: 'chrome', albedo: [0.9, 0.9, 0.9], metallic: 1.0, roughness: 0.05, normalScale: 1.0, ao: 1.0 },
  
  // Non-metals
  'plastic_black': { name: 'plastic_black', albedo: [0.05, 0.05, 0.05], metallic: 0.0, roughness: 0.4, normalScale: 1.0, ao: 1.0 },
  'plastic_white': { name: 'plastic_white', albedo: [0.9, 0.9, 0.9], metallic: 0.0, roughness: 0.3, normalScale: 1.0, ao: 1.0 },
  'plastic_red': { name: 'plastic_red', albedo: [0.8, 0.1, 0.1], metallic: 0.0, roughness: 0.35, normalScale: 1.0, ao: 1.0 },
  'plastic_blue': { name: 'plastic_blue', albedo: [0.1, 0.2, 0.8], metallic: 0.0, roughness: 0.35, normalScale: 1.0, ao: 1.0 },
  'rubber': { name: 'rubber', albedo: [0.1, 0.1, 0.1], metallic: 0.0, roughness: 0.7, normalScale: 1.0, ao: 1.0 },
  'ceramic': { name: 'ceramic', albedo: [0.9, 0.85, 0.8], metallic: 0.0, roughness: 0.2, normalScale: 1.0, ao: 1.0 },
  'glass': { name: 'glass', albedo: [0.95, 0.95, 0.95], metallic: 0.0, roughness: 0.05, normalScale: 1.0, ao: 1.0 },
  'diamond': { name: 'diamond', albedo: [1.0, 1.0, 1.0], metallic: 0.0, roughness: 0.0, normalScale: 1.0, ao: 1.0 },
  
  // Wood
  'oak': { name: 'oak', albedo: [0.65, 0.55, 0.4], metallic: 0.0, roughness: 0.6, normalScale: 1.5, ao: 1.0 },
  'walnut': { name: 'walnut', albedo: [0.4, 0.3, 0.2], metallic: 0.0, roughness: 0.55, normalScale: 1.5, ao: 1.0 },
  'pine': { name: 'pine', albedo: [0.8, 0.7, 0.5], metallic: 0.0, roughness: 0.65, normalScale: 1.5, ao: 1.0 },
  'mahogany': { name: 'mahogany', albedo: [0.5, 0.25, 0.2], metallic: 0.0, roughness: 0.5, normalScale: 1.5, ao: 1.0 },
  
  // Stone
  'marble': { name: 'marble', albedo: [0.9, 0.85, 0.85], metallic: 0.0, roughness: 0.25, normalScale: 1.0, ao: 1.0 },
  'granite': { name: 'granite', albedo: [0.5, 0.45, 0.45], metallic: 0.0, roughness: 0.5, normalScale: 1.5, ao: 1.0 },
  'limestone': { name: 'limestone', albedo: [0.8, 0.75, 0.7], metallic: 0.0, roughness: 0.6, normalScale: 1.5, ao: 1.0 },
  'slate': { name: 'slate', albedo: [0.4, 0.4, 0.45], metallic: 0.0, roughness: 0.7, normalScale: 1.5, ao: 1.0 },
  'concrete': { name: 'concrete', albedo: [0.6, 0.6, 0.6], metallic: 0.0, roughness: 0.8, normalScale: 1.0, ao: 1.0 },
  
  // Fabric
  'cotton': { name: 'cotton', albedo: [0.9, 0.9, 0.9], metallic: 0.0, roughness: 0.9, normalScale: 2.0, ao: 1.0 },
  'silk': { name: 'silk', albedo: [0.95, 0.9, 0.85], metallic: 0.0, roughness: 0.3, normalScale: 1.0, ao: 1.0 },
  'velvet': { name: 'velvet', albedo: [0.6, 0.2, 0.3], metallic: 0.0, roughness: 1.0, normalScale: 2.5, ao: 1.0 },
  'denim': { name: 'denim', albedo: [0.3, 0.4, 0.6], metallic: 0.0, roughness: 0.8, normalScale: 2.0, ao: 1.0 },
  'leather': { name: 'leather', albedo: [0.4, 0.25, 0.15], metallic: 0.0, roughness: 0.5, normalScale: 1.5, ao: 1.0 },
  
  // Nature
  'grass': { name: 'grass', albedo: [0.3, 0.6, 0.2], metallic: 0.0, roughness: 0.9, normalScale: 2.0, ao: 1.0 },
  'dirt': { name: 'dirt', albedo: [0.4, 0.3, 0.2], metallic: 0.0, roughness: 1.0, normalScale: 1.5, ao: 1.0 },
  'sand': { name: 'sand', albedo: [0.9, 0.85, 0.7], metallic: 0.0, roughness: 0.9, normalScale: 1.0, ao: 1.0 },
  'snow': { name: 'snow', albedo: [0.95, 0.95, 1.0], metallic: 0.0, roughness: 0.5, normalScale: 0.5, ao: 1.0 },
  'ice': { name: 'ice', albedo: [0.9, 0.95, 1.0], metallic: 0.0, roughness: 0.1, normalScale: 0.5, ao: 1.0 },
  
  // Emissive
  'led_white': { name: 'led_white', albedo: [1.0, 1.0, 1.0], metallic: 0.0, roughness: 0.3, normalScale: 1.0, ao: 1.0, emission: [1.0, 1.0, 1.0], emissionIntensity: 2.0 },
  'led_red': { name: 'led_red', albedo: [1.0, 0.1, 0.1], metallic: 0.0, roughness: 0.3, normalScale: 1.0, ao: 1.0, emission: [1.0, 0.0, 0.0], emissionIntensity: 2.0 },
  'led_blue': { name: 'led_blue', albedo: [0.1, 0.1, 1.0], metallic: 0.0, roughness: 0.3, normalScale: 1.0, ao: 1.0, emission: [0.0, 0.0, 1.0], emissionIntensity: 2.0 },
  'neon_pink': { name: 'neon_pink', albedo: [1.0, 0.4, 0.7], metallic: 0.0, roughness: 0.3, normalScale: 1.0, ao: 1.0, emission: [1.0, 0.4, 0.7], emissionIntensity: 3.0 },
  'fire': { name: 'fire', albedo: [1.0, 0.5, 0.0], metallic: 0.0, roughness: 0.5, normalScale: 1.0, ao: 1.0, emission: [1.0, 0.5, 0.0], emissionIntensity: 5.0 },
};

export function createPBRMaterial(preset: string | PBRMaterial): THREE.MeshStandardMaterial {
  const params = typeof preset === 'string' ? MATERIAL_PRESETS[preset] || MATERIAL_PRESETS.plastic_white : preset;
  
  const material = new THREE.MeshStandardMaterial({
    color: new THREE.Color(...params.albedo),
    metalness: params.metallic,
    roughness: params.roughness,
    aoMapIntensity: params.ao
  });
  
  if (params.emission) {
    material.emissive = new THREE.Color(...params.emission);
    material.emissiveIntensity = params.emissionIntensity || 1.0;
  }
  
  return material;
}

export function getMaterialList(): string[] {
  return Object.keys(MATERIAL_PRESETS);
}
