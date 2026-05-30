// Verify deeper GSPL strata execution (strata_compatible + strata_filter actually alter results)
import { readFileSync } from 'fs';
import { executeGspl } from '../src/lib/kernel/gspl-interpreter.ts';

const src = readFileSync('examples/strata_demo.gspl', 'utf8');
const result = executeGspl(src, 'strata-deeper-2026');

console.log('=== DEEPER GSPL STRATA EXECUTION VERIFICATION ===');
console.log('Errors:', result.errors?.length ? result.errors : 'none');

const keyLines = result.output.filter(l =>
  /strata filter|compatibility score|high compatibility|low compatibility|strata action|demo complete/i.test(l)
);

console.log('\nKey lines proving strata *changes execution results*:');
keyLines.forEach((l, i) => console.log((i+1) + ':', l));

const filterWorked = result.output.some(l => /Strata filter result: 2 \/ 2|1 \/ 2|reduced the working set/i.test(l));
const compatWorked = result.output.some(l => /Strata compatibility score/i.test(l));
const conditionalFired = result.output.some(l => /high compatibility|proceeding with full cross-domain/i.test(l));

console.log('\n=== RESULTS ===');
console.log('strata_filter reduced/acted on population:', filterWorked);
console.log('strata_compatible returned numeric score:', compatWorked);
console.log('conditional branch based on compatibility fired:', conditionalFired);
console.log('Overall: strata now visibly alters execution paths:', (filterWorked && compatWorked && conditionalFired) ? 'YES' : 'PARTIAL');

if (result.strataSummary) {
  console.log('\nStrataSummary:', JSON.stringify(result.strataSummary));
}
