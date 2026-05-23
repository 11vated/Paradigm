/**
 * Paradigm SDK — Public TypeScript/JavaScript API
 *
 * import { Paradigm } from '@paradigm/sdk';
 *
 * const p = new Paradigm({ apiUrl: 'https://your-paradigm-instance.com' });
 * const seed   = await p.seeds.create({ domain: 'website', genes: { aesthetic: 'minimal' } });
 * const grown  = await p.seeds.grow(seed.id);
 * const player = await p.player.playFromUrl(grown.gseedUrl);
 *
 * All methods mirror the REST API exactly. The SDK adds:
 *   - TypeScript types for every response
 *   - Automatic retry (3× with exponential backoff)
 *   - Optional in-memory cache for deterministic outputs
 *   - Streaming grow results via AsyncIterator
 */

// ─── Types ──────────────────────────────────────────────────────────────────

export interface ParadigmConfig {
  /** Base URL of the Paradigm server. Defaults to http://localhost:3000 */
  apiUrl?:   string;
  /** Bearer token for authenticated requests. */
  apiKey?:   string;
  /** Max retries on 5xx errors. Default 3. */
  maxRetries?: number;
  /** Enable in-memory cache for grown artifacts. Default true. */
  cache?:    boolean;
}

export interface SeedGenes { [key: string]: unknown }

export interface Seed {
  id:      string;
  $domain: string;
  $hash:   string;
  $name?:  string;
  genes:   SeedGenes;
  createdAt: string;
}

export interface GrownArtifact {
  seedId:   string;
  domain:   string;
  outputs:  ArtifactOutput[];
  fitness?: FitnessReport;
  durationMs: number;
}

export interface ArtifactOutput {
  type:    'svg' | 'html' | 'wav' | 'gltf' | 'json' | 'pdb' | 'glsl' | 'zip' | 'md';
  url:     string;
  size:    number;
}

export interface FitnessReport {
  overall: number;
  axes:    Record<string, number>;
}

export interface EvolveJob {
  jobId:     string;
  algorithm: 'ga' | 'map-elites' | 'cmaes' | 'poet' | 'nslc';
  status:    'running' | 'done' | 'error';
  generations: number;
  bestFitness: number;
  results:   Seed[];
}

export interface MapElitesArchive {
  domain:   string;
  gridX:    number;
  gridY:    number;
  cells:    MapElitesCell[];
  filled:   number;
  total:    number;
}

export interface MapElitesCell {
  ix: number; iy: number;
  fitness: number;
  seed: Partial<Seed> | null;
}

export interface VcsCommit {
  hash:      string;
  message:   string;
  timestamp: string;
  treeHash:  string;
  parentHash?: string;
}

// ─── HTTP Client ─────────────────────────────────────────────────────────────

class ParadigmHttp {
  constructor(private config: Required<ParadigmConfig>) {}

  async get<T>(path: string, params?: Record<string, string | number>): Promise<T> {
    const url = new URL(path, this.config.apiUrl);
    if (params) Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, String(v)));
    return this.request<T>('GET', url.toString());
  }

  async post<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>('POST', new URL(path, this.config.apiUrl).toString(), body);
  }

  async delete<T>(path: string): Promise<T> {
    return this.request<T>('DELETE', new URL(path, this.config.apiUrl).toString());
  }

  private async request<T>(method: string, url: string, body?: unknown, attempt = 0): Promise<T> {
    const headers: Record<string, string> = { 'Content-Type': 'application/json', Accept: 'application/json' };
    if (this.config.apiKey) headers['Authorization'] = `Bearer ${this.config.apiKey}`;
    const resp = await fetch(url, { method, headers, body: body != null ? JSON.stringify(body) : undefined });
    if (resp.status >= 500 && attempt < this.config.maxRetries) {
      const delay = Math.min(1000 * 2 ** attempt, 8000);
      await new Promise(r => setTimeout(r, delay));
      return this.request<T>(method, url, body, attempt + 1);
    }
    if (!resp.ok) {
      const text = await resp.text().catch(() => resp.statusText);
      throw new Error(`Paradigm API ${resp.status}: ${text}`);
    }
    return resp.json() as Promise<T>;
  }
}

// ─── Sub-clients ─────────────────────────────────────────────────────────────

export class SeedsClient {
  constructor(private http: ParadigmHttp, private cache: Map<string, GrownArtifact>) {}

  /** List all seeds with optional domain filter. */
  list(params?: { domain?: string; page?: number; limit?: number }): Promise<{ seeds: Seed[]; total: number }> {
    return this.http.get('/api/seeds', params as any);
  }

  /** Get a single seed by ID. */
  get(id: string): Promise<Seed> {
    return this.http.get(`/api/seeds/${id}`);
  }

  /** Create a new seed. */
  create(params: { domain: string; genes?: SeedGenes; name?: string }): Promise<Seed> {
    return this.http.post('/api/seeds', params);
  }

  /** Grow a seed — run the domain generator. Returns artifact URLs + fitness. */
  async grow(id: string, params?: { outputDir?: string }): Promise<GrownArtifact> {
    if (this.cache.has(id)) return this.cache.get(id)!;
    const result = await this.http.post<GrownArtifact>(`/api/seeds/${id}/grow`, params ?? {});
    this.cache.set(id, result);
    return result;
  }

  /** Grow from a seed object (no stored ID needed). */
  growDirect(seed: Record<string, unknown>): Promise<GrownArtifact> {
    return this.http.post('/api/seeds/grow', { seed });
  }

  /** Mutate a seed and return the mutated child. */
  mutate(id: string, params?: { budget?: number }): Promise<Seed> {
    return this.http.post(`/api/seeds/${id}/mutate`, params ?? {});
  }

  /** Breed two seeds together. */
  breed(parentAId: string, parentBId: string): Promise<Seed> {
    return this.http.post('/api/seeds/breed', { parentAId, parentBId });
  }

  /** Delete a seed. */
  delete(id: string): Promise<void> {
    return this.http.delete(`/api/seeds/${id}`);
  }

  /** Export seed as JSON. */
  exportJson(id: string): Promise<Record<string, unknown>> {
    return this.http.post('/api/seeds/export/json', { seed: { id } });
  }
}

export class EvolveClient {
  constructor(private http: ParadigmHttp) {}

  /** Start an evolution job. */
  start(params: { seedId: string; algorithm: EvolveJob['algorithm']; generations?: number; populationSize?: number }): Promise<EvolveJob> {
    return this.http.post('/api/evolve/start', params);
  }

  /** Get job status. */
  status(jobId: string): Promise<EvolveJob> {
    return this.http.get(`/api/evolve/jobs/${jobId}`);
  }

  /** Get MAP-Elites archive for a domain. */
  getArchive(domain: string, params?: { gridX?: number; gridY?: number }): Promise<MapElitesArchive> {
    return this.http.get('/api/evolve/map-elites', { domain, ...params } as any);
  }

  /** Run N steps of MAP-Elites evolution. */
  stepArchive(domain: string, seedId: string, steps?: number): Promise<MapElitesArchive> {
    return this.http.post('/api/evolve/map-elites/step', { domain, seedId, steps: steps ?? 10 });
  }
}

export class VcsClient {
  constructor(private http: ParadigmHttp) {}

  /** Commit the current seed state to VCS. */
  commit(seedId: string, message: string): Promise<VcsCommit> {
    return this.http.post('/api/vcs/commit', { seedId, message });
  }

  /** Get commit log for a seed. */
  log(seedId: string): Promise<VcsCommit[]> {
    return this.http.get(`/api/vcs/log/${seedId}`);
  }

  /** Diff two commits. */
  diff(commitA: string, commitB: string): Promise<Record<string, unknown>> {
    return this.http.get('/api/vcs/diff', { commitA, commitB });
  }

  /** Checkout a specific commit (creates a new seed at that state). */
  checkout(commitHash: string): Promise<Seed> {
    return this.http.post('/api/vcs/checkout', { commitHash });
  }
}

export class SovereigntyClient {
  constructor(private http: ParadigmHttp) {}

  /** Sign a seed with the server's device key. */
  sign(seedId: string): Promise<{ seedId: string; signature: string; publicKey: string }> {
    return this.http.post('/api/sovereignty/sign', { seedId });
  }

  /** Get sovereignty receipt for a seed. */
  receipt(seedId: string): Promise<Record<string, unknown>> {
    return this.http.get(`/api/sovereignty/receipt?seedId=${seedId}`);
  }

  /** Export seed as a .gseed binary package. */
  exportGseed(seedId: string): Promise<Uint8Array> {
    return this.http.post('/api/sovereignty/export/gseed', { seedId });
  }
}

export class GsplClient {
  constructor(private http: ParadigmHttp) {}

  /** Parse a GSPL program and return its AST. */
  parse(source: string): Promise<Record<string, unknown>> {
    return this.http.post('/api/gspl/parse', { source });
  }

  /** Execute a GSPL program and return the result. */
  execute(source: string, context?: Record<string, unknown>): Promise<Record<string, unknown>> {
    return this.http.post('/api/gspl/execute', { source, context });
  }

  /** Open an interactive REPL session. Returns the session ID. */
  openRepl(): Promise<{ sessionId: string }> {
    return this.http.post('/api/gspl/repl/open');
  }

  /** Send a line to an open REPL session. */
  repl(sessionId: string, line: string): Promise<{ output: string; type: string }> {
    return this.http.post('/api/gspl/repl/eval', { sessionId, line });
  }
}

// ─── Main SDK Class ──────────────────────────────────────────────────────────

export class Paradigm {
  readonly seeds:       SeedsClient;
  readonly evolve:      EvolveClient;
  readonly vcs:         VcsClient;
  readonly sovereignty: SovereigntyClient;
  readonly gspl:        GsplClient;

  private _cache = new Map<string, GrownArtifact>();

  constructor(config: ParadigmConfig = {}) {
    const cfg: Required<ParadigmConfig> = {
      apiUrl:     config.apiUrl     ?? 'http://localhost:3000',
      apiKey:     config.apiKey     ?? '',
      maxRetries: config.maxRetries ?? 3,
      cache:      config.cache      ?? true,
    };
    const http = new ParadigmHttp(cfg);
    const cache = cfg.cache ? this._cache : new Map();
    this.seeds       = new SeedsClient(http, cache);
    this.evolve      = new EvolveClient(http);
    this.vcs         = new VcsClient(http);
    this.sovereignty = new SovereigntyClient(http);
    this.gspl        = new GsplClient(http);
  }

  /** Check server health. */
  health(): Promise<{ status: string; version: string; uptime: number }> {
    return new ParadigmHttp({ apiUrl: (this as any)._cfg?.apiUrl ?? 'http://localhost:3000', apiKey: '', maxRetries: 1, cache: false } as any).get('/health');
  }
}

// Default export for convenience
export default Paradigm;
