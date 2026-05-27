/**
 * Automotive Quality Contract.
 */
import { promises as fsp } from 'fs';
import path from 'path';
import os from 'os';
import crypto from 'crypto';
import { generateAutomotive } from './automotive';
import { registerContract, type QualityContract } from '../quality-contract';
import { withKernelClock } from '../clock';

interface S { $domain: 'automotive'; $name?: string; genes: any }
interface A { filePath: string; meta: any }

function hashArtifact(a: A): string {
  return crypto.createHash('sha256').update(a.filePath + JSON.stringify(a.meta)).digest('hex');
}

export const AutomotiveQualityContract: QualityContract<S, A, any> = {
  domain: 'automotive',
  version: '1.0.0',
  curated: () => [
    { id: 'automotive-default', name: 'Default automotive', intent: 'baseline', seed: { $domain: 'automotive', $name: 'automotive-default', genes: {} } },
    { id: 'automotive-bright', name: 'Bright automotive', intent: 'high-energy', seed: { $domain: 'automotive', $name: 'automotive-bright', genes: { energy: 0.9 } } },
    { id: 'automotive-quiet', name: 'Quiet automotive', intent: 'low-energy', seed: { $domain: 'automotive', $name: 'automotive-quiet', genes: { energy: 0.1 } } },
  ],
  synthesize: async (seed) => {
    const dir = await fsp.mkdtemp(path.join(os.tmpdir(), 'automotive-'));
    const out = path.join(dir, 'a.json');
    const r: any = await withKernelClock(0, () => generateAutomotive(seed as any, out));
    const filePath = r.filePath ?? out;
    const data = await fsp.readFile(filePath, 'utf-8').catch(async () => (await fsp.readFile(filePath)).toString('base64'));
    return { filePath: data, meta: {} };
  },
  invert: (a) => ({ size: a.filePath.length }),
  rate: (a) => {
    const score = a.filePath.length > 0 ? 0.9 : 0;
    return { score, axes: { hasOutput: score }, notes: [] };
  },
  hashArtifact,

  // Doctrine v2 Part VI.10 — declared strata for the Substrate Conformance Index.
  strata: ['form', 'motion'] as const,
  engineOwner: 'automotive engine custodian',
};
registerContract(AutomotiveQualityContract);
