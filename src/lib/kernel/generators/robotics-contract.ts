/**
 * Robotics Quality Contract.
 */
import { promises as fsp } from 'fs';
import path from 'path';
import os from 'os';
import crypto from 'crypto';
import { generateRobotics } from './robotics';
import { registerContract, type QualityContract } from '../quality-contract';
import { withKernelClock } from '../clock';

interface S { $domain: 'robotics'; $name?: string; genes: any }
interface A { filePath: string; meta: any }

function hashArtifact(a: A): string {
  return crypto.createHash('sha256').update(a.filePath + JSON.stringify(a.meta)).digest('hex');
}

export const RoboticsQualityContract: QualityContract<S, A, any> = {
  domain: 'robotics',
  version: '1.0.0',
  curated: () => [
    { id: 'robotics-default', name: 'Default robotics', intent: 'baseline', seed: { $domain: 'robotics', $name: 'robotics-default', genes: {} } },
    { id: 'robotics-bright', name: 'Bright robotics', intent: 'high-energy', seed: { $domain: 'robotics', $name: 'robotics-bright', genes: { energy: 0.9 } } },
    { id: 'robotics-quiet', name: 'Quiet robotics', intent: 'low-energy', seed: { $domain: 'robotics', $name: 'robotics-quiet', genes: { energy: 0.1 } } },
  ],
  synthesize: async (seed) => {
    const dir = await fsp.mkdtemp(path.join(os.tmpdir(), 'robotics-'));
    const out = path.join(dir, 'a.json');
    const r: any = await withKernelClock(0, () => generateRobotics(seed as any, out));
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
  strata: ['form', 'motion', 'mind'] as const,
  engineOwner: 'robotics engine custodian',
};
registerContract(RoboticsQualityContract);
