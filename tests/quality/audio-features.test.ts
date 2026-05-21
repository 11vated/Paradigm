/**
 * Audio feature extraction tests — synthesises tiny WAVs in-memory.
 */
import { describe, it, expect } from 'vitest';
import { analyzePcm, audioQualityAxes, parseWavHeader } from '../../src/lib/kernel/quality/audio-features';

function makeWav(durationSec: number, sampleRate: number, channels: number, gen: (t: number) => number): Buffer {
  const samples = Math.floor(durationSec * sampleRate);
  const dataSize = samples * channels * 2;
  const buf = Buffer.alloc(44 + dataSize);
  buf.write('RIFF', 0);
  buf.writeUInt32LE(36 + dataSize, 4);
  buf.write('WAVE', 8);
  buf.write('fmt ', 12);
  buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20);             // PCM
  buf.writeUInt16LE(channels, 22);
  buf.writeUInt32LE(sampleRate, 24);
  buf.writeUInt32LE(sampleRate * channels * 2, 28);
  buf.writeUInt16LE(channels * 2, 32);
  buf.writeUInt16LE(16, 34);
  buf.write('data', 36);
  buf.writeUInt32LE(dataSize, 40);
  for (let i = 0; i < samples; i++) {
    const t = i / sampleRate;
    const v = Math.max(-1, Math.min(1, gen(t)));
    const s16 = Math.round(v * 32767);
    for (let c = 0; c < channels; c++) buf.writeInt16LE(s16, 44 + (i * channels + c) * 2);
  }
  return buf;
}

describe('audio-features', () => {
  it('parseWavHeader reads a synthetic PCM-16 mono header', () => {
    const wav = makeWav(0.5, 44100, 1, () => 0);
    const h = parseWavHeader(wav);
    expect(h).not.toBeNull();
    expect(h!.sampleRate).toBe(44100);
    expect(h!.channels).toBe(1);
    expect(h!.bitsPerSample).toBe(16);
  });

  it('analyzePcm reports near-zero RMS on silence', () => {
    const wav = makeWav(0.5, 22050, 1, () => 0);
    const s = analyzePcm(wav)!;
    expect(s.rms).toBeLessThan(0.001);
    expect(s.silenceRatio).toBeGreaterThan(0.99);
  });

  it('analyzePcm reports a 440 Hz sine close to expected RMS + centroid', () => {
    const wav = makeWav(1.0, 22050, 1, (t) => Math.sin(2 * Math.PI * 440 * t) * 0.5);
    const s = analyzePcm(wav)!;
    expect(s.rms).toBeGreaterThan(0.3);
    expect(s.rms).toBeLessThan(0.45);
    expect(s.silenceRatio).toBeLessThan(0.05);
    // ZC rate of a 440 Hz sine ≈ 2*440/22050 ≈ 0.04
    expect(s.zeroCrossRate).toBeGreaterThan(0.03);
    expect(s.zeroCrossRate).toBeLessThan(0.06);
    // spectralCentroidHz ≈ zcr * Nyquist ≈ 440 Hz
    expect(s.spectralCentroidHz).toBeGreaterThan(380);
    expect(s.spectralCentroidHz).toBeLessThan(500);
  });

  it('audioQualityAxes maps a healthy sine to high scores across axes', () => {
    const wav = makeWav(2.0, 22050, 1, (t) => Math.sin(2 * Math.PI * 440 * t) * 0.4);
    const ax = audioQualityAxes(analyzePcm(wav)!);
    expect(ax.audible).toBe(1);
    expect(ax.notSilent).toBeGreaterThan(0.9);
    expect(ax.notClipped).toBe(1);
    expect(ax.minimumDuration).toBe(1);
  });

  it('audioQualityAxes marks silence as not-audible / silent', () => {
    const wav = makeWav(2.0, 22050, 1, () => 0);
    const ax = audioQualityAxes(analyzePcm(wav)!);
    expect(ax.audible).toBeLessThan(0.05);
    expect(ax.notSilent).toBeLessThan(0.05);
  });
});
