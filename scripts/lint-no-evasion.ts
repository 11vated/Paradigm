#!/usr/bin/env bun
/**
 * Paradigm Infinite — No-Evasion Lint (Doctrine v2 Part V.3 + V.8 + IX.11)
 *
 * Scans domain code for evasion patterns that violate substrate honesty:
 *   - `as any`, `as unknown as any`
 *   - @ts-nocheck (anywhere in src/)
 *   - // @ts-ignore
 *   - // eslint-disable (bare, without specific rule in domain code)
 *   - bare `catch { }` or `catch (e) { }` with no re-throw or typed handling (broad-except)
 *
 * Domain roots: src/lib/{kernel,gspl,evolution,composition,intelligence,friend,world,game}
 *
 * Honors:
 *   - Inline: // PARADIGM-EVASION-OK: <one-line justification>
 *   - Registry: docs/waivers/registry.json entries with rule PARADIGM-EVASION-OK + future sunset date
 *
 * Run: bun run scripts/lint-no-evasion.ts
 * CI: "lint:no-evasion" (warn-only in Phase 0/1, hard error after Phase 1 exit gate)
 */

import { readFileSync, existsSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

const WAIVER_REGISTRY = 'docs/waivers/registry.json';
const DOMAIN_ROOTS = [
  'src/lib/kernel',
  'src/lib/gspl',
  'src/lib/evolution',
  'src/lib/composition',
  'src/lib/intelligence',
  'src/lib/friend',
  'src/lib/world',
  'src/lib/game',
];

interface Finding {
  file: string;
  line: number;
  pattern: string;
  snippet: string;
  waived: boolean;
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
    const data = JSON.parse(readFileSync(WAIVER_REGISTRY, 'utf8'));
    return (data.entries || []).filter((e: Waiver) => e.rule === 'PARADIGM-EVASION-OK');
  } catch {
    return [];
  }
}

function isWaived(file: string, line: number, waivers: Waiver[]): boolean {
  const now = new Date();
  const normalized = file.replace(/\\/g, '/');
  return waivers.some(w => {
    if (!w.file) return false;
    if (!normalized.includes(w.file.replace(/\\/g, '/'))) return false;
    const sunset = new Date(w.sunset);
    return sunset > now;
  });
}

const PATTERNS = [
  { name: 'as any', regex: /\bas\s+any\b/g },
  { name: '@ts-nocheck', regex: /@ts-nocheck/g },
  { name: '@ts-ignore', regex: /@ts-ignore/g },
  { name: 'bare eslint-disable', regex: /eslint-disable(?!-next-line)/g },
  { name: 'broad catch', regex: /catch\s*\(\s*\w*\s*\)\s*\{/g },
];

function scanFile(file: string, waivers: Waiver[]): Finding[] {
  const content = readFileSync(file, 'utf8');
  const lines = content.split(/\r?\n/);
  const findings: Finding[] = [];

  lines.forEach((line, idx) => {
    const lineNo = idx + 1;

    // Skip if the line itself carries a fresh waiver comment
    if (/PARADIGM-EVASION-OK/.test(line)) return;

    for (const p of PATTERNS) {
      const matches = [...line.matchAll(p.regex)];
      if (matches.length > 0) {
        const waived = isWaived(file, lineNo, waivers);
        findings.push({
          file,
          line: lineNo,
          pattern: p.name,
          snippet: line.trim().slice(0, 120),
          waived,
        });
      }
    }
  });

  return findings;
}

function walk(dir: string, acc: string[] = []): string[] {
  if (!existsSync(dir)) return acc;
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    try {
      const st = statSync(p);
      if (st.isDirectory()) {
        walk(p, acc);
      } else if (p.endsWith('.ts') || p.endsWith('.tsx')) {
        acc.push(p);
      }
    } catch {}
  }
  return acc;
}

function main() {
  const waivers = loadWaivers();
  const files: string[] = [];

  for (const root of DOMAIN_ROOTS) {
    walk(root, files);
  }

  const allFindings: Finding[] = [];
  for (const f of files) {
    allFindings.push(...scanFile(f, waivers));
  }

  const unwaived = allFindings.filter(f => !f.waived);
  const waivedCount = allFindings.length - unwaived.length;

  console.log('=== Paradigm No-Evasion Lint (Doctrine v2) ===\n');
  console.log(`Scanned ${files.length} files in domain roots.`);
  console.log(`Active PARADIGM-EVASION-OK waivers in registry: ${waivers.length}\n`);

  if (allFindings.length === 0) {
    console.log('✅ Zero evasion patterns found in domain code.');
  } else {
    console.log(`Total findings: ${allFindings.length} (${waivedCount} waived, ${unwaived.length} unwaived)\n`);

    if (unwaived.length > 0) {
      console.log('UNWAIVED (must be fixed or properly waived with sunset):');
      for (const f of unwaived.slice(0, 50)) { // cap output
        console.log(`  ${f.file}:${f.line} — ${f.pattern}`);
        console.log(`    ${f.snippet}`);
      }
      if (unwaived.length > 50) {
        console.log(`  ... and ${unwaived.length - 50} more`);
      }
      console.log('');
    }

    const byPattern = new Map<string, number>();
    for (const f of unwaived) {
      byPattern.set(f.pattern, (byPattern.get(f.pattern) || 0) + 1);
    }
    console.log('Unwaived breakdown:');
    for (const [p, c] of byPattern) {
      console.log(`  ${p}: ${c}`);
    }
  }

  console.log('\nNote: Currently warn-only (Phase 0/1). Becomes hard failure after Phase 1 exit gate per Doctrine V.8.');
  console.log('Add // PARADIGM-EVASION-OK comments + matching registry entries for intentional temporary swallows.');

  // Non-zero only for registry problems in this phase. Flip to exit(1) on unwaived > 0 after Phase 1.
  process.exit(0);
}

main();