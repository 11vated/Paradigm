/**
 * In-memory LRU cache + key builders for grow / composition / GSPL compile paths.
 * Redis-backed implementation can replace initCache/getCache without changing key helpers.
 */

export interface CacheEntry<T = unknown> {
  value: T;
  expiresAt?: number;
}

type LruEntry = {
  value: string;
  expiresAt?: number;
};

export class MemoryCache {
  private readonly maxSize: number;
  private readonly map = new Map<string, LruEntry>();
  private order: string[] = [];
  private hits = 0;
  private misses = 0;

  constructor(maxSize = 100) {
    this.maxSize = Math.max(1, maxSize);
  }

  private touch(key: string): void {
    this.order = this.order.filter((k) => k !== key);
    this.order.push(key);
  }

  private evictIfNeeded(): void {
    while (this.map.size >= this.maxSize && this.order.length > 0) {
      const oldest = this.order.shift();
      if (oldest) this.map.delete(oldest);
    }
  }

  async get(key: string): Promise<string | null> {
    const entry = this.map.get(key);
    if (!entry) {
      this.misses++;
      return null;
    }
    if (entry.expiresAt !== undefined && Date.now() > entry.expiresAt) {
      this.map.delete(key);
      this.order = this.order.filter((k) => k !== key);
      this.misses++;
      return null;
    }
    this.touch(key);
    this.hits++;
    return entry.value;
  }

  async set(key: string, value: string, ttlSec = 0): Promise<void> {
    const expiresAt =
      ttlSec > 0 ? Date.now() + ttlSec * 1000 : undefined;

    if (this.map.has(key)) {
      this.map.set(key, { value, expiresAt });
      this.touch(key);
      return;
    }

    this.evictIfNeeded();
    this.map.set(key, { value, expiresAt });
    this.touch(key);
  }

  async del(key: string): Promise<void> {
    this.map.delete(key);
    this.order = this.order.filter((k) => k !== key);
  }

  async clear(): Promise<void> {
    this.map.clear();
    this.order = [];
  }

  stats(): { hits: number; misses: number; size: number } {
    return { hits: this.hits, misses: this.misses, size: this.map.size };
  }
}

const memoryCache = new Map<string, CacheEntry>();

export function initCache(_config?: { redisUrl?: string; defaultTtlMs?: number }) {
  const api = {
    backend: 'memory' as const,
    stats: () => ({ hits: 0, misses: 0, size: memoryCache.size }),
    get: <T>(key: string): T | undefined => {
      const e = memoryCache.get(key);
      if (!e) return undefined;
      if (e.expiresAt && Date.now() > e.expiresAt) {
        memoryCache.delete(key);
        return undefined;
      }
      return e.value as T;
    },
    set: <T>(key: string, value: T, ttlMs?: number) => {
      memoryCache.set(key, {
        value,
        expiresAt: ttlMs ? Date.now() + ttlMs : undefined,
      });
    },
    del: (key: string) => memoryCache.delete(key),
    clear: () => memoryCache.clear(),
    getAsync: async <T>(key: string): Promise<T | null> => (api.get(key) ?? null) as T | null,
    setAsync: async (key: string, v: string, ttl?: number) => {
      api.set(key, v, ttl);
    },
  };
  return api;
}

export function getCache() {
  return initCache();
}

export function growCacheKey(hash: string, domain: string): string {
  return `grow:${domain}:${hash}`;
}

export function compositionPathKey(source: string, target: string): string {
  return `path:${source}:${target}`;
}

export function gsplCompileKey(sourceHash: string): string {
  return `gspl:${sourceHash}`;
}
