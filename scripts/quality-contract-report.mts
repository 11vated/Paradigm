#!/usr/bin/env -S npx tsx
/**
 * Paradigm Quality Contract — CLI report.
 * Loads every contract that self-registers, runs conformance against
 * each, prints the leaderboard, exits non-zero if any contract fails.
 */
import { loadContracts, type ContractTier } from './contract-tiers.mts';
import { listContracts, runConformance, formatLeaderboard } from '../src/lib/kernel/quality-contract';

function parseArgs(argv: string[]): { tier: ContractTier; contracts?: string[] } {
  const out: { tier: ContractTier; contracts?: string[] } = { tier: 'flagship' };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--tier') out.tier = (argv[++i] as ContractTier) ?? 'flagship';
    if (a === '--contracts') out.contracts = (argv[++i] ?? '').split(',').map((s) => s.trim()).filter(Boolean);
  }
  return out;
}

const args = parseArgs(process.argv.slice(2));
const loaded = await loadContracts({ tier: args.tier, contracts: args.contracts, includeCore: args.tier === 'all' });
const loadedDomains = new Set(loaded);
const results = [];
const contracts = loadedDomains.has('extended-barrel')
  ? listContracts()
  : listContracts().filter((c) => loadedDomains.has(c.domain));
for (const contract of contracts) {
  results.push(await runConformance(contract));
}
console.log('\n' + formatLeaderboard(results) + '\n');
const failing = results.filter((r) => !r.passed);
if (failing.length > 0) {
  console.error(`✗ ${failing.length} contract(s) failed:`);
  for (const r of failing) console.error(`  - ${r.domain}@${r.version}`);
  process.exit(1);
}
console.log(`✓ ${results.length} contract(s) green.\n`);
