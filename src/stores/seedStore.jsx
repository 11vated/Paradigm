import { create } from 'zustand';

export const useSeedStore = create((set, get) => ({
  currentSeed: null,
  gallery: [],
  artifact: null,
  loading: false,
  keys: null,

  setCurrentSeed: (seed) => set({ currentSeed: seed }),
  setGallery: (gallery) => set({ gallery }),
  addToGallery: (seed) => {
    const current = get().gallery;
    const exists = current.find(s => s.id === seed.id);
    if (!exists) set({ gallery: [...current, seed] });
  },
  setArtifact: (artifact) => set({ artifact }),
  setLoading: (loading) => set({ loading }),
  setKeys: (keys) => set({ keys }),
  clearCurrentSeed: () => set({ currentSeed: null, artifact: null }),
}));
