/**
 * Integration Test — SeedChat Full Flow
 * Tests: chat input → seed generation → GSPL → growSeed → preview
 */

import { createSeedLLM } from '../../lib/kernel/seed-llm';
import { executeGspl } from '../../lib/kernel/gspl-interpreter';
import { growSeed, type Seed } from '../../lib/kernel/engines';

export async function testFullFlow() {
  console.log('🧪 Starting SeedChat integration test...');
  
  const results = {
    seedGeneration: false,
    gsplGeneration: false,
    gsplExecution: false,
    growSeed: false,
    previewData: false,
  };

  try {
    // Step 1: Create mock LLM
    const llm = createSeedLLM({ provider: 'mock' });
    console.log('✓ Mock LLM created');

    // Step 2: Generate seed
    const seed: Seed = await llm.generateSeed('cyberpunk warrior');
    if (seed && seed.phrase) {
      results.seedGeneration = true;
      console.log('✓ Seed generated:', seed.phrase);
    } else {
      throw new Error('Invalid seed');
    }

    // Step 3: Generate GSPL
    const gspl = await llm.generateGSPL('cyberpunk warrior', seed);
    if (gspl && gspl.length > 0) {
      results.gsplGeneration = true;
      console.log('✓ GSPL generated:', gspl.length, 'chars');
    } else {
      throw new Error('Invalid GSPL');
    }

    // Step 4: Execute GSPL
    try {
      const gsplResult = executeGspl(gspl, seed.phrase);
      if (gsplResult && gsplResult.type) {
        results.gsplExecution = true;
        console.log('✓ GSPL executed:', gsplResult.type);
      }
    } catch (e) {
      console.warn('⚠ GSPL execution failed, will use growSeed');
    }

    // Step 5: Grow seed (real generation)
    const artifact = await growSeed(seed);
    if (artifact && artifact.type) {
      results.growSeed = true;
      console.log('✓ Seed grown:', artifact.type, artifact.domain);
    } else {
      throw new Error('growSeed failed');
    }

    // Step 6: Check preview data
    if (artifact.mesh || artifact.audio || artifact.sprite || artifact.preview_slice) {
      results.previewData = true;
      console.log('✓ Preview data available');
    }

    console.log('\n📊 Test Results:');
    Object.entries(results).forEach(([key, value]) => {
      console.log(`${value ? '✓' : '✗'} ${key}`);
    });

    const passed = Object.values(results).filter(v => v).length;
    const total = Object.values(results).length;
    console.log(`\n🎉 ${passed}/${total} tests passed`);

    return results;
  } catch (error) {
    console.error('❌ Test failed:', error);
    return results;
  }
}

// Run test if this file is executed directly
if (typeof window !== 'undefined') {
  (window as any).testSeedChatFlow = testFullFlow;
}
