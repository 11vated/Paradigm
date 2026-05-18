/**
 * Pipeline Stage Types
 * Shared types for the 6-stage generation pipeline.
 */

export interface LiveContext {
  userId: string;
  activeDomain: string;
  recentSeedIds: string[];
  styleHints: string[];
  preferences: Record<string, unknown>;
}

export interface IntentEnvelope {
  description: string;
  domain: string;
  genes: Record<string, unknown>;
  constraints: Record<string, unknown>;
  style: string;
  referenceSeeds?: string[];
}

export interface CodeGenResult {
  gsplCode: string;
  params: Record<string, unknown>;
}

export interface GrowthResult {
  seedId: string;
  seedHash: string;
  artifact: unknown;
  domain: string;
  quality: number;
}

export interface ValidationResult {
  valid: boolean;
  confidence: number;
  issues: string[];
  adjustedDescription?: string;
}

export interface EvolutionResult {
  refinedSeedId: string;
  refinedSeedHash: string;
  improvement: number;
  iterations: number;
}

export interface ArchiveResult {
  signed: boolean;
  storageId: string;
  gseedPath?: string;
}

export interface PipelineResult {
  success: boolean;
  intent: IntentEnvelope;
  code?: CodeGenResult;
  growth?: GrowthResult;
  validation?: ValidationResult;
  evolution?: EvolutionResult;
  archive?: ArchiveResult;
  error?: string;
  duration: number;
}