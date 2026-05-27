/**
 * Substrate Health Dashboard route — Doctrine v2 Part XV.3.
 *
 * Exposes the canonical doctrine-aligned metric surface as JSON so the
 * dashboard UI, CI annotators, and any external auditor can read the
 * substrate's invariant compliance without scraping logs.
 *
 * Metrics surfaced (Phase 0):
 *   - determinism_lint_violations  (target 0)        Part IX.4 / V.5
 *   - canonical_rename_siblings    (target 0)        Part V.1
 *   - ts_nocheck_count             (target 0)        Part V.2
 *   - evasion_violations           (target 0)        Part V.3
 *   - stratum_contracts_registered                   Part VI
 *   - server_route_modules                           Part V.6
 *   - waiver_count_active                            Part XXIII.2
 *
 * Phase 1+ adds: per-engine conformance %, golden-hash matrix parity,
 * federation peer counts, civilization dividend pool, oracle replay
 * status. See doctrine Part XV.3 for the full schema.
 *
 * The endpoint is always-on and unauthenticated by design (it is the
 * public proof surface). It runs static analysis at request time on
 * the deployed source tree; results are cached for 30s to avoid
 * thrashing.
 *
 * Routes:
 *   GET  /api/substrate/health         → JSON metric snapshot
 *   GET  /api/substrate/health/strata  → per-stratum contract registry
 */
import type { Express, Request, Response } from 'express';
import { readdirSync, readFileSync } from 'node:fs';
import { basename, join } from 'node:path';
import {
  STRATA,
  STRATUM_CONTRACTS,
  type StratumId,
} from '../../lib/contracts/index.js';
import {
  listStrataDeclarations,
  computeStratumCoverage,
} from '../../lib/kernel/quality-contract.js';
import { kernelNowIso } from '../../lib/kernel/clock.js';

interface CachedSnapshot {
  expiresAt: number;
  payload: SubstrateHealthSnapshot;
}

export interface SubstrateHealthSnapshot {
  generatedAt: string;
  doctrineVersion: 'v2';
  metrics: {
    determinismLintViolations: number | 'unknown';
    canonicalRenameSiblings: number | 'unknown';
    tsNoCheckCount: number | 'unknown';
    evasionViolations: number | 'unknown';
    serverRouteModules: number;
    stratumContractsRegistered: number;
    waiverCountActive: number;
    waiverCountExpired: number;
  };
  strata: ReadonlyArray<{
    id: string;
    version: string;
    predicateCount: number;
  }>;
}

let cache: CachedSnapshot | null = null;
const CACHE_TTL_MS = 30_000;

// ─── Health report ring buffer (Doctrine v2 Part XV.3) ──────────────────────

interface HealthReport {
  source: string;
  runId: string | null;
  metrics: Record<string, number>;
  receivedAt: string;
}

const REPORT_RING_CAPACITY = 50;
const reportRing: HealthReport[] = [];

function pushReport(r: HealthReport): void {
  reportRing.push(r);
  while (reportRing.length > REPORT_RING_CAPACITY) {
    reportRing.shift();
  }
}

function isValidMetrics(v: unknown): v is Record<string, number> {
  if (v === null || typeof v !== 'object') return false;
  for (const k of Object.keys(v as Record<string, unknown>)) {
    const n = (v as Record<string, unknown>)[k];
    if (typeof n !== 'number' || !Number.isFinite(n)) return false;
  }
  return true;
}

function walk(dir: string, out: string[]): void {
  let entries: Array<{ name: string; isDirectory: () => boolean; isFile: () => boolean }>;
  try {
    entries = readdirSync(dir, { withFileTypes: true }) as unknown as Array<{
      name: string;
      isDirectory: () => boolean;
      isFile: () => boolean;
    }>;
  } catch {
    return;
  }
  for (const e of entries) {
    const name = String(e.name);
    const p = join(dir, name);
    if (e.isDirectory()) {
      if (name === 'node_modules' || name.startsWith('.')) continue;
      walk(p, out);
    } else if (e.isFile()) {
      out.push(p);
    }
  }
}

function countCanonicalRenameSiblings(cwd: string): number {
  const SUFFIX_RE = /-(v[0-9]+|enhanced|gpu|worker|animated|3d)\.ts$/;
  const root = join(cwd, 'src');
  const files: string[] = [];
  try {
    walk(root, files);
  } catch {
    return 0;
  }
  const set = new Set(files);
  let count = 0;
  for (const f of files) {
    const b = basename(f);
    if (!SUFFIX_RE.test(b) || !f.endsWith('.ts')) continue;
    const dir = f.slice(0, f.length - b.length);
    const baseRoot = b.slice(0, b.indexOf('-'));
    const canonical = `${dir}${baseRoot}.ts`;
    if (set.has(canonical)) count++;
  }
  return count;
}

function countTsNoCheck(cwd: string): number {
  const root = join(cwd, 'src');
  const files: string[] = [];
  try {
    walk(root, files);
  } catch {
    return 0;
  }
  let count = 0;
  for (const f of files) {
    if (!(f.endsWith('.ts') || f.endsWith('.tsx'))) continue;
    try {
      const src = readFileSync(f, 'utf8');
      if (/@ts-nocheck\b/.test(src)) count++;
    } catch {
      /* ignore */
    }
  }
  return count;
}

interface WaiverRegistry {
  waivers: Array<{ rule: string; sunset: string; path: string; line?: number; justification: string; owner: string }>;
}

function readWaivers(cwd: string): { active: number; expired: number } {
  try {
    const raw = readFileSync(join(cwd, 'docs/waivers/registry.json'), 'utf8');
    const reg = JSON.parse(raw) as WaiverRegistry;
    const now = Date.now();
    let active = 0;
    let expired = 0;
    for (const w of reg.waivers) {
      const sunsetMs = Date.parse(w.sunset);
      if (!Number.isNaN(sunsetMs) && sunsetMs > now) active++;
      else expired++;
    }
    return { active, expired };
  } catch {
    return { active: 0, expired: 0 };
  }
}

function countServerRoutes(cwd: string): number {
  try {
    return readdirSync(join(cwd, 'src/server/routes')).filter((f) => f.endsWith('.ts')).length;
  } catch {
    return 0;
  }
}

function buildSnapshot(cwd: string): SubstrateHealthSnapshot {
  const waivers = readWaivers(cwd);
  return {
    generatedAt: kernelNowIso(),
    doctrineVersion: 'v2',
    metrics: {
      // The lint scripts produce these; here we approximate the static
      // surface (sibling + ts-nocheck) at request time. Determinism /
      // evasion are reported as "unknown" until CI annotates them via
      // POST /api/substrate/health/report (Phase 1).
      determinismLintViolations: 'unknown',
      canonicalRenameSiblings: countCanonicalRenameSiblings(cwd),
      tsNoCheckCount: countTsNoCheck(cwd),
      evasionViolations: 'unknown',
      serverRouteModules: countServerRoutes(cwd),
      stratumContractsRegistered: STRATA.length,
      waiverCountActive: waivers.active,
      waiverCountExpired: waivers.expired,
    },
    strata: STRATA.map((id) => ({
      id,
      version: STRATUM_CONTRACTS[id].version,
      predicateCount: STRATUM_CONTRACTS[id].predicates.length,
    })),
  };
}

export function registerSubstrateHealthRoutes(app: Express, opts: { cwd?: string } = {}): void {
  const cwd = opts.cwd ?? process.cwd();

  app.get('/api/substrate/health', (_req: Request, res: Response) => {
    if (cache && cache.expiresAt > Date.now()) {
      res.json(cache.payload);
      return;
    }
    const payload = buildSnapshot(cwd);
    cache = { expiresAt: Date.now() + CACHE_TTL_MS, payload };
    res.json(payload);
  });

  app.get('/api/substrate/health/strata', (_req: Request, res: Response) => {
    res.json({
      doctrineVersion: 'v2',
      strata: STRATA.map((id) => {
        const c = STRATUM_CONTRACTS[id];
        return {
          id,
          version: c.version,
          predicates: c.predicates.map((p) => ({ id: p.id, description: p.description })),
        };
      }),
      declarations: listStrataDeclarations(),
      coverageIndex: computeStratumCoverage(),
    });
  });

  // CI annotation surface (Doctrine v2 Part XV.3, Phase 1).
  app.post('/api/substrate/health/report', (req: Request, res: Response) => {
    const body = req.body as Record<string, unknown> | undefined;
    if (!body || typeof body !== 'object') {
      res.status(400).json({ error: 'body must be a JSON object' });
      return;
    }
    const source = typeof body.source === 'string' ? body.source : null;
    const runId = typeof body.runId === 'string' ? body.runId : null;
    const metrics = body.metrics;
    if (!source) {
      res.status(400).json({ error: 'source is required (string)' });
      return;
    }
    if (!isValidMetrics(metrics)) {
      res.status(400).json({ error: 'metrics must be a flat Record<string, finite number>' });
      return;
    }
    const report: HealthReport = {
      source,
      runId,
      metrics: { ...metrics },
      receivedAt: new Date().toISOString(),
    };
    pushReport(report);
    res.status(202).json({ accepted: true, receivedAt: report.receivedAt });
  });

  app.get('/api/substrate/health/reports', (_req: Request, res: Response) => {
    res.json({
      capacity: REPORT_RING_CAPACITY,
      count: reportRing.length,
      reports: [...reportRing].reverse(), // newest first
    });
  });
}
