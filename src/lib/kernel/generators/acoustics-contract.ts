/**
 * Acoustics Quality Contract.
 */
import { promises as fsp } from 'fs';
import path from 'path';
import os from 'os';
import crypto from 'crypto';
import { generateAcoustics } from './acoustics';
import { registerContract, type QualityContract } from '../quality-contract';
import { withKernelClock } from '../clock';

interface S { $domain: 'acoustics'; $name?: string; genes: any }
interface A { filePath: string; meta: any }

function hashArtifact(a: A): string {
  return crypto.createHash('sha256').update(a.filePath + JSON.stringify(a.meta)).digest('hex');
}

export const AcousticsQualityContract: QualityContract<S, A, any> = {
  domain: 'acoustics',
  version: '1.0.0',
  curated: () => [
    { id: 'acoustics-default', name: 'Default acoustics', intent: 'baseline', seed: { $domain: 'acoustics', $name: 'acoustics-default', genes: {} } },
    { id: 'acoustics-bright', name: 'Bright acoustics', intent: 'high-energy', seed: { $domain: 'acoustics', $name: 'acoustics-bright', genes: { energy: 0.9 } } },
    { id: 'acoustics-quiet', name: 'Quiet acoustics', intent: 'low-energy', seed: { $domain: 'acoustics', $name: 'acoustics-quiet', genes: { energy: 0.1 } } },
  ],
  synthesize: async (seed) => {
    const dir = await fsp.mkdtemp(path.join(os.tmpdir(), 'acoustics-'));
    const out = path.join(dir, 'a.json');
    const r: any = await withKernelClock(0, () => generateAcoustics(seed as any, out));
    const filePath = r.filePath ?? out;
    const data = await fsp.readFile(filePath, 'utf-8').catch(async () => (await fsp.readFile(filePath)).toString('base64'));
    return { filePath: data, meta: {} };
  },
  invert: (a) => ({ size: a.filePath.length }),
  rate: (a) => {
    const axes: Record<string, number> = {};
    const notes: string[] = [];
    axes.hasOutput = a.filePath.length > 0 ? 1 : 0;
    if (!axes.hasOutput) return { score: 0, axes, notes: ['Empty output'], conformsTo: '1.0.0' };
    let parsed: any = null;
    try { parsed = JSON.parse(a.filePath); } catch { /* not JSON, ignore */ }
    if (parsed && typeof parsed === 'object') {
      axes.isJson = 1;
      axes.hasReverb = parsed.reverb !== undefined ? 1 : 0;
      axes.hasResonance = parsed.resonance !== undefined ? 1 : 0;
      axes.hasFrequencies = Array.isArray(parsed.frequencies) ? 1 : 0;
      axes.hasIR = Array.isArray(parsed.impulseResponse) || Array.isArray(parsed.ir) ? 1 : 0;
      notes.push(`fields=${Object.keys(parsed).length}`);
    } else {
      axes.isJson = 0;
      notes.push('output is not JSON-decodable');
    }
    const sizeBytes = a.filePath.length;
    axes.sizeOk = sizeBytes > 50 ? 1 : sizeBytes / 50;
    const filled = ['hasReverb','hasResonance','hasFrequencies','hasIR'].reduce((s,k)=>s+(axes[k]??0),0);
    const score = 0.3 * axes.isJson + 0.5 * (filled / 4) + 0.2 * axes.sizeOk;
    return { score: Math.round(score * 100) / 100, axes, notes, conformsTo: '1.0.0' };
  },
  hashArtifact,
};
registerContract(AcousticsQualityContract as any);
