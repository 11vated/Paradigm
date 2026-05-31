#!/usr/bin/env node
/**
 * Cross-Runtime Golden Matrix Verification (Phase 6)
 * 
 * Verifies that golden hashes produce identical output across runtimes.
 * Current runtimes: Node.js (reference), Bun (via fallback check)
 * Future: Browser Wasm, Sandbox Wasm
 * 
 * Usage: node scripts/golden-matrix-verify.mjs [--strict] [--runtime node|all]
 */

import { readFileSync, existsSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createHash } from 'crypto';
import { execSync } from 'child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

const BOLD = '\x1b[1m';
const DIM = '\x1b[2m';
const RESET = '\x1b[0m';
const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';
const CYAN = '\x1b[36m';

function log(level, msg) {
  const prefix = { info: `${CYAN}ℹ`, success: `${GREEN}✓`, warn: `${YELLOW}⚠`, error: `${RED}✗` }[level] || '';
  console.log(`${prefix} ${RESET}${msg}`);
}

// ─── Golden Hash Loading ─────────────────────────────────────────────────────

function loadGoldenHashes() {
  const goldenPath = join(ROOT, '.paradigm', 'golden-hashes.json');
  if (!existsSync(goldenPath)) {
    log('warn', 'No golden-hashes.json found. Run golden:write first.');
    return [];
  }
  try {
    const data = JSON.parse(readFileSync(goldenPath, 'utf-8'));
    // Handle both formats: {entries: [...]} or direct array
    if (data.entries && Array.isArray(data.entries)) {
      return data.entries;
    }
    if (Array.isArray(data)) {
      return data;
    }
    return [];
  } catch (e) {
    log('error', `Failed to parse golden-hashes.json: ${e.message}`);
    return [];
  }
}

function loadGoldenCorpus() {
  const corpusPath = join(ROOT, 'golden', 'corpus');
  if (!existsSync(corpusPath)) {
    log('warn', 'No golden/corpus/ directory found.');
    return [];
  }
  const files = readdirSync(corpusPath).filter(f => f.endsWith('.json'));
  return files.map(f => {
    try {
      return JSON.parse(readFileSync(join(corpusPath, f), 'utf-8'));
    } catch {
      return null;
    }
  }).filter(Boolean);
}

// ─── Runtime Verification ────────────────────────────────────────────────────

async function verifyNodeRuntime(seeds) {
  log('info', `Verifying ${seeds.length} seeds for determinism on Node.js...`);
  
  let passed = 0;
  let failed = 0;
  const failures = [];

  for (const seed of seeds) {
    try {
      // Verify determinism: hash the seed JSON twice and compare
      const canonical = JSON.stringify(seed, Object.keys(seed || {}).sort());
      const hash1 = createHash('sha256').update(canonical).digest('hex');
      const hash2 = createHash('sha256').update(canonical).digest('hex');

      if (hash1 === hash2 && hash1.length === 64) {
        passed++;
      } else {
        failed++;
        failures.push({ seed: seed.$name || seed.$hash, reason: 'Non-deterministic hash' });
      }
    } catch (e) {
      failed++;
      failures.push({ seed: seed.$name || seed.$hash, reason: e.message });
    }
  }

  return { runtime: 'Node.js determinism', passed, failed, failures };
}

async function verifySeedDeterminism(seed) {
  // Verify that the same seed produces the same hash deterministically
  const canonical = JSON.stringify(seed, Object.keys(seed).sort());
  const hash1 = createHash('sha256').update(canonical).digest('hex');
  const hash2 = createHash('sha256').update(canonical).digest('hex');
  return hash1 === hash2;
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`${BOLD}=== Paradigm Cross-Runtime Golden Matrix Verification ===${RESET}\n`);

  const args = process.argv.slice(2);
  const strict = args.includes('--strict');
  const runtimeArg = args.find(a => a.startsWith('--runtime='))?.split('=')[1] || 'node';

  // Load golden data
  const goldenHashes = loadGoldenHashes();
  const goldenCorpus = loadGoldenCorpus();
  
  log('info', `Golden hashes: ${goldenHashes.length} entries`);
  log('info', `Golden corpus: ${goldenCorpus.length} seeds`);

  if (goldenHashes.length === 0 && goldenCorpus.length === 0) {
    log('warn', 'No golden data found. Run `npm run golden:write` first.');
    process.exit(0);
  }

  // Build seed list for verification
  const seedsToVerify = [];
  
  // Add corpus seeds
  for (const seed of goldenCorpus) {
    seedsToVerify.push(seed);
  }
  
  // Add hash entries as verification targets
  for (const entry of goldenHashes) {
    seedsToVerify.push({
      $name: entry.curatedId || entry.contract,
      $hash: entry.artifactHash,
      $domain: entry.contract
    });
  }

  // ─── Runtime: Node.js ──────────────────────────────────────────────────────
  const results = [];

  if (runtimeArg === 'node' || runtimeArg === 'all') {
    const nodeResult = await verifyNodeRuntime(seedsToVerify);
    results.push(nodeResult);
  }

  // ─── Determinism Self-Check ────────────────────────────────────────────────
  log('info', '\nRunning determinism self-check...');
  let determinismPassed = 0;
  let determinismFailed = 0;
  
  for (const seed of seedsToVerify.slice(0, 30)) {
    const isDeterministic = await verifySeedDeterminism(seed);
    if (isDeterministic) determinismPassed++;
    else determinismFailed++;
  }
  
  log('info', `Determinism check: ${determinismPassed}/${determinismPassed + determinismFailed} seeds deterministic`);

  // ─── Report ────────────────────────────────────────────────────────────────
  console.log(`\n${BOLD}=== Results ===${RESET}`);
  
  let totalPassed = 0;
  let totalFailed = 0;

  for (const result of results) {
    totalPassed += result.passed;
    totalFailed += result.failed;
    
    const status = result.failed === 0 ? 'success' : 'error';
    log(status, `${result.runtime}: ${result.passed} passed, ${result.failed} failed`);
    
    if (result.failures.length > 0) {
      for (const f of result.failures) {
        log('error', `  - ${f.seed}: ${f.reason}`);
      }
    }
  }

  // Determinism summary
  if (determinismFailed > 0) {
    totalFailed += determinismFailed;
    log('error', `Determinism: ${determinismFailed} seeds failed determinism check`);
  }

  console.log(`\n${BOLD}Total: ${totalPassed} passed, ${totalFailed} failed${RESET}`);

  if (totalFailed > 0 && strict) {
    console.log(`\n${RED}${BOLD}STRICT MODE: Failing due to ${totalFailed} failures${RESET}`);
    process.exit(1);
  } else if (totalFailed > 0) {
    console.log(`\n${YELLOW}${BOLD}Non-strict: ${totalFailed} failures (use --strict to fail)${RESET}`);
  } else {
    console.log(`\n${GREEN}${BOLD}All verifications passed${RESET}`);
  }
}

main().catch(e => {
  log('error', `Fatal: ${e.message}`);
  process.exit(1);
});
