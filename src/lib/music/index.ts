/**
 * Music — composer + synth public surface.
 *
 * `composeAndRender(seed)` is the single entry point. It:
 *   1. Builds a deterministic functional-harmony progression.
 *   2. Voice-leads it across N voices using minimum-motion rule.
 *   3. Generates a melody line over it with contour bias.
 *   4. Generates a walking bass.
 *   5. Synthesizes everything with band-limited oscillators + ADSR.
 *   6. Applies reverb + soft-knee compression + master limiter.
 *   7. Returns stereo WAV bytes.
 */
import { rngFromHash, Xoshiro256StarStar } from '../kernel/rng';
import {
  generateProgression, voiceLead, generateMelody, generateBassLine,
  NOTE_TO_MIDI, type Mode, type ProgressionStep, type VoicedChord, type MelodyNote,
} from './composer';
import {
  newBus, renderNotesToBus, applyReverb, applyCompressor, applyLimiter, busToWavBuffer,
  type SynthVoice, type TimedNote, type Bus,
} from './synth';

export interface MusicSeed {
  $hash?: string;
  genes?: Record<string, { value?: any }>;
}

export interface ComposeOpts {
  key?: string;             // 'C', 'F#', etc.
  mode?: Mode;
  tempo?: number;           // BPM
  bars?: number;            // length in bars
  voices?: number;          // chord voices
  sampleRate?: number;      // default 44100
  density?: number;         // 0..1, melody note density
  contour?: 'arch' | 'ascending' | 'descending' | 'undulating';
  reverb?: number;          // 0..1 wet mix
}

export interface CompositionResult {
  progression: ProgressionStep[];
  voicedChords: VoicedChord[];
  melody: MelodyNote[];
  bass: MelodyNote[];
  durationSeconds: number;
  sampleRate: number;
  wav: Uint8Array;          // ready-to-write WAV bytes
  summary: string;          // human-readable description
}


function melodyToTimed(notes: ReadonlyArray<MelodyNote>, bpm: number, notesPerBar: number): TimedNote[] {
  const beatSec = 60 / bpm;
  return notes.map(n => ({
    midi: n.midi,
    startSeconds: (n.bar + n.beat / notesPerBar) * (beatSec * 4),
    durationSeconds: n.durationBeats * beatSec,
    velocity: 0.85,
  }));
}

function voicedToTimed(voiced: ReadonlyArray<VoicedChord>, bpm: number): TimedNote[] {
  const beatSec = 60 / bpm;
  const out: TimedNote[] = [];
  for (const c of voiced) {
    for (const m of c.voicesMidi) {
      out.push({
        midi: m,
        startSeconds: c.bar * (beatSec * 4),
        durationSeconds: 4 * beatSec * 0.95,
        velocity: 0.55,
      });
    }
  }
  return out;
}

export function composeAndRender(seed: MusicSeed, opts: ComposeOpts = {}): CompositionResult {
  const rng = seed.$hash ? rngFromHash(seed.$hash) : new Xoshiro256StarStar('paradigm-music-default');
  const key      = opts.key      ?? String(seed.genes?.key?.value ?? 'C');
  const mode     = (opts.mode    ?? (seed.genes?.scale?.value ?? 'ionian')) as Mode;
  const tempo    = opts.tempo    ?? Number(seed.genes?.tempo?.value ?? 96);
  const bars     = opts.bars     ?? Math.max(4, Math.min(32, Number(seed.genes?.bars?.value ?? 16)));
  const voices   = opts.voices   ?? 4;
  const sr       = opts.sampleRate ?? 44100;
  const density  = opts.density  ?? 0.65;
  const contour  = opts.contour  ?? 'arch';
  const reverbAmt= opts.reverb   ?? 0.18;

  const keyMidi  = NOTE_TO_MIDI[key] ?? 60;
  const validMode = (mode in {ionian:1,dorian:1,phrygian:1,lydian:1,mixolydian:1,aeolian:1,locrian:1}) ? mode : 'ionian';
  const progression = generateProgression({ keyMidi, mode: validMode, bars, rng });
  const voiced = voiceLead(progression, { voices, rangeLow: 48, rangeHigh: 72 });
  const notesPerBar = Math.max(2, Math.round(2 + density * 6));
  const melody = generateMelody({ progression, mode: validMode, keyMidi, rng, notesPerBar, contour });
  const bass = generateBassLine(progression, { rng });

  const beatSec = 60 / tempo;
  const totalSeconds = bars * 4 * beatSec + 1.5;   // tail for reverb
  const bus: Bus = newBus(sr, totalSeconds);

  // Voices: chords (warm pad), bass (sub), melody (lead).
  const padVoice: SynthVoice = {
    waveform: 'saw',
    detune: 8,
    pan: 0,
    level: 0.18,
    attackMs: 35,
    decayMs: 240,
    sustain: 0.55,
    releaseMs: 600,
    filterCutoff: 1800,
  };
  const bassVoice: SynthVoice = {
    waveform: 'triangle',
    detune: 0,
    pan: -0.2,
    level: 0.30,
    attackMs: 8,
    decayMs: 120,
    sustain: 0.4,
    releaseMs: 200,
  };
  const leadVoice: SynthVoice = {
    waveform: 'triangle',
    detune: 4,
    pan: 0.15,
    level: 0.28,
    attackMs: 12,
    decayMs: 180,
    sustain: 0.65,
    releaseMs: 350,
    filterCutoff: 4500,
  };

  // Render
  renderNotesToBus(voicedToTimed(voiced, tempo), padVoice, bus);
  renderNotesToBus(melodyToTimed(bass, tempo, 2), bassVoice, bus);
  renderNotesToBus(melodyToTimed(melody, tempo, notesPerBar), leadVoice, bus);

  // Master chain
  applyReverb(bus, { wet: reverbAmt, roomSize: 0.78 });
  applyCompressor(bus, { thresholdDb: -16, ratio: 4, attackMs: 5, releaseMs: 80, makeupDb: 4 });
  applyLimiter(bus, 0.96);

  const wav = busToWavBuffer(bus);
  const summary = `${bars} bars · ${key} ${validMode} · ${tempo}bpm · ${voices}-voice pad + walking bass + ${contour}-contour melody · ${totalSeconds.toFixed(1)}s · ${(wav.length/1024).toFixed(0)}KB`;
  return {
    progression, voicedChords: voiced, melody, bass,
    durationSeconds: totalSeconds, sampleRate: sr,
    wav, summary,
  };
}

