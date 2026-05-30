/**
 * Golden Corpus Regression Harness (Doctrine v2 Phase 2/3 — Official CI Entry point)
 *
 * This is the canonical, CI-grade regression harness for the Paradigm golden corpus.
 * It loads the officially pinned fixtures and performs live regeneration + comparison.
 *
 * Usage:
 *   npx tsx scripts/golden-corpus-regression.ts
 *   npx tsx scripts/golden-corpus-regression.ts --json --strict
 *
 * Exit codes:
 *   0 = All pinned families stable
 *   1 = Drift detected (when --strict)
 */

import { existsSync, readFileSync } from 'fs';
import { SpriteQualityContract } from '../src/lib/kernel/generators/sprite-contract.js';
import { ParticleQualityContract } from '../src/lib/kernel/generators/particle-contract.js';
import { VehicleQualityContract } from '../src/lib/kernel/generators/vehicle-contract.js';

interface PinnedFixture {
  targets: Record<string, string>;
  status?: string;
}

function parseArgs() {
  const args = process.argv.slice(2);
  return {
    json: args.includes('--json'),
    strict: args.includes('--strict'),
  };
}

async function main() {
  const { json, strict } = parseArgs();

  if (!json) {
    console.log('=== Paradigm Golden Corpus Regression (first cohort) ===\n');
  }

  const families = [
    { name: 'sprite', contract: SpriteQualityContract, fixture: 'golden/sprite-golden-hashes.json' },
    { name: 'particle', contract: ParticleQualityContract, fixture: 'golden/particle-golden-hashes.json' },
    { name: 'vehicle', contract: VehicleQualityContract, fixture: 'golden/vehicle-golden-hashes.json' },
  ];

  let totalDrift = 0;
  const results: any = {};

  for (const fam of families) {
    if (!existsSync(fam.fixture)) {
      const msg = `${fam.name.toUpperCase()}: FIXTURE MISSING — ${fam.fixture}`;
      if (!json) console.log(msg);
      results[fam.name] = { status: 'MISSING', drift: [] };
      continue;
    }

    const pinned: PinnedFixture = JSON.parse(readFileSync(fam.fixture, 'utf8'));
    const expected = pinned.targets || {};
    const current: Record<string, string> = {};

    const curated = fam.contract.curated();
    for (const t of curated) {
      try {
        const art = await fam.contract.synthesize(t.seed as any);
        current[t.id] = fam.contract.hashArtifact(art);
      } catch (e: any) {
        current[t.id] = `ERROR: ${e.message}`;
      }
    }

    const drift: string[] = [];
    for (const id of Object.keys(expected)) {
      if (current[id] !== expected[id]) {
        drift.push(id);
      }
    }

    totalDrift += drift.length;
    results[fam.name] = {
      status: drift.length === 0 ? 'OK' : 'DRIFT',
      drift,
      pinnedCount: Object.keys(expected).length,
      currentCount: Object.keys(current).length,
    };

    if (!json) {
      if (drift.length === 0) {
        console.log(`${fam.name.toUpperCase()}: OK (matches pinned — ${Object.keys(expected).length} targets)`);
      } else {
        console.log(`${fam.name.toUpperCase()}: DRIFT DETECTED on ${drift.join(', ')}`);
      }
    }
  }

  const summary = {
    cohort: ['sprite', 'particle', 'vehicle'],
    totalDrift,
    results,
    timestamp: new Date().toISOString(),
  };

  if (json) {
    console.log(JSON.stringify(summary, null, 2));
  } else {
    console.log(`\n=== Golden Corpus Regression Summary ===`);
    console.log(`Pinned cohort: sprite, particle, vehicle`);
    console.log(`Total drift: ${totalDrift}`);

    if (totalDrift === 0) {
      console.log('RESULT: PASSED — All pinned families are stable. First cohort regression clean.');
    } else {
      console.log('RESULT: FAILED — Drift detected in pinned cohort. Do not merge until resolved.');
    }

    console.log('\nThis script is the canonical entrypoint for golden corpus regression (Phase 2/3).');
    console.log('Extend it with more families as they reach PINNED status.');
  }

  if (strict && totalDrift > 0) {
    process.exitCode = 1;
  } else {
    process.exitCode = 0;
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
