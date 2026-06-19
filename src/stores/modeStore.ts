/**
 * modeStore — focus lens for the studio.
 *
 * Tracks which stratum lens the user is focused on. This drives AgentPanel
 * context and LeftRail StrataRadar highlighting. CenterStage ignores it —
 * the artifact viewport is always the same regardless of lens.
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const MODES = ['atelier'] as const;

export type Mode = typeof MODES[number];

export const MODE_LABEL: Record<Mode, string> = {
  atelier: 'Atelier',
};

export const MODE_HINT: Record<Mode, string> = {
  atelier: 'creative workspace — shape, mutate, and refine',
};

interface ModeState {
  mode: Mode;
  setMode: (m: Mode) => void;
}

export const useMode = create<ModeState>()(
  persist(
    (set) => ({
      mode: 'atelier',
      setMode: (mode) => set({ mode }),
    }),
    { name: 'paradigm.lens' },
  ),
);
