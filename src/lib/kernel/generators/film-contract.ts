/**
 * Film Quality Contract.
 */
import { promises as fsp } from 'fs';
import path from 'path';
import os from 'os';
import crypto from 'crypto';
import { generateFilm } from './film';
import { registerContract, type QualityContract } from '../quality-contract';
import { withKernelClock } from '../clock';

interface S { $domain: 'film'; $name?: string; genes: any }
interface A { filePath: string; meta: any }

function hashArtifact(a: A): string {
  return crypto.createHash('sha256').update(a.filePath + JSON.stringify(a.meta)).digest('hex');
}

export const FilmQualityContract: QualityContract<S, A, any> = {
  domain: 'film',
  version: '1.0.0',
  curated: () => [
    { id: 'film-default', name: 'Default film', intent: 'baseline', seed: { $domain: 'film', $name: 'film-default', genes: {} } },
    { id: 'film-bright', name: 'Bright film', intent: 'high-energy', seed: { $domain: 'film', $name: 'film-bright', genes: { energy: 0.9 } } },
    { id: 'film-quiet', name: 'Quiet film', intent: 'low-energy', seed: { $domain: 'film', $name: 'film-quiet', genes: { energy: 0.1 } } },
  ],
  synthesize: async (seed) => {
    const dir = await fsp.mkdtemp(path.join(os.tmpdir(), 'film-'));
    const out = path.join(dir, 'a.json');
    const r: any = await withKernelClock(0, () => generateFilm(seed as any, out));
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
  strata: ['story', 'motion', 'sound'] as const,
  engineOwner: 'film engine custodian',
};
registerContract(FilmQualityContract);
