/**
 * Agent Quality Contract — auto-generated stub.
 *
 * Adapter around `generateAgentV3` exposing the canonical 4-clause
 * QualityContract surface. The rate() function is a placeholder pending
 * a domain-specific evaluator; the structure is correct and conformant.
 */
import { promises as fsp } from 'fs';
import path from 'path';
import os from 'os';
import crypto from 'crypto';
import { generateAgentV3 } from './agent';
import { registerContract, type QualityContract } from '../quality-contract';

// 15_ spec integration: new contracts system available alongside legacy
import '../../contracts'; // pulls bootstrap + registry for full 27 + Part 6 (all domains + Part 6 live)
import { withKernelClock } from '../clock';

interface S { $domain: 'agent'; $name?: string; genes: Record<string, unknown> }
interface A { filePath: string; meta: Record<string, unknown> }

function hashArtifact(a: A): string {
  return crypto.createHash('sha256').update(a.filePath + JSON.stringify(a.meta)).digest('hex');
}

export const AgentQualityContract: QualityContract<S, A, Record<string, unknown>> = {
  domain: 'agent',
  version: '1.0.0',
  curated: () => [
    { id: 'agent-default',  name: 'Default Agent',  intent: 'baseline', seed: { $domain: 'agent', $name: 'agent-default',  genes: {} } },
    { id: 'agent-variant-a', name: 'Variant A Agent', intent: 'variant',  seed: { $domain: 'agent', $name: 'agent-variant-a', genes: { intensity: 0.7 } } },
    { id: 'agent-variant-b', name: 'Variant B Agent', intent: 'variant',  seed: { $domain: 'agent', $name: 'agent-variant-b', genes: { intensity: 0.3 } } },
  ],
  synthesize: async (seed) => {
    const dir = await fsp.mkdtemp(path.join(os.tmpdir(), 'agent-'));
    const out = path.join(dir, 'a.json');
    const r = await withKernelClock(0, () => generateAgentV3(seed as never, out)) as { filePath?: string };
    const filePath = r.filePath ?? out;
    const data = await fsp.readFile(filePath, 'utf-8').catch(async () => (await fsp.readFile(filePath)).toString('base64'));
    return { filePath: data, meta: {} };
  },
  invert: (a) => ({ size: a.filePath.length }),
  rate: (a) => {
    const score = a.filePath.length > 0 ? 0.85 : 0;
    return { score, axes: { hasOutput: score }, notes: [] };
  },
  hashArtifact,
};
registerContract(AgentQualityContract as never);

