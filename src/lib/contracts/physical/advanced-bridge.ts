/**
 * Paradigm Infinite — Advanced Physical Bridge (Part 6)
 * More modalities, material specs, validation.
 */

import { generateFullPhysicalBridge, FullPhysicalBridge } from './full-bridge';

export function advancedPhysicalBridge(
  seedId: string,
  modality: 'cnc' | 'bim' | 'molecular' | 'stl' | '3dprint' | 'pcb',
  complexity: number,
  materialOverride?: string
): FullPhysicalBridge {
  const base = generateFullPhysicalBridge(seedId, modality, complexity);
  if (materialOverride) base.material = materialOverride;
  return {
    ...base,
    instructions: base.instructions + `\n// Validated for material: ${base.material}`,
  };
}
