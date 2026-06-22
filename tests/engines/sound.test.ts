/**
 * Sound Engine — adapter tests.
 *
 * Exercises the `acoustics` kind (fastest, no audio synthesis). audio +
 * music kinds have direct generator suites. The engine layer is dispatch-
 * only so one kind locks the contract.
 */
import { describe, it as test, expect, beforeAll, afterAll } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { generateSound, capability, engine } from '../../src/lib/engines/sound';

const TMP = path.join(os.tmpdir(), 'paradigm-sound-engine-' + Date.now());
beforeAll(() => fs.mkdirSync(TMP, { recursive: true }));
afterAll(() => fs.rmSync(TMP, { recursive: true, force: true }));

function mkOut(name: string): string {
  const p = path.join(TMP, name);
  fs.mkdirSync(p, { recursive: true });
  return path.join(p, 'out.json');
}

function makeSeed(hash: string) {
  return {
    $domain: 'acoustics',
    $hash: hash,
    $genome: { room: 'concert_hall' },
  } as any;
}

describe('engine/sound', () => {
  test('capability id is sound', () => {
    expect(capability.id).toBe('sound');
    expect(capability.composesWith).toContain('story');
  });

  test('engine handle is frozen', () => {
    expect(Object.isFrozen(engine)).toBe(true);
    expect(Object.isFrozen(capability)).toBe(true);
  });

  test('acoustics dispatch returns normalized SoundArtifact', async () => {
    const out = await generateSound({
      kind: 'acoustics',
      seed: makeSeed('sound-engine-test-1'),
      outputPath: mkOut('acoustics-1'),
    });
    expect(out.kind).toBe('acoustics');
    expect(out.primaryPath.length).toBeGreaterThan(0);
    expect(out.auxPaths.length).toBeGreaterThanOrEqual(1);
    expect(typeof out.metrics.roomType).toBe('string');
  });

  test('determinism: same seed twice → same metrics + same file basenames', async () => {
    const seed = makeSeed('sound-determinism-fixed');
    const a = await generateSound({ kind: 'acoustics', seed, outputPath: mkOut('det-a') });
    const b = await generateSound({ kind: 'acoustics', seed, outputPath: mkOut('det-b') });
    expect(a.metrics).toEqual(b.metrics);
    expect(path.basename(a.primaryPath)).toBe(path.basename(b.primaryPath));
  });

  test('unsupported kind throws clearly', async () => {
    await expect(
      generateSound({ kind: 'whisper' as any, seed: makeSeed('x'), outputPath: TMP }),
    ).rejects.toThrow(/sound: unsupported kind/);
  });
});
