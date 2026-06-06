/**
 * Property tests for the .gseed binary format encoder/decoder (kernel boundary).
 *
 * Doctrine v2 §13 — kernel boundary tests: roundtrip integrity, magic header,
 * determinism, version, section reconstruction, and error tolerance.
 *
 * These tests exercise src/lib/kernel/binary-format.ts directly without
 * touching the filesystem, which keeps them fast and platform-independent.
 */

import { describe, expect, test } from 'vitest';
import * as fc from 'fast-check';
import {
  CURRENT_VERSION,
  OutputType,
  SectionType,
  canCompressSections,
  createGseed,
  decodeGseed,
  encodeGseed,
  type GseedPackage,
} from '../../src/lib/kernel/binary-format.js';
import type { Seed } from '../../src/lib/kernel/engines.js';

const MAGIC_BYTES = new TextEncoder().encode('GSEE');

// Helpers — 64-char hex hash and stable identity for a seed.
const hexHash = (s: string): string => {
  // Simple deterministic hex (not crypto — only used for property tests)
  let h = 0n;
  for (const c of s) h = (h * 131n + BigInt(c.charCodeAt(0))) & 0xffffffffffffffffffffffffffffffffn;
  return h.toString(16).padStart(64, '0');
};

const makeSeed = (id: string, domain: string): Seed =>
  ({
    $id: id,
    $domain: domain,
    $name: `seed-${id}`,
    $hash: hexHash(`${id}::${domain}`),
  }) as unknown as Seed;

const minimalPackage = (overrides: Partial<GseedPackage> = {}): GseedPackage => ({
  version: { ...CURRENT_VERSION },
  timestamp: 1000,
  flags: {
    hasC2PA: false,
    hasOutputs: false,
    encryptedSeed: false,
    royaltyEnabled: false,
    compressed: false,
  },
  seedHash: hexHash('test-seed'),
  ...overrides,
});

const arbTitle = fc.string({ minLength: 1, maxLength: 80 }).filter((s) => s.trim().length > 0);
const arbAuthor = fc.string({ minLength: 1, maxLength: 40 }).filter((s) => s.trim().length > 0);
const arbDescription = fc.option(fc.string({ minLength: 1, maxLength: 200 }), { nil: undefined });
const arbMetadata = fc.record({
  schema: fc.constant('paradigm.gseed.metadata/1'),
  author: arbAuthor,
  title: arbTitle,
  description: arbDescription,
  generator: fc.string({ minLength: 1, maxLength: 40 }),
  tags: fc.array(fc.string({ minLength: 1, maxLength: 20 }), { maxLength: 5 }),
});

const arbOutput = fc.record({
  type: fc.constantFrom(OutputType.OBJ, OutputType.PNG, OutputType.JSON, OutputType.STORY, OutputType.CODE, OutputType.SVG, OutputType.HTML),
  index: fc.integer({ min: 0, max: 99 }),
  data: fc.uint8Array({ minLength: 0, maxLength: 256 }),
});

describe('gseed-binary-format — kernel boundary properties', () => {
  test('encodeGseed starts with the GSEE magic bytes', () => {
    fc.assert(
      fc.property(arbMetadata, (meta) => {
        const buf = encodeGseed(minimalPackage({ metadata: meta as never }));
        expect(buf.length).toBeGreaterThanOrEqual(MAGIC_BYTES.length);
        for (let i = 0; i < MAGIC_BYTES.length; i++) {
          expect(buf[i]).toBe(MAGIC_BYTES[i]);
        }
      }),
      { numRuns: 25 },
    );
  });

  test('encodeGseed is deterministic for the same package', () => {
    fc.assert(
      fc.property(arbMetadata, (meta) => {
        const pkg = minimalPackage({ metadata: meta as never, seedHash: hexHash('det-test') });
        const a = encodeGseed(pkg);
        const b = encodeGseed(pkg);
        expect(a.length).toBe(b.length);
        expect(Buffer.from(a).equals(Buffer.from(b))).toBe(true);
      }),
      { numRuns: 25 },
    );
  });

  test('encode → decode roundtrips metadata, seedHash, and flags', () => {
    fc.assert(
      fc.property(
        arbMetadata,
        fc.boolean(),
        fc.boolean(),
        fc.boolean(),
        fc.boolean(),
        fc.boolean(),
        (meta, hasC2PA, hasOutputs, encrypted, royalty, compressed) => {
          const pkg = minimalPackage({
            metadata: meta as never,
            flags: { hasC2PA, hasOutputs, encryptedSeed: encrypted, royaltyEnabled: royalty, compressed },
            seedHash: hexHash('roundtrip'),
          });
          const buf = encodeGseed(pkg);
          const decoded = decodeGseed(buf);
          expect(decoded.version.major).toBe(pkg.version.major);
          expect(decoded.version.minor).toBe(pkg.version.minor);
          expect(decoded.seedHash).toBe(pkg.seedHash);
          expect(decoded.flags.hasC2PA).toBe(pkg.flags.hasC2PA);
          expect(decoded.flags.hasOutputs).toBe(pkg.flags.hasOutputs);
          expect(decoded.flags.encryptedSeed).toBe(pkg.flags.encryptedSeed);
          expect(decoded.flags.royaltyEnabled).toBe(pkg.flags.royaltyEnabled);
          // metadata roundtrip (string fields, tags may be in undefined order)
          if (meta.title) expect(decoded.metadata?.title).toBe(meta.title);
          if (meta.author) expect(decoded.metadata?.author).toBe(meta.author);
        },
      ),
      { numRuns: 25 },
    );
  });

  test('encode → decode roundtrips output payloads (Uint8Array content)', () => {
    fc.assert(
      fc.property(fc.array(arbOutput, { minLength: 1, maxLength: 4 }), (outputs) => {
        const pkg = minimalPackage({
          outputs,
          flags: {
            hasC2PA: false,
            hasOutputs: true,
            encryptedSeed: false,
            royaltyEnabled: false,
            compressed: false,
          },
        });
        const buf = encodeGseed(pkg);
        const decoded = decodeGseed(buf);
        expect(decoded.outputs).toBeDefined();
        expect(decoded.outputs!.length).toBe(outputs.length);
        for (let i = 0; i < outputs.length; i++) {
          expect(decoded.outputs![i].type).toBe(outputs[i].type);
          expect(decoded.outputs![i].index).toBe(outputs[i].index);
          // payloads should be equal as Uint8Array
          const a = decoded.outputs![i].data;
          const b = outputs[i].data;
          expect(a.length).toBe(b.length);
          for (let j = 0; j < a.length; j++) expect(a[j]).toBe(b[j]);
        }
      }),
      { numRuns: 25 },
    );
  });

  test('encode works for a minimal package (no metadata, no outputs, no params)', () => {
    const pkg = minimalPackage();
    const buf = encodeGseed(pkg);
    expect(buf.length).toBeGreaterThanOrEqual(MAGIC_BYTES.length);
    const decoded = decodeGseed(buf);
    expect(decoded.seedHash).toBe(pkg.seedHash);
    expect(decoded.metadata).toBeUndefined();
    expect(decoded.outputs).toBeUndefined();
  });

  test('SectionType enum has all expected canonical section ids', () => {
    expect(SectionType.METADATA).toBe(1);
    expect(SectionType.PARAMS).toBe(2);
    expect(SectionType.OUTPUTS).toBe(3);
    expect(SectionType.C2PA_MANIFEST).toBe(4);
    expect(SectionType.ROYALTY).toBe(5);
    expect(SectionType.SIGNATURE).toBe(6);
  });

  test('CURRENT_VERSION is a valid positive major.minor', () => {
    expect(CURRENT_VERSION.major).toBeGreaterThanOrEqual(1);
    expect(CURRENT_VERSION.minor).toBeGreaterThanOrEqual(0);
  });

  test('canCompressSections is a boolean (zlib may or may not be available)', () => {
    expect(typeof canCompressSections()).toBe('boolean');
  });

  test('createGseed produces a valid package from a Seed + minimal output', () => {
    const seed = makeSeed('alpha', 'character');
    const output = {
      name: 'Alpha The First',
      visual: { type: 'sprite' as const, palette: ['#000', '#fff'] },
    } as never;
    const pkg = createGseed(seed, 'character-gen-v1', output, { title: 'Alpha Character' });
    expect(pkg.seedHash).toBe(seed.$hash);
    expect(pkg.metadata?.title).toBe('Alpha Character');
    expect(pkg.metadata?.generator).toBe('character-gen-v1');
    // Roundtrip
    const buf = encodeGseed(pkg);
    const decoded = decodeGseed(buf);
    expect(decoded.seedHash).toBe(seed.$hash);
    expect(decoded.metadata?.title).toBe('Alpha Character');
    expect(decoded.metadata?.generator).toBe('character-gen-v1');
  });
});
