#!/usr/bin/env bun
/**
 * lint-determinism.ts
 *
 * Hard-fail CI guard against non-deterministic entropy in
 * determinism-critical paths.
 *
 * Forbidden APIs:
 *   - Math.random()
 *   - crypto.randomUUID(...)
 *   - performance.now()
 *   - Date.now()
 *   - new Date() (without .toISOString constant arg)
 *
 * Allowed locations:
 *   - src/lib/kernel/clock.ts (the *only* legitimate source of wall time)
 *   - any line tagged `// PARADIGM-WALL-CLOCK-OK` (explicit waiver)
 *   - any *.test.ts, *.test.tsx, or under __tests__/ (tests may seed via wall time)
 *   - any file matching the EXEMPT list below (UI / dev-only / non-kernel concerns)
 *
 * Exits non-zero on any violation; prints a structured report.
 *
 * Run:  bun run scripts/lint-determinism.ts
 */

import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const ROOTS = [
  "src/lib/kernel",
  "src/lib/gspl",
  "src/lib/evolution",
  "src/lib/composition",
];
const CWD = process.cwd();

const FORBIDDEN: Array<{ pattern: RegExp; name: string }> = [
  { pattern: /\bMath\.random\s*\(/g, name: "Math.random()" },
  { pattern: /\bcrypto\.randomUUID\s*\(/g, name: "crypto.randomUUID()" },
  { pattern: /\bperformance\.now\s*\(/g, name: "performance.now()" },
  { pattern: /\bDate\.now\s*\(/g, name: "Date.now()" },
  { pattern: /\bnew\s+Date\s*\(\s*\)/g, name: "new Date()" },
];

const EXEMPT_FILES = new Set([
  "src/lib/kernel/clock.ts",                  // wall-clock implementation (the only legit source)
  "src/lib/kernel/federation.ts",             // peer-id nonce — TODO: replace with seeded ID
  "src/lib/kernel/quality-contract.ts",       // doc-comment mentions, not entropy uses
  "src/lib/kernel/observability.ts",          // logging, if present
]);

// Paths we don't enforce against (UI, dev tools, services that legitimately use wall time)
const EXEMPT_PREFIXES = [
  "src/lib/kernel/dev/",
];

const WAIVER_TAG = "PARADIGM-WALL-CLOCK-OK";

interface Violation {
  file: string;
  line: number;
  api: string;
  context: string;
}

function walk(dir: string, acc: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    const s = statSync(p);
    if (s.isDirectory()) walk(p, acc);
    else if ((entry.endsWith(".ts") || entry.endsWith(".tsx")) && !entry.endsWith(".d.ts")) acc.push(p);
  }
  return acc;
}

function isExempt(file: string): boolean {
  if (EXEMPT_FILES.has(file)) return true;
  if (file.includes("__tests__") || file.endsWith(".test.ts") || file.endsWith(".test.tsx")) return true;
  for (const prefix of EXEMPT_PREFIXES) {
    if (file.startsWith(prefix)) return true;
  }
  return false;
}

function lint(file: string): Violation[] {
  if (isExempt(file)) return [];
  const src = readFileSync(file, "utf8");
  const lines = src.split("\n");
  const violations: Violation[] = [];

  let inBlockComment = false;
  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i]!;
    const trimmed = raw.trim();

    // skip block comments
    if (inBlockComment) {
      if (trimmed.includes("*/")) inBlockComment = false;
      continue;
    }
    if (trimmed.startsWith("/*")) {
      if (!trimmed.includes("*/")) inBlockComment = true;
      continue;
    }
    // skip whole-line comments
    if (trimmed.startsWith("//") || trimmed.startsWith("*")) continue;
    // strip trailing line comments before scanning
    const codeOnly = raw.replace(/\/\/.*$/, "");

    // explicit waiver
    if (raw.includes(WAIVER_TAG)) continue;

    for (const { pattern, name } of FORBIDDEN) {
      pattern.lastIndex = 0;
      if (pattern.test(codeOnly)) {
        violations.push({
          file,
          line: i + 1,
          api: name,
          context: trimmed.slice(0, 100),
        });
      }
    }
  }
  return violations;
}

function main() {
  const files: string[] = [];
  for (const root of ROOTS) {
    try {
      walk(root).forEach((f) => files.push(relative(CWD, f)));
    } catch {
      // root missing — skip silently (e.g. composition/ may not exist yet)
    }
  }
  const all: Violation[] = [];
  for (const f of files) all.push(...lint(f));

  if (all.length === 0) {
    console.log("✅ lint-determinism: 0 violations across", files.length, "files in determinism-critical roots:", ROOTS.join(", "));
    process.exit(0);
  }

  console.error(`❌ lint-determinism: ${all.length} violation${all.length === 1 ? "" : "s"} across ${new Set(all.map((v) => v.file)).size} file(s)\n`);
  for (const v of all) {
    console.error(`  ${v.file}:${v.line}  ${v.api}`);
    console.error(`    ${v.context}`);
  }
  console.error(`\nFix options:`);
  console.error(`  • Replace with seeded RNG: import { Xoshiro256StarStar, rngFromHash } from '@/lib/kernel/rng'`);
  console.error(`  • For legitimate wall-clock use: route via kernel/clock.ts and use 'wall' mode explicitly`);
  console.error(`  • For one-off waivers: append \`// ${WAIVER_TAG}\` to the offending line and justify in PR description`);
  process.exit(1);
}

main();
