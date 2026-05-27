/**
 * Atlas routes — Doctrine v2 Part XXIII v0 (OS shell substrate).
 *
 *   GET /api/atlas
 *     Query: ?domains=a,b,c  (comma-separated; empty = all)
 *            ?limit=N         (default 1000, max 5000)
 *
 *   GET /api/atlas/health
 *     Returns the layout hash for a tiny canonical input.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Express, Request, Response } from 'express';
import { computeAtlasLayout, type AtlasNode } from '../../lib/atlas/atlas-layout.js';

interface CommonsIndexEntry {
  id: string;
  name?: string;
  domain: string;
  fitness?: number;
  parents?: ReadonlyArray<string>;
  file?: string;
}

interface CommonsIndex {
  seeds: ReadonlyArray<CommonsIndexEntry>;
}

let cachedIndex: CommonsIndex | null = null;

function loadIndex(cwd: string): CommonsIndex {
  if (cachedIndex) return cachedIndex;
  try {
    const raw = readFileSync(join(cwd, 'data', 'commons', 'index.json'), 'utf8');
    cachedIndex = JSON.parse(raw) as CommonsIndex;
    return cachedIndex;
  } catch {
    cachedIndex = { seeds: [] };
    return cachedIndex;
  }
}

export function registerAtlasRoutes(app: Express, opts: { cwd?: string } = {}): void {
  const cwd = opts.cwd ?? process.cwd();

  app.get('/api/atlas/health', (_req: Request, res: Response) => {
    const sample: AtlasNode[] = [
      { seedId: 'a', domain: 'agent', name: 'A' },
      { seedId: 'b', domain: 'music', name: 'B', parents: ['a'] },
      { seedId: 'c', domain: 'agent', name: 'C', parents: ['a'] },
    ];
    const view = computeAtlasLayout(sample);
    res.json({
      ok: true,
      layoutHash: view.layoutHash,
      stats: view.stats,
      schema: 'https://paradigm.ai/schema/atlas/v1',
    });
  });

  app.get('/api/atlas', (req: Request, res: Response) => {
    const index = loadIndex(cwd);
    const limit = Math.min(5000, Math.max(1, Number(req.query.limit ?? 1000) || 1000));
    const domainsFilter = typeof req.query.domains === 'string' && req.query.domains.length > 0
      ? new Set(req.query.domains.split(',').map((s) => s.trim()).filter(Boolean))
      : null;

    const filtered = index.seeds
      .filter((s) => !domainsFilter || domainsFilter.has(s.domain))
      .slice(0, limit);

    const nodes: AtlasNode[] = filtered.map((s) => ({
      seedId: s.id,
      domain: s.domain,
      name: s.name,
      fitness: s.fitness,
      parents: s.parents,
    }));

    const view = computeAtlasLayout(nodes);
    res.json({
      schema: 'https://paradigm.ai/schema/atlas/v1',
      ...view,
    });
  });
}
