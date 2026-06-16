/**
 * Studio Integration - Phase 7
 * 
 * Links GSPL, SeedForge, and NexusBridge to Creator Workflow for seamless
 * creation, publishing, and exchange of digital artifacts.
 */

import { type Seed } from '@/lib/kernel/types';
import { executeGspl } from '@/lib/kernel/gspl-interpreter';
import { creatorWorkflow, type ArtifactMetadata } from './creator-workflow';
import { artifactValidator } from './artifact-validation';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface GSPLCreationRequest {
  gsplCode: string;
  creatorId: string;
  domain?: string;
}

export interface SeedForgeMutationRequest {
  seed: Seed;
  mutationRate: number;
  creatorId: string;
}

export interface NexusBridgeTransitionRequest {
  seed: Seed;
  fromLayer: 'creation' | 'simulation' | 'export' | 'archive';
  toLayer: 'creation' | 'simulation' | 'export' | 'archive';
  creatorId: string;
}

export interface IntegratedCreationResult {
  seed: Seed;
  artifact: ArtifactMetadata;
  workflowState: any;
  validation: any;
}

// ─── Studio Integration Engine ───────────────────────────────────────────────

export class StudioIntegrationEngine {
  /**
   * Create artifact from GSPL code
   */
  async createFromGSPL(request: GSPLCreationRequest): Promise<IntegratedCreationResult> {
    // Execute GSPL code to generate seed
    const seed = await this.executeGSPLCode(request.gsplCode, request.domain);
    
    // Process seed through creator workflow
    const artifact = await creatorWorkflow.processSeed(seed, request.creatorId);
    
    // Validate artifact
    const validation = await artifactValidator.validateSeedSerialization(seed);
    
    // Record provenance
    await artifactValidator.recordProvenance(
      artifact.seedHash,
      request.creatorId
    );
    
    // Get workflow state
    const workflowState = creatorWorkflow.getWorkflowState(request.creatorId);
    
    return {
      seed,
      artifact,
      workflowState,
      validation,
    };
  }

  /**
   * Execute GSPL code to generate seed
   */
  private async executeGSPLCode(gsplCode: string, domain?: string): Promise<Seed> {
    try {
      const result = await executeGspl(gsplCode);
      
      // Ensure result is a proper seed
      if (!result || typeof result !== 'object') {
        throw new Error('GSPL execution did not return a valid seed');
      }
      
      const seed: Seed = {
        id: result.id || result.$hash || 'unknown',
        $hash: result.$hash || result.id || 'unknown',
        $name: result.$name || result.name || 'Untitled',
        $domain: domain || result.$domain || 'unknown',
        genes: result.genes || {},
        $lineage: result.$lineage || { generation: 0, parents: [] },
      };
      
      return seed;
    } catch (error) {
      throw new Error(`GSPL execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Mutate seed through SeedForge
   */
  async mutateSeed(request: SeedForgeMutationRequest): Promise<IntegratedCreationResult> {
    // Apply mutation to seed
    const mutatedSeed = await this.applyMutation(request.seed, request.mutationRate);
    
    // Process mutated seed through creator workflow
    const artifact = await creatorWorkflow.processSeed(mutatedSeed, request.creatorId);
    
    // Validate artifact
    const validation = await artifactValidator.validateSeedSerialization(mutatedSeed);
    
    // Record provenance with parent reference
    artifactValidator.recordProvenance(
      artifact.seedHash,
      request.creatorId
    );
    
    // Get workflow state
    const workflowState = creatorWorkflow.getWorkflowState(request.creatorId);
    
    return {
      seed: mutatedSeed,
      artifact,
      workflowState,
      validation,
    };
  }

  /**
   * Apply mutation to seed
   */
  private async applyMutation(seed: Seed, mutationRate: number): Promise<Seed> {
    // In production, this would use the actual mutation logic from SeedForge
    // For now, we'll simulate mutation by modifying genes
    const mutatedGenes = { ...seed.genes };
    
    // Apply random mutations based on rate
    for (const key of Object.keys(mutatedGenes)) {
      if (Math.random() < mutationRate) {
        const gene = mutatedGenes[key];
        if (gene && typeof gene === 'object' && 'value' in gene) {
          if (typeof gene.value === 'number') {
            mutatedGenes[key] = {
              ...gene,
              value: gene.value + (Math.random() - 0.5) * 0.2,
            };
          } else if (typeof gene.value === 'string') {
            mutatedGenes[key] = {
              ...gene,
              value: gene.value + '_mutated',
            };
          }
        }
      }
    }
    
    return {
      ...seed,
      genes: mutatedGenes,
      $lineage: {
        ...seed.$lineage,
        generation: (seed.$lineage?.generation || 0) + 1,
      },
    };
  }

  /**
   * Transition seed through NexusBridge
   */
  async transitionSeed(request: NexusBridgeTransitionRequest): Promise<IntegratedCreationResult> {
    // Process transition
    const transitionedSeed = await this.applyTransition(request.seed, request.toLayer);
    
    // Process transitioned seed through creator workflow
    const artifact = await creatorWorkflow.processSeed(transitionedSeed, request.creatorId);
    
    // Validate artifact
    const validation = await artifactValidator.validateSeedSerialization(transitionedSeed);
    
    // Record provenance
    artifactValidator.recordProvenance(
      artifact.seedHash,
      request.creatorId
    );
    
    // Get workflow state
    const workflowState = creatorWorkflow.getWorkflowState(request.creatorId);
    
    return {
      seed: transitionedSeed,
      artifact,
      workflowState,
      validation,
    };
  }

  /**
   * Apply layer transition to seed
   */
  private async applyTransition(seed: Seed, targetLayer: string): Promise<Seed> {
    // In production, this would apply layer-specific transformations
    // For now, we'll add metadata about the transition
    return {
      ...seed,
      genes: {
        ...seed.genes,
        _transition: {
          type: 'metadata',
          value: {
            to: targetLayer,
            timestamp: Date.now(),
          },
        },
      },
    };
  }

  /**
   * Create complete workflow from GSPL to publication
   */
  async createAndPublish(request: GSPLCreationRequest, priceWei: string): Promise<{
    creation: IntegratedCreationResult;
    listing: any;
  }> {
    // Create artifact from GSPL
    const creation = await this.createFromGSPL(request);
    
    // Publish to marketplace
    const listing = await creatorWorkflow.publishArtifact(
      creation.artifact.seedHash,
      priceWei,
      request.creatorId
    );
    
    return {
      creation,
      listing,
    };
  }

  /**
   * Get sensory calibration feedback for adaptive evolution
   */
  getSensoryFeedback(seedHash: string): {
    visual: number;
    tactile: number;
    harmonic: number;
    suggestions: Array<{ gene: string; suggestion: string; priority: number }>;
  } {
    const suggestions = creatorWorkflow.getEvolutionSuggestions(seedHash);
    
    // Calculate average feedback scores
    const feedbackLoops = (creatorWorkflow as any).feedbackLoops?.get(seedHash) || [];
    const avgVisual = feedbackLoops.length > 0 
      ? feedbackLoops.reduce((sum: number, f: number[]) => sum + f[0], 0) / feedbackLoops.length 
      : 0.5;
    const avgTactile = feedbackLoops.length > 0 
      ? feedbackLoops.reduce((sum: number, f: number[]) => sum + f[1], 0) / feedbackLoops.length 
      : 0.5;
    const avgHarmonic = feedbackLoops.length > 0 
      ? feedbackLoops.reduce((sum: number, f: number[]) => sum + f[2], 0) / feedbackLoops.length 
      : 0.5;
    
    return {
      visual: avgVisual,
      tactile: avgTactile,
      harmonic: avgHarmonic,
      suggestions,
    };
  }

  /**
   * Record sensory calibration feedback
   */
  recordSensoryFeedback(
    seedHash: string,
    feedback: { visual?: number; tactile?: number; harmonic?: number }
  ): void {
    creatorWorkflow.recordSensoryFeedback(seedHash, feedback);
  }

  /**
   * Get creator analytics
   */
  getCreatorAnalytics(creatorId: string): {
    artifacts: ArtifactMetadata[];
    published: string[];
    drafts: string[];
    stats: {
      total: number;
      published: number;
      drafts: number;
    };
  } {
    const artifacts = creatorWorkflow.getCreatorArtifacts(creatorId);
    const workflowState = creatorWorkflow.getWorkflowState(creatorId);
    
    return {
      artifacts,
      published: workflowState.publishedArtifacts,
      drafts: workflowState.draftArtifacts,
      stats: {
        total: artifacts.length,
        published: workflowState.publishedArtifacts.length,
        drafts: workflowState.draftArtifacts.length,
      },
    };
  }
}

// ─── Singleton Instance ─────────────────────────────────────────────────────

export const studioIntegration = new StudioIntegrationEngine();
