/**
 * @deprecated Phase 2 Canonical Collapse (Doctrine v2)
 * Sibling. Use primary music.ts + music-contract.ts only.
 * Removal after golden regeneration.
 *
 * Music Generator — produces WAV files with natural harmonics (legacy enhanced)
 * Enhanced with alternative tuning systems (non-440Hz)
 */

import * as fs from 'fs';
import * as path from 'path';
import type { Seed } from '../engines';
import { rngFromHash } from '../rng';
import { GsplModuleResolver } from '../gspl-module-resolver.js';

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

export async function generateMusicEnhanced(seed: Seed, outputPath: string): Promise<{ filePath: string; duration: number; sampleRate: number; stems?: string[]; gsplSchema?: string }> {
  // === GSPL Canon Integration (music schema) — load BEFORE using extractParams ===
  let gsplSchemaLoaded: string | undefined;
  let musicConstraints: any = null;
  try {
    // Load schema directly for constraints (resolver used for flag consistency)
    const schemaContent = await import('fs/promises').then(fs => 
      fs.readFile('data/commons/libraries/music.gspl', 'utf8').catch(() => null));
    if (schemaContent) {
      gsplSchemaLoaded = 'music.gspl';
      musicConstraints = parseMusicSchemaConstraints(schemaContent);
    }
  } catch (e) {
    // Non-fatal
  }

  const params = extractParams(seed, musicConstraints);
  const { sampleRate } = params;
  const durationSamples = Math.floor(params.duration * sampleRate);

  // Create RNG from seed
  const rng = rngFromHash(seed.$hash ?? 'default');

  // NOTE (verify-sweep): New multi-stem outputs (drums, bass, melody, harmony + mix WAVs) require golden hash expansion.
  // Run `npm run golden:write -- --tier flagship` (or targeted for music) after this change to lock determinism for the new stem files.

  // === Multi-stem generation (real elevation toward 5+ stems) ===
  // Use forked sub-RNGs for perfect determinism per stem
  const stemRNG = {
    drums: rng.fork ? rng.fork('drums') : rng,
    bass:  rng.fork ? rng.fork('bass')  : rng,
    melody: rng.fork ? rng.fork('melody') : rng,
    harmony: rng.fork ? rng.fork('harmony') : rng,
  };

  const channels = 2;
  const makeBuffer = () => Buffer.alloc(durationSamples * 4);

  const drumBuf = makeBuffer();
  const bassBuf = makeBuffer();
  const melodyBuf = makeBuffer();
  const harmonyBuf = makeBuffer();

  // Convert melody notes
  const noteFreqs = params.melody.map(note => midiToFreq(note, params.tuning));
  const baseFreq = getTuningBase(params.tuning);

  for (let i = 0; i < durationSamples; i++) {
    const time = i / sampleRate;
    const beatDuration = 60 / params.tempo;
    const beatIndex = Math.floor(time / beatDuration) % Math.max(1, noteFreqs.length);
    const freq = noteFreqs[beatIndex] || baseFreq;

    const env = applyADSR(time, beatDuration, params.timbre);

    // === Drums (noise + low sine, substream) ===
    const drumNoise = (stemRNG.drums.nextF64 ? stemRNG.drums.nextF64() : rng.nextF64()) * 2 - 1;
    const drumSine = Math.sin(2 * Math.PI * 60 * time) * 0.6;
    const drum = (drumNoise * 0.7 + drumSine) * env * 0.85;
    const dSample = Math.max(-1, Math.min(1, drum)) * 32767;
    drumBuf.writeInt16LE(Math.floor(dSample), i * 4);
    drumBuf.writeInt16LE(Math.floor(dSample * 0.85), i * 4 + 2);

    // === Bass (low sine + subharmonics) ===
    const bassFreq = freq * 0.5;
    const bassWave = Math.sin(2 * Math.PI * bassFreq * time) * 0.9 +
                     Math.sin(2 * Math.PI * bassFreq * 2 * time) * 0.3;
    const bassEnv = Math.max(0, env - 0.1);
    const bVal = bassWave * bassEnv * 0.7;
    const bSample = Math.max(-1, Math.min(1, bVal)) * 32767;
    bassBuf.writeInt16LE(Math.floor(bSample), i * 4);
    bassBuf.writeInt16LE(Math.floor(bSample * 0.9), i * 4 + 2);

    // === Melody (main voice with harmonics) ===
    const melWave = generateWaveformWithHarmonics(freq, time, params.timbre, params.tuning, stemRNG.melody);
    const mVal = melWave * env * 0.55;
    const mSample = Math.max(-1, Math.min(1, mVal)) * 32767;
    melodyBuf.writeInt16LE(Math.floor(mSample), i * 4);
    melodyBuf.writeInt16LE(Math.floor(mSample * 0.88), i * 4 + 2);

    // === Harmony / pads (detuned voices) ===
    const harmFreq = freq * 1.5;
    const harmWave = generateWaveformWithHarmonics(harmFreq, time, { ...params.timbre, warmth: 0.7 }, params.tuning, stemRNG.harmony);
    const hVal = harmWave * env * 0.35;
    const hSample = Math.max(-1, Math.min(1, hVal)) * 32767;
    harmonyBuf.writeInt16LE(Math.floor(hSample), i * 4);
    harmonyBuf.writeInt16LE(Math.floor(hSample * 0.9), i * 4 + 2);
  }

  // Ensure output directory
  const dir = path.dirname(outputPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  const base = outputPath.replace(/\.[^/.]+$/, '');

  // Write 4 real stems + a simple mix
  const stemFiles: string[] = [];
  const writeStem = (buf: Buffer, suffix: string) => {
    const p = `${base}_${suffix}.wav`;
    fs.writeFileSync(p, pcm16ToWav(buf, channels, sampleRate));
    stemFiles.push(p);
  };

  writeStem(drumBuf, 'drums');
  writeStem(bassBuf, 'bass');
  writeStem(melodyBuf, 'melody');
  writeStem(harmonyBuf, 'harmony');

  // Simple mix (additive)
  const mixBuf = makeBuffer();
  for (let i = 0; i < durationSamples * 2; i++) {
    const d = drumBuf.readInt16LE(i * 2);
    const b = bassBuf.readInt16LE(i * 2);
    const m = melodyBuf.readInt16LE(i * 2);
    const h = harmonyBuf.readInt16LE(i * 2);
    let mixed = (d + b + m + h) / 2.8;
    mixed = Math.max(-32767, Math.min(32767, mixed));
    mixBuf.writeInt16LE(Math.floor(mixed), i * 2);
  }
  const mixPath = `${base}_mix.wav`;
  fs.writeFileSync(mixPath, pcm16ToWav(mixBuf, channels, sampleRate));
  stemFiles.push(mixPath);

  return { 
    filePath: mixPath, 
    duration: params.duration, 
    sampleRate,
    stems: stemFiles,
    gsplSchema: gsplSchemaLoaded
  } as any;
}

function pcm16ToWav(pcm: Buffer, channels: number, sampleRate: number): Buffer {
  const header = Buffer.alloc(44);
  const byteRate = sampleRate * channels * 2;
  const blockAlign = channels * 2;

  header.write('RIFF', 0);
  header.writeUInt32LE(36 + pcm.length, 4);
  header.write('WAVE', 8);
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(channels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(blockAlign, 32);
  header.writeUInt16LE(16, 34);
  header.write('data', 36);
  header.writeUInt32LE(pcm.length, 40);

  return Buffer.concat([header, pcm]);
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

function generateWaveformWithHarmonics(freq: number, time: number, timbre: { warmth: number; brightness: number }, tuning: string, rng: { nextF64: () => number }): number {
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

function extractParams(seed: Seed, constraints: any = null): MusicParams {
  const quality = (seed.genes?.quality?.value as string) || 'medium';
  const sampleRates: Record<string, number> = {
    low: 22050,
    medium: 44100,
    high: 48000,
    photorealistic: 96000
  };

  let tempo = (seed.genes?.tempo?.value as number) || 0.5;
  if (typeof tempo === 'number' && tempo <= 1) tempo = 60 + tempo * 140;

  // Apply schema constraints if loaded (deeper GSPL usage)
  const c = constraints || {};
  const applyScalar = (name: string, val: number, fallback: number) => {
    const range = c.scalars?.[name];
    if (range) return Math.max(range.min, Math.min(range.max, val ?? fallback));
    return val ?? fallback;
  };

  return {
    tempo: applyScalar('tempo', typeof tempo === 'number' ? tempo : 120, 120),
    key: (seed.genes?.key?.value as string) || 'C',
    scale: (seed.genes?.scale?.value as string) || 'major',
    melody: (() => {
      const m = seed.genes?.melody?.value || [];
      return Array.isArray(m) ? m.slice(0, 32) : [];
    })(),
    timbre: (() => {
      const t = seed.genes?.timbre?.value || {};
      return {
        warmth: applyScalar('warmth', t.warmth, 0.5),
        brightness: applyScalar('brightness', t.brightness, 0.5)
      };
    })(),
    tuning: (seed.genes?.tuning?.value as string) || 'a432',
    duration: applyScalar('duration', (seed.genes?.duration?.value as number) || 10, 10),
    sampleRate: sampleRates[quality] || 44100,
    quality: (['low', 'medium', 'high', 'photorealistic'].includes(quality) ? quality : 'medium') as 'low' | 'medium' | 'high' | 'photorealistic'
  };
}

/**
 * Lightweight parser for the music.gspl schema constraints.
 * Extracts scalar ranges and categorical options so the generator can enforce them.
 * This is the first real "consume the GSPL schema for validation" step.
 */
function parseMusicSchemaConstraints(schema: string): any {
  const constraints: any = { scalars: {}, categoricals: {} };

  // Simple regex extraction for the genes we defined
  const geneMatches = schema.matchAll(/gene\s+(\w+):\s*(scalar|categorical)\s*(?:in\s*(\[[^\]]+\]))?/g);

  for (const match of geneMatches) {
    const name = match[1];
    const type = match[2];
    const rangeStr = match[3];

    if (type === 'scalar' && rangeStr) {
      const nums = rangeStr.match(/[\d.]+/g);
      if (nums && nums.length >= 2) {
        constraints.scalars[name] = { min: parseFloat(nums[0]), max: parseFloat(nums[1]) };
      }
    } else if (type === 'categorical' && rangeStr) {
      const items = rangeStr.match(/"([^"]+)"|'([^']+)'/g);
      if (items) {
        constraints.categoricals[name] = items.map(s => s.replace(/['"]/g, ''));
      }
    }
  }

  return constraints;
}
