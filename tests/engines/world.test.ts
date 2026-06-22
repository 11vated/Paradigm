/**
 * World Engine — adapter tests over the `ecosystem` kind.
 */
import { describe, it as test, expect, beforeAll, afterAll } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { generateWorld, capability, engine } from '../../src/lib/engines/world';

const TMP = path.join(os.tmpdir(), 'paradigm-world-engine-' + Date.now());
beforeAll(() => fs.mkdirSync(TMP, { recursive: true }));
afterAll(() => fs.rmSync(TMP, { recursive: true, force: true }));

function mkOut(name: string): string {
  const p = path.join(TMP, name);
  fs.mkdirSync(p, { recursive: true });
  return p;
}

function makeSeed(hash: string) {
  return {
    $domain: 'ecosystem',
    $hash: hash,
    $genome: { biome: 'rainforest' },
  } as any;
}

describe('engine/world', () => {
  test('capability id is world', () => {
    expect(capability.id).toBe('world');
    expect(capability.composesWith).toContain('mind');
  });

  test('engine handle is frozen', () => {
    expect(Object.isFrozen(engine)).toBe(true);
    expect(Object.isFrozen(capability)).toBe(true);
  });

  test('ecosystem dispatch returns normalized WorldEngineArtifact', async () => {
    const out = await generateWorld({
      kind: 'ecosystem',
      seed: makeSeed('world-engine-test-1'),
      outputPath: mkOut('eco-1'),
    });
    expect(out.kind).toBe('ecosystem');
    expect(out.primaryPath.length).toBeGreaterThan(0);
    expect(out.auxPaths.length).toBeGreaterThanOrEqual(1);
    expect(typeof out.metrics.speciesCount).toBe('number');
    expect(typeof out.metrics.biomeCount).toBe('number');
  });

  test('determinism: same seed twice → same metrics + same file basenames', async () => {
    const seed = makeSeed('world-determinism-fixed');
    const a = await generateWorld({ kind: 'ecosystem', seed, outputPath: mkOut('det-a') });
    const b = await generateWorld({ kind: 'ecosystem', seed, outputPath: mkOut('det-b') });
    expect(a.metrics).toEqual(b.metrics);
    expect(path.basename(a.primaryPath)).toBe(path.basename(b.primaryPath));
  });

  test('unsupported kind throws clearly', async () => {
    await expect(
      generateWorld({ kind: 'galaxy' as any, seed: makeSeed('x'), outputPath: TMP }),
    ).rejects.toThrow(/world: unsupported kind/);
  });
});
