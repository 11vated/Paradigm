/**
 * agentThreads — the conversational state of the GSPL agent panel.
 *
 * Threads are trees of turns. A turn can carry surfaced "cards" (Plan,
 * GSPL Source, Tool Calls, Diff, Critique, Memory, Swarm, Federation,
 * Sovereignty) emitted by the agent as it works. Branches are first-class:
 * any user turn can fork.
 */
import { create } from 'zustand';
import { kernelNow, kernelNowIso } from '@/lib/kernel/clock';

export type Role = 'user' | 'agent' | 'system';

export type CardKind =
  | 'plan'
  | 'gspl-source'
  | 'tool-calls'
  | 'diff'
  | 'critique'
  | 'memory'
  | 'swarm'
  | 'federation'
  | 'sovereignty';

export interface SurfacedCard {
  id: string;
  kind: CardKind;
  /** Free-form payload; rendered by the card component for that kind. */
  payload: unknown;
  pinned?: boolean;
}

export interface Turn {
  id: string;
  role: Role;
  /** ISO from kernelNow at emission. */
  at: string;
  text: string;
  /** Cards surfaced by this turn (only on agent turns). */
  cards?: SurfacedCard[];
  /** Streaming flag: still being written. */
  streaming?: boolean;
  /** Inference tier used for this response. */
  inferenceTier?: 'kernel' | 'fast' | 'standard' | 'deep';
  /** Pipeline trace: which stages ran and their timings (ms). */
  pipelineTrace?: Array<{ stage: string; ms: number }>;
  /** Kernel-determinism fingerprint (filled when known). */
  fingerprint?: {
    rngFork?: string;
    inputHash?: string;
    latencyMs?: number;
  };
  /** Parent turn for branching. */
  parentId?: string;
}

export interface Thread {
  id: string;
  title: string;
  /** Linear order in which turns were emitted. */
  turns: Turn[];
  /** Per-thread tool gate; false disables the tool for this thread. */
  toolGate?: Record<string, boolean>;
  createdAt: string;
}

export type AgentTier = 'kernel' | 'fast' | 'standard' | 'deep';

interface AgentThreadsState {
  threads: Thread[];
  currentThreadId: string | null;
  /** Visible lens inside the AgentPanel. */
  lens: 'conversation' | 'plan' | 'source' | 'tools' | 'memory' | 'branches';
  /** Selected inference tier for the next agent query. Persists across turns. */
  selectedTier: AgentTier;

  newThread: (title?: string) => string;
  setCurrent: (id: string) => void;
  setLens: (lens: AgentThreadsState['lens']) => void;
  setSelectedTier: (tier: AgentTier) => void;
  appendTurn: (threadId: string, turn: Turn) => void;
  patchTurn: (threadId: string, turnId: string, patch: Partial<Turn>) => void;
  forkFrom: (threadId: string, turnId: string, title?: string) => string;
}

let _idCounter = 0;
const newId = (prefix: string) =>
  `${prefix}_${kernelNow().toString(36)}_${(_idCounter++).toString(36)}`;

const seedThread = (): Thread => ({
  id: newId('thread'),
  title: 'first contact',
  turns: [
    {
      id: newId('t'),
      role: 'system',
      at: kernelNowIso(),
      text:
        'Paradigm Agent online. Talk to me about what you want to make. ' +
        'I write GSPL, grow seeds, breed, evolve, and sign — every step is deterministic.',
    },
  ],
  createdAt: kernelNowIso(),
});

export const useAgentThreads = create<AgentThreadsState>((set, get) => {
  const initial = seedThread();
  return {
    threads: [initial],
    currentThreadId: initial.id,
    lens: 'conversation',
    selectedTier: 'fast' as AgentTier,

    newThread: (title) => {
      const t: Thread = {
        ...seedThread(),
        title: title ?? 'new thread',
      };
      set((s) => ({ threads: [...s.threads, t], currentThreadId: t.id }));
      return t.id;
    },

    setCurrent: (id) => set({ currentThreadId: id }),
    setLens: (lens) => set({ lens }),
    setSelectedTier: (selectedTier) => set({ selectedTier }),

    appendTurn: (threadId, turn) =>
      set((s) => ({
        threads: s.threads.map((t) =>
          t.id === threadId ? { ...t, turns: [...t.turns, turn] } : t,
        ),
      })),

    patchTurn: (threadId, turnId, patch) =>
      set((s) => ({
        threads: s.threads.map((t) =>
          t.id === threadId
            ? {
                ...t,
                turns: t.turns.map((u) =>
                  u.id === turnId ? { ...u, ...patch } : u,
                ),
              }
            : t,
        ),
      })),

    forkFrom: (threadId, turnId, title) => {
      const src = get().threads.find((t) => t.id === threadId);
      if (!src) return threadId;
      const cutIdx = src.turns.findIndex((u) => u.id === turnId);
      if (cutIdx < 0) return threadId;
      const fork: Thread = {
        id: newId('thread'),
        title: title ?? `${src.title} · branch`,
        turns: src.turns.slice(0, cutIdx + 1).map((u) => ({ ...u })),
        toolGate: src.toolGate ? { ...src.toolGate } : undefined,
        createdAt: kernelNowIso(),
      };
      set((s) => ({ threads: [...s.threads, fork], currentThreadId: fork.id }));
      return fork.id;
    },
  };
});

export const newTurnId = () => newId('t');
export const newCardId = () => newId('card');
