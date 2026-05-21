/**
 * Narrative Quality Contract — wraps generateNarrativeV3 with an
 * in-memory adapter that reads the JSON manuscript back as the canonical
 * artifact.
 */
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import crypto from 'crypto';
import { generateNarrativeV3 } from './narrative';
import { registerContract } from '../quality-contract';
import type { QualityContract, QualityReport } from '../quality-contract';

interface NarrativeSeed { $hash: string; genes?: Record<string, { value: any }>; }
interface NarrativeArtifact {
  manuscript: any;
  meta: { chapters: number; wordCount: number };
}

async function synthesize(seed: NarrativeSeed): Promise<NarrativeArtifact> {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'narrative-contract-'));
  const out = dir; // narrative-v3 treats outputPath as a directory
  try {
    const r = await generateNarrativeV3(seed as any, out);
    const manuscript = JSON.parse(await fs.readFile(r.jsonPath, 'utf8'));
    return {
      manuscript,
      meta: { chapters: r.chapters, wordCount: r.wordCount },
    };
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
}

interface NarrativeInverted {
  chapters: number;
  wordCount: number;
  hasTitle: boolean;
  hasGenre: boolean;
  avgChapterWords: number;
}

function invert(a: NarrativeArtifact): NarrativeInverted {
  return {
    chapters: a.meta.chapters,
    wordCount: a.meta.wordCount,
    hasTitle: !!(a.manuscript?.title || a.manuscript?.metadata?.title),
    hasGenre: !!(a.manuscript?.genre || a.manuscript?.metadata?.genre),
    avgChapterWords: a.meta.chapters > 0 ? a.meta.wordCount / a.meta.chapters : 0,
  };
}

function rate(a: NarrativeArtifact): QualityReport {
  const axes: Record<string, number> = {};
  axes.manuscriptObject = a.manuscript && typeof a.manuscript === 'object' ? 1 : 0;
  axes.chaptersPositive = a.meta.chapters >= 1 ? 1 : 0;
  axes.chaptersBounded = a.meta.chapters <= 50 ? 1 : 0;
  axes.wordCountPlausible = a.meta.wordCount >= 100 && a.meta.wordCount <= 250000 ? 1 : 0;
  // Average chapter length should be within a believable range
  const avg = a.meta.chapters > 0 ? a.meta.wordCount / a.meta.chapters : 0;
  axes.chapterLengthPlausible = avg >= 50 && avg <= 25000 ? 1 : 0;
  const hasMeta = !!(a.manuscript?.title || a.manuscript?.metadata?.title);
  axes.hasTitle = hasMeta ? 1 : 0;
  const score = Object.values(axes).reduce((s, v) => s + v, 0) / Object.values(axes).length;
  return { score, axes, notes: [`narrative ${a.meta.chapters}ch ${a.meta.wordCount}w avg=${avg.toFixed(0)}w/ch`] };
}

const CURATED: readonly { id: string; name: string; seed: NarrativeSeed; intent: string; tags: readonly string[] }[] = [
  { id: 'narrative-forest-mystery-short', name: 'Forest Mystery (short)', intent: 'Curated narrative starter', tags: ['mystery', 'short'], seed: { $hash: 'narrative-forest-mystery-v1', genes: { genre: { value: 'mystery' }, length: { value: 'short' } } } },
  { id: 'narrative-space-opera-epic', name: 'Space Opera (epic)', intent: 'Curated narrative starter', tags: ['scifi', 'epic'], seed: { $hash: 'narrative-space-opera-v1', genes: { genre: { value: 'scifi' }, length: { value: 'medium' } } } },
  { id: 'narrative-fairy-tale', name: 'Fairy Tale', intent: 'Curated narrative starter', tags: ['fantasy', 'children'], seed: { $hash: 'narrative-fairy-tale-v1', genes: { genre: { value: 'fantasy' }, length: { value: 'short' } } } },
  { id: 'narrative-cyberpunk-noir', name: 'Cyberpunk Noir', intent: 'Curated narrative starter', tags: ['scifi', 'noir'], seed: { $hash: 'narrative-cyber-noir-v1', genes: { genre: { value: 'cyberpunk' }, length: { value: 'medium' } } } },
];

function hashArtifact(a: NarrativeArtifact): string {
  return crypto.createHash('sha256').update(JSON.stringify(a.manuscript)).update(JSON.stringify(a.meta)).digest('hex');
}

export const NarrativeQualityContract: QualityContract<NarrativeSeed, NarrativeArtifact, NarrativeInverted> = {
  domain: 'narrative',
  version: '3.0.0',
  synthesize,
  invert,
  rate,
  curated: () => CURATED,
  hashArtifact: hashArtifact,
};

registerContract(NarrativeQualityContract as any);
