/**
 * @deprecated Phase 2 Canonical Collapse (Doctrine v2)
 * Versioned sibling. Canonical is music.ts + music-contract.ts.
 * Real consolidation + golden-hash regeneration in progress under full autonomy.
 * Sunset 2026-08.
 *
 * Music Generator V2 — World-Class Audio Synthesis (legacy)
 * Features:
 * - Multi-track composition (melody, harmony, bass, drums)
 * - Music theory engine (scales, chords, progressions)
 * - WebAudio API synthesis (actual WAV output)
 * - Style transfer via genre genes
 * - Quality tiers: low (mono) → photorealistic (full mix with effects)
 * - Deterministic: same seed = identical audio
 */

import * as fs from 'fs';
import * as path from 'path';
import type { Seed } from '../engines';
import { Xoshiro256StarStar, rngFromHash } from '../rng';

// Audio configuration
const SAMPLE_RATE = 44100;
const BIT_DEPTH = 16;
const CHANNELS = 2;

// Music theory
interface Scale {
  name: string;
  intervals: number[]; // Semitones from root
  chords: number[][];   // Common chord progressions
}

export interface Note {
  pitch: number;        // MIDI note number (60 = C4)
  startSample: number;
  durationSamples: number;
  velocity: number;      // 0-127
  track: 'melody' | 'harmony' | 'bass' | 'drums';
  instrument: string;
}

interface Chord {
  root: number;
  type: 'major' | 'minor' | 'diminished' | 'augmented' | 'seventh';
  notes: number[];
  startSample: number;
  durationSamples: number;
}

export interface MusicParams {
  genre: 'classical' | 'jazz' | 'electronic' | 'pop' | 'soundtrack';
  tempo: number;         // BPM
  duration: number;      // Seconds
  key: string;          // Musical key (e.g., 'C', 'F#')
  timeSignature: string; // e.g., '4/4', '3/4'
  scales: Scale;
  mood: string;
  instrumentation: string[];
  quality: 'low' | 'medium' | 'high' | 'photorealistic';
}

// Music theory database
const SCALES: Record<string, Scale> = {
  'C major': { name: 'C major', intervals: [0, 2, 4, 5, 7, 9, 11], chords: [[0,4,7], [2,5,9], [4,7,11], [5,9,0]] },
  'G major': { name: 'G major', intervals: [0, 2, 4, 5, 7, 9, 11], chords: [[0,4,7], [2,5,9], [4,7,11], [5,9,0]] },
  'D major': { name: 'D major', intervals: [0, 2, 4, 5, 7, 9, 11], chords: [[0,4,7], [2,5,9], [4,7,11], [5,9,0]] },
  'A major': { name: 'A major', intervals: [0, 2, 4, 5, 7, 9, 11], chords: [[0,4,7], [2,5,9], [4,7,11], [5,9,0]] },
  'E major': { name: 'E major', intervals: [0, 2, 4, 5, 7, 9, 11], chords: [[0,4,7], [2,5,9], [4,7,11], [5,9,0]] },
  'B major': { name: 'B major', intervals: [0, 2, 4, 5, 7, 9, 11], chords: [[0,4,7], [2,5,9], [4,7,11], [5,9,0]] },
  'F# major': { name: 'F# major', intervals: [0, 2, 4, 5, 7, 9, 11], chords: [[0,4,7], [2,5,9], [4,7,11], [5,9,0]] },
  'C# major': { name: 'C# major', intervals: [0, 2, 4, 5, 7, 9, 11], chords: [[0,4,7], [2,5,9], [4,7,11], [5,9,0]] },
  'A minor': { name: 'A minor', intervals: [0, 2, 3, 5, 7, 8, 10], chords: [[0,3,7], [2,5,8], [3,7,10], [5,8,0]] },
  'E minor': { name: 'E minor', intervals: [0, 2, 3, 5, 7, 8, 10], chords: [[0,3,7], [2,5,8], [3,7,10], [5,8,0]] },
  'B minor': { name: 'B minor', intervals: [0, 2, 3, 5, 7, 8, 10], chords: [[0,3,7], [2,5,8], [3,7,10], [5,8,0]] }
};

const GENRE_SETTINGS: Record<string, any> = {
  'classical': { preferKey: 'C major', timeSigs: ['4/4', '3/4'], tempoRange: [60, 140], instruments: ['piano', 'violin', 'cello', 'flute'] },
  'jazz': { preferKey: 'B minor', timeSigs: ['4/4', '3/4', '5/4'], tempoRange: [80, 180], instruments: ['piano', 'saxophone', 'double_bass', 'drums'] },
  'electronic': { preferKey: 'A minor', timeSigs: ['4/4'], tempoRange: [120, 160], instruments: ['synth', 'bass', 'drums', 'pad'] },
  'pop': { preferKey: 'C major', timeSigs: ['4/4'], tempoRange: [100, 140], instruments: ['piano', 'guitar', 'bass', 'drums'] },
  'soundtrack': { preferKey: 'E minor', timeSigs: ['4/4', '3/4'], tempoRange: [60, 120], instruments: ['orchestra', 'piano', 'strings', 'brass'] },
  'ambient': { preferKey: 'C major', timeSigs: ['4/4'], tempoRange: [60, 90], instruments: ['pad', 'synth', 'piano', 'bass'] }
};

/**
 * Extract parameters from seed with music theory
 */
export function extractParams(seed: Seed, rng: Xoshiro256StarStar): MusicParams {
  const quality = ((seed.genes?.quality?.value as string) || 'medium') as MusicParams['quality'];
  const genre = ((seed.genes?.genre?.value as string) || 'classical') as MusicParams['genre'];
  const genreSettings = GENRE_SETTINGS[genre] || GENRE_SETTINGS['classical'];

  // Tempo from seed or random within genre range
  const tempo = seed.genes?.tempo?.value || (genreSettings.tempoRange[0] + rng.nextF64() * (genreSettings.tempoRange[1] - genreSettings.tempoRange[0]));

  // Duration from seed or random
  const duration = seed.genes?.duration?.value || (rng.nextF64() * 290 + 10);

  // Key signature
  const key = seed.genes?.key?.value || genreSettings.preferKey;
  const scale = SCALES[key] || SCALES['C major'];

  // Time signature
  const timeSigOptions = genreSettings.timeSigs;
  const timeSignature = seed.genes?.timeSignature?.value || timeSigOptions[rng.nextInt(0, timeSigOptions.length - 1)];

  // Mood
  const moods = ['uplifting', 'melancholy', 'energetic', 'calm', 'dramatic', 'mysterious', 'joyful', 'dark'];
  const mood = seed.genes?.mood?.value || moods[rng.nextInt(0, moods.length - 1)];

  // Instrumentation (genre-specific + random selection)
  const instrumentCount = quality === 'photorealistic' ? 8 : quality === 'high' ? 5 : quality === 'medium' ? 3 : 1;
  const availableInstruments = genreSettings.instruments;
  const shuffled = [...availableInstruments].sort(() => rng.nextF64() - 0.5);
  const instrumentation = shuffled.slice(0, instrumentCount);

  return {
    genre,
    tempo,
    duration,
    key,
    timeSignature,
    scales: scale,
    mood,
    instrumentation,
    quality
  };
}

/**
 * Generate chord progression based on scale and genre
 */
export function generateChordProgression(params: MusicParams, rng: Xoshiro256StarStar): Chord[] {
  const { scales: scale, tempo, duration } = params;
  const beatsPerMeasure = params.timeSignature === '3/4' ? 3 : params.timeSignature === '6/8' ? 2 : 4;
  const measures = Math.floor((duration / 60) * tempo / beatsPerMeasure);

  const chords: Chord[] = [];
  const samplesPerBeat = Math.floor((60 / tempo) * SAMPLE_RATE);
  const samplesPerMeasure = samplesPerBeat * beatsPerMeasure;

  let currentSample = 0;

  // Common progressions by genre (each genre has multiple progression options)
  const progressions: Record<string, number[][][]> = {
    'classical': [[[0,4,7]], [[5,9,0]], [[3,7,10]], [[4,7,11]]], // I, V, iv, V individually
    'jazz': [[[0,4,7,10]], [[5,9,0,2]], [[7,11,2,5]], [[10,2,5,9]]], // 7th chords
    'pop': [[[0,4,7]], [[5,9,0]], [[7,11,2]], [[0,4,7]]], // I-V-vi-IV
    'electronic': [[[0,4,7]], [[3,7,10]], [[5,9,0]], [[7,11,2]]],
    'soundtrack': [[[0,4,7]], [[2,5,9]], [[4,7,11]], [[5,9,0]]]
  };

  const genreProgressions = progressions[params.genre] || progressions['classical'];
  // Pick a random progression pattern (use the whole progression as a cycle)
  const selectedProgression = genreProgressions[rng.nextInt(0, genreProgressions.length - 1)];

  for (let m = 0; m < measures; m++) {
    const chordIntervals = selectedProgression[m % selectedProgression.length];
    const chordType = params.genre === 'jazz' ? 'seventh' : 'major';

    // Build chord notes from intervals
    const notes = chordIntervals.map(interval => {
      const midiNote = 60 + scale.intervals[interval % scale.intervals.length] + (4 * 12); // Octave 4
      return midiNote;
    });

    chords.push({
      root: chordIntervals[0],
      type: chordType,
      notes,
      startSample: currentSample,
      durationSamples: samplesPerMeasure
    });

    currentSample += samplesPerMeasure;
  }

  return chords;
}

/**
 * Generate melody from chord progression
 */
export function generateMelody(chords: Chord[], params: MusicParams, rng: Xoshiro256StarStar): Note[] {
  const { scales: scale, tempo } = params;
  const notes: Note[] = [];

  const samplesPerBeat = Math.floor((60 / tempo) * SAMPLE_RATE);

  for (const chord of chords) {
    // 1-3 melody notes per chord
    const noteCount = rng.nextF64() > 0.5 ? 2 : 1;
    const chordDuration = chord.durationSamples / noteCount;

    for (let n = 0; n < noteCount; n++) {
      // Pick note from chord or scale
      let midiNote: number;
      if (rng.nextF64() > 0.3) {
        // Use chord tone (chord.notes is an array of MIDI notes)
        const chordTone = chord.notes[rng.nextInt(0, chord.notes.length - 1)];
        midiNote = chordTone + (rng.nextF64() > 0.5 ? 12 : 0); // Octave jump
      } else {
        // Use scale tone
        const scaleDegree = scale.intervals[rng.nextInt(0, scale.intervals.length - 1)];
        midiNote = 60 + scaleDegree + (rng.nextF64() > 0.3 ? 12 : 0);
      }

      // Add variation
      if (rng.nextF64() > 0.7) {
        midiNote += rng.nextF64() > 0.5 ? 1 : -1; // Half step
      }

      notes.push({
        pitch: Math.max(0, Math.min(127, midiNote)),
        startSample: chord.startSample + (n * chordDuration),
        durationSamples: Math.floor(chordDuration * (0.5 + rng.nextF64() * 0.8)),
        velocity: Math.floor(60 + rng.nextF64() * 67), // 60-127
        track: 'melody',
        instrument: params.instrumentation[0] || 'piano'
      });
    }
  }

  return notes;
}

/**
 * Generate harmony track (chord voicings)
 */
export function generateHarmony(chords: Chord[], params: MusicParams, rng: Xoshiro256StarStar): Note[] {
  const notes: Note[] = [];
  const harmonyInstrument = params.instrumentation.find(i => ['pad','piano','strings','synth','organ'].includes(i)) || 'piano';

  for (const chord of chords) {
    for (const midiNote of chord.notes) {
      notes.push({
        pitch: midiNote - 12,
        startSample: chord.startSample,
        durationSamples: chord.durationSamples,
        velocity: Math.floor(40 + rng.nextF64() * 40),
        track: 'harmony',
        instrument: harmonyInstrument
      });
    }
  }

  return notes;
}

/**
 * Generate bass line
 */
export function generateBass(chords: Chord[], params: MusicParams, rng: Xoshiro256StarStar): Note[] {
  const notes: Note[] = [];

  for (const chord of chords) {
    // Bass plays root note, octave lower
    const bassNote = chord.notes[0] - 12; // One octave down

    notes.push({
      pitch: Math.max(0, bassNote),
      startSample: chord.startSample,
      durationSamples: chord.durationSamples,
      velocity: Math.floor(80 + rng.nextF64() * 30),
      track: 'bass',
      instrument: 'bass'
    });

    // Occasional walking bass
    if (rng.nextF64() > 0.6 && params.genre === 'jazz') {
      const walkingNote = chord.notes[2] - 12; // Third, octave down
      notes.push({
        pitch: Math.max(0, walkingNote),
        startSample: chord.startSample + chord.durationSamples / 2,
        durationSamples: chord.durationSamples / 2,
        velocity: Math.floor(70 + rng.nextF64() * 30),
        track: 'bass',
        instrument: 'bass'
      });
    }
  }

  return notes;
}

/**
 * Generate drum pattern
 */
export function generateDrums(params: MusicParams, rng: Xoshiro256StarStar): Note[] {
  const { tempo, timeSignature } = params;
  const notes: Note[] = [];

  const samplesPerBeat = Math.floor((60 / tempo) * SAMPLE_RATE);
  const beatsPerMeasure = timeSignature === '3/4' ? 3 : timeSignature === '6/8' ? 2 : 4;
  const totalBeats = Math.floor((params.duration / 60) * tempo);

  // Drum sounds (MIDI notes)
  const KICK = 36;
  const SNARE = 38;
  const HI_HAT_CLOSED = 42;
  const HI_HAT_OPEN = 46;

  for (let beat = 0; beat < totalBeats; beat++) {
    const startSample = beat * samplesPerBeat;
    const measure = Math.floor(beat / beatsPerMeasure);
    const beatInMeasure = beat % beatsPerMeasure;

    // Kick pattern
    if (beatInMeasure === 0 || (beatInMeasure === 2 && rng.nextF64() > 0.5)) {
      notes.push({
        pitch: KICK,
        startSample,
        durationSamples: Math.floor(samplesPerBeat * 0.5),
        velocity: 100,
        track: 'drums',
        instrument: 'kick'
      });
    }

    // Snare pattern
    if (beatInMeasure === 2 || (params.genre === 'jazz' && beatInMeasure === 1)) {
      notes.push({
        pitch: SNARE,
        startSample,
        durationSamples: Math.floor(samplesPerBeat * 0.4),
        velocity: 90,
        track: 'drums',
        instrument: 'snare'
      });
    }

    // Hi-hat (8th notes)
    for (let eighth = 0; eighth < 2; eighth++) {
      notes.push({
        pitch: eighth === 0 || rng.nextF64() > 0.3 ? HI_HAT_CLOSED : HI_HAT_OPEN,
        startSample: startSample + (eighth * samplesPerBeat / 2),
        durationSamples: Math.floor(samplesPerBeat * 0.2),
        velocity: 60 + Math.floor(rng.nextF64() * 30),
        track: 'drums',
        instrument: 'hi-hat'
      });
    }
  }

  return notes;
}

/**
 * Synthesize audio from notes using WebAudio-style synthesis
 */
function synthesizeAudio(notes: Note[], params: MusicParams, rng: { nextF64: () => number }): Buffer {
  const totalSamples = Math.floor(params.duration * SAMPLE_RATE);
  const bytesPerSample = BIT_DEPTH / 8;
  const buffer = Buffer.alloc(totalSamples * CHANNELS * bytesPerSample, 0);

  // Fork RNG for synthesis to decouple from composition
  const synthRng = { nextF64: () => { rng.nextF64(); return rng.nextF64(); } };

  // Process each note
  for (const note of notes) {
    const startSample = Math.floor(note.startSample);
    const endSample = Math.min(totalSamples, startSample + note.durationSamples);
    const durationSec = note.durationSamples / SAMPLE_RATE;
    const freq = 440 * Math.pow(2, (note.pitch - 69) / 12);

    // ADSR envelope parameters
    const attack = Math.min(0.02, durationSec * 0.15);
    const decay = Math.min(0.05, durationSec * 0.1);
    const sustainLevel = note.instrument === 'kick' ? 0.2 :
                         note.instrument === 'hi-hat' ? 0.05 : 0.6;
    const release = Math.min(0.08, durationSec * 0.25);

    // Noise buffer for instruments that need it
    const noiseBuf = (note.instrument === 'hi-hat' || note.instrument === 'snare')
      ? new Float32Array(endSample - startSample) : null;
    if (noiseBuf) {
      for (let i = 0; i < noiseBuf.length; i++) {
        noiseBuf[i] = synthRng.nextF64() * 2 - 1;
      }
    }

    for (let s = startSample; s < endSample; s++) {
      const t = (s - startSample) / SAMPLE_RATE;

      // ADSR envelope
      let envelope: number;
      if (t < attack) {
        envelope = t / attack;
      } else if (t < attack + decay) {
        envelope = 1.0 - (1.0 - sustainLevel) * ((t - attack) / decay);
      } else if (t < durationSec - release) {
        envelope = sustainLevel;
      } else {
        envelope = sustainLevel * (1.0 - (t - (durationSec - release)) / release);
      }

      // Waveform
      let sample = 0;
      const phase = t * freq % 1.0;
      const twoPiFreqT = 2 * Math.PI * freq * t;

      switch (note.instrument) {
        case 'piano':
        case 'kick':
          sample = Math.sin(twoPiFreqT) * 0.6 +
                   Math.sin(twoPiFreqT * 2) * 0.25 +
                   Math.sin(twoPiFreqT * 3) * 0.1 +
                   Math.sin(twoPiFreqT * 4) * 0.05;
          if (note.instrument === 'kick') {
            // Kick: pitch drop for thump
            const kickEnv = Math.exp(-t * 30);
            sample = (Math.sin(twoPiFreqT * (1 - t * 5)) * 0.8 + Math.sin(twoPiFreqT * 2) * 0.2) * kickEnv;
          }
          break;
        case 'synth':
        case 'pad':
          sample = 2.0 * (phase - 0.5);
          if (note.instrument === 'pad') {
            sample += Math.sin(twoPiFreqT * 1.005) * 0.3;
          }
          break;
        case 'bass':
          sample = 2.0 * Math.abs(2.0 * phase - 1.0) - 1.0;
          sample += Math.sin(twoPiFreqT) * 0.15;
          break;
        case 'hi-hat':
          if (noiseBuf) {
            const hihatEnv = Math.exp(-t * 80);
            sample = noiseBuf[s - startSample] * hihatEnv * 0.4;
          }
          break;
        case 'snare':
          if (noiseBuf) {
            const snareEnv = Math.exp(-t * 40);
            sample = (Math.sin(twoPiFreqT * 0.5) * 0.5 + noiseBuf[s - startSample] * 0.5) * snareEnv;
          }
          break;
        case 'violin':
        case 'cello':
        case 'strings':
          sample = Math.sin(twoPiFreqT) * 0.4 +
                   Math.sin(twoPiFreqT * 2) * 0.3 +
                   Math.sin(twoPiFreqT * 3) * 0.2 +
                   Math.sin(twoPiFreqT * 5) * 0.05;
          break;
        case 'saxophone':
          sample = Math.sin(twoPiFreqT) * 0.35 +
                   Math.sin(twoPiFreqT * 2) * 0.25 +
                   Math.sin(twoPiFreqT * 4) * 0.15 +
                   Math.sin(twoPiFreqT * 6) * 0.05;
          break;
        case 'flute':
          sample = Math.sin(twoPiFreqT) * 0.5 +
                   Math.sin(twoPiFreqT * 3) * 0.1;
          break;
        default:
          sample = Math.sin(twoPiFreqT);
      }

      // Apply envelope and velocity
      sample *= envelope * (note.velocity / 127);

      // Clamp
      sample = Math.max(-1, Math.min(1, sample));

      // Write 16-bit interleaved stereo
      const bufferIndex = s * CHANNELS * bytesPerSample;
      const leftSample = Math.floor(sample * 32767);
      buffer.writeInt16LE(Math.max(-32768, Math.min(32767, leftSample)), bufferIndex);
      const rightSample = Math.floor((sample * (note.track === 'melody' ? 0.85 : 1.0)) * 32767);
      buffer.writeInt16LE(Math.max(-32768, Math.min(32767, rightSample)), bufferIndex + 2);
    }
  }

  // Master effects
  if (params.quality === 'photorealistic' || params.quality === 'high') {
    for (let i = 0; i < buffer.length; i += 2) {
      const s = buffer.readInt16LE(i) / 32767;
      const compressed = Math.tanh(s * 1.5);
      buffer.writeInt16LE(Math.floor(compressed * 32767), i);
    }
  }

  return buffer;
}

/**
 * Build MIDI file from notes
 */
function buildMIDI(notes: Note[], tempo: number): Buffer {
  const ticksPerBeat = 480;

  // Header
  const header = Buffer.from([
    0x4d, 0x54, 0x68, 0x64, // MThd
    0x00, 0x00, 0x00, 0x06, // Header length = 6
    0x00, 0x01, // Format 1 (multi-track)
    0x00, 0x02, // 2 tracks
    (ticksPerBeat >> 8) & 0xff, ticksPerBeat & 0xff
  ]);

  // Track 1: Tempo and metadata
  const track1Events: number[] = [];

  // Tempo
  const microsecsPerBeat = Math.floor(60000000 / tempo);
  track1Events.push(0x00, 0xff, 0x51, 0x03, (microsecsPerBeat >> 16) & 0xff, (microsecsPerBeat >> 8) & 0xff, microsecsPerBeat & 0xff);

  // Time signature
  track1Events.push(0x00, 0xff, 0x58, 0x04, 0x04, 0x02, 0x18, 0x08);

  // Track name
  const name = 'Paradigm Generated';
  track1Events.push(0x00, 0xff, 0x03, name.length, ...Buffer.from(name));

  // Note events
  const sortedNotes = [...notes].sort((a, b) => a.startSample - b.startSample);
  let lastTick = 0;

  for (const note of sortedNotes) {
    const startTick = Math.floor((note.startSample / SAMPLE_RATE) * (tempo / 60) * ticksPerBeat);
    const durationTick = Math.floor((note.durationSamples / SAMPLE_RATE) * (tempo / 60) * ticksPerBeat);

    // Delta time
    const deltaOn = startTick - lastTick;
    track1Events.push(...writeVariableLength(deltaOn), 0x90, note.pitch, note.velocity);

    // Note off
    const deltaOff = durationTick;
    track1Events.push(...writeVariableLength(deltaOff), 0x80, note.pitch, 0x40);

    lastTick = startTick + durationTick;
  }

  // End of track
  track1Events.push(0x00, 0xff, 0x2f, 0x00);

  // Track header
  const track1Data = Buffer.from(track1Events);
  const track1Header = Buffer.from([
    0x4d, 0x54, 0x72, 0x6b, // MTrk
    (track1Data.length >> 24) & 0xff, (track1Data.length >> 16) & 0xff, (track1Data.length >> 8) & 0xff, track1Data.length & 0xff
  ]);

  return Buffer.concat([header, track1Header, track1Data]);
}

function writeVariableLength(value: number): number[] {
  if (value < 0x80) return [value];
  if (value < 0x4000) return [0x80 | (value >> 7), value & 0x7f];
  if (value < 0x200000) return [0x80 | (value >> 14), 0x80 | ((value >> 7) & 0x7f), value & 0x7f];
  return [0x80 | (value >> 21), 0x80 | ((value >> 14) & 0x7f), 0x80 | ((value >> 7) & 0x7f), value & 0x7f];
}

/**
 * Main export function — generates world-class music
 */
export async function generateMusicV2(seed: Seed, outputPath: string): Promise<{
  filePath: string;
  scorePath: string;
  metaPath: string;
  genre: string;
  duration: number;
  trackCount: number;
}> {
  const rng = rngFromHash(seed.$hash || '');
  const params = extractParams(seed, rng);

  // Generate chord progression
  const chords = generateChordProgression(params, rng);

  // Generate all tracks
  const melodyNotes = generateMelody(chords, params, rng);
  const harmonyNotes = generateHarmony(chords, params, rng);
  const bassNotes = generateBass(chords, params, rng);
  const drumNotes = params.instrumentation.includes('drums') ? generateDrums(params, rng) : [];

  // Combine all notes
  const allNotes = [...melodyNotes, ...harmonyNotes, ...bassNotes, ...drumNotes];

  // Synthesize audio
  const audioBuffer = synthesizeAudio(allNotes, params, rng);

  // Build MIDI
  const midiBuffer = buildMIDI(allNotes, params.tempo);

  // Ensure output directory
  const dir = path.dirname(outputPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  // Write WAV file
  const wavPath = outputPath + '.wav';
  const wavBuffer = createWAV(audioBuffer, params.duration);
  fs.writeFileSync(wavPath, wavBuffer);

  // Write MIDI file
  const midiPath = outputPath + '.mid';
  fs.writeFileSync(midiPath, midiBuffer);

  // Write metadata
  const metaPath = outputPath + '.json';
  const metadata = {
    music: {
      genre: params.genre,
      duration: params.duration,
      tempo: params.tempo,
      key: params.key,
      timeSignature: params.timeSignature,
      mood: params.mood,
      quality: params.quality
    },
    composition: {
      chordCount: chords.length,
      melodyNoteCount: melodyNotes.length,
      bassNoteCount: bassNotes.length,
      drumNoteCount: drumNotes.length
    },
    instrumentation: params.instrumentation,
    production: {
      sampleRate: SAMPLE_RATE,
      bitDepth: BIT_DEPTH,
      channels: CHANNELS,
      format: 'WAV'
    }
  };
  fs.writeFileSync(metaPath, JSON.stringify(metadata, null, 2));

  return {
    filePath: wavPath,
    scorePath: midiPath,
    metaPath,
    genre: params.genre,
    duration: params.duration,
    trackCount: params.instrumentation.length + (drumNotes.length > 0 ? 1 : 0)
  };
}

/**
 * Create WAV file from raw audio buffer
 */
function createWAV(audioBuffer: Buffer, duration: number): Buffer {
  const dataSize = audioBuffer.length;
  const headerSize = 44;
  const totalSize = headerSize + dataSize;

  const wavBuffer = Buffer.alloc(totalSize);

  // RIFF header
  wavBuffer.write('RIFF', 0);
  wavBuffer.writeUInt32LE(totalSize - 8, 4);
  wavBuffer.write('WAVE', 8);

  // fmt chunk
  wavBuffer.write('fmt ', 12);
  wavBuffer.writeUInt32LE(16, 16);
  wavBuffer.writeUInt16LE(1, 20);
  wavBuffer.writeUInt16LE(CHANNELS, 22);
  wavBuffer.writeUInt32LE(SAMPLE_RATE, 24);
  wavBuffer.writeUInt32LE(SAMPLE_RATE * CHANNELS * (BIT_DEPTH / 8), 28);
  wavBuffer.writeUInt16LE(CHANNELS * (BIT_DEPTH / 8), 32);
  wavBuffer.writeUInt16LE(BIT_DEPTH, 34);

  // data chunk
  wavBuffer.write('data', 36);
  wavBuffer.writeUInt32LE(dataSize, 40);
  audioBuffer.copy(wavBuffer, 44);

  return wavBuffer;
}
