/**
 * Aerospace Quality Contract.
 */
import { promises as fsp } from 'fs';
import path from 'path';
import os from 'os';
import crypto from 'crypto';
import { generateAerospace } from './aerospace';
import { registerContract, type QualityContract } from '../quality-contract';
import { withKernelClock } from '../clock';

interface S { $domain: 'aerospace'; $name?: string; genes: any }
interface A { filePath: string; meta: any }

function hashArtifact(a: A): string {
  return crypto.createHash('sha256').update(a.filePath + JSON.stringify(a.meta)).digest('hex');
}

export const AerospaceQualityContract: QualityContract<S, A, any> = {
  domain: 'aerospace',
  version: '1.0.0',
  curated: () => [
    { id: 'aerospace-default', name: 'Default aerospace', intent: 'baseline', seed: { $domain: 'aerospace', $name: 'aerospace-default', genes: {} } },
    { id: 'aerospace-bright', name: 'Bright aerospace', intent: 'high-energy', seed: { $domain: 'aerospace', $name: 'aerospace-bright', genes: { energy: 0.9 } } },
    { id: 'aerospace-quiet', name: 'Quiet aerospace', intent: 'low-energy', seed: { $domain: 'aerospace', $name: 'aerospace-quiet', genes: { energy: 0.1 } } },
  ],
  synthesize: async (seed) => {
    const dir = await fsp.mkdtemp(path.join(os.tmpdir(), 'aerospace-'));
    const out = path.join(dir, 'a.json');
    const r: any = await withKernelClock(0, () => generateAerospace(seed as any, out));
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
  engineOwner: 'aerospace engine custodian',
};
registerContract(AerospaceQualityContract);
