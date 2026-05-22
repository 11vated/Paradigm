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
    return this.request<any>('/auth/register', {
      method: 'POST',
      body: { email, password, name },
    });
  }

  async login(email: string, password: string) {
    return this.request<any>('/auth/login', {
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
    return this.request<any>('/seeds', {
      method: 'POST',
      body: { domain, genes, name },
    });
  }

  async getSeed(id: string) {
    return this.request<any>(`/seeds/${id}`);
  }

  async listSeeds(params?: { domain?: string; page?: number; limit?: number }) {
    const query = new URLSearchParams();
    if (params?.domain) query.set('domain', params.domain);
    if (params?.page) query.set('page', String(params.page));
    if (params?.limit) query.set('limit', String(params.limit));
    return this.request<{ seeds: any[]; pagination: { total: number } }>(`/seeds?${query}`);
  }

  async deleteSeed(id: string) {
    return this.request<{ deleted: boolean }>(`/seeds/${id}`, { method: 'DELETE' });
  }

  // ─────────────────────────────────────────────────────────────────────────
  // GENETIC OPERATIONS
  // ─────────────────────────────────────────────────────────────────────────

  async mutateSeed(seedId: string, intensity: number = 0.15) {
    return this.request<any>(`/seeds/${seedId}/mutate`, {
      method: 'POST',
      body: { intensity },
    });
  }

  async breedSeeds(parent1Id: string, parent2Id: string) {
    return this.request<any>('/seeds/breed', {
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
    return this.request<{ population: any[]; count: number; algorithm: string }>(`/seeds/${seedId}/evolve`, {
      method: 'POST',
      body: config,
    });
  }

  // ─────────────────────────────────────────────────────────────────────────
  // GROWTH (Artifact Generation)
  // ─────────────────────────────────────────────────────────────────────────

  async growSeed(seedId: string) {
    return this.request<any>(`/seeds/${seedId}/grow`, {
      method: 'POST',
    });
  }

  // ─────────────────────────────────────────────────────────────────────────
  // COMPOSITION
  // ─────────────────────────────────────────────────────────────────────────

  async composeSeed(seedId: string, targetDomain: string) {
    return this.request<{ seed: any; path: { path: string[]; cost: number; coherence: number } }>(`/seeds/${seedId}/compose`, {
      method: 'POST',
      body: { targetDomain },
    });
  }

  async getCompositionGraph() {
    return this.request<any>('/composition/graph');
  }

  async findCompositionPath(sourceDomain: string, targetDomain: string) {
    const query = new URLSearchParams({ source: sourceDomain, target: targetDomain });
    return this.request<{ path: any[]; cost: number; coherence: number }>(`/composition/path?${query}`);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // GSPL
  // ─────────────────────────────────────────────────────────────────────────

  async parseGspl(code: string) {
    return this.request<{ ast: any; errors: string[]; warnings: any[]; stats: { tokens: number; declarations: number } }>('/gspl/parse', {
      method: 'POST',
      body: { code },
    });
  }

  async executeGspl(ast: any, context?: any) {
    return this.request<{ seeds: any[]; errors: any[]; output: any[]; stats: { seeds_created: number; operations: number } }>('/gspl/execute', {
      method: 'POST',
      body: { ast, context },
    });
  }

  // ─────────────────────────────────────────────────────────────────────────
  // AGENT
  // ─────────────────────────────────────────────────────────────────────────

  async queryAgent(prompt: string, seedContext?: string, tools?: string[]) {
    return this.request<{ success: boolean; message: string; intent?: string; data?: any; plan?: any }>('/agent/query', {
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
    const params = new URLSearchParams();
    if (query) params.set('q', query);
    if (options?.domain) params.set('domain', options.domain);
    if (options?.page) params.set('page', String(options.page));
    if (options?.limit) params.set('limit', String(options.limit));
    return this.request<{ seeds: any[]; pagination: { total: number } }>(`/seeds?${params}`);
  }

  async getSimilarSeeds(seedId: string, limit: number = 10) {
    const query = new URLSearchParams({ limit: String(limit) });
    return this.request<any[]>(`/seeds/${seedId}/similar?${query}`);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // SOVEREIGNTY
  // ─────────────────────────────────────────────────────────────────────────

  async signSeed(seedId: string) {
    return this.request<{ sovereignty: any; verified: boolean }>(`/seeds/${seedId}/sign`, {
      method: 'POST',
    });
  }

  async verifySeed(seedId: string, signature: string) {
    return this.request<{ verified: boolean }>(`/seeds/${seedId}/verify`, {
      method: 'POST',
      body: { signature },
    });
  }

  async mintSeed(seedId: string) {
    return this.request<{ tokenId?: string; txHash?: string; dry_run?: boolean; metadataUri?: string }>(`/seeds/${seedId}/mint`, {
      method: 'POST',
    });
  }

  // ─────────────────────────────────────────────────────────────────────────
  // HEALTH & METRICS
  // ─────────────────────────────────────────────────────────────────────────

  async healthCheck() {
    return this.request<{ status: string; uptime_seconds: number; version: string }>('/health');
  }

  async readinessCheck() {
    return this.request<any>('/ready');
  }

  async getMetrics() {
    return this.request<any>('/metrics');
  }
}

export const api = new ParadigmApi();
export default api;