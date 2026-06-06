/**
 * modeStore — center stage mode (1..8 visible + 2 overflow).
 *
 * The 8 visible modes are 8 *lenses* on the same active seed — switching
 * never edits seed state, it only changes which face the user sees. Each
 * lens emphasizes a different subset of the 9 strata (see MODE_STRATA).
 *
 * Visible (compass):
 *  1 → Crucible    (the seed in its native medium)        · Form, Story
 *  2 → Atelier     (creative workspace w/ tool panels)    · Mind, Culture
 *  3 → Anatomy     (gene-fluid sliders)                   · Form, Field
 *  4 → Resonance   (frequency / sound field)               · Sound, Time
 *  5 → Lineage     (family hyperobject)                   · Time, Culture
 *  6 → Codex       (live GSPL source)                     · Mind, Story
 *  7 → Topology    (functor neighborhood)                 · World, Field
 *  8 → Evolution   (MAP-Elites quality-diversity)         · Form, Time
 *
 * Overflow (status-bar / route):
 *  9  → Substrate    (7D reality renderer)         — at /substrate
 *  10 → Sovereignty  (provenance · signature · export) — status bar
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const MODES = [
  'crucible',
  'atelier',
  'anatomy',
  'resonance',
  'lineage',
  'codex',
  'topology',
  'evolution',
  'substrate',
  'sovereignty',
] as const;

export type Mode = typeof MODES[number];

/** Modes shown in the center compass. Sovereignty + Substrate live elsewhere. */
export const COMPASS_MODES: ReadonlyArray<Mode> = [
  'crucible', 'atelier', 'anatomy', 'resonance',
  'lineage', 'codex', 'topology', 'evolution',
] as const;

export const MODE_LABEL: Record<Mode, string> = {
  crucible:    'Crucible',
  atelier:     'Atelier',
  anatomy:     'Anatomy',
  resonance:   'Resonance',
  lineage:     'Lineage',
  codex:       'Codex',
  topology:    'Topology',
  evolution:   'Evolution',
  substrate:   'Substrate',
  sovereignty: 'Sovereignty',
};

export const MODE_HINT: Record<Mode, string> = {
  crucible:    'the seed in its native medium — what does it want to be?',
  atelier:     'creative workspace — shape, mutate, and refine with floating tools',
  anatomy:     'gene-fluid composition — every gene is a continuous slider',
  resonance:   'frequency field — see the seed as sound, motion, and time',
  lineage:     'family hyperobject — ancestors, cousins, future generations',
  codex:       'live GSPL inscription — the source code that grows the seed',
  topology:    'functor neighborhood — what this seed is *adjacent* to',
  evolution:   'MAP-Elites quality-diversity — explore the design space',
  substrate:   '7-dimensional reality renderer (route /substrate)',
  sovereignty: 'provenance · signature · export (status bar)',
};

/** Dominant strata this mode emphasizes (drives StrataRadar highlighting). */
export const MODE_STRATA: Record<Mode, ReadonlyArray<string>> = {
  crucible:    ['Form', 'Story'],
  atelier:     ['Mind', 'Culture'],
  anatomy:     ['Form', 'Field'],
  resonance:   ['Sound', 'Time'],
  lineage:     ['Time', 'Culture'],
  codex:       ['Mind', 'Story'],
  topology:    ['World', 'Field'],
  evolution:   ['Form', 'Time'],
  substrate:   ['Field', 'World', 'Time'],
  sovereignty: ['Culture', 'Time'],
};

export const MODE_NUM: Record<Mode, number> = {
  crucible:    1,
  atelier:     2,
  anatomy:     3,
  resonance:   4,
  lineage:     5,
  codex:       6,
  topology:    7,
  evolution:   8,
  substrate:   9,
  sovereignty: 10,
};

interface ModeState {
  mode: Mode;
  setMode: (m: Mode) => void;
}

export const useMode = create<ModeState>()(
  persist(
    (set) => ({
      // PRIMARY / DEFAULT per 13_ doctrine v2 — Atelier is the unified
      // creative workspace for normal users. Crucible is internal-only.
      mode: 'atelier',
      setMode: (mode) => set({ mode }),
    }),
    { name: 'paradigm.mode' },
  ),
);
