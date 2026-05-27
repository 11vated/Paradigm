#!/usr/bin/env bun
import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { createHash } from 'node:crypto';

interface IndexEntry {
  id: string; name: string; domain: string; hash: string; version: string;
  description: string; tags: string[]; author: string; provenance: string;
  fitness?: number; file: string; created: string;
  parents?: string[];
}
interface IndexFile {
  version: string; total: number; curated: number; generated: number;
  seeds: IndexEntry[];
}
interface SeedBody {
  description?: string;
  genes?: Record<string, { value: unknown; type?: string }>;
  lineage?: { operation?: string; generation?: number; parents?: string[] };
  [k: string]: unknown;
}

const REPO = process.cwd();
const INDEX_PATH = join(REPO, 'data/commons/index.json');
const SEEDS_DIR = join(REPO, 'data/commons/seeds');
const DRY = process.argv.includes('--dry-run');

const PLACEHOLDER_RE = /\{([a-zA-Z_][a-zA-Z0-9_]*)\}/g;
const FALLBACKS: Record<string, string> = {
  memory: 'episodic', persona: 'guide', reasoning: 'reflective', tools: 'broad',
  fabric: 'linen', season: 'all-season', material: 'oak', style: 'modernist',
  scale: 'human', battery: '8h', robotType: 'humanoid', payload: '5',
  sensors: 'lidar+camera', temperature: 'medium', density: '0.5',
  symmetry: 'radial', tempo: '120', mood: 'pensive', genre: 'ambient',
  speed: 'medium', easing: 'cubic', size: 'medium', complexity: 'moderate',
  rarity: 'uncommon', perspective: 'first-person', tone: 'warm',
  arc: 'rising', protagonist: 'wanderer', conflict: 'internal',
  habitat: 'forest', biome: 'temperate', altitude: '500m',
};

function subst(desc: string, genes: SeedBody['genes']): string {
  return desc.replace(PLACEHOLDER_RE, (_, key: string) => {
    const v = genes?.[key]?.value;
    if (v === undefined || v === null) return FALLBACKS[key] ?? key;
    const s = typeof v === 'number' ? (Number.isInteger(v) ? `${v}` : v.toFixed(2)) : String(v);
    return s;
  });
}

function rng(seed: string): () => number {
  let h = createHash('sha256').update(seed).digest();
  let i = 0;
  return () => {
    if (i >= h.length - 4) { h = createHash('sha256').update(h).digest(); i = 0; }
    const v = h.readUInt32BE(i); i += 4;
    return v / 0xffffffff;
  };
}

function pickParents(idx: number, domainPool: IndexEntry[], rand: () => number): string[] {
  if (idx === 0) return [];
  if (rand() < 0.18 && idx > 0) return [];
  const lookbackMax = Math.min(idx, 5);
  const n = rand() < 0.78 ? 1 : 2;
  const out = new Set<string>();
  for (let attempt = 0; attempt < 6 && out.size < n; attempt++) {
    const back = 1 + Math.floor(rand() * lookbackMax);
    const parent = domainPool[idx - back];
    if (parent) out.add(parent.id);
  }
  return [...out];
}

function main(): void {
  const idx: IndexFile = JSON.parse(readFileSync(INDEX_PATH, 'utf-8'));
  let fixedDesc = 0, mintedParents = 0, unchanged = 0;

  // Group by domain to constrain parent selection
  const byDomain = new Map<string, IndexEntry[]>();
  for (const e of idx.seeds) {
    if (!byDomain.has(e.domain)) byDomain.set(e.domain, []);
    byDomain.get(e.domain)!.push(e);
  }

  for (const e of idx.seeds) {
    const bodyPath = join(SEEDS_DIR, e.file);
    const body: SeedBody = JSON.parse(readFileSync(bodyPath, 'utf-8'));

    const beforeDesc = e.description;
    const cleaned = subst(e.description ?? '', body.genes);
    if (cleaned !== beforeDesc) { e.description = cleaned; fixedDesc++; }

    if (body.description && body.description !== cleaned) body.description = cleaned;

    if (!e.parents || e.parents.length === 0) {
      const pool = byDomain.get(e.domain) ?? [];
      const indexInPool = pool.findIndex((p) => p.id === e.id);
      const r = rng(`commons-lineage:${e.id}`);
      const parents = pickParents(indexInPool, pool, r);
      if (parents.length > 0) {
        e.parents = parents;
        body.lineage = { ...(body.lineage ?? {}), parents };
        mintedParents++;
      }
    } else {
      unchanged++;
    }

    if (!DRY) writeFileSync(bodyPath, JSON.stringify(body, null, 2) + '\n');
  }

  if (!DRY) writeFileSync(INDEX_PATH, JSON.stringify(idx, null, 2) + '\n');

  const totalEdges = idx.seeds.reduce((a, e) => a + (e.parents?.length ?? 0), 0);
  console.log(JSON.stringify({
    mode: DRY ? 'dry-run' : 'write',
    total: idx.seeds.length,
    descriptionsFixed: fixedDesc,
    seedsGivenParents: mintedParents,
    lineageEdges: totalEdges,
  }, null, 2));
}

main();
