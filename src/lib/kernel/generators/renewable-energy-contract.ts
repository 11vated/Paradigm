/**
 * RenewableEnergy Quality Contract.
 */
import { promises as fsp } from 'fs';
import path from 'path';
import os from 'os';
import crypto from 'crypto';
import { generateRenewableEnergy } from './renewable-energy';
import { registerContract, type QualityContract, type QualityReport, type Stratum } from '../quality-contract';

// 15_ spec integration: new contracts system available alongside legacy
import '../../contracts'; // pulls bootstrap + registry for full 27 + Part 6 (all domains + Part 6 live)
import { withKernelClock } from '../clock';

interface S { $domain: 'renewable-energy'; $name?: string; genes?: Record<string, unknown> }
interface A { filePath: string; meta?: Record<string, unknown> }
interface I { size: number }

function hashArtifact(a: A): string {
  return crypto.createHash('sha256').update(a.filePath + JSON.stringify(a.meta ?? {})).digest('hex');
}

async function synthesize(seed: S): Promise<A> {
  const dir = await fsp.mkdtemp(path.join(os.tmpdir(), 'renewable-energy-'));
  const out = path.join(dir, 'a.json');
  // Generator boundary cast (legacy untyped generator interop) — narrow, isolated
  const r = await withKernelClock(0, () => generateRenewableEnergy(seed as any, out)) as { filePath?: string };
  const filePath = r.filePath ?? out;
  const data = await fsp.readFile(filePath, 'utf-8').catch(async () => (await fsp.readFile(filePath)).toString('base64'));
  return { filePath: data, meta: {} };
}

function invert(a: A): I {
  return { size: a.filePath.length };
}

function rate(a: A): QualityReport {
  const score = a.filePath.length > 0 ? 0.9 : 0;
  return { score, axes: { hasOutput: score }, notes: [] };
}

export const RenewableEnergyQualityContract: QualityContract<S, A, I> = {
  domain: 'renewable-energy',
  version: '1.0.0',
  strata: ['Field', 'World', 'Form'] as const,
  engineOwner: 'Renewable Energy Engine',
  synthesize,
  invert,
  rate,
  curated: () => [
    { id: 'renewable-energy-default', name: 'Default renewable-energy', intent: 'baseline', seed: { $domain: 'renewable-energy', $name: 'renewable-energy-default', genes: {} } as S },
    { id: 'renewable-energy-bright', name: 'Bright renewable-energy', intent: 'high-energy', seed: { $domain: 'renewable-energy', $name: 'renewable-energy-bright', genes: { energy: 0.9 } } as S },
    { id: 'renewable-energy-quiet', name: 'Quiet renewable-energy', intent: 'low-energy', seed: { $domain: 'renewable-energy', $name: 'renewable-energy-quiet', genes: { energy: 0.1 } } as S },
  ],
  hashArtifact,
  manifest() {
    return {
      domain: 'renewable-energy',
      version: '1.0.0',
      clauses: ['synthesize', 'invert', 'rate', 'curated', 'deterministic'],
      determinism: 'strict',
    };
  },
};
registerContract(RenewableEnergyQualityContract);
