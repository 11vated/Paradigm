import { describe, it, expect } from 'vitest';
import { paradigmMake } from '../../cli/commands/make';

describe('Quality Contract (5-clause) basic enforcement', () => {
  it('tree artifact passes SYNTHESIZE + BE-DETERMINISTIC (double run equal)', async () => {
    const r1 = await paradigmMake('qc-tree-seed', { domain: 'tree' });
    const r2 = await paradigmMake('qc-tree-seed', { domain: 'tree' });

    expect(r1.hash).toBe(r2.hash); // determinism clause
    expect(r1.artifact).toBeTruthy(); // synthesize
    expect(r1.conformance).toBeGreaterThan(0.5);
  });
});
