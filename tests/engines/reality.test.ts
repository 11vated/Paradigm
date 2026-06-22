/**
 * Reality activation — bridge tests.
 * Proves RealitySeed → field artifact end-to-end with determinism.
 * Added by paradigm-infinite/ws-30.
 */
import { describe, it as test, expect, beforeAll, afterAll } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { createRealitySeed } from '../../src/seeds/reality-seed';
import { renderReality, renderRealityBatch } from '../../src/lib/engines/reality';

const TMP = path.join(os.tmpdir(), 'paradigm-reality-' + Date.now());

beforeAll(() => { fs.mkdirSync(TMP, { recursive: true }); });
afterAll(() => { try { fs.rmSync(TMP, { recursive: true, force: true }); } catch {} });

describe('reality activation', () => {
  test('renders an EM seed and writes a real artifact to disk', async () => {
    const seed = createRealitySeed({ prompt: 'magnetar magnetic field', channel: 'magnetic-vector' });
    const m = await renderReality(seed, TMP);
    expect(m.fieldKind).toBe('electromagnetic');
    expect(m.channel).toBe('magnetic-vector');
    expect(m.primaryPath).toBeTruthy();
    expect(fs.existsSync(m.primaryPath)).toBe(true);
  });

  test('quantum channel dispatches to quantum field kind', async () => {
    const seed = createRealitySeed({ prompt: 'electron wavefunction', channel: 'quantum-wavefunction' });
    const m = await renderReality(seed, TMP);
    expect(m.fieldKind).toBe('quantum');
    expect(m.dimensions).toBeGreaterThanOrEqual(3);
  });

  test('cosmological channel dispatches to cosmology field kind', async () => {
    const seed = createRealitySeed({ prompt: 'galaxy cluster lensing', channel: 'cosmological-curvature' });
    const m = await renderReality(seed, TMP);
    expect(m.fieldKind).toBe('cosmological');
  });

  test('determinism: same prompt+channel → identical manifest descriptors', async () => {
    const a = createRealitySeed({ prompt: 'pulsar B-field', channel: 'magnetic-vector' });
    const b = createRealitySeed({ prompt: 'pulsar B-field', channel: 'magnetic-vector' });
    const mA = await renderReality(a, TMP);
    const mB = await renderReality(b, TMP);
    expect(mA.channel).toBe(mB.channel);
    expect(mA.dimensions).toBe(mB.dimensions);
    expect(mA.fieldKind).toBe(mB.fieldKind);
  });

  test('rejects non-reality seeds', async () => {
    await expect(renderReality({ $hash: 'x', $domain: 'character' } as never, TMP)).rejects.toThrow();
  });

  test('batch renders three channels in order', async () => {
    const seeds = [
      createRealitySeed({ prompt: 'a', channel: 'electromagnetic-radio' }),
      createRealitySeed({ prompt: 'b', channel: 'gravitational' }),
      createRealitySeed({ prompt: 'c', channel: 'quantum-wavefunction' }),
    ];
    const out = await renderRealityBatch(seeds, TMP);
    expect(out).toHaveLength(3);
    expect(out.map(m => m.fieldKind)).toEqual(['electromagnetic', 'cosmological', 'quantum']);
  });

  test('counterfactual flag propagates into the manifest', async () => {
    const seed = createRealitySeed({ prompt: 'alt-physics', channel: 'electromagnetic-visible', counterfactual: true });
    const m = await renderReality(seed, TMP);
    expect(m.counterfactual).toBe(true);
  });
});
