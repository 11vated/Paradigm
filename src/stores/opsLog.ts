import { create } from "zustand";
export type OpStatus = "ok" | "error" | "pending";
export interface OpEntry {
  id: string;
  method: string;
  path: string;
  startedAt: number;
  ms?: number;
  status: OpStatus;
  statusCode?: number;
  error?: string;
  bytes?: number;
}
interface State {
  entries: OpEntry[];
  start: (method: string, path: string) => string;
  finish: (id: string, patch: Partial<OpEntry>) => void;
  clear: () => void;
}
const MAX = 200;
let _seq = 0;
export const useOpsLog = create<State>((set) => ({
  entries: [],
  start: (method, path) => {
    const id = "op-" + (++_seq);
    set((s) => ({
      entries: [{ id, method, path, startedAt: Date.now(), status: "pending" as OpStatus }, ...s.entries].slice(0, MAX),
    }));
    return id;
  },
  finish: (id, patch) => {
    set((s) => ({
      entries: s.entries.map((e) => (e.id === id ? { ...e, ...patch } : e)),
    }));
  },
  clear: () => set({ entries: [] }),
}));
if (typeof window !== "undefined") (window as any).__paradigm = { ...((window as any).__paradigm || {}), opsLog: useOpsLog };
