import axios from 'axios';
import { useAuthStore } from '@/stores/authStore';

const API_URL = import.meta.env.VITE_BACKEND_URL || (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000');
const api = axios.create({ baseURL: `${API_URL}/api`, timeout: 30000 });

// ─── JWT Interceptor ─────────────────────────────────────────────────────────
api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ─── Response Interceptor: Token Refresh + Retry ─────────────────────────────
let isRefreshing = false;
let failedQueue = [];

function processQueue(error, token = null) {
  failedQueue.forEach(({ resolve, reject }) => {
    if (error) reject(error);
    else resolve(token);
  });
  failedQueue = [];
}

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Token expired — try refresh
    if (error.response?.status === 401 && !originalRequest._retry) {
      const store = useAuthStore.getState();
      const refreshToken = store.refreshToken;

      // If we have a refresh token and haven't tried yet
      if (refreshToken && store.isAuthenticated) {
        if (isRefreshing) {
          // Queue this request while refresh is in progress
          return new Promise((resolve, reject) => {
            failedQueue.push({ resolve, reject });
          }).then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return api(originalRequest);
          });
        }

        originalRequest._retry = true;
        isRefreshing = true;

        try {
          const { data } = await axios.post(`${API_URL}/api/auth/refresh`, { refreshToken });
          store.setTokens(data.token, data.refreshToken);
          processQueue(null, data.token);
          originalRequest.headers.Authorization = `Bearer ${data.token}`;
          return api(originalRequest);
        } catch (refreshError) {
          processQueue(refreshError, null);
          store.logout();
          return Promise.reject(refreshError);
        } finally {
          isRefreshing = false;
        }
      }

      // No refresh token — logout
      if (store.isAuthenticated) store.logout();
    }

    return Promise.reject(error);
  }
);

// ─── Retry with Exponential Backoff (network errors, 500s, 429s) ─────────────
api.interceptors.response.use(undefined, async (error) => {
  const config = error.config;
  if (!config) return Promise.reject(error);

  config._retryCount = config._retryCount || 0;
  const maxRetries = config._maxRetries || 3;

  const status = error.response?.status;
  const isRetryable = !error.response || status === 429 || status === 502 || status === 503 || status === 504;

  if (isRetryable && config._retryCount < maxRetries) {
    config._retryCount++;
    const delay = Math.min(1000 * Math.pow(2, config._retryCount - 1), 8000);

    // For 429, use server's Retry-After if available
    const retryAfter = error.response?.headers?.['retry-after'];
    const waitMs = retryAfter ? parseInt(retryAfter) * 1000 : delay;

    await new Promise(resolve => setTimeout(resolve, waitMs));
    return api(config);
  }

  return Promise.reject(error);
});

export { api };

// ─── Auth ─────────────────────────────────────────────────────────────────────
export const register = (username, password) =>
  api.post('/auth/register', { username, password }).then(r => r.data);

export const login = (username, password) =>
  api.post('/auth/login', { username, password }).then(r => r.data);

// ─── Seeds ────────────────────────────────────────────────────────────────────
export const createSeed = (data) => api.post('/seeds', data).then(r => r.data);
export const listSeeds = (params) => api.get('/seeds', { params }).then(r => r.data);
export const getSeed = (id) => api.get(`/seeds/${id}`).then(r => r.data);
export const deleteSeed = (id) => api.delete(`/seeds/${id}`).then(r => r.data);

// ─── Generation ──────────────────────────────────────────────────────────────
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

// ─── Seed Distance ───────────────────────────────────────────────────────────
export const seedDistance = (seedAId, seedBId) =>
  api.post('/seeds/distance', { seed_a_id: seedAId, seed_b_id: seedBId }).then(r => r.data);

// ─── Sovereignty ──────────────────────────────────────────────────────────────
export const generateKeys = () => api.post('/keys/generate').then(r => r.data);
export const signSeed = (id, privateKey) =>
  api.post(`/seeds/${id}/sign`, { private_key: privateKey }).then(r => r.data);
export const verifySeed = (id, publicKey) =>
  api.post(`/seeds/${id}/verify`, { public_key: publicKey }).then(r => r.data);

// ─── On-Chain NFT Minting ────────────────────────────────────────────────────
export const mintSeed = (id, ownerAddress, privateKey, ipfsGateway) =>
  api.post(`/seeds/${id}/mint`, {
    owner_address: ownerAddress,
    private_key: privateKey || undefined,
    ipfs_gateway: ipfsGateway || undefined,
  }).then(r => r.data);

export const getNftInfo = (id) =>
  api.get(`/seeds/${id}/nft`).then(r => r.data);

export const getSeedPortraitUrl = (id) =>
  `${API_URL}/api/seeds/${id}/portrait`;

export const getContractSource = () =>
  api.get('/contract/source').then(r => r.data);

// ─── GSPL ─────────────────────────────────────────────────────────────────────
export const parseGSPL = (source) => api.post('/gspl/parse', { source }).then(r => r.data);
export const executeGSPL = (source) => api.post('/gspl/execute', { source }).then(r => r.data);

// ─── Native Agent ─────────────────────────────────────────────────────────────
export const agentQuery = (query) =>
  api.post('/agent/query', { query }).then(r => r.data);

export const agentHelp = () =>
  api.get('/agent/help').then(r => r.data);

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
export const getHealth = () => axios.get(`${API_URL}/health`).then(r => r.data);
