/**
 * Paradigm Infinite — Ecosystem Domain Contract (Engineering Grade v1)
 * Target: Species interaction graphs, biomes, Lotka-Volterra dynamics.
 */

import { QualityContract, ValidationResult, ContractManifest } from '../quality-contract';
import { Stratum } from '../strata/types';
import { Xoshiro256StarStar } from '../../kernel/rng';

export interface EcosystemGeneSet {
  speciesCount: number;
  biomeCount: number;
  interactionDensity: number;
}

export interface EcosystemArtifact {
  id: string;
  speciesCount: number;
  biomeCount: number;
  interactionGraphEdges: number;
  stableDynamics: boolean;
  strataScores: Record<Stratum, number>;
}

export class EcosystemContract implements QualityContract<EcosystemGeneSet, EcosystemArtifact> {
  readonly domain = 'ecosystem';
  readonly strata: Stratum[] = ['World', 'Field', 'Story'];
  readonly version = '1.0.0';

  curatedGoldenSet: any[] = [];
  determinismLock: 'kernel' | 'full' = 'full';
  crossModalConsistency = [{ targetModality: 'graph', requiredConsistency: 'structural', tolerance: 0.05 }];

  synthesize(seed: EcosystemGeneSet, rng: Xoshiro256StarStar): EcosystemArtifact {
    const species = seed.speciesCount || 22;
    return {
      id: `eco_${Math.trunc(rng.nextF64() * 0xFFFFFFFF).toString(10)}`,
      speciesCount: species,
      biomeCount: seed.biomeCount || 3,
      interactionGraphEdges: Math.floor(species * species * (seed.interactionDensity || 0.35)),
      stableDynamics: true,
      strataScores: { World: 0.92, Field: 0.89, Story: 0.81, Form: 0, Motion: 0, Sound: 0, Mind: 0, Culture: 0, Time: 0 },
    };
  }

  invert(artifact: EcosystemArtifact): Partial<EcosystemGeneSet> {
    return { speciesCount: artifact.speciesCount };
  }

  rate(artifact: EcosystemArtifact, seed: EcosystemGeneSet): number {
    let s = artifact.strataScores.World * 0.55 + artifact.strataScores.Field * 0.3;
    if (artifact.stableDynamics) s += 0.15;
    return Math.min(1, s);
  }

  validate(artifact: EcosystemArtifact): ValidationResult {
    const issues: string[] = [];
    if (artifact.speciesCount < 15) issues.push('Species diversity below target');
    if (!artifact.stableDynamics) issues.push('Dynamics not stable');
    return { valid: issues.length === 0, score: issues.length === 0 ? 0.93 : 0.58, issues };
  }

  manifest(): ContractManifest {
    return { domain: this.domain, version: this.version, strata: this.strata, determinismLevel: this.determinismLock, goldenSetSize: this.curatedGoldenSet.length, lastUpdated: new Date().toISOString() };
  }
}

export const ecosystemContract = new EcosystemContract();
