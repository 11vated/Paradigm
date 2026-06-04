/**
 * modeStore — center stage mode (1..10).
 *
 * Modes are deterministic projections of the active seed. Switching modes
 * never edits seed state; it only changes which lens the user sees.
 *
 * 1 → Crucible    (the seed in its native medium)
 * 2 → Atelier     (crucible + floating tool panels)
 * 3 → Anatomy     (gene fluid sliders)
 * 4 → Resonance   (frequency field)
 * 5 → Lineage     (family tree)
 * 6 → Codex       (live GSPL source)
 * 7 → Topology    (functor neighborhood)
 * 8 → Evolution   (MAP-Elites live quality-diversity archive)
 * 9 → Substrate   (7-dimensional reality renderer)
 * 10 → Sovereignty (provenance, signature, export)
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
  crucible:    'seed in its native medium',
  atelier:     'crucible + floating tools',
  anatomy:     'gene-fluid composition',
  resonance:   'frequency field',
  lineage:     'family hyperobject',
  codex:       'live GSPL inscription',
  topology:    'functor neighborhood',
  evolution:   'MAP-Elites quality-diversity archive',
  substrate:   '7-dimensional reality renderer',
  sovereignty: 'provenance · signature · export',
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
      mode: 'atelier',  // PRIMARY / DEFAULT / ALWAYS-ON per 13_ doctrine v2: Atelier (unified main creative workspace) for normal users. Not Crucible. Crucible is internal lens only. All normal flows surface in Atelier + live 9-strata HUD + provenance everywhere.
      setMode: (mode) => set({ mode }),
    }),
    { name: 'paradigm.mode' },
  ),
);
