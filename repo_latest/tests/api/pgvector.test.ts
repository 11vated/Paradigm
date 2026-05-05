/**
 * Unit tests for pgvector helpers (Phase 1.4).
 *
 * The query-executing surfaces (upsertEmbedding, findSimilar) require a
 * live Postgres with pgvector installed — those live in an integration
 * suite gated by DATABASE_URL. Here we pin the pure helpers (encode /
 * decode / pool lifecycle) so bugs in the text serialization don't slip
 * past fast feedback.
 *
 * Why test encodeVector at all: pgvector's text format is a flat
 * `[a,b,c]` — one wrong separator (e.g. `, ` instead of `,`) is accepted
 * by some pg versions and silently rejected by others. We want the
 * canonical form everywhere.
 */
import { describe, it, expect } from 'vitest';
import { encodeVector, decodeVector } from '../../src/lib/intelligence/pgvector.js';

describe('encodeVector', () => {
  it('renders floats in pgvector text form', () => {
    expect(encodeVector([0.1, 0.2, 0.3])).toBe('[0.1,0.2,0.3]');
  });

  it('rejects empty arrays', () => {
    expect(() => encodeVector([])).toThrow();
  });

  it('rejects NaN', () => {
    expect(() => encodeVector([1, NaN, 3])).toThrow();
  });

  it('rejects Infinity', () => {
    expect(() => encodeVector([1, Infinity])).toThrow();
  });

  it('preserves negatives and zero', () => {
    expect(encodeVector([-1, 0, 1])).toBe('[-1,0,1]');
  });

  it('round-trips through decodeVector', () => {
    const v = [0.5, -0.25, 0.125];
    const encoded = encodeVector(v);
    const decoded = decodeVector(encoded);
    expect(decoded).toEqual(v);
  });
});

describe('decodeVector', () => {
  it('parses pgvector text form', () => {
    expect(decodeVector('[1,2,3]')).toEqual([1, 2, 3]);
  });

  it('handles empty pgvector literal', () => {
    expect(decodeVector('[]')).toEqual([]);
  });

  it('rejects non-pgvector strings', () => {
    expect(() => decodeVector('1,2,3')).toThrow();
    expect(() => decodeVector('')).toThrow();
  });
});
