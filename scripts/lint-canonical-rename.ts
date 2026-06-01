#!/usr/bin/env tsx
/**
 * Phase 0 - Canonical Rename Lint
 * Enforces that no generator has multiple versioned siblings (-v2, -v3, -enhanced, etc.)
 * This is a hard gate. Exit non-zero on violations.
 */
import { readdirSync } from 'fs';
import { join } from 'path';

const generatorsDir = 'src/lib/kernel/generators';
const files = readdirSync(generatorsDir).filter(f => f.endsWith('.ts') && !f.includes('.test.'));

const siblings = new Map<string, string[]>();

for (const f of files) {
  const base = f.replace(/-(v\d+|enhanced|gpu|3d|animated|delivery|contract)\.ts$/, '');
  if (!siblings.has(base)) siblings.set(base, []);
  siblings.get(base)!.push(f);
}

let violations = 0;
for (const [base, list] of siblings) {
  if (list.length > 1) {
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
