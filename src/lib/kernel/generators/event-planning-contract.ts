/**
 * EventPlanning Quality Contract.
 */
import { promises as fsp } from 'fs';
import path from 'path';
import os from 'os';
import crypto from 'crypto';
import { generateEventPlanning } from './event-planning';
import { registerContract, type QualityContract } from '../quality-contract';
import { withKernelClock } from '../clock';

interface S { $domain: 'event-planning'; $name?: string; genes: any }
interface A { filePath: string; meta: any }

function hashArtifact(a: A): string {
  return crypto.createHash('sha256').update(a.filePath + JSON.stringify(a.meta)).digest('hex');
}

export const EventPlanningQualityContract: QualityContract<S, A, any> = {
  domain: 'event-planning',
  version: '1.0.0',
  curated: () => [
    { id: 'event-planning-default', name: 'Default event-planning', intent: 'baseline', seed: { $domain: 'event-planning', $name: 'event-planning-default', genes: {} } },
    { id: 'event-planning-bright', name: 'Bright event-planning', intent: 'high-energy', seed: { $domain: 'event-planning', $name: 'event-planning-bright', genes: { energy: 0.9 } } },
    { id: 'event-planning-quiet', name: 'Quiet event-planning', intent: 'low-energy', seed: { $domain: 'event-planning', $name: 'event-planning-quiet', genes: { energy: 0.1 } } },
  ],
  synthesize: async (seed) => {
    const dir = await fsp.mkdtemp(path.join(os.tmpdir(), 'event-planning-'));
    const out = path.join(dir, 'a.json');
    const r: any = await withKernelClock(0, () => generateEventPlanning(seed as any, out));
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
registerContract(EventPlanningQualityContract as any);
