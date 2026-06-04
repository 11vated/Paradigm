/**
 * Genome Quality Contract.
 */
import { promises as fsp } from 'fs';
import path from 'path';
import os from 'os';
import crypto from 'crypto';
import { generateGenome } from './genome';
import { registerContract, type QualityContract, type Stratum } from '../quality-contract';

// 15_ spec integration: new contracts system available alongside legacy
import '../../contracts'; // pulls bootstrap + registry for full 27 + Part 6 (all domains + Part 6 live)
import { withKernelClock } from '../clock';

interface S { $domain: 'genome'; $name?: string; genes: any }
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
    fastaPath?: string;
  };
}

function hashArtifact(a: A): string {
  return crypto.createHash('sha256').update(a.filePath + JSON.stringify(a.meta)).digest('hex');
}

export const GenomeQualityContract: QualityContract<S, A, any> = {
  domain: 'genome',
  version: '1.0.0',
  curated: () => [
    { id: 'genome-default', name: 'Default genome', intent: 'baseline', seed: { $domain: 'genome', $name: 'genome-default', genes: {} } },
    { id: 'genome-bright', name: 'Bright genome', intent: 'high-energy', seed: { $domain: 'genome', $name: 'genome-bright', genes: { energy: 0.9 } } },
    { id: 'genome-quiet', name: 'Quiet genome', intent: 'low-energy', seed: { $domain: 'genome', $name: 'genome-quiet', genes: { energy: 0.1 } } },
  ],
  synthesize: async (seed) => {
    const dir = await fsp.mkdtemp(path.join(os.tmpdir(), 'genome-'));
    const out = path.join(dir, 'a.json');
    const r = await withKernelClock(0, () => generateGenome(seed, out));
    const filePath = r.filePath ?? out;
    const data = await fsp.readFile(filePath, 'utf-8').catch(async () => (await fsp.readFile(filePath)).toString('base64'));
    let parsed: any = {};
    try { parsed = JSON.parse(data); } catch { /* fallback */ }
    const summary = `Genome ${parsed.genome?.targetGene || '?'} ${parsed.genome?.therapyType || 'therapy'}. Editing efficiency: ${parsed.therapy?.editingEfficiency?.toFixed?.(2) || 'n/a'}`;
    const metrics: Record<string, number> = {
      editingEfficiency: parsed.therapy?.editingEfficiency || 0,
      offTargetRisk: parsed.therapy?.offTargetRisk || 0,
      participants: parsed.trial?.participants || 0,
      successProbability: parsed.trial?.successProbability || 0
    };
    const previewData = data;
    return {
      filePath: data,
      meta: { fastaPath: (r as any).fastaPath },
      previewData,
      structuredData: parsed,
      summary,
      metrics,
      visual: { type: 'structured' as const, previewData, structuredData: parsed, summary, metrics },
      emergent_assets: {
        preview: { type: 'structured' as const, data: { structuredData: parsed, summary, metrics }, path: filePath },
        fastaPath: (r as any).fastaPath
      }
    };
  },
  invert: (a) => ({ size: a.filePath.length }),
  rate: (a) => {
    const score = a.filePath.length > 0 ? 0.9 : 0;
    return { score, axes: { hasOutput: score }, notes: [] };
  },
  hashArtifact,
  strata: ['Form', 'Field'] as const,
  engineOwner: 'Genome Engine',
  manifest() {
    return {
      domain: 'genome',
      version: '1.0.0',
      clauses: ['synthesize', 'invert', 'rate', 'curated', 'deterministic'],
      determinism: 'strict',
    };
  },
};
registerContract(GenomeQualityContract);
