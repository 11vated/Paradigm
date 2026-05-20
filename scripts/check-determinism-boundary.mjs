#!/usr/bin/env node
/**
 * Paradigm Absolute — Determinism Boundary CI Gate
 *
 * Phase 0 deliverable: ensures no entropy source sneaks into
 * the deterministic surface (src/lib/kernel, src/lib/evolution, src/seeds).
 *
 * Fails CI on these ESLint rules from the boundary block:
 *   - no-restricted-properties   (Math.random, crypto.randomBytes, etc.)
 *   - no-restricted-syntax       (performance.now)
 *   - no-restricted-imports      (banned modules)
 *
 * Does NOT fail on baseline code-quality issues (prefer-const,
 * no-require-imports, etc.). Wall-clock warnings (Date.now / new Date)
 * are reported but do not fail CI until the "Wall-clock Sprint" finishes
 * — `npm run lint:determinism:strict` is the version that will.
 */

import { execSync } from 'node:child_process';

const HARD_FAIL_RULES = new Set([
  'no-restricted-properties',
  'no-restricted-imports',
]);
// no-restricted-syntax is mixed: in the boundary block it includes
// performance.now (HARD), and Date.now / new Date (WARN). The ESLint
// JSON output gives us severity so we can route precisely.

const TARGETS = [
  'src/lib/kernel',
  'src/lib/evolution',
  'src/seeds',
];

let json;
try {
  json = execSync(
    `npx eslint --format=json ${TARGETS.join(' ')}`,
    { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }
  );
} catch (err) {
  // ESLint exits 1 when there are errors; we still want its JSON output.
  json = err.stdout?.toString() ?? '';
}

let results;
try {
  results = JSON.parse(json);
} catch {
  console.error('[determinism] ESLint did not return valid JSON.');
  console.error(json.slice(-400));
  process.exit(2);
}

let hardFails = 0;
let wallClockWarns = 0;
const offenders = new Map();

for (const file of results) {
  for (const msg of file.messages) {
    if (!msg.ruleId) continue;
    const isHard =
      HARD_FAIL_RULES.has(msg.ruleId) ||
      (msg.ruleId === 'no-restricted-syntax' && msg.severity === 2);
    const isWallClock =
      msg.ruleId === 'no-restricted-syntax' && msg.severity === 1;

    if (isHard) {
      hardFails++;
      const rel = file.filePath.replace(process.cwd() + '/', '');
      const arr = offenders.get(rel) ?? [];
      arr.push(`  ${msg.line}:${msg.column}  ${msg.ruleId}  ${msg.message}`);
      offenders.set(rel, arr);
    } else if (isWallClock) {
      wallClockWarns++;
    }
  }
}

console.log('=== Paradigm Determinism Boundary ===');
console.log(`Targets: ${TARGETS.join(', ')}`);
console.log(`Hard violations (Math.random / crypto.random* / performance.now / banned imports): ${hardFails}`);
console.log(`Wall-clock warnings (Date.now / new Date): ${wallClockWarns}  [tracked, not blocking until Wall-clock Sprint]`);

if (hardFails > 0) {
  console.log('\nHard violations by file:');
  for (const [file, msgs] of offenders) {
    console.log(`\n${file}`);
    for (const m of msgs) console.log(m);
  }
  console.log('\n❌ Determinism boundary breached. CI fails.');
  process.exit(1);
}

console.log('\n✅ Determinism boundary intact.');
process.exit(0);
