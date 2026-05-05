import { create } from 'zustand';
import {
  listSeeds, getSeed, createSeed, deleteSeed,
  generateSeed, growSeed as growSeedApi,
  mutateSeed, breedSeeds, evolveSeed, updateGene,
  generateKeys, signSeed, verifySeed,
  mintSeed as mintSeedApi, getNftInfo, getSeedPortraitUrl,
  agentQuery as agentQueryApi,
  parseGSPL, executeGSPL,
} from '@/services/api';

export const useSeedStore = create((set, get) => ({
  currentSeed: null,
  gallery: [],
  artifact: null,
  loading: false,
  keys: null,
  error: null,

  // ─── Gallery / Seeds ─────────────────────────────────────────────────────
  fetchSeeds: async (params) => {
    set({ loading: true, error: null });
    try {
      const seeds = await listSeeds(params);
      set({ gallery: seeds, loading: false });
      return seeds;
    } catch (err) {
      set({ error: err.message, loading: false });
      throw err;
    }
  },

  fetchSeed: async (id) => {
    set({ loading: true, error: null });
    try {
      const seed = await getSeed(id);
      set({ currentSeed: seed, loading: false });
      return seed;
    } catch (err) {
      set({ error: err.message, loading: false });
      throw err;
    }
  },

  createSeed: async (data) => {
    set({ loading: true, error: null });
    try {
      const seed = await createSeed(data);
      set((state) => ({ gallery: [seed, ...state.gallery], loading: false }));
      return seed;
    } catch (err) {
      set({ error: err.message, loading: false });
      throw err;
    }
  },

  removeSeed: async (id) => {
    set({ loading: true, error: null });
    try {
      await deleteSeed(id);
      set((state) => ({ gallery: state.gallery.filter(s => s.id !== id), loading: false }));
    } catch (err) {
      set({ error: err.message, loading: false });
      throw err;
    }
  },

  // ─── Generation & Growth ─────────────────────────────────────────────────
  generateNewSeed: async (prompt, domain) => {
    set({ loading: true, error: null });
    try {
      const seed = await generateSeed(prompt, domain);
      set((state) => ({ gallery: [seed, ...state.gallery], currentSeed: seed, loading: false }));
      return seed;
    } catch (err) {
      set({ error: err.message, loading: false });
      throw err;
    }
  },

  growCurrentSeed: async () => {
    const { currentSeed } = get();
    if (!currentSeed) return;
    set({ loading: true, error: null });
    try {
      const artifact = await growSeedApi(currentSeed.id);
      set({ artifact, loading: false });
      return artifact;
    } catch (err) {
      set({ error: err.message, loading: false });
      throw err;
    }
  },

  growSeedById: async (id) => {
    set({ loading: true, error: null });
    try {
      const artifact = await growSeedApi(id);
      set({ artifact, loading: false });
      return artifact;
    } catch (err) {
      set({ error: err.message, loading: false });
      throw err;
    }
  },

  // ─── Mutation & Breeding ────────────────────────────────────────────────
  mutateCurrentSeed: async (rate = 0.1) => {
    const { currentSeed } = get();
    if (!currentSeed) return;
    set({ loading: true, error: null });
    try {
      const mutated = await mutateSeed(currentSeed.id, rate);
      set((state) => ({
        gallery: [mutated, ...state.gallery],
        currentSeed: mutated,
        loading: false,
      }));
      return mutated;
    } catch (err) {
      set({ error: err.message, loading: false });
      throw err;
    }
  },

  breedSeeds: async (parentAId, parentBId) => {
    set({ loading: true, error: null });
    try {
      const child = await breedSeeds(parentAId, parentBId);
      set((state) => ({ gallery: [child, ...state.gallery], currentSeed: child, loading: false }));
      return child;
    } catch (err) {
      set({ error: err.message, loading: false });
      throw err;
    }
  },

  evolveCurrentSeed: async (config) => {
    const { currentSeed } = get();
    if (!currentSeed) return;
    set({ loading: true, error: null });
    try {
      const evolved = await evolveSeed(currentSeed.id, config);
      set({ currentSeed: evolved, loading: false });
      return evolved;
    } catch (err) {
      set({ error: err.message, loading: false });
      throw err;
    }
  },

  // ─── Gene Editing ────────────────────────────────────────────────────────
  updateGene: async (geneName, geneType, value) => {
    const { currentSeed } = get();
    if (!currentSeed) return;
    set({ loading: true, error: null });
    try {
      const updated = await updateGene(currentSeed.id, geneName, geneType, value);
      set({ currentSeed: updated, loading: false });
      return updated;
    } catch (err) {
      set({ error: err.message, loading: false });
      throw err;
    }
  },

  // ─── Sovereignty ─────────────────────────────────────────────────────────
  generateKeys: async () => {
    set({ loading: true, error: null });
    try {
      const keys = await generateKeys();
      set({ keys, loading: false });
      return keys;
    } catch (err) {
      set({ error: err.message, loading: false });
      throw err;
    }
  },

  signCurrentSeed: async (privateKey) => {
    const { currentSeed } = get();
    if (!currentSeed) return;
    set({ loading: true, error: null });
    try {
      const result = await signSeed(currentSeed.id, privateKey);
      return result;
    } catch (err) {
      set({ error: err.message, loading: false });
      throw err;
    }
  },

  verifyCurrentSeed: async (publicKey) => {
    const { currentSeed } = get();
    if (!currentSeed) return;
    set({ loading: true, error: null });
    try {
      const result = await verifySeed(currentSeed.id, publicKey);
      return result;
    } catch (err) {
      set({ error: err.message, loading: false });
      throw err;
    }
  },

  // ─── Minting ────────────────────────────────────────────────────────────
  mintSeed: async (ownerAddress) => {
    const { currentSeed } = get();
    if (!currentSeed) return;
    set({ loading: true, error: null });
    try {
      const result = await mintSeedApi(currentSeed.id, ownerAddress);
      set({ loading: false });
      return result;
    } catch (err) {
      set({ error: err.message, loading: false });
      throw err;
    }
  },

  getNftInfo: async () => {
    const { currentSeed } = get();
    if (!currentSeed) return null;
    try {
      return await getNftInfo(currentSeed.id);
    } catch (err) {
      console.error('Failed to get NFT info:', err);
      return null;
    }
  },

  getSeedPortraitUrl: (id) => {
    return getSeedPortraitUrl(id);
  },

  // ─── Agent ────────────────────────────────────────────────────────────
  agentQuery: async (query) => {
    set({ loading: true, error: null });
    try {
      const result = await agentQueryApi(query);
      return result;
    } catch (err) {
      set({ error: err.message, loading: false });
      throw err;
    }
  },

  // ─── GSPL ────────────────────────────────────────────────────────────
  parseGSPL: async (source) => {
    try {
      return await parseGSPL(source);
    } catch (err) {
      set({ error: err.message });
      throw err;
    }
  },

  executeGSPL: async (source) => {
    set({ loading: true, error: null });
    try {
      const result = await executeGSPL(source);
      return result;
    } catch (err) {
      set({ error: err.message, loading: false });
      throw err;
    }
  },

  // ─── Local State Setters ──────────────────────────────────────────────────
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
  setError: (error) => set({ error }),
  clearCurrentSeed: () => set({ currentSeed: null, artifact: null, error: null }),
  clearError: () => set({ error: null }),
}));
