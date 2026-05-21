#!/usr/bin/env bun
/**
 * ship-dataset.ts — drains the bootstrap JSONL store, applies a filter
 * + curation pass, and writes a fine-tune-ready dataset.
 */
import { promises as fs } from 'node:fs';
import * as path from 'node:path';
import {
  InMemoryBootstrapStore,
  curate,
  exportJsonl,
  exportShareGpt,
  exportAlpaca,
} from '../src/lib/intelligence/bootstrap';
import type { BootstrapExample } from '../src/lib/intelligence/bootstrap';

interface CliOpts {
  store: string;
  out: string;
  format: 'jsonl' | 'sharegpt' | 'alpaca' | 'preference' | 'all';
  minScore?: number;
  approvedOnly?: boolean;
  topIntent?: string;
  domain?: string;
  limit?: number;
}

function parseArgs(argv: string[]): CliOpts {
  const out: any = { format: 'sharegpt' };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    const v = argv[i + 1];
    const consume = () => { i++; };
    switch (a) {
      case '--store':         out.store = v; consume(); break;
      case '--out':           out.out = v; consume(); break;
      case '--format':        out.format = v; consume(); break;
      case '--min-score':     out.minScore = Number(v); consume(); break;
      case '--approved-only': out.approvedOnly = true; break;
      case '--top-intent':    out.topIntent = v; consume(); break;
      case '--domain':        out.domain = v; consume(); break;
      case '--limit':         out.limit = Number(v); consume(); break;
      case '-h': case '--help':
        printHelp(); process.exit(0);
    }
  }
  if (!out.store) { console.error('--store required'); process.exit(2); }
  if (!out.out)   { console.error('--out required');   process.exit(2); }
  return out as CliOpts;
}

function printHelp(): void {
  console.log(`Usage:
  bun fine-tune/ship-dataset.ts --store <path.jsonl> --out <dir> [opts]

Options:
  --format <jsonl|sharegpt|alpaca|all>               default: sharegpt
  --min-score <0..1>                                drop examples below
  --approved-only                                   only userApproved=true
  --top-intent <CREATE|EVOLVE|...>                  filter by intent
  --domain <character|music|...>                    filter by domain
  --limit <n>                                       cap example count
`);
}

async function loadStore(file: string): Promise<InMemoryBootstrapStore> {
  const store = new InMemoryBootstrapStore();
  const raw = await fs.readFile(file, 'utf8').catch(() => '');
  for (const line of raw.split('\n')) {
    if (!line.trim()) continue;
    try { await store.put(JSON.parse(line) as BootstrapExample); } catch { /* skip malformed */ }
  }
  return store;
}

async function main(): Promise<void> {
  const opts = parseArgs(process.argv);
  const store = await loadStore(opts.store);
  let examples = await store.list();
  examples = curate(examples, {
    minOracleScore: opts.minScore,
    userApprovedOnly: opts.approvedOnly,
    topIntent: opts.topIntent,
    domain: opts.domain,
  });
  if (opts.limit) examples = examples.slice(0, opts.limit);
  await fs.mkdir(opts.out, { recursive: true });
  const writers: { name: string; fn: () => { body: string; count: number; bytes: number } }[] = [];
  if (opts.format === 'jsonl' || opts.format === 'all')      writers.push({ name: 'jsonl.jsonl',       fn: () => exportJsonl(examples) });
  if (opts.format === 'sharegpt' || opts.format === 'all')   writers.push({ name: 'sharegpt.jsonl',    fn: () => exportShareGpt(examples) });
  if (opts.format === 'alpaca' || opts.format === 'all')     writers.push({ name: 'alpaca.jsonl',      fn: () => exportAlpaca(examples) });
  // preference-pair export pending: requires ranked-bootstrap captures
  const manifest: any[] = [];
  for (const w of writers) {
    const r = w.fn();
    const dest = path.join(opts.out, w.name);
    await fs.writeFile(dest, r.body);
    manifest.push({ file: w.name, count: r.count, bytes: r.bytes });
    console.log(`✔ wrote ${dest}  ${r.count} examples  ${r.bytes} bytes`);
  }
  await fs.writeFile(path.join(opts.out, 'manifest.json'), JSON.stringify({ source: opts.store, filters: opts, totalExamples: examples.length, outputs: manifest }, null, 2));
}

main().catch((err) => { console.error(err); process.exit(1); });
