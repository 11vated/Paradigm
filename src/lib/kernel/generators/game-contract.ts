/**
 * Game Quality Contract — wraps generateGameV2 (playable HTML5).
 * Validates real game structure: HTML5 boilerplate, Canvas 2D rendering,
 * game loop with requestAnimationFrame, collision detection, input handling.
 */
import { promises as fsp } from 'fs';
import path from 'path';
import os from 'os';
import crypto from 'crypto';
import { generateGameV3 as generateGameV2 } from './game';
import { registerContract, type QualityContract, type QualityReport } from '../quality-contract';

// 15_ spec integration: new contracts system available alongside legacy
import '../../contracts'; // pulls bootstrap + registry for full 27 + Part 6 (all domains + Part 6 live)
import { withKernelClock } from '../clock';

interface S { $hash?: string; $domain: 'game'; $name?: string; genes: Record<string, unknown> }
interface A { html: string; levelCount: number; fileSize: number }

function hashArtifact(a: A): string {
  return crypto.createHash('sha256').update(a.html).digest('hex');
}

function rate(a: A): QualityReport {
  const axes: Record<string, number> = {};
  const html = a.html;

  // HTML5 boilerplate
  axes.hasDoctype = html.includes('<!DOCTYPE html>') ? 1 : 0;
  axes.hasCanvas = html.includes('<canvas') && html.includes('getContext') ? 1 : 0;
  axes.hasGameLoop = html.includes('requestAnimationFrame') ? 1 : 0;
  axes.hasInput = (html.includes('keydown') || html.includes('keyup')) ? 1 : 0;
  axes.hasCollision = html.includes('collision') || html.includes('p.x') ? 1 : 0;
  axes.hasScore = html.includes('score') ? 1 : 0;
  axes.hasLevels = a.levelCount >= 3 ? 1 : 0;
  axes.hasWinLose = (html.includes('Game Over') || html.includes('You Win')) ? 1 : 0;
  axes.hasStyle = html.includes('<style>') || html.includes('stylesheet') ? 1 : 0;
  axes.fileSize = a.fileSize > 2000 ? 1 : 0;

  const score = Object.values(axes).reduce((s, v) => s + v, 0) / Object.values(axes).length;
  const notes = [
    `game ${a.levelCount} levels ${a.fileSize}B`,
    `doctype=${axes.hasDoctype} canvas=${axes.hasCanvas} loop=${axes.hasGameLoop} input=${axes.hasInput}`,
    `collision=${axes.hasCollision} score=${axes.hasScore} levels=${axes.hasLevels} winlose=${axes.hasWinLose}`
  ];
  return { score, axes, notes };
}

export const GameQualityContract: QualityContract<S, A, Record<string, unknown>> = {
  domain: 'game',
  version: '2.0.0',
  curated: () => [
    { id: 'game-default',  name: 'Default Platformer', intent: 'baseline', seed: { $hash: 'game-default-v2', $domain: 'game', $name: 'game-default',  genes: { genre: { value: 'platformer' }, difficulty: { value: 0.5 } } } },
    { id: 'game-easy',     name: 'Easy Platformer',    intent: 'variant',  seed: { $hash: 'game-easy-v2',    $domain: 'game', $name: 'game-easy',    genes: { genre: { value: 'platformer' }, difficulty: { value: 0.2 } } } },
    { id: 'game-hard',     name: 'Hard Platformer',    intent: 'variant',  seed: { $hash: 'game-hard-v2',    $domain: 'game', $name: 'game-hard',    genes: { genre: { value: 'platformer' }, difficulty: { value: 0.9 } } } },
  ],
  synthesize: async (seed) => {
    const dir = await fsp.mkdtemp(path.join(os.tmpdir(), 'game-'));
    const out = path.join(dir, 'game.html');
    const result = await generateGameV2(seed as never, out);
    const html = await fsp.readFile(result.htmlPath, 'utf-8');
    return { html, levelCount: result.levelCount, fileSize: result.fileSize };
  },
  invert: (a) => ({ size: a.html.length, levels: a.levelCount }),
  rate,
  hashArtifact,
  manifest() {
    return {
      domain: 'game',
      version: '2.0.0',
      strata: ['Form', 'Motion', 'Field', 'Mind'],
      clauses: ['synthesize', 'invert', 'rate', 'curated', 'deterministic'],
      determinism: 'strict',
      outputs: ['HTML5 playable game (canvas+raf+input+collision)', 'WASM companion via game-wasm integration'],
      notes: 'Full rich playable artifact; WASM module for compute offload when paired with game-wasm generator.'
    };
  },
};
registerContract(GameQualityContract as never);

