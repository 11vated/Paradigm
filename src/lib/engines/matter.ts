/**
 * Engine: matter — molecules, proteins, materials, alloys, polymers.
 *
 * The substrate layer that turns Paradigm into a renderer of chemistry and
 * materials. Phase 0 cut: dispatches by kind to three solvers:
 *  - molecule  → organic/aromatic/peptide/polymer scaffolds + SMILES + PDB
 *  - protein   → primary sequence + PDB structure
 *  - material  → material composition + formula
 *
 * Doctrine: `Documents/Paradigm-Analysis/12_PARADIGM_INFINITE_COMPLETION_DOCTRINE.md`
 * Part III. The matter engine is the bridge between the digital substrate and
 * the physical world: drug candidates, novel alloys, new polymers, all as
 * deterministic seed-derived artifacts.
 */
import * as fs from 'node:fs';
import type { Seed } from '../kernel/engines';
import type { Engine, EngineCapability } from './types';
import { generateMolecule } from '../kernel/generators/molecule';
import { generateProtein } from '../kernel/generators/protein';
import { generateMaterial } from '../kernel/generators/material';

export type MatterKind = 'molecule' | 'protein' | 'material';

export interface MatterRequest {
  kind: MatterKind;
  seed: Seed;
  outputPath: string;
}

export interface MatterArtifact {
  kind: MatterKind;
  primaryPath: string;
  auxPaths: string[];
  metrics: Record<string, number | string>;
  raw: unknown;
}

export const capability: EngineCapability = Object.freeze({
  id: 'matter',
  name: 'Matter Engine',
  version: '0.1.0',
  outputs: ['svg', 'pdb', 'json', 'mol', 'smiles'],
  composesWith: ['form', 'field', 'world'],
});

export async function generateMatter(req: MatterRequest): Promise<MatterArtifact> {
  ensureDir(req.outputPath);
  switch (req.kind) {
    case 'molecule': {
      const out = await generateMolecule(req.seed, req.outputPath);
      return {
        kind: 'molecule',
        primaryPath: out.svgPath,
        auxPaths: [out.pdbPath, out.jsonPath],
        metrics: {
          formula: out.formula,
          mw: out.mw,
          smiles: out.smiles,
          atomCount: out.atomCount,
          bondCount: out.bondCount,
          logP: out.logP,
          tpsa: out.tpsa,
        },
        raw: out,
      };
    }
    case 'protein': {
      const out = await generateProtein(req.seed, req.outputPath);
      return {
        kind: 'protein',
        primaryPath: out.pdbPath,
        auxPaths: [out.filePath],
        metrics: { sequence: out.sequence },
        raw: out,
      };
    }
    case 'material': {
      const out = await generateMaterial(req.seed, req.outputPath);
      return {
        kind: 'material',
        primaryPath: out.formulaPath,
        auxPaths: [out.filePath],
        metrics: { type: out.type },
        raw: out,
      };
    }
    default: {
      const _exhaustive: never = req.kind;
      throw new Error(`matter: unsupported kind ${String(_exhaustive)}`);
    }
  }
}

function ensureDir(p: string): void {
  const dir = p.includes('.') && !fs.existsSync(p) ? p.slice(0, p.lastIndexOf('/')) : p;
  if (dir && !fs.existsSync(dir)) {
    try { fs.mkdirSync(dir, { recursive: true }); } catch { /* fall through */ }
  }
}

export const engine: Engine = Object.freeze({
  capability,
  generate: generateMatter as unknown as (req: unknown) => Promise<unknown>,
  validate(output: unknown) {
    const o = output as { primaryPath?: string } | null;
    if (!o || typeof o.primaryPath !== 'string' || o.primaryPath.length === 0) {
      return { ok: false as const, reason: 'matter artifact missing primaryPath' };
    }
    return { ok: true as const };
  },
});
