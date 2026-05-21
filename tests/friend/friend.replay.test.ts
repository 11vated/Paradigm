/**
 * Friend replay determinism test — the substrate's core contract.
 *
 * Asserts that calling the replay CLI twice on the same seed produces
 * byte-identical hashes. This locks in determinism end-to-end:
 *   seed string → kernel.clock + Xoshiro256** → friend genesis →
 *   generator → SVG + phenotype + voice → hash.
 *
 * If this test ever fails, something downstream of the kernel is
 * pulling entropy that the boundary lint missed.
 */

import { describe, it, expect } from 'vitest';
import { execSync } from 'child_process';
import path from 'path';

const REPO_ROOT = path.resolve(__dirname, '..', '..');
const SCRIPT = path.join(REPO_ROOT, 'scripts', 'replay.mts');

function replayQuiet(seedString: string): string {
  const out = execSync(
    `npx tsx ${JSON.stringify(SCRIPT)} replay friend ${JSON.stringify(seedString)} --quiet`,
    { cwd: REPO_ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] },
  ).trim();
  return out;
}

describe('Friend replay CLI — determinism contract', () => {
  it('emits a 64-char hex hash for any seed string', () => {
    const h = replayQuiet('alpha');
    expect(h).toMatch(/^[0-9a-f]{64}$/);
  });

  it('same seed → byte-identical hash (run twice)', () => {
    const a = replayQuiet('replay-determinism-seed-1');
    const b = replayQuiet('replay-determinism-seed-1');
    expect(a).toBe(b);
  });

  it('same seed → byte-identical hash (run three times in different orders)', { timeout: 60_000 }, () => {
    const x1 = replayQuiet('triple-x');
    const y1 = replayQuiet('triple-y');
    const x2 = replayQuiet('triple-x');
    const y2 = replayQuiet('triple-y');
    const x3 = replayQuiet('triple-x');
    expect(x1).toBe(x2);
    expect(x1).toBe(x3);
    expect(y1).toBe(y2);
    expect(x1).not.toBe(y1);
  });

  it('different seeds produce different hashes', { timeout: 60_000 }, () => {
    const hashes = new Set<string>();
    for (const seed of ['s-a', 's-b', 's-c', 's-d', 's-e']) {
      hashes.add(replayQuiet(seed));
    }
    expect(hashes.size).toBe(5);
  });
});
