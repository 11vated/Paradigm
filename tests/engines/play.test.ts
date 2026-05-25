/**
 * Play Engine — adapter tests over the `game` kind.
 *
 * Crown jewel. Proves the engine produces real playable HTML, normalizes
 * the artifact, and is deterministic across two invocations of the same
 * seed at the engine boundary.
 */
import { describe, it as test, expect, beforeAll, afterAll } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { generatePlay, capability, engine } from '../../src/lib/engines/play';

const TMP = path.join(os.tmpdir(), 'paradigm-play-engine-' + Date.now());
beforeAll(() => fs.mkdirSync(TMP, { recursive: true }));
afterAll(() => fs.rmSync(TMP, { recursive: true, force: true }));

function mkOut(name: string): string {
  const p = path.join(TMP, name);
  fs.mkdirSync(p, { recursive: true });
  return p;
}

function makeSeed(hash: string) {
  return {
    $domain: 'game',
    $hash: hash,
    genes: { genre: { value: 'platformer' }, difficulty: { value: 'medium' } },
  } as any;
}

describe('engine/play', () => {
  test('capability id is play and composes with all other engines', () => {
    expect(capability.id).toBe('play');
    // The play engine is the Multiverse Director surface — must compose
    // with every other engine in the substrate.
    for (const e of ['form', 'motion', 'sound', 'story', 'mind', 'world', 'field', 'matter']) {
      expect(capability.composesWith).toContain(e);
    }
  });

  test('engine handle is frozen', () => {
    expect(Object.isFrozen(engine)).toBe(true);
    expect(Object.isFrozen(capability)).toBe(true);
  });

  test('game dispatch returns normalized PlayArtifact with playable HTML', async () => {
    const out = await generatePlay({
      kind: 'game',
      seed: makeSeed('play-engine-test-1'),
      outputPath: mkOut('game-1'),
    });
    expect(out.kind).toBe('game');
    expect(out.primaryPath.endsWith('.html')).toBe(true);
    expect(fs.existsSync(out.primaryPath)).toBe(true);
    expect(typeof out.metrics.ruleCount).toBe('number');
    expect(typeof out.metrics.componentCount).toBe('number');
  });

  test('validate rejects non-HTML artifacts', () => {
    const bad = engine.validate({ primaryPath: '/tmp/x.json' });
    expect(bad.ok).toBe(false);
    if (!bad.ok) expect(bad.reason).toMatch(/playable HTML/);
  });

  test('determinism: same seed twice → same metrics + same file basenames', async () => {
    const seed = makeSeed('play-determinism-fixed');
    const a = await generatePlay({ kind: 'game', seed, outputPath: mkOut('det-a') });
    const b = await generatePlay({ kind: 'game', seed, outputPath: mkOut('det-b') });
    expect(a.metrics).toEqual(b.metrics);
    expect(path.basename(a.primaryPath)).toBe(path.basename(b.primaryPath));
  });

  test('unsupported kind throws clearly', async () => {
    await expect(
      generatePlay({ kind: 'roguelike' as any, seed: makeSeed('x'), outputPath: TMP }),
    ).rejects.toThrow(/play: unsupported kind/);
  });
});
