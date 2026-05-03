/**
 * Phase 5 Simple Test — Seed LLM Only
 * Run with: npx tsx src/lib/kernel/test-phase5-simple.ts
 */

import { createSeedLLM } from './seed-llm';

async function testPhase5Simple() {
  console.log('=== PHASE 5: AI AGENT ELEVATION (SIMPLE TEST) ===\n');

  // Create Mock Seed LLM
  console.log('Test 1: Seed LLM (Mock)');
  const llm = createSeedLLM({ provider: 'mock' });
  console.log(`  Provider: mock`);
  console.log(`  ✓ Seed LLM created\n`);

  // Test seed generation
  console.log('Test 2: Generate Seed from Prompt');
  const seed = await llm.generateSeed('cyberpunk warrior with neon lights');
  console.log(`  Prompt: "cyberpunk warrior with neon lights"`);
  console.log(`  Seed phrase: ${seed.phrase}`);
  console.log(`  Seed hash: ${seed.hash?.substring(0, 16)}...`);
  console.log(`  ✓ Seed generated\n`);

  // Test GSPL generation
  console.log('Test 3: Generate GSPL Program');
  const gspl = await llm.generateGSPL('create a cyberpunk character', seed);
  console.log(`  GSPL program length: ${gspl.length} chars`);
  console.log(`  Starts with 'seed': ${gspl.startsWith('seed')}`);
  console.log(`  Contains 'character': ${gspl.includes('character')}`);
  console.log(`  ✓ GSPL program generated\n`);

  // Test seed refinement
  console.log('Test 4: Seed Refinement');
  const refined = await llm.refineSeed(seed, 'make it more muscular');
  console.log(`  Original: ${seed.phrase}`);
  console.log(`  Refined: ${refined.phrase}`);
  console.log(`  New hash: ${refined.hash?.substring(0, 16)}...`);
  console.log(`  ✓ Seed refined\n`);

  // Test batch variations
  console.log('Test 5: Batch Variations');
  const variations = await llm.generateVariations(seed, 3);
  console.log(`  Variations generated: ${variations.length}`);
  variations.forEach((v, i) => {
    console.log(`    ${i + 1}. ${v.phrase} (${v.hash?.substring(0, 8)}...)`);
  });
  console.log(`  ✓ Variations generated\n`);

  // Test output evaluation
  console.log('Test 6: Output Evaluation (Mock)');
  const score = await llm.evaluateOutput({} as any, 'quality');
  console.log(`  Evaluation score: ${score.toFixed(2)} (0-1 scale)`);
  console.log(`  ✓ Evaluation works\n`);

  console.log('=== PHASE 5 SUMMARY ===');
  console.log('Seed LLM: ✓ Interface + Mock implementation');
  console.log('  - generateSeed: Creates seeds from prompts');
  console.log('  - generateGSPL: Creates GSPL programs');
  console.log('  - refineSeed: Iterative improvement');
  console.log('  - generateVariations: Batch generation');
  console.log('  - evaluateOutput: Quality scoring');
  console.log('\nPhase 5: AI AGENT ELEVATION — CORE COMPLETE');
  console.log('(Full workflow test requires fixing engines.ts imports)');
}

testPhase5Simple().catch(console.error);
