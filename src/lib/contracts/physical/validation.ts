/**
 * Paradigm Infinite — Physical Validation (Part 6)
 * Expanded validation for physical outputs.
 */

export function validatePhysicalOutput(modality: string, instructions: string, material: string): { valid: boolean; issues: string[] } {
  const issues: string[] = [];
  if (!instructions || instructions.length < 50) issues.push('Instructions too short');
  if (!material) issues.push('Material not specified');
  if (modality === 'molecular' && !material.includes('bio')) issues.push('Molecular requires bio material');
  return { valid: issues.length === 0, issues };
}
