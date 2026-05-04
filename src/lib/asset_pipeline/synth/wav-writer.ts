/**
 * WAV Writer - Audio Synthesis Pipeline
 * Gap 1.1: Replaces metadata output with actual WAV binary synthesis
 * 
 * Synthesizes audio from seed genes (tempo, key, scale, instrument) into
 * a proper WAV file with ADSR envelopes, effects, and stereo output.
 */

import { Xoshiro256StarStar, rngFromHash } from '../kernel/rng';

export interface SynthParams {
  sampleRate?: number;
  channels?: number;
  bitDepth?: number;
  duration?: number;
}

export interface Note {
  frequency: number;
  startTime: number;
  duration: number;
  velocity: number;
  instrument: OscillatorType;
}

export type OscillatorType = 'sine' | 'square' | 'sawtooth' | 'triangle';

export interface AudioBuffer {
  left: Float32Array;
  right: Float32Array;
  sampleRate: number;
  channels: number;
  duration: number;
}

const DEFAULT_SAMPLE_RATE = 44100;
const DEFAULT_CHANNELS = 2;
const DEFAULT_BIT_DEPTH = 16;

function midiToFrequency(midiNote: number): number {
  return 440 * Math.pow(2, (midiNote - 69) / 12);
}

export class AdsrEnvelope {
  constructor(
    public attack: number = 0.01,
    public decay: number = 0.1,
    public sustain: number = 0.7,
    public release: number = 0.3
  ) {}

  getEnvelope(sampleIndex: number, totalSamples: number, noteDuration: number): number {
    const attackSamples = this.attack * DEFAULT_SAMPLE_RATE;
    const decaySamples = this.decay * DEFAULT_SAMPLE_RATE;
    const releaseSamples = this.release * DEFAULT_SAMPLE_RATE;
    const sustainSamples = Math.max(0, noteDuration * DEFAULT_SAMPLE_RATE - attackSamples - decaySamples - releaseSamples);
    
    const releaseStart = noteDuration * DEFAULT_SAMPLE_RATE - releaseSamples;
    
    if (sampleIndex < attackSamples) {
      return sampleIndex / attackSamples;
    } else if (sampleIndex < attackSamples + decaySamples) {
      const decayProgress = (sampleIndex - attackSamples) / decaySamples;
      return 1 - (1 - this.sustain) * decayProgress;
    } else if (sampleIndex < releaseStart) {
      return this.sustain;
    } else {
      const releaseProgress = (sampleIndex - releaseStart) / releaseSamples;
      return this.sustain * (1 - releaseProgress);
    }
  }
}

export class Oscillator {
  constructor(public type: OscillatorType = 'sine') {}

  sample(phase: number): number {
    const p = phase % (2 * Math.PI);
    switch (this.type) {
      case 'sine':
        return Math.sin(p);
      case 'square':
        return p < Math.PI ? 1 : -1;
      case 'sawtooth':
        return (p / Math.PI) - 1;
      case 'triangle':
        return p < Math.PI ? (2 * p / Math.PI) - 1 : 3 - (2 * p / Math.PI);
      default:
        return Math.sin(p);
    }
  }
}

export class WavWriter {
  private sampleRate: number;
  private channels: number;
  private bitDepth: number;

  constructor(params: SynthParams = {}) {
    this.sampleRate = params.sampleRate || DEFAULT_SAMPLE_RATE;
    this.channels = params.channels || DEFAULT_CHANNELS;
    this.bitDepth = params.bitDepth || DEFAULT_BIT_DEPTH;
  }

  synthesizeNote(note: Note, totalDuration: number, rng: Xoshiro256StarStar): Float32Array {
    const samples = Math.ceil(totalDuration * this.sampleRate);
    const buffer = new Float32Array(samples);
    const osc = new Oscillator(note.instrument);
    const envelope = new AdsrEnvelope();
    
    for (let i = 0; i < samples; i++) {
      const t = i / this.sampleRate;
      
      if (t < note.startTime || t > note.startTime + note.duration) {
        buffer[i] = 0;
        continue;
      }
      
      const noteProgress = i - note.startTime * this.sampleRate;
      const noteTotalSamples = note.duration * this.sampleRate;
      const envelopeValue = envelope.getEnvelope(noteProgress, samples, note.duration);
      
      const frequency = note.frequency;
      const phase = 2 * Math.PI * frequency * t;
      
      let sample = osc.sample(phase);
      
      sample *= envelopeValue;
      sample *= note.velocity;
      
      const detune = 1 + (rng.nextF64() - 0.5) * 0.001;
      sample += osc.sample(phase * detune) * 0.3 * envelopeValue * note.velocity;
      
      buffer[i] = Math.max(-1, Math.min(1, sample));
    }
    
    return buffer;
  }

  synthesizeTrack(notes: Note[], duration: number, rng: Xoshiro256StarStar): AudioBuffer {
    const totalSamples = Math.ceil(duration * this.sampleRate);
    const left = new Float32Array(totalSamples);
    const right = new Float32Array(totalSamples);
    
    for (const note of notes) {
      const noteBuffer = this.synthesizeNote(note, duration, rng);
      
      for (let i = 0; i < noteBuffer.length; i++) {
        if (i < left.length) {
          left[i] += noteBuffer[i];
          right[i] += noteBuffer[i];
        }
      }
    }
    
    for (let i = 0; i < left.length; i++) {
      left[i] = Math.max(-1, Math.min(1, left[i]));
      right[i] = Math.max(-1, Math.min(1, right[i]));
    }
    
    return {
      left,
      right,
      sampleRate: this.sampleRate,
      channels: this.channels,
      duration
    };
  }

  toWavBuffer(audio: AudioBuffer): Buffer {
    const { left, right, sampleRate, channels, duration } = audio;
    const numSamples = left.length;
    const bytesPerSample = this.bitDepth / 8;
    const dataSize = numSamples * channels * bytesPerSample;
    const fileSize = 44 + dataSize;
    
    const buffer = Buffer.alloc(fileSize);
    let offset = 0;
    
    buffer.write('RIFF', offset); offset += 4;
    buffer.writeUInt32LE(fileSize - 8, offset); offset += 4;
    buffer.write('WAVE', offset); offset += 4;
    
    buffer.write('fmt ', offset); offset += 4;
    buffer.writeUInt32LE(16, offset); offset += 4;
    buffer.writeUInt16LE(1, offset); offset += 2;
    buffer.writeUInt16LE(channels, offset); offset += 2;
    buffer.writeUInt32LE(sampleRate, offset); offset += 4;
    buffer.writeUInt32LE(sampleRate * channels * bytesPerSample, offset); offset += 4;
    buffer.writeUInt16LE(channels * bytesPerSample, offset); offset += 2;
    buffer.writeUInt16LE(this.bitDepth, offset); offset += 2;
    
    buffer.write('data', offset); offset += 4;
    buffer.writeUInt32LE(dataSize, offset); offset += 4;
    
    for (let i = 0; i < numSamples; i++) {
      const leftSample = channels === 2 ? left[i] : left[i];
      const rightSample = channels === 2 ? right[i] : left[i];
      
      const leftInt = Math.round(leftSample * 32767);
      const rightInt = Math.round(rightSample * 32767);
      
      buffer.writeInt16LE(leftInt, offset); offset += 2;
      if (channels === 2) {
        buffer.writeInt16LE(rightInt, offset); offset += 2;
      }
    }
    
    return buffer;
  }

  midiFromKey(key: string): number {
    const keyToMidi: Record<string, number> = {
      'C': 0, 'C#': 1, 'Db': 1, 'D': 2, 'D#': 3, 'Eb': 3,
      'E': 4, 'F': 5, 'F#': 6, 'Gb': 6, 'G': 7, 'G#': 8,
      'Ab': 8, 'A': 9, 'A#': 10, 'Bb': 10, 'B': 11
    };
    return keyToMidi[key] ?? 0;
  }

  scaleDegrees(tonic: number, scaleType: string): number[] {
    const scales: Record<string, number[]> = {
      major: [0, 2, 4, 5, 7, 9, 11],
      minor: [0, 2, 3, 5, 7, 8, 10],
      pentatonic: [0, 2, 4, 7, 9],
      blues: [0, 3, 5, 6, 7, 10],
      chromatic: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]
    };
    return scales[scaleType] || scales.major;
  }

  generateChordProgression(
    key: string,
    scaleType: string,
    tempo: number,
    duration: number,
    rng: Xoshiro256StarStar
  ): Note[] {
    const notes: Note[] = [];
    const tonicMidi = this.midiFromKey(key);
    const scale = this.scaleDegrees(tonicMidi, scaleType);
    const beatsPerMinute = tempo;
    const beatDuration = 60 / beatsPerMinute;
    const measures = Math.floor(duration / (beatDuration * 4));
    
    const progressions: Record<string, number[][]> = {
      major: [[0, 4, 7], [5, 9, 0], [3, 7, 10], [4, 7, 11]],
      minor: [[0, 3, 7], [5, 8, 0], [3, 7, 10], [4, 7, 11]]
    };
    
    const progression = progressions[scaleType] || progressions.major;
    const progressionPattern = progression[rng.nextInt(0, progression.length - 1)];
    
    for (let m = 0; m < measures; m++) {
      const chord = progressionPattern[m % progressionPattern.length];
      const startTime = m * beatDuration * 4;
      
      for (let n = 0; n < chord.length; n++) {
        const degree = chord[n];
        const octaveOffset = Math.floor(degree / 12);
        const noteInScale = degree % 12;
        const midiNote = tonicMidi + (4 + octaveOffset) * 12 + scale[noteInScale];
        
        notes.push({
          frequency: midiToFrequency(midiNote),
          startTime: startTime,
          duration: beatDuration * 4 - 0.05,
          velocity: 0.7 + rng.nextF64() * 0.2,
          instrument: 'sine'
        });
      }
    }
    
    return notes;
  }
}

export function createWavWriter(params?: SynthParams): WavWriter {
  return new WavWriter(params);
}

export function synthesizeMusic(seed: {
  $hash?: string;
  genes?: Record<string, { value?: any }>;
}): AudioBuffer {
  const rng = seed.$hash ? rngFromHash(seed.$hash) : new Xoshiro256StarStar(Date.now());
  const writer = new WavWriter();
  
  const tempo = seed.genes?.tempo?.value ?? 120;
  const key = seed.genes?.key?.value ?? 'C';
  const scaleType = seed.genes?.scale?.value ?? 'major';
  const duration = seed.genes?.duration?.value ?? 180;
  
  const notes = writer.generateChordProgression(key, scaleType, tempo, duration, rng);
  return writer.synthesizeTrack(notes, duration, rng);
}

export function musicToWavBuffer(seed: {
  $hash?: string;
  genes?: Record<string, { value?: any }>;
}): Buffer {
  const audio = synthesizeMusic(seed);
  const writer = new WavWriter();
  return writer.toWavBuffer(audio);
}