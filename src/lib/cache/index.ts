/**
 * Paradigm Cache Layer
 * Provides an LRU in-memory cache (MemoryCache) with async API plus a Redis shim.
 * All key-builder functions are exported for use by route modules.
 */

// ─── LRU MemoryCache ─────────────────────────────────────────────────────────

interface CacheEntry<T = any> {
  value: T;
  expiresAt?: number;
}

export class MemoryCache {
  private readonly maxSize: number;
  private readonly store = new Map<string, CacheEntry>();
  private _hits = 0;
  private _misses = 0;

  constructor(maxSize = 1000) {
    this.maxSize = maxSize;
  }

  async get<T = string>(key: string): Promise<T | null> {
    const entry = this.store.get(key);
    if (!entry) {
      this._misses++;
      return null;
    }
    if (entry.expiresAt && Date.now() > entry.expiresAt) {
      this.store.delete(key);
      this._misses++;
      return null;
    }
    // Move to end (LRU: most recently used)
    this.store.delete(key);
    this.store.set(key, entry);
    this._hits++;
    return entry.value as T;
  }

  async set<T = string>(key: string, value: T, ttlMs = 0): Promise<void> {
    // If key already exists, remove first to re-insert at tail
    if (this.store.has(key)) {
      this.store.delete(key);
    } else if (this.store.size >= this.maxSize) {
      // Evict oldest (first) entry
      const oldestKey = this.store.keys().next().value;
      if (oldestKey !== undefined) this.store.delete(oldestKey);
    }
    this.store.set(key, {
      value,
      expiresAt: ttlMs > 0 ? Date.now() + ttlMs : undefined,
    });
  }

  async del(key: string): Promise<void> {
    this.store.delete(key);
  }

  async clear(): Promise<void> {
    this.store.clear();
    this._hits = 0;
    this._misses = 0;
  }

  stats() {
    return { hits: this._hits, misses: this._misses, size: this.store.size };
  }
}

// ─── Singleton used by the server ────────────────────────────────────────────

const _cache = new MemoryCache(10_000);

export type CacheApi = {
  backend: 'memory' | 'redis';
  stats: () => { hits: number; misses: number; size: number };
  get: <T>(key: string) => T | undefined;
  set: <T>(key: string, value: T, ttlMs?: number) => void;
  del: (key: string) => void;
  clear: () => void;
  getAsync: <T>(key: string) => Promise<T | null>;
  setAsync: (key: string, value: string, ttl?: number) => Promise<void>;
};

/**
 * Initialize the cache layer. Returns a promise-compatible API so it can be
 * awaited in server.ts without breaking the boot sequence.
 */
export async function initCache(_config?: { redisUrl?: string; defaultTtlMs?: number }): Promise<CacheApi> {
  return {
    backend: 'memory',
    stats: () => _cache.stats(),
    get: <T>(key: string): T | undefined => {
      // Synchronous shim — wraps the async MemoryCache via a best-effort sync path
      const entry = (_cache as any).store.get(key) as CacheEntry | undefined;
      if (!entry) return undefined;
      if (entry.expiresAt && Date.now() > entry.expiresAt) {
        (_cache as any).store.delete(key);
        return undefined;
      }
      return entry.value as T;
    },
    set: <T>(key: string, value: T, ttlMs?: number) => {
      _cache.set(key, value as any, ttlMs ?? 0);
    },
    del: (key: string) => { _cache.del(key); },
    clear: () => { _cache.clear(); },
    getAsync: async <T>(key: string): Promise<T | null> => _cache.get<T>(key),
    setAsync: async (key: string, value: string, ttl?: number) => { await _cache.set(key, value, ttl); },
  };
}

export function getCache(): CacheApi {
  return {
    backend: 'memory',
    stats: () => _cache.stats(),
    get: <T>(key: string): T | undefined => {
      const entry = (_cache as any).store.get(key) as CacheEntry | undefined;
      if (!entry) return undefined;
      return entry.value as T;
    },
    set: <T>(key: string, value: T, ttlMs?: number) => { _cache.set(key, value as any, ttlMs ?? 0); },
    del: (key: string) => { _cache.del(key); },
    clear: () => { _cache.clear(); },
    getAsync: async <T>(key: string): Promise<T | null> => _cache.get<T>(key),
    setAsync: async (key: string, value: string, ttl?: number) => { await _cache.set(key, value, ttl); },
  };
}

// ─── Cache Key Builders ───────────────────────────────────────────────────────

/**
 * Key for a seed grow result: grow:<domain>:<hash>
 * (domain first so keys sort together by domain in monitoring)
 */
export function growCacheKey(hash: string, domain: string): string {
  return `grow:${domain}:${hash}`;
}

/**
 * Key for a composition path between two domains: path:<source>:<target>
 */
export function compositionPathKey(source: string, target: string): string {
  return `path:${source}:${target}`;
}

/**
 * Key for a compiled GSPL artifact: gspl:<sourceHash>
 */
export function gsplCompileKey(sourceHash: string): string {
  return `gspl:${sourceHash}`;
}
