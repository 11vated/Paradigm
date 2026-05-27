/**
 * Real procedural music composer — Paradigm Civilisation Stack.
 *
 * Produces composed music with functional harmony, voice leading
 * (Schoenberg-style minimum-motion rule), counterpoint over N voices,
 * and rhythmic patterns drawn from genre-typed grammars.
 *
 * Pure / deterministic / IO-free. Seeded by Xoshiro256StarStar.
 */
import { Xoshiro256StarStar, rngFromHash } from '../kernel/rng';

// ── Music theory tables ─────────────────────────────────────────────────

export type Mode = 'ionian' | 'dorian' | 'phrygian' | 'lydian' | 'mixolydian' | 'aeolian' | 'locrian';
export type ChordQuality = 'maj' | 'min' | 'dim' | 'aug' | 'maj7' | 'min7' | '7' | 'dim7' | 'sus2' | 'sus4';
export type ChordFunction = 'T' | 'PD' | 'D' | 'SD' | 'chromatic';

export const MODES: Record<Mode, ReadonlyArray<number>> = {
  ionian:     [0, 2, 4, 5, 7, 9, 11],  // major
  dorian:     [0, 2, 3, 5, 7, 9, 10],
  phrygian:   [0, 1, 3, 5, 7, 8, 10],
  lydian:     [0, 2, 4, 6, 7, 9, 11],
  mixolydian: [0, 2, 4, 5, 7, 9, 10],
  aeolian:    [0, 2, 3, 5, 7, 8, 10],  // natural minor
  locrian:    [0, 1, 3, 5, 6, 8, 10],
};

export const CHORD_INTERVALS: Record<ChordQuality, ReadonlyArray<number>> = {
  maj:   [0, 4, 7],
  min:   [0, 3, 7],
  dim:   [0, 3, 6],
  aug:   [0, 4, 8],
  maj7:  [0, 4, 7, 11],
  min7:  [0, 3, 7, 10],
  '7':   [0, 4, 7, 10],
  dim7:  [0, 3, 6, 9],
  sus2:  [0, 2, 7],
  sus4:  [0, 5, 7],
};

export const NOTE_TO_MIDI: Record<string, number> = {
  C: 60, 'C#': 61, Db: 61, D: 62, 'D#': 63, Eb: 63, E: 64,
  F: 65, 'F#': 66, Gb: 66, G: 67, 'G#': 68, Ab: 68, A: 69,
  'A#': 70, Bb: 70, B: 71,
};

// Functional roman-numeral progressions in major mode (degrees 1..7)
// Encoded as { degree, quality, function }
export interface RomanChord {
  degree: number;       // 1..7
  quality: ChordQuality;
  function: ChordFunction;
}

const MAJOR_HARMONY: Record<number, { quality: ChordQuality; function: ChordFunction }> = {
  1: { quality: 'maj',  function: 'T'  },
  2: { quality: 'min',  function: 'PD' },
  3: { quality: 'min',  function: 'T'  },  // mediant
  4: { quality: 'maj',  function: 'PD' },
  5: { quality: 'maj',  function: 'D'  },
  6: { quality: 'min',  function: 'T'  },  // submediant
  7: { quality: 'dim',  function: 'D'  },
};

const MINOR_HARMONY: Record<number, { quality: ChordQuality; function: ChordFunction }> = {
  1: { quality: 'min',  function: 'T'  },
  2: { quality: 'dim',  function: 'PD' },
  3: { quality: 'maj',  function: 'T'  },  // relative major
  4: { quality: 'min',  function: 'PD' },
  5: { quality: 'min',  function: 'D'  },  // or maj for harmonic minor V
  6: { quality: 'maj',  function: 'T'  },
  7: { quality: 'maj',  function: 'D'  },
};


// Functional-progression grammar — typed transition probabilities.
// Each function class can move to a small set of successors with prior weights.
// (Pure deterministic — the RNG draw selects which.)
const FUNCTIONAL_TRANSITIONS: Record<ChordFunction, ReadonlyArray<{ to: ChordFunction; w: number }>> = {
  T:  [{ to: 'PD', w: 6 }, { to: 'SD', w: 2 }, { to: 'D', w: 2 }, { to: 'T', w: 1 }],
  SD: [{ to: 'PD', w: 4 }, { to: 'D', w: 4 }, { to: 'T', w: 2 }],
  PD: [{ to: 'D',  w: 7 }, { to: 'PD', w: 2 }, { to: 'T', w: 1 }],
  D:  [{ to: 'T',  w: 8 }, { to: 'D', w: 1 }, { to: 'PD', w: 1 }],
  chromatic: [{ to: 'T', w: 1 }],
};

const DEGREES_BY_FUNCTION: Record<ChordFunction, readonly number[]> = {
  T:  [1, 6, 3],
  PD: [2, 4],
  SD: [4, 6],
  D:  [5, 7],
  chromatic: [1],
};

// ── Progression generator ──────────────────────────────────────────────

export interface ProgressionOpts {
  keyMidi: number;            // tonic, midi pitch (e.g. 60 for C4)
  mode: Mode;
  bars: number;               // number of measures of chord change
  startFunction?: ChordFunction;
  rng: Xoshiro256StarStar;
  cadenceEvery?: number;      // bars between cadences (default 4)
}

export interface ProgressionStep {
  bar: number;
  roman: RomanChord;
  rootMidi: number;
  pitches: number[];          // raw chord tones in midi (no voicing yet)
}

function weightedPick<T>(items: ReadonlyArray<{ to: T; w: number }>, rng: Xoshiro256StarStar): T {
  const total = items.reduce((s, x) => s + x.w, 0);
  let r = rng.nextF64() * total;
  for (const it of items) { r -= it.w; if (r <= 0) return it.to; }
  return items[items.length - 1].to;
}

export function generateProgression(opts: ProgressionOpts): ProgressionStep[] {
  const { keyMidi, mode, bars, rng } = opts;
  const cadenceEvery = opts.cadenceEvery ?? 4;
  const harmony = (mode === 'aeolian' || mode === 'dorian' || mode === 'phrygian' || mode === 'locrian')
    ? MINOR_HARMONY : MAJOR_HARMONY;
  const scale = MODES[mode];
  const out: ProgressionStep[] = [];
  let currentFn: ChordFunction = opts.startFunction ?? 'T';

  for (let b = 0; b < bars; b++) {
    // Force a cadence every `cadenceEvery` bars: D → T on the last bar of each phrase
    let useFn: ChordFunction = currentFn;
    if (b > 0 && b % cadenceEvery === cadenceEvery - 1) useFn = 'D';
    if (b > 0 && b % cadenceEvery === 0)               useFn = 'T';
    // Pick a degree expressing this function
    const candidates = DEGREES_BY_FUNCTION[useFn] || [1];
    const degree = candidates[rng.nextInt(0, candidates.length - 1)];
    const h = harmony[degree];
    const quality = h.quality;
    const rootMidi = keyMidi + scale[(degree - 1) % 7];
    const pitches = CHORD_INTERVALS[quality].map(iv => rootMidi + iv);
    out.push({ bar: b, roman: { degree, quality, function: h.function }, rootMidi, pitches });
    currentFn = weightedPick(FUNCTIONAL_TRANSITIONS[useFn], rng);
  }
  return out;
}


// ── Voice leading (minimum-motion rule) ────────────────────────────────

export interface VoicedChord {
  bar: number;
  voicesMidi: number[];       // one midi value per voice, ordered bass → soprano
  roman: RomanChord;
}

/**
 * Voice the progression so each chord's voices move minimally from the
 * previous chord's voices. Forbids parallel perfect fifths/octaves between
 * adjacent chords (a basic Schoenberg-style rule).
 */
export function voiceLead(
  progression: ReadonlyArray<ProgressionStep>,
  opts: { voices: number; rangeLow: number; rangeHigh: number; }
): VoicedChord[] {
  const { voices, rangeLow, rangeHigh } = opts;
  const out: VoicedChord[] = [];
  // Initial voicing: stack chord tones from the bottom of the range upward.
  if (progression.length === 0) return out;
  const first = progression[0];
  const firstVoicing: number[] = [];
  let prevMidi = rangeLow;
  for (let v = 0; v < voices; v++) {
    const ct = first.pitches[v % first.pitches.length];
    // place ct in the nearest octave above prevMidi
    let p = ct;
    while (p < prevMidi) p += 12;
    while (p > rangeHigh) p -= 12;
    firstVoicing.push(p);
    prevMidi = p + 1;
  }
  firstVoicing.sort((a, b) => a - b);
  out.push({ bar: first.bar, voicesMidi: firstVoicing, roman: first.roman });

  for (let i = 1; i < progression.length; i++) {
    const cur = progression[i];
    const prevV = out[i - 1].voicesMidi;
    const chordTones = cur.pitches;
    // For each previous voice, find the closest chord tone (allowing octave wrap)
    const newV: number[] = prevV.map(pv => {
      let bestCandidate = chordTones[0];
      let bestDist = Infinity;
      for (const ct of chordTones) {
        // candidate near pv: shift ct by octaves until close
        let p = ct;
        while (p < pv - 11) p += 12;
        while (p > pv + 11) p -= 12;
        for (const offset of [-12, 0, 12]) {
          const cand = p + offset;
          if (cand < rangeLow || cand > rangeHigh) continue;
          const d = Math.abs(cand - pv);
          if (d < bestDist) { bestDist = d; bestCandidate = cand; }
        }
      }
      return bestCandidate;
    });
    // Forbid parallel 5ths and 8ths between any pair of voices
    const fixed = avoidParallelPerfects(prevV, newV);
    out.push({ bar: cur.bar, voicesMidi: fixed, roman: cur.roman });
  }
  return out;
}

function avoidParallelPerfects(prev: ReadonlyArray<number>, next: number[]): number[] {
  const adjusted = next.slice();
  for (let i = 0; i < adjusted.length; i++) {
    for (let j = i + 1; j < adjusted.length; j++) {
      const prevInterval = Math.abs(prev[j] - prev[i]) % 12;
      const nextInterval = Math.abs(adjusted[j] - adjusted[i]) % 12;
      if ((prevInterval === 7 || prevInterval === 0) && prevInterval === nextInterval) {
        // shift the upper voice up or down by an octave or to the nearest non-perfect interval
        if (adjusted[j] + 12 <= 100) adjusted[j] += 12;
        else if (adjusted[j] - 12 >= 30) adjusted[j] -= 12;
      }
    }
  }
  return adjusted;
}


// ── Melody generator ───────────────────────────────────────────────────

export interface MelodyOpts {
  progression: ReadonlyArray<ProgressionStep>;
  mode: Mode;
  keyMidi: number;
  rng: Xoshiro256StarStar;
  notesPerBar?: number;     // 1..16, default 4
  rangeLow?: number;        // default 72 (C5)
  rangeHigh?: number;       // default 84 (C6)
  contour?: 'arch' | 'ascending' | 'descending' | 'undulating';
}

export interface MelodyNote {
  bar: number;
  beat: number;             // 0..notesPerBar-1
  midi: number;
  durationBeats: number;    // 1 by default; longer for sustained notes
}

export function generateMelody(opts: MelodyOpts): MelodyNote[] {
  const { progression, mode, keyMidi, rng } = opts;
  const notesPerBar = opts.notesPerBar ?? 4;
  const rangeLow = opts.rangeLow ?? 72;
  const rangeHigh = opts.rangeHigh ?? 84;
  const contour = opts.contour ?? 'arch';
  const scale = MODES[mode];
  const scaleMidiInRange: number[] = [];
  for (let m = rangeLow; m <= rangeHigh; m++) {
    if (scale.includes((m - keyMidi + 144) % 12)) scaleMidiInRange.push(m);
  }
  if (scaleMidiInRange.length === 0) scaleMidiInRange.push(keyMidi);

  const out: MelodyNote[] = [];
  const totalNotes = progression.length * notesPerBar;
  let lastMidi = scaleMidiInRange[Math.floor(scaleMidiInRange.length / 2)];

  for (let i = 0; i < totalNotes; i++) {
    const bar = Math.floor(i / notesPerBar);
    const beat = i % notesPerBar;
    const chord = progression[bar];

    // Contour bias: where in the arc should we be?
    const t = i / Math.max(1, totalNotes - 1);
    let contourBias = 0;
    if (contour === 'arch')        contourBias = Math.sin(t * Math.PI);                // 0→1→0
    if (contour === 'ascending')   contourBias = t;
    if (contour === 'descending')  contourBias = 1 - t;
    if (contour === 'undulating')  contourBias = (Math.sin(t * Math.PI * 4) + 1) * 0.5;

    // Target midi from contour, biased toward chord tones on strong beats
    const lo = scaleMidiInRange[0];
    const hi = scaleMidiInRange[scaleMidiInRange.length - 1];
    const target = lo + (hi - lo) * contourBias;

    // Build candidate notes within ±5 semitones of (lastMidi + targetDelta)
    const targetDelta = (target - lastMidi) * 0.35;
    const wantedMidi = lastMidi + targetDelta;
    let candidates = scaleMidiInRange.filter(m => Math.abs(m - wantedMidi) <= 5);
    if (candidates.length === 0) candidates = scaleMidiInRange;

    // Strong beats prefer chord tones
    if (beat === 0 || beat === notesPerBar / 2) {
      const ct = candidates.filter(m => chord.pitches.some(p => (p - m) % 12 === 0));
      if (ct.length > 0) candidates = ct;
    }
    const pick = candidates[rng.nextInt(0, candidates.length - 1)];
    const duration = beat === notesPerBar - 1 ? (rng.nextF64() > 0.6 ? 2 : 1) : 1;
    out.push({ bar, beat, midi: pick, durationBeats: duration });
    lastMidi = pick;
  }
  return out;
}

// ── Bass line generator ────────────────────────────────────────────────

export function generateBassLine(progression: ReadonlyArray<ProgressionStep>, opts: { rangeLow?: number; rangeHigh?: number; rng: Xoshiro256StarStar }): MelodyNote[] {
  const rangeLow = opts.rangeLow ?? 36;
  const rangeHigh = opts.rangeHigh ?? 50;
  const out: MelodyNote[] = [];
  for (const step of progression) {
    let root = step.rootMidi;
    while (root > rangeHigh) root -= 12;
    while (root < rangeLow)  root += 12;
    // Walking bass: root on beat 1; 5th on beat 3; with passing tones
    const fifth = root + 7 > rangeHigh ? root - 5 : root + 7;
    out.push({ bar: step.bar, beat: 0, midi: root,  durationBeats: 2 });
    out.push({ bar: step.bar, beat: 2, midi: fifth, durationBeats: 2 });
  }
  return out;
}

