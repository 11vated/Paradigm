#!/usr/bin/env node
/**
 * One-time Phase 1 autonomy fixer: remove duplicate `strata` keys from QualityContract objects.
 * Keeps the first declaration (the modern top-level one), removes any later duplicate before manifest().
 * Run with: node scripts/fix-duplicate-strata.cjs
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

function findContractFiles(dir, out = []) {
  let entries;
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return out; }
  for (const e of entries) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (!e.name.startsWith('.') && e.name !== 'node_modules' && e.name !== 'dist' && e.name !== 'build') {
        findContractFiles(p, out);
      }
    } else if (e.isFile() && /-contract\.ts$/.test(e.name)) {
      out.push(p);
    }
  }
  return out;
}

let fixedCount = 0;
let filesTouched = 0;

const files = findContractFiles(path.join(ROOT, 'src'));
files.forEach(full => {
  const rel = path.relative(ROOT, full);
  let src = fs.readFileSync(full, 'utf8');
  const original = src;

  const strataLineRegex = /^\s*strata:\s*\[[^\]]+\]\s*as const,\s*$/gm;
  const matches = [...src.matchAll(strataLineRegex)];

  if (matches.length >= 2) {
    // Remove all but the first occurrence (the modern top-level one after the sweep)
    let removed = 0;
    src = src.replace(strataLineRegex, (m) => {
      if (removed === 0) {
        removed++;
        return m; // keep first
      }
      removed++;
      return ''; // delete subsequent duplicate
    });
    // Clean up blank lines left by deletion
    src = src.replace(/\n\s*\n\s*\n/g, '\n\n');
    src = src.replace(/,\s*\n\s*(manifest|hashArtifact|curated)/g, ',\n  $1');
  }

  if (src !== original) {
    fs.writeFileSync(full, src, 'utf8');
    filesTouched++;
    fixedCount += (matches.length - 1);
    console.log(`Fixed ${rel}: removed ${matches.length - 1} duplicate strata key(s)`);
  }
});

console.log(`\nDone. Touched ${filesTouched} files, removed ${fixedCount} duplicate strata declarations.`);
console.log('Re-run typecheck to verify.');