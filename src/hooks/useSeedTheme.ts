/**
 * useSeedTheme — deterministically derive a 6-channel UI palette from a
 * seed's content hash, plus a resonance frequency.
 *
 * IMPORTANT (determinism contract):
 *  - This hook NEVER calls Math.random.
 *  - It uses Xoshiro256StarStar.fork('ui') so the kernel's RNG state is
 *    not perturbed by UI rendering.
 *  - Same seed.$hash + same code → byte-identical theme.
 *
 * The "color spectrum materializing into matter" effect comes from these
 * six channels feeding the Resonance HUD CSS variables.
 */
import { useMemo } from 'react';
import { rngFromHash } from '@/lib/kernel/rng';

export interface SeedTheme {
  core: string;       // primary resonance hue
  resonant: string;   // second harmonic
  gradA: string;      // lower gradient
  gradB: string;      // upper gradient
  warm: string;       // accent warm
  cool: string;       // accent cool
  /** Visual-only frequency in Hz, scaled to feel right (60..480). */
  resonanceHz: number;
  /** Display label, e.g. "C#3". */
  resonanceNote: string;
}

const NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

const hslToCss = (h: number, s: number, l: number): string =>
  `hsl(${Math.round(h)} ${Math.round(s)}% ${Math.round(l)}%)`;

/**
 * Synthesize a coherent palette from a hash. Channels are spaced on a colour
 * wheel with deterministic jitter so different seeds feel distinct but
 * never garish.
 */
export function deriveSeedTheme(hash: string | null | undefined): SeedTheme {
  const safeHash = hash && hash.length > 0
    ? hash
    : '0000000000000000000000000000000000000000000000000000000000000001';

  // Fork off a UI-dedicated stream so we never disturb the kernel's RNG state.
  const rng = rngFromHash(safeHash).fork('ui-theme');

  const baseHue = rng.nextInt(0, 359);
  const accentSpread = 24 + rng.nextInt(0, 24);   // 24..48 degrees
  const harmonicOffset = 130 + rng.nextInt(0, 80); // 130..210
  const sat = 62 + rng.nextInt(0, 18);             // 62..80%
  const lit = 56 + rng.nextInt(0, 8);              // 56..64%

  const h = (n: number) => ((n % 360) + 360) % 360;

  const core =     hslToCss(h(baseHue),                                sat,      lit);
  const resonant = hslToCss(h(baseHue + harmonicOffset),               sat - 4,  lit + 2);
  const gradA =    hslToCss(h(baseHue - accentSpread),                 sat - 12, lit + 4);
  const gradB =    hslToCss(h(baseHue + accentSpread),                 sat - 8,  lit + 4);
  const warm =     hslToCss(h(baseHue + 18 + rng.nextInt(0, 12)),      sat - 6,  lit);
  const cool =     hslToCss(h(baseHue + 200 + rng.nextInt(-12, 12)),   sat - 4,  lit + 4);

  // Resonance: a "frequency" tied to the seed. We scale 60..480 Hz so the
  // CSS prism animation has visibly different cadence per seed without
  // becoming epileptic.
  const resonanceHz = 60 + rng.nextInt(0, 420);
  const noteIdx = rng.nextInt(0, NOTES.length - 1);
  const octave = 2 + rng.nextInt(0, 3);
  const resonanceNote = `${NOTES[noteIdx]}${octave}`;

  return { core, resonant, gradA, gradB, warm, cool, resonanceHz, resonanceNote };
}

export function useSeedTheme(hash: string | null | undefined): SeedTheme {
  return useMemo(() => deriveSeedTheme(hash), [hash]);
}

/** CSS variable map suitable for spreading onto a wrapper element. */
export function themeToCssVars(theme: SeedTheme): Record<string, string> {
  return {
    '--r-prism-core':         theme.core,
    '--r-prism-resonant':     theme.resonant,
    '--r-prism-grad-a':       theme.gradA,
    '--r-prism-grad-b':       theme.gradB,
    '--r-prism-warm':         theme.warm,
    '--r-prism-cool':         theme.cool,
    '--r-prism-resonance-hz': String(theme.resonanceHz),
  };
}
