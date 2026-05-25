/**
 * Form Engine — adapter tests.
 *
 * Proves:
 *  1. The engine dispatches by `kind` to the correct underlying generator.
 *  2. The engine output is deterministic across two invocations of the
 *     same seed (the engine adds no entropy on top of the generator).
 *  3. The normalized `FormArtifact` shape is populated.
 *
 * Only the `typography` kind is exercised here — character and sprite
 * rely on jsdom canvas and add minutes of test time; their direct
 * generator suites already cover determinism. The engine layer adds no
 * branch logic per-kind beyond the dispatch + return-shape mapping, so
 * one kind is sufficient to lock the adapter contract.
 */
import { describe, it as test, expect, beforeAll, afterAll } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';

import { generateForm, capability, engine } from '../../src/lib/engines/form';

const TMP = path.join(os.tmpdir(), 'paradigm-form-engine-' + Date.now());
beforeAll(() => fs.mkdirSync(TMP, { recursive: true }));
afterAll(() => fs.rmSync(TMP, { recursive: true, force: true }));

function mkOut(name: string): string {
  const p = path.join(TMP, name);
  fs.mkdirSync(p, { recursive: true });
  return p;
}

function seedFor(domain: string) {
  return {
    $hash: `form-engine-test-${domain}-0123456789abcdef`,
    $name: `form-engine-${domain}`,
    $domain: domain,
    genes: {},
  } as never;
}

describe('Form Engine — capability surface', () => {
  test('exposes a stable capability id', () => {
    expect(capability.id).toBe('form');
    expect(capability.outputs).toContain('svg');
  });

  test('engine handle is frozen and exposes generate', () => {
    expect(Object.isFrozen(engine)).toBe(true);
    expect(typeof engine.generate).toBe('function');
  });
});

describe('Form Engine — typography dispatch', () => {
  test('produces a normalized FormArtifact', async () => {
    const out = await generateForm({
      seed: seedFor('typography'),
      kind: 'typography',
      outputPath: mkOut('typography-a'),
    });

    expect(out.kind).toBe('typography');
    expect(out.primaryPath).toBeTruthy();
    expect(fs.existsSync(out.primaryPath)).toBe(true);
    expect(out.auxPaths.length).toBeGreaterThan(0);
    expect(out.metrics.glyphs).toBeGreaterThan(0);
  });

  test('determinism: same seed twice → identical primary artifact bytes', async () => {
    const seed = seedFor('typography');
    const a = await generateForm({
      seed,
      kind: 'typography',
      outputPath: mkOut('typography-det-a'),
    });
    const b = await generateForm({
      seed,
      kind: 'typography',
      outputPath: mkOut('typography-det-b'),
    });
    expect(a.metrics.glyphs).toBe(b.metrics.glyphs);
    const bytesA = fs.readFileSync(a.primaryPath);
    const bytesB = fs.readFileSync(b.primaryPath);
    expect(bytesA.equals(bytesB)).toBe(true);
  });

  test('rejects unknown kind at the type level (runtime guard intact)', async () => {
    await expect(
      // @ts-expect-error — exhaustiveness guarded at compile time
      generateForm({ seed: seedFor('???'), kind: 'unknown', outputPath: mkOut('bad') }),
    ).rejects.toThrow(/unknown kind/i);
  });
});
