/**
 * NarrativeTextInverter — narrative prose → narrative gene specs.
 * Recovers: tone, pov, pacing, sentenceLengthMean, vocabularyRichness.
 * All deterministic (token + sentence statistics + compact lexicon).
 */
import { confidenceLevel } from './types';
import type { Inverter, InversionReport, InvertedGene, InversionResidual } from './types';

const TONE_LEXICON: Record<string, string[]> = {
  dark:     ['shadow','blood','dread','void','death','silence','cold','ash','rotted','grief','sorrow','bleak'],
  luminous: ['light','dawn','golden','radiant','glow','silver','crystal','bloom','warmth','soft'],
  wistful:  ['remember','yearning','memory','ghost','echo','longing','distant','perhaps','once','old'],
  playful:  ['laugh','dance','sparkle','tease','grin','skip','bounce','twirl','silly','bink'],
  tense:    ['gripped','stiff','tight','breath','halted','flinch','coil','raced','pounding'],
};

function tokenize(s: string): string[] {
  return s.toLowerCase().match(/[a-z']+/g) ?? [];
}

function sentences(s: string): string[] {
  return s.split(/[.!?]+\s+/).map((x) => x.trim()).filter(Boolean);
}

export class NarrativeTextInverter implements Inverter<string> {
  readonly id = 'narrative.text-tone-pov';
  readonly domain = 'narrative';

  accepts(x: unknown): x is string {
    return typeof x === 'string' && x.trim().length > 0;
  }

  async invert(text: string): Promise<InversionReport> {
    const tokens = tokenize(text);
    const sents = sentences(text);
    const genes: InvertedGene[] = [];
    const residuals: InversionResidual[] = [];

    // TONE ---
    let bestTone = 'neutral';
    let bestHits = 0;
    const hitsByTone: Record<string, number> = {};
    for (const [tone, words] of Object.entries(TONE_LEXICON)) {
      const hits = tokens.filter((t) => words.includes(t)).length;
      hitsByTone[tone] = hits;
      if (hits > bestHits) { bestHits = hits; bestTone = tone; }
    }
    const toneConf = bestHits === 0 ? 0.35 : Math.min(0.95, 0.4 + bestHits * 0.1);
    genes.push({ path: 'narrative.tone', value: bestTone, confidence: toneConf, level: confidenceLevel(toneConf), note: `hits:${bestHits}` });

    // POV ---
    const firstP = tokens.filter((t) => ['i',"my","me","mine"].includes(t)).length;
    const secondP = tokens.filter((t) => ["you","your"].includes(t)).length;
    const thirdP = tokens.filter((t) => ["he","she","they"].includes(t)).length;
    let pov: string = 'third-limited';
    if (firstP > secondP && firstP > thirdP) pov = 'first';
    else if (secondP > firstP && secondP > thirdP) pov = 'second';
    const povConf = Math.min(0.90, 0.4 + (mathMax([firstP, secondP, thirdP]) / 20));
    genes.push({ path: 'narrative.pov', value: pov, confidence: povConf, level: confidenceLevel(povConf) });

    // Sentence length + pacing ---
    const sentLens = sents.map((s) => tokenize(s).length).filter((n) => n > 0);
    const meanSentLen = sentLens.length ? sentLens.reduce((a, b) => a + b, 0) / sentLens.length : 0;
    // pacing is an inverse of sentence length (shorter = faster)
    const pacing = Math.max(0, Math.min(1, 1 - (meanSentLen / 40)));
    genes.push({ path: 'narrative.sentenceLengthMean', value: Math.round(meanSentLen * 10) / 10, confidence: 0.85, level: confidenceLevel(0.85) });
    genes.push({ path: 'narrative.pacing', value: Math.round(pacing * 100) / 100, confidence: 0.75, level: confidenceLevel(0.75) });

    // Vocabulary richness (TTR) ---
    const unique = new Set(tokens).size;
    const ttr = tokens.length ? unique / tokens.length : 0;
    genes.push({ path: 'narrative.vocabularyRichness', value: Math.round(ttr * 100) / 100, confidence: 0.9, level: confidenceLevel(0.9) });

    // Residuals for tones with 1+ hits that didn't win
    for (const [tone, hits] of Object.entries(hitsByTone)) {
      if (hits > 0 && tone !== bestTone) {
        residuals.push({ feature: `tone-hint:${tone}`, reason: 'low-confidence', raw: hits });
      }
    }

    const artifactBytes = Buffer.byteLength(text, 'utf8');
    const overall = genes.length ? genes.reduce((s, g) => s + g.confidence, 0) / genes.length : 0;
    return {
      domain: 'narrative',
      inverterId: this.id,
      artifactBytes,
      genes,
      residuals,
      overallConfidence: Math.round(overall * 100) / 100,
      elapsedMs: 0,
    };
  }
}

function mathMax(a: number[]): number {
  return a.reduce((p, c) => (c > p ? c : p), -Infinity);
}
