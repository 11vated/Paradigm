import { describe, it, expect } from 'vitest';
import { buildC2PAManifest, verifyC2PAManifest, encodeC2PAManifest, type C2PAClaim } from '../src/lib/kernel/c2pa-manifest';

function makeSeed(hash = 'abc123', name = 'Test Seed', domain = 'test') {
  return {
    $hash: hash,
    $name: name,
    $domain: domain,
    hash: hash,
    name: name,
    phrase: name,
  };
}

describe('C2PA Manifest', () => {
  it('builds a manifest with claim generator info', () => {
    const seed = makeSeed();
    const manifest = buildC2PAManifest(seed, 'sprite');
    expect(manifest.claim_generator).toBe('Paradigm/1.0');
    expect(manifest.recipes).toHaveLength(1);
    expect(manifest.assertions).toHaveLength(3);
  });

  it('includes seed hash and generator in assertions', () => {
    const seed = makeSeed('abcd1234');
    const manifest = buildC2PAManifest(seed, 'music');

    const seedAssert = manifest.assertions.find(a => a.label === 'paradigm.seed');
    expect(seedAssert).toBeDefined();
    expect((seedAssert!.data as any).hash).toBe('abcd1234');

    const genAssert = manifest.assertions.find(a => a.label === 'paradigm.generator');
    expect(genAssert).toBeDefined();
    expect((genAssert!.data as any).name).toBe('music');
  });

  it('uses $hash field from pipeline Seed type', () => {
    const pipelineSeed = {
      $hash: 'pipeline-hash-999',
      $name: 'Pipeline Seed',
      $domain: 'visual2d',
    };
    const manifest = buildC2PAManifest(pipelineSeed, 'visual2d');
    const seedAssert = manifest.assertions.find(a => a.label === 'paradigm.seed');
    expect((seedAssert!.data as any).hash).toBe('pipeline-hash-999');
  });

  it('uses hash field as fallback when $hash is missing', () => {
    const seed = { hash: 'fallback-hash', $name: 'Test', $domain: 'test' };
    const manifest = buildC2PAManifest(seed, 'test');
    const seedAssert = manifest.assertions.find(a => a.label === 'paradigm.seed');
    expect((seedAssert!.data as any).hash).toBe('fallback-hash');
  });

  it('falls back to unknown when no hash available', () => {
    const seed = { $name: 'NoHash', $domain: 'test' };
    const manifest = buildC2PAManifest(seed, 'test');
    const seedAssert = manifest.assertions.find(a => a.label === 'paradigm.seed');
    expect((seedAssert!.data as any).hash).toBe('unknown');
  });

  it('includes timestamp assertion using kernel clock', () => {
    const seed = makeSeed();
    const manifest = buildC2PAManifest(seed, 'sprite');
    const tsAssert = manifest.assertions.find(a => a.label === 'paradigm.timestamp');
    expect(tsAssert).toBeDefined();
    expect((tsAssert!.data as any).unix_ms).toEqual(expect.any(Number));
    expect(typeof (tsAssert!.data as any).created).toBe('string');
  });

  it('includes recipe with ingredients (seed input, generator tool)', () => {
    const seed = makeSeed('my-hash');
    const manifest = buildC2PAManifest(seed, 'geometry3d');
    const recipe = manifest.recipes[0];
    expect(recipe.ingredients).toHaveLength(2);
    expect(recipe.ingredients[0].relationship).toBe('input');
    expect(recipe.ingredients[1].relationship).toBe('tool');
  });

  it('verifyC2PAManifest returns true when hash matches', () => {
    const seed = makeSeed('matching-hash');
    const manifest = buildC2PAManifest(seed, 'audio');
    expect(verifyC2PAManifest(manifest, 'matching-hash')).toBe(true);
  });

  it('verifyC2PAManifest returns false when hash does not match', () => {
    const seed = makeSeed('real-hash');
    const manifest = buildC2PAManifest(seed, 'audio');
    expect(verifyC2PAManifest(manifest, 'wrong-hash')).toBe(false);
  });

  it('verifyC2PAManifest returns false when no seed assertion', () => {
    const emptyManifest: C2PAClaim = {
      claim_generator: 'Paradigm/1.0',
      recipes: [],
      assertions: [],
    };
    expect(verifyC2PAManifest(emptyManifest, 'test')).toBe(false);
  });

  it('CBOR encode produces valid Uint8Array', () => {
    const seed = makeSeed('cbor-test', 'CBOR Seed');
    const manifest = buildC2PAManifest(seed, 'ui');
    const encoded = encodeC2PAManifest(manifest);
    expect(encoded).toBeInstanceOf(Uint8Array);
    expect(encoded.length).toBeGreaterThan(0);
  });
});
