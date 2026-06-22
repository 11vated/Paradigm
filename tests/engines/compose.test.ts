/**
 * Engine compose combinator — algebra tests.
 * Composes two stub engines and verifies: capability union, stage threading,
 * validate(), determinism, and the rejection of single-engine compose.
 */
import { describe, it as test, expect } from 'vitest';
import { compose, chain, composeWithOptions } from '../../src/lib/engines/compose';
import type { Engine, EngineCapability } from '../../src/lib/engines/types';

function stubEngine(id: string, outputs: string[] = ['json']): Engine {
  const cap: EngineCapability = Object.freeze({
    id, name: `Stub ${id}`, version: '0.0.1', outputs, composesWith: [],
  });
  return Object.freeze({
    capability: cap,
    generate: async (req: any) => ({
      kind: id,
      primaryPath: `/tmp/${id}-${req.seed?.$hash ?? 'x'}.json`,
      auxPaths: [`/tmp/${id}-aux-${req.seed?.$hash ?? 'x'}.txt`],
      metrics: { engine: id, upstreamCount: (req.upstream ?? []).length },
      raw: { req },
    }),
    validate: (out: any) =>
      out?.primaryPath ? { ok: true as const } : { ok: false as const, reason: 'no primaryPath' },
  });
}

describe('engine compose', () => {
  test('compose requires >= 2 engines', () => {
    expect(() => compose(stubEngine('a'))).toThrow();
  });

  test('composed capability id encodes the chain', () => {
    const e = compose(stubEngine('a'), stubEngine('b'));
    expect(e.capability.id).toBe('compose(a→b)');
  });

  test('composed engine runs each stage in order, threads upstream', async () => {
    const e = compose(stubEngine('a'), stubEngine('b'), stubEngine('c'));
    const out = (await e.generate({
      kind: 'whatever',
      seed: { $hash: 'deadbeef' },
      outputPath: '/tmp/x',
    })) as any;
    expect(out.stages).toHaveLength(3);
    expect(out.stages[0].engine).toBe('a');
    expect(out.stages[1].engine).toBe('b');
    expect(out.stages[2].engine).toBe('c');
    expect(out.stages[1].artifact.metrics.upstreamCount).toBe(1);
    expect(out.stages[2].artifact.metrics.upstreamCount).toBe(2);
    expect(out.primaryPath).toBe(out.stages[2].artifact.primaryPath);
  });

  test('composed engine validate returns ok for well-formed output', async () => {
    const e = compose(stubEngine('a'), stubEngine('b'));
    const out = await e.generate({ seed: { $hash: 'x' }, outputPath: '/tmp' });
    expect(e.validate(out)).toEqual({ ok: true });
  });

  test('composed engine validate rejects missing primaryPath', () => {
    const e = compose(stubEngine('a'), stubEngine('b'));
    expect(e.validate({ stages: [{}, {}] })).toEqual({
      ok: false,
      reason: expect.stringContaining('missing primaryPath'),
    });
  });

  test('determinism: same input twice → identical output (no entropy)', async () => {
    const e = compose(stubEngine('a'), stubEngine('b'));
    const req = { seed: { $hash: 'det-hash' }, outputPath: '/tmp/x' };
    const o1 = (await e.generate(req)) as any;
    const o2 = (await e.generate(req)) as any;
    expect(o1.primaryPath).toBe(o2.primaryPath);
    expect(o1.auxPaths).toEqual(o2.auxPaths);
    expect(o1.stages.map((s: any) => s.artifact.primaryPath)).toEqual(
      o2.stages.map((s: any) => s.artifact.primaryPath),
    );
  });

  test('chain(a, b) is equivalent to compose(a, b)', async () => {
    const e1 = chain(stubEngine('a'), stubEngine('b'));
    const e2 = compose(stubEngine('a'), stubEngine('b'));
    expect(e1.capability.id).toBe(e2.capability.id);
  });

  test('composeWithOptions: custom threadRequest overrides default', async () => {
    const e = composeWithOptions(
      {
        threadRequest: (prev, _from, orig) => ({
          ...orig,
          outputPath: prev.primaryPath, // pass primaryPath as outputPath
        }),
      },
      stubEngine('a'),
      stubEngine('b'),
    );
    const out = (await e.generate({
      seed: { $hash: 'thread' },
      outputPath: '/tmp/orig',
    })) as any;
    expect(out.stages[1].artifact.metrics.upstreamCount).toBe(0);
  });

  test('composed engine is itself composable (closure)', async () => {
    const ab = compose(stubEngine('a'), stubEngine('b'));
    const abc = compose(ab, stubEngine('c'));
    const out = (await abc.generate({
      seed: { $hash: 'closure' },
      outputPath: '/tmp/x',
    })) as any;
    expect(out.stages).toHaveLength(2);
    expect(out.primaryPath.endsWith('.json')).toBe(true);
  });
});
