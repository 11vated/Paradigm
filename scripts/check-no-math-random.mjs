#!/usr/bin/env node
/**
 * Math.random() Scanner
 * Phase 2 / Task 2.1: Scans src/** for Math.random() usage and fails if found.
 * Scripts are excluded (they may use Math.random for non-deterministic purposes).
 * Tests are excluded (they may use mocks).
 */

import { readdirSync, statSync, readFileSync } from 'fs';
import { join, extname } from 'path';

const SRC_DIR = 'src';
const IGNORE_DIRS = ['node_modules', '.git', 'dist', 'coverage', '__pycache__'];
const IGNORE_EXTENSIONS = ['.json', '.md', '.yml', '.yaml', '.dockerfile'];

function scanDir(dir, findings = []) {
  const entries = readdirSync(dir, { withFileTypes: true });
  
  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    
    if (entry.isDirectory()) {
      if (IGNORE_DIRS.includes(entry.name)) continue;
      scanDir(fullPath, findings);
    } else if (entry.isFile()) {
      const ext = extname(entry.name);
      if (IGNORE_EXTENSIONS.includes(ext)) continue;
      
      const content = readFileSync(fullPath, 'utf-8');
      const lines = content.split('\n');
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (/\bMath\.random\b/.test(line) && !line.includes('//') && !line.includes('*')) {
          const cleanLine = line.replace(/\/\/.*$/, '').replace(/\*.*\*\//, '');
          if (/\bMath\.random\b/.test(cleanLine)) {
            findings.push({
              file: fullPath,
              line: i + 1,
              content: line.trim()
            });
          }
        }
      }
    }
  }
  
  return findings;
}

const findings = scanDir(SRC_DIR);

if (findings.length > 0) {
  console.error('\n❌ Math.random() found in source code:\n');
  for (const f of findings) {
    console.error(`  ${f.file}:${f.line}`);
    console.error(`    ${f.content}`);
  }
  console.error(`\n${findings.length} occurrence(s) violates determinism axiom.`);
  console.error('Use rngFromHash() from src/lib/kernel/rng.ts instead.\n');
  process.exit(1);
} else {
  console.log('✅ No Math.random() usage found in source code.');
  process.exit(0);
}