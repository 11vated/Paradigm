/**
 * GSPL `engine` keyword — interpreter dispatch.
 *
 * Closes the loop opened in WS23 (lexer + parser): GSPL programs now
 * actually invoke the 9-engine substrate at runtime via a pluggable
 * resolver. The interpreter stays kernel-pure; the resolver lives in
 * src/lib/engines/gspl-resolver.ts.
 *
 * Note: GsplInterpreter.execute() returns an envelope
 * { seeds, output, errors, lastResult } and traps thrown errors into
 * `errors`. Tests inspect `lastResult` and `errors` accordingly.
 *
 * Added by paradigm-infinite/ws-24.
 */
import { describe, it, expect } from 'vitest';
import { GsplInterpreter } from '../../src/lib/kernel/gspl-interpreter.js';
import { createInspectResolver, createGsplEngineResolver } from '../../src/lib/engines/gspl-resolver.js';

async function run(src: string, resolver?: { dispatch: (id: string, req: Record<string, unknown>) => unknown }) {
  const interp = new GsplInterpreter();
  if (resolver) interp.setEngineResolver(resolver);
  return interp.execute(src);
}

describe('GSPL engine block — interpreter dispatch', () => {
  it('without resolver, lastResult is the structured no-resolver record', async () => {
    const env = await run('engine play { kind: "platformer" }');
    expect(env.errors).toEqual([]);
    expect(env.lastResult.__engineDispatch).toBe(true);
    expect(env.lastResult.engine).toBe('play');
    expect(env.lastResult.status).toBe('no-resolver-wired');
    expect(env.lastResult.request).toEqual({ kind: 'platformer' });
  });

  it('with inspect resolver, lastResult is the dispatch envelope', async () => {
    const env = await run(
      'engine matter { kind: "molecule", complexity: 7 }',
      createInspectResolver(),
    );
    expect(env.errors).toEqual([]);
    expect(env.lastResult.__engineDispatch).toBe('inspect');
    expect(env.lastResult.engine).toBe('matter');
    expect(env.lastResult.known).toBe(true);
    expect(env.lastResult.request).toEqual({ kind: 'molecule', complexity: 7 });
  });

  it('flags unknown engine id as not-known via inspect resolver', async () => {
    const env = await run(
      'engine nonexistent { kind: "x" }',
      createInspectResolver(),
    );
    expect(env.errors).toEqual([]);
    expect(env.lastResult.known).toBe(false);
  });

  it('strict real resolver records error for unknown engine id', async () => {
    const env = await run(
      'engine nonexistent { kind: "x" }',
      createGsplEngineResolver({ strict: true }),
    );
    expect(env.errors.length).toBe(1);
    expect(env.errors[0]).toMatch(/unknown engine/);
  });

  it('parses + dispatches each of the 9 engine ids in sequence', async () => {
    const calls: string[] = [];
    const env = await run(
      [
        'engine form { kind: "character" }',
        'engine motion { kind: "dance" }',
        'engine sound { kind: "acoustics" }',
        'engine world { kind: "ecosystem" }',
        'engine mind { kind: "neuroscience" }',
        'engine play { kind: "game" }',
        'engine story { kind: "theater" }',
        'engine matter { kind: "molecule" }',
        'engine field { kind: "electromagnetic" }',
      ].join('\n'),
      {
        async dispatch(id) {
          calls.push(id);
          return { ok: true };
        },
      },
    );
    expect(env.errors).toEqual([]);
    expect(calls).toEqual([
      'form', 'motion', 'sound', 'world', 'mind',
      'play', 'story', 'matter', 'field',
    ]);
  });

  it('determinism: same program twice → identical lastResult', async () => {
    const a = await run(
      'engine play { kind: "platformer", difficulty: 0.8 }',
      createInspectResolver(),
    );
    const b = await run(
      'engine play { kind: "platformer", difficulty: 0.8 }',
      createInspectResolver(),
    );
    expect(a.lastResult).toEqual(b.lastResult);
  });
});
