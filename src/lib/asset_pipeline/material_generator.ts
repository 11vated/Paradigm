/**
 * PBR Material Generator — Maps seed genes to physically-based rendering materials.
 * All outputs are deterministic and follow the glTF 2.0 PBR metallic-roughness model.
 */

export interface PBRMaterial {
  name: string;
  baseColor: [number, number, number, number]; // RGBA
  metallic: number;       // 0-1
  roughness: number;      // 0-1
  emissiveFactor: [number, number, number]; // RGB
}

interface Seed {
  $name?: string;
  $domain?: string;
  genes?: Record<string, { type?: string; value?: any }>;
  [key: string]: any;
}

const MATERIAL_PRESETS: Record<string, { metallic: number; roughness: number }> = {
  metal: { metallic: 0.9, roughness: 0.3 },
  wood: { metallic: 0.0, roughness: 0.7 },
  glass: { metallic: 0.1, roughness: 0.05 },
  stone: { metallic: 0.0, roughness: 0.8 },
  plastic: { metallic: 0.0, roughness: 0.4 },
  fabric: { metallic: 0.0, roughness: 0.9 },
  ceramic: { metallic: 0.0, roughness: 0.3 },
  concrete: { metallic: 0.0, roughness: 0.95 },
  rubber: { metallic: 0.0, roughness: 0.85 },
  gold: { metallic: 1.0, roughness: 0.2 },
  silver: { metallic: 1.0, roughness: 0.25 },
  copper: { metallic: 1.0, roughness: 0.35 },
};

function geneVal(seed: Seed, name: string, fallback: any): any {
  return seed.genes?.[name]?.value ?? fallback;
}

export function generateMaterial(seed: Seed): PBRMaterial {
  const palette = geneVal(seed, 'palette', [0.5, 0.5, 0.5]);
  const materialName = geneVal(seed, 'material', 'plastic');
  const energy = geneVal(seed, 'core_power', 0);

  // Base color from palette gene
  const col = Array.isArray(palette) ? palette : [0.5, 0.5, 0.5];
  const baseColor: [number, number, number, number] = [
    Math.max(0, Math.min(1, col[0] ?? 0.5)),
    Math.max(0, Math.min(1, col[1] ?? 0.5)),
    Math.max(0, Math.min(1, col[2] ?? 0.5)),
    1.0,
  ];

  // PBR from material preset
  const preset = MATERIAL_PRESETS[materialName] || MATERIAL_PRESETS.plastic;
  const roughnessGene = geneVal(seed, 'roughness', null);
  const roughness = typeof roughnessGene === 'number' ? Math.max(0, Math.min(1, roughnessGene)) : preset.roughness;

  // Emissive from energy/core_power
  const e = typeof energy === 'number' ? Math.max(0, Math.min(1, energy)) : 0;
  const emissiveFactor: [number, number, number] = [
    +(baseColor[0] * e * 0.5).toFixed(3),
    +(baseColor[1] * e * 0.5).toFixed(3),
    +(baseColor[2] * e * 0.5).toFixed(3),
  ];

  return {
    name: `${seed.$name || seed.$domain || 'material'}_pbr`,
    baseColor,
    metallic: preset.metallic,
    roughness: +roughness.toFixed(3),
    emissiveFactor,
  };
}
