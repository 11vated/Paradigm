import { describe, it, expect } from 'vitest';
import '../../src/lib/friend/contract';
import '../../src/lib/kernel/generators/sprite-contract';
import '../../src/lib/kernel/generators/music-contract';
import '../../src/lib/kernel/generators/narrative-contract';
import '../../src/lib/kernel/generators/visual2d-contract';
import { listContracts } from '../../src/lib/kernel/quality-contract';

const CURATED_PICK: Record<string, number> = { friend: 0, music: 0, sprite: 0, narrative: 0, visual2d: 0 };

describe('Replay determinism — all registered contracts', () => {
  for (const c of listContracts()) {
    const idx = CURATED_PICK[c.domain] ?? 0;
    it(`${c.domain}@${c.version} — synth twice → identical hash`, async () => {
      const curated = await c.curated();
      const pick = curated[idx];
      const a1 = await c.synthesize(pick.seed);
      const a2 = await c.synthesize(pick.seed);
      const h1 = await c.hashArtifact(a1);
      const h2 = await c.hashArtifact(a2);
      expect(h1).toBe(h2);
      expect(h1).toMatch(/^[0-9a-f]{16,}$/);
    }, 30_000);
  }

  it('every contract has at least one curated seed', async () => {
    for (const c of listContracts()) {
      const curated = await c.curated();
      expect(curated.length).toBeGreaterThan(0);
    }
  });

  it('all 5 expected domains are registered', () => {
    const domains = listContracts().map((c) => c.domain).sort();
    expect(domains).toEqual(['friend', 'music', 'narrative', 'sprite', 'visual2d']);
  });
});
