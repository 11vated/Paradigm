import { describe, it, expect } from 'vitest';
import { growSeed } from '../../src/lib/kernel/engines';
import { Seed } from '../../src/lib/kernel/seed-class';

describe('Universe Generation Test', () => {
  it('should grow a universe seed and return a valid artifact', async () => {
    const seed = new Seed('universe', 'Test Cosmos');
    const result: any = await growSeed(seed);

    expect(result).toBeDefined();
    expect(result.type).toBeDefined();
    expect(result.domain).toBeDefined();
    expect(result.generation_quality).toBeDefined();
    expect(result.render_hints).toBeDefined();
  });
});
