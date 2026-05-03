/**
 * API Service - Frontend to Backend communication
 * Minimal implementation that works with minimal server
 */

const API_BASE = process.env.VITE_API_URL || 'http://localhost:3000';

// Helper: make API request
async function apiRequest(endpoint: string, options: RequestInit = {}) {
  const url = `${API_BASE}${endpoint}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(error.error || `HTTP ${response.status}`);
  }

  return response.json();
}

// ─── Seeds API ───────────────────────────────────────────────
export async function listSeeds(params?: { domain?: string; limit?: number }) {
  const query = new URLSearchParams();
  if (params?.domain) query.set('domain', params.domain);
  if (params?.limit) query.set('limit', params.limit.toString());

  const response = await apiRequest(`/api/seeds?${query}`);
  return response.seeds || [];
}

export async function getSeed(id: string) {
  const response = await apiRequest(`/api/seeds/${id}`);
  return response;
}

export async function createSeed(data: { phrase?: string; domain?: string; prompt?: string }) {
  const response = await apiRequest('/api/seeds', {
    method: 'POST',
    body: JSON.stringify(data),
  });
  return response.seed || response;
}

export async function deleteSeed(id: string) {
  await apiRequest(`/api/seeds/${id}`, { method: 'DELETE' });
  return true;
}

// ─── Generation API ─────────────────────────────────────────
export async function generateSeed(prompt: string, domain: string = 'character') {
  const response = await apiRequest('/api/seeds/generate', {
    method: 'POST',
    body: JSON.stringify({ prompt, domain }),
  });
  return response.seed || response;
}

export async function growSeed(id: string) {
  const response = await apiRequest(`/api/seeds/${id}/grow`, {
    method: 'POST',
  });
  return response.artifact || response;
}

export async function mutateSeed(id: string, genes?: Record<string, any>) {
  const response = await apiRequest(`/api/seeds/${id}/mutate`, {
    method: 'POST',
    body: JSON.stringify({ genes }),
  });
  return response.seed || response;
}

export async function evolveSeed(id: string, config?: {
  populationSize?: number;
  generations?: number;
  mutationRate?: number;
}) {
  const response = await apiRequest(`/api/seeds/${id}/evolve`, {
    method: 'POST',
    body: JSON.stringify(config),
  });
  return response;
}

export async function breedSeeds(id1: string, id2: string) {
  const response = await apiRequest('/api/seeds/breed', {
    method: 'POST',
    body: JSON.stringify({ seed1: id1, seed2: id2 }),
  });
  return response.child || response;
}

export async function updateGene(id: string, geneName: string, value: any) {
  const response = await apiRequest(`/api/seeds/${id}/genes/${geneName}`, {
    method: 'PUT',
    body: JSON.stringify({ value }),
  });
  return response;
}

// ─── GSPL API ──────────────────────────────────────────────
export async function parseGSPL(code: string) {
  const response = await apiRequest('/api/gspl/parse', {
    method: 'POST',
    body: JSON.stringify({ code }),
  });
  return response;
}

export async function executeGSPL(program: string) {
  const response = await apiRequest('/api/gspl/execute', {
    method: 'POST',
    body: JSON.stringify({ program }),
  });
  return response;
}

// ─── Agent API ─────────────────────────────────────────────
export async function agentQuery(query: string) {
  const response = await apiRequest('/api/agent/query', {
    method: 'POST',
    body: JSON.stringify({ query }),
  });
  return response;
}

// ─── Auth API ──────────────────────────────────────────────
export async function register(email: string, password: string) {
  const response = await apiRequest('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  return response;
}

export async function login(email: string, password: string) {
  const response = await apiRequest('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  return response;
}

// ─── Keys & Signing ───────────────────────────────────────
export async function generateKeys() {
  const response = await apiRequest('/api/keys/generate', {
    method: 'POST',
  });
  return response;
}

export async function signSeed(id: string) {
  const response = await apiRequest(`/api/seeds/${id}/sign`, {
    method: 'POST',
  });
  return response;
}

export async function verifySeed(id: string) {
  const response = await apiRequest(`/api/seeds/${id}/verify`);
  return response;
}

// ─── NFT/Mint ─────────────────────────────────────────────
export async function mintSeed(id: string, options?: { price?: string; royalty?: number }) {
  const response = await apiRequest(`/api/seeds/${id}/mint`, {
    method: 'POST',
    body: JSON.stringify(options),
  });
  return response;
}

export async function getNftInfo(id: string) {
  const response = await apiRequest(`/api/seeds/${id}/nft`);
  return response;
}

export async function getSeedPortraitUrl(id: string) {
  return `${API_BASE}/api/seeds/${id}/portrait`;
}
