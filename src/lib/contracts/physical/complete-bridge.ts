/**
 * Paradigm Infinite — Complete Physical Bridge (Part 6 full)
 * All modalities with validation, material DB stub, full instruction generation.
 */

import { advancedPhysicalBridge } from './advanced-bridge';
import * as fs from 'fs';
import * as path from 'path';

export interface CompletePhysicalResult {
  instructions: string;
  material: string;
  estimatedHours: number;
  validation: { valid: boolean; issues: string[] };
  sidecarPath?: string;
}

const MATERIAL_DB: Record<string, string> = {
  'cnc': 'aluminum-6061',
  'bim': 'standard-concrete',
  'molecular': 'synthetic-bio-v2',
  'stl': 'pla-filament',
  '3dprint': 'titanium-alloy',
  'pcb': 'fr4-copper',
};

export function completePhysicalBridge(
  seedId: string,
  modality: 'cnc' | 'bim' | 'molecular' | 'stl' | '3dprint' | 'pcb',
  complexity: number = 1.0
): CompletePhysicalResult {
  const base = advancedPhysicalBridge(seedId, modality, complexity, MATERIAL_DB[modality]);
  const issues: string[] = [];
  if (complexity > 4) issues.push('High complexity — manual review recommended');
  if (!MATERIAL_DB[modality]) issues.push('Unknown modality — using fallback material');

  // Add production-ready sidecar note
  const enhancedInstructions = `${base.instructions}\n\n[Paradigm Physical v2] Seed: ${seedId} | Modality: ${modality} | Complexity: ${complexity.toFixed(2)} | Reproducible via kernel hash.`;

  // Write real sidecar file next to the artifact when possible
  let sidecarPath: string | undefined;
  try {
    const artifactsDir = path.join(process.cwd(), 'artifacts', 'physical');
    fs.mkdirSync(artifactsDir, { recursive: true });
    const safeId = seedId.replace(/[^a-z0-9_-]/gi, '_');
    const sidecarFile = path.join(artifactsDir, `${safeId}-${modality}-instructions.txt`);
    fs.writeFileSync(sidecarFile, enhancedInstructions, 'utf8');
    sidecarPath = sidecarFile;
  } catch {}

  return {
    instructions: enhancedInstructions,
    material: base.material,
    estimatedHours: base.timeEstimateHours,
    validation: { valid: issues.length === 0, issues },
    sidecarPath,
  };
}
