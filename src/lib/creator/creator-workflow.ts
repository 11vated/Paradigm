/**
 * Creator Workflow - Phase 7
 * 
 * Integration layer for deterministic artifact generation with Seed Economy
 * Links GSPL, SeedForge, NexusBridge to Creator Workflow for seamless creation,
 * publishing, and exchange of digital artifacts with verified provenance.
 */

import { type Seed } from '@/lib/kernel/types';
import { rngFromHash } from '@/lib/kernel/rng';
import { DeterministicExportPipeline } from '@/lib/studio/deterministic-export';
import { prepareList, prepareDelist, prepareBuy } from '@/lib/friend/marketplace';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface CreatorProfile {
  id: string;
  name: string;
  email: string;
  walletAddress?: string;
  role: 'creator' | 'enterprise' | 'admin';
  createdAt: number;
  totalArtifacts: number;
  totalVolume: number;
  reputation: number;
}

export interface ArtifactMetadata {
  seedHash: string;
  seedName: string;
  domain: string;
  generation: number;
  genes: Record<string, unknown>;
  lineage: {
    parents: string[];
    children: string[];
  };
  sensoryProfile: {
    visual: number;
    tactile: number;
    harmonic: number;
  };
  checksum: string;
  provenance: {
    creator: string;
    createdAt: number;
    signature?: string;
  };
}

export interface CreatorWorkflowState {
  profile: CreatorProfile;
  currentSeed: Seed | null;
  artifacts: ArtifactMetadata[];
  publishedArtifacts: string[];
  draftArtifacts: string[];
  analytics: {
    views: number;
    downloads: number;
    sales: number;
    revenue: number;
  };
}

export interface MarketplaceListing {
  artifactId: string;
  price: string; // wei
  currency: 'ETH' | 'USD';
  listed: boolean;
  listedAt?: number;
}

// ─── Creator Workflow Engine ───────────────────────────────────────────────────

export class CreatorWorkflowEngine {
  private profiles: Map<string, CreatorProfile> = new Map();
  private artifacts: Map<string, ArtifactMetadata> = new Map();
  private listings: Map<string, MarketplaceListing> = new Map();
  private exportPipeline: DeterministicExportPipeline;
  private feedbackLoops: Map<string, number[][]> = new Map(); // sensory calibration feedback

  constructor() {
    this.exportPipeline = new DeterministicExportPipeline();
  }

  /**
   * Initialize creator profile with deterministic ID
   */
  initializeCreator(name: string, email: string, walletAddress?: string): CreatorProfile {
    const hash = `${email}:${Date.now()}`;
    const rng = rngFromHash(hash);
    const id = `creator_${Math.floor(rng.nextF64() * 1000000)}`;
    
    const profile: CreatorProfile = {
      id,
      name,
      email,
      walletAddress,
      role: 'creator',
      createdAt: Date.now(),
      totalArtifacts: 0,
      totalVolume: 0,
      reputation: 100, // Start with neutral reputation
    };
    
    this.profiles.set(id, profile);
    return profile;
  }

  /**
   * Process seed through Creator Workflow
   * - Validate seed integrity
   - Generate artifact metadata
   - Calculate checksum
   - Record provenance
   */
  async processSeed(seed: Seed, creatorId: string): Promise<ArtifactMetadata> {
    const profile = this.profiles.get(creatorId);
    if (!profile) {
      throw new Error('Creator profile not found');
    }

    // Initialize export pipeline with seed for deterministic operations
    this.exportPipeline.initialize(seed);

    // Calculate checksum
    const exportFormat = { type: 'json' as const, version: '1.0.0' };
    const exportResult = await this.exportPipeline.exportToJSON(seed, exportFormat);
    const checksum = exportResult.metadata.checksum;

    // Extract sensory profile from seed genes
    const sensoryProfile = this.extractSensoryProfile(seed);

    // Build artifact metadata
    const metadata: ArtifactMetadata = {
      seedHash: seed.$hash || seed.id || 'unknown',
      seedName: seed.$name || seed.name || 'Untitled',
      domain: seed.$domain || 'unknown',
      generation: seed.$lineage?.generation || 0,
      genes: seed.genes || {},
      lineage: {
        parents: seed.$lineage?.parents || [],
        children: [],
      },
      sensoryProfile,
      checksum,
      provenance: {
        creator: creatorId,
        createdAt: Date.now(),
      },
    };

    this.artifacts.set(metadata.seedHash, metadata);
    profile.totalArtifacts++;

    return metadata;
  }

  /**
   * Extract sensory calibration profile from seed
   */
  private extractSensoryProfile(seed: Seed): { visual: number; tactile: number; harmonic: number } {
    const genes = seed.genes || {};
    
    // Visual profile from appearance/color genes
    const visual = this.calculateGeneScore(genes, ['appearance', 'color', 'visual', 'style']);
    
    // Tactile profile from texture/material genes
    const tactile = this.calculateGeneScore(genes, ['texture', 'material', 'tactile', 'feel']);
    
    // Harmonic profile from music/sound genes
    const harmonic = this.calculateGeneScore(genes, ['music', 'sound', 'harmonic', 'audio']);

    return { visual, tactile, harmonic };
  }

  /**
   * Calculate score from relevant genes (0-1 range)
   */
  private calculateGeneScore(genes: Record<string, unknown>, relevantKeys: string[]): number {
    let score = 0;
    let count = 0;

    for (const key of relevantKeys) {
      if (genes[key]) {
        const value = genes[key];
        if (typeof value === 'number') {
          score += Math.min(Math.max(value, 0), 1);
          count++;
        } else if (typeof value === 'object' && value !== null) {
          score += 0.5; // Partial credit for complex objects
          count++;
        }
      }
    }

    return count > 0 ? score / count : 0.5; // Default to 0.5 if no genes found
  }

  /**
   * Publish artifact to marketplace
   */
  async publishArtifact(
    seedHash: string,
    priceWei: string,
    creatorId: string
  ): Promise<MarketplaceListing> {
    const artifact = this.artifacts.get(seedHash);
    if (!artifact) {
      throw new Error('Artifact not found');
    }

    const profile = this.profiles.get(creatorId);
    if (!profile) {
      throw new Error('Creator profile not found');
    }

    // Create marketplace listing
    const listing: MarketplaceListing = {
      artifactId: seedHash,
      price: priceWei,
      currency: 'ETH',
      listed: true,
      listedAt: Date.now(),
    };

    this.listings.set(seedHash, listing);

    // Update profile analytics
    profile.totalVolume += parseFloat(priceWei) / 1e18; // Convert wei to ETH

    return listing;
  }

  /**
   * Prepare marketplace transaction calldata
   */
  prepareMarketplaceTransaction(
    seedHash: string,
    action: 'list' | 'delist' | 'buy',
    priceWei?: string
  ): { calldata: string; contract: string; value: string; function: string } {
    const artifact = this.artifacts.get(seedHash);
    if (!artifact) {
      throw new Error('Artifact not found');
    }

    // Create friend seed data structure for marketplace prep
    const friendData = {
      sovereignty: {
        anchor: {
          tokenId: seedHash, // Use seed hash as token ID for now
          contractAddress: process.env.SEED_NFT_ADDRESS || process.env.PARADIGM_MARKETPLACE,
        },
      },
    };

    switch (action) {
      case 'list':
        if (!priceWei) throw new Error('Price required for listing');
        const listPrep = prepareList(friendData as any, priceWei);
        return {
          calldata: listPrep.calldata,
          contract: listPrep.contract,
          value: listPrep.value,
          function: listPrep.function,
        };
      case 'delist':
        const delistPrep = prepareDelist(friendData as any);
        return {
          calldata: delistPrep.calldata,
          contract: delistPrep.contract,
          value: delistPrep.value,
          function: delistPrep.function,
        };
      case 'buy':
        if (!priceWei) throw new Error('Price required for buying');
        const buyPrep = prepareBuy(friendData as any, priceWei);
        return {
          calldata: buyPrep.calldata,
          contract: buyPrep.contract,
          value: buyPrep.value,
          function: buyPrep.function,
        };
      default:
        throw new Error(`Unknown action: ${action}`);
    }
  }

  /**
   * Record sensory calibration feedback for adaptive evolution
   */
  recordSensoryFeedback(seedHash: string, feedback: { visual?: number; tactile?: number; harmonic?: number }): void {
    const existing = this.feedbackLoops.get(seedHash) || [];
    const newFeedback = [
      feedback.visual ?? 0.5,
      feedback.tactile ?? 0.5,
      feedback.harmonic ?? 0.5,
    ];
    this.feedbackLoops.set(seedHash, [...existing, newFeedback]);
  }

  /**
   * Get adaptive evolution suggestions based on sensory feedback
   */
  getEvolutionSuggestions(seedHash: string): { gene: string; suggestion: string; priority: number }[] {
    const feedback = this.feedbackLoops.get(seedHash);
    if (!feedback || feedback.length === 0) {
      return [];
    }

    // Calculate average feedback scores
    const avgVisual = feedback.reduce((sum, f) => sum + f[0], 0) / feedback.length;
    const avgTactile = feedback.reduce((sum, f) => sum + f[1], 0) / feedback.length;
    const avgHarmonic = feedback.reduce((sum, f) => sum + f[2], 0) / feedback.length;

    const suggestions: { gene: string; suggestion: string; priority: number }[] = [];

    if (avgVisual < 0.5) {
      suggestions.push({
        gene: 'appearance',
        suggestion: 'Increase visual complexity and color variety',
        priority: 0.8,
      });
    }

    if (avgTactile < 0.5) {
      suggestions.push({
        gene: 'texture',
        suggestion: 'Enhance material properties and surface detail',
        priority: 0.7,
      });
    }

    if (avgHarmonic < 0.5) {
      suggestions.push({
        gene: 'music',
        suggestion: 'Improve harmonic progression and audio richness',
        priority: 0.6,
      });
    }

    return suggestions.sort((a, b) => b.priority - a.priority);
  }

  /**
   * Get creator workflow state
   */
  getWorkflowState(creatorId: string): CreatorWorkflowState {
    const profile = this.profiles.get(creatorId);
    if (!profile) {
      throw new Error('Creator profile not found');
    }

    const artifacts = Array.from(this.artifacts.values()).filter(
      a => a.provenance.creator === creatorId
    );

    const published = Array.from(this.listings.values())
      .filter(l => l.listed)
      .map(l => l.artifactId);

    const draft = artifacts
      .map(a => a.seedHash)
      .filter(hash => !published.includes(hash));

    return {
      profile,
      currentSeed: null,
      artifacts,
      publishedArtifacts: published,
      draftArtifacts: draft,
      analytics: {
        views: 0, // Would be populated from telemetry
        downloads: 0,
        sales: published.length,
        revenue: profile.totalVolume,
      },
    };
  }

  /**
   * Validate artifact integrity
   */
  async validateArtifact(seedHash: string): Promise<boolean> {
    const artifact = this.artifacts.get(seedHash);
    if (!artifact) {
      return false;
    }

    // Re-calculate checksum to verify integrity
    const seed: Seed = {
      id: seedHash,
      $hash: seedHash,
      $name: artifact.seedName,
      $domain: artifact.domain,
      $lineage: { generation: artifact.generation, parents: artifact.lineage.parents },
      genes: artifact.genes as Record<string, { type?: string; value?: any; schema?: any }>,
    };

    this.exportPipeline.initialize(seed);
    const exportFormat = { type: 'json' as const, version: '1.0.0' };
    const exportResult = await this.exportPipeline.exportToJSON(seed, exportFormat);

    return exportResult.metadata.checksum === artifact.checksum;
  }

  /**
   * Get creator profile
   */
  getProfile(creatorId: string): CreatorProfile | undefined {
    return this.profiles.get(creatorId);
  }

  /**
   * Get artifact metadata
   */
  getArtifact(seedHash: string): ArtifactMetadata | undefined {
    return this.artifacts.get(seedHash);
  }

  /**
   * Get all artifacts for a creator
   */
  getCreatorArtifacts(creatorId: string): ArtifactMetadata[] {
    return Array.from(this.artifacts.values()).filter(
      a => a.provenance.creator === creatorId
    );
  }
}

// ─── Singleton Instance ─────────────────────────────────────────────────────

export const creatorWorkflow = new CreatorWorkflowEngine();
