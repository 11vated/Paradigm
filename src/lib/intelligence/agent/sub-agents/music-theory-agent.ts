/**
 * MusicTheoryAgent
 *
 * Maps the 12-D adjective vector to musical gene values:
 *   - key (C, D, E, F, G, A, B + flats)
 *   - mode (major, minor, dorian, phrygian, lydian, mixolydian, aeolian, locrian)
 *   - tempo (BPM)
 *   - timeSignature (4/4, 3/4, 6/8, 7/8, 5/4)
 *   - instrumentation primary class
 *   - dynamics (pp, p, mf, f, ff)
 *   - harmonic.density (chords per bar)
 *
 * Reference mapping documented in PAradigm-reference/intelligence/
 * adjective-normalization.md ("mood_to_key" / "mood_to_tempo").
 */

import type { SubAgentInput, SubAgentOutput } from '../types';
import { BaseSubAgent, emit, intentVector, mapTo, projectAxis } from './base';

const KEYS = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'] as const;
const MODES = ['ionian', 'dorian', 'phrygian', 'lydian', 'mixolydian', 'aeolian', 'locrian'] as const;
const TIME_SIGS = ['4/4', '3/4', '6/8', '7/8', '5/4', '12/8'] as const;
const INSTRUMENTS = [
  'piano', 'acoustic-guitar', 'electric-guitar', 'strings', 'brass',
  'woodwinds', 'synth-pad', 'synth-lead', 'drums-acoustic', 'drums-electronic',
  'choir', 'organ', 'harp', 'bells', 'orchestra-full',
] as const;

export class MusicTheoryAgent extends BaseSubAgent {
  readonly id = 'music-theory';
  readonly domain = 'music';

  shouldRun(intent: { domains: string[] }): boolean {
    return ['music', 'audio', 'song', 'theme', 'soundtrack', 'all'].some((d) =>
      intent.domains.includes(d),
    );
  }

  async run(input: SubAgentInput): Promise<SubAgentOutput> {
    const vec = intentVector(input.intent.adjectives);
    const valence = projectAxis(vec, 'valence');
    const arousal = projectAxis(vec, 'arousal');
    const warmth = projectAxis(vec, 'warmth');
    const brightness = projectAxis(vec, 'brightness');
    const density = projectAxis(vec, 'density');
    const hardness = projectAxis(vec, 'hardness');
    const novelty = projectAxis(vec, 'novelty');
    const organic = projectAxis(vec, 'organic');

    // ── Key: brightness/warmth drive position on the circle of fifths ──
    // Bright + warm → flat keys (F, Bb, Eb) feel warm
    // Bright + cold → sharp keys (G, D, A, E) feel bright/clean
    // Dark → minor keys clustered on the relative side
    const keyIdx = Math.round(mapTo(brightness, 0, KEYS.length - 1));
    const key = KEYS[Math.max(0, Math.min(KEYS.length - 1, keyIdx))];

    // ── Mode: valence × novelty × hardness ──
    let mode: typeof MODES[number];
    if (valence > 0.3 && novelty < 0.3) mode = 'ionian';
    else if (valence < -0.3 && novelty < 0.3) mode = 'aeolian';
    else if (novelty > 0.5 && warmth > 0) mode = 'lydian';
    else if (novelty > 0.5 && warmth < 0) mode = 'phrygian';
    else if (hardness > 0.4) mode = 'mixolydian';
    else if (warmth > 0.3 && valence > 0) mode = 'dorian';
    else if (valence < -0.5 && arousal > 0.3) mode = 'locrian';
    else mode = valence > 0 ? 'ionian' : 'aeolian';

    // ── Tempo: arousal + speed-axis directly ──
    const speed = projectAxis(vec, 'speed');
    const tempo = Math.round(mapTo((arousal + speed) / 2, 50, 180));

    // ── Time signature: novelty drives oddness ──
    let timeSig: typeof TIME_SIGS[number];
    if (novelty > 0.6) timeSig = arousal > 0.5 ? '7/8' : '5/4';
    else if (warmth > 0.4 && valence > 0.4) timeSig = '6/8';
    else if (valence > 0 && arousal < 0.3) timeSig = '3/4';
    else timeSig = '4/4';

    // ── Instrumentation: organic vs synthetic ──
    let instrumentPool: typeof INSTRUMENTS[number][];
    if (organic > 0.4) {
      instrumentPool = ['piano', 'acoustic-guitar', 'strings', 'choir', 'harp', 'organ'];
    } else if (organic < -0.3) {
      instrumentPool = ['synth-pad', 'synth-lead', 'drums-electronic', 'electric-guitar'];
    } else {
      instrumentPool = ['piano', 'electric-guitar', 'strings', 'synth-pad'];
    }
    // Prefer brighter instruments for bright mood
    const instrument = instrumentPool[Math.floor(mapTo(brightness, 0, instrumentPool.length - 0.01))];

    // ── Dynamics ──
    const dynamicIdx = Math.round(mapTo(arousal, 0, 4));
    const dynamics = (['pp', 'p', 'mf', 'f', 'ff'] as const)[Math.max(0, Math.min(4, dynamicIdx))];

    // ── Harmonic density ──
    const harmonicDensity = Math.max(0.05, Math.min(1, mapTo(density, 0.1, 0.9)));

    return {
      produced: [
        emit(this.id, 'music.key', key, 0.7, 'brightness → circle of fifths'),
        emit(this.id, 'music.mode', mode, 0.8, 'valence × novelty × hardness'),
        emit(this.id, 'music.tempo', tempo, 0.9, 'arousal+speed → BPM'),
        emit(this.id, 'music.timeSignature', timeSig, 0.7, 'novelty drives oddness'),
        emit(this.id, 'music.instrument.primary', instrument, 0.7, 'organic axis + brightness'),
        emit(this.id, 'music.dynamics', dynamics, 0.75, 'arousal → pp..ff'),
        emit(this.id, 'music.harmonic.density', harmonicDensity, 0.7, 'density axis'),
      ],
    };
  }
}
