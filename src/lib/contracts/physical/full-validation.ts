/**
 * Paradigm Infinite — Full Physical Validation (Part 6)
 * Complete validation + material specs for all modalities.
 */

import { validatePhysicalOutput } from './validation';
import { MATERIAL_SPECS, getMaterialSpec } from './materials';

export function fullPhysicalValidation(modality: string, instructions: string, material?: string): { valid: boolean; issues: string[]; recommendedMaterial: string } {
  const mat = material || getMaterialSpec(modality);
  const baseValidation = validatePhysicalOutput(modality, instructions, mat);
  const issues = [...baseValidation.issues];
  if (!MATERIAL_SPECS[modality]) issues.push('Unknown modality');
  return {
    valid: issues.length === 0,
    issues,
    recommendedMaterial: mat,
  };
}
