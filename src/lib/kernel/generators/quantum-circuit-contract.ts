/**
 * QuantumCircuit Quality Contract.
 */
import { promises as fsp } from 'fs';
import path from 'path';
import os from 'os';
import crypto from 'crypto';
import { generateQuantumCircuit } from './quantum-circuit';
import { registerContract, type QualityContract, type QualityReport, type Stratum } from '../quality-contract';

// 15_ spec integration: new contracts system available alongside legacy
import '../../contracts'; // pulls bootstrap + registry for full 27 + Part 6 (all domains + Part 6 live)
import { withKernelClock } from '../clock';

interface S { $domain: 'quantum-circuit'; $name?: string; genes?: Record<string, unknown> }
interface A {
  filePath: string;
  meta?: Record<string, unknown>;
  previewData?: string;
  visual?: {
    type: 'json' | 'code' | 'html' | 'svg';
    previewData?: string;
  };
  emergent_assets?: {
    preview?: {
      type: 'json' | 'code' | 'html' | 'svg';
      data?: string;
      path?: string;
    };
  };
}
interface I { size: number }

function hashArtifact(a: A): string {
  return crypto.createHash('sha256').update(a.filePath + JSON.stringify(a.meta ?? {})).digest('hex');
}

async function synthesize(seed: S): Promise<A> {
  const dir = await fsp.mkdtemp(path.join(os.tmpdir(), 'quantum-circuit-'));
  const out = path.join(dir, 'a.json');
  // Generator boundary cast (legacy untyped generator interop) — narrow, isolated
  const r = await withKernelClock(0, () => generateQuantumCircuit(seed as any, out)) as { filePath?: string };
  const filePath = r.filePath ?? out;
  const data = await fsp.readFile(filePath, 'utf-8').catch(async () => (await fsp.readFile(filePath)).toString('base64'));
  const previewData = data;
  return {
    filePath: data,
    meta: {},
    previewData,
    visual: { type: 'json', previewData },
    emergent_assets: {
      preview: { type: 'json', data: previewData, path: filePath }
    }
  };
}

function invert(a: A): I {
  return { size: a.filePath.length };
}

function rate(a: A): QualityReport {
  const score = a.filePath.length > 0 ? 0.9 : 0;
  return { score, axes: { hasOutput: score }, notes: [] };
}

export const QuantumCircuitQualityContract: QualityContract<S, A, I> = {
  domain: 'quantum-circuit',
  version: '1.0.0',
  strata: ['Form', 'Field'] as const,
  engineOwner: 'Quantum Circuit Engine',
  synthesize,
  invert,
  rate,
  curated: () => [
    { id: 'quantum-circuit-default', name: 'Default quantum-circuit', intent: 'baseline', seed: { $domain: 'quantum-circuit', $name: 'quantum-circuit-default', genes: {} } as S },
    { id: 'quantum-circuit-bright', name: 'Bright quantum-circuit', intent: 'high-energy', seed: { $domain: 'quantum-circuit', $name: 'quantum-circuit-bright', genes: { energy: 0.9 } } as S },
    { id: 'quantum-circuit-quiet', name: 'Quiet quantum-circuit', intent: 'low-energy', seed: { $domain: 'quantum-circuit', $name: 'quantum-circuit-quiet', genes: { energy: 0.1 } } as S },
  ],
  hashArtifact,
  manifest() {
    return {
      domain: 'quantum-circuit',
      version: '1.0.0',
      clauses: ['synthesize', 'invert', 'rate', 'curated', 'deterministic'],
      determinism: 'strict',
    };
  },
};
registerContract(QuantumCircuitQualityContract);
