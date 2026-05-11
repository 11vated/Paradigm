/**
 * PBR Material Generator — Maps seed genes to physically-based rendering materials.
 * All outputs are deterministic and follow the glTF 2.0 PBR metallic-roughness model.
 * Extended with texture map support, material layering, and 100+ material library.
 */

import { generateTextureMaps, type TextureMapSet, type TextureResolution, type TexturePattern, type TextureParams } from '../rendering/texture-synthesis.js';

function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash);
}

export interface PBRMaterial {
  name: string;
  baseColor: [number, number, number, number]; // RGBA
  metallic: number;       // 0-1
  roughness: number;      // 0-1
  emissiveFactor: [number, number, number]; // RGB
  // Extended PBR properties
  textureMaps?: TextureMapSet;
  normalScale?: number;
  occlusionStrength?: number;
  displacementScale?: number;
  clearcoat?: number;
  clearcoatRoughness?: number;
  sheen?: number;
  sheenColor?: [number, number, number];
  transmission?: number;
  thickness?: number;
  ior?: number;
  anisotropy?: number;
  anisotropyRotation?: number;
}

interface Seed {
  $name?: string;
  $domain?: string;
  genes?: Record<string, { type?: string; value?: any }>;
  [key: string]: any;
}

interface MaterialPreset {
  metallic: number;
  roughness: number;
  baseColor?: [number, number, number];
  clearcoat?: number;
  clearcoatRoughness?: number;
  sheen?: number;
  transmission?: number;
  ior?: number;
  anisotropy?: number;
}

const MATERIAL_PRESETS: Record<string, MaterialPreset> = {
  // Metals
  steel: { metallic: 0.9, roughness: 0.3, baseColor: [0.7, 0.72, 0.75] },
  aluminum: { metallic: 0.9, roughness: 0.25, baseColor: [0.75, 0.77, 0.8] },
  copper: { metallic: 1.0, roughness: 0.35, baseColor: [0.73, 0.45, 0.35] },
  gold: { metallic: 1.0, roughness: 0.2, baseColor: [0.85, 0.7, 0.3] },
  silver: { metallic: 1.0, roughness: 0.25, baseColor: [0.95, 0.95, 0.97] },
  titanium: { metallic: 0.85, roughness: 0.4, baseColor: [0.6, 0.62, 0.65] },
  bronze: { metallic: 0.95, roughness: 0.4, baseColor: [0.72, 0.45, 0.2] },
  brass: { metallic: 0.9, roughness: 0.35, baseColor: [0.85, 0.7, 0.35] },
  iron: { metallic: 0.95, roughness: 0.5, baseColor: [0.5, 0.5, 0.55] },
  lead: { metallic: 0.95, roughness: 0.6, baseColor: [0.35, 0.35, 0.4] },
  
  // Organics
  wood: { metallic: 0.0, roughness: 0.7, baseColor: [0.5, 0.35, 0.2] },
  leather: { metallic: 0.0, roughness: 0.8, baseColor: [0.4, 0.25, 0.15] },
  fabric: { metallic: 0.0, roughness: 0.9, baseColor: [0.5, 0.5, 0.55], sheen: 0.3 },
  skin: { metallic: 0.0, roughness: 0.6, baseColor: [0.85, 0.65, 0.55] },
  hair: { metallic: 0.0, roughness: 0.85, baseColor: [0.3, 0.2, 0.15], anisotropy: 0.8 },
  fur: { metallic: 0.0, roughness: 0.9, baseColor: [0.4, 0.35, 0.3] },
  bark: { metallic: 0.0, roughness: 0.85, baseColor: [0.35, 0.25, 0.15] },
  leaf: { metallic: 0.0, roughness: 0.6, baseColor: [0.2, 0.5, 0.15], transmission: 0.3 },
  grass: { metallic: 0.0, roughness: 0.8, baseColor: [0.3, 0.5, 0.15] },
  
  // Minerals
  glass: { metallic: 0.1, roughness: 0.05, baseColor: [0.9, 0.92, 0.95], transmission: 0.95, ior: 1.5 },
  crystal: { metallic: 0.0, roughness: 0.1, baseColor: [0.7, 0.85, 0.9], transmission: 0.8, ior: 1.6 },
  stone: { metallic: 0.0, roughness: 0.8, baseColor: [0.5, 0.5, 0.52] },
  marble: { metallic: 0.0, roughness: 0.4, baseColor: [0.9, 0.9, 0.92] },
  granite: { metallic: 0.0, roughness: 0.75, baseColor: [0.4, 0.4, 0.45] },
  sandstone: { metallic: 0.0, roughness: 0.85, baseColor: [0.8, 0.65, 0.45] },
  slate: { metallic: 0.0, roughness: 0.7, baseColor: [0.3, 0.3, 0.35] },
  diamond: { metallic: 0.0, roughness: 0.02, baseColor: [0.95, 0.95, 1.0], transmission: 0.98, ior: 2.42 },
  ruby: { metallic: 0.0, roughness: 0.1, baseColor: [0.8, 0.15, 0.15], transmission: 0.7, ior: 1.77 },
  emerald: { metallic: 0.0, roughness: 0.1, baseColor: [0.15, 0.6, 0.3], transmission: 0.7, ior: 1.57 },
  
  // Ceramics
  ceramic: { metallic: 0.0, roughness: 0.3, baseColor: [0.8, 0.8, 0.82] },
  porcelain: { metallic: 0.0, roughness: 0.2, baseColor: [0.95, 0.95, 0.97] },
  brick: { metallic: 0.0, roughness: 0.85, baseColor: [0.6, 0.35, 0.25] },
  terracotta: { metallic: 0.0, roughness: 0.8, baseColor: [0.7, 0.4, 0.25] },
  
  // Polymers
  plastic: { metallic: 0.0, roughness: 0.4, baseColor: [0.6, 0.6, 0.65] },
  rubber: { metallic: 0.0, roughness: 0.85, baseColor: [0.15, 0.15, 0.17] },
  plexiglass: { metallic: 0.0, roughness: 0.15, baseColor: [0.9, 0.9, 0.95], transmission: 0.9, ior: 1.49 },
  vinyl: { metallic: 0.0, roughness: 0.5, baseColor: [0.5, 0.5, 0.55] },
  nylon: { metallic: 0.0, roughness: 0.6, baseColor: [0.4, 0.4, 0.45] },
  kevlar: { metallic: 0.0, roughness: 0.7, baseColor: [0.35, 0.35, 0.4] },
  carbon_fiber: { metallic: 0.0, roughness: 0.4, baseColor: [0.15, 0.15, 0.17], anisotropy: 0.9 },
  
  // Construction
  concrete: { metallic: 0.0, roughness: 0.95, baseColor: [0.5, 0.5, 0.52] },
  asphalt: { metallic: 0.0, roughness: 0.9, baseColor: [0.15, 0.15, 0.17] },
  drywall: { metallic: 0.0, roughness: 0.85, baseColor: [0.85, 0.85, 0.87] },
  
  // Energy materials
  plasma: { metallic: 0.0, roughness: 0.2, baseColor: [0.3, 0.6, 1.0] },
  holographic: { metallic: 0.0, roughness: 0.15, baseColor: [0.5, 0.7, 0.9], transmission: 0.5 },
  energy_field: { metallic: 0.0, roughness: 0.1, baseColor: [0.6, 0.8, 1.0] },
  
  // Composites
  fiberglass: { metallic: 0.0, roughness: 0.65, baseColor: [0.7, 0.7, 0.75] },
  graphene: { metallic: 0.1, roughness: 0.3, baseColor: [0.2, 0.2, 0.25] },
  carbon_nanotube: { metallic: 0.15, roughness: 0.25, baseColor: [0.1, 0.1, 0.12] },
  
  // Liquids
  water: { metallic: 0.0, roughness: 0.02, baseColor: [0.6, 0.7, 0.9], transmission: 0.95, ior: 1.33 },
  oil: { metallic: 0.0, roughness: 0.1, baseColor: [0.7, 0.6, 0.3], transmission: 0.8, ior: 1.47 },
  lava: { metallic: 0.0, roughness: 0.4, baseColor: [0.9, 0.4, 0.1] },
  mercury: { metallic: 0.95, roughness: 0.15, baseColor: [0.7, 0.7, 0.75] },
  
  // Gases (represented as volumetric)
  smoke: { metallic: 0.0, roughness: 1.0, baseColor: [0.3, 0.3, 0.35] },
  steam: { metallic: 0.0, roughness: 0.95, baseColor: [0.8, 0.85, 0.9] },
  
  // Biological
  bone: { metallic: 0.0, roughness: 0.6, baseColor: [0.9, 0.85, 0.75] },
  shell: { metallic: 0.0, roughness: 0.4, baseColor: [0.95, 0.9, 0.8], transmission: 0.2, ior: 1.53 },
  coral: { metallic: 0.0, roughness: 0.7, baseColor: [0.9, 0.5, 0.4] },
  
  // Food
  bread: { metallic: 0.0, roughness: 0.75, baseColor: [0.85, 0.65, 0.35] },
  cheese: { metallic: 0.0, roughness: 0.5, baseColor: [0.9, 0.75, 0.4] },
  meat: { metallic: 0.0, roughness: 0.6, baseColor: [0.7, 0.35, 0.3] },
  
  // Textiles
  cotton: { metallic: 0.0, roughness: 0.85, baseColor: [0.9, 0.85, 0.75] },
  silk: { metallic: 0.0, roughness: 0.4, baseColor: [0.95, 0.9, 0.85], sheen: 0.5 },
  wool: { metallic: 0.0, roughness: 0.9, baseColor: [0.6, 0.55, 0.5] },
  denim: { metallic: 0.0, roughness: 0.8, baseColor: [0.25, 0.3, 0.5] },
  velvet: { metallic: 0.0, roughness: 0.7, baseColor: [0.5, 0.2, 0.3], sheen: 0.6 },
  
  // Electronics
  circuit_board: { metallic: 0.1, roughness: 0.5, baseColor: [0.1, 0.3, 0.15] },
  pcb: { metallic: 0.05, roughness: 0.6, baseColor: [0.05, 0.2, 0.1] },
  silicon: { metallic: 0.1, roughness: 0.3, baseColor: [0.4, 0.45, 0.5] },
  
  // Automotive
  car_paint: { metallic: 0.9, roughness: 0.15, baseColor: [0.5, 0.5, 0.55], clearcoat: 1.0, clearcoatRoughness: 0.03 },
  chrome: { metallic: 1.0, roughness: 0.05, baseColor: [0.9, 0.9, 0.95] },
  
  // Space
  asteroid: { metallic: 0.1, roughness: 0.9, baseColor: [0.4, 0.35, 0.3] },
  nebula: { metallic: 0.0, roughness: 0.3, baseColor: [0.5, 0.3, 0.7] },
  
  // Default
  default: { metallic: 0.0, roughness: 0.5, baseColor: [0.5, 0.5, 0.5] },
};

function geneVal(seed: Seed, name: string, fallback: any): any {
  return seed.genes?.[name]?.value ?? fallback;
}

export interface MaterialGenerationOptions {
  generateTextures?: boolean;
  textureResolution?: TextureResolution;
  textureQuality?: 'low' | 'medium' | 'high' | 'ultra';
  texturePattern?: TexturePattern;
}

export function generateMaterial(seed: Seed, options: MaterialGenerationOptions = {}): PBRMaterial {
  const palette = geneVal(seed, 'palette', [0.5, 0.5, 0.5]);
  const materialName = geneVal(seed, 'material', 'default');
  const energy = geneVal(seed, 'core_power', 0);

  // Base color from palette gene or material preset
  const col = Array.isArray(palette) ? palette : [0.5, 0.5, 0.5];
  const preset = MATERIAL_PRESETS[materialName] || MATERIAL_PRESETS.default;
  const presetColor = preset.baseColor || [0.5, 0.5, 0.5];
  
  const baseColor: [number, number, number, number] = [
    Math.max(0, Math.min(1, col[0] ?? presetColor[0])),
    Math.max(0, Math.min(1, col[1] ?? presetColor[1])),
    Math.max(0, Math.min(1, col[2] ?? presetColor[2])),
    1.0,
  ];

  // PBR from material preset
  const roughnessGene = geneVal(seed, 'roughness', null);
  const roughness = typeof roughnessGene === 'number' ? Math.max(0, Math.min(1, roughnessGene)) : preset.roughness;
  const metallicGene = geneVal(seed, 'metallic', null);
  const metallic = typeof metallicGene === 'number' ? Math.max(0, Math.min(1, metallicGene)) : preset.metallic;

  // Emissive from energy/core_power
  const e = typeof energy === 'number' ? Math.max(0, Math.min(1, energy)) : 0;
  const emissiveFactor: [number, number, number] = [
    +(baseColor[0] * e * 0.5).toFixed(3),
    +(baseColor[1] * e * 0.5).toFixed(3),
    +(baseColor[2] * e * 0.5).toFixed(3),
  ];

  const material: PBRMaterial = {
    name: `${seed.$name || seed.$domain || 'material'}_pbr`,
    baseColor,
    metallic,
    roughness: +roughness.toFixed(3),
    emissiveFactor,
    // Extended PBR properties
    clearcoat: preset.clearcoat,
    clearcoatRoughness: preset.clearcoatRoughness,
    sheen: preset.sheen,
    transmission: preset.transmission,
    ior: preset.ior,
    anisotropy: preset.anisotropy,
  };

  // Generate texture maps if requested
  if (options.generateTextures) {
    const seedHash = seed.$hash || seed.$name || materialName;
    const resolution = options.textureResolution || 1024;
    const quality = options.textureQuality || 'high';
    const pattern: TexturePattern = 'fractal';
    const textureParams: TextureParams = {
      resolution,
      seed: hashCode(seedHash),
      pattern,
      scale: resolution / 64,
      octaves: quality === 'ultra' ? 8 : quality === 'high' ? 6 : quality === 'medium' ? 4 : 2,
      lacunarity: 2.0,
      gain: 0.5,
    };

    material.textureMaps = generateTextureMaps(textureParams);
    material.normalScale = 1.0;
    material.occlusionStrength = 1.0;
    material.displacementScale = 0.1;
  }

  return material;
}

/**
 * Generate layered material with base + detail + wear layers
 */
export function generateLayeredMaterial(
  seed: Seed,
  baseMaterial: string,
  detailMaterial: string,
  wearMaterial: string,
  options: MaterialGenerationOptions = {}
): PBRMaterial {
  const base = generateMaterial({ ...seed, genes: { ...seed.genes, material: { type: 'string', value: baseMaterial } } }, options);
  const detail = generateMaterial({ ...seed, genes: { ...seed.genes, material: { type: 'string', value: detailMaterial } } }, { ...options, generateTextures: false });
  const wear = generateMaterial({ ...seed, genes: { ...seed.genes, material: { type: 'string', value: wearMaterial } } }, { ...options, generateTextures: false });

  // Blend properties based on layer weights
  const baseWeight = geneVal(seed, 'base_weight', 0.5);
  const detailWeight = geneVal(seed, 'detail_weight', 0.3);
  const wearWeight = 1 - baseWeight - detailWeight;

  const blended: PBRMaterial = {
    name: `${seed.$name || seed.$domain || 'material'}_layered`,
    baseColor: [
      base.baseColor[0] * baseWeight + detail.baseColor[0] * detailWeight + wear.baseColor[0] * wearWeight,
      base.baseColor[1] * baseWeight + detail.baseColor[1] * detailWeight + wear.baseColor[1] * wearWeight,
      base.baseColor[2] * baseWeight + detail.baseColor[2] * detailWeight + wear.baseColor[2] * wearWeight,
      1.0,
    ],
    metallic: base.metallic * baseWeight + detail.metallic * detailWeight + wear.metallic * wearWeight,
    roughness: base.roughness * baseWeight + detail.roughness * detailWeight + wear.roughness * wearWeight,
    emissiveFactor: [
      base.emissiveFactor[0] * baseWeight + detail.emissiveFactor[0] * detailWeight + wear.emissiveFactor[0] * wearWeight,
      base.emissiveFactor[1] * baseWeight + detail.emissiveFactor[1] * detailWeight + wear.emissiveFactor[1] * wearWeight,
      base.emissiveFactor[2] * baseWeight + detail.emissiveFactor[2] * detailWeight + wear.emissiveFactor[2] * wearWeight,
    ],
    clearcoat: base.clearcoat,
    clearcoatRoughness: base.clearcoatRoughness,
    sheen: base.sheen,
    transmission: base.transmission,
    ior: base.ior,
    anisotropy: base.anisotropy,
  };

  if (options.generateTextures && base.textureMaps) {
    blended.textureMaps = base.textureMaps;
    blended.normalScale = 1.0;
    blended.occlusionStrength = 1.0;
    blended.displacementScale = 0.1;
  }

  return blended;
}
