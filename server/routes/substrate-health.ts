/**
 * Substrate Health — Doctrine v2 observability surface (Part XV.3)
 *
 * Minimal but real endpoints for Phase 0/1:
 *   GET  /api/substrate/health          — current spine metrics (determinism, evasion, waivers, ts-nocheck)
 *   POST /api/substrate/health/report   — CI annotation (accepts { source, runId?, metrics })
 *   GET  /api/substrate/health/reports  — last N reports (ring buffer)
 *
 * This is the seed for the public Substrate Health Dashboard.
 * Future phases will expand it with live stratum conformance, golden matrix, federation peer health, etc.
 */

import { Router, Request, Response } from 'express';
import { execSync } from 'child_process';
import { readFileSync, existsSync } from 'fs';
import { getContractsHealthContribution } from '../../src/lib/contracts/integration/contracts-to-health';

const router = Router();

interface HealthMetrics {
  determinism_violations: number;
  evasion_unwaived: number;
  waiver_count: number;
  ts_nocheck_count: number;
  golden_hashes_ok: boolean | null;
  timestamp: string;
}

interface Report {
  id: string;
  received_at: string;
  source: string;
  run_id?: string;
  metrics: Record<string, number | boolean>;
}

const REPORTS: Report[] = [];
const MAX_REPORTS = 50;

function safeRun(cmd: string): string {
  try {
    return execSync(cmd, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'], timeout: 30000 });
  } catch (e: any) {
    return e.stdout?.toString() || '';
  }
}

function getDeterminismViolations(): number {
  const out = safeRun('npm run determinism:check 2>&1 || true');
  const m = out.match(/Hard violations[^:]*:\s*(\d+)/);
  return m ? parseInt(m[1], 10) : 0;
}

function getEvasionUnwaived(): number {
  const out = safeRun('npx tsx scripts/lint-no-evasion.ts 2>&1 || true');
  const m = out.match(/unwaived.*?:\s*(\d+)/i) || out.match(/(\d+)\s+unwaived/i);
  return m ? parseInt(m[1], 10) : 0;
}

function getWaiverCount(): number {
  try {
    if (!existsSync('docs/waivers/registry.json')) return 0;
    const data = JSON.parse(readFileSync('docs/waivers/registry.json', 'utf8'));
    return (data.entries || []).length;
  } catch {
    return 0;
  }
}

function getTsNocheckCount(): number {
  const out = safeRun('npx tsx -e "const fs=require(\'fs\');const g=require(\'glob\').sync;const f=g(\'src/**/*.{ts,tsx}\');let c=0;f.forEach(p=>{try{const s=fs.readFileSync(p,\'utf8\');if(s.includes(\'@ts-nocheck\'))c++;}catch{}});console.log(c);" 2>&1 || true');
  const n = parseInt(out.trim(), 10);
  return isNaN(n) ? 0 : n;
}

function getGoldenStatus(): boolean | null {
  const out = safeRun('npm run golden:verify -- --silent 2>&1 || true');
  if (out.includes('30/30') || out.includes('match')) return true;
  if (out.includes('fail') || out.includes('mismatch')) return false;
  return null;
}

function computeHealth(): HealthMetrics {
  return {
    determinism_violations: getDeterminismViolations(),
    evasion_unwaived: getEvasionUnwaived(),
    waiver_count: getWaiverCount(),
    ts_nocheck_count: getTsNocheckCount(),
    golden_hashes_ok: getGoldenStatus(),
    timestamp: new Date().toISOString(),
  };
}

router.get('/health', (_req: Request, res: Response) => {
  const metrics = computeHealth();
  const contractsHealth = getContractsHealthContribution();
  res.json({
    status: 'ok',
    doctrine_version: 'v2',
    phase: '0-1',
    metrics,
    new_engineering_contracts: contractsHealth.newEngineeringContracts,
    notes: 'Phase 0/1 foundation. Stratum conformance, federation peers, and full SLOs added in later phases. Engineering contracts (Part 3/5 of 15_ spec) now contributing live data.',
  });
});

router.post('/health/report', (req: Request, res: Response) => {
  const { source, runId, metrics } = req.body || {};
  if (!source || typeof metrics !== 'object') {
    return res.status(400).json({ error: 'source and metrics (object) required' });
  }

  const report: Report = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    received_at: new Date().toISOString(),
    source,
    run_id: runId,
    metrics,
  };

  REPORTS.unshift(report);
  if (REPORTS.length > MAX_REPORTS) REPORTS.pop();

  res.status(202).json({ accepted: true, id: report.id });
});

router.get('/health/reports', (_req: Request, res: Response) => {
  res.json({ count: REPORTS.length, reports: REPORTS.slice(0, 20) });
});

export default router;