
import { describe, it, expect, beforeAll } from 'vitest';
import { UniversalSeed } from '../../src/seeds/universal-seed';
import { growSeed } from '../../src/lib/kernel/engines';
import { initServerPolyfills } from '../../src/lib/kernel/server-polyfills';

describe('Character Generation Stress Test', () => {
  beforeAll(() => {
    initServerPolyfills();
  });

  it('should grow a character seed and return a valid artifact', async () => {
    const seed = new UniversalSeed({ metadata: { name: 'Test Hero', domain: 'character', id: 'char-test', version: '1.0.0', created: 0, updated: 0, tags: [] } });
    const result: any = await growSeed(seed);
    
    expect(result).toBeDefined();
    expect(result.domain ?? result.type).toBeDefined();
  });
});
