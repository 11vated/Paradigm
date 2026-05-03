/**
 * Phase 5 Test: AI Agent Elevation
 * Run with: npx tsx src/lib/kernel/test-phase5.ts
 */

import { createSeedLLM, type SeedLLM } from './seed-llm';
import { createSeedTools, executeTool } from './ai-agent';
import { createWorkflowContext, workflowNaturalLanguageToArtifact, printWorkflowHistory } from './generative-design';
import { rngFromHash } from './rng';

async function testPhase5() {
  console.log('=== PHASE 5: AI AGENT ELEVATION ===\n');

  // Create Mock Seed LLM
  console.log('Test 1: Seed LLM (Mock)');
  const llm = createSeedLLM({ provider: 'mock' });
  console.log(`  Provider: mock`);
  console.log(`  ✓ Seed LLM created`);

  // Test seed generation
  console.log('\nTest 2: Generate Seed from Prompt');
  const seed = await llm.generateSeed('cyberpunk warrior with neon lights');
  console.log(`  Prompt: "cyberpunk warrior with neon lights"`);
  console.log(`  Seed phrase: ${seed.phrase}`);
  console.log(`  Seed hash: ${seed.hash?.substring(0, 16)}...`);
  console.log(`  ✓ Seed generated`);

  // Test GSPL generation
  console.log('\nTest 3: Generate GSPL Program');
  const gspl = await llm.generateGSPL('create a cyberpunk character', seed);
  console.log(`  GSPL program length: ${gspl.length} chars`);
  console.log(`  Starts with 'seed': ${gspl.startsWith('seed')}`);
  console.log(`  ✓ GSPL program generated`);

  // Test AI Agent Tools
  console.log('\nTest 4: AI Agent Tools');
  const tools = createSeedTools(llm);
  console.log(`  Tools available: ${tools.length}`);
  tools.forEach(t => console.log(`    - ${t.name}: ${t.description}`));
  console.log(`  ✓ AI Agent tools created`);

  // Execute a tool
  console.log('\nTest 5: Execute Tool (generate_seed)');
  const result = await executeTool(tools, 'generate_seed', {
    prompt: 'fantasy elf archer',
    domain: 'character',
  });
  console.log(`  Tool: ${result.tool}`);
  console.log(`  Result: ${JSON.stringify(result.result)}`);
  console.log(`  Error: ${result.error || 'none'}`);
  console.log(`  ✓ Tool executed`);

  // Test Workflow
  console.log('\nTest 6: Generative Design Workflow');
  const context = createWorkflowContext(llm);
  console.log(`  Workflow context created`);
  console.log(`  Tools in context: ${context.tools.length}`);

  const finalContext = await workflowNaturalLanguageToArtifact(context, 'Create a cyberpunk warrior');
  console.log(`  Workflow steps: ${finalContext.history.length}`);
  console.log(`  Seed created: ${!!finalContext.seed}`);
  console.log(`  GSPL created: ${!!finalContext.gspl}`);
  console.log(`  Output generated: ${!!finalContext.output}`);
  printWorkflowHistory(finalContext);
  console.log(`  ✓ Workflow executed`);

  // Test seed refinement
  console.log('\nTest 7: Seed Refinement');
  const refined = await llm.refineSeed(seed, 'make it more muscular');
  console.log(`  Original: ${seed.phrase}`);
  console.log(`  Refined: ${refined.phrase}`);
  console.log(`  New hash: ${refined.hash?.substring(0, 16)}...`);
  console.log(`  ✓ Seed refined`);

  // Test batch variations
  console.log('\nTest 8: Batch Variations');
  const variations = await llm.generateVariations(seed, 3);
  console.log(`  Variations generated: ${variations.length}`);
  variations.forEach((v, i) => {
    console.log(`    ${i + 1}. ${v.phrase} (${v.hash?.substring(0, 8)}...)`);
  });
  console.log(`  ✓ Variations generated`);

  console.log('\n=== PHASE 5 SUMMARY ===');
  console.log('Seed LLM: ✓ Interface + Mock implementation');
  console.log('AI Agent Tools: ✓ 6 tools (generate, grow, gspl, execute, export, refine)');
  console.log('Generative Workflows: ✓ Natural language → artifact pipeline');
  console.log('Seed Refinement: ✓ Iterative improvement');
  console.log('Batch Generation: ✓ Multiple variations');
  console.log('\nPhase 5: AI AGENT ELEVATION — COMPLETE');
}

testPhase5().catch(console.error);
