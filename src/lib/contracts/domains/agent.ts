/**
 * Paradigm Infinite — Agent Domain Contract (Engineering Grade v1)
 * 6-stage pipeline, reproducibility, stratum expertise.
 */

import { QualityContract, ValidationResult, ContractManifest } from '../quality-contract';
import { Stratum } from '../strata/types';
import { Xoshiro256StarStar } from '../../kernel/rng';

export interface AgentGeneSet {
  pipelineStages: number;
  stratumExpertise: number;
  memoryLayers: number;
}

export interface AgentArtifact {
  id: string;
  stagesImplemented: number;
  reproducibilityScore: number;
  memoryDepth: number;
  strataScores: Record<Stratum, number>;
  // Sovereign Seed first-class treatment (Agent as 15_ breedable/ownable/signable artifact)
  sovereign?: boolean;
  breedable?: boolean;
  signable?: boolean;
  owner?: string;
  lineage?: string[];
  $name?: string;
  // Agent configuration block — consumed by Studio and engines.test
  config: {
    persona: string;
    name: string;
    temperature: number;
    reasoningDepth: number;
    explorationRate: number;
    autonomy?: number;
  };
}

export class AgentContract implements QualityContract<AgentGeneSet, AgentArtifact> {
  readonly domain = 'agent';
  readonly strata: Stratum[] = ['Mind', 'Story', 'Time', 'Field'];
  readonly version = '1.0.0';

  curatedGoldenSet: any[] = [];
  determinismLock: 'kernel' | 'full' = 'full';
  crossModalConsistency = [{ targetModality: 'decision', requiredConsistency: 'semantic', tolerance: 0.05 }];

  synthesize(seed: AgentGeneSet, rng: Xoshiro256StarStar): AgentArtifact {
    const personaChoices = ['assistant', 'architect', 'analyst', 'creative', 'expert'];
    const persona = personaChoices[Math.floor(rng.nextF64() * personaChoices.length)];
    // The agent itself is now a first-class 15_ sovereign artifact — breedable, ownable, signable
    return {
      id: `agent_${Math.floor(rng.nextF64() * 1e12)}`,
      stagesImplemented: seed.pipelineStages || 6,
      reproducibilityScore: 0.97,
      memoryDepth: seed.memoryLayers || 4,
      strataScores: { Mind: 0.95, Story: 0.88, Time: 0.91, Field: 0.84, Form: 0.7, Motion: 0.6, Sound: 0.5, World: 0.4, Culture: 0.3 },
      sovereign: true,
      breedable: true,
      signable: true,
      owner: `agent-owner-${Math.floor(rng.nextF64() * 1e10)}`,
      config: {
        persona,
        name: (seed as any).$name ?? 'Paradigm Agent',
        temperature: +(rng.nextF64() * 0.5 + 0.5).toFixed(2),
        reasoningDepth: +(rng.nextF64() * 0.5 + 0.5).toFixed(2),
        explorationRate: +(rng.nextF64() * 0.4 + 0.1).toFixed(2),
        autonomy: +(rng.nextF64() * 0.5 + 0.5).toFixed(2),
      },
    };
  }

  invert(artifact: AgentArtifact): Partial<AgentGeneSet> {
    return { pipelineStages: artifact.stagesImplemented };
  }

  rate(artifact: AgentArtifact, seed: AgentGeneSet): number {
    return (artifact.reproducibilityScore + artifact.strataScores.Mind) / 2;
  }

  validate(artifact: AgentArtifact): ValidationResult {
    const issues: string[] = [];
    if (artifact.stagesImplemented < 6) issues.push('Pipeline incomplete');
    if (artifact.reproducibilityScore < 0.9) issues.push('Reproducibility below Epoch 2 threshold');
    return { valid: issues.length === 0, score: issues.length === 0 ? 0.96 : 0.55, issues };
  }

  manifest(): ContractManifest {
    return { domain: this.domain, version: this.version, strata: this.strata, determinismLevel: this.determinismLock, goldenSetSize: this.curatedGoldenSet.length, lastUpdated: new Date().toISOString() };
  }
}

export const agentContract = new AgentContract();

// Sovereign agent breeding helper (used by the GSPL agent for self-evolution)
export function breedSovereignAgents(agentA: any, agentB: any, rng: Xoshiro256StarStar) {
  const newGenes: any = {
    pipelineStages: Math.max(4, Math.floor(((agentA.stagesImplemented || 6) + (agentB.stagesImplemented || 6)) / 2)),
    memoryLayers: Math.max(2, Math.floor(((agentA.memoryDepth || 4) + (agentB.memoryDepth || 4)) / 2) + (rng.nextF64() > 0.85 ? 1 : 0)),
  };
  const child = agentContract.synthesize(newGenes, rng);
  child.lineage = [agentA.id, agentB.id];
  return child;
}
