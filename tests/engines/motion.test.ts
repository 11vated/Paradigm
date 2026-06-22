/**
 * Motion Engine — adapter tests.
 *
 * Proves dispatch + normalization + determinism over the `dance` kind.
 * Physics and particle kinds have direct generator suites; the engine
 * layer is dispatch-only so one kind locks the adapter contract.
 */
import { describe, it as test, expect, beforeAll, afterAll } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { generateMotion, capability, engine } from '../../src/lib/engines/motion';

const TMP = path.join(os.tmpdir(), 'paradigm-motion-engine-' + Date.now());
beforeAll(() => fs.mkdirSync(TMP, { recursive: true }));
afterAll(() => fs.rmSync(TMP, { recursive: true, force: true }));

function mkOut(name: string): string {
  const p = path.join(TMP, name);
  fs.mkdirSync(p, { recursive: true });
  return p;
}

function makeSeed(hash: string) {
  return {
    $domain: 'dance',
    $hash: hash,
    $genome: { style: 'contemporary', tempo: 120 },
  } as any;
}

describe('engine/motion', () => {
  test('capability id is motion', () => {
    expect(capability.id).toBe('motion');
    expect(capability.composesWith).toContain('form');
  });

  test('engine handle is frozen', () => {
    expect(Object.isFrozen(engine)).toBe(true);
    expect(Object.isFrozen(capability)).toBe(true);
  });

  test('dance dispatch returns normalized MotionArtifact', async () => {
    const out = await generateMotion({
      kind: 'dance',
      seed: makeSeed('motion-engine-test-1'),
      outputPath: path.join(mkOut('dance-1'), 'out.json'),
    });
    expect(out.kind).toBe('dance');
    expect(out.primaryPath.length).toBeGreaterThan(0);
    expect(out.auxPaths.length).toBeGreaterThanOrEqual(1);
    expect(typeof out.metrics.style).toBe('string');
  });

  test('determinism: same seed twice → same metrics + same file basenames', async () => {
    const seed = makeSeed('motion-determinism-fixed');
    const a = await generateMotion({ kind: 'dance', seed, outputPath: path.join(mkOut('det-a'), 'out.json') });
    const b = await generateMotion({ kind: 'dance', seed, outputPath: path.join(mkOut('det-b'), 'out.json') });
    expect(a.metrics).toEqual(b.metrics);
    expect(path.basename(a.primaryPath)).toBe(path.basename(b.primaryPath));
  });

  test('unsupported kind throws with a clear message', async () => {
    await expect(
      generateMotion({ kind: 'rocket' as any, seed: makeSeed('x'), outputPath: TMP }),
    ).rejects.toThrow(/motion: unsupported kind/);
  });
});
