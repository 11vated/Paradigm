import { create } from 'zustand';

export const useSeedStore = create((set, get) => ({
  currentSeed: null,
  gallery: [],
  artifact: null,
  loading: false,
  error: null,
  keys: null,
  pagination: null,

  setCurrentSeed: (seed) => set({ currentSeed: seed, error: null }),
  setGallery: (gallery) => set({ gallery }),
  addToGallery: (seed) => {
    const current = get().gallery;
    const exists = current.find(s => s.id === seed.id);
    if (!exists) set({ gallery: [...current, seed] });
  },
  removeFromGallery: (id) => {
    set({ gallery: get().gallery.filter(s => s.id !== id) });
  },
  setArtifact: (artifact) => set({ artifact }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => {
    set({ error, loading: false });
    // Auto-clear error after 8 seconds
    if (error) setTimeout(() => set(s => s.error === error ? { error: null } : {}), 8000);
  },
  clearError: () => set({ error: null }),
  setKeys: (keys) => set({ keys }),
  setPagination: (pagination) => set({ pagination }),
  clearCurrentSeed: () => set({ currentSeed: null, artifact: null, error: null }),
}));
