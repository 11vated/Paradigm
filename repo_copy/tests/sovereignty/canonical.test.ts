/**
 * Phase 7.3 — canonical seed digest tests.
 *
 * The canonical digest is the keystone of the whole sovereignty layer: every
 * signer, anchor, and verifier assumes it produces byte-identical output for
 * two seeds that should be treated as "the same". These tests pin the exact
 * invariants we rely on downstream.
 */
import { describe, it, expect } from 'vitest';
import {
  canonicalizeSeed,
  seedDigestHex,
  seedDigestBytes32,
} from '../../src/lib/sovereignty/canonical.js';

describe('canonicalizeSeed — determinism', () => {
  it('produces byte-identical output across re-runs', () => {
    const seed = { $domain: 'character', genes: { a: { type: 'scalar', value: 0.5 } } };
    const a = canonicalizeSeed(seed);
    const b = canonicalizeSeed(seed);
    expect(a.canonicalJson).toBe(b.canonicalJson);
    expect(a.digest).toBe(b.digest);
  });

  it('is independent of insertion order', () => {
    const a = canonicalizeSeed({ b: 2, a: 1, c: 3 });
    const b = canonicalizeSeed({ c: 3, a: 1, b: 2 });
    expect(a.canonicalJson).toBe(b.canonicalJson);
    expect(a.digest).toBe(b.digest);
  });

  it('recurses through nested objects when sorting', () => {
    const a = canonicalizeSeed({ outer: { z: 1, a: 2 }, alpha: 'x' });
    const b = canonicalizeSeed({ alpha: 'x', outer: { a: 2, z: 1 } });
    expect(a.canonicalJson).toBe(b.canonicalJson);
  });

  it('preserves array order (arrays are ordered by definition)', () => {
    const a = canonicalizeSeed({ xs: [3, 1, 2] });
    const b = canonicalizeSeed({ xs: [1, 2, 3] });
    expect(a.canonicalJson).not.toBe(b.canonicalJson);
  });
});

describe('canonicalizeSeed — stripping', () => {
  it('strips $hash so a cached hash does not affect the digest', () => {
    const a = canonicalizeSeed({ genes: { x: 1 } });
    const b = canonicalizeSeed({ genes: { x: 1 }, $hash: 'deadbeef' });
    expect(a.digest).toBe(b.digest);
  });

  it('strips $owner so ownership transfers do not change identity', () => {
    const base = { genes: { x: 1 }, $domain: 'character' };
    const a = canonicalizeSeed({ ...base, $owner: 'alice' });
    const b = canonicalizeSeed({ ...base, $owner: 'bob' });
    expect(a.digest).toBe(b.digest);
  });

  it('strips $sovereignty so signing does not change the thing being signed', () => {
    const base = { genes: { x: 1 } };
    const a = canonicalizeSeed(base);
    const b = canonicalizeSeed({ ...base, $sovereignty: { signature: '0xabc', signer: 'alice' } });
    expect(a.digest).toBe(b.digest);
  });

  it('strips $lineage timestamps but preserves generation + parent hashes', () => {
    const base = {
      genes: { x: 1 },
      $lineage: {
        generation: 3,
        parents: ['deadbeef', 'cafebabe'],
        operation: 'cross',
      },
    };
    const a = canonicalizeSeed({
      ...base,
      $lineage: { ...base.$lineage, created_at: '2026-04-14T00:00:00Z' },
    });
    const b = canonicalizeSeed({
      ...base,
      $lineage: { ...base.$lineage, created_at: '1999-01-01T00:00:00Z' },
    });
    expect(a.digest).toBe(b.digest);
    // But generation change must change the digest.
    const c = canonicalizeSeed({ ...base, $lineage: { ...base.$lineage, generation: 4 } });
    expect(c.digest).not.toBe(a.digest);
  });

  it('does NOT strip timestamps outside of $lineage (they might be content)', () => {
    const a = canonicalizeSeed({ created_at: 't1' });
    const b = canonicalizeSeed({ created_at: 't2' });
    expect(a.digest).not.toBe(b.digest);
  });
});

describe('canonicalizeSeed — number edge cases', () => {
  it('normalizes -0 to 0', () => {
    const a = canonicalizeSeed({ x: -0 });
    const b = canonicalizeSeed({ x: 0 });
    expect(a.digest).toBe(b.digest);
  });

  it('rejects NaN', () => {
    expect(() => canonicalizeSeed({ x: NaN })).toThrow(/non-finite/);
  });

  it('rejects +Infinity', () => {
    expect(() => canonicalizeSeed({ x: Infinity })).toThrow(/non-finite/);
  });

  it('rejects -Infinity', () => {
    expect(() => canonicalizeSeed({ x: -Infinity })).toThrow(/non-finite/);
  });

  it('accepts very small and very large finite numbers', () => {
    const a = canonicalizeSeed({ tiny: 1e-300, big: 1e300 });
    expect(a.digest).toMatch(/^[0-9a-f]{64}$/);
  });

  it('reports the path of the bad number', () => {
    expect(() => canonicalizeSeed({ deeply: { nested: { x: NaN } } })).toThrow(/deeply\.nested\.x/);
  });
});

describe('canonicalizeSeed — type handling', () => {
  it('coerces undefined to null', () => {
    const a = canonicalizeSeed({ x: undefined });
    const b = canonicalizeSeed({ x: null });
    expect(a.canonicalJson).toBe(b.canonicalJson);
  });

  it('serializes bigint as string', () => {
    const a = canonicalizeSeed({ id: 123456789012345678901234567890n });
    expect(a.canonicalJson).toContain('"123456789012345678901234567890"');
  });

  it('rejects functions', () => {
    expect(() => canonicalizeSeed({ f: () => 1 })).toThrow(/unsupported type/);
  });

  it('rejects symbols', () => {
    expect(() => canonicalizeSeed({ s: Symbol('x') })).toThrow(/unsupported type/);
  });
});

describe('seedDigestHex / seedDigestBytes32', () => {
  it('seedDigestHex returns 64 lowercase hex chars', () => {
    const h = seedDigestHex({ x: 1 });
    expect(h).toMatch(/^[0-9a-f]{64}$/);
  });

  it('seedDigestBytes32 returns 0x-prefixed 66 chars', () => {
    const b = seedDigestBytes32({ x: 1 });
    expect(b.startsWith('0x')).toBe(true);
    expect(b.length).toBe(66);
    expect(b.slice(2)).toMatch(/^[0-9a-f]{64}$/);
  });

  it('two different seeds produce different digests', () => {
    expect(seedDigestHex({ x: 1 })).not.toBe(seedDigestHex({ x: 2 }));
  });
});
