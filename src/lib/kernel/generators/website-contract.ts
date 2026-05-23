import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import crypto from 'crypto';
import { generateWebsite } from './website';
import { registerContract } from '../quality-contract';
import type { QualityContract, QualityReport } from '../quality-contract';

interface WSSeed { $hash: string; genes?: Record<string, any>; }
interface WSArtifact { html: string; css: string; js: string; sections: number; colorPalette: string[]; byteSize: number; }
interface WSInverted { sections: number; byteSize: number; palette: string[]; htmlHash: string; }

async function synthesize(seed: WSSeed): Promise<WSArtifact> {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'pdgm-ws-'));
  try {
    const r = await generateWebsite(seed as any, dir) as any;
    const [html, css, js] = await Promise.all([
      fs.readFile(r.htmlPath, 'utf8').catch(() => ''),
      fs.readFile(r.cssPath,  'utf8').catch(() => ''),
      fs.readFile(r.jsPath,   'utf8').catch(() => ''),
    ]);
    return { html, css, js, sections: r.sections ?? 0, colorPalette: r.colorPalette ?? [], byteSize: html.length + css.length + js.length };
  } finally { await fs.rm(dir, { recursive: true, force: true }).catch(() => {}); }
}

function invert(a: WSArtifact): WSInverted {
  return { sections: a.sections, byteSize: a.byteSize, palette: a.colorPalette,
    htmlHash: crypto.createHash('sha256').update(a.html).digest('hex').slice(0, 16) };
}

function rate(a: WSArtifact): QualityReport {
  const axes: Record<string, number> = {
    hasHtml:    a.html.length > 200 ? 1 : 0,
    hasCss:     a.css.length  > 50  ? 1 : 0,
    sections:   Math.min(1, a.sections / 8),
    palette:    Math.min(1, a.colorPalette.length / 5),
    byteSize:   Math.min(1, a.byteSize / 10_000),
  };
  const score = Object.values(axes).reduce((a, b) => a + b, 0) / Object.keys(axes).length;
  return { score, axes, notes: [`${a.sections} sections, ${a.byteSize} bytes, ${a.colorPalette.length} colors`] };
}

function hashArtifact(a: WSArtifact): string {
  return crypto.createHash('sha256').update(a.html + a.css + a.js).digest('hex');
}

const CURATED = [
  { id: 'website-minimal-portfolio', name: 'Portfolio', intent: 'Minimal portfolio', tags: ['minimal','portfolio'],
    seed: { $hash: 'ws-portfolio', genes: { aesthetic: { value: 'minimal' }, purpose: { value: 'portfolio' } } } as WSSeed },
  { id: 'website-brutalist-agency',  name: 'Agency',    intent: 'Brutalist agency site', tags: ['brutalist','agency'],
    seed: { $hash: 'ws-agency',    genes: { aesthetic: { value: 'brutalist' }, purpose: { value: 'agency' } } } as WSSeed },
  { id: 'website-glassmorphic-saas', name: 'SaaS',      intent: 'Glassmorphic SaaS landing', tags: ['glass','saas'],
    seed: { $hash: 'ws-saas',      genes: { aesthetic: { value: 'glassmorphic' }, purpose: { value: 'saas' } } } as WSSeed },
];

export const WebsiteQualityContract: QualityContract<WSSeed, WSArtifact, WSInverted> = {
  domain: 'website', version: '1.0.0', synthesize, invert, rate, curated: () => CURATED, hashArtifact,
};
registerContract(WebsiteQualityContract as any);
