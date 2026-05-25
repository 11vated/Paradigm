/**
 * Matter Engine — adapter tests over the `molecule` kind.
 */
import { describe, it as test, expect, beforeAll, afterAll } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { generateMatter, capability, engine } from '../../src/lib/engines/matter';

const TMP = path.join(os.tmpdir(), 'paradigm-matter-engine-' + Date.now());
beforeAll(() => fs.mkdirSync(TMP, { recursive: true }));
afterAll(() => fs.rmSync(TMP, { recursive: true, force: true }));

function mkOut(name: string): string {
  const p = path.join(TMP, name);
  fs.mkdirSync(p, { recursive: true });
  return path.join(p, 'out.json');
}

function makeSeed(hash: string) {
  return {
    $domain: 'molecule',
    $hash: hash,
    genes: { moleculeClass: { value: 'organic' } },
  } as any;
}

describe('engine/matter', () => {
  test('capability id is matter', () => {
    expect(capability.id).toBe('matter');
    expect(capability.composesWith).toContain('field');
  });

  test('engine handle is frozen', () => {
    expect(Object.isFrozen(engine)).toBe(true);
    expect(Object.isFrozen(capability)).toBe(true);
  });

  test('molecule dispatch returns normalized MatterArtifact', async () => {
    const out = await generateMatter({
      kind: 'molecule',
      seed: makeSeed('matter-engine-test-1'),
      outputPath: mkOut('mol-1'),
    });
    expect(out.kind).toBe('molecule');
    expect(out.primaryPath.length).toBeGreaterThan(0);
    expect(out.auxPaths.length).toBeGreaterThanOrEqual(1);
    expect(typeof out.metrics.formula).toBe('string');
    expect(typeof out.metrics.mw).toBe('number');
    expect(typeof out.metrics.atomCount).toBe('number');
  });

  test('determinism: same seed twice → same metrics + same file basenames', async () => {
    const seed = makeSeed('matter-determinism-fixed');
    const a = await generateMatter({ kind: 'molecule', seed, outputPath: mkOut('det-a') });
    const b = await generateMatter({ kind: 'molecule', seed, outputPath: mkOut('det-b') });
    expect(a.metrics).toEqual(b.metrics);
    expect(path.basename(a.primaryPath)).toBe(path.basename(b.primaryPath));
  });

  test('unsupported kind throws clearly', async () => {
    await expect(
      generateMatter({ kind: 'plasma' as any, seed: makeSeed('x'), outputPath: TMP }),
    ).rejects.toThrow(/matter: unsupported kind/);
  });
});
