#!/usr/bin/env tsx
/**
 * Phase 0 - Canonical Rename Lint
 * Enforces that no generator has multiple versioned siblings (-v2, -v3, -enhanced, etc.)
 * This is a hard gate. Exit non-zero on violations.
 *
 * Waiver-aware: reads docs/waivers/registry.json and skips files covered by valid,
 * non-expired waivers. Expired waivers are treated as violations.
 */
import { readdirSync, readFileSync, existsSync } from 'fs';

interface WaiverEntry {
  id: string;
  file: string;
  sunset: string;
  reason?: string;
  pattern?: string;
}

function loadWaivers(): Set<string> {
  const registryPath = 'docs/waivers/registry.json';
  if (!existsSync(registryPath)) return new Set();
  const registry = JSON.parse(readFileSync(registryPath, 'utf8'));
  const today = new Date().toISOString().slice(0, 10);
  const waived = new Set<string>();
  const waivers: WaiverEntry[] = registry.waivers ?? [];
  for (const w of waivers) {
    if (!w.file || w.file === 'multiple') continue; // batch waivers don't cover specific files
    if (w.sunset < today) {
      console.error(`[canonical-rename] Waiver ${w.id} expired on ${w.sunset}. Fix or renew.`);
      process.exit(1);
    }
    // Normalize to forward-slash relative path
    waived.add(w.file.replace(/\\/g, '/'));
  }
  return waived;
}

const generatorsDir = 'src/lib/kernel/generators';
const files = readdirSync(generatorsDir).filter(f => f.endsWith('.ts') && !f.includes('.test.'));

const siblings = new Map<string, string[]>();

for (const f of files) {
  const base = f.replace(/-(v\d+|enhanced|gpu|3d|animated|delivery|contract)\.ts$/, '');
  if (!siblings.has(base)) siblings.set(base, []);
  siblings.get(base)!.push(f);
}

const waived = loadWaivers();

let violations = 0;
for (const [base, list] of siblings) {
  if (list.length > 1) {
    // Check if all extra siblings (beyond the first/canonical) are covered by waivers
    const extras = list.slice(1);
    const allWaived = extras.every(f => {
      const fullPath = `${generatorsDir}/${f}`.replace(/\\/g, '/');
      return waived.has(fullPath);
    });
    if (allWaived) continue; // all extras are waived — skip this group
    console.error(`[canonical-rename] Multiple siblings for ${base}: ${list.join(', ')}`);
    violations++;
  }
}

if (violations > 0) {
  console.error(`\n${violations} canonical rename violations. Run the rename script or add waiver.`);
  process.exit(1);
}
console.log('✓ No canonical rename violations');
process.exit(0);
