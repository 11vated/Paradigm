/**
 * Mind Engine — adapter tests over `neuroscience` kind (fastest).
 */
import { describe, it as test, expect, beforeAll, afterAll } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { generateMind, capability, engine } from '../../src/lib/engines/mind';

const TMP = path.join(os.tmpdir(), 'paradigm-mind-engine-' + Date.now());
beforeAll(() => fs.mkdirSync(TMP, { recursive: true }));
afterAll(() => fs.rmSync(TMP, { recursive: true, force: true }));

function mkOut(name: string): string {
  const p = path.join(TMP, name);
  fs.mkdirSync(p, { recursive: true });
  return path.join(p, 'out.json');
}

function makeSeed(hash: string) {
  return {
    $domain: 'neuroscience',
    $hash: hash,
    genes: { studyType: { value: 'cognitive' } },
  } as any;
}

describe('engine/mind', () => {
  test('capability id is mind', () => {
    expect(capability.id).toBe('mind');
    expect(capability.composesWith).toContain('play');
  });

  test('engine handle is frozen', () => {
    expect(Object.isFrozen(engine)).toBe(true);
    expect(Object.isFrozen(capability)).toBe(true);
  });

  test('neuroscience dispatch returns normalized MindArtifact', async () => {
    const out = await generateMind({
      kind: 'neuroscience',
      seed: makeSeed('mind-engine-test-1'),
      outputPath: mkOut('neuro-1'),
    });
    expect(out.kind).toBe('neuroscience');
    expect(out.primaryPath.length).toBeGreaterThan(0);
    expect(out.auxPaths.length).toBeGreaterThanOrEqual(1);
    expect(typeof out.metrics.studyType).toBe('string');
  });

  test('determinism: same seed twice → same metrics + same file basenames', async () => {
    const seed = makeSeed('mind-determinism-fixed');
    const a = await generateMind({ kind: 'neuroscience', seed, outputPath: mkOut('det-a') });
    const b = await generateMind({ kind: 'neuroscience', seed, outputPath: mkOut('det-b') });
    expect(a.metrics).toEqual(b.metrics);
    expect(path.basename(a.primaryPath)).toBe(path.basename(b.primaryPath));
  });

  test('unsupported kind throws clearly', async () => {
    await expect(
      generateMind({ kind: 'consciousness' as any, seed: makeSeed('x'), outputPath: TMP }),
    ).rejects.toThrow(/mind: unsupported kind/);
  });
});
