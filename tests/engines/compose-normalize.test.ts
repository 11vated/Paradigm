/**
 * compose() — outputRoot auto-normalization (WS32).
 *
 * Proves outputRoot auto-derives stage paths via normalizeForEngine.
 * Caller still controls per-stage `kind` (which is engine-specific) via
 * threadRequest — outputRoot only owns the path shape.
 */
import { describe, it as test, expect, beforeAll, afterAll } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { composeWithOptions } from '../../src/lib/engines/compose';
import { engine as formEngine } from '../../src/lib/engines/form';
import { engine as soundEngine } from '../../src/lib/engines/sound';

const TMP = path.join(os.tmpdir(), 'paradigm-compose-normalize-' + Date.now());
beforeAll(() => fs.mkdirSync(TMP, { recursive: true }));
afterAll(() => { try { fs.rmSync(TMP, { recursive: true, force: true }); } catch {} });

// Per-stage kinds — caller responsibility, outputRoot only owns path shape
const stageKinds = ['typography', 'acoustics'];
const kindThreader = (out: any, fromId: string, original: any) => {
  // Find next stage by looking at original.__pos counter
  const nextPos = (original.__pos ?? 0) + 1;
  return { ...original, kind: stageKinds[nextPos], __pos: nextPos };
};

describe('compose outputRoot auto-normalization', () => {
  test('form + sound with outputRoot — auto-normalized paths', async () => {
    const stack = composeWithOptions(
      { id: 'form-sound', outputs: ['html', 'json'], outputRoot: TMP, threadRequest: kindThreader },
      formEngine, soundEngine,
    );
    const seed: any = { $hash: 'ws32-stack-' + Date.now(), $domain: 'composite' };
    const out: any = await stack.generate({ seed, kind: 'typography', outputPath: TMP, __pos: 0 }, undefined as never);
    expect(out.kind).toBe('form-sound');
    expect(out.primaryPath).toBeTruthy();
    expect(out.stages).toHaveLength(2);
    expect(stack.validate(out).ok).toBe(true);
    // Each stage's primaryPath should sit under outputRoot
    for (const s of out.stages) {
      expect(s.artifact.primaryPath.startsWith(TMP)).toBe(true);
    }
  });

  test('determinism: same seed + same outputRoot → identical primaryPaths', async () => {
    const stack = composeWithOptions(
      { id: 'form-sound-det', outputs: ['html'], outputRoot: TMP, threadRequest: kindThreader },
      formEngine, soundEngine,
    );
    const seed: any = { $hash: 'ws32-determinism', $domain: 'composite' };
    const a: any = await stack.generate({ seed, kind: 'typography', outputPath: TMP, __pos: 0 }, undefined as never);
    const b: any = await stack.generate({ seed, kind: 'typography', outputPath: TMP, __pos: 0 }, undefined as never);
    expect(a.primaryPath).toBe(b.primaryPath);
  });
});
