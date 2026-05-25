import { describe, it, expect } from 'vitest';
import { growSeed } from '../../src/lib/kernel/engines';
import { UniversalSeed } from '../../src/seeds/universal-seed';

describe('Universe Generation Test', () => {
  it('should grow a universe seed and return a valid artifact', async () => {
    const seed = new UniversalSeed({ metadata: { name: 'Test Cosmos', domain: 'universe', id: 'universe-test', version: '1.0.0', created: 0, updated: 0, tags: [] } });
    const result: any = await growSeed(seed);

    expect(result).toBeDefined();
    expect(result.type).toBeDefined();
    expect(result.domain).toBeDefined();
    expect(result.generation_quality).toBeDefined();
    expect(result.render_hints).toBeDefined();
  });
});
