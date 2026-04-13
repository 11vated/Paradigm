import { create } from 'zustand';

const STORAGE_KEY = 'paradigm_gallery';

function loadGallery() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch { return []; }
}

function persistGallery(gallery) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(gallery)); } catch {}
}

export const useSeedStore = create((set, get) => ({
  currentSeed: null,
  gallery: loadGallery(),
  artifact: null,
  loading: false,
  keys: null,

  setCurrentSeed: (seed) => set({ currentSeed: seed }),
  setGallery: (gallery) => { persistGallery(gallery); set({ gallery }); },
  addToGallery: (seed) => {
    const current = get().gallery;
    const exists = current.find(s => s.id === seed.id);
    if (!exists) {
      const updated = [...current, seed];
      persistGallery(updated);
      set({ gallery: updated });
    }
  },
  setArtifact: (artifact) => set({ artifact }),
  setLoading: (loading) => set({ loading }),
  setKeys: (keys) => set({ keys }),
  clearCurrentSeed: () => set({ currentSeed: null, artifact: null }),
}));
