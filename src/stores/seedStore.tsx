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
import { toGSPL } from '../lib/kernel/gspl-interpreter';
import { calculateStratumConformance } from '../lib/kernel/quality/predicates';

export const useSeedStore = create((set: any, get: any) => ({
  currentSeed: null,
  gallery: [],
  artifact: null,
  loading: false,
  keys: null,
  error: null,
  // GSPL supremacy live hybrid state for Atelier seamlessness (strata constraints <-> GSPL fragments <-> live conformance preview)
  strataConstraints: {
    Form: 0.75, Motion: 0.70, Sound: 0.60, Mind: 0.85, Story: 0.75,
    World: 0.65, Field: 0.70, Culture: 0.80, Time: 0.55,
  },
  gsplDraft: '',

  // ─── Gallery / Seeds ─────────────────────────────────────────────────────
  fetchSeeds: async (params: any) => {
    set({ loading: true, error: null });
    try {
      const seeds = await listSeeds(params);
      set({ gallery: seeds, loading: false });
      return seeds;
    } catch (err: any) {
      set({ error: err.message, loading: false });
      throw err;
    }
  },

  fetchSeed: async (id: any) => {
    set({ loading: true, error: null });
    try {
      const seed = await getSeed(id);
      set({ currentSeed: seed, loading: false });
      return seed;
    } catch (err: any) {
      set({ error: err.message, loading: false });
      throw err;
    }
  },

  createSeed: async (data: any) => {
    set({ loading: true, error: null });
    try {
      const seed = await createSeed(data);
      set((state: any) => ({ gallery: [seed, ...state.gallery], loading: false }));
      return seed;
    } catch (err: any) {
      set({ error: err.message, loading: false });
      throw err;
    }
  },

  removeSeed: async (id: any) => {
    set({ loading: true, error: null });
    try {
      await deleteSeed(id);
      set((state: any) => ({ gallery: state.gallery.filter((s: any) => s.id !== id), loading: false }));
    } catch (err: any) {
      set({ error: err.message, loading: false });
      throw err;
    }
  },

  // ─── Generation & Growth ─────────────────────────────────────────────────
  generateNewSeed: async (prompt: any, domain?: any) => {
    set({ loading: true, error: null });
    try {
      const seed = await generateSeed(prompt, domain);
      set((state: any) => ({ gallery: [seed, ...state.gallery], currentSeed: seed, loading: false }));
      return seed;
    } catch (err: any) {
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
    } catch (err: any) {
      set({ error: err.message, loading: false });
      throw err;
    }
  },

  growSeedById: async (id: any) => {
    set({ loading: true, error: null });
    try {
      const artifact = await growSeedApi(id);
      set({ artifact, loading: false });
      return artifact;
    } catch (err: any) {
      set({ error: err.message, loading: false });
      throw err;
    }
  },

  // ─── Mutation & Breeding ────────────────────────────────────────────────
  mutateCurrentSeed: async (rate: any = 0.1) => {
    const { currentSeed } = get();
    if (!currentSeed) return;
    set({ loading: true, error: null });
    try {
      const mutated = await mutateSeed(currentSeed.id, rate as any);
      set((state: any) => ({
        gallery: [mutated, ...state.gallery],
        currentSeed: mutated,
        loading: false,
      }));
      return mutated;
    } catch (err: any) {
      set({ error: err.message, loading: false });
      throw err;
    }
  },

  breedSeeds: async (parentAId: any, parentBId: any) => {
    set({ loading: true, error: null });
    try {
      const child = await breedSeeds(parentAId, parentBId);
      set((state: any) => ({ gallery: [child, ...state.gallery], currentSeed: child, loading: false }));
      return child;
    } catch (err: any) {
      set({ error: err.message, loading: false });
      throw err;
    }
  },

  evolveCurrentSeed: async (config: any) => {
    const { currentSeed } = get();
    if (!currentSeed) return;
    set({ loading: true, error: null });
    try {
      const evolved = await evolveSeed(currentSeed.id, config);
      set({ currentSeed: evolved, loading: false });
      return evolved;
    } catch (err: any) {
      set({ error: err.message, loading: false });
      throw err;
    }
  },

  // ─── Gene Editing ────────────────────────────────────────────────────────
  updateGene: async (geneName: any, _geneType: any, value: any) => {
    const { currentSeed } = get();
    if (!currentSeed) return;
    set({ loading: true, error: null });
    try {
      const updated = await updateGene(currentSeed.id, geneName, value);
      set({ currentSeed: updated, loading: false });
      return updated;
    } catch (err: any) {
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
    } catch (err: any) {
      set({ error: err.message, loading: false });
      throw err;
    }
  },

  signCurrentSeed: async (_privateKey: any) => {
    const { currentSeed } = get();
    if (!currentSeed) return;
    set({ loading: true, error: null });
    try {
      const result = await signSeed(currentSeed.id);
      return result;
    } catch (err: any) {
      set({ error: err.message, loading: false });
      throw err;
    }
  },

  verifyCurrentSeed: async (_publicKey: any) => {
    const { currentSeed } = get();
    if (!currentSeed) return;
    set({ loading: true, error: null });
    try {
      const result = await verifySeed(currentSeed.id);
      return result;
    } catch (err: any) {
      set({ error: err.message, loading: false });
      throw err;
    }
  },

  // ─── Minting ────────────────────────────────────────────────────────────
  mintSeed: async (ownerAddress: any) => {
    const { currentSeed } = get();
    if (!currentSeed) return;
    set({ loading: true, error: null });
    try {
      const result = await mintSeedApi(currentSeed.id, ownerAddress);
      set({ loading: false });
      return result;
    } catch (err: any) {
      set({ error: err.message, loading: false });
      throw err;
    }
  },

  getNftInfo: async () => {
    const { currentSeed } = get();
    if (!currentSeed) return null;
    try {
      return await getNftInfo(currentSeed.id);
    } catch (err: any) {
      console.error('Failed to get NFT info:', err);
      return null;
    }
  },

  getSeedPortraitUrl: (id: any) => {
    return getSeedPortraitUrl(id);
  },

  // ─── Agent ────────────────────────────────────────────────────────────
  agentQuery: async (query: any) => {
    set({ loading: true, error: null });
    try {
      const result = await agentQueryApi(query);
      return result;
    } catch (err: any) {
      set({ error: err.message, loading: false });
      throw err;
    }
  },

  // ─── GSPL ────────────────────────────────────────────────────────────
  parseGSPL: async (source: any) => {
    try {
      return await parseGSPL(source);
    } catch (err: any) {
      set({ error: err.message });
      throw err;
    }
  },

  executeGSPL: async (source: any) => {
    set({ loading: true, error: null });
    try {
      const result = await executeGSPL(source);
      return result;
    } catch (err: any) {
      set({ error: err.message, loading: false });
      throw err;
    }
  },

  // ─── Local State Setters ──────────────────────────────────────────────────
  setCurrentSeed: (seed: any) => set({ currentSeed: seed }),
  setGallery: (gallery: any) => set({ gallery }),
  addToGallery: (seed: any) => {
    const current = get().gallery;
    const exists = current.find((s: any) => s.id === seed.id);
    if (!exists) set({ gallery: [...current, seed] });
  },
  setArtifact: (artifact: any) => set({ artifact }),
  setLoading: (loading: any) => set({ loading }),
  setKeys: (keys: any) => set({ keys }),
  setError: (error: any) => set({ error }),
  clearCurrentSeed: () => set({ currentSeed: null, artifact: null, error: null }),
  clearError: () => set({ error: null }),

  // ─── GSPL + Strata Live Hybrid (Atelier seamlessness, post-supremacy wave: toGSPL/fromGSPL + executeGspl + calculateStratumConformance for live strata controls <-> GSPL fragments <-> preview impact)
  setStrataConstraint: (stratum: string, value: number) => {
    set((state: any) => ({
      strataConstraints: {
        ...state.strataConstraints,
        [stratum]: Math.max(0, Math.min(1, value)),
      },
    }));
  },
  getStrataPreviewConformance: () => {
    const state = get();
    const seed = state.currentSeed;
    if (!seed) return { overall: 0.5, perStratum: {}, conformancePercent: '50.0%' };
    const activeStrata = Object.entries(state.strataConstraints || {})
      .filter(([, v]: any) => (v as number) > 0.1)
      .map(([k]) => k);
    const mock = { ...seed, strata: activeStrata };
    try {
      return calculateStratumConformance([mock]);
    } catch {
      return { overall: 0.5, perStratum: {}, conformancePercent: '50.0%' };
    }
  },
  getStrataGsplFragment: () => {
    const state = get();
    const seed = state.currentSeed;
    if (!seed) return 'seed s1 : character { strata: Form + Mind } grow s1;';
    const activeStrata = Object.entries(state.strataConstraints || {})
      .filter(([, v]: any) => (v as number) > 0.1)
      .map(([k]) => k);
    const mock = { ...seed, strata: activeStrata };
    try {
      return toGSPL(mock);
    } catch {
      return toGSPL(seed);
    }
  },
  setGsplDraft: (code: string) => set({ gsplDraft: code }),
  getGsplDraft: () => (get() as any).gsplDraft || '',
}));
