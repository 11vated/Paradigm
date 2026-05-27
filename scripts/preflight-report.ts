#!/usr/bin/env bun
/**
 * preflight-report.ts
 *
 * Doctrine v2 Part V.8 + XV.3 — run all eight pre-flight gates, then
 * emit a JSON report to stdout and (optionally) POST it to the
 * Substrate Health Dashboard's `/api/substrate/health/report`
 * endpoint.
 *
 * Usage:
 *   bun run scripts/preflight-report.ts            # print report to stdout
 *   bun run scripts/preflight-report.ts --post URL # also POST to URL
 *
 * The script never throws on gate failure; it reports the metric and
 * exits 0. CI is expected to consume the report and decide whether to
 * fail the build based on which gates are strict vs warn-only.
 */
import { spawnSync, type SpawnSyncReturns } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

interface Gate {
  id: string;
  description: string;
  run(): GateResult;
}

interface GateResult {
  id: string;
  description: string;
  passed: boolean;
  violations: number;
  durationMs: number;
  detail?: string;
}

function runBunScript(script: string): SpawnSyncReturns<Buffer> {
  return spawnSync('bun', ['run', join('scripts', script)], { cwd: process.cwd() });
}

function parseDeterministicLintOutput(out: string): { violations: number } {
  // Patterns observed:
  //   "✅ lint-XYZ: 0 violations across N files…"
  //   "❌ lint-XYZ: 24 canonical-rename violation(s):"
  //   "❌ lint-XYZ: 419 evasion violation(s):"
  // Capture the integer that immediately precedes the literal "violation".
  const m = out.match(/(\d+)\s+\w[\w-]*\s+violation/i)
    ?? out.match(/(\d+)\s+violation/i);
  return { violations: m ? Number(m[1]) : 0 };
}

const GATES: Gate[] = [
  {
    id: 'determinism',
    description: 'Determinism boundary (Doctrine V.5 / IX.4)',
    run() {
      const t0 = Date.now();
      const r = runBunScript('lint-determinism.ts');
      const out = (r.stdout?.toString() ?? '') + (r.stderr?.toString() ?? '');
      const v = parseDeterministicLintOutput(out);
      const passed = r.status === 0 && v.violations === 0;
      return {
        id: this.id,
        description: this.description,
        passed,
        violations: v.violations,
        durationMs: Date.now() - t0,
        detail: passed ? 'clean' : (out.split('\n').find((l) => l.includes('violation')) ?? ''),
      };
    },
  },
  {
    id: 'canonical-rename',
    description: 'Canonical-rename siblings (Doctrine V.1)',
    run() {
      const t0 = Date.now();
      const r = runBunScript('lint-canonical-rename.ts');
      const out = (r.stdout?.toString() ?? '') + (r.stderr?.toString() ?? '');
      const v = parseDeterministicLintOutput(out);
      const passed = r.status === 0 && v.violations === 0;
      return {
        id: this.id,
        description: this.description,
        passed,
        violations: v.violations,
        durationMs: Date.now() - t0,
        detail: passed ? 'clean' : `${v.violations} sibling pair(s)`,
      };
    },
  },
  {
    id: 'no-evasion',
    description: 'Evasion patterns (Doctrine V.3)',
    run() {
      const t0 = Date.now();
      const r = runBunScript('lint-no-evasion.ts');
      const out = (r.stdout?.toString() ?? '') + (r.stderr?.toString() ?? '');
      const v = parseDeterministicLintOutput(out);
      const passed = r.status === 0 && v.violations === 0;
      return {
        id: this.id,
        description: this.description,
        passed,
        violations: v.violations,
        durationMs: Date.now() - t0,
        detail: passed ? 'clean' : `${v.violations} evasion(s)`,
      };
    },
  },
  {
    id: 'typecheck',
    description: 'Strict TypeScript (Doctrine V.2 / V.3)',
    run() {
      const t0 = Date.now();
      const r = spawnSync('npx', ['tsc', '--noEmit'], { cwd: process.cwd() });
      const out = (r.stdout?.toString() ?? '') + (r.stderr?.toString() ?? '');
      // Count "error TS" lines.
      const errors = (out.match(/error TS\d+/g) ?? []).length;
      return {
        id: this.id,
        description: this.description,
        passed: r.status === 0,
        violations: errors,
        durationMs: Date.now() - t0,
        detail: r.status === 0 ? 'clean' : `${errors} type error(s)`,
      };
    },
  },
  {
    id: 'ts-nocheck',
    description: 'No @ts-nocheck in src (Doctrine V.2)',
    run() {
      const t0 = Date.now();
      // Match line-start `// @ts-nocheck` (the only form TypeScript honors).
      // Exclude self-references in the detector source files.
      const r = spawnSync('grep', [
        '-rln',
        '-E',
        '^[[:space:]]*//[[:space:]]*@ts-nocheck',
        'src',
      ], { cwd: process.cwd() });
      const out = r.stdout?.toString() ?? '';
      const lines = out.trim() === '' ? [] : out.trim().split('\n');
      // Filter out files that legitimately reference the marker as a string literal
      // or in a regex (preflight detector, substrate-health snapshot).
      const SELF_REFS = [
        'src/server/routes/substrate-health.ts',
        'scripts/preflight-report.ts',
      ];
      const real = lines.filter((p) => !SELF_REFS.some((s) => p.endsWith(s)));
      const violations = real.length;
      return {
        id: this.id,
        description: this.description,
        passed: violations === 0,
        violations,
        durationMs: Date.now() - t0,
        detail: violations === 0 ? 'clean' : `${violations} file(s) with @ts-nocheck`,
      };
    },
  },
  {
    id: 'waiver-registry',
    description: 'Waiver registry well-formed (Doctrine XXIII.2)',
    run() {
      const t0 = Date.now();
      const path = join(process.cwd(), 'docs/waivers/registry.json');
      if (!existsSync(path)) {
        return {
          id: this.id,
          description: this.description,
          passed: false,
          violations: 1,
          durationMs: Date.now() - t0,
          detail: 'docs/waivers/registry.json missing',
        };
      }
      try {
        const raw = readFileSync(path, 'utf-8');
        const obj = JSON.parse(raw) as { waivers?: unknown };
        const count = Array.isArray(obj.waivers) ? obj.waivers.length : 0;
        // Sanity: validate each waiver has rule + sunset.
        let malformed = 0;
        if (Array.isArray(obj.waivers)) {
          for (const w of obj.waivers as Array<Record<string, unknown>>) {
            if (typeof w.rule !== 'string' || typeof w.sunset !== 'string') malformed += 1;
          }
        }
        return {
          id: this.id,
          description: this.description,
          passed: malformed === 0,
          violations: malformed,
          durationMs: Date.now() - t0,
          detail: `${count} waiver(s); ${malformed} malformed`,
        };
      } catch (e) {
        return {
          id: this.id,
          description: this.description,
          passed: false,
          violations: 1,
          durationMs: Date.now() - t0,
          detail: `parse error: ${(e as Error).message}`,
        };
      }
    },
  },
];

function main(): void {
  const args = process.argv.slice(2);
  const postIdx = args.indexOf('--post');
  const postUrl = postIdx >= 0 ? args[postIdx + 1] : null;
  const runId = process.env.GITHUB_RUN_ID ?? process.env.CI_RUN_ID ?? null;

  const results = GATES.map((g) => g.run());
  const metrics: Record<string, number> = {};
  for (const r of results) {
    metrics[`${r.id}_violations`] = r.violations;
    metrics[`${r.id}_passed`] = r.passed ? 1 : 0;
    metrics[`${r.id}_duration_ms`] = r.durationMs;
  }
  const allPassed = results.every((r) => r.passed);
  metrics.preflight_all_passed = allPassed ? 1 : 0;
  metrics.preflight_gate_count = results.length;

  const report = {
    source: 'preflight-report.ts',
    runId,
    timestamp: new Date().toISOString(),
    allPassed,
    results,
    metrics,
  };

  console.log(JSON.stringify(report, null, 2));

  if (postUrl) {
    fetch(postUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ source: report.source, runId, metrics }),
    })
      .then((r) => {
        if (!r.ok) console.error(`[preflight] POST failed: ${r.status}`);
      })
      .catch((e) => {
        console.error(`[preflight] POST error: ${(e as Error).message}`);
      });
  }
}

main();
