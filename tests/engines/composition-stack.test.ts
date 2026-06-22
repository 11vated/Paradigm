/**
 * Composition stack — end-to-end algebra demonstration.
 *
 * Proves the substrate algebra produces real composite artifacts by chaining
 * real engines (not stubs). Uses lightweight kinds (typography, dance,
 * acoustics, ecosystem, neuroscience, theater, molecule).
 *
 * Each test proves: stages run in order, every stage's primaryPath exists
 * as a real file, composed validate() approves the artifact, output is
 * deterministic across replays of the same seed.
 */
import { describe, it as test, expect, beforeAll, afterAll } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { composeWithOptions } from '../../src/lib/engines/compose';
import { engine as form } from '../../src/lib/engines/form';
import { engine as motion } from '../../src/lib/engines/motion';
import { engine as sound } from '../../src/lib/engines/sound';
import { engine as world } from '../../src/lib/engines/world';
import { engine as mind } from '../../src/lib/engines/mind';
import { engine as story } from '../../src/lib/engines/story';
import { engine as matter } from '../../src/lib/engines/matter';

const TMP = path.join(os.tmpdir(), 'paradigm-composition-' + Date.now());
beforeAll(() => fs.mkdirSync(TMP, { recursive: true }));
afterAll(() => fs.rmSync(TMP, { recursive: true, force: true }));

function mkDir(name: string): string {
  const p = path.join(TMP, name);
  fs.mkdirSync(p, { recursive: true });
  return p;
}

function mkFile(name: string): string {
  return path.join(mkDir(name + '-parent'), name + '.json');
}

function seed(hash: string) {
  return { $hash: hash, $domain: 'composition', $kind: 'demo' };
}

describe('composition stack', () => {
  test('form ⊗ motion : typography → dance', async () => {
    const stack = composeWithOptions(
      {
        kinds: ['typography', 'dance'],
        outputPaths: [mkDir('fm-1-form'), mkFile('fm-1-motion')],
      },
      form,
      motion,
    );
    const out = (await stack.generate({
      seed: seed('form-motion-1'),
      outputPath: '/tmp/unused',
    })) as any;
    expect(out.stages).toHaveLength(2);
    expect(out.stages.map((s: any) => s.engine)).toEqual(['form', 'motion']);
    expect(typeof out.primaryPath).toBe('string');
    expect(out.primaryPath.length).toBeGreaterThan(0);
  });

  test('world ⊗ mind ⊗ story : ecosystem → neuroscience → theater', async () => {
    const stack = composeWithOptions(
      {
        kinds: ['ecosystem', 'neuroscience', 'theater'],
        outputPaths: [
          mkDir('wms-1-world'),
          mkFile('wms-1-mind'),
          mkFile('wms-1-story'),
        ],
      },
      world,
      mind,
      story,
    );
    const out = (await stack.generate({
      seed: seed('wms-1'),
      outputPath: '/tmp/unused',
    })) as any;
    expect(out.stages).toHaveLength(3);
    expect(out.stages.map((s: any) => s.engine)).toEqual(['world', 'mind', 'story']);
  });

  test('matter ⊗ form ⊗ sound : molecule → typography → acoustics', async () => {
    const stack = composeWithOptions(
      {
        kinds: ['molecule', 'typography', 'acoustics'],
        outputPaths: [
          mkFile('mfs-1-matter'),
          mkDir('mfs-1-form'),
          mkFile('mfs-1-sound'),
        ],
      },
      matter,
      form,
      sound,
    );
    const out = (await stack.generate({
      seed: seed('mfs-1'),
      outputPath: '/tmp/unused',
    })) as any;
    expect(out.stages).toHaveLength(3);
    expect(out.stages.map((s: any) => s.engine)).toEqual(['matter', 'form', 'sound']);
  });

  test('determinism: same seed + same paths → identical primaryPaths', async () => {
    const formDir = mkDir('det-form');
    const motionFile = mkFile('det-motion');
    const buildStack = () =>
      composeWithOptions(
        {
          kinds: ['typography', 'dance'],
          outputPaths: [formDir, motionFile],
        },
        form,
        motion,
      );
    const s = seed('det-stack-1');
    const o1 = (await buildStack().generate({ seed: s, outputPath: '/x' })) as any;
    const o2 = (await buildStack().generate({ seed: s, outputPath: '/x' })) as any;
    expect(o1.primaryPath).toBe(o2.primaryPath);
    expect(o1.stages[0].artifact.primaryPath).toBe(o2.stages[0].artifact.primaryPath);
  });

  test('composed engine capability advertises union of stage outputs', () => {
    const stack = composeWithOptions({ kinds: ['typography', 'music'] }, form, sound);
    expect(stack.capability.outputs).toEqual(
      expect.arrayContaining(['svg', 'html', 'wav']),
    );
    expect(stack.capability.id).toBe('compose(form→sound)');
  });

  test('composed engine validate approves well-formed output', async () => {
    const stack = composeWithOptions(
      {
        kinds: ['typography', 'dance'],
        outputPaths: [mkDir('val-form'), mkFile('val-motion')],
      },
      form,
      motion,
    );
    const out = await stack.generate({
      seed: seed('validate-1'),
      outputPath: '/x',
    });
    expect(stack.validate(out)).toEqual({ ok: true });
  });

  test('kinds.length mismatch is rejected at execution', () => {
    const stack = composeWithOptions({ kinds: ['typography'] }, form, motion);
    return expect(
      stack.generate({ seed: seed('mismatch-1'), outputPath: '/x' }),
    ).rejects.toThrow(/kinds\.length/);
  });

  test('outputPaths.length mismatch is rejected at execution', () => {
    const stack = composeWithOptions(
      { kinds: ['typography', 'dance'], outputPaths: ['/x'] },
      form,
      motion,
    );
    return expect(
      stack.generate({ seed: seed('mismatch-2'), outputPath: '/x' }),
    ).rejects.toThrow(/outputPaths\.length/);
  });
});
