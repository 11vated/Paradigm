/**
 * Drug Quality Contract.
 */
import { promises as fsp } from 'fs';
import path from 'path';
import os from 'os';
import crypto from 'crypto';
import { generateDrug } from './drug';
import { registerContract, type QualityContract, type Stratum } from '../quality-contract';

// 15_ spec integration: new contracts system available alongside legacy
import '../../contracts'; // pulls bootstrap + registry for full 27 + Part 6 (all domains + Part 6 live)
import { withKernelClock } from '../clock';

interface S { $domain: 'drug'; $name?: string; genes: any }
interface A {
  filePath: string;
  meta: any;
  previewData?: string;
  structuredData?: any;
  summary?: string;
  metrics?: Record<string, number>;
  visual?: {
    type: 'json' | 'html' | 'svg' | 'text' | 'structured';
    previewData?: string;
    structuredData?: any;
    summary?: string;
    metrics?: Record<string, number>;
  };
  emergent_assets?: {
    preview?: {
      type: 'json' | 'svg' | 'text' | 'structured';
      data?: any;
      path?: string;
    };
    sdfPath?: string;
  };
}

function hashArtifact(a: A): string {
  return crypto.createHash('sha256').update(a.filePath + JSON.stringify(a.meta)).digest('hex');
}

export const DrugQualityContract: QualityContract<S, A, any> = {
  domain: 'drug',
  version: '1.0.0',
  curated: () => [
    { id: 'drug-default', name: 'Default drug', intent: 'baseline', seed: { $domain: 'drug', $name: 'drug-default', genes: {} } },
    { id: 'drug-bright', name: 'Bright drug', intent: 'high-energy', seed: { $domain: 'drug', $name: 'drug-bright', genes: { energy: 0.9 } } },
    { id: 'drug-quiet', name: 'Quiet drug', intent: 'low-energy', seed: { $domain: 'drug', $name: 'drug-quiet', genes: { energy: 0.1 } } },
  ],
  synthesize: async (seed) => {
    const dir = await fsp.mkdtemp(path.join(os.tmpdir(), 'drug-'));
    const _out = path.join(dir, 'drug.json');
    const r = await withKernelClock(0, () => generateDrug(seed, dir));
    const jsonContent = await fsp.readFile(r.filePath, 'utf-8').catch(() => '{}');
    const sdfContent = await fsp.readFile(r.sdfPath, 'utf-8').catch(() => 'M  END');
    const atomCount = (sdfContent.match(/^[ ]*[0-9.-]+[ ]+[0-9.-]+[ ]+[0-9.-]+[ ]+[A-Za-z]/gm) || []).length;
    const bondCount = (sdfContent.match(/^[ ]*[0-9]+[ ]+[0-9]+[ ]+[0-9]/gm) || []).length;
    let parsed: any = {};
    try { parsed = JSON.parse(jsonContent); } catch { parsed = { atoms: atomCount, bonds: bondCount }; }
    const summary = `Drug ${parsed.drug?.name || 'compound'} (atoms: ${atomCount}, bonds: ${bondCount}). Affinity: ${parsed.properties?.bindingAffinity?.toFixed?.(2) || 'n/a'}`;
    const metrics: Record<string, number> = { atomCount, bondCount, bindingAffinity: parsed.properties?.bindingAffinity || 0, toxicity: parsed.properties?.toxicity || 0 };
    const previewData = jsonContent;
    return {
      filePath: jsonContent,
      meta: { sdfPath: r.sdfPath, atomCount, bondCount },
      previewData,
      structuredData: parsed,
      summary,
      metrics,
      visual: { type: 'structured' as const, previewData, structuredData: parsed, summary, metrics },
      emergent_assets: {
        preview: { type: 'structured' as const, data: { structuredData: parsed, summary, metrics }, path: r.filePath },
        sdfPath: r.sdfPath
      }
    };
  },
  invert: (a) => ({ size: (a.filePath || '').length + ((a.meta?.sdfSize as number) || 0), atoms: a.meta?.atomCount || 0, bonds: a.meta?.bondCount || 0 }),
  rate: (a) => {
    const jsonLen = (a.filePath || '').length;
    const sdfLen = (a.meta?.sdfSize as number) || 0;
    const atoms = (a.meta?.atomCount as number) || 0;
    const bonds = (a.meta?.bondCount as number) || 0;
    const sdfReal = sdfLen > 120 && /M {2}END/.test(a.filePath + (a.meta?.sdfHead as string || '')) ? 1 : 0.5;
    const molScore = Math.min(1, (atoms + bonds * 0.6) / 28);
    const sizeScore = Math.min(1, (jsonLen + sdfLen) / 14000);
    const score = molScore * 0.5 + sdfReal * 0.3 + sizeScore * 0.2;
    const axes: Record<string, number> = {
      hasOutput: jsonLen > 10 ? 1 : 0,
      sdfValid: sdfReal,
      molecularComplexity: molScore,
      bondGraph: Math.min(1, bonds / 18),
      artifactWeight: sizeScore
    };
    const notes = [`type=${a.meta?.drugType} atoms=${atoms} bonds=${bonds} sdf=${sdfLen}B`];
    return { score: Math.max(0, Math.min(1, score)), axes, notes };
  },
  hashArtifact,
  strata: ['Form', 'Field'] as const,
  engineOwner: 'Drug Discovery Engine',
  manifest() {
    return {
      domain: 'drug',
      version: '1.0.0',
      strata: ['Form', 'Field'],
      clauses: ['synthesize', 'invert', 'rate', 'curated', 'deterministic'],
      determinism: 'strict',
      outputs: ['JSON (ADME + clinical + molecule summary)', 'SDF (real V2000 with atoms + computed bonds)'],
      notes: 'Real molecular SDF with header, atom blocks, bond blocks derived from seed RNG positions + distance valence; valid for cheminformatics tools.'
    };
  },
};
registerContract(DrugQualityContract);
