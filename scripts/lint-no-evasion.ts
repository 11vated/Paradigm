#!/usr/bin/env tsx
/**
 * Phase 1 — No-Evasion Lint
 *
 * Scans src/lib/kernel, src/lib/contracts, src/lib/evolution for evasion patterns:
 *   - @ts-nocheck
 *   - @ts-ignore (without // waived annotation)
 *   - as any
 *   - catch() with empty argument
 *
 * Waiver-aware: reads docs/waivers/registry.json and subtracts waived counts
 * from the total before reporting. Expired waivers are treated as violations.
 *
 * Phase 1 exit gate target: 0 unwaived evasion patterns.
 * Current baseline (Phase 0 close): 338 waived under phase0-evasion-336-batch.
 *
 * Usage:
 *   tsx scripts/lint-no-evasion.ts [--max-unwaived <N>]
 *
 * Exit codes:
 *   0 — unwaived count ≤ max-unwaived (or no threshold set)
 *   1 — unwaived count > max-unwaived, or expired waiver found
 */
import { readFileSync, readdirSync, statSync, existsSync } from 'fs';
import { join } from 'path';

// --- Waiver registry ---

interface WaiverEntry {
  id: string;
  file: string;
  pattern?: string;
  count?: number;
  sunset: string;
  reason?: string;
}

function loadWaivers(): { waivedFiles: Set<string>; waivedBatchCount: number } {
  const registryPath = 'docs/waivers/registry.json';
  if (!existsSync(registryPath)) return { waivedFiles: new Set(), waivedBatchCount: 0 };
  const registry = JSON.parse(readFileSync(registryPath, 'utf8'));
  const today = new Date().toISOString().slice(0, 10);
  const waivedFiles = new Set<string>();
  let waivedBatchCount = 0;
  const waivers: WaiverEntry[] = registry.waivers ?? [];
  for (const w of waivers) {
    if (w.sunset < today) {
      console.error(`[no-evasion] Waiver ${w.id} expired on ${w.sunset}. Fix or renew.`);
      process.exit(1);
    }
    if (w.file === 'multiple' || w.file?.includes('kernel + contracts')) {
      // Batch waiver — subtract the declared count
      if (typeof w.count === 'number') {
        waivedBatchCount += w.count;
      }
    } else if (w.file) {
      waivedFiles.add(w.file.replace(/\\/g, '/'));
    }
  }
  return { waivedFiles, waivedBatchCount };
}

// --- Scan ---

const dirs = ['src/lib/kernel', 'src/lib/contracts', 'src/lib/evolution'];
const patterns = [/@ts-nocheck/g, /@ts-ignore(?!.*waived)/g, /as any/g, /catch\s*\(\s*\)/g];

let total = 0;
const offenders: Record<string, number> = {};

function walk(dir: string) {
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    const st = statSync(p);
    if (st.isDirectory()) walk(p);
    else if (p.endsWith('.ts') && !p.includes('.test.')) {
      const content = readFileSync(p, 'utf8');
      for (const re of patterns) {
        const m = content.match(re);
        if (m) {
          total += m.length;
          offenders[p] = (offenders[p] || 0) + m.length;
        }
      }
    }
  }
}

for (const d of dirs) walk(d);

// --- Waiver subtraction ---

const { waivedFiles, waivedBatchCount } = loadWaivers();

// Subtract per-file waivers
let waivedFileCount = 0;
for (const [file, count] of Object.entries(offenders)) {
  const normalised = file.replace(/\\/g, '/');
  if (waivedFiles.has(normalised)) {
    waivedFileCount += count;
  }
}

const totalWaived = waivedBatchCount + waivedFileCount;
const unwaived = Math.max(0, total - totalWaived);

// --- Report ---

console.log(`Total evasion patterns found: ${total}`);
if (totalWaived > 0) {
  console.log(`Waived (registry): ${totalWaived}`);
  console.log(`Unwaived: ${unwaived}`);
} else {
  console.log(`Unwaived: ${unwaived}`);
}

const sorted = Object.entries(offenders)
  .filter(([f]) => !waivedFiles.has(f.replace(/\\/g, '/')))
  .sort((a, b) => b[1] - a[1])
  .slice(0, 10);

if (sorted.length > 0) {
  console.log('Top offenders:');
  sorted.forEach(([f, c]) => console.log(`  ${c} in ${f}`));
}

if (unwaived > 0) {
  console.log('\nAdd to docs/waivers/registry.json or fix. Phase 1 exit gate: 0 unwaived.');
}

// --- Threshold enforcement ---

const maxArg = process.argv.indexOf('--max-unwaived');
if (maxArg !== -1) {
  const maxUnwaived = parseInt(process.argv[maxArg + 1], 10);
  if (isNaN(maxUnwaived)) {
    console.error('[no-evasion] --max-unwaived requires a numeric argument');
    process.exit(1);
  }
  if (unwaived > maxUnwaived) {
    console.error(`\n[no-evasion] FAIL: ${unwaived} unwaived patterns exceeds threshold of ${maxUnwaived}`);
    process.exit(1);
  }
}

process.exit(0);
