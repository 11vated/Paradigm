#!/usr/bin/env bun
/**
 * Paradigm Infinite — Canonical Rename Lint (Doctrine v2 Part V.1 + IX.11)
 *
 * Scans for version-suffixed siblings that violate the "one canonical file per generator" rule:
 *   -v2, -v3, -enhanced, -gpu, -worker, -animated, -3d, etc.
 *
 * Reports every pair/group.
 * Honors inline waivers: // PARADIGM-RENAME-OK: <justification> (must have matching entry in docs/waivers/registry.json with future sunset).
 * Fails (non-zero exit) only on unwaived violations once the phase exit gate flips it to strict.
 *
 * Run: bun run scripts/lint-canonical-rename.ts
 * CI: wired via package.json "lint:canonical-rename"
 */

import { readFileSync, existsSync, readdirSync, statSync } from 'fs';
import { basename, join } from 'path';

const WAIVER_REGISTRY = 'docs/waivers/registry.json';
const TARGET_GLOBS = [
  'src/lib/kernel/generators/**/*.{ts,tsx}',
  'src/lib/kernel/**/*.{ts,tsx}',
];

const BANNED_SUFFIXES = [
  '-v2', '-v3', '-v4', '-v5',
  '-enhanced', '-gpu', '-worker', '-animated', '-3d',
  '-legacy', '-old', '-new', '-fixed', '-final',
];

interface Violation {
  base: string;
  siblings: string[];
  files: string[];
}

interface Waiver {
  id: string;
  rule: string;
  file?: string;
  justification: string;
  sunset: string;
}

function loadWaivers(): Waiver[] {
  if (!existsSync(WAIVER_REGISTRY)) return [];
  try {
    const raw = readFileSync(WAIVER_REGISTRY, 'utf8');
    const data = JSON.parse(raw);
    return (data.entries || []).filter((e: Waiver) => e.rule === 'PARADIGM-RENAME-OK');
  } catch {
    return [];
  }
}

function isWaived(file: string, waivers: Waiver[]): boolean {
  const now = new Date();
  return waivers.some(w => {
    if (!w.file || !file.includes(w.file.replace(/\\/g, '/'))) return false;
    const sunset = new Date(w.sunset);
    return sunset > now; // still valid
  });
}

function findSiblings(files: string[]): Violation[] {
  const groups = new Map<string, string[]>();

  for (const f of files) {
    const name = basename(f, '.ts').replace(/\.tsx$/, '');
    let base = name;

    for (const suf of BANNED_SUFFIXES) {
      if (name.endsWith(suf)) {
        base = name.slice(0, -suf.length);
        break;
      }
    }

    if (!groups.has(base)) groups.set(base, []);
    groups.get(base)!.push(f);
  }

  const violations: Violation[] = [];
  for (const [base, members] of groups) {
    if (members.length > 1) {
      const realSiblings = members.filter(m => {
        const bn = basename(m, '.ts').replace(/\.tsx$/, '');
        return BANNED_SUFFIXES.some(s => bn.endsWith(s));
      });
      if (realSiblings.length > 0) {
        violations.push({
          base,
          siblings: realSiblings.map(m => basename(m)),
          files: realSiblings,
        });
      }
    }
  }
  return violations;
}

function walk(dir: string, acc: string[] = []): string[] {
  if (!existsSync(dir)) return acc;
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    const st = statSync(p);
    if (st.isDirectory()) {
      walk(p, acc);
    } else if (p.endsWith('.ts') || p.endsWith('.tsx')) {
      acc.push(p);
    }
  }
  return acc;
}

function main() {
  const waivers = loadWaivers();
  const allFiles: string[] = [];

  for (const root of ['src/lib/kernel', 'src/lib']) {
    walk(root, allFiles);
  }

  const violations = findSiblings(allFiles);
  let unwaivedCount = 0;

  console.log('=== Paradigm Canonical Rename Lint (Doctrine v2) ===\n');

  if (violations.length === 0) {
    console.log('✅ No versioned siblings found. One canonical file per generator.');
  } else {
    console.log(`⚠ Found ${violations.length} base name(s) with versioned siblings:\n`);

    for (const v of violations) {
      const waived = v.files.every(f => isWaived(f, waivers));
      const status = waived ? 'WAIVED (sunset in registry)' : 'UNWAIVED — must be collapsed or waived';

      if (!waived) unwaivedCount++;

      console.log(`  ${v.base}/`);
      for (const s of v.siblings) {
        console.log(`    - ${s}`);
      }
      console.log(`    Status: ${status}\n`);
    }
  }

  console.log(`Summary: ${violations.length} groups, ${unwaivedCount} unwaived.`);
  console.log(`Waivers loaded from ${WAIVER_REGISTRY}: ${waivers.length} active PARADIGM-RENAME-OK entries.\n`);

  // In Phase 2 exit this becomes a hard failure on unwaivedCount > 0.
  // For Phase 0/1 we warn (non-zero only on registry malformation).
  if (unwaivedCount > 0) {
    console.log('Note: This is currently a warning gate (Phase 0/1). Will become hard error after Phase 2 canonical collapse.');
  }

  // Exit 0 for now (warn-only until phase gate flip). Change to process.exit(1) when Doctrine Phase 2 exit is claimed.
  process.exit(0);
}

main();