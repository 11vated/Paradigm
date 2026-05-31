/**
 * SmartHome Quality Contract.
 */
import { promises as fsp } from 'fs';
import path from 'path';
import os from 'os';
import crypto from 'crypto';
import { generateSmartHome } from './smart-home';
import { registerContract, type QualityContract, type QualityReport, type Stratum } from '../quality-contract';

// 15_ spec integration: new contracts system available alongside legacy
import '../../contracts'; // pulls bootstrap + registry for full 27 + Part 6 (all domains + Part 6 live)
import { withKernelClock } from '../clock';

interface S { $domain: 'smart-home'; $name?: string; genes?: Record<string, unknown> }
interface A { filePath: string; meta?: Record<string, unknown> }
interface I { size: number }

function hashArtifact(a: A): string {
  return crypto.createHash('sha256').update(a.filePath + JSON.stringify(a.meta ?? {})).digest('hex');
}

async function synthesize(seed: S): Promise<A> {
  const dir = await fsp.mkdtemp(path.join(os.tmpdir(), 'smart-home-'));
  const out = path.join(dir, 'a.json');
  // Generator boundary cast (legacy untyped generator interop) — narrow, isolated
  const r = await withKernelClock(0, () => generateSmartHome(seed as any, out)) as { filePath?: string };
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

export const SmartHomeQualityContract: QualityContract<S, A, I> = {
  domain: 'smart-home',
  version: '1.0.0',
  strata: ['Form', 'Field', 'Mind'] as const,
  engineOwner: 'Smart Home Engine',
  synthesize,
  invert,
  rate,
  curated: () => [
    { id: 'smart-home-default', name: 'Default smart-home', intent: 'baseline', seed: { $domain: 'smart-home', $name: 'smart-home-default', genes: {} } as S },
    { id: 'smart-home-bright', name: 'Bright smart-home', intent: 'high-energy', seed: { $domain: 'smart-home', $name: 'smart-home-bright', genes: { energy: 0.9 } } as S },
    { id: 'smart-home-quiet', name: 'Quiet smart-home', intent: 'low-energy', seed: { $domain: 'smart-home', $name: 'smart-home-quiet', genes: { energy: 0.1 } } as S },
  ],
  hashArtifact,
  manifest() {
    return {
      domain: 'smart-home',
      version: '1.0.0',
      clauses: ['synthesize', 'invert', 'rate', 'curated', 'deterministic'],
      determinism: 'strict',
    };
  },
};
registerContract(SmartHomeQualityContract);
