import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import crypto from 'crypto';
import { generateApp } from './app';
import { registerContract } from '../quality-contract';
import type { QualityContract, QualityReport } from '../quality-contract';

interface AppSeed { $hash: string; genes?: Record<string, any>; }
interface AppArtifact { files: Record<string, string>; archetype: string; componentCount: number; routeCount: number; byteSize: number; }
interface AppInverted { archetype: string; componentCount: number; routeCount: number; fileCount: number; }

async function synthesize(seed: AppSeed): Promise<AppArtifact> {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'pdgm-app-'));
  try {
    const r = await generateApp(seed as any, dir) as any;
    const fileList: string[] = r.files ?? [];
    const contents: Record<string, string> = {};
    for (const f of fileList.slice(0, 20)) {
      contents[path.basename(f)] = await fs.readFile(f, 'utf8').catch(() => '');
    }
    const totalSize = Object.values(contents).reduce((s, c) => s + c.length, 0);
    return { files: contents, archetype: r.archetype ?? '', componentCount: r.componentCount ?? 0,
      routeCount: r.routeCount ?? 0, byteSize: totalSize };
  } finally { await fs.rm(dir, { recursive: true, force: true }).catch(() => {}); }
}

function invert(a: AppArtifact): AppInverted {
  return { archetype: a.archetype, componentCount: a.componentCount,
    routeCount: a.routeCount, fileCount: Object.keys(a.files).length };
}

function rate(a: AppArtifact): QualityReport {
  const fileCount = Object.keys(a.files).length;
  const axes: Record<string, number> = {
    hasFiles:     fileCount >= 5 ? 1 : fileCount / 5,
    hasPackageJson: 'package.json' in a.files ? 1 : 0,
    components:   Math.min(1, a.componentCount / 6),
    routes:       Math.min(1, a.routeCount / 4),
    byteSize:     Math.min(1, a.byteSize / 20_000),
  };
  const score = Object.values(axes).reduce((a, b) => a + b, 0) / Object.keys(axes).length;
  return { score, axes, notes: [`${a.archetype}, files=${fileCount}, components=${a.componentCount}`] };
}

function hashArtifact(a: AppArtifact): string {
  const combined = Object.entries(a.files).sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => `${k}:${v}`).join('\n');
  return crypto.createHash('sha256').update(combined).digest('hex');
}

const CURATED = [
  { id: 'app-dashboard',   name: 'Dashboard',   intent: 'Analytics dashboard app',     tags: ['app','dashboard'],
    seed: { $hash: 'app-dash',   genes: { archetype: { value: 'dashboard'   } } } as AppSeed },
  { id: 'app-marketplace', name: 'Marketplace', intent: 'E-commerce marketplace app',  tags: ['app','ecommerce'],
    seed: { $hash: 'app-mkt',    genes: { archetype: { value: 'marketplace' } } } as AppSeed },
  { id: 'app-social',      name: 'Social',      intent: 'Social platform app',         tags: ['app','social'],
    seed: { $hash: 'app-soc',    genes: { archetype: { value: 'social'      } } } as AppSeed },
];

export const AppQualityContract: QualityContract<AppSeed, AppArtifact, AppInverted> = {
  domain: 'app', version: '1.0.0', synthesize, invert, rate, curated: () => CURATED, hashArtifact,

  // Doctrine v2 Part VI.10 — declared strata for the Substrate Conformance Index.
  strata: ['form'] as const,
  engineOwner: 'app engine custodian',
};
registerContract(AppQualityContract);
