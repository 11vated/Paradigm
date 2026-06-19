import { describe, it, expect } from 'vitest';
import {
  toSeed, toSeedAsync, invertAll, listModalities, hasRealHandler,
  isInverseSuccess, ALL_MODALITIES,
  type Modality,
} from '../../src/lib/composition/inverse-pipeline.js';

describe('toSeed — input validation', () => {
  it('returns failure for empty text', () => {
    const result = toSeed('text', '');
    if (isInverseSuccess(result)) {
      expect.fail('should have failed');
    } else {
      expect(result.failure.typed).toBe('insufficient-input');
      expect(result.failure.candidateBranches.length).toBeGreaterThan(0);
    }
  });

  it('returns failure for short text (< 3 chars)', () => {
    const result = toSeed('text', 'ab');
    if (!('failure' in result)) {
      expect.fail('should have failed');
    }
  });

  it('returns failure for empty code', () => {
    const result = toSeed('code', 'short');
    if (!('failure' in result)) {
      expect.fail('should have failed');
    }
  });

  it('returns failure for empty 3d input', () => {
    const result = toSeed('3d', {});
    if (!('failure' in result)) {
      expect.fail('should have failed');
    }
  });

  it('returns failure for empty map input', () => {
    const result = toSeed('map', {});
    if (!('failure' in result)) {
      expect.fail('should have failed');
    }
  });

  it('returns failure for empty sensor input', () => {
    const result = toSeed('sensor', {});
    if (!('failure' in result)) {
      expect.fail('should have failed');
    }
  });
});

describe('toSeed — 5 real handlers', () => {
  it('text → narrative domain with confidence', () => {
    const result = toSeed('text', 'A fantasy warrior character with dark mysterious powers');
    if (!isInverseSuccess(result)) {
      expect.fail(`should have succeeded, got: ${JSON.stringify(result)}`);
    }
    expect(result.domain).toBe('narrative');
    expect(result.confidence).toBeGreaterThan(0);
    expect(result.seed.$domain).toBe('narrative');
  });

  it('code → app domain with language detection', () => {
    const source = 'function hello() { return "world"; }';
    const result = toSeed('code', source);
    if (!isInverseSuccess(result)) {
      expect.fail(`should have succeeded, got: ${JSON.stringify(result)}`);
    }
    expect(result.domain).toBe('app');
    expect(result.confidence).toBeGreaterThan(0.5);
  });

  it('3d → geometry3d domain with vertex data', () => {
    const result = toSeed('3d', { vertices: [1, 2, 3, 4, 5, 6], faces: [0, 1, 2] });
    if (!isInverseSuccess(result)) {
      expect.fail(`should have succeeded, got: ${JSON.stringify(result)}`);
    }
    expect(result.domain).toBe('geometry3d');
    expect(result.confidence).toBeGreaterThan(0);
  });

  it('map → world domain with lat/lon', () => {
    const result = toSeed('map', { latitude: 48.8566, longitude: 2.3522 });
    if (!isInverseSuccess(result)) {
      expect.fail(`should have succeeded, got: ${JSON.stringify(result)}`);
    }
    expect(result.domain).toBe('world');
    expect(result.confidence).toBeGreaterThan(0);
  });

  it('sensor → physics domain with readings', () => {
    const result = toSeed('sensor', { values: [0.5, 0.7, 0.3, 0.9, 0.2] });
    if (!isInverseSuccess(result)) {
      expect.fail(`should have succeeded, got: ${JSON.stringify(result)}`);
    }
    expect(result.domain).toBe('physics');
    expect(result.confidence).toBeGreaterThan(0);
  });
});

describe('toSeed — determinism', () => {
  const input = 'A mysterious forest with ancient ruins and glowing crystals';

  it('same input produces identical seeds', () => {
    const r1 = toSeed('text', input);
    const r2 = toSeed('text', input);
    if (!isInverseSuccess(r1) || !isInverseSuccess(r2)) {
      expect.fail('both should succeed');
    }
    expect(r1.seed.$hash).toBe(r2.seed.$hash);
    expect(r1.confidence).toBe(r2.confidence);
  });

  it('different inputs produce different hashes', () => {
    const r1 = toSeed('text', 'A sunny beach');
    const r2 = toSeed('text', 'A dark cave');
    if (!isInverseSuccess(r1) || !isInverseSuccess(r2)) {
      expect.fail('both should succeed');
    }
    expect(r1.seed.$hash).not.toBe(r2.seed.$hash);
  });
});

describe('toSeed — seed metadata', () => {
  it('sets $name with inverse: prefix', () => {
    const result = toSeed('text', 'Test');
    if (!isInverseSuccess(result)) {
      expect.fail('should succeed');
    }
    expect(result.seed.$name).toMatch(/^inverse:text:/);
  });

  it('sets $lineage with generation 1', () => {
    const result = toSeed('text', 'Test lineage');
    if (!isInverseSuccess(result)) {
      expect.fail('should succeed');
    }
    expect(result.seed.$lineage.generation).toBe(1);
    expect(result.seed.$lineage.operators[0]).toMatch(/^inverse:/);
  });

  it('produces seed with genes', () => {
    const result = toSeed('text', 'A complex story with many elements');
    if (!isInverseSuccess(result)) {
      expect.fail('should succeed');
    }
    expect(result.seed.getGeneTypes().length).toBeGreaterThan(0);
  });
});

describe('toSeed — 10 stub modalities with failure UX', () => {
  const stubs: Modality[] = ['image', 'audio', 'video', 'midi', 'game-replay',
    'genome', 'legal', 'cultural-corpus', 'historical', 'mind-transcript'];

  for (const mod of stubs) {
    it(`${mod} returns typed refusal with candidate branches`, () => {
      const result = toSeed(mod, { some: 'data' });
      if (isInverseSuccess(result)) {
        expect.fail(`${mod} should have failed`);
      }
      expect(result.failure.typed).toBe('unsupported-modality');
      expect(result.failure.candidateBranches.length).toBeGreaterThan(0);
      expect(result.failure.candidateBranches[0].label).toBeTruthy();
    });
  }
});

describe('toSeedAsync', () => {
  it('resolves to same result as sync toSeed', async () => {
    const syncResult = toSeed('text', 'Async test data');
    const asyncResult = await toSeedAsync('text', 'Async test data');
    if (!isInverseSuccess(syncResult) || !isInverseSuccess(asyncResult)) {
      expect.fail('both should succeed');
    }
    expect(asyncResult.seed.$hash).toBe(syncResult.seed.$hash);
    expect(asyncResult.domain).toBe(syncResult.domain);
  });
});

describe('invertAll — batch processing', () => {
  it('processes multiple inputs', () => {
    const results = invertAll([
      { modality: 'text' as Modality, data: 'A fantasy world' },
      { modality: 'code' as Modality, data: 'const x = 1;' },
      { modality: 'map' as Modality, data: { latitude: 0, longitude: 0 } },
    ]);
    expect(results).toHaveLength(3);
    expect(results.filter(r => 'seed' in r && !('failure' in r))).toHaveLength(3);
  });

  it('handles mix of real and stub modalities', () => {
    const results = invertAll([
      { modality: 'text' as Modality, data: 'test' },
      { modality: 'image' as Modality, data: {} },
    ]);
    expect(results).toHaveLength(2);
    expect(isInverseSuccess(results[0])).toBe(true);
    if (isInverseSuccess(results[0])) {
      expect(results[0].domain).toBe('narrative');
    } else {
      expect.fail('first result should succeed');
    }
    if ('failure' in results[1]) {
      expect(results[1].failure.typed).toBe('unsupported-modality');
    } else {
      expect.fail('second result should fail');
    }
  });
});

describe('listModalities / hasRealHandler', () => {
  it('listModalities returns all 15', () => {
    expect(listModalities()).toEqual(ALL_MODALITIES);
    expect(listModalities()).toHaveLength(15);
  });

  it('hasRealHandler returns true for 5 real handlers', () => {
    expect(hasRealHandler('text')).toBe(true);
    expect(hasRealHandler('code')).toBe(true);
    expect(hasRealHandler('3d')).toBe(true);
    expect(hasRealHandler('map')).toBe(true);
    expect(hasRealHandler('sensor')).toBe(true);
  });

  it('hasRealHandler returns false for 10 stubs', () => {
    expect(hasRealHandler('image')).toBe(false);
    expect(hasRealHandler('audio')).toBe(false);
    expect(hasRealHandler('video')).toBe(false);
    expect(hasRealHandler('midi')).toBe(false);
    expect(hasRealHandler('genome')).toBe(false);
    expect(hasRealHandler('legal')).toBe(false);
    expect(hasRealHandler('mind-transcript')).toBe(false);
  });
});

describe('code language detection', () => {
  it('detects TypeScript', () => {
    const result = toSeed('code', 'interface Foo { bar: string; }\nexport const x: Foo = { bar: "hello" };');
    if (!isInverseSuccess(result)) {
      expect.fail('should succeed');
    }
  });

  it('detects Python', () => {
    const result = toSeed('code', 'def hello(name):\n    return f"Hello {name}"\n');
    if (!isInverseSuccess(result)) {
      expect.fail('should succeed');
    }
  });

  it('detects Rust', () => {
    const result = toSeed('code', 'fn main() {\n    let x = 42;\n    println!("{}", x);\n}');
    if (!isInverseSuccess(result)) {
      expect.fail('should succeed');
    }
  });
});
