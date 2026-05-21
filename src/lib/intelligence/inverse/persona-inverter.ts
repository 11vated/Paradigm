/**
 * PersonaVectorInverter — Big Five + values -> persona genes.
 * Takes a structured PersonaVector and emits gene specs for the
 * canonical persona shape. Useful when ingesting psychometric data,
 * questionnaire results, or rendered character profiles.
 */
import { confidenceLevel } from './types';
import type { Inverter, InversionReport, InvertedGene, InversionResidual } from './types';

export interface PersonaVector {
  bigFive: {
    openness: number;
    conscientiousness: number;
    extraversion: number;
    agreeableness: number;
    neuroticism: number;
  };
  attachment?: 'secure' | 'anxious' | 'avoidant' | 'disorganized';
  values?: string[];
  archetypeHints?: string[];
}

const ARCHETYPE_RULES: Array<{ name: string; test: (v: PersonaVector) => boolean }> = [
  { name: 'Caregiver',  test: (v) => v.bigFive.agreeableness > 0.7 && v.bigFive.neuroticism < 0.5 },
  { name: 'Sage',       test: (v) => v.bigFive.openness > 0.75 && v.bigFive.conscientiousness > 0.6 },
  { name: 'Hero',       test: (v) => v.bigFive.extraversion > 0.7 && v.bigFive.conscientiousness > 0.6 },
  { name: 'Rebel',      test: (v) => v.bigFive.openness > 0.7 && v.bigFive.agreeableness < 0.4 },
  { name: 'Lover',      test: (v) => v.bigFive.agreeableness > 0.6 && v.bigFive.extraversion > 0.55 },
  { name: 'Jester',     test: (v) => v.bigFive.extraversion > 0.75 && v.bigFive.openness > 0.6 && v.bigFive.conscientiousness < 0.55 },
  { name: 'Magician',   test: (v) => v.bigFive.openness > 0.8 },
  { name: 'Ruler',      test: (v) => v.bigFive.conscientiousness > 0.75 && v.bigFive.extraversion > 0.55 },
  { name: 'Innocent',   test: (v) => v.bigFive.agreeableness > 0.7 && v.bigFive.openness < 0.5 },
  { name: 'Explorer',   test: (v) => v.bigFive.openness > 0.7 && v.bigFive.extraversion > 0.5 },
];

export class PersonaVectorInverter implements Inverter<PersonaVector> {
  readonly id = 'persona.vector-v1';
  readonly domain = 'persona';
  accepts(x: unknown): x is PersonaVector {
    return !!x && typeof (x as any).bigFive === 'object' && typeof (x as any).bigFive?.openness === 'number';
  }
  async invert(v: PersonaVector): Promise<InversionReport> {
    const genes: InvertedGene[] = [];
    const residuals: InversionResidual[] = [];

    // Big Five — 1:1 mapping with high confidence
    for (const [k, val] of Object.entries(v.bigFive)) {
      genes.push({ path: `persona.bigFive.${k}`, value: Math.round(val * 1000) / 1000, confidence: 0.95, level: confidenceLevel(0.95) });
    }

    // Attachment style
    if (v.attachment) {
      genes.push({ path: 'persona.attachment', value: v.attachment, confidence: 0.9, level: confidenceLevel(0.9) });
    } else {
      residuals.push({ feature: 'persona.attachment', reason: 'no-gene' });
    }

    // Values (interests/values genes)
    if (v.values && v.values.length > 0) {
      genes.push({ path: 'persona.values', value: v.values.slice(0, 8), confidence: 0.85, level: confidenceLevel(0.85) });
    }

    // Archetype — pick best matching rule
    const matches = ARCHETYPE_RULES.filter((r) => r.test(v)).map((r) => r.name);
    if (v.archetypeHints && v.archetypeHints.length > 0) {
      // Boost: prefer hint that also matches a rule
      const boosted = v.archetypeHints.find((h) => matches.includes(h)) ?? matches[0] ?? v.archetypeHints[0];
      genes.push({ path: 'persona.archetype', value: boosted, confidence: 0.85, level: confidenceLevel(0.85), note: `hints+rules` });
    } else if (matches.length > 0) {
      genes.push({ path: 'persona.archetype', value: matches[0], confidence: 0.65, level: confidenceLevel(0.65), note: `rule-only` });
      if (matches.length > 1) {
        for (const m of matches.slice(1)) {
          residuals.push({ feature: `archetype-alt:${m}`, reason: 'low-confidence' });
        }
      }
    } else {
      residuals.push({ feature: 'persona.archetype', reason: 'low-confidence' });
    }

    const artifactBytes = Buffer.byteLength(JSON.stringify(v), 'utf8');
    const overall = genes.reduce((s, g) => s + g.confidence, 0) / Math.max(1, genes.length);
    return { domain: 'persona', inverterId: this.id, artifactBytes, genes, residuals, overallConfidence: Math.round(overall * 100) / 100, elapsedMs: 0 };
  }
}
