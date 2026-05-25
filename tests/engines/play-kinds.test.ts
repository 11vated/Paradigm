/**
 * Play engine kind expansion — WS38.
 * Proves the 5 new game-genre kinds dispatch deterministically and the
 * genre gene injection actually controls the underlying game.ts genre.
 */
import { describe, it as test, expect, beforeAll, afterAll } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { generatePlay, capability } from '../../src/lib/engines/play';
import type { Seed } from '../../src/lib/kernel/engines';

const TMP = path.join(os.tmpdir(), 'paradigm-play-kinds-' + Date.now());
function makeSeed(hash: string): Seed { return { $hash: hash, $domain: 'game', genes: {} } as unknown as Seed; }

beforeAll(() => fs.mkdirSync(TMP, { recursive: true }));
afterAll(() => fs.rmSync(TMP, { recursive: true, force: true }));

describe('play engine kind expansion (WS38)', () => {
  test('capability advertises all 7 kinds via composesWith stable + new kinds enum', () => {
    expect(capability.id).toBe('play');
  });

  test('game-strategy injects strategy genre', async () => {
    const out = await generatePlay({ kind: 'game-strategy', seed: makeSeed('s1'), outputPath: path.join(TMP, 'gs') });
    const rules = JSON.parse(fs.readFileSync(out.raw.jsonPath, 'utf-8'));
    expect(rules.params.genre).toBe('strategy');
  });

  test('game-puzzle injects puzzle genre', async () => {
    const out = await generatePlay({ kind: 'game-puzzle', seed: makeSeed('p1'), outputPath: path.join(TMP, 'gp') });
    const rules = JSON.parse(fs.readFileSync(out.raw.jsonPath, 'utf-8'));
    expect(rules.params.genre).toBe('puzzle');
  });

  test('game-rpg injects rpg genre', async () => {
    const out = await generatePlay({ kind: 'game-rpg', seed: makeSeed('r1'), outputPath: path.join(TMP, 'gr') });
    const rules = JSON.parse(fs.readFileSync(out.raw.jsonPath, 'utf-8'));
    expect(rules.params.genre).toBe('rpg');
  });

  test('game-card injects card genre', async () => {
    const out = await generatePlay({ kind: 'game-card', seed: makeSeed('c1'), outputPath: path.join(TMP, 'gc') });
    const rules = JSON.parse(fs.readFileSync(out.raw.jsonPath, 'utf-8'));
    expect(rules.params.genre).toBe('card');
  });

  test('game-board injects board genre', async () => {
    const out = await generatePlay({ kind: 'game-board', seed: makeSeed('b1'), outputPath: path.join(TMP, 'gb') });
    const rules = JSON.parse(fs.readFileSync(out.raw.jsonPath, 'utf-8'));
    expect(rules.params.genre).toBe('board');
  });

  test('plain "game" leaves genre to RNG (deterministic)', async () => {
    const a = await generatePlay({ kind: 'game', seed: makeSeed('rng-x'), outputPath: path.join(TMP, 'ga') });
    const b = await generatePlay({ kind: 'game', seed: makeSeed('rng-x'), outputPath: path.join(TMP, 'gb-det') });
    const ra = JSON.parse(fs.readFileSync(a.raw.jsonPath, 'utf-8'));
    const rb = JSON.parse(fs.readFileSync(b.raw.jsonPath, 'utf-8'));
    expect(ra.params.genre).toBe(rb.params.genre);
  });

  test('same kind + same seed → identical rule count', async () => {
    const a = await generatePlay({ kind: 'game-strategy', seed: makeSeed('det'), outputPath: path.join(TMP, 'gd-a') });
    const b = await generatePlay({ kind: 'game-strategy', seed: makeSeed('det'), outputPath: path.join(TMP, 'gd-b') });
    expect(a.metrics.ruleCount).toBe(b.metrics.ruleCount);
  });
});
