import { describe, it, expect } from 'vitest';
import { executeGSPL } from '../../src/lib/gspl/interpreter.js';

describe('Debug', () => {
  it('debug evolve stmt', async () => {
    const result = await executeGSPL(`
      seed "Base" in character { strength: 0.5 }
      evolve Base using "ga" with { count: 5 }
    `);
    expect(result.errors).toHaveLength(0);
  });
});
