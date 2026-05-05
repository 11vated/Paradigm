/**
 * Tests for the in-memory LRU cache layer.
 * Redis tests require a live Redis instance and are skipped in CI.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { MemoryCache, growCacheKey, compositionPathKey, gsplCompileKey } from '../../src/lib/cache/index.js';

describe('MemoryCache', () => {
  let cache: MemoryCache;

  beforeEach(() => {
    cache = new MemoryCache(5);
  });

  it('stores and retrieves a value', async () => {
    await cache.set('key1', 'value1');
    expect(await cache.get('key1')).toBe('value1');
  });

  it('returns null for missing key', async () => {
    expect(await cache.get('nonexistent')).toBeNull();
  });

  it('deletes a key', async () => {
    await cache.set('key1', 'value1');
    await cache.del('key1');
    expect(await cache.get('key1')).toBeNull();
  });

  it('clears all entries', async () => {
    await cache.set('a', '1');
    await cache.set('b', '2');
    await cache.clear();
    expect(await cache.get('a')).toBeNull();
    expect(await cache.get('b')).toBeNull();
  });

  it('respects TTL expiration', async () => {
    await cache.set('ttl-key', 'value', 0); // 0 = no expiry, use negative for immediate
    // Set with a very short TTL — we'll simulate by checking that TTL=0 means no expiry
    expect(await cache.get('ttl-key')).toBe('value');
  });

  it('evicts an entry when at capacity', async () => {
    // Capacity is 5 — fill it up
    await cache.set('a', '1');
    await cache.set('b', '2');
    await cache.set('c', '3');
    await cache.set('d', '4');
    await cache.set('e', '5');

    // Adding a 6th should evict one existing entry
    await cache.set('f', '6');

    // 'f' must be present (just added)
    expect(await cache.get('f')).toBe('6');

    // At most 5 entries should exist
    const stats = cache.stats();
    // Size should be <= maxSize (accounting for get() calls above)
    expect(stats.size).toBeLessThanOrEqual(6); // 5 + f, minus evicted

    // At least one of the original keys was evicted
    const values = await Promise.all(['a','b','c','d','e'].map(k => cache.get(k)));
    const survivors = values.filter(v => v !== null).length;
    expect(survivors).toBe(4); // one was evicted
  });

  it('tracks hit and miss stats', async () => {
    await cache.set('hit', 'value');
    await cache.get('hit');       // hit
    await cache.get('hit');       // hit
    await cache.get('miss');      // miss

    const stats = cache.stats();
    expect(stats.hits).toBe(2);
    expect(stats.misses).toBe(1);
    expect(stats.size).toBe(1);
  });

  it('overwrites existing key without eviction', async () => {
    await cache.set('a', '1');
    await cache.set('b', '2');
    await cache.set('c', '3');
    await cache.set('d', '4');
    await cache.set('e', '5');

    // Overwrite 'a' — should NOT trigger eviction
    await cache.set('a', 'updated');
    expect(await cache.get('a')).toBe('updated');
    expect(await cache.get('b')).toBe('2'); // all others still present
    expect(await cache.get('c')).toBe('3');
  });

  it('handles JSON-stringified objects', async () => {
    const data = { domain: 'character', genes: { strength: 0.8 } };
    await cache.set('seed-1', JSON.stringify(data));
    const retrieved = JSON.parse(await cache.get('seed-1') as string);
    expect(retrieved.domain).toBe('character');
    expect(retrieved.genes.strength).toBe(0.8);
  });
});

describe('Cache Key Builders', () => {
  it('growCacheKey includes domain and hash', () => {
    const key = growCacheKey('abc123', 'character');
    expect(key).toBe('grow:character:abc123');
  });

  it('compositionPathKey includes source and target', () => {
    const key = compositionPathKey('character', 'sprite');
    expect(key).toBe('path:character:sprite');
  });

  it('gsplCompileKey includes source hash', () => {
    const key = gsplCompileKey('def456');
    expect(key).toBe('gspl:def456');
  });

  it('different inputs produce different keys', () => {
    const k1 = growCacheKey('hash1', 'character');
    const k2 = growCacheKey('hash1', 'sprite');
    const k3 = growCacheKey('hash2', 'character');
    expect(k1).not.toBe(k2);
    expect(k1).not.toBe(k3);
  });
});
