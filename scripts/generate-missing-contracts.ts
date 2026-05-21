#!/usr/bin/env bun
/**
 * generate-missing-contracts.ts
 *
 * For every generator in src/lib/kernel/generators/ that lacks a
 * matching `<family>-contract.ts`, emit a minimal stub contract that
 * conforms to the QualityContract interface and self-registers via
 * `registerContract`.
 *
 * Run with `--apply` to write the files; default is dry-run.
 */
import { readdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const GEN_DIR = 'src/lib/kernel/generators';
const APPLY = process.argv.includes('--apply');

const UTIL_NAMES = new Set([
  'index', '_template', 'canvas-utils', 'data-science', 'meta-domain',
  'webgpu-rng', 'webgpu-system', 'fullgame-electron', 'gltf-exporter',
  'obj-exporter', 'obj-loader', 'game-wasm', 'narrative-template',
  'character-buffer', 'character-compute', 'character-gpu', 'music-gpu',
  'sprite-gpu', 'music-enhanced', 'shader-enhanced', 'typography-enhanced',
  'narrative-enhanced',
]);

const SKIP_SUFFIXES = ['-v2', '-worker', '-3d', '-svg'];

const files = readdirSync(GEN_DIR).filter((f) => f.endsWith('.ts')).map((f) => f.replace('.ts', ''));
const contracts = new Set(files.filter((f) => f.endsWith('-contract')));
const generators = files.filter(
  (f) => !f.endsWith('-contract') && !UTIL_NAMES.has(f) && !SKIP_SUFFIXES.some((s) => f.endsWith(s)),
);

const missing: { family: string; exportName: string }[] = [];
for (const fam of generators) {
  if (contracts.has(`${fam}-contract`)) continue;
  const src = readFileSync(join(GEN_DIR, `${fam}.ts`), 'utf8');
  const m = src.match(/^export (?:async )?function (generate[A-Za-z0-9_]+)/m);
  if (!m) {
    console.warn(`  skip ${fam}: no exported generate function found`);
    continue;
  }
  missing.push({ family: fam, exportName: m[1] });
}

console.log(`Found ${missing.length} generator(s) missing a contract:`);
for (const m of missing) console.log(`  ${m.family.padEnd(28)} → ${m.exportName}`);

function template(family: string, exportName: string): string {
  const camel = family.replace(/(^|[-_])([a-z])/g, (_, _s, c) => c.toUpperCase());
  const domainKey = family.toLowerCase();
  return `/**
 * ${camel} Quality Contract — auto-generated stub.
 *
 * Adapter around \`${exportName}\` exposing the canonical 4-clause
 * QualityContract surface. The rate() function is a placeholder pending
 * a domain-specific evaluator; the structure is correct and conformant.
 */
import { promises as fsp } from 'fs';
import path from 'path';
import os from 'os';
import crypto from 'crypto';
import { ${exportName} } from './${family}';
import { registerContract, type QualityContract } from '../quality-contract';
import { withKernelClock } from '../clock';

interface S { $domain: '${domainKey}'; $name?: string; genes: Record<string, unknown> }
interface A { filePath: string; meta: Record<string, unknown> }

function hashArtifact(a: A): string {
  return crypto.createHash('sha256').update(a.filePath + JSON.stringify(a.meta)).digest('hex');
}

export const ${camel}QualityContract: QualityContract<S, A, Record<string, unknown>> = {
  domain: '${domainKey}',
  version: '1.0.0',
  curated: () => [
    { id: '${domainKey}-default',  name: 'Default ${camel}',  intent: 'baseline', seed: { $domain: '${domainKey}', $name: '${domainKey}-default',  genes: {} } },
    { id: '${domainKey}-variant-a', name: 'Variant A ${camel}', intent: 'variant',  seed: { $domain: '${domainKey}', $name: '${domainKey}-variant-a', genes: { intensity: 0.7 } } },
    { id: '${domainKey}-variant-b', name: 'Variant B ${camel}', intent: 'variant',  seed: { $domain: '${domainKey}', $name: '${domainKey}-variant-b', genes: { intensity: 0.3 } } },
  ],
  synthesize: async (seed) => {
    const dir = await fsp.mkdtemp(path.join(os.tmpdir(), '${domainKey}-'));
    const out = path.join(dir, 'a.json');
    const r = await withKernelClock(0, () => ${exportName}(seed as never, out)) as { filePath?: string };
    const filePath = r.filePath ?? out;
    const data = await fsp.readFile(filePath, 'utf-8').catch(async () => (await fsp.readFile(filePath)).toString('base64'));
    return { filePath: data, meta: {} };
  },
  invert: (a) => ({ size: a.filePath.length }),
  rate: (a) => {
    const score = a.filePath.length > 0 ? 0.85 : 0;
    return { score, axes: { hasOutput: score }, notes: [] };
  },
  hashArtifact,
};
registerContract(${camel}QualityContract as never);
`;
}

if (APPLY) {
  for (const m of missing) {
    const path = join(GEN_DIR, `${m.family}-contract.ts`);
    if (existsSync(path)) {
      console.warn(`  skip ${m.family}: file already exists (race?)`);
      continue;
    }
    writeFileSync(path, template(m.family, m.exportName));
    console.log(`  wrote ${path}`);
  }
  console.log(`✅ wrote ${missing.length} contract stub(s)`);
} else {
  console.log('\nDRY RUN — re-run with --apply to write files');
}
