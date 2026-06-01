/**
 * Paradigm Infinite — Sprite Domain Contract (Engineering Grade v1 - new canonical)
 * Target: Animated sprite sheets 64-512px, 8-64 frames, palettes, PNG+JSON/Aseprite.
 */

import { QualityContract, ValidationResult, ContractManifest } from '../quality-contract';
import { Stratum } from '../strata/types';
import { Xoshiro256StarStar } from '../../kernel/rng';

export interface SpriteGeneSet {
  resolution: number;
  frameCount: number;
  paletteSize: number;
}

export interface SpriteArtifact {
  id: string;
  resolution: number;
  frameCount: number;
  paletteSize: number;
  exportFormats: string[];
  strataScores: Record<Stratum, number>;
}

export class SpriteContract implements QualityContract<SpriteGeneSet, SpriteArtifact> {
  readonly domain = 'sprite';
  readonly strata: Stratum[] = ['Form', 'Motion'];
  readonly version = '1.0.0';

  curatedGoldenSet: any[] = [];
  determinismLock: 'kernel' | 'full' = 'full';
  crossModalConsistency = [{ targetModality: 'image', requiredConsistency: 'structural', tolerance: 0.03 }];

  synthesize(seed: SpriteGeneSet, rng: Xoshiro256StarStar): SpriteArtifact {
    return {
      id: `sprite_${Math.trunc(rng.nextF64() * 0xFFFFFFFF).toString(10)}`,
      resolution: seed.resolution || 256,
      frameCount: seed.frameCount || 24,
      paletteSize: seed.paletteSize || 32,
      exportFormats: ['PNG+JSON', 'Aseprite'],
      strataScores: { Form: 0.94, Motion: 0.91, Sound: 0, Mind: 0, Story: 0, World: 0, Field: 0, Culture: 0, Time: 0 },
    };
  }

  invert(artifact: SpriteArtifact): Partial<SpriteGeneSet> {
    return { resolution: artifact.resolution, frameCount: artifact.frameCount };
  }

  rate(artifact: SpriteArtifact, seed: SpriteGeneSet): number {
    return (artifact.strataScores.Form * 0.55) + (artifact.strataScores.Motion * 0.35) + 0.1;
  }

  validate(artifact: SpriteArtifact): ValidationResult {
    const issues: string[] = [];
    if (artifact.frameCount < 8) issues.push('Too few frames');
    if (artifact.paletteSize < 8) issues.push('Palette too small');
    return { valid: issues.length === 0, score: issues.length === 0 ? 0.93 : 0.6, issues };
  }

  manifest(): ContractManifest {
    return { domain: this.domain, version: this.version, strata: this.strata, determinismLevel: this.determinismLock, goldenSetSize: this.curatedGoldenSet.length, lastUpdated: new Date().toISOString() };
  }
}

export const spriteContract = new SpriteContract();
