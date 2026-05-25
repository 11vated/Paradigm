/**
 * Story Engine — adapter tests over `film` and `theater` kinds (fastest).
 */
import { describe, it as test, expect, beforeAll, afterAll } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { generateStory, capability, engine } from '../../src/lib/engines/story';

const TMP = path.join(os.tmpdir(), 'paradigm-story-engine-' + Date.now());
beforeAll(() => fs.mkdirSync(TMP, { recursive: true }));
afterAll(() => fs.rmSync(TMP, { recursive: true, force: true }));

function mkOut(name: string): string {
  const p = path.join(TMP, name);
  fs.mkdirSync(p, { recursive: true });
  return path.join(p, 'out.json');
}

function makeSeed(hash: string) {
  return {
    $domain: 'film',
    $hash: hash,
    genes: { genre: { value: 'drama' } },
  } as any;
}

describe('engine/story', () => {
  test('capability id is story', () => {
    expect(capability.id).toBe('story');
    expect(capability.composesWith).toContain('mind');
  });

  test('engine handle is frozen', () => {
    expect(Object.isFrozen(engine)).toBe(true);
    expect(Object.isFrozen(capability)).toBe(true);
  });

  test('film dispatch returns normalized StoryArtifact', async () => {
    const out = await generateStory({
      kind: 'film',
      seed: makeSeed('story-engine-test-1'),
      outputPath: mkOut('film-1'),
    });
    expect(out.kind).toBe('film');
    expect(out.primaryPath.length).toBeGreaterThan(0);
    expect(out.auxPaths.length).toBeGreaterThanOrEqual(1);
    expect(typeof out.metrics.genre).toBe('string');
  });

  test('determinism: same seed twice → same metrics + same file basenames', async () => {
    const seed = makeSeed('story-determinism-fixed');
    const a = await generateStory({ kind: 'film', seed, outputPath: mkOut('det-a') });
    const b = await generateStory({ kind: 'film', seed, outputPath: mkOut('det-b') });
    expect(a.metrics).toEqual(b.metrics);
    expect(path.basename(a.primaryPath)).toBe(path.basename(b.primaryPath));
  });

  test('unsupported kind throws clearly', async () => {
    await expect(
      generateStory({ kind: 'comic' as any, seed: makeSeed('x'), outputPath: TMP }),
    ).rejects.toThrow(/story: unsupported kind/);
  });
});
