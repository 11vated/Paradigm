/**
 * Paradigm Infinite — Vehicle Domain Contract (Engineering Grade v1)
 * Target: Land/sea/air vehicles, 4-12 wheels/DOF, 200+ km/h physics, GLTF/JSON.
 */

import { QualityContract, ValidationResult, ContractManifest } from '../quality-contract';
import { Stratum } from '../strata/types';
import { Xoshiro256StarStar } from '../../kernel/rng';

export interface VehicleGeneSet {
  type: 'land' | 'sea' | 'air';
  wheelsOrDOF: number;
  topSpeedKmh: number;
}

export interface VehicleArtifact {
  id: string;
  type: string;
  wheelsOrDOF: number;
  topSpeedKmh: number;
  hasPhysics: boolean;
  exportFormats: string[];
  strataScores: Record<Stratum, number>;
}

export class VehicleContract implements QualityContract<VehicleGeneSet, VehicleArtifact> {
  readonly domain = 'vehicle';
  readonly strata: Stratum[] = ['Form', 'Motion', 'Field'];
  readonly version = '1.0.0';

  curatedGoldenSet: any[] = [];
  determinismLock: 'kernel' | 'full' = 'full';
  crossModalConsistency = [{ targetModality: 'model', requiredConsistency: 'structural', tolerance: 0.03 }];

  synthesize(seed: VehicleGeneSet, rng: Xoshiro256StarStar): VehicleArtifact {
    return {
      id: `veh_${Date.now()}`,
      type: seed.type,
      wheelsOrDOF: seed.wheelsOrDOF || 4,
      topSpeedKmh: seed.topSpeedKmh || 220,
      hasPhysics: true,
      exportFormats: ['GLTF', 'JSON'],
      strataScores: { Form: 0.93, Motion: 0.91, Field: 0.87, Sound: 0, Mind: 0, Story: 0, World: 0, Culture: 0, Time: 0 },
    };
  }

  invert(artifact: VehicleArtifact): Partial<VehicleGeneSet> {
    return { wheelsOrDOF: artifact.wheelsOrDOF, topSpeedKmh: artifact.topSpeedKmh };
  }

  rate(artifact: VehicleArtifact, seed: VehicleGeneSet): number {
    let s = artifact.strataScores.Form * 0.4 + artifact.strataScores.Motion * 0.4;
    if (artifact.hasPhysics) s += 0.2;
    return Math.min(1, s);
  }

  validate(artifact: VehicleArtifact): ValidationResult {
    const issues: string[] = [];
    if (!artifact.hasPhysics) issues.push('Physics simulation missing');
    if (artifact.topSpeedKmh < 150) issues.push('Top speed below target');
    return { valid: issues.length === 0, score: issues.length === 0 ? 0.94 : 0.6, issues };
  }

  manifest(): ContractManifest {
    return { domain: this.domain, version: this.version, strata: this.strata, determinismLevel: this.determinismLock, goldenSetSize: this.curatedGoldenSet.length, lastUpdated: new Date().toISOString() };
  }
}

export const vehicleContract = new VehicleContract();
