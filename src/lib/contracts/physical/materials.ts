/**
 * Paradigm Infinite — Physical Materials DB (Part 6)
 * Expanded material specs for all modalities.
 */

export const MATERIAL_SPECS: Record<string, { base: string; variants: string[]; notes: string }> = {
  cnc: { base: 'aluminum-6061', variants: ['steel', 'titanium'], notes: 'CNC milling standard' },
  bim: { base: 'concrete', variants: ['steel-rebar', 'wood'], notes: 'Building construction' },
  molecular: { base: 'synthetic-bio-v2', variants: ['dna', 'protein'], notes: 'Bio-synthesis' },
  stl: { base: 'pla', variants: ['abs', 'petg'], notes: '3D printing filament' },
  '3dprint': { base: 'titanium', variants: ['carbon', 'ceramic'], notes: 'Advanced additive' },
  pcb: { base: 'fr4-copper', variants: ['flex', 'aluminum'], notes: 'Electronics' },
};

export function getMaterialSpec(modality: string, variant?: string) {
  const spec = MATERIAL_SPECS[modality] || { base: 'unknown', variants: [], notes: '' };
  return variant && spec.variants.includes(variant) ? variant : spec.base;
}
