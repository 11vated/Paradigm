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

// Self-register all contracts (side-effect imports).
import '../src/lib/friend/contract';
import '../src/lib/kernel/generators/sprite-contract';
import '../src/lib/kernel/generators/music-contract';
import '../src/lib/kernel/generators/narrative-contract';
import '../src/lib/kernel/generators/visual2d-contract';
import '../src/lib/kernel/generators/geometry3d-contract';
import '../src/lib/kernel/generators/character-contract';

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
  paradigm replay leaderboard                       Run conformance for all contracts
  paradigm replay subjects                          List replayable subjects
  paradigm replay help                              Show help

Flags:
  --out <dir>         Write artifact bytes (extension per subject) to dir
  --json              Emit JSON output instead of human-readable
  --quiet             Suppress info output (only print hash on success)

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
}

function parseArgs(argv: string[]): Args {
  const args: Args = { cmd: argv[0] ?? 'help', json: false, quiet: false };
  if (args.cmd === 'replay') {
    args.subject = argv[1];
    let i = 2;
    while (i < argv.length) {
      const a = argv[i];
      if (a === '--id') args.id = argv[++i];
      else if (a === '--verify') args.verify = argv[++i];
      else if (a === '--curated') args.curated = argv[++i];
      else if (a === '--seed-file') args.seedFile = argv[++i];
      else if (a === '--json') args.json = true;
      else if (a === '--out') args.out = argv[++i];
      else if (a === '--quiet') args.quiet = true;
      else if (!args.seed && !a.startsWith('--')) args.seed = a;
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
  const hash = await contract.hashArtifact(artifact);

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
  const contracts = listContracts();
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
  const contracts = listContracts();
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

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));

  if (args.cmd === 'help' || args.cmd === '--help' || args.cmd === '-h' || !args.cmd) {
    usage();
    process.exit(0);
  }

  if (args.cmd === 'verify-all') process.exit(await verifyAll(args));
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
