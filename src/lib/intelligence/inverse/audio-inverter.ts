/**
 * Audio inverter — recover (tempo, key/mode, energy, duration) from a
 * PCM-16 WAV buffer using the analysis helpers from kernel/quality.
 */
import { kernelNow } from '../../kernel/clock';
import { analyzePcm } from '../../kernel/quality/audio-features';
import { confidenceLevel } from './types';
import type { Inverter, InversionReport, InvertedGene, InversionResidual } from './types';

const PITCH_CLASS_NAMES = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'] as const;

function estimateKey(spectralCentroidHz: number): { key: string; confidence: number } {
  // Map a centroid frequency to a pitch class via log2 distance from A4 (440Hz).
  // Cheap and wrong in detail, but stable + deterministic + lossless for round-trip.
  const semitonesFromA4 = 12 * Math.log2(Math.max(spectralCentroidHz, 1) / 440);
  const pitchClass = ((Math.round(semitonesFromA4) % 12) + 12) % 12;
  return { key: PITCH_CLASS_NAMES[pitchClass], confidence: 0.45 }; // low confidence — naive estimator
}

function estimateTempoBpm(zeroCrossRate: number, sampleRate: number): { bpm: number; confidence: number } {
  // ZC rate × sample rate gives us a coarse periodic-event frequency.
  // Most musical content lives in 60–180 BPM, so we map ZC density into that band.
  const hz = zeroCrossRate * sampleRate;
  // Heuristic: musical tempo correlates loosely with onset density. Compress.
  const bpm = Math.max(40, Math.min(220, Math.round(60 + hz / 50)));
  return { bpm, confidence: 0.35 }; // guess-level — beat tracking deferred
}

export class WavAudioInverter implements Inverter<{ wavBuffer: Buffer }> {
  readonly id = 'audio.wav-features-v1';
  readonly domain = 'music';
  accepts(artifact: { wavBuffer: Buffer }): boolean {
    const b = artifact?.wavBuffer;
    return Buffer.isBuffer(b) && b.length >= 44 && b.slice(0, 4).toString('ascii') === 'RIFF';
  }
  async invert(artifact: { wavBuffer: Buffer }): Promise<InversionReport> {
    const start = kernelNow();
    const stats = analyzePcm(artifact.wavBuffer);
    const genes: InvertedGene[] = [];
    const residuals: InversionResidual[] = [];
    if (!stats) {
      residuals.push({ feature: 'pcm-data', reason: 'unsupported', raw: { bytes: artifact.wavBuffer.length } });
      return { domain: this.domain, inverterId: this.id, artifactBytes: artifact.wavBuffer.length, genes, residuals, overallConfidence: 0, elapsedMs: kernelNow() - start };
    }
    const duration = stats.samples / stats.sampleRate;
    const energy = Math.min(1, stats.rms * 4);
    const key = estimateKey(stats.spectralCentroidHz);
    const tempo = estimateTempoBpm(stats.zeroCrossRate, stats.sampleRate);
    genes.push({ path: 'music.duration',   value: duration,        confidence: 0.99, level: confidenceLevel(0.99), note: `samples/sampleRate` });
    genes.push({ path: 'music.sampleRate', value: stats.sampleRate, confidence: 1.0, level: confidenceLevel(1.0), note: 'from WAV header' });
    genes.push({ path: 'music.channels',   value: stats.channels,  confidence: 1.0, level: confidenceLevel(1.0), note: 'from WAV header' });
    genes.push({ path: 'music.energy',     value: energy,          confidence: 0.85, level: confidenceLevel(0.85), note: `rms=${stats.rms.toFixed(3)}` });
    genes.push({ path: 'music.tempo',      value: tempo.bpm,       confidence: tempo.confidence, level: confidenceLevel(tempo.confidence), note: 'heuristic zero-cross density' });
    genes.push({ path: 'music.key',        value: key.key,         confidence: key.confidence, level: confidenceLevel(key.confidence), note: 'spectral-centroid mapping (coarse)' });
    if (Math.abs(stats.stereoBalance) > 0.05) {
      genes.push({ path: 'music.stereoBalance', value: stats.stereoBalance, confidence: 0.9, level: confidenceLevel(0.9), note: 'L vs R energy' });
    }
    if (stats.silenceRatio > 0.5) residuals.push({ feature: 'silence', reason: 'no-gene', raw: { ratio: stats.silenceRatio } });
    if (stats.peakAmp > 0.99) residuals.push({ feature: 'clipping', reason: 'no-gene', raw: { peak: stats.peakAmp } });
    const overall = genes.filter((g) => g.confidence >= 0.6).reduce((s, g) => s + g.confidence, 0) / Math.max(1, genes.filter((g) => g.confidence >= 0.6).length);
    return { domain: this.domain, inverterId: this.id, artifactBytes: artifact.wavBuffer.length, genes, residuals, overallConfidence: overall, elapsedMs: kernelNow() - start };
  }
}
