import { execSync } from 'child_process';
import { createHash } from 'crypto';
import { readFileSync, writeFileSync, existsSync, readdirSync } from 'fs';
import { join } from 'path';

const PKG = JSON.parse(readFileSync('package.json', 'utf-8'));
const VERSION = PKG.version;

const RED = '\x1b[31m';
const GREEN = '\x1b[32m';
const CYAN = '\x1b[36m';
const RESET = '\x1b[0m';

function pass(msg: string) { console.log(`${GREEN}✓${RESET} ${msg}`); }
function fail(msg: string) { console.log(`${RED}✗${RESET} ${msg}`); process.exit(1); }
function step(n: number, msg: string) { console.log(`\n${CYAN}[${n}/7]${RESET} ${msg}`); }

function run(cmd: string, label: string) {
  try {
    execSync(cmd, { stdio: 'pipe', timeout: 120_000 });
    pass(label);
  } catch (e: unknown) {
    const err = e as { stderr?: Buffer; stdout?: Buffer; status?: number };
    console.error(err.stderr?.toString() || err.stdout?.toString() || String(e));
    fail(label);
  }
}

step(1, 'TypeScript typecheck');
run('npx tsc --noEmit', 'Typecheck clean');

step(2, 'Determinism boundary check');
run('node scripts/check-determinism-boundary.mjs', 'No entropy violations');

step(3, 'Quality contract report');
run('npx tsx scripts/quality-contract-report.mts', 'Contracts green');

step(4, 'Golden corpus verification');
run('npx tsx scripts/replay.mts verify-golden --tier flagship', 'Golden hashes match');

step(5, 'Production build');
try {
  execSync('npx vite build', { stdio: 'inherit', timeout: 120_000 });
  pass('Build succeeded');
} catch {
  fail('Build failed');
}

step(6, 'C2PA provenance digest');
const distAssets = join('dist', 'assets');
const hashInputs: string[] = [];
if (existsSync(distAssets)) {
  for (const f of readdirSync(distAssets)) {
    if (f.endsWith('.js') || f.endsWith('.css')) {
      const content = readFileSync(join(distAssets, f));
      const h = createHash('sha256').update(content).digest('hex');
      hashInputs.push(`${f}:${h}`);
    }
  }
}
const buildDigest = createHash('sha256')
  .update(hashInputs.sort().join('\n'))
  .update(VERSION)
  .digest('hex');

const provenance = {
  version: VERSION,
  buildTimestamp: new Date().toISOString(),
  buildTool: 'vite',
  c2paClaimGenerators: ['paradigm-absolute-build'],
  assetDigest: buildDigest,
  assetCount: hashInputs.length,
};
writeFileSync('dist/build-provenance.json', JSON.stringify(provenance, null, 2));
pass(`C2PA provenance written (${hashInputs.length} assets, digest: ${buildDigest.slice(0, 16)}…)`);

step(7, 'Release summary');
const distSize = (() => {
  let total = 0;
  function walk(dir: string) {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const p = join(dir, entry.name);
      if (entry.isDirectory()) walk(p);
      else total += readFileSync(p).length;
    }
  }
  if (existsSync('dist')) walk('dist');
  return total;
})();

console.log(`\n${GREEN}═══════════════════════════════════════${RESET}`);
console.log(`${GREEN}  Paradigm Infinite v${VERSION} Release Ready${RESET}`);
console.log(`${GREEN}───────────────────────────────────────${RESET}`);
console.log(`  Dist size:     ${(distSize / 1024 / 1024).toFixed(2)} MB`);
console.log(`  Build digest:  ${buildDigest.slice(0, 16)}…`);
console.log(`  Assets:        ${hashInputs.length} js/css files`);
console.log(`  Provenance:    dist/build-provenance.json`);
console.log(`${GREEN}═══════════════════════════════════════${RESET}\n`);
