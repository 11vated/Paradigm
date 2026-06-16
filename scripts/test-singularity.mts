#!/usr/bin/env -S npx tsx
/**
 * Test Paradigm Singularity Module
 */
import { runSingularityCycle, getSingularity } from '../src/lib/kernel/singularity.js';

async function main() {
  console.log('=== Paradigm Singularity Test ===\n');

  // Test 1: Run 3 unified cycles
  console.log('Test 1: Running 3 unified singularity cycles...');
  const results = await runSingularityCycle('paradigm-singularity-test', 3);
  console.log(`Completed ${results.length} cycles\n`);

  for (const [i, decision] of results.entries()) {
    console.log(`Cycle ${i + 1}:`);
    console.log(`  Coherence: ${decision.coherence.toFixed(6)}`);
    console.log(`  Convergence: ${decision.convergence.toFixed(6)}`);
    console.log(`  Perpetuation: ${decision.perpetuation.toFixed(6)}`);
    console.log(`  Cognition Depth: ${decision.cognitionDepth.toFixed(6)}`);
    console.log(`  Ethical Score: ${decision.ethicalScore.toFixed(6)}`);
    console.log(`  Unified Proof: ${decision.unifiedProof.slice(0, 16)}...`);
    console.log(`  Rationale: ${decision.rationale}`);
    console.log('');
  }

  // Test 2: Check substrate health
  console.log('Test 2: Checking substrate health...');
  const singularity = getSingularity('paradigm-singularity-health');
  const health = singularity.getSubstrateHealth();
  console.log(`State:`, health.state);
  console.log(`Layers: ${health.layers.length} active`);
  console.log(`Proof Chain Length: ${health.proofChainLength}`);
  console.log(`Decision Log Length: ${health.decisionLogLength}`);
  console.log(`Unified: ${health.unified}`);
  console.log(`Determinism Verified: ${health.determinismVerified}`);
  console.log('');

  // Test 3: Individual operations
  console.log('Test 3: Testing individual operations...');
  const s2 = getSingularity('paradigm-singularity-individual');
  s2.maintainCoherence('test_coherence');
  s2.verifyConvergence('test_convergence');
  s2.regeneratePerpetuation('test_perpetuation');
  s2.deepenCognition('test_cognition');
  s2.validateEthics('test_ethics');
  const health2 = s2.getSubstrateHealth();
  console.log(`After individual ops - Coherence: ${health2.state.coherence.toFixed(6)}, Convergence: ${health2.state.convergence.toFixed(6)}, Perpetuation: ${health2.state.perpetuation.toFixed(6)}, Cognition: ${health2.state.cognitionDepth.toFixed(6)}, Ethics: ${health2.state.ethicalScore.toFixed(6)}`);
  console.log('');

  console.log('=== All Tests Passed ===');
}

main().catch(console.error);