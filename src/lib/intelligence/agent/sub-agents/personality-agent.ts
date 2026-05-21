/**
 * PersonalityAgent
 *
 * Maps the 12-D adjective vector to Big Five personality traits +
 * attachment style + archetype tags. These become the gene values
 * under `body.bigFive`, `body.attachment`, and `persona.archetype`
 * on character / friend seeds.
 *
 * The Big Five mapping is intentionally interpretable — each trait
 * is a documented linear combination of 12-D axes.
 */

import type { SubAgentInput, SubAgentOutput } from '../types';
import { BaseSubAgent, emit, intentVector, projectAxis } from './base';
import type { Vec12 } from '../adjective-normalization';

const ARCHETYPES = [
  'hero', 'sage', 'rebel', 'caregiver', 'jester',
  'lover', 'ruler', 'creator', 'explorer', 'innocent',
  'magician', 'everyman', 'outlaw', 'shadow', 'mentor',
] as const;
type Archetype = typeof ARCHETYPES[number];

export class PersonalityAgent extends BaseSubAgent {
  readonly id = 'personality';
  readonly domain = 'character';

  shouldRun(intent: { domains: string[] }): boolean {
    return ['character', 'friend', 'narrative', 'persona', 'all'].some((d) =>
      intent.domains.includes(d),
    );
  }

  async run(input: SubAgentInput): Promise<SubAgentOutput> {
    const vec = intentVector(input.intent.adjectives);

    const openness         = bigFive(vec, 'openness');
    const conscientiousness = bigFive(vec, 'conscientiousness');
    const extraversion     = bigFive(vec, 'extraversion');
    const agreeableness    = bigFive(vec, 'agreeableness');
    const neuroticism      = bigFive(vec, 'neuroticism');

    // Attachment style — Bartholomew's 4-style model
    const secureScore   = (agreeableness + 1 - neuroticism) / 2;
    const anxiousScore  = (neuroticism + (1 - agreeableness)) / 2;
    const avoidScore    = ((1 - extraversion) + (1 - agreeableness)) / 2;
    const fearfulScore  = (neuroticism + (1 - extraversion)) / 2;
    const attachments = { secure: secureScore, anxious: anxiousScore, avoidant: avoidScore, fearful: fearfulScore };
    const attachment = (Object.entries(attachments).sort((a, b) => b[1] - a[1])[0][0]) as keyof typeof attachments;

    // Archetype — pick by axis affinity
    const archetype = pickArchetype(vec);

    return {
      produced: [
        emit(this.id, 'body.bigFive.openness', openness, 0.85),
        emit(this.id, 'body.bigFive.conscientiousness', conscientiousness, 0.85),
        emit(this.id, 'body.bigFive.extraversion', extraversion, 0.85),
        emit(this.id, 'body.bigFive.agreeableness', agreeableness, 0.85),
        emit(this.id, 'body.bigFive.neuroticism', neuroticism, 0.85),
        emit(this.id, 'body.attachment', attachment, 0.7, `top score in {secure, anxious, avoidant, fearful}`),
        emit(this.id, 'persona.archetype', archetype, 0.75, `closest of ${ARCHETYPES.length} archetypes`),
      ],
    };
  }
}

type Trait = 'openness' | 'conscientiousness' | 'extraversion' | 'agreeableness' | 'neuroticism';

/** Documented linear projections from 12-D space → [0, 1] Big Five */
function bigFive(vec: Vec12, trait: Trait): number {
  const novelty = projectAxis(vec, 'novelty');
  const valence = projectAxis(vec, 'valence');
  const arousal = projectAxis(vec, 'arousal');
  const dominance = projectAxis(vec, 'dominance');
  const warmth = projectAxis(vec, 'warmth');
  const formality = projectAxis(vec, 'formality');
  const organic = projectAxis(vec, 'organic');

  let raw: number;
  switch (trait) {
    case 'openness':
      raw = 0.5 * novelty + 0.2 * arousal + 0.2 * valence + 0.1 * organic;
      break;
    case 'conscientiousness':
      raw = 0.5 * formality + 0.2 * (1 - novelty) + 0.2 * dominance + 0.1 * (1 - arousal);
      break;
    case 'extraversion':
      raw = 0.4 * arousal + 0.3 * dominance + 0.3 * valence;
      break;
    case 'agreeableness':
      raw = 0.5 * warmth + 0.3 * valence + 0.2 * (-dominance);
      break;
    case 'neuroticism':
      raw = 0.5 * (-valence) + 0.3 * arousal + 0.2 * (1 - dominance);
      break;
  }
  // Map [-1, 1] → [0, 1]
  return Math.max(0, Math.min(1, (raw + 1) / 2));
}

function pickArchetype(vec: Vec12): Archetype {
  const v = (axis: Parameters<typeof projectAxis>[1]) => projectAxis(vec, axis);
  const scores: Record<Archetype, number> = {
    hero:      v('dominance') + v('valence') + v('arousal') * 0.5,
    sage:      v('formality') + v('novelty') * 0.5 - v('arousal') * 0.3,
    rebel:     v('arousal') + (1 - v('formality')) + v('novelty') * 0.5,
    caregiver: v('warmth') + v('organic') + v('valence'),
    jester:    v('arousal') + v('valence') + (1 - v('formality')),
    lover:     v('warmth') + v('valence') + (1 - v('hardness')),
    ruler:     v('dominance') + v('formality') + v('hardness') * 0.5,
    creator:   v('novelty') + v('organic') + v('arousal') * 0.5,
    explorer:  v('novelty') + v('arousal') + v('speed'),
    innocent:  v('warmth') + v('brightness') + (1 - v('arousal')),
    magician:  v('novelty') + v('dominance') + v('organic') * 0.5,
    everyman:  v('warmth') - Math.abs(v('arousal')) - Math.abs(v('novelty')),
    outlaw:    v('arousal') + (1 - v('formality')) - v('agreeableness' as never),
    shadow:    -v('valence') + v('dominance') + v('hardness'),
    mentor:    v('formality') + v('warmth') + v('dominance') * 0.5,
  };
  return (Object.entries(scores).sort((a, b) => b[1] - a[1])[0][0]) as Archetype;
}
