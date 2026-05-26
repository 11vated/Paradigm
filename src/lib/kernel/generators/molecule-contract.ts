import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import crypto from 'crypto';
import { generateMolecule } from './molecule';
import { registerContract } from '../quality-contract';
import type { QualityContract, QualityReport } from '../quality-contract';

interface MSeed { $hash: string; genes?: Record<string, any>; }
interface MArtifact { svg: string; pdb: string; smiles: string; formula: string; mw: number; atomCount: number; bondCount: number; }
interface MInverted { formula: string; mw: number; atomCount: number; smiles: string; }

async function synthesize(seed: MSeed): Promise<MArtifact> {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'pdgm-mol-'));
  try {
    const r = await generateMolecule(seed as any, dir) as any;
    const [svg, pdb] = await Promise.all([
      fs.readFile(r.svgPath, 'utf8').catch(() => ''),
      fs.readFile(r.pdbPath, 'utf8').catch(() => ''),
    ]);
    const meta = JSON.parse(await fs.readFile(r.jsonPath, 'utf8').catch(() => '{}'));
    return { svg, pdb, smiles: meta.smiles ?? '', formula: meta.formula ?? '', mw: meta.mw ?? 0,
      atomCount: meta.atomCount ?? 0, bondCount: meta.bondCount ?? 0 };
  } finally { await fs.rm(dir, { recursive: true, force: true }).catch(() => {}); }
}

function invert(a: MArtifact): MInverted {
  return { formula: a.formula, mw: a.mw, atomCount: a.atomCount, smiles: a.smiles };
}

function rate(a: MArtifact): QualityReport {
  const axes: Record<string, number> = {
    hasSvg:   a.svg.length  > 200 ? 1 : 0,
    hasPdb:   a.pdb.length  > 50  ? 1 : 0,
    hasSmiles: a.smiles.length > 0 ? 1 : 0,
    atomCount: Math.min(1, a.atomCount / 20),
    hasMW:    a.mw > 0 ? 1 : 0,
  };
  const score = Object.values(axes).reduce((a, b) => a + b, 0) / Object.keys(axes).length;
  return { score, axes, notes: [`${a.formula}, MW=${a.mw.toFixed(1)}, atoms=${a.atomCount}`] };
}

function hashArtifact(a: MArtifact): string {
  return crypto.createHash('sha256').update(a.smiles + a.pdb).digest('hex');
}

const CURATED = [
  { id: 'molecule-aromatic-default', name: 'Aromatic',    intent: 'Benzene-family aromatic ring',    tags: ['chemistry','aromatic'],
    seed: { $hash: 'mol-arom', genes: { moleculeClass: { value: 'aromatic' } } } as MSeed },
  { id: 'molecule-peptide-default',  name: 'Peptide',     intent: 'Short peptide chain',             tags: ['chemistry','peptide'],
    seed: { $hash: 'mol-pep',  genes: { moleculeClass: { value: 'peptide'  } } } as MSeed },
  { id: 'molecule-acyclic-default',  name: 'Acyclic',     intent: 'Acyclic organic molecule',        tags: ['chemistry','organic'],
    seed: { $hash: 'mol-acyc', genes: { moleculeClass: { value: 'organic'  } } } as MSeed },
];

export const MoleculeQualityContract: QualityContract<MSeed, MArtifact, MInverted> = {
  domain: 'molecule', version: '1.0.0', synthesize, invert, rate, curated: () => CURATED, hashArtifact,
};
registerContract(MoleculeQualityContract as any);
