/**
 * Real synthesizer — band-limited oscillators, ADSR envelopes, multi-voice
 * mixing, Schroeder reverb, soft-knee compression, and stereo bus.
 *
 * Pure / deterministic. Output is a Float32Array stereo pair.
 */
import { Xoshiro256StarStar } from '../kernel/rng';
import type { VoicedChord } from './composer';

export interface SynthVoice {
  waveform: 'sine' | 'saw' | 'square' | 'triangle';
  detune: number;                // cents
  pan: number;                   // -1..+1
  level: number;                 // 0..1
  attackMs: number;
  decayMs: number;
  sustain: number;               // 0..1
  releaseMs: number;
  filterCutoff?: number;         // Hz, optional one-pole LPF
}

export interface TimedNote {
  midi: number;
  startSeconds: number;
  durationSeconds: number;
  velocity: number;              // 0..1
}

export interface Bus {
  left:  Float32Array;
  right: Float32Array;
  sampleRate: number;
}

export function midiToFreq(m: number): number {
  return 440 * Math.pow(2, (m - 69) / 12);
}

export function newBus(sampleRate: number, durationSeconds: number): Bus {
  const n = Math.max(1, Math.floor(sampleRate * durationSeconds));
  return { left: new Float32Array(n), right: new Float32Array(n), sampleRate };
}

// Band-limited sawtooth via additive synthesis (anti-aliased).
function sawAt(freq: number, sampleRate: number, t: number): number {
  let s = 0;
  const nyq = sampleRate / 2;
  let k = 1;
  while (freq * k < nyq) {
    s += Math.sin(2 * Math.PI * freq * k * t) / k;
    k++;
    if (k > 64) break;
  }
  return (s * 2) / Math.PI;
}
function squareAt(freq: number, sampleRate: number, t: number): number {
  let s = 0;
  const nyq = sampleRate / 2;
  let k = 1;
  while (freq * k < nyq) {
    s += Math.sin(2 * Math.PI * freq * k * t) / k;
    k += 2;
    if (k > 64) break;
  }
  return (s * 4) / Math.PI;
}
function triAt(freq: number, sampleRate: number, t: number): number {
  let s = 0;
  const nyq = sampleRate / 2;
  let k = 1;
  while (freq * k < nyq) {
    const sign = ((k - 1) / 2) % 2 === 0 ? 1 : -1;
    s += (sign * Math.sin(2 * Math.PI * freq * k * t)) / (k * k);
    k += 2;
    if (k > 32) break;
  }
  return (s * 8) / (Math.PI * Math.PI);
}

function oscAt(wf: SynthVoice['waveform'], freq: number, sampleRate: number, t: number): number {
  if (wf === 'sine')     return Math.sin(2 * Math.PI * freq * t);
  if (wf === 'saw')      return sawAt(freq, sampleRate, t);
  if (wf === 'square')   return squareAt(freq, sampleRate, t);
  /* triangle */          return triAt(freq, sampleRate, t);
}

function adsr(t: number, dur: number, vel: number, v: SynthVoice): number {
  const a = v.attackMs / 1000;
  const d = v.decayMs / 1000;
  const s = v.sustain;
  const r = v.releaseMs / 1000;
  if (t < 0) return 0;
  if (t < a) return vel * (t / a);
  if (t < a + d) return vel * (1 - (1 - s) * ((t - a) / d));
  if (t < dur) return vel * s;
  if (t < dur + r) return vel * s * (1 - (t - dur) / r);
  return 0;
}


export function renderNotesToBus(notes: ReadonlyArray<TimedNote>, voice: SynthVoice, bus: Bus): void {
  const sr = bus.sampleRate;
  const totalDur = bus.left.length / sr;
  const leftGain = Math.cos((voice.pan + 1) * Math.PI / 4);
  const rightGain = Math.sin((voice.pan + 1) * Math.PI / 4);
  const detuneRatio = Math.pow(2, voice.detune / 1200);
  for (const note of notes) {
    const freq = midiToFreq(note.midi) * detuneRatio;
    const startSample = Math.floor(note.startSeconds * sr);
    const tailSamples = Math.ceil((note.durationSeconds + voice.releaseMs / 1000) * sr);
    for (let i = 0; i < tailSamples; i++) {
      const idx = startSample + i;
      if (idx < 0 || idx >= bus.left.length) continue;
      const t = i / sr;
      const env = adsr(t, note.durationSeconds, note.velocity, voice);
      const sample = oscAt(voice.waveform, freq, sr, t) * env * voice.level;
      bus.left[idx]  += sample * leftGain;
      bus.right[idx] += sample * rightGain;
    }
  }
  // One-pole low-pass if requested
  if (voice.filterCutoff && voice.filterCutoff > 0) {
    onepoleLowpass(bus.left, voice.filterCutoff, sr);
    onepoleLowpass(bus.right, voice.filterCutoff, sr);
  }
}

function onepoleLowpass(buf: Float32Array, cutoff: number, sr: number): void {
  const rc = 1 / (2 * Math.PI * cutoff);
  const dt = 1 / sr;
  const a = dt / (rc + dt);
  let y = 0;
  for (let i = 0; i < buf.length; i++) {
    y += a * (buf[i] - y);
    buf[i] = y;
  }
}

// ── Schroeder reverb (four parallel comb + two series allpass) ────────

interface Comb { buf: Float32Array; idx: number; feedback: number; }
interface AllPass { buf: Float32Array; idx: number; g: number; }

function makeComb(size: number, feedback: number): Comb {
  return { buf: new Float32Array(size), idx: 0, feedback };
}
function makeAP(size: number, g: number): AllPass {
  return { buf: new Float32Array(size), idx: 0, g };
}
function processComb(c: Comb, x: number): number {
  const y = c.buf[c.idx];
  c.buf[c.idx] = x + y * c.feedback;
  c.idx = (c.idx + 1) % c.buf.length;
  return y;
}
function processAP(a: AllPass, x: number): number {
  const bufOut = a.buf[a.idx];
  const y = -a.g * x + bufOut;
  a.buf[a.idx] = x + a.g * bufOut;
  a.idx = (a.idx + 1) % a.buf.length;
  return y;
}

export function applyReverb(bus: Bus, opts: { wet?: number; roomSize?: number } = {}): void {
  const sr = bus.sampleRate;
  const wet = opts.wet ?? 0.18;
  const room = opts.roomSize ?? 0.8;
  const baseFB = 0.78 * room;
  const combSizes = [Math.round(sr * 0.0297), Math.round(sr * 0.0371), Math.round(sr * 0.0411), Math.round(sr * 0.0437)];
  const combsL = combSizes.map(s => makeComb(s, baseFB));
  const combsR = combSizes.map(s => makeComb(s + 23, baseFB - 0.01));
  const apsL = [makeAP(Math.round(sr * 0.005), 0.5), makeAP(Math.round(sr * 0.0017), 0.5)];
  const apsR = [makeAP(Math.round(sr * 0.005), 0.5), makeAP(Math.round(sr * 0.0017), 0.5)];
  for (let i = 0; i < bus.left.length; i++) {
    let l = 0, r = 0;
    const inL = bus.left[i], inR = bus.right[i];
    for (const c of combsL) l += processComb(c, inL);
    for (const c of combsR) r += processComb(c, inR);
    l /= combSizes.length; r /= combSizes.length;
    for (const a of apsL) l = processAP(a, l);
    for (const a of apsR) r = processAP(a, r);
    bus.left[i]  = inL * (1 - wet) + l * wet;
    bus.right[i] = inR * (1 - wet) + r * wet;
  }
}


// ── Soft-knee compressor + master mastering ───────────────────────────

export function applyCompressor(bus: Bus, opts: { thresholdDb?: number; ratio?: number; attackMs?: number; releaseMs?: number; makeupDb?: number } = {}): void {
  const threshold = Math.pow(10, (opts.thresholdDb ?? -18) / 20);
  const ratio = opts.ratio ?? 4;
  const att = Math.exp(-1 / ((opts.attackMs ?? 5) * 0.001 * bus.sampleRate));
  const rel = Math.exp(-1 / ((opts.releaseMs ?? 80) * 0.001 * bus.sampleRate));
  const makeup = Math.pow(10, (opts.makeupDb ?? 3) / 20);
  let envL = 0, envR = 0;
  for (let i = 0; i < bus.left.length; i++) {
    const aL = Math.abs(bus.left[i]);
    const aR = Math.abs(bus.right[i]);
    envL = aL > envL ? att * envL + (1 - att) * aL : rel * envL + (1 - rel) * aL;
    envR = aR > envR ? att * envR + (1 - att) * aR : rel * envR + (1 - rel) * aR;
    const env = Math.max(envL, envR);
    let gain = 1;
    if (env > threshold) gain = Math.pow(threshold / env, 1 - 1 / ratio);
    bus.left[i]  *= gain * makeup;
    bus.right[i] *= gain * makeup;
  }
}

export function applyLimiter(bus: Bus, ceiling = 0.98): void {
  for (let i = 0; i < bus.left.length; i++) {
    if (bus.left[i] > ceiling)  bus.left[i] = ceiling;
    if (bus.left[i] < -ceiling) bus.left[i] = -ceiling;
    if (bus.right[i] > ceiling) bus.right[i] = ceiling;
    if (bus.right[i] < -ceiling) bus.right[i] = -ceiling;
  }
}

// ── WAV writer (RIFF format) ──────────────────────────────────────────

export function busToWavBuffer(bus: Bus): Uint8Array {
  const n = bus.left.length;
  const dataBytes = n * 4;             // 2 channels × 2 bytes
  const totalBytes = 44 + dataBytes;
  const buf = new Uint8Array(totalBytes);
  const view = new DataView(buf.buffer);
  // RIFF header
  buf[0]=0x52; buf[1]=0x49; buf[2]=0x46; buf[3]=0x46;  // 'RIFF'
  view.setUint32(4, 36 + dataBytes, true);
  buf[8]=0x57; buf[9]=0x41; buf[10]=0x56; buf[11]=0x45; // 'WAVE'
  // fmt chunk
  buf[12]=0x66; buf[13]=0x6d; buf[14]=0x74; buf[15]=0x20; // 'fmt '
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);   // PCM
  view.setUint16(22, 2, true);   // 2 channels
  view.setUint32(24, bus.sampleRate, true);
  view.setUint32(28, bus.sampleRate * 4, true);  // byte rate
  view.setUint16(32, 4, true);   // block align
  view.setUint16(34, 16, true);  // bits/sample
  // data chunk
  buf[36]=0x64; buf[37]=0x61; buf[38]=0x74; buf[39]=0x61; // 'data'
  view.setUint32(40, dataBytes, true);
  let p = 44;
  for (let i = 0; i < n; i++) {
    const l = Math.max(-1, Math.min(1, bus.left[i]));
    const r = Math.max(-1, Math.min(1, bus.right[i]));
    view.setInt16(p, Math.round(l * 32767), true); p += 2;
    view.setInt16(p, Math.round(r * 32767), true); p += 2;
  }
  return buf;
}

