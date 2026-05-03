/**
 * Music Generator — produces WAV files with natural harmonics
 * Enhanced with alternative tuning systems (non-440Hz)
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
  tuning: string;
  duration: number;
  sampleRate: number;
  quality: 'low' | 'medium' | 'high' | 'photorealistic';
}

export async function generateMusicEnhanced(seed: Seed, outputPath: string): Promise<{ filePath: string; duration: number; sampleRate: number }> {
  const params = extractParams(seed);
  const { sampleRate } = params;
  const durationSamples = Math.floor(params.duration * sampleRate);

  // Generate audio buffer (stereo for enhanced)
  const buffer = Buffer.alloc(durationSamples * 4); // 16-bit stereo = 4 bytes per sample
  const channels = 2;

  // Convert melody notes to frequencies using alternative tuning
  const noteFreqs = params.melody.map(note => midiToFreq(note, params.tuning));

  // Generate waveform with ADSR envelope and natural harmonics
  for (let i = 0; i < durationSamples; i++) {
    const time = i / sampleRate;
    const beatDuration = 60 / params.tempo;
    const beatIndex = Math.floor(time / beatDuration) % noteFreqs.length;
    const freq = noteFreqs[beatIndex] || getTuningBase(params.tuning);

    // Generate waveform with timbre characteristics and harmonics
    const envelope = applyADSR(time, beatDuration, params.timbre);
    const wave = generateWaveformWithHarmonics(freq, time, params.timbre, params.tuning);

    // Apply envelope and convert to 16-bit PCM (stereo)
    const value = wave * envelope * 0.3;
    const sample = Math.max(-1, Math.min(1, value)) * 32767;

    // Write stereo samples
    buffer.writeInt16LE(Math.floor(sample), i * 4);
    buffer.writeInt16LE(Math.floor(sample * 0.9), i * 4 + 2); // Right channel slightly quieter
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

function midiToFreq(midiNote: number, tuning: string): number {
  const baseFreq = getTuningBase(tuning);

  if (typeof midiNote === 'string') {
    const noteMap: Record<string, number> = {
      'C': 0, 'C#': 1, 'D': 2, 'D#': 3, 'E': 4, 'F': 5,
      'F#': 6, 'G': 7, 'G#': 8, 'A': 9, 'A#': 10, 'B': 11
    };
    const noteIndex = noteMap[midiNote] || 0;
    return baseFreq * Math.pow(2, noteIndex / 12);
  }

  // Convert MIDI note to frequency using tuning system
  return baseFreq * Math.pow(2, (midiNote - 69) / 12);
}

function getTuningBase(tuning: string): number {
  const tunings: Record<string, number> = {
    'a440': 440.0,        // Standard modern tuning
    'a432': 432.0,        // "Verdi A" — natural tuning
    'a444': 444.0,        // "Pythagorean" tuning
    'just_intonation': 440.0 * (16/15), // Just intonation C
    'pythagorean': 440.0 * (3/2),     // Pythagorean perfect 5th
    'harter_frey': 443.0,  // Barter Frey tuning
    'ancient': 432.0 * (81/80)       // Ancient tuning with schisma
  };

  return tunings[tuning] || 432.0; // Default to 432Hz (natural)
}

function applyADSR(time: number, beatDuration: number, timbre: { warmth: number; brightness: number }): number {
  const attack = 0.005 + (1 - timbre.warmth) * 0.05;
  const decay = 0.05 + timbre.warmth * 0.2;
  const sustain = 0.4 + timbre.brightness * 0.4;
  const release = 0.03 + (1 - timbre.brightness) * 0.15;

  const beatTime = time % beatDuration;

  if (beatTime < attack) return beatTime / attack;
  if (beatTime < attack + decay) return 1.0 - (1.0 - sustain) * ((beatTime - attack) / decay);
  if (beatTime < beatDuration - release) return sustain;
  return sustain * (1 - (beatTime - (beatDuration - release)) / release);
}

function generateWaveformWithHarmonics(freq: number, time: number, timbre: { warmth: number; brightness: number }, tuning: string): number {
  // Generate base waveform
  const sine = Math.sin(2 * Math.PI * freq * time);

  // Add natural harmonics based on tuning system
  let wave = sine;

  if (tuning !== 'a440') {
    // Add harmonics for richer, more natural sound
    const harmonic1 = Math.sin(2 * Math.PI * freq * 2 * time) * 0.5;  // Octave
    const harmonic2 = Math.sin(2 * Math.PI * freq * 3 * time) * 0.3;  // Perfect 5th
    const harmonic3 = Math.sin(2 * Math.PI * freq * 5 * time) * 0.2;  // Major 3rd

    wave = sine * timbre.warmth +
           (sine + harmonic1 + harmonic2 + harmonic3) * (1 - timbre.warmth);

    // Add slight detuning for organic feel (not perfect 440Hz) — deterministic via RNG
    const detune = 1 + (rng.nextF64() -0.5) * 0.02;
    wave = Math.sin(2 * Math.PI * freq * detune * time) * 0.7 +
           Math.sin(2 * Math.PI * freq * detune * 2 * time) * 0.3;
  }

  // Mix in other waveforms based on timbre
  const square = Math.sign(sine);
  const sawtooth = 2 * (freq * time % 1) - 1;

  return wave * timbre.warmth +
         square * (1 - timbre.brightness) * 0.3 +
         sawtooth * timbre.brightness * 0.3;
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
    tuning: seed.genes?.tuning?.value || 'a432', // Default to 432Hz (non-440)
    duration: Math.max(1, Math.min(seed.genes?.duration?.value || 10, 60)),
    sampleRate: sampleRates[quality] || 44100,
    quality: ['low', 'medium', 'high', 'photorealistic'].includes(quality) ? quality : 'medium'
  };
}
