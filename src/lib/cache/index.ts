/**
 * Cache Layer — In-memory LRU cache with optional Redis backing.
 * ─────────────────────────────────────────────────────────────────────────────
 * When REDIS_URL is set, uses Redis for distributed caching.
 * Otherwise falls back to a simple in-memory LRU cache (per-process).
 *
 * Used to cache expensive engine grow results, composition paths, and GSPL
 * compilation outputs. Cache keys are derived from seed hashes + operation.
 *
 * ZERO external dependency — the Redis client is implemented inline using
 * Node's net module (RESP protocol), so no npm package is needed.
 */

import net from 'net';

// ─── Cache Interface ─────────────────────────────────────────────────────────

export interface CacheLayer {
  backend: 'memory' | 'redis';
  get(key: string): Promise<string | null>;
  set(key: string, value: string, ttlSeconds?: number): Promise<void>;
  del(key: string): Promise<void>;
  clear(): Promise<void>;
  stats(): { hits: number; misses: number; size: number };
}

// ─── In-Memory LRU Cache ─────────────────────────────────────────────────────

interface CacheEntry {
  value: string;
  expiresAt: number;       // ms since epoch; 0 = never
  lastAccessed: number;
}

export class MemoryCache implements CacheLayer {
  backend = 'memory' as const;
  private store = new Map<string, CacheEntry>();
  private maxSize: number;
  private _hits = 0;
  private _misses = 0;

  constructor(maxSize = 1000) {
    this.maxSize = maxSize;
  }

  async get(key: string): Promise<string | null> {
    const entry = this.store.get(key);
    if (!entry) { this._misses++; return null; }
    if (entry.expiresAt && Date.now() > entry.expiresAt) {
      this.store.delete(key);
      this._misses++;
      return null;
    }
    entry.lastAccessed = Date.now();
    this._hits++;
    return entry.value;
  }

  async set(key: string, value: string, ttlSeconds = 0): Promise<void> {
    // Evict LRU if at capacity
    if (this.store.size >= this.maxSize && !this.store.has(key)) {
      this.evictLRU();
    }
    this.store.set(key, {
      value,
      expiresAt: ttlSeconds > 0 ? Date.now() + ttlSeconds * 1000 : 0,
      lastAccessed: Date.now(),
    });
  }

  async del(key: string): Promise<void> {
    this.store.delete(key);
  }

  async clear(): Promise<void> {
    this.store.clear();
  }

  stats() {
    return { hits: this._hits, misses: this._misses, size: this.store.size };
  }

  private evictLRU(): void {
    let oldestKey: string | null = null;
    let oldestTime = Infinity;
    for (const [key, entry] of this.store) {
      if (entry.lastAccessed < oldestTime) {
        oldestTime = entry.lastAccessed;
        oldestKey = key;
      }
    }
    if (oldestKey) this.store.delete(oldestKey);
  }
}

// ─── Minimal Redis Client (RESP protocol over TCP) ──────────────────────────

class MinimalRedis {
  private host: string;
  private port: number;
  private connected = false;
  private socket: net.Socket | null = null;
  private pending: Array<{ resolve: (v: string | null) => void; reject: (e: Error) => void }> = [];
  private buffer = '';

  constructor(url: string) {
    const parsed = new URL(url);
    this.host = parsed.hostname || '127.0.0.1';
    this.port = parseInt(parsed.port || '6379', 10);
  }

  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Redis connection timeout')), 5000);
      this.socket = net.createConnection({ host: this.host, port: this.port }, () => {
        clearTimeout(timeout);
        this.connected = true;
        resolve();
      });
      this.socket.on('data', (data) => this.onData(data.toString()));
      this.socket.on('error', (err) => {
        clearTimeout(timeout);
        this.connected = false;
        reject(err);
      });
      this.socket.on('close', () => { this.connected = false; });
    });
  }

  private onData(data: string): void {
    this.buffer += data;
    // Simple RESP parser: handle single-line replies
    while (this.buffer.includes('\r\n')) {
      const idx = this.buffer.indexOf('\r\n');
      const line = this.buffer.slice(0, idx);
      this.buffer = this.buffer.slice(idx + 2);

      const handler = this.pending.shift();
      if (!handler) continue;

      if (line.startsWith('+')) {
        handler.resolve(line.slice(1));
      } else if (line.startsWith('-')) {
        handler.reject(new Error(line.slice(1)));
      } else if (line.startsWith(':')) {
        handler.resolve(line.slice(1));
      } else if (line.startsWith('$')) {
        const len = parseInt(line.slice(1), 10);
        if (len === -1) {
          handler.resolve(null);
        } else {
          // Need to read the bulk string data
          if (this.buffer.length >= len + 2) {
            const value = this.buffer.slice(0, len);
            this.buffer = this.buffer.slice(len + 2);
            handler.resolve(value);
          } else {
            // Not enough data yet, push handler back
            this.pending.unshift(handler);
            break;
          }
        }
      } else {
        handler.resolve(line);
      }
    }
  }

  private send(args: string[]): Promise<string | null> {
    if (!this.connected || !this.socket) {
      return Promise.reject(new Error('Not connected'));
    }
    return new Promise((resolve, reject) => {
      this.pending.push({ resolve, reject });
      const cmd = `*${args.length}\r\n` + args.map(a => `$${Buffer.byteLength(a)}\r\n${a}\r\n`).join('');
      this.socket!.write(cmd);
    });
  }

  async get(key: string): Promise<string | null> {
    return this.send(['GET', key]);
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    if (ttlSeconds && ttlSeconds > 0) {
      await this.send(['SET', key, value, 'EX', String(ttlSeconds)]);
    } else {
      await this.send(['SET', key, value]);
    }
  }

  async del(key: string): Promise<void> {
    await this.send(['DEL', key]);
  }

  async flushdb(): Promise<void> {
    await this.send(['FLUSHDB']);
  }

  async dbsize(): Promise<number> {
    const result = await this.send(['DBSIZE']);
    return parseInt(result || '0', 10);
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.destroy();
      this.socket = null;
    }
    this.connected = false;
  }
}

// ─── Redis-backed Cache ──────────────────────────────────────────────────────

export class RedisCache implements CacheLayer {
  backend = 'redis' as const;
  private client: MinimalRedis;
  private prefix: string;
  private _hits = 0;
  private _misses = 0;

  constructor(url: string, prefix = 'paradigm:') {
    this.client = new MinimalRedis(url);
    this.prefix = prefix;
  }

  async connect(): Promise<void> {
    await this.client.connect();
  }

  private key(k: string): string { return `${this.prefix}${k}`; }

  async get(key: string): Promise<string | null> {
    try {
      const val = await this.client.get(this.key(key));
      if (val === null) { this._misses++; } else { this._hits++; }
      return val;
    } catch {
      this._misses++;
      return null;
    }
  }

  async set(key: string, value: string, ttlSeconds = 300): Promise<void> {
    try {
      await this.client.set(this.key(key), value, ttlSeconds);
    } catch {}
  }

  async del(key: string): Promise<void> {
    try {
      await this.client.del(this.key(key));
    } catch {}
  }

  async clear(): Promise<void> {
    try {
      await this.client.flushdb();
    } catch {}
  }

  stats() {
    return { hits: this._hits, misses: this._misses, size: -1 }; // size unknown without DBSIZE
  }

  disconnect(): void {
    this.client.disconnect();
  }
}

// ─── Cache Factory ───────────────────────────────────────────────────────────

let _cache: CacheLayer | null = null;

/**
 * Initialize the cache layer. Uses Redis if REDIS_URL is set, else in-memory LRU.
 */
export async function initCache(): Promise<CacheLayer> {
  if (_cache) return _cache;

  const redisUrl = process.env.REDIS_URL;
  if (redisUrl) {
    try {
      const cache = new RedisCache(redisUrl);
      await cache.connect();
      console.log(`[CACHE] Connected to Redis: ${redisUrl.replace(/\/\/:[^@]+@/, '//***@')}`);
      _cache = cache;
      return cache;
    } catch (err: any) {
      console.warn(`[CACHE] Redis connection failed: ${err.message}. Using in-memory cache.`);
    }
  }

  const cache = new MemoryCache(2000);
  console.log('[CACHE] Using in-memory LRU cache (set REDIS_URL for Redis)');
  _cache = cache;
  return cache;
}

/**
 * Get the current cache instance.
 */
export function getCache(): CacheLayer {
  if (!_cache) {
    // Auto-init with memory cache if not explicitly initialized
    _cache = new MemoryCache(2000);
  }
  return _cache;
}

// ─── Cache Key Builders ──────────────────────────────────────────────────────

export function growCacheKey(seedHash: string, domain: string): string {
  return `grow:${domain}:${seedHash}`;
}

export function compositionPathKey(source: string, target: string): string {
  return `path:${source}:${target}`;
}

export function gsplCompileKey(sourceHash: string): string {
  return `gspl:${sourceHash}`;
}
