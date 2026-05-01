/**
 * Audio Generator — produces actual WAV files from seed genes
 * Generates audio based on tempo, key, timbre, and melody genes
 */

import * as wav from 'wav';
import * as fs from 'fs';
import * as path from 'path';
import type { Seed } from '../engines';

interface AudioParams {
  tempo: number;
  key: string;
  scale: string;
  timbre: { warmth: number; brightness: number; attack: number; decay: number };
  melody: number[];
  duration: number;
  sampleRate: number;
  quality: 'low' | 'medium' | 'high' | 'photorealistic';
}

export function generateAudio(seed: Seed, outputPath: string): Promise<{ filePath: string; duration: number; sampleRate: number }> {
  const params = extractParams(seed);
  const { sampleRate } = params;
  const durationSamples = Math.floor(params.duration * sampleRate);
  
  // Generate audio buffer
  const buffer = Buffer.alloc(durationSamples * 2); // 16-bit = 2 bytes per sample
  const channels = 1;
  
  // Convert melody notes to frequencies
  const noteFreqs = params.melody.map(note => midiToFreq(note));
  
  // Generate waveform
  for (let i = 0; i < durationSamples; i++) {
    const time = i / sampleRate;
    const beatDuration = 60 / params.tempo;
    const beatIndex = Math.floor(time / beatDuration) % noteFreqs.length;
    const freq = noteFreqs[beatIndex] || 440;
    
    // Generate sine wave with timbre envelope
    const envelope = applyEnvelope(time, params.timbre);
    const value = Math.sin(2 * Math.PI * freq * time) * envelope * 0.5;
    
    // Convert to 16-bit PCM
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

function extractParams(seed: Seed): AudioParams {
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
    timbre: (() => {
      const t = seed.genes?.timbre?.value || {};
      return {
        warmth: t.warmth || 0.5,
        brightness: t.brightness || 0.5,
        attack: t.attack || 0.01,
        decay: t.decay || 0.5
      };
    })(),
    melody: (() => {
      const m = seed.genes?.melody?.value || [];
      return Array.isArray(m) ? m.slice(0, 16) : [];
    })(),
    duration: Math.max(1, Math.min(seed.genes?.duration?.value || 5, 30)),
    sampleRate: sampleRates[quality] || 44100,
    quality: ['low', 'medium', 'high', 'photorealistic'].includes(quality) ? quality : 'medium'
  };
}

function midiToFreq(midiNote: number): number {
  // Handle different input types
  if (typeof midiNote === 'string') {
    const noteMap: Record<string, number> = {
      'C': 60, 'C#': 61, 'D': 62, 'D#': 63, 'E': 64, 'F': 65,
      'F#': 66, 'G': 67, 'G#': 68, 'A': 69, 'A#': 70, 'B': 71
    };
    return 440 * Math.pow(2, ((noteMap[midiNote] || 60) - 69) / 12);
  }
  return 440 * Math.pow(2, (midiNote - 69) / 12);
}

function applyEnvelope(time: number, timbre: { attack: number; decay: number }): number {
  const { attack, decay } = timbre;
  if (time < attack) return time / attack;
  if (time < attack + decay) return 1.0;
  return Math.exp(-(time - attack - decay) / (decay * 2));
}
