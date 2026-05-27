#!/usr/bin/env bun
/**
 * lint-canonical-rename.ts
 *
 * Doctrine v2 Part V.1 — banned version-suffixed siblings.
 *
 * Forbids the following sibling patterns when a canonical sibling
 * (`<base>.ts`) ALSO exists in the same directory:
 *
 *   <base>-v2.ts, <base>-v3.ts, …, <base>-v9.ts
 *   <base>-enhanced.ts
 *   <base>-gpu.ts
 *   <base>-worker.ts
 *   <base>-animated.ts
 *   <base>-3d.ts
 *
 * A versioned file with NO canonical sibling is allowed (the version
 * suffix is its canonical name — e.g. there is no `architecture.ts`
 * sibling, so `architecture-3d.ts` is itself canonical and may stay
 * pending a future rename PR).
 *
 * Waivers:
 *   - A line `// PARADIGM-RENAME-OK: <reason>` at the top of the sibling
 *     file declares an intentional, sunset-dated waiver. The matching
 *     entry must exist in `docs/waivers/registry.json` with a future
 *     sunset date or the lint will still fail.
 *
 * Exits non-zero on any violation.
 *
 * Run:  bun run scripts/lint-canonical-rename.ts
 */

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, dirname, basename, extname } from 'node:path';

const ROOTS = ['src'];
const CWD = process.cwd();

const SUFFIX_RE = /-(v[0-9]+|enhanced|gpu|worker|animated|3d)\.ts$/;
const WAIVER_RE = /\/\/\s*PARADIGM-RENAME-OK\s*:\s*(.+)$/m;

type Violation = {
  sibling: string;
  canonical: string;
  reason: string;
};

interface WaiverEntry {
  rule: string;
  path: string;
  justification: string;
  sunset: string; // ISO date
  owner: string;
}

interface WaiverRegistry {
  waivers: WaiverEntry[];
}

function walk(dir: string, out: string[]): void {
  let entries: ReturnType<typeof readdirSync>;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const e of entries) {
    const p = join(dir, e.name);
    if (e.isDirectory()) {
      if (e.name === 'node_modules' || e.name.startsWith('.') || e.name === '__tests__') continue;
      walk(p, out);
    } else if (e.isFile() && p.endsWith('.ts')) {
      out.push(p);
    }
  }
}

function loadWaivers(): WaiverRegistry {
  try {
    const raw = readFileSync(join(CWD, 'docs/waivers/registry.json'), 'utf8');
    return JSON.parse(raw) as WaiverRegistry;
  } catch {
    return { waivers: [] };
  }
}

function waiverActive(reg: WaiverRegistry, path: string, rule: string): boolean {
  const now = Date.now();
  return reg.waivers.some((w) => {
    if (w.rule !== rule) return false;
    if (w.path !== path) return false;
    const sunsetMs = Date.parse(w.sunset);
    if (Number.isNaN(sunsetMs)) return false;
    return sunsetMs > now;
  });
}

function main(): void {
  const registry = loadWaivers();
  const violations: Violation[] = [];
  let scanned = 0;

  for (const root of ROOTS) {
    const absRoot = join(CWD, root);
    try {
      statSync(absRoot);
    } catch {
      continue;
    }
    const files: string[] = [];
    walk(absRoot, files);

    // Build a set of all files for fast canonical-existence checks.
    const set = new Set(files);
    for (const f of files) {
      scanned++;
      const m = SUFFIX_RE.exec(basename(f));
      if (!m) continue;
      const dir = dirname(f);
      const base = basename(f).slice(0, -basename(f).length + basename(f).indexOf('-'));
      const canonical = join(dir, `${base}.ts`);
      if (!set.has(canonical)) continue;

      const rel = relative(CWD, f);
      const relCanonical = relative(CWD, canonical);

      // Check inline waiver
      let inlineWaiver = false;
      try {
        const head = readFileSync(f, 'utf8').slice(0, 4096);
        inlineWaiver = WAIVER_RE.test(head);
      } catch {
        /* ignore */
      }
      if (inlineWaiver && waiverActive(registry, rel, 'canonical-rename')) continue;

      violations.push({
        sibling: rel,
        canonical: relCanonical,
        reason: `Versioned sibling exists alongside canonical "${relCanonical}".`,
      });
    }
  }

  if (violations.length === 0) {
    console.log(
      `✅ lint-canonical-rename: 0 violations across ${scanned} files in ${ROOTS.join(', ')}`,
    );
    process.exit(0);
  }

  console.error(
    `❌ lint-canonical-rename: ${violations.length} canonical-rename violation(s):\n`,
  );
  for (const v of violations) {
    console.error(`  • ${v.sibling}\n      conflicts with canonical: ${v.canonical}`);
  }
  console.error(
    `\nDoctrine v2 Part V.1: deprecated siblings must be removed in the same PR\n` +
      `that introduces the new canonical file. To waive temporarily, add a\n` +
      `\`// PARADIGM-RENAME-OK: <reason>\` line and a matching sunset-dated entry\n` +
      `in \`docs/waivers/registry.json\` with rule=\"canonical-rename\".\n`,
  );
  process.exit(1);
}

main();
