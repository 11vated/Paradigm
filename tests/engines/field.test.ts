/**
 * Field Engine (Unseen Renderer) — adapter tests.
 *
 * Proves dispatch + normalization + determinism over the EM kind.
 * Quantum and cosmological kinds are exercised by their direct
 * generator suites; the engine layer adds no per-kind branch logic
 * beyond the dispatch + return-shape mapping, so one kind locks the
 * adapter contract.
 */
import { describe, it as test, expect, beforeAll, afterAll } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';

import { generateField, capability, engine } from '../../src/lib/engines/field';

const TMP = path.join(os.tmpdir(), 'paradigm-field-engine-' + Date.now());
beforeAll(() => fs.mkdirSync(TMP, { recursive: true }));
afterAll(() => fs.rmSync(TMP, { recursive: true, force: true }));

function mkOut(name: string): string {
  const p = path.join(TMP, name);
  fs.mkdirSync(p, { recursive: true });
  return p;
}

function seedFor(domain: string) {
  return {
    $hash: `field-engine-test-${domain}-0123456789abcdef`,
    $name: `field-engine-${domain}`,
    $domain: domain,
    genes: {},
  } as never;
}

describe('Field Engine — capability surface', () => {
  test('exposes the Unseen Renderer capability', () => {
    expect(capability.id).toBe('field');
    expect(capability.name).toBe('Unseen Renderer');
    expect(capability.outputs).toContain('svg');
    expect(capability.composesWith).toContain('form');
  });

  test('engine handle frozen and exposes generate', () => {
    expect(Object.isFrozen(engine)).toBe(true);
    expect(typeof engine.generate).toBe('function');
  });
});

describe('Field Engine — electromagnetic dispatch', () => {
  test('produces a normalized FieldArtifact', async () => {
    const out = await generateField({
      seed: seedFor('field'),
      kind: 'electromagnetic',
      outputPath: mkOut('em-a'),
    });
    expect(out.kind).toBe('electromagnetic');
    expect(out.primaryPath).toBeTruthy();
    expect(fs.existsSync(out.primaryPath)).toBe(true);
    expect(out.metrics.gridSize).toBeGreaterThan(0);
    expect(out.metrics.steps).toBeGreaterThan(0);
  });

  test('determinism: same seed twice → identical primary bytes', async () => {
    const seed = seedFor('field');
    const a = await generateField({
      seed,
      kind: 'electromagnetic',
      outputPath: mkOut('em-det-a'),
    });
    const b = await generateField({
      seed,
      kind: 'electromagnetic',
      outputPath: mkOut('em-det-b'),
    });
    expect(a.metrics.gridSize).toBe(b.metrics.gridSize);
    expect(a.metrics.peakMagnitude).toBe(b.metrics.peakMagnitude);
    const bytesA = fs.readFileSync(a.primaryPath);
    const bytesB = fs.readFileSync(b.primaryPath);
    expect(bytesA.equals(bytesB)).toBe(true);
  });

  test('rejects unknown kind (exhaustiveness guard)', async () => {
    await expect(
      // @ts-expect-error
      generateField({ seed: seedFor('???'), kind: 'phlogiston', outputPath: mkOut('bad') }),
    ).rejects.toThrow(/unknown kind/i);
  });
});
