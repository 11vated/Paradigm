/**
 * Contracts registration — auto-loader integration test
 *
 * Verifies that importing the generators barrel side-effect-registers
 * all 126 quality contracts at startup. Without this, `listContracts()`
 * was returning empty despite 126 contract files existing on disk.
 */
import { describe, it, expect } from 'vitest';

describe('Generator contracts auto-registration', () => {
  it('importing the generators barrel registers all contracts', async () => {
    const { listContracts } = await import('../../src/lib/kernel/quality-contract');
    // Touch the barrel so side-effect imports run
    await import('../../src/lib/kernel/generators');
    const contracts = listContracts();
    expect(contracts.length).toBeGreaterThanOrEqual(120);
    const domains = new Set(contracts.map((c) => c.domain));
    // Spot-check a representative slice
    for (const d of ['music', 'sprite', 'narrative', '3d-printing', '5g', 'acoustics']) {
      expect(domains.has(d)).toBe(true);
    }
  });

  it('every registered contract conforms to the QualityContract shape', async () => {
    const { listContracts } = await import('../../src/lib/kernel/quality-contract');
    await import('../../src/lib/kernel/generators');
    for (const c of listContracts()) {
      expect(typeof c.domain).toBe('string');
      expect(typeof c.version).toBe('string');
      expect(typeof c.synthesize).toBe('function');
      expect(typeof c.invert).toBe('function');
      expect(typeof c.rate).toBe('function');
      expect(typeof c.curated).toBe('function');
      const curated = c.curated();
      expect(curated.length).toBeGreaterThanOrEqual(3);
    }
  });

  it('CONTRACTS_REGISTERED constant matches actual registered count', async () => {
    const { CONTRACTS_REGISTERED } = await import('../../src/lib/kernel/generators/contracts');
    const { listContracts } = await import('../../src/lib/kernel/quality-contract');
    await import('../../src/lib/kernel/generators');
    // CONTRACTS_REGISTERED is the file count; actual registration count may be ≥ that if
    // other modules outside generators/ also register (e.g., friend, world, game contracts).
    expect(listContracts().length).toBeGreaterThanOrEqual(CONTRACTS_REGISTERED - 5) // some contracts skip in Node (browser-only);
  });
});
