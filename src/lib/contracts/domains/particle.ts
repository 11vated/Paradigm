/**
 * Paradigm Infinite — Particle Domain Contract (Engineering Grade v1)
 */

import { QualityContract, ValidationResult, ContractManifest } from '../quality-contract';
import { Stratum } from '../strata/types';
import { Xoshiro256StarStar } from '../../kernel/rng';

export interface ParticleGeneSet {
  emitterCount: number;
  maxParticles: number;
  behaviorComplexity: number;
}

export interface ParticleArtifact {
  id: string;
  emitterCount: number;
  maxParticles: number;
  behaviorModules: number;
  strataScores: Record<Stratum, number>;
}

export class ParticleContract implements QualityContract<ParticleGeneSet, ParticleArtifact> {
  readonly domain = 'particle';
  readonly strata: Stratum[] = ['Motion', 'Form', 'Field'];
  readonly version = '1.0.0';

  curatedGoldenSet: any[] = [];
  determinismLock: 'kernel' | 'full' = 'full';
  crossModalConsistency = [{ targetModality: 'simulation', requiredConsistency: 'phenotypic', tolerance: 0.04 }];

  synthesize(seed: ParticleGeneSet, rng: Xoshiro256StarStar): ParticleArtifact {
    return {
      id: `part_${Math.floor(rng.nextF64() * 1e15)}`,
      emitterCount: seed.emitterCount || 7,
      maxParticles: seed.maxParticles || 12500,
      behaviorModules: seed.behaviorComplexity * 9 + 2,
      strataScores: { Motion: 0.94, Form: 0.88, Field: 0.85, Sound: 0, Mind: 0, Story: 0, World: 0, Culture: 0, Time: 0 },
    };
  }

  invert(artifact: ParticleArtifact): Partial<ParticleGeneSet> {
    return { emitterCount: artifact.emitterCount };
  }

  rate(artifact: ParticleArtifact, seed: ParticleGeneSet): number {
    return (artifact.strataScores.Motion * 0.55) + (artifact.strataScores.Field * 0.3) + 0.15;
  }

  validate(artifact: ParticleArtifact): ValidationResult {
    const issues: string[] = [];
    if (artifact.maxParticles < 5000) issues.push('Particle count below target for flagship effects');
    if (artifact.emitterCount < 4) issues.push('Insufficient emitter diversity');
    return { valid: issues.length === 0, score: issues.length === 0 ? 0.93 : 0.59, issues };
  }

  manifest(): ContractManifest {
    return { domain: this.domain, version: this.version, strata: this.strata, determinismLevel: this.determinismLock, goldenSetSize: this.curatedGoldenSet.length, lastUpdated: new Date().toISOString() };
  }
}

export const particleContract = new ParticleContract();
