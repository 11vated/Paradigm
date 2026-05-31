/**
 * Form Stratum — Base Predicate Implementation (Engineering Grade)
 * 
 * Form covers physical geometry, mesh, materials, proportions, and visual body.
 */

import { StratumPredicates, StratumScore, Stratum } from './types';
import { CharacterArtifact } from '../domains/character';

export class FormStratum implements StratumPredicates<CharacterArtifact> {
  readonly stratum: Stratum = 'Form';

  evaluate(artifact: CharacterArtifact): StratumScore {
    const form = artifact.form;

    const triScore = Math.min(form.mesh.triangleCount / 80000, 1.0);
    const blendScore = Math.min(form.mesh.blendshapeCount / 48, 1.0);
    const texScore = (form.textures.albedoRes >= 4096 ? 1.0 : 0.7);
    const hairScore = Math.min(form.hair.strandCount / 150000, 1.0);

    const score = (triScore * 0.35) + (blendScore * 0.25) + (texScore * 0.2) + (hairScore * 0.2);

    return {
      score: Math.max(0, Math.min(1, score)),
      confidence: 0.92,
      subscores: { triangles: triScore, blendshapes: blendScore, textures: texScore, hair: hairScore },
      issues: score < 0.85 ? ['Form quality below flagship threshold'] : [],
    };
  }

  explain(artifact: CharacterArtifact): string {
    const s = this.evaluate(artifact);
    return `Form stratum score: ${(s.score * 100).toFixed(1)}%. ` +
           `Triangles=${artifact.form.mesh.triangleCount}, Blendshapes=${artifact.form.mesh.blendshapeCount}`;
  }
}

export const formStratum = new FormStratum();
