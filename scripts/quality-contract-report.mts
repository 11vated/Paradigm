#!/usr/bin/env -S npx tsx
/**
 * Paradigm Quality Contract — CLI report.
 * Loads every contract that self-registers, runs conformance against
 * each, prints the leaderboard, exits non-zero if any contract fails.
 */
import '../src/lib/friend/contract';
import '../src/lib/world/contract';
import '../src/lib/game/contract';
import '../src/lib/kernel/generators/sprite-contract';
import '../src/lib/kernel/generators/music-contract';
import '../src/lib/kernel/generators/narrative-contract';
import '../src/lib/kernel/generators/visual2d-contract';
import '../src/lib/kernel/generators/geometry3d-contract';
import '../src/lib/kernel/generators/character-contract';
import { runAllConformance, formatLeaderboard } from '../src/lib/kernel/quality-contract';

const results = await runAllConformance();
console.log('\n' + formatLeaderboard(results) + '\n');
const failing = results.filter((r) => !r.passed);
if (failing.length > 0) {
  console.error(`✗ ${failing.length} contract(s) failed:`);
  for (const r of failing) console.error(`  - ${r.domain}@${r.version}`);
  process.exit(1);
}
console.log(`✓ ${results.length} contract(s) green.\n`);
