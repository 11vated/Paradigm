/**
 * Music Generator — produces actual WAV files with melodic synthesis
 * Creates music based on tempo, key, scale, and melody genes
 */

import * as wav from 'wav';
import * as fs from 'fs';
import * as path from 'path';
import type { Seed } from '../engines';

interface MusicParams {
  tempo: number;
  key: string;
  scale: string;
  melody: number[];
  timbre: { warmth: number; brightness: number };
  duration: number;
  sampleRate: number;
  quality: 'low' | 'medium' | 'high' | 'photorealistic';
}

export async function generateMusic(seed: Seed, outputPath: string): Promise<{ filePath: string; duration: number; sampleRate: number }> {
  const params = extractParams(seed);
  const { sampleRate } = params;
  const durationSamples = Math.floor(params.duration * sampleRate);

  // Generate audio buffer
  const buffer = Buffer.alloc(durationSamples * 2); // 16-bit = 2 bytes per sample
  const channels = 1;

  // Convert melody notes to frequencies
  const noteFreqs = params.melody.map(note => midiToFreq(note));

  // Generate waveform with ADSR envelope
  for (let i = 0; i < durationSamples; i++) {
    const time = i / sampleRate;
    const beatDuration = 60 / params.tempo;
    const beatIndex = Math.floor(time / beatDuration) % noteFreqs.length;
    const freq = noteFreqs[beatIndex] || 440;

    // Generate waveform with timbre characteristics
    const envelope = applyADSR(time, beatDuration, params.timbre);
    const wave = generateWaveform(freq, time, params.timbre);

    // Apply envelope and convert to 16-bit PCM
    const value = wave * envelope * 0.5;
    const sample = Math.max(-1, Math.min(1, value)) * 32767;
    buffer.writeInt16LE(Math.floor(sample), i * 2);
  }

  // Ensure output directory exists
  const dir = path.dirname(outputPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  // Write WAV file
  return new Promise((resolve, reject) => {
    const writer = new wav.FileWriter(outputPath, {
      channels,
      sampleRate,
      bitDepth: 16
    });

    writer.write(buffer);
    writer.end();

    writer.on('finish', () => resolve({ filePath: outputPath, duration: params.duration, sampleRate }));
    writer.on('error', reject);
  });
}

function extractParams(seed: Seed): MusicParams {
  const quality = seed.genes?.quality?.value || 'medium';
  const sampleRates: Record<string, number> = {
    low: 22050,
    medium: 44100,
    high: 48000,
    photorealistic: 96000
  };

  let tempo = seed.genes?.tempo?.value || 0.5;
  if (typeof tempo === 'number' && tempo <= 1) tempo = 60 + tempo * 140;

  return {
    tempo: typeof tempo === 'number' ? tempo : 120,
    key: seed.genes?.key?.value || 'C',
    scale: seed.genes?.scale?.value || 'major',
    melody: (() => {
      const m = seed.genes?.melody?.value || [];
      return Array.isArray(m) ? m.slice(0, 32) : [];
    })(),
    timbre: (() => {
      const t = seed.genes?.timbre?.value || {};
      return {
        warmth: t.warmth || 0.5,
        brightness: t.brightness || 0.5
      };
    })(),
    duration: Math.max(1, Math.min(seed.genes?.duration?.value || 10, 60)),
    sampleRate: sampleRates[quality] || 44100,
    quality: ['low', 'medium', 'high', 'photorealistic'].includes(quality) ? quality : 'medium'
  };
}

function midiToFreq(midiNote: number): number {
  if (typeof midiNote === 'string') {
    const noteMap: Record<string, number> = {
      'C': 60, 'C#': 61, 'D': 62, 'D#': 63, 'E': 64, 'F': 65,
      'F#': 66, 'G': 67, 'G#': 68, 'A': 69, 'A#': 70, 'B': 71
    };
    return 440 * Math.pow(2, ((noteMap[midiNote] || 60) - 69) / 12);
  }
  return 440 * Math.pow(2, (midiNote - 69) / 12);
}

function applyADSR(time: number, beatDuration: number, timbre: { warmth: number; brightness: number }): number {
  const attack = 0.01 + (1 - timbre.warmth) * 0.1;
  const decay = 0.1 + timbre.warmth * 0.3;
  const sustain = 0.5 + timbre.brightness * 0.3;
  const release = 0.05 + (1 - timbre.brightness) * 0.2;

  const beatTime = time % beatDuration;

  if (beatTime < attack) return beatTime / attack;
  if (beatTime < attack + decay) return 1.0 - (1.0 - sustain) * ((beatTime - attack) / decay);
  if (beatTime < beatDuration - release) return sustain;
  return sustain * (1 - (beatTime - (beatDuration - release)) / release);
}

function generateWaveform(freq: number, time: number, timbre: { warmth: number; brightness: number }): number {
  // Mix sine, square, and sawtooth waves based on timbre
  const sine = Math.sin(2 * Math.PI * freq * time);
  const square = Math.sign(sine);
  const sawtooth = 2 * (freq * time % 1) - 1;

  const warmth = timbre.warmth;
  const brightness = timbre.brightness;

  return sine * warmth + square * (1 - brightness) + sawtooth * brightness;
}
