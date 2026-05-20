import { describe, it, expect } from 'vitest';
import { genePitch, geneRate, geneVolume, pickVoice, isSpeechAvailable } from '@/lib/friend/voice';
import type { VoiceGene } from '@/lib/friend';

const mk = (over: Partial<VoiceGene> = {}): VoiceGene => ({
  pitch: 180, inflection: 0.5, tempo: 130, breathiness: 0.3, warmth: 0.6,
  formants: [500, 1500, 2500, 3500, 4500],
  ...over,
} as VoiceGene);

describe('Friend voice helpers', () => {
  it('genePitch clamps and scales', () => {
    expect(genePitch(mk({ pitch: 80 }))).toBeCloseTo(0.5);
    expect(genePitch(mk({ pitch: 300 }))).toBeCloseTo(2.0);
    expect(genePitch(mk({ pitch: 1 }))).toBeCloseTo(0.5);
  });

  it('geneRate scales tempo to SpeechSynthesis rate', () => {
    expect(geneRate(mk({ tempo: 130 }))).toBeCloseTo(1.0);
    expect(geneRate(mk({ tempo: 65 }))).toBeCloseTo(0.5);
  });

  it('geneVolume reduces for breathy voices', () => {
    expect(geneVolume(mk({ breathiness: 0 }))).toBe(1);
    expect(geneVolume(mk({ breathiness: 1 }))).toBeCloseTo(0.6);
  });

  it('pickVoice prefers high pitch → female-like name when available', () => {
    const voices: any = [
      { name: 'Daniel', lang: 'en-GB' },
      { name: 'Samantha', lang: 'en-US' },
      { name: 'Junior', lang: 'fr-FR' },
    ];
    const high = pickVoice(voices, mk({ pitch: 220 }));
    expect(high?.name).toBe('Samantha');
    const low = pickVoice(voices, mk({ pitch: 100 }));
    expect(low?.name).toBe('Daniel');
  });

  it('isSpeechAvailable is false in jsdom-less / Node test env', () => {
    expect(isSpeechAvailable()).toBe(false);
  });
});
