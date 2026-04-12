import axios from 'axios';

const API_URL = import.meta.env.VITE_BACKEND_URL || (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000');
const api = axios.create({ baseURL: `${API_URL}/api`, timeout: 30000 });

export { api };

// ─── Seeds ────────────────────────────────────────────────────────────────────
export const createSeed = (data) => api.post('/seeds', data).then(r => r.data);
export const listSeeds = (params) => api.get('/seeds', { params }).then(r => r.data);
export const getSeed = (id) => api.get(`/seeds/${id}`).then(r => r.data);
export const deleteSeed = (id) => api.delete(`/seeds/${id}`).then(r => r.data);

// ─── Agent ────────────────────────────────────────────────────────────────────
export const generateSeed = (prompt, domain) =>
  api.post('/seeds/generate', { prompt, domain }).then(r => r.data);

// ─── Operations ───────────────────────────────────────────────────────────────
export const mutateSeed = (id, rate = 0.1) =>
  api.post(`/seeds/${id}/mutate`, { rate }).then(r => r.data);

export const breedSeeds = (parentAId, parentBId) =>
  api.post('/seeds/breed', { parent_a_id: parentAId, parent_b_id: parentBId }).then(r => r.data);

export const evolveSeed = (id, config) =>
  api.post(`/seeds/${id}/evolve`, config).then(r => r.data);

export const updateGene = (id, geneName, geneType, value) =>
  api.put(`/seeds/${id}/genes`, { gene_name: geneName, gene_type: geneType, value }).then(r => r.data);

export const growSeed = (id) =>
  api.post(`/pipeline/execute`, { seed_id: id }).then(r => {
    const data = r.data;
    // Map the pipeline result to the artifact structure expected by the frontend
    return {
      id: `artifact-${id}`,
      name: data.unified_seed?.$name || 'Emerged Asset',
      domain: data.unified_seed?.$domain || 'field',
      generation: data.unified_seed?.$lineage?.generation || 0,
      seed_hash: data.unified_seed?.$hash,
      type: data.unified_seed?.$domain || 'field',
      visual: {},
      stats: {},
      emergent_assets: data.emergent_assets,
      physics_summary: data.physics_summary,
      preview_slice: data.preview_slice
    };
  });

// ─── Sovereignty ──────────────────────────────────────────────────────────────
export const generateKeys = () => api.post('/keys/generate').then(r => r.data);
export const signSeed = (id, privateKey) =>
  api.post(`/seeds/${id}/sign`, { private_key: privateKey }).then(r => r.data);
export const verifySeed = (id, publicKey) =>
  api.post(`/seeds/${id}/verify`, { public_key: publicKey }).then(r => r.data);

// ─── GSPL ─────────────────────────────────────────────────────────────────────
export const parseGSPL = (source) => api.post('/gspl/parse', { source }).then(r => r.data);
export const executeGSPL = (source) => api.post('/gspl/execute', { source }).then(r => r.data);

// ─── Composition ──────────────────────────────────────────────────────────────
export const composeSeed = (id, targetDomain) =>
  api.post(`/seeds/${id}/compose`, { target_domain: targetDomain }).then(r => r.data);
export const getCompositionGraph = () => api.get('/composition/graph').then(r => r.data);
export const getCompositionPath = (source, target) =>
  api.get('/composition/path', { params: { source, target } }).then(r => r.data);

// ─── Library ──────────────────────────────────────────────────────────────────
export const getLibrary = () => api.get('/library').then(r => r.data);
export const importFromLibrary = (seedHash) =>
  api.post('/library/import', { seed_hash: seedHash }).then(r => r.data);

// ─── Intelligence ─────────────────────────────────────────────────────────────
export const generateEmbedding = (id) => api.post(`/seeds/${id}/embed`).then(r => r.data);
export const getSimilarSeeds = (id, limit = 5) => api.get(`/seeds/${id}/similar`, { params: { limit } }).then(r => r.data);

// ─── Info ─────────────────────────────────────────────────────────────────────
export const getDomains = () => api.get('/domains').then(r => r.data);
export const getGeneTypes = () => api.get('/gene-types').then(r => r.data);
export const getStats = () => api.get('/stats').then(r => r.data);
export const getEngines = () => api.get('/engines').then(r => r.data);
