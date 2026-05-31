/**
 * Minimal Cache Layer stub (for server.ts typecheck during 15_ completion).
 * Real LRU/Redis implementation can be swapped in later without changing call sites.
 */

export interface CacheEntry<T = any> {
  value: T;
  expiresAt?: number;
}

const memoryCache = new Map<string, CacheEntry>();

export function initCache(config?: { redisUrl?: string; defaultTtlMs?: number }) {
  // In-memory fallback only for now (satisfies server + route call sites)
  const api = {
    backend: 'memory',
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
    // Async shims for routes that expect Promise forms
    getAsync: async <T>(key: string): Promise<T | null> => (api.get(key) ?? null) as any,
    setAsync: async (key: string, v: string, ttl?: number) => { api.set(key, v as any, ttl); },
  };
  return api;
}

export function getCache() {
  const api = initCache();
  return api;
}

export function growCacheKey(...parts: (string | number)[]): string {
  return 'grow:' + parts.filter(Boolean).join(':');
}

export function compositionPathKey(seedId: string, layer?: string): string {
  return layer ? `comp:${seedId}:${layer}` : `comp:${seedId}`;
}
