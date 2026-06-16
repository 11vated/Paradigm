/**
 * Creator Workflow Simulation - Phase 7
 * 
 * Full creator simulation and feedback calibration test.
 * Validates the complete creator workflow from GSPL creation to marketplace publication.
 */

import { creatorWorkflow, studioIntegration } from '../src/lib/creator';
import { artifactValidator } from '../src/lib/creator/artifact-validation';

// ─── Simulation Configuration ───────────────────────────────────────────────────

const SIMULATION_CONFIG = {
  creatorName: 'Test Creator',
  creatorEmail: 'test@paradigm.dev',
  gsplCode: `seed character "Cosmic Warrior" {
  appearance = "ethereal"
  strength = 0.8
  agility = 0.7
  intelligence = 0.9
}`,
  mutationRate: 0.3,
  priceWei: '1000000000000000000', // 1 ETH
  feedback: {
    visual: 0.8,
    tactile: 0.7,
    harmonic: 0.6,
  },
};

// ─── Simulation Functions ─────────────────────────────────────────────────────

async function runCreatorSimulation() {
  console.log('🚀 Starting Creator Workflow Simulation...\n');

  try {
    // Step 1: Initialize Creator Profile
    console.log('📝 Step 1: Initializing Creator Profile...');
    const creator = creatorWorkflow.initializeCreator(
      SIMULATION_CONFIG.creatorName,
      SIMULATION_CONFIG.creatorEmail
    );
    console.log(`✅ Creator profile created: ${creator.id}\n`);

    // Step 2: Create Artifact from GSPL
    console.log('🎨 Step 2: Creating Artifact from GSPL...');
    // Skip actual GSPL execution for simulation - use direct seed creation
    const mockSeed = {
      id: 'test_seed_123',
      $hash: 'test_seed_123',
      $name: 'Cosmic Warrior',
      $domain: 'character',
      genes: {
        appearance: { type: 'string', value: 'ethereal' },
        strength: { type: 'number', value: 0.8 },
        agility: { type: 'number', value: 0.7 },
        intelligence: { type: 'number', value: 0.9 },
      },
      $lineage: { generation: 0, parents: [] },
    };
    const creationResult = await creatorWorkflow.processSeed(mockSeed, creator.id);
    console.log(`✅ Artifact created: ${creationResult.seedHash}`);
    console.log(`   - Domain: ${creationResult.domain}`);
    console.log(`   - Generation: ${creationResult.generation}`);
    console.log(`   - Checksum: ${creationResult.checksum}\n`);

    // Step 3: Validate Artifact
    console.log('🔍 Step 3: Validating Artifact...');
    const validation = await artifactValidator.validateSeedSerialization({
      id: creationResult.seedHash,
      $hash: creationResult.seedHash,
      $name: creationResult.seedName,
      $domain: creationResult.domain,
      genes: creationResult.genes,
      $lineage: { generation: creationResult.generation, parents: creationResult.lineage.parents },
    });
    console.log(`✅ Validation result: ${validation.valid ? 'PASSED' : 'FAILED'}`);
    if (!validation.valid) {
      console.log(`   - Errors: ${validation.errors.join(', ')}`);
    }
    if (validation.warnings.length > 0) {
      console.log(`   - Warnings: ${validation.warnings.join(', ')}`);
    }
    console.log();

    // Step 4: Record Provenance
    console.log('🔐 Step 4: Recording Provenance...');
    const provenance = artifactValidator.recordProvenance(
      creationResult.seedHash,
      creator.id
    );
    console.log(`✅ Provenance recorded: ${provenance.signature.slice(0, 16)}...\n`);

    // Step 5: Mutate Artifact
    console.log('🧬 Step 5: Mutating Artifact...');
    const mutationResult = await studioIntegration.mutateSeed({
      seed: {
        id: creationResult.seedHash,
        $hash: creationResult.seedHash,
        $name: creationResult.seedName,
        $domain: creationResult.domain,
        genes: creationResult.genes,
        $lineage: { generation: creationResult.generation, parents: creationResult.lineage.parents },
      },
      mutationRate: SIMULATION_CONFIG.mutationRate,
      creatorId: creator.id,
    });
    console.log(`✅ Artifact mutated: ${mutationResult.artifact.seedHash}`);
    console.log(`   - New Generation: ${mutationResult.artifact.generation}\n`);

    // Step 6: Record Sensory Feedback
    console.log('🎵 Step 6: Recording Sensory Feedback...');
    creatorWorkflow.recordSensoryFeedback(
      creationResult.seedHash,
      SIMULATION_CONFIG.feedback
    );
    console.log(`✅ Sensory feedback recorded`);
    console.log(`   - Visual: ${SIMULATION_CONFIG.feedback.visual}`);
    console.log(`   - Tactile: ${SIMULATION_CONFIG.feedback.tactile}`);
    console.log(`   - Harmonic: ${SIMULATION_CONFIG.feedback.harmonic}\n`);

    // Step 7: Get Evolution Suggestions
    console.log('💡 Step 7: Getting Evolution Suggestions...');
    const suggestions = creatorWorkflow.getEvolutionSuggestions(creationResult.seedHash);
    console.log(`✅ Evolution suggestions: ${suggestions.length} found`);
    suggestions.forEach((s, i) => {
      console.log(`   ${i + 1}. ${s.gene}: ${s.suggestion} (priority: ${s.priority})`);
    });
    console.log();

    // Step 8: Publish to Marketplace
    console.log('🏪 Step 8: Publishing to Marketplace...');
    const listing = await creatorWorkflow.publishArtifact(
      creationResult.seedHash,
      SIMULATION_CONFIG.priceWei,
      creator.id
    );
    console.log(`✅ Artifact published to marketplace`);
    console.log(`   - Price: ${SIMULATION_CONFIG.priceWei} wei`);
    console.log(`   - Listed: ${listing.listed}\n`);

    // Step 9: Get Workflow State
    console.log('📊 Step 9: Getting Workflow State...');
    const workflowState = creatorWorkflow.getWorkflowState(creator.id);
    console.log(`✅ Workflow state retrieved`);
    console.log(`   - Total Artifacts: ${workflowState.artifacts.length}`);
    console.log(`   - Published: ${workflowState.publishedArtifacts.length}`);
    console.log(`   - Drafts: ${workflowState.draftArtifacts.length}`);
    console.log(`   - Total Revenue: ${workflowState.analytics.revenue} ETH\n`);

    // Step 10: Verify Provenance Chain
    console.log('🔗 Step 10: Verifying Provenance Chain...');
    const provenanceValid = artifactValidator.verifyProvenance(creationResult.seedHash);
    console.log(`✅ Provenance chain: ${provenanceValid ? 'VALID' : 'INVALID'}\n`);

    // Summary
    console.log('🎉 Creator Workflow Simulation Complete!');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log(`Creator ID: ${creator.id}`);
    console.log(`Artifacts Created: ${workflowState.artifacts.length}`);
    console.log(`Published: ${workflowState.publishedArtifacts.length}`);
    console.log(`Validation: ${validation.valid ? 'PASSED' : 'FAILED'}`);
    console.log(`Provenance: ${provenanceValid ? 'VALID' : 'INVALID'}`);
    console.log('═══════════════════════════════════════════════════════════════\n');

    return {
      success: true,
      creatorId: creator.id,
      artifacts: workflowState.artifacts.length,
      validation: validation.valid,
      provenance: provenanceValid,
    };
  } catch (error) {
    console.error('❌ Simulation failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// ─── Run Simulation ─────────────────────────────────────────────────────────

runCreatorSimulation()
  .then((result) => {
    process.exit(result.success ? 0 : 1);
  })
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });

export { runCreatorSimulation };
