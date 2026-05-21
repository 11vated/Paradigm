/**
 * Text inverter — for character/persona artifacts described in prose.
 * Maps a text description into Big-Five personality estimates + tone.
 *
 * Lexicon-based; same word always yields the same delta (deterministic).
 * Useful for importing existing characters from external fiction into
 * Paradigm's gene space.
 */
import { kernelNow } from '../../kernel/clock';
import { confidenceLevel } from './types';
import type { Inverter, InversionReport, InvertedGene, InversionResidual } from './types';

interface Cue { words: string[]; delta: { O?: number; C?: number; E?: number; A?: number; N?: number }; tone?: string }

const CUES: Cue[] = [
  { words: ['curious','imaginative','creative','inventive','open-minded'], delta: { O: 0.18 } },
  { words: ['conventional','traditional','cautious','closed'], delta: { O: -0.18 } },
  { words: ['organised','disciplined','reliable','methodical','meticulous'], delta: { C: 0.18 } },
  { words: ['careless','impulsive','disorganised','sloppy'], delta: { C: -0.18 } },
  { words: ['outgoing','energetic','sociable','assertive','talkative'], delta: { E: 0.18 } },
  { words: ['quiet','reserved','solitary','withdrawn'], delta: { E: -0.18 } },
  { words: ['kind','warm','empathic','gentle','compassionate'], delta: { A: 0.18 } },
  { words: ['cold','harsh','cruel','ruthless','callous'], delta: { A: -0.18 } },
  { words: ['anxious','nervous','melancholy','moody','fearful','brooding'], delta: { N: 0.18 }, tone: 'melancholy' },
  { words: ['calm','steady','stable','grounded','resilient'], delta: { N: -0.18 } },
];

function clamp01(x: number): number { return Math.max(0, Math.min(1, x)); }

export class CharacterTextInverter implements Inverter<{ text: string }> {
  readonly id = 'character.text-cues-v1';
  readonly domain = 'character';
  accepts(a: { text: string }): boolean { return typeof a?.text === 'string' && a.text.length >= 8; }
  async invert(a: { text: string }): Promise<InversionReport> {
    const start = kernelNow();
    const lower = a.text.toLowerCase();
    let O = 0.5, C = 0.5, E = 0.5, A = 0.5, N = 0.5;
    let cueCount = 0;
    let tone: string | undefined;
    for (const cue of CUES) {
      for (const w of cue.words) {
        if (lower.includes(w)) {
          O += cue.delta.O ?? 0; C += cue.delta.C ?? 0;
          E += cue.delta.E ?? 0; A += cue.delta.A ?? 0;
          N += cue.delta.N ?? 0;
          if (cue.tone) tone = cue.tone;
          cueCount++;
        }
      }
    }
    const conf = Math.min(0.9, 0.35 + 0.08 * cueCount);
    const genes: InvertedGene[] = [
      { path: 'persona.bigFive.openness',          value: clamp01(O), confidence: conf, level: confidenceLevel(conf), note: `${cueCount} lexical cues` },
      { path: 'persona.bigFive.conscientiousness', value: clamp01(C), confidence: conf, level: confidenceLevel(conf) },
      { path: 'persona.bigFive.extraversion',      value: clamp01(E), confidence: conf, level: confidenceLevel(conf) },
      { path: 'persona.bigFive.agreeableness',     value: clamp01(A), confidence: conf, level: confidenceLevel(conf) },
      { path: 'persona.bigFive.neuroticism',       value: clamp01(N), confidence: conf, level: confidenceLevel(conf) },
    ];
    if (tone) genes.push({ path: 'persona.tone', value: tone, confidence: 0.6, level: confidenceLevel(0.6), note: 'cue-derived' });
    const residuals: InversionResidual[] = [];
    if (cueCount === 0) residuals.push({ feature: 'no-personality-cues', reason: 'low-confidence', raw: { sample: a.text.slice(0, 80) } });
    const overall = genes.filter((g) => g.confidence >= 0.6).reduce((s, g) => s + g.confidence, 0) / Math.max(1, genes.filter((g) => g.confidence >= 0.6).length);
    return { domain: this.domain, inverterId: this.id, artifactBytes: a.text.length, genes, residuals, overallConfidence: overall, elapsedMs: kernelNow() - start };
  }
}
