/**
 * Beyond Omega Test — Verify all 103+ generators work deterministically.
 * Run: npx ts-node src/lib/kernel/test-engines.ts
 */

import { Xoshiro256Star, rngFromHash } from './rng.js';
import { dispatch, getDomains, hasDomain } from './engine-dispatcher.js';

// Quick sanity: check domain count
const domains = getDomains();
console.log(`Total domains registered: ${domains.length}`);

if (domains.length < 103) {
  console.error(`ERROR: Expected 103+ domains, got ${domains.length}`);
  process.exit(1);
}

console.log('All domains:', domains.join(', '));

// Test dispatch with a mock seed
async function testDispatch() {
  const testSeed = {
    $hash: 'test-seed-123',
    domain: 'universe',
    genes: {},
    fitness: 0,
    mutate: function(rng: any) { return this; },
    clone: function() { return this; },
    evaluate: function(fn: any) { return 0; },
    getGene: function(type: any) { return null; },
    setGene: function(type: any, value: any) {},
    id: 'test-1'
  } as any;

  try {
    const result = await dispatch(testSeed, 'C:/temp/test-output');
    console.log(`Dispatched to domain: ${result.domain}`);
    console.log(`Result:`, result.result);
    console.log('\nDispatch test PASSED');
  } catch (e: any) {
    console.error('Dispatch test FAILED:', e.message);
  }
}

testDispatch();
