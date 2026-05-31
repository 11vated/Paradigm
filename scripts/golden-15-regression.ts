#!/usr/bin/env tsx
/**
 * Lightweight 15_ Golden Corpus Regression (Epoch 1/2)
 *
 * Quick check that flagship golden seeds still produce stable outputs.
 * Extend this into full harness later.
 */

import { promises as fs } from 'fs';
import path from 'path';

const CORPUS_DIR = path.join(process.cwd(), 'golden/corpus');

async function checkDomain(domain: string) {
  const dir = path.join(CORPUS_DIR, domain);
  try {
    const files = await fs.readdir(dir);
    const jsons = files.filter(f => f.endsWith('.json'));
    console.log(`[${domain}] ${jsons.length} golden seeds found`);
    for (const f of jsons) {
      const content = JSON.parse(await fs.readFile(path.join(dir, f), 'utf8'));
      if (!content.hash || !content.expected?.minScore) {
        console.warn(`  WARN: ${f} missing hash or minScore`);
      } else {
        console.log(`  OK: ${f} (minScore ${content.expected.minScore})`);
      }
    }
  } catch {
    console.log(`[${domain}] no golden seeds yet`);
  }
}

async function main() {
  console.log('=== 15_ Golden Corpus Quick Regression ===');
  const flagships = ['character', 'music', 'narrative', 'fullgame', 'universe'];
  for (const d of flagships) {
    await checkDomain(d);
  }
  console.log('\nRun full: npx tsx scripts/replay.mts verify-golden --tier flagship');
  console.log('15_ golden regression stub complete.');
}

main().catch(console.error);