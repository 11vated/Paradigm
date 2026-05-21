/**
 * StyleAgent — artistic style, era, medium tags.
 *
 * Picks a coherent style "envelope" that other domain sub-agents can
 * defer to when they need a tiebreaker. Outputs:
 *   style.movement     (impressionist, baroque, brutalist, ukiyo-e, ...)
 *   style.era          (ancient, classical, modern, postmodern, future)
 *   style.medium       (oil, watercolor, ink, digital, 3d, photographic)
 *   style.tags         (3-5 descriptive tags)
 *   style.referenceWeight (0–1, how literally to follow style vs free-form)
 */

import type { SubAgentInput, SubAgentOutput } from '../types';
import { BaseSubAgent, emit, intentVector, mapTo, projectAxis } from './base';

const MOVEMENTS = [
  'impressionist', 'expressionist', 'baroque', 'rococo', 'romanticist',
  'realist', 'cubist', 'surrealist', 'art-nouveau', 'art-deco',
  'bauhaus', 'brutalist', 'minimalist', 'ukiyo-e', 'ink-wash',
  'pop-art', 'street-art', 'cyberpunk', 'solarpunk', 'cottagecore',
  'gothic', 'neoclassical', 'futurist', 'dadaist', 'pixel-art',
] as const;

export class StyleAgent extends BaseSubAgent {
  readonly id = 'style';
  readonly domain = 'style';

  shouldRun(): boolean {
    // Style runs always — it's a soft cross-domain influence
    return true;
  }

  async run(input: SubAgentInput): Promise<SubAgentOutput> {
    const vec = intentVector(input.intent.adjectives);
    const valence = projectAxis(vec, 'valence');
    const arousal = projectAxis(vec, 'arousal');
    const novelty = projectAxis(vec, 'novelty');
    const formality = projectAxis(vec, 'formality');
    const hardness = projectAxis(vec, 'hardness');
    const density = projectAxis(vec, 'density');
    const organic = projectAxis(vec, 'organic');
    const brightness = projectAxis(vec, 'brightness');
    const smoothness = projectAxis(vec, 'smoothness');

    // Score every movement and pick the strongest
    const scores: Record<string, number> = {
      impressionist:  smoothness + brightness - formality,
      expressionist:  arousal + valence * -0.3 + novelty * 0.5,
      baroque:        density + formality + organic,
      rococo:         density + brightness + valence,
      romanticist:    valence + organic + brightness,
      realist:        formality + (1 - novelty),
      cubist:         novelty + hardness - smoothness,
      surrealist:     novelty + (1 - formality) + Math.abs(valence) * 0.3,
      'art-nouveau':  organic + smoothness + density,
      'art-deco':     formality + density + brightness,
      bauhaus:        formality + (1 - density) + (1 - organic),
      brutalist:      hardness + (1 - smoothness) + (1 - warmthOf(vec)),
      minimalist:     (1 - density) + smoothness + formality,
      'ukiyo-e':      (1 - density) + organic + smoothness,
      'ink-wash':     (1 - density) + (1 - brightness) + organic,
      'pop-art':      arousal + brightness + (1 - formality),
      'street-art':   arousal + novelty + (1 - formality),
      cyberpunk:      arousal + (1 - organic) + novelty,
      solarpunk:      organic + valence + novelty * 0.5,
      cottagecore:    organic + warmthOf(vec) + (1 - novelty),
      gothic:         -brightness + density + formality,
      neoclassical:   formality + smoothness + (1 - novelty),
      futurist:       novelty + (1 - organic) + arousal,
      dadaist:        novelty + (1 - formality) + arousal,
      'pixel-art':    hardness + (1 - smoothness) + novelty * 0.5,
    };

    const movement = (Object.entries(scores).sort((a, b) => b[1] - a[1])[0][0]) as typeof MOVEMENTS[number];

    const era =
      formality > 0.4 && novelty < -0.2 ? 'classical' :
      novelty > 0.5 ? 'future' :
      formality > 0.3 ? 'modern' :
      novelty < -0.4 ? 'ancient' :
      'postmodern';

    let medium: string;
    if (organic > 0.4 && smoothness > 0.3) medium = 'oil';
    else if (organic > 0.3 && smoothness < 0) medium = 'ink';
    else if (organic < -0.3 && hardness > 0.3) medium = 'digital';
    else if (organic < -0.3) medium = '3d';
    else if (brightness > 0.4 && smoothness > 0.4) medium = 'watercolor';
    else medium = 'photographic';

    // Tags — pick a handful of dominant axes
    const tags: string[] = [];
    if (brightness > 0.4) tags.push('luminous');
    if (brightness < -0.4) tags.push('shadowy');
    if (organic > 0.4) tags.push('organic');
    if (organic < -0.4) tags.push('synthetic');
    if (formality > 0.4) tags.push('formal');
    if (novelty > 0.5) tags.push('experimental');
    if (smoothness > 0.5) tags.push('smooth');
    if (hardness > 0.5) tags.push('hard-edged');

    const referenceWeight = Math.max(0, Math.min(1, mapTo(formality, 0.3, 0.9)));

    return {
      produced: [
        emit(this.id, 'style.movement', movement, 0.8),
        emit(this.id, 'style.era', era, 0.75),
        emit(this.id, 'style.medium', medium, 0.7),
        emit(this.id, 'style.tags', tags, 0.7),
        emit(this.id, 'style.referenceWeight', referenceWeight, 0.7),
      ],
    };
  }
}

function warmthOf(vec: number[]): number {
  // warmth is axis 3 (0-indexed) per VAD_AXES
  return vec[3];
}
