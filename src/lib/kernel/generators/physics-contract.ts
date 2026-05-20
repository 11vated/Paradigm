/**
 * Physics Quality Contract — wraps generatePhysics (sim config) with adapter.
 */
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import crypto from 'crypto';
import { generatePhysics } from './physics';
import { withKernelClock } from '../clock';
import { registerContract, type QualityContract } from '../quality-contract';

interface PhysicsSeed { $hash?: string; $name?: string; genes?: any; }
interface PhysicsArtifact { config: string; size: number; }
interface PhysicsInverted { kind: string; bytes: number; }

async function synth(seed: PhysicsSeed): Promise<PhysicsArtifact> {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'physics-q-'));
  try {
    const r = await withKernelClock(0, () => generatePhysics(seed as any, path.join(dir, "physics.json")));
    const config = await fs.readFile(r.filePath, 'utf8');
    return { config, size: r.configSize };
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
}

function fingerprint(a: PhysicsArtifact): string { return crypto.createHash('sha256').update(a.config).digest('hex'); }

export const PhysicsQualityContract: QualityContract<PhysicsSeed, PhysicsArtifact, PhysicsInverted> = {
  domain: 'physics',
  version: '1.0.0',
  synthesize: synth,
  invert: (a) => {
    let kind = 'unknown';
    try { const o = JSON.parse(a.config); kind = o.type || o.solver || 'json'; } catch {}
    return { kind, bytes: a.size };
  },
  rate: (a) => ({
    score: a.config.length > 20 ? 0.75 : 0,
    axes: { hasContent: a.config.length > 20 ? 1 : 0 },
    notes: [`${a.size} bytes of physics config`],
  }),
  curated: () => [
    { id: 'physics-rigidbody', name: 'Rigid Body', intent: 'Rigid body sim',
      seed: { $name: 'Rigid', genes: { type: 'rigidbody', gravity: 9.8, friction: 0.4 } } },
    { id: 'physics-fluid', name: 'Fluid', intent: 'Fluid sim',
      seed: { $name: 'Fluid', genes: { type: 'fluid', viscosity: 0.5, density: 1000 } } },
    { id: 'physics-soft', name: 'Soft Body', intent: 'Soft body sim',
      seed: { $name: 'Soft', genes: { type: 'softbody', elasticity: 0.7, damping: 0.3 } } },
  ],
  hashArtifact: fingerprint,
};

registerContract(PhysicsQualityContract as any);
