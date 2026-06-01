#!/usr/bin/env tsx
import { readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

const dirs = ['src/lib/kernel', 'src/lib/contracts', 'src/lib/evolution'];
const patterns = [/@ts-nocheck/g, /@ts-ignore(?!.*waived)/g, /as any/g, /catch\s*\(\s*\)/g];

let total = 0;
const offenders: Record<string, number> = {};

function walk(dir: string) {
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    const st = statSync(p);
    if (st.isDirectory()) walk(p);
    else if (p.endsWith('.ts') && !p.includes('.test.')) {
      const content = readFileSync(p, 'utf8');
      for (const re of patterns) {
        const m = content.match(re);
        if (m) {
          total += m.length;
          offenders[p] = (offenders[p] || 0) + m.length;
        }
      }
    }
  }
}

for (const d of dirs) walk(d);

console.log(`Total evasion patterns found: ${total}`);
const sorted = Object.entries(offenders).sort((a,b) => b[1]-a[1]).slice(0, 10);
console.log('Top offenders:');
sorted.forEach(([f, c]) => console.log(`  ${c} in ${f}`));

if (total > 0) {
  console.log('\nAdd to docs/waivers/registry.json or fix. (Non-blocking for now during Phase 0)');
}
process.exit(0);
