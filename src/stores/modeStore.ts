/**
 * modeStore — center stage mode (1..7).
 *
 * Modes are deterministic projections of the active seed. Switching modes
 * never edits seed state; it only changes which lens the user sees.
 *
 * 1 → Crucible   (the seed in its native medium)
 * 2 → Atelier    (crucible + floating tool panels)
 * 3 → Anatomy    (gene fluid sliders)
 * 4 → Resonance  (frequency field)
 * 5 → Lineage    (family tree)
 * 6 → Codex      (live GSPL source)
 * 7 → Topology   (functor neighborhood)
 */
import { create } from 'zustand';

export const MODES = [
  'crucible',
  'atelier',
  'anatomy',
  'resonance',
  'lineage',
  'codex',
  'topology',
] as const;

export type Mode = typeof MODES[number];

export const MODE_LABEL: Record<Mode, string> = {
  crucible: 'Crucible',
  atelier:  'Atelier',
  anatomy:  'Anatomy',
  resonance:'Resonance',
  lineage:  'Lineage',
  codex:    'Codex',
  topology: 'Topology',
};

export const MODE_HINT: Record<Mode, string> = {
  crucible: 'seed in its native medium',
  atelier:  'crucible + floating tools',
  anatomy:  'gene-fluid composition',
  resonance:'frequency field',
  lineage:  'family hyperobject',
  codex:    'live GSPL inscription',
  topology: 'functor neighborhood',
};

export const MODE_NUM: Record<Mode, number> = {
  crucible: 1,
  atelier:  2,
  anatomy:  3,
  resonance:4,
  lineage:  5,
  codex:    6,
  topology: 7,
};

interface ModeState {
  mode: Mode;
  setMode: (m: Mode) => void;
}

export const useMode = create<ModeState>((set) => ({
  mode: 'crucible',
  setMode: (mode) => set({ mode }),
}));
