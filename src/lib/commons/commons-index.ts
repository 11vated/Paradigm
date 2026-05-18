import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

export const COMMONS_ROOT = path.resolve('data/commons');
export const SEEDS_DIR = path.join(COMMONS_ROOT, 'seeds');
export const INDEX_PATH = path.join(COMMONS_ROOT, 'index.json');

export interface CanonicalSeedEntry {
  id: string;
  name: string;
  domain: string;
  hash: string;
  version: string;
  description: string;
  tags: string[];
  author: 'human' | 'agent';
  provenance: 'curated' | 'generated' | 'genesis';
  fitness: number;
  file: string;
  created: string;
}

export interface CommonsIndex {
  version: string;
  total: number;
  curated: number;
  generated: number;
  seeds: CanonicalSeedEntry[];
  updated: string;
}

/**
 * Load the commons index
 */
export function loadIndex(): CommonsIndex {
  if (!fs.existsSync(INDEX_PATH)) {
    return { version: '1.0.0', total: 0, curated: 0, generated: 0, seeds: [], updated: new Date().toISOString() };
  }
  return JSON.parse(fs.readFileSync(INDEX_PATH, 'utf-8'));
}

/**
 * Save the commons index
 */
export function saveIndex(index: CommonsIndex): void {
  index.total = index.seeds.length;
  index.curated = index.seeds.filter(s => s.author === 'human').length;
  index.generated = index.seeds.filter(s => s.author === 'agent').length;
  index.updated = new Date().toISOString();
  fs.writeFileSync(INDEX_PATH, JSON.stringify(index, null, 2));
}

/**
 * Add a seed to the commons index
 */
export function addToIndex(entry: CanonicalSeedEntry): CommonsIndex {
  const index = loadIndex();
  const existing = index.seeds.findIndex(s => s.id === entry.id);
  if (existing !== -1) {
    index.seeds[existing] = entry;
  } else {
    index.seeds.push(entry);
  }
  saveIndex(index);
  return index;
}

/**
 * Find seeds by domain
 */
export function findByDomain(domain: string): CanonicalSeedEntry[] {
  return loadIndex().seeds.filter(s => s.domain === domain);
}

/**
 * Find seeds by tags
 */
export function findByTags(tags: string[]): CanonicalSeedEntry[] {
  return loadIndex().seeds.filter(s => tags.some(t => s.tags.includes(t)));
}

/**
 * Search seeds by name or description
 */
export function searchSeeds(query: string): CanonicalSeedEntry[] {
  const q = query.toLowerCase();
  return loadIndex().seeds.filter(s =>
    s.name.toLowerCase().includes(q) ||
    s.description.toLowerCase().includes(q) ||
    s.tags.some(t => t.toLowerCase().includes(q))
  );
}

/**
 * Get seed file path
 */
export function seedFilePath(domain: string, filename: string): string {
  const dir = path.join(SEEDS_DIR, domain);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return path.join(dir, filename);
}

/**
 * Compute SHA-256 hash for a seed object
 */
export function computeSeedHash(seed: Record<string, unknown>): string {
  const canonical = JSON.stringify(seed, Object.keys(seed).sort());
  return crypto.createHash('sha256').update(canonical).digest('hex');
}

/**
 * List all domains in the commons
 */
export function listDomains(): string[] {
  if (!fs.existsSync(SEEDS_DIR)) return [];
  return fs.readdirSync(SEEDS_DIR).filter(d => {
    const stat = fs.statSync(path.join(SEEDS_DIR, d));
    return stat.isDirectory() && !d.startsWith('.');
  });
}

/**
 * Count seeds per domain
 */
export function countByDomain(): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const s of loadIndex().seeds) {
    counts[s.domain] = (counts[s.domain] || 0) + 1;
  }
  return counts;
}

/**
 * Get a random seed from the commons
 */
export function randomSeed(domain?: string): CanonicalSeedEntry | null {
  const index = loadIndex();
  let candidates = index.seeds;
  if (domain) candidates = candidates.filter(s => s.domain === domain);
  if (candidates.length === 0) return null;
  return candidates[Math.floor(Math.random() * candidates.length)];
}