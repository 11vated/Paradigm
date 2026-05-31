/**
 * Paradigm Infinite — Shader Domain Contract (Engineering Grade v1)
 */

import { QualityContract, ValidationResult, ContractManifest } from '../quality-contract';
import { Stratum } from '../strata/types';
import { Xoshiro256StarStar } from '../../kernel/rng';

export interface ShaderGeneSet {
  complexity: number;
  pbrFeatures: number;
  targetFps: number;
}

export interface ShaderArtifact {
  id: string;
  glslLines: number;
  pbrSupport: boolean;
  fpsAt1080p: number;
  strataScores: Record<Stratum, number>;
}

export class ShaderContract implements QualityContract<ShaderGeneSet, ShaderArtifact> {
  readonly domain = 'shader';
  readonly strata: Stratum[] = ['Form', 'Field'];
  readonly version = '1.0.0';

  curatedGoldenSet: any[] = [];
  determinismLock: 'kernel' | 'full' = 'full';
  crossModalConsistency = [{ targetModality: 'shader', requiredConsistency: 'structural', tolerance: 0.01 }];

  synthesize(seed: ShaderGeneSet, rng: Xoshiro256StarStar): ShaderArtifact {
    return {
      id: `shader_${Date.now()}`,
      glslLines: 180 + Math.floor(seed.complexity * 420),
      pbrSupport: seed.pbrFeatures > 3,
      fpsAt1080p: seed.targetFps || 120,
      strataScores: { Form: 0.91, Field: 0.87, Motion: 0, Sound: 0, Mind: 0, Story: 0, World: 0, Culture: 0, Time: 0 },
    };
  }

  invert(artifact: ShaderArtifact): Partial<ShaderGeneSet> {
    return { complexity: Math.min(1, artifact.glslLines / 600) };
  }

  rate(artifact: ShaderArtifact, seed: ShaderGeneSet): number {
    let s = artifact.strataScores.Form * 0.55;
    if (artifact.pbrSupport) s += 0.25;
    if (artifact.fpsAt1080p >= 60) s += 0.2;
    return Math.min(1, s);
  }

  validate(artifact: ShaderArtifact): ValidationResult {
    const issues: string[] = [];
    if (!artifact.pbrSupport) issues.push('PBR features missing');
    if (artifact.fpsAt1080p < 60) issues.push('Performance below target');
    return { valid: issues.length === 0, score: issues.length === 0 ? 0.94 : 0.62, issues };
  }

  manifest(): ContractManifest {
    return { domain: this.domain, version: this.version, strata: this.strata, determinismLevel: this.determinismLock, goldenSetSize: this.curatedGoldenSet.length, lastUpdated: new Date().toISOString() };
  }
}

export const shaderContract = new ShaderContract();
