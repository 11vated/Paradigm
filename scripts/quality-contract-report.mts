#!/usr/bin/env -S npx tsx
/**
 * Paradigm Quality Contract — CLI report.
 *
 * Loads every contract that self-registers, runs conformance against
 * each, prints the leaderboard, and exits non-zero if any canonical-tier
 * contract is failing.
 *
 * Usage: npx tsx scripts/quality-contract-report.mts
 */

// Import the contracts (they self-register on import).
import '../src/lib/friend/contract.ts';

import { runAllConformance, formatLeaderboard } from '../src/lib/kernel/quality-contract.ts';

const results = await runAllConformance();
console.log(formatLeaderboard(results));
console.log();
for (const r of results) {
  if (!r.passed) {
    console.log(`  ✗ ${r.domain}: ${r.summary}`);
    for (const [name, cl] of Object.entries(r.clauses)) {
      if (!cl.passed) console.log(`      ${name}: ${cl.detail}`);
    }
  }
}

process.exit(results.every((r) => r.passed) ? 0 : 1);
