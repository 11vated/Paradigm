#!/usr/bin/env -S npx tsx
/**
 * Paradigm Replay CLI — reproduce any artifact bit-for-bit.
 *
 * Phase 4 (2/n): generalized across every domain that has a registered
 * Quality Contract. Subjects: friend, music, sprite, narrative, visual2d
 * (and any future domain that registers a QualityContract).
 *
 * Usage:
 *   paradigm replay <subject> <seed-string>           Generate from seed
 *   paradigm replay <subject> --curated <id>          Replay a curated seed
 *   paradigm replay <subject> --seed-file <path>      Replay seed from JSON file
 *   paradigm replay <subject> --json                  Emit JSON
 *   paradigm replay <subject> --out <dir>             Write artifact bytes to dir
 *   paradigm replay friend --id <hash>                Load + replay stored friend
 *   paradigm replay friend --verify <hash>            Verify byte-identity with store
 *   paradigm replay verify-all                        Replay every stored friend
  paradigm golden                                   Write .paradigm/golden-hashes.json
  paradigm verify-golden                            Verify live hashes match the snapshot
 *   paradigm replay leaderboard                       Run conformance, print table
 *   paradigm replay subjects                          List replayable subjects
 *   paradigm replay help                              Show help
 */

import { promises as fs } from 'fs';
import path from 'path';
import process from 'process';
import crypto from 'crypto';
import {
  createFriendSeed,
  generateFriend,
  hashArtifact as hashFriendArtifact,
  getFriendStore,
} from '../src/lib/friend';
import { withKernelClock } from '../src/lib/kernel/clock';
import {
  listContracts,
  getContract,
  runConformance,
} from '../src/lib/kernel/quality-contract';
import { loadContracts, type ContractTier } from './contract-tiers.mts';

// ─── helpers ────────────────────────────────────────────────────────────────

function usage(): void {
  console.log(`Paradigm Replay CLI

Usage:
  paradigm replay <subject> <seed-string>           Generate from genesis seed
  paradigm replay <subject> --curated <id>          Replay a curated seed by id
  paradigm replay <subject> --seed-file <path>      Replay seed from JSON file
  paradigm replay friend --id <hash>                Load + replay an existing friend
  paradigm replay friend --verify <hash>            Replay + verify byte-identity
  paradigm replay verify-all                        Replay every stored friend
  paradigm golden                                   Write .paradigm/golden-hashes.json
  paradigm verify-golden                            Verify live hashes match the snapshot
  paradigm replay leaderboard                       Run conformance for all contracts
  paradigm replay subjects                          List replayable subjects
  paradigm replay help                              Show help

Flags:
  --out <dir>         Write artifact bytes (extension per subject) to dir
  --json              Emit JSON output instead of human-readable
  --quiet             Suppress info output (only print hash on success)
  --tier <name>       Contract tier for proof commands: flagship (default), extended, all
  --contracts <list>  Comma-separated explicit contract domains
  --shard <i/n>       Deterministic slice for golden verification, e.g. 1/4
  --merge             For golden writes, update selected entries in-place

The replay runs under the kernel clock frozen at epoch 0, so observability
fields (timestamps) are reproducible. Two replays of the same seed produce
byte-identical artifact hashes. Ever.`);
}

interface Args {
  cmd: string;        // 'replay' | 'verify-all' | 'leaderboard' | 'subjects' | 'help'
  subject?: string;   // 'friend' | 'music' | 'sprite' | ...
  seed?: string;
  id?: string;
  verify?: string;
  curated?: string;
  seedFile?: string;
  json: boolean;
  out?: string;
  quiet: boolean;
  tier: ContractTier;
  contracts?: string[];
  shard?: { index: number; total: number };
  merge: boolean;
}

function parseArgs(argv: string[]): Args {
  const args: Args = { cmd: argv[0] ?? 'help', json: false, quiet: false, tier: 'flagship', merge: false };
  const parseGlobalFlag = (a: string, i: number): number => {
    if (a === '--json') args.json = true;
    else if (a === '--quiet') args.quiet = true;
    else if (a === '--merge') args.merge = true;
    else if (a === '--tier') args.tier = (argv[++i] as ContractTier) ?? 'flagship';
    else if (a === '--contracts') {
      args.contracts = (argv[++i] ?? '').split(',').map((s) => s.trim()).filter(Boolean);
    } else if (a === '--shard') {
      const raw = argv[++i] ?? '';
      const [indexRaw, totalRaw] = raw.split('/');
      const index = Number(indexRaw);
      const total = Number(totalRaw);
      if (!Number.isInteger(index) || !Number.isInteger(total) || index < 1 || total < 1 || index > total) {
        throw new Error(`Invalid --shard '${raw}'. Expected i/n with 1 <= i <= n.`);
      }
      args.shard = { index, total };
    }
    return i;
  };
  if (args.cmd === 'replay') {
    args.subject = argv[1];
    let i = 2;
    while (i < argv.length) {
      const a = argv[i];
      if (a === '--id') args.id = argv[++i];
      else if (a === '--verify') args.verify = argv[++i];
      else if (a === '--curated') args.curated = argv[++i];
      else if (a === '--seed-file') args.seedFile = argv[++i];
      else if (a === '--out') args.out = argv[++i];
      else if (a === '--json' || a === '--quiet' || a === '--merge' || a === '--tier' || a === '--contracts' || a === '--shard') i = parseGlobalFlag(a, i);
      else if (!args.seed && !a.startsWith('--')) args.seed = a;
      i++;
    }
  } else {
    let i = 1;
    while (i < argv.length) {
      const a = argv[i];
      if (a === '--json' || a === '--quiet' || a === '--merge' || a === '--tier' || a === '--contracts' || a === '--shard') i = parseGlobalFlag(a, i);
      i++;
    }
  }
  return args;
}

function log(quiet: boolean, msg: string): void {
  if (!quiet) console.log(msg);
}

// ─── friend (specialized — keeps id/verify/store semantics) ────────────────

async function replayFriend(args: Args): Promise<number> {
  let friendSeed: Awaited<ReturnType<typeof createFriendSeed>>;
  let mode: string;

  if (args.id || args.verify) {
    const store = getFriendStore();
    await store.load();
    const target = args.id ?? args.verify!;
    const stored = store.get(target);
    if (!stored) {
      console.error(`❌ Friend not found in store: ${target}`);
      return 2;
    }
    friendSeed = stored;
    mode = args.verify ? 'verify' : 'store-replay';
  } else if (args.seed) {
    friendSeed = createFriendSeed(args.seed);
    mode = 'genesis';
  } else {
    console.error(`❌ replay friend requires a seed string OR --id <hash> OR --verify <hash>`);
    return 1;
  }

  const artifact = await withKernelClock(0, () => generateFriend(friendSeed));
  const hash = hashFriendArtifact(artifact);

  if (args.verify) {
    const artifact2 = await withKernelClock(0, () => generateFriend(friendSeed));
    const hash2 = hashFriendArtifact(artifact2);
    if (hash !== hash2) {
      console.error(`❌ Non-determinism detected: ${hash} != ${hash2}`);
      return 3;
    }
    log(args.quiet, `✓ deterministic (verified)`);
  }

  if (args.json) {
    console.log(JSON.stringify({ mode, friendSeed, artifact, hash }, null, 2));
  } else if (args.quiet) {
    console.log(hash);
  } else {
    console.log(`\n🌱 Paradigm Replay — friend`);
    console.log(`   mode      ${mode}`);
    console.log(`   id        ${friendSeed.id}`);
    console.log(`   name      ${friendSeed.name}`);
    console.log(`   archetype ${friendSeed.genes.body.archetype}`);
    console.log(`   pitch     ${friendSeed.genes.voice.pitch.toFixed(1)} Hz`);
    console.log(`   bornAt    ${friendSeed.bornAt}`);
    console.log(`   artifact  ${hash}\n`);
  }

  if (args.out) {
    await fs.mkdir(args.out, { recursive: true });
    const stem = `${friendSeed.name}_${friendSeed.id}`;
    await fs.writeFile(path.join(args.out, `${stem}.svg`), artifact.phenotype.portraitSvg);
    await fs.writeFile(path.join(args.out, `${stem}.json`), JSON.stringify({ friendSeed, artifact, hash }, null, 2));
    log(args.quiet, `Wrote ${stem}.{svg,json} to ${args.out}`);
  }

  return 0;
}

// ─── generic (uses QualityContract for any registered subject) ─────────────

async function replayViaContract(args: Args): Promise<number> {
  await loadContracts({ tier: args.tier, contracts: [args.subject!] });
  const contract = getContract(args.subject!);
  if (!contract) {
    console.error(`❌ No QualityContract registered for: ${args.subject}`);
    console.error(`   Available: ${listContracts().map(c => c.domain).join(', ')}`);
    console.error(`   (geometry3d and character require a browser runtime — not available in Node.)`);
    return 2;
  }

  // Resolve a seed: --curated id, --seed-file path, or raw <seed-string> arg.
  let seed: any;
  let seedLabel: string;
  if (args.curated) {
    const c = contract.curated().find((s: any) => s.id === args.curated);
    if (!c) {
      console.error(`❌ No curated seed '${args.curated}' for ${args.subject}`);
      console.error(`   Available: ${contract.curated().map((s: any) => s.id).join(', ')}`);
      return 2;
    }
    seed = c.seed;
    seedLabel = `curated:${args.curated}`;
  } else if (args.seedFile) {
    const raw = await fs.readFile(args.seedFile, 'utf8');
    seed = JSON.parse(raw);
    seedLabel = `seed-file:${args.seedFile}`;
  } else if (args.seed) {
    // For generic subjects, treat the raw arg as $hash to drive the RNG.
    seed = { $hash: args.seed, $domain: args.subject };
    seedLabel = `seed:${args.seed}`;
  } else {
    // Default to the first curated seed for convenience.
    const curated = contract.curated();
    if (curated.length === 0) {
      console.error(`❌ replay ${args.subject}: no seed provided and no curated seeds.`);
      return 1;
    }
    seed = curated[0].seed;
    seedLabel = `curated:${curated[0].id}`;
  }

  const artifact = await withKernelClock(0, () => contract.synthesize(seed));
  const hashArtifact = contract.hashArtifact ?? ((x: unknown) => crypto.createHash('sha256').update(JSON.stringify(x)).digest('hex'));
  const hash = await hashArtifact(artifact);

  if (args.json) {
    console.log(JSON.stringify({ subject: args.subject, seedLabel, hash }, null, 2));
  } else if (args.quiet) {
    console.log(hash);
  } else {
    console.log(`\n🌱 Paradigm Replay — ${args.subject}`);
    console.log(`   contract  ${contract.domain}@${contract.version}`);
    console.log(`   seed      ${seedLabel}`);
    console.log(`   hash      ${hash}\n`);
  }

  if (args.out) {
    await fs.mkdir(args.out, { recursive: true });
    // For Buffer/Uint8Array artifacts, write the bytes; for strings, write text;
    // for objects, JSON-stringify.
    const stem = `${args.subject}_${hash.slice(0, 12)}`;
    if (Buffer.isBuffer(artifact)) {
      await fs.writeFile(path.join(args.out, `${stem}.bin`), artifact);
    } else if (artifact instanceof Uint8Array) {
      await fs.writeFile(path.join(args.out, `${stem}.bin`), Buffer.from(artifact));
    } else if (typeof artifact === 'string') {
      await fs.writeFile(path.join(args.out, `${stem}.txt`), artifact);
    } else {
      await fs.writeFile(path.join(args.out, `${stem}.json`), JSON.stringify(artifact, null, 2));
    }
    log(args.quiet, `Wrote ${stem} to ${args.out}`);
  }

  return 0;
}

// ─── verify-all ────────────────────────────────────────────────────────────

async function verifyAll(args: Args): Promise<number> {
  const store = getFriendStore();
  await store.load();
  const all = store.list();

  log(args.quiet, `\n🔎 verify-all — ${all.length} friend(s) in store\n`);

  let pass = 0;
  let fail = 0;
  for (const f of all) {
    const a1 = await withKernelClock(0, () => generateFriend(f));
    const a2 = await withKernelClock(0, () => generateFriend(f));
    const h1 = hashFriendArtifact(a1);
    const h2 = hashFriendArtifact(a2);
    if (h1 === h2) {
      pass++;
      log(args.quiet, `  ✓ ${f.id}  ${f.name.padEnd(12)}  ${h1.slice(0, 16)}`);
    } else {
      fail++;
      console.error(`  ✗ ${f.id}  ${f.name.padEnd(12)}  ${h1.slice(0, 16)} != ${h2.slice(0, 16)}`);
    }
  }

  if (args.json) {
    console.log(JSON.stringify({ total: all.length, pass, fail }, null, 2));
  } else {
    console.log(`\n=== ${pass}/${all.length} deterministic, ${fail} drifted ===\n`);
  }

  return fail === 0 ? 0 : 4;
}

// ─── leaderboard ───────────────────────────────────────────────────────────

async function leaderboard(args: Args): Promise<number> {
  const loaded = await loadContracts({ tier: args.tier, contracts: args.contracts, includeCore: args.tier === 'all' });
  const loadedDomains = new Set(loaded);
  const contracts = loadedDomains.has('extended-barrel')
    ? listContracts()
    : listContracts().filter((c) => loadedDomains.has(c.domain));
  const results: Array<{ domain: string; version: string; score: number; passed: number; total: number }> = [];

  for (const c of contracts) {
    try {
      const r = await runConformance(c);
      results.push({
        domain: c.domain,
        version: c.version,
        score: (r.clauses?.rate?.evidence as any)?.score ?? 0,
        passed: Object.values(r.clauses).filter((cl: any) => cl.passed).length,
        total: 5,
      });
    } catch (err) {
      results.push({ domain: c.domain, version: c.version, score: 0, passed: 0, total: 5 });
    }
  }

  if (args.json) {
    console.log(JSON.stringify(results, null, 2));
  } else {
    console.log(`\n┌─ Generator Quality Contract — ${results.length} contract(s) ─────────`);
    console.log(`│ domain             ver        clauses    score`);
    console.log(`├──────────────────────────────────────────────────`);
    for (const r of results) {
      const status = `${r.passed}/${r.total}`;
      const score = r.score.toFixed(3);
      console.log(`│ ${r.domain.padEnd(18)} ${r.version.padEnd(10)} ${status.padEnd(10)} ${score}`);
    }
    console.log(`└──────────────────────────────────────────────────\n`);
  }

  return results.every(r => r.passed === r.total) ? 0 : 5;
}

// ─── subjects ──────────────────────────────────────────────────────────────

async function subjects(args: Args): Promise<number> {
  const loaded = await loadContracts({ tier: args.tier, contracts: args.contracts, includeCore: args.tier === 'all' });
  const loadedDomains = new Set(loaded);
  const contracts = loadedDomains.has('extended-barrel')
    ? listContracts()
    : listContracts().filter((c) => loadedDomains.has(c.domain));
  if (args.json) {
    console.log(JSON.stringify(contracts.map(c => ({ domain: c.domain, version: c.version })), null, 2));
  } else {
    console.log(`\nReplayable subjects (registered Quality Contracts):\n`);
    for (const c of contracts) {
      const cur = c.curated();
      console.log(`  ${c.domain.padEnd(12)} v${c.version}  ${cur.length} curated`);
    }
    console.log(`\n  friend       has stored-replay + verify-all support`);
    console.log(`\nExample:  paradigm replay music --curated v2-anthem\n`);
  }
  return 0;
}

// ─── entrypoint ────────────────────────────────────────────────────────────

// ───────────────────────────────────────────────────────────────────────────
// GOLDEN HASH SNAPSHOTS (Phase 4 / 3)
// ───────────────────────────────────────────────────────────────────────────

const GOLDEN_PATH = '.paradigm/golden-hashes.json';
const GOLDEN_VERSION = 1;

interface GoldenEntry {
  contract: string;
  contractVersion: string;
  curatedId: string;
  artifactHash: string;
}

interface GoldenFile {
  version: number;
  generated: string;
  entries: GoldenEntry[];
}

function goldenEntryKey(e: GoldenEntry): string {
  return `${e.contract}@${e.contractVersion}/${e.curatedId}`;
}

function goldenContractKey(e: GoldenEntry): string {
  return `${e.contract}@${e.contractVersion}`;
}

function sortGoldenEntries(entries: GoldenEntry[]): GoldenEntry[] {
  return [...entries].sort((a, b) =>
    a.contract === b.contract ? a.curatedId.localeCompare(b.curatedId) : a.contract.localeCompare(b.contract)
  );
}

async function collectGoldenEntries(args: Args): Promise<GoldenEntry[]> {
  const loaded = await loadContracts({ tier: args.tier, contracts: args.contracts, includeCore: args.tier === 'all' });
  const loadedDomains = new Set(loaded);
  const loadedContracts = loadedDomains.has('extended-barrel')
    ? listContracts()
    : listContracts().filter((c) => loadedDomains.has(c.domain));
  const contracts = args.shard
    ? loadedContracts.filter((_, i) => i % args.shard!.total === args.shard!.index - 1)
    : loadedContracts;
  const out: GoldenEntry[] = [];
  for (const c of contracts) {
    let curated: any[];
    try {
      curated = await c.curated();
    } catch (e) {
      log(args.quiet, `[skip] ${c.domain}: curated() failed: ${(e as Error).message}`);
      continue;
    }
    for (const s of curated) {
      try {
        const artifact = await c.synthesize(s.seed);
        const hash = c.hashArtifact(artifact);
        out.push({ contract: c.domain, contractVersion: c.version, curatedId: s.id, artifactHash: hash });
      } catch (e) {
        log(args.quiet, `[skip] ${c.domain}/${s.id}: ${(e as Error).message}`);
      }
    }
  }
  return sortGoldenEntries(out);
}

async function golden(args: Args): Promise<number> {
  log(args.quiet, '\n🔒 Paradigm Golden Hash Snapshot\n');
  const entries = await collectGoldenEntries(args);
  const goldenPath = path.resolve(GOLDEN_PATH);
  let finalEntries = entries;
  let preserved = 0;

  if (args.merge) {
    try {
      const existing = JSON.parse(await fs.readFile(goldenPath, 'utf8')) as GoldenFile;
      if (existing.version !== GOLDEN_VERSION) {
        throw new Error(`version ${existing.version} != ${GOLDEN_VERSION}`);
      }
      const selectedContracts = new Set(entries.map(goldenContractKey));
      const untouched = existing.entries.filter((e) => {
        const contractSelected = selectedContracts.has(goldenContractKey(e));
        return !contractSelected;
      });
      preserved = untouched.length;
      const merged = new Map<string, GoldenEntry>();
      for (const e of untouched) merged.set(goldenEntryKey(e), e);
      for (const e of entries) merged.set(goldenEntryKey(e), e);
      finalEntries = sortGoldenEntries([...merged.values()]);
    } catch (e) {
      log(args.quiet, `[merge] existing snapshot unavailable or incompatible: ${(e as Error).message}`);
      finalEntries = entries;
    }
  }

  const file: GoldenFile = {
    version: GOLDEN_VERSION,
    generated: '1970-01-01T00:00:00.000Z', // frozen — file content is deterministic
    entries: finalEntries,
  };
  await fs.mkdir(path.dirname(goldenPath), { recursive: true });
  await fs.writeFile(goldenPath, JSON.stringify(file, null, 2) + '\n', 'utf8');
  const mergeNote = args.merge ? ` (${entries.length} refreshed, ${Math.max(0, preserved)} preserved)` : '';
  log(args.quiet, `✓ Wrote ${finalEntries.length} golden hashes → ${GOLDEN_PATH}${mergeNote}`);
  if (args.quiet) console.log(`${finalEntries.length} entries`);
  return 0;
}

async function verifyGolden(args: Args): Promise<number> {
  log(args.quiet, '\n🔍 Paradigm Verify Golden\n');
  const goldenPath = path.resolve(GOLDEN_PATH);
  let snapshot: GoldenFile;
  try {
    snapshot = JSON.parse(await fs.readFile(goldenPath, 'utf8')) as GoldenFile;
  } catch (e) {
    console.error(`❌ No golden snapshot at ${GOLDEN_PATH}. Run: npx tsx scripts/replay.mts golden`);
    return 2;
  }
  if (snapshot.version !== GOLDEN_VERSION) {
    console.error(`❌ Golden file version ${snapshot.version} ≠ expected ${GOLDEN_VERSION}`);
    return 3;
  }
  const live = await collectGoldenEntries(args);
  const loadedDomains = new Set(args.contracts ?? []);
  if (loadedDomains.size === 0) {
    for (const e of live) loadedDomains.add(e.contract);
  }
  const selectedContracts = listContracts()
    .filter((c) => loadedDomains.has(c.domain))
    .map((c) => `${c.domain}@${c.version}`);
  const selected = new Set(selectedContracts);
  const goldenMap = new Map(snapshot.entries
    .filter((e) => selected.has(`${e.contract}@${e.contractVersion}`))
    .map((e) => [goldenEntryKey(e), e.artifactHash]));
  const liveMap = new Map(live.map((e) => [goldenEntryKey(e), e.artifactHash]));

  const drift: { key: string; expected: string; got: string }[] = [];
  const missing: string[] = [];
  const extra: string[] = [];
  for (const [k, expected] of goldenMap) {
    const got = liveMap.get(k);
    if (got === undefined) { missing.push(k); continue; }
    if (got !== expected) drift.push({ key: k, expected, got });
  }
  for (const k of liveMap.keys()) if (!goldenMap.has(k)) extra.push(k);

  for (const k of missing) console.error(`✗ MISSING (was in golden, not produced now): ${k}`);
  for (const k of extra)   console.error(`! EXTRA   (new since golden was written): ${k}`);
  for (const d of drift) {
    console.error(`✗ DRIFT   ${d.key}`);
    console.error(`    expected: ${d.expected}`);
    console.error(`    got:      ${d.got}`);
  }
  const ok = drift.length === 0 && missing.length === 0;
  log(args.quiet, '');
  if (ok) {
    log(args.quiet, `✓ ${goldenMap.size} golden hashes match. Determinism preserved across machines.`);
    if (extra.length > 0) log(args.quiet, `  (${extra.length} new entries — run \`golden\` to update snapshot)`);
    return 0;
  }
  console.error(`\n❌ Golden verification failed: ${drift.length} drift, ${missing.length} missing.`);
  return 1;
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));

  if (args.cmd === 'help' || args.cmd === '--help' || args.cmd === '-h' || !args.cmd) {
    usage();
    process.exit(0);
  }

  if (args.cmd === 'verify-all') process.exit(await verifyAll(args));
  if (args.cmd === 'golden') process.exit(await golden(args));
  if (args.cmd === 'verify-golden') process.exit(await verifyGolden(args));
  if (args.cmd === 'leaderboard') process.exit(await leaderboard(args));
  if (args.cmd === 'subjects') process.exit(await subjects(args));

  if (args.cmd !== 'replay') {
    console.error(`❌ Unknown command: ${args.cmd}`);
    usage();
    process.exit(1);
  }

  if (!args.subject) {
    console.error(`❌ replay requires a subject`);
    usage();
    process.exit(1);
  }

  if (args.subject === 'friend') process.exit(await replayFriend(args));
  process.exit(await replayViaContract(args));
}

main().catch((err) => {
  console.error('❌ Replay failed:', err);
  process.exit(99);
});
