import { loadContracts } from './contract-tiers.mts';
import { listContracts, runConformance } from '../src/lib/kernel/quality-contract';

async function main() {
  await loadContracts({ tier: 'flagship' });
  const contracts = listContracts();

  // First pass: measure with current default minCuratedScore (0.6)
  const resultsDefault = await Promise.all(
    contracts.map(c => runConformance(c))
  );
  
  // Second pass: test with 0.95 threshold
  const results95 = await Promise.all(
    contracts.filter(c => {
      // Only test contracts that passed default conformance
      const def = resultsDefault.find(r => r.domain === c.domain);
      return def?.passed;
    }).map(c => runConformance(c, { minCuratedScore: 0.95 }))
  );

  console.log('\n=== Current scores (default threshold 0.95 + CQB=0.11) ===');
  for (const r of resultsDefault) {
    const ev = r.clauses.rate.evidence as Record<string, unknown> | undefined;
    const score = ev?.curatedMin ?? ev?.score ?? 'N/A';
    const scores = ev?.scores as number[] | undefined;
    const scoreStr = typeof score === 'number' ? score.toFixed(3) : '?';
    const scoresStr = scores ? ` [${scores.map(s => s.toFixed(3)).join(', ')}]` : '';
    console.log(`  ${r.passed ? '✅' : '❌'} ${r.domain.padEnd(20)} score=${scoreStr}${scoresStr}`);
  }

  console.log('\n=== With 0.95 threshold ===');
  for (const r of results95) {
    const ev = r.clauses.rate.evidence as Record<string, unknown> | undefined;
    const score = ev?.curatedMin ?? ev?.score ?? 'N/A';
    const scores = ev?.scores as number[] | undefined;
    const scoreStr = typeof score === 'number' ? score.toFixed(3) : '?';
    const scoresStr = scores ? ` [${scores.map(s => s.toFixed(3)).join(', ')}]` : '';
    console.log(`  ${r.passed ? '✅' : '❌'} ${r.domain.padEnd(20)} score=${scoreStr}${scoresStr}`);
  }

  const pass95 = results95.filter(r => r.passed).length;
  console.log(`\n${pass95}/${results95.length} flagship contracts pass with ≥0.95`);
}

main().catch(console.error);
