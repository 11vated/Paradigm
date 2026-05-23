/**
 * activeSeed — the seed currently in focus across the entire shell.
 *
 * The whole UI (TopBar prism, CenterStage silhouette, AgentPanel context,
 * visualizers, theme) is a deterministic projection of this one object.
 */
import { create } from 'zustand';

export interface ActiveSeed {
  id: string;
  name: string;
  domain: string;
  hash: string;
  /** Optional — surfaced in the silhouette bar when known. */
  contractScore?: number;
  signature?: 'unsigned' | 'signed' | 'verified' | 'invalid';
  anchor?: 'none' | 'prepared' | 'minted';
  generation?: number;
  /** Free-form blob for the kernel; UI never inspects this. */
  raw?: unknown;
}

interface ActiveSeedState {
  seed: ActiveSeed | null;
  setSeed: (seed: ActiveSeed | null) => void;
  patchSeed: (patch: Partial<ActiveSeed>) => void;
}

/**
 * The default sentinel seed — hash drives the default Resonance HUD palette
 * before the user has chosen anything. Deterministic across sessions.
 */
export const DEFAULT_SEED: ActiveSeed = {
  id: 'paradigm:genesis',
  name: 'Paradigm Genesis',
  domain: 'character',
  hash: '0000000000000000000000000000000000000000000000000000000000000001',
  generation: 0,
};

export const useActiveSeed = create<ActiveSeedState>((set) => ({
  /** null until first grow — drives empty-state magic moment. */
  seed: null,
  setSeed: (seed) => set({ seed }),
  patchSeed: (patch) =>
    set((s) => (s.seed ? { seed: { ...s.seed, ...patch } } : s)),
}));

(window as any).useActiveSeed = useActiveSeed;