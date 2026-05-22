/**
 * layoutStore — three-pane sizes + focus modes, persisted to localStorage.
 *
 * Pane widths are stored as percentages of the viewport so the ratio is
 * preserved when the window resizes.
 */
import { create } from 'zustand';

const KEY = 'paradigm.realityOS.layout.v1';

interface LayoutShape {
  /** % of viewport, must sum < 100. center = 100 - left - agent. */
  leftPct: number;
  agentPct: number;
  /** Reduced chrome for deep-focus work. */
  focusMode: 'normal' | 'calm' | 'agent-fullscreen';
  /** The user's choice, persisted; respected unless OS overrides. */
  reducedMotion: boolean;
}

const DEFAULTS: LayoutShape = {
  leftPct: 18,
  agentPct: 28,
  /** Magic-first: left rail collapsed until user expands (cmd+\). */
  focusMode: 'calm',
  reducedMotion: false,
};

const load = (): LayoutShape => {
  if (typeof window === 'undefined') return DEFAULTS;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return DEFAULTS;
    return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch {
    return DEFAULTS;
  }
};

const save = (s: LayoutShape) => {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    /* ignore quota / privacy errors */
  }
};

interface LayoutStore extends LayoutShape {
  setPanes: (left: number, agent: number) => void;
  setFocus: (mode: LayoutShape['focusMode']) => void;
  setReducedMotion: (v: boolean) => void;
  reset: () => void;
}

export const useLayout = create<LayoutStore>((set, get) => {
  const initial = load();
  return {
    ...initial,
    setPanes: (leftPct, agentPct) => {
      const next = {
        ...get(),
        leftPct: Math.max(8, Math.min(40, leftPct)),
        agentPct: Math.max(20, Math.min(50, agentPct)),
      } as LayoutShape;
      set(next);
      save(next);
    },
    setFocus: (focusMode) => {
      const next = { ...get(), focusMode } as LayoutShape;
      set(next);
      save(next);
    },
    setReducedMotion: (reducedMotion) => {
      const next = { ...get(), reducedMotion } as LayoutShape;
      set(next);
      save(next);
    },
    reset: () => {
      set(DEFAULTS);
      save(DEFAULTS);
    },
  };
});
