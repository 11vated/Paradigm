/**
 * `paradigm bench` — Doctrine v2 Part VIII.11 (Studio GA exit gate).
 *
 * Measures cold-start → first artifact end-to-end and stage-by-stage.
 * Exit gate: first artifact in under 60_000ms — verified in CI.
 */
import { createHash } from 'node:crypto';
import { performance } from 'node:perf_hooks';
import { runMake, type MakeManifest } from './make.js';

export interface BenchSampleStat {
  count: number;
  minMs: number;
  maxMs: number;
  meanMs: number;
  medianMs: number;
  p95Ms: number;
  stdDevMs: number;
}

export interface BenchResult {
  schema: 'https://paradigm.ai/schema/bench/v1';
  intent: string;
  runs: number;
  budgetMs: number;
  passed: boolean;
  totalMs: BenchSampleStat;
  stages: Record<string, BenchSampleStat>;
  artifactsByteStable: boolean;
  artifactHashes: ReadonlyArray<string>;
  manifestHash: string;
}

function stat(samples: number[]): BenchSampleStat {
  const sorted = [...samples].sort((a, b) => a - b);
  const n = sorted.length;
  const mean = sorted.reduce((s, v) => s + v, 0) / n;
  const median = n % 2 === 0 ? (sorted[n / 2 - 1] + sorted[n / 2]) / 2 : sorted[(n - 1) / 2];
  const p95 = sorted[Math.min(n - 1, Math.floor(n * 0.95))];
  const variance = sorted.reduce((s, v) => s + (v - mean) ** 2, 0) / n;
  return {
    count: n,
    minMs: sorted[0],
    maxMs: sorted[n - 1],
    meanMs: round2(mean),
    medianMs: round2(median),
    p95Ms: round2(p95),
    stdDevMs: round2(Math.sqrt(variance)),
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export interface BenchOpts {
  intent?: string;
  runs?: number;
  budgetMs?: number;
}

export async function runBench(opts: BenchOpts = {}): Promise<BenchResult> {
  const intent = opts.intent ?? 'a benchmark seed';
  const runs = Math.max(1, opts.runs ?? 3);
  const budgetMs = Math.max(1, opts.budgetMs ?? 60_000);

  const totals: number[] = [];
  const stageBuckets: Record<string, number[]> = {};
  const artifactHashes: string[] = [];
  let manifest: MakeManifest | null = null;

  for (let i = 0; i < runs; i++) {
    const t0 = performance.now();
    const m = await runMake({ intent, dryRun: true });
    const elapsed = performance.now() - t0;
    totals.push(elapsed);
    artifactHashes.push(m.artifactHash);
    for (const [stage, ms] of Object.entries(m.timings ?? {})) {
      (stageBuckets[stage] ??= []).push(ms);
    }
    if (manifest === null) manifest = m;
  }

  const totalsStat = stat(totals);
  const stages: Record<string, BenchSampleStat> = {};
  for (const [s, vals] of Object.entries(stageBuckets)) stages[s] = stat(vals);

  const passed = totalsStat.p95Ms <= budgetMs;
  const byteStable = new Set(artifactHashes).size === 1;

  const canonical = JSON.stringify({
    schema: 'https://paradigm.ai/schema/bench/v1',
    intent,
    runs,
    budgetMs,
    passed,
    totalMs: totalsStat,
    stages,
    artifactsByteStable: byteStable,
    artifactHashes,
  });
  const manifestHash = createHash('sha256').update(canonical, 'utf8').digest('hex');

  return {
    schema: 'https://paradigm.ai/schema/bench/v1',
    intent,
    runs,
    budgetMs,
    passed,
    totalMs: totalsStat,
    stages,
    artifactsByteStable: byteStable,
    artifactHashes,
    manifestHash,
  };
}

/** CLI shim — parses argv, calls runBench, prints. */
export async function benchCli(argv: string[]): Promise<{ result: BenchResult; exitCode: number }> {
  let intent = 'a benchmark seed';
  let runs = 3;
  let budgetMs = 60_000;
  let json = false;
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--runs') runs = parseInt(argv[++i], 10);
    else if (a === '--budget-ms' || a === '--budget') budgetMs = parseInt(argv[++i], 10);
    else if (a === '--json') json = true;
    else if (!a.startsWith('--')) intent = a;
  }
  const result = await runBench({ intent, runs, budgetMs });
  if (json) {
    process.stdout.write(JSON.stringify(result, null, 2) + '\n');
  } else {
    const pf = result.passed ? '\x1b[32mPASS\x1b[0m' : '\x1b[31mFAIL\x1b[0m';
    process.stdout.write(`${pf} bench: intent="${intent}" runs=${runs} budget=${budgetMs}ms\n`);
    process.stdout.write(`  total: mean=${result.totalMs.meanMs}ms  p95=${result.totalMs.p95Ms}ms  byteStable=${result.artifactsByteStable}\n`);
    for (const [stage, s] of Object.entries(result.stages).sort()) {
      process.stdout.write(`    ${stage.padEnd(12)} mean=${s.meanMs}ms  p95=${s.p95Ms}ms\n`);
    }
  }
  return { result, exitCode: result.passed ? 0 : 1 };
}
