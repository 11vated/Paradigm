#!/usr/bin/env -S npx tsx
import { loadContracts } from './contract-tiers.mts';
import { listContracts } from '../src/lib/kernel/quality-contract.ts';

const loaded = await loadContracts({ tier: 'flagship' });
const contracts = listContracts();

for (const c of contracts) {
  const lib = c.curated();
  console.log('=== ' + c.domain + ' ===');
  for (const entry of lib) {
    const art = await c.synthesize(entry.seed);
    const r = await c.rate(art);
    console.log('  ' + entry.id + ': score=' + r.score.toFixed(4));
    for (const [k, v] of Object.entries(r.axes)) {
      console.log('    ' + k + '=' + v);
    }
  }
}
