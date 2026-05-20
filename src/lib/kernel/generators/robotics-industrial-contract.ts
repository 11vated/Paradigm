/**
 * RoboticsIndustrial Quality Contract.
 */
import { promises as fsp } from 'fs';
import path from 'path';
import os from 'os';
import crypto from 'crypto';
import { generateRoboticsIndustrial } from './robotics-industrial';
import { registerContract, type QualityContract } from '../quality-contract';
import { withKernelClock } from '../clock';

interface S { $domain: 'robotics-industrial'; $name?: string; genes: any }
interface A { filePath: string; meta: any }

function hashArtifact(a: A): string {
  return crypto.createHash('sha256').update(a.filePath + JSON.stringify(a.meta)).digest('hex');
}

export const RoboticsIndustrialQualityContract: QualityContract<S, A, any> = {
  domain: 'robotics-industrial',
  version: '1.0.0',
  curated: () => [
    { id: 'robotics-industrial-default', name: 'Default robotics-industrial', intent: 'baseline', seed: { $domain: 'robotics-industrial', $name: 'robotics-industrial-default', genes: {} } },
    { id: 'robotics-industrial-bright', name: 'Bright robotics-industrial', intent: 'high-energy', seed: { $domain: 'robotics-industrial', $name: 'robotics-industrial-bright', genes: { energy: 0.9 } } },
    { id: 'robotics-industrial-quiet', name: 'Quiet robotics-industrial', intent: 'low-energy', seed: { $domain: 'robotics-industrial', $name: 'robotics-industrial-quiet', genes: { energy: 0.1 } } },
  ],
  synthesize: async (seed) => {
    const dir = await fsp.mkdtemp(path.join(os.tmpdir(), 'robotics-industrial-'));
    const out = path.join(dir, 'a.json');
    const r: any = await withKernelClock(0, () => generateRoboticsIndustrial(seed as any, out));
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
};
registerContract(RoboticsIndustrialQualityContract as any);
