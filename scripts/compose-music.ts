#!/usr/bin/env bun
/**
 * compose-music.ts — produce real composed music from a Paradigm seed.
 *
 * Usage:
 *   bun run scripts/compose-music.ts <seed-id> [--out file.wav] [--bars 16] [--tempo 96]
 *                                              [--key C] [--mode dorian] [--contour arch]
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { composeAndRender } from '../src/lib/music';

const args = process.argv.slice(2);
const seedId = args[0];
if (!seedId) { console.error('usage: compose-music <seed-id> [--out file.wav] [--bars N] [--tempo BPM] [--key C] [--mode dorian]'); process.exit(2); }

function flag(name: string, def?: string): string | undefined {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && i + 1 < args.length ? args[i + 1] : def;
}

const seedFile = join('data/commons/seeds/music', seedId + '.json');
let seed: any;
try { seed = JSON.parse(readFileSync(seedFile, 'utf8')); }
catch { seed = { $hash: seedId, genes: {} }; }

const out = flag('out', `/tmp/${seedId}.wav`)!;
const bars = Number(flag('bars', '16'));
const tempo = Number(flag('tempo', '96'));
const key = flag('key', String(seed.genes?.key?.value ?? 'C'));
const mode = flag('mode', String(seed.genes?.scale?.value ?? 'ionian'));
const contour = (flag('contour', 'arch') as any);

const result = composeAndRender(seed, { bars, tempo, key, mode: mode as any, contour });
writeFileSync(out, result.wav);

console.log(`✓ ${result.summary}`);
console.log(`  out: ${out}`);
console.log(`  progression: ${result.progression.slice(0, 8).map(s => `${s.roman.degree}${s.roman.quality}(${s.roman.function})`).join(' → ')}${result.progression.length > 8 ? ' → …' : ''}`);
console.log(`  voiced ${result.voicedChords[0].voicesMidi.length}-voice chords, melody ${result.melody.length} notes, bass ${result.bass.length} notes`);
