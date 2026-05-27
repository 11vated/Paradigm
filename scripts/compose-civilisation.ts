#!/usr/bin/env bun
/**
 * compose-civilisation.ts — produce a full CivilisationBundle from a GSPL-style intent.
 *
 * Usage:
 *   bun run scripts/compose-civilisation.ts "Aurelis" --key F# --mode lydian --tempo 88 --out /tmp/aurelis
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { composeCivilisation, bundleSummary } from '../src/lib/civilisation/orchestrator';

const args = process.argv.slice(2);
const name = args[0] || 'Aurelis';
function flag(n: string, d?: string) { const i = args.indexOf(`--${n}`); return i >= 0 && i+1 < args.length ? args[i+1] : d; }
const outDir = flag('out', `/tmp/civ-${name.toLowerCase()}`)!;
const key = flag('key', 'D');
const mode = flag('mode', 'dorian');
const tempo = Number(flag('tempo', '92'));
const formWidth = Number(flag('formWidth', '384'));
const formHeight = Number(flag('formHeight', '256'));
const parents = flag('parents', '')!.split(',').filter(Boolean);

const t0 = Date.now();
const bundle = composeCivilisation(
  { name, key, mode, tempo, parents, custodian: flag('custodian', '0xCustodian')! },
  { formWidth, formHeight },
);
const elapsed = Date.now() - t0;

mkdirSync(outDir, { recursive: true });
writeFileSync(join(outDir, 'bundle.json'), JSON.stringify(bundle, null, 2));

// Extract each stratum's bytes to its own file
for (const [sid, art] of Object.entries(bundle.strata)) {
  if (!art) continue;
  const m = art.bytesRef.match(/^data:[^;]+;base64,(.+)$/);
  const bytes = m ? Buffer.from(m[1], 'base64') : new Uint8Array();
  let ext = 'bin';
  if (art.mime.startsWith('audio/wav')) ext = 'wav';
  else if (art.mime.startsWith('image/')) ext = 'rgba8';
  else if (art.mime.startsWith('text/plain')) ext = 'txt';
  else if (art.mime.startsWith('application/json')) ext = 'json';
  writeFileSync(join(outDir, `${sid}.${ext}`), bytes);
}

console.log(bundleSummary(bundle));
console.log(`\ncomposed in ${elapsed}ms`);
console.log(`bundle dir: ${outDir}`);
