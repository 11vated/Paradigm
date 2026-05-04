import { create } from 'zustand';

interface HistoryState<T> {
  past: T[];
  future: T[];
}

interface UndoRedoActions<T> {
  setState: (state: T) => void;
  undo: () => void;
  redo: () => void;
  clear: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;
}

type UndoRedoStore<T> = HistoryState<T> & UndoRedoActions<T>;

export function createUndoRedoStore<T>(initialState: T, maxHistory: number = 50) {
  return create<UndoRedoStore<T>>((set, get) => ({
    past: [],
    future: [],

    setState: (newState: T) => {
      set((state) => {
        const newPast = [...state.past, newState];
        if (newPast.length > maxHistory) {
          newPast.shift();
        }
        return {
          past: newPast,
          future: [],
        };
      });
    },

    undo: () => {
      set((state) => {
        if (state.past.length === 0) return state;

        const previous = state.past[state.past.length - 1];
        const newPast = state.past.slice(0, -1);
        const newFuture = [previous, ...state.future];

        return {
          past: newPast,
          future: newFuture,
        };
      });
    },

    redo: () => {
      set((state) => {
        if (state.future.length === 0) return state;

        const next = state.future[0];
        const newFuture = state.future.slice(1);
        const newPast = [...state.past, next];

        return {
          past: newPast,
          future: newFuture,
        };
      });
    },

    clear: () => {
      set({ past: [], future: [] });
    },

    canUndo: () => get().past.length > 0,
    canRedo: () => get().future.length > 0,
  }));
}

export function undoRedoMiddleware<T extends object>(
  createFn: (fn: (state: T) => T) => void
) {
  return {
    undo: () => {
      console.log('[UndoRedo] Undo not implemented in this store');
    },
    redo: () => {
      console.log('[UndoRedo] Redo not implemented in this store');
    },
    clearHistory: () => {
      console.log('[UndoRedo] Clear not implemented in this store');
    },
  };
}