#!/usr/bin/env node
/**
 * count-tests.mjs — single source of truth for "number of tests".
 *
 * Phase 0 / G-08: the README and CI step hard-coded "359 tests" while
 * reality drifted. This script runs `vitest list` and counts the entries
 * it emits to stdout, so CI can write the number into $GITHUB_ENV and any
 * downstream badge/step can consume it without re-counting.
 *
 * Usage:
 *   node scripts/count-tests.mjs               # prints the number
 *   TEST_COUNT=$(node scripts/count-tests.mjs) # for shell capture
 *
 * Contract: exit code 0 + stdout is a single integer on success. Any other
 * shape MUST cause CI to fail loudly — we do not want silent test-count drift.
 */
import { spawnSync } from 'node:child_process';

// `vitest list` prints one test per line in the form:
//   path/to/file.test.ts > Describe > Nested > it-description
// Lines that don't match that shape (warnings, banners) are filtered out.
const result = spawnSync('npx', ['vitest', 'list'], {
  encoding: 'utf-8',
  stdio: ['ignore', 'pipe', 'ignore'],
  // list mode still respects the workspace config, but just in case,
  // pin CI to a non-interactive terminal.
  env: { ...process.env, CI: '1' },
});

if (result.error) {
  console.error('count-tests.mjs: failed to spawn vitest:', result.error.message);
  process.exit(2);
}

const lines = (result.stdout ?? '').split('\n');
const testLinePattern = /\.(test|spec)\.(ts|tsx|js|jsx|mjs|cjs)\s+>\s+/;
const count = lines.filter((l) => testLinePattern.test(l)).length;

if (!Number.isFinite(count) || count <= 0) {
  console.error('count-tests.mjs: could not determine test count from vitest list');
  console.error('vitest stdout first 500 chars:', (result.stdout ?? '').slice(0, 500));
  process.exit(2);
}
process.stdout.write(String(count) + '\n');
