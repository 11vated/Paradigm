/**
 * PARADIGM API CLIENT
 * Unified API client for all frontend-backend communication
 * Handles authentication, seed operations, evolution, and more
 */

const API_BASE = import.meta.env.VITE_API_URL || '/api';

interface ApiOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  body?: unknown;
  headers?: Record<string, string>;
}

class ParadigmApi {
  private token: string | null = null;

  setToken(token: string | null) {
    this.token = token;
    if (token) {
      localStorage.setItem('paradigm_token', token);
    } else {
      localStorage.removeItem('paradigm_token');
    }
  }

  getToken(): string | null {
    if (!this.token) {
      this.token = localStorage.getItem('paradigm_token');
    }
    return this.token;
  }

  private async request<T>(endpoint: string, options: ApiOptions = {}): Promise<T> {
    const { method = 'GET', body, headers = {} } = options;

    const config: RequestInit = {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(this.token ? { Authorization: `Bearer ${this.token}` } : {}),
        ...headers,
      },
    };

    if (body) {
      config.body = JSON.stringify(body);
    }

    const response = await fetch(`${API_BASE}${endpoint}`, config);

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Request failed' }));
      throw new Error(error.message || `HTTP ${response.status}`);
    }

    return response.json();
  }

  // ─────────────────────────────────────────────────────────────────────────
  // AUTH
  // ─────────────────────────────────────────────────────────────────────────

  async register(email: string, password: string, name?: string) {
    return this.request<{ user: any; accessToken: string; refreshToken: string }>('/auth/register', {
      method: 'POST',
      body: { email, password, name },
    });
  }

  async login(email: string, password: string) {
    return this.request<{ user: any; accessToken: string; refreshToken: string }>('/auth/login', {
      method: 'POST',
      body: { email, password },
    });
  }

  async refreshToken(refreshToken: string) {
    return this.request<{ accessToken: string }>('/auth/refresh', {
      method: 'POST',
      body: { refreshToken },
    });
  }

  async logout() {
    return this.request('/auth/logout', { method: 'POST' });
  }

  // ─────────────────────────────────────────────────────────────────────────
  // SEEDS
  // ─────────────────────────────────────────────────────────────────────────

  async createSeed(domain: string, genes: Record<string, any>, name?: string) {
    return this.request<{ seed: any }>('/seeds', {
      method: 'POST',
      body: { domain, genes, name },
    });
  }

  async getSeed(id: string) {
    return this.request<{ seed: any }>(`/seeds/${id}`);
  }

  async listSeeds(params?: { domain?: string; page?: number; limit?: number }) {
    const query = new URLSearchParams();
    if (params?.domain) query.set('domain', params.domain);
    if (params?.page) query.set('page', String(params.page));
    if (params?.limit) query.set('limit', String(params.limit));
    return this.request<{ seeds: any[]; total: number }>(`/seeds?${query}`);
  }

  async deleteSeed(id: string) {
    return this.request(`/seeds/${id}`, { method: 'DELETE' });
  }

  // ─────────────────────────────────────────────────────────────────────────
  // GENETIC OPERATIONS
  // ─────────────────────────────────────────────────────────────────────────

  async mutateSeed(seedId: string, intensity: number = 0.15) {
    return this.request<{ seed: any }>(`/seeds/${seedId}/mutate`, {
      method: 'POST',
      body: { intensity },
    });
  }

  async breedSeeds(parent1Id: string, parent2Id: string) {
    return this.request<{ child: any }>('/seeds/breed', {
      method: 'POST',
      body: { parent1Id, parent2Id },
    });
  }

  async evolveSeed(seedId: string, config: {
    populationSize?: number;
    generationLimit?: number;
    mutationRate?: number;
    fitnessFn?: string;
  }) {
    return this.request<{ result: any }>(`/seeds/${seedId}/evolve`, {
      method: 'POST',
      body: config,
    });
  }

  // ─────────────────────────────────────────────────────────────────────────
  // GROWTH (Artifact Generation)
  // ─────────────────────────────────────────────────────────────────────────

  async growSeed(seedId: string) {
    return this.request<{ artifact: any }>(`/seeds/${seedId}/grow`, {
      method: 'POST',
    });
  }

  // ─────────────────────────────────────────────────────────────────────────
  // COMPOSITION
  // ─────────────────────────────────────────────────────────────────────────

  async composeSeed(seedId: string, targetDomain: string) {
    return this.request<{ composedSeed: any }>(`/seeds/${seedId}/compose`, {
      method: 'POST',
      body: { targetDomain },
    });
  }

  async getCompositionGraph() {
    return this.request<{ nodes: string[]; edges: any[] }>('/composition/graph');
  }

  async findCompositionPath(sourceDomain: string, targetDomain: string) {
    return this.request<{ path: any[] }>('/composition/path', {
      method: 'POST',
      body: { sourceDomain, targetDomain },
    });
  }

  // ─────────────────────────────────────────────────────────────────────────
  // GSPL
  // ─────────────────────────────────────────────────────────────────────────

  async parseGspl(code: string) {
    return this.request<{ ast: any; errors: any[]; types: any }>('/gspl/parse', {
      method: 'POST',
      body: { code },
    });
  }

  async executeGspl(ast: any, context?: any) {
    return this.request<{ result: any; output: any[]; newSeeds: any[] }>('/gspl/execute', {
      method: 'POST',
      body: { ast, context },
    });
  }

  // ─────────────────────────────────────────────────────────────────────────
  // AGENT
  // ─────────────────────────────────────────────────────────────────────────

  async queryAgent(prompt: string, seedContext?: string, tools?: string[]) {
    return this.request<{ message: string; generatedSeed?: any; toolCalls?: any[] }>('/agent/query', {
      method: 'POST',
      body: { prompt, seedContext, tools },
    });
  }

  async agentReason(prompt: string, seedContext?: string, tools?: string[]) {
    return this.request<{ stream: boolean }>('/agent/reason', {
      method: 'POST',
      body: { prompt, seedContext, tools },
    });
  }

  // ─────────────────────────────────────────────────────────────────────────
  // SEARCH
  // ─────────────────────────────────────────────────────────────────────────

  async searchSeeds(query: string, options?: {
    domain?: string;
    minFitness?: number;
    page?: number;
    limit?: number;
  }) {
    return this.request<{ seeds: any[]; total: number }>('/seeds/search', {
      method: 'POST',
      body: { query, ...options },
    });
  }

  async getSimilarSeeds(seedId: string, limit: number = 10) {
    return this.request<{ seeds: any[] }>(`/seeds/${seedId}/similar`, {
      method: 'POST',
      body: { limit },
    });
  }

  // ─────────────────────────────────────────────────────────────────────────
  // SOVEREIGNTY
  // ─────────────────────────────────────────────────────────────────────────

  async signSeed(seedId: string) {
    return this.request<{ signature: string }>(`/seeds/${seedId}/sign`, {
      method: 'POST',
    });
  }

  async verifySeed(seedId: string, signature: string) {
    return this.request<{ valid: boolean }>(`/seeds/${seedId}/verify`, {
      method: 'POST',
      body: { signature },
    });
  }

  async mintSeed(seedId: string) {
    return this.request<{ tokenId: string; txHash: string }>(`/nft/mint`, {
      method: 'POST',
      body: { seedId },
    });
  }

  // ─────────────────────────────────────────────────────────────────────────
  // HEALTH & METRICS
  // ─────────────────────────────────────────────────────────────────────────

  async healthCheck() {
    return this.request<{ status: string; timestamp: number }>('/health');
  }

  async readinessCheck() {
    return this.request<{ ready: boolean; services: Record<string, boolean> }>('/ready');
  }

  async getMetrics() {
    return this.request<{ metrics: any }>('/metrics');
  }
}

export const api = new ParadigmApi();
export default api;