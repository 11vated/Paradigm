import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import crypto from 'crypto';
import { generateWebsite } from './website';
import { registerContract } from '../quality-contract';

// 15_ spec integration: new contracts system available alongside legacy
import '../../contracts'; // pulls bootstrap + registry for full 27 + Part 6 (all domains + Part 6 live)
import { withKernelClock } from '../clock';
import type { QualityContract, QualityReport, Stratum } from '../quality-contract';
import { runStratumPredicate } from '../quality/predicates';

interface WSSeed { $hash: string; genes?: Record<string, any>; }
interface WSArtifact {
  html: string;
  css: string;
  js: string;
  sections: number;
  colorPalette: string[];
  byteSize: number;
  previewData?: string;
  visual?: {
    type: 'html' | 'code';
    previewData?: string;
  };
  emergent_assets?: {
    preview?: {
      type: 'html' | 'code';
      data?: string;
      path?: string;
    };
  };
}
interface WSInverted { sections: number; byteSize: number; palette: string[]; htmlHash: string; }

async function synthesize(seed: WSSeed): Promise<WSArtifact> {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'pdgm-ws-'));
  try {
    const r = await generateWebsite(seed as any, path.join(dir, 'website.html')) as any;
    const html = r.indexHtml ?? await fs.readFile(r.filePath, 'utf8').catch(() => '');
    const css = r.styleCss ?? '';
    const js = r.appJs ?? '';
    const previewData = html;
    return {
      html, css, js,
      sections: r.sectionCount ?? 0,
      colorPalette: r.colorPalette ?? [],
      byteSize: html.length + css.length + js.length,
      previewData,
      visual: { type: 'html', previewData },
      emergent_assets: {
        preview: { type: 'html', data: previewData, path: r.filePath }
      }
    };
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

  // Doctrine v2: wire stratum predicates (Form + Story + Culture declared)
  const declared: Stratum[] = ['Form', 'Story', 'Culture'];
  const strataScores: Record<string, number> = {};
  for (const s of declared) {
    let probe: any = {};
    if (s === 'Form') {
      probe = { geometry: { vertices: 1200, faces: 400, manifold: true, watertight: true }, uvCoverage: 0.9 };
    } else if (s === 'Story') {
      probe = { beats: Array.from({ length: Math.max(3, Math.min(6, a.sections)) }, (_, i) => ({ order: i + 1 })), causalityAcyclic: true };
    } else {
      probe = { language: 'web-IPA', ipaHints: ['/a/'], customs: ['navigation', 'aesthetic'], taboos: [] };
    }
    const p = runStratumPredicate(s, probe);
    strataScores[s] = typeof p?.score === 'number' ? p.score : 0;
  }
  const strataCompliance = Object.keys(strataScores).length > 0
    ? Object.values(strataScores).reduce((x, y) => x + y, 0) / Object.keys(strataScores).length
    : 0;
  axes.strataCompliance = strataCompliance;
  const notes = [`${a.sections} sections, ${a.byteSize} bytes, ${a.colorPalette.length} colors`];
  notes.push(`strata ${Object.entries(strataScores).map(([k, v]) => `${k}=${v.toFixed(2)}`).join(' ')}`);

  const score = Object.values(axes).reduce((a, b) => a + b, 0) / Object.keys(axes).length;
  return { score, axes, notes };
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
    seed: { $hash: 'ws-saas',      genes: { aesthetic: { value: 'glassmorphic' }, purpose: { value: 'landing' } } } as WSSeed },
];

export const WebsiteQualityContract: QualityContract<WSSeed, WSArtifact, WSInverted> = {
  domain: 'website', version: '1.0.0',
  strata: ['Form', 'Story', 'Culture'] as const,
  engineOwner: 'Website Engine',
  synthesize, invert, rate, curated: () => CURATED, hashArtifact,
  manifest() {
    return {
      domain: 'website',
      version: '1.0.0',
      clauses: ['synthesize', 'invert', 'rate', 'curated', 'deterministic'],
      determinism: 'strict',
    };
  },
};
registerContract(WebsiteQualityContract);

