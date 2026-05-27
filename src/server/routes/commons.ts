/**
 * Commons routes — Doctrine v2 Part VIII.14 (public corpus browser substrate).
 *
 * Exposes the curated + generated seed corpus shipped in `data/commons/`
 * over HTTP so the Studio's `/explore` page and any external auditor
 * can browse the public substrate without server-side state.
 *
 *   GET /api/commons/stats             — totals + per-domain counts
 *   GET /api/commons                   — filter/paginate the index
 *     query: domain, q (search), provenance, page, pageSize, sortBy
 *   GET /api/commons/seeds/:id         — full seed JSON
 *
 * The index lives at `data/commons/index.json`; individual seeds at
 * `data/commons/seeds/<domain>/<file>.json` (path declared in the
 * index entry's `file` field). The handler reads the index ONCE on
 * register, then reads each seed on demand and caches it in-memory.
 */
import { readFileSync, existsSync } from 'node:fs';
import { join, resolve, normalize } from 'node:path';
import type { Express, Request, Response } from 'express';

interface IndexEntry {
  id: string;
  name: string;
  domain: string;
  hash: string;
  version?: string;
  description?: string;
  tags?: string[];
  author?: string;
  provenance?: 'curated' | 'generated' | string;
  fitness?: number;
  file: string;
  created?: string;
}

interface CommonsIndex {
  version: string;
  total: number;
  curated: number;
  generated: number;
  seeds: IndexEntry[];
  updated?: string;
}

export interface CommonsRouteOpts {
  /** Project root; defaults to process.cwd(). */
  cwd?: string;
  /** Hard cap on pageSize. */
  maxPageSize?: number;
}

export function registerCommonsRoutes(app: Express, opts: CommonsRouteOpts = {}): void {
  const cwd = opts.cwd ?? process.cwd();
  const commonsRoot = resolve(cwd, 'data/commons');
  const indexPath = join(commonsRoot, 'index.json');
  const maxPageSize = Math.max(1, Math.min(opts.maxPageSize ?? 200, 1000));

  // Per-process lazy load — index ~1 MB so loading once is fine.
  let cachedIndex: CommonsIndex | null = null;
  function loadIndex(): CommonsIndex {
    if (cachedIndex) return cachedIndex;
    if (!existsSync(indexPath)) {
      cachedIndex = { version: '0.0.0', total: 0, curated: 0, generated: 0, seeds: [] };
      return cachedIndex;
    }
    cachedIndex = JSON.parse(readFileSync(indexPath, 'utf-8')) as CommonsIndex;
    return cachedIndex;
  }

  function readSeed(file: string): unknown | null {
    // SECURITY: path traversal guard. File path is taken from the
    // index, which is operator-controlled, but we still pin to the
    // commons root in case a future contributor commits a `..` entry.
    const seedPath = normalize(join(commonsRoot, 'seeds', file));
    if (!seedPath.startsWith(join(commonsRoot, 'seeds') + '/')) return null;
    if (!existsSync(seedPath)) return null;
    return JSON.parse(readFileSync(seedPath, 'utf-8'));
  }

  // ── /api/commons/stats ──────────────────────────────────────────────────
  app.get('/api/commons/stats', (_req: Request, res: Response) => {
    const idx = loadIndex();
    const byDomain = new Map<string, number>();
    const byProvenance = new Map<string, number>();
    for (const e of idx.seeds) {
      byDomain.set(e.domain, (byDomain.get(e.domain) ?? 0) + 1);
      byProvenance.set(e.provenance ?? 'unknown', (byProvenance.get(e.provenance ?? 'unknown') ?? 0) + 1);
    }
    const domains = [...byDomain.entries()]
      .map(([domain, count]) => ({ domain, count }))
      .sort((a, b) => b.count - a.count);
    const provenance = [...byProvenance.entries()]
      .map(([provenance, count]) => ({ provenance, count }))
      .sort((a, b) => b.count - a.count);
    res.json({
      schema: 'https://paradigm.ai/schema/commons-stats/v1',
      version: idx.version,
      total: idx.total,
      curated: idx.curated,
      generated: idx.generated,
      domains,
      provenance,
      updated: idx.updated ?? null,
    });
  });

  // ── /api/commons ────────────────────────────────────────────────────────
  app.get('/api/commons', (req: Request, res: Response) => {
    const idx = loadIndex();
    const domain = typeof req.query.domain === 'string' ? req.query.domain.toLowerCase() : '';
    const provenance = typeof req.query.provenance === 'string' ? req.query.provenance.toLowerCase() : '';
    const q = typeof req.query.q === 'string' ? req.query.q.toLowerCase().trim() : '';
    const sortBy = typeof req.query.sortBy === 'string' ? req.query.sortBy : 'fitness';
    const page = Math.max(0, Number(req.query.page) || 0);
    const pageSize = Math.max(1, Math.min(Number(req.query.pageSize) || 24, maxPageSize));

    let entries = idx.seeds;
    if (domain) entries = entries.filter((e) => e.domain === domain);
    if (provenance) entries = entries.filter((e) => (e.provenance ?? '').toLowerCase() === provenance);
    if (q) {
      entries = entries.filter((e) => {
        const hay = `${e.name ?? ''} ${e.id} ${e.description ?? ''} ${(e.tags ?? []).join(' ')}`.toLowerCase();
        return hay.includes(q);
      });
    }
    if (sortBy === 'fitness') {
      entries = [...entries].sort((a, b) => (b.fitness ?? 0) - (a.fitness ?? 0));
    } else if (sortBy === 'name') {
      entries = [...entries].sort((a, b) => (a.name ?? a.id).localeCompare(b.name ?? b.id));
    } else if (sortBy === 'created') {
      entries = [...entries].sort((a, b) => (b.created ?? '').localeCompare(a.created ?? ''));
    }

    const total = entries.length;
    const start = page * pageSize;
    const items = entries.slice(start, start + pageSize);
    const totalPages = Math.ceil(total / pageSize);
    res.json({
      schema: 'https://paradigm.ai/schema/commons-list/v1',
      total,
      page,
      pageSize,
      totalPages,
      hasMore: start + items.length < total,
      items,
    });
  });

  // ── /api/commons/seeds/:id ──────────────────────────────────────────────
  app.get('/api/commons/seeds/:id', (req: Request, res: Response) => {
    const id = String(req.params.id || '');
    if (!/^[a-z0-9][a-z0-9-]{0,127}$/i.test(id)) {
      res.status(400).json({ error: 'invalid id' });
      return;
    }
    const idx = loadIndex();
    const entry = idx.seeds.find((e) => e.id === id);
    if (!entry) {
      res.status(404).json({ error: 'not found' });
      return;
    }
    const seed = readSeed(entry.file);
    if (!seed) {
      res.status(404).json({ error: 'seed file missing', entry });
      return;
    }
    res.json({
      schema: 'https://paradigm.ai/schema/commons-seed/v1',
      entry,
      seed,
    });
  });
}
