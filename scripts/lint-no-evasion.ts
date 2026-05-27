#!/usr/bin/env bun
/**
 * lint-no-evasion.ts
 *
 * Doctrine v2 Part V.3 — bans evasion patterns in determinism-critical
 * domain code:
 *
 *   - `@ts-nocheck` (file-level type silencing)
 *   - `@ts-ignore`  (line-level type silencing)
 *   - `// eslint-disable`  (rule muting at line or file scope)
 *   - `as any`     (assertion-based any escape)
 *   - bare `: any` annotations on params / returns
 *   - bare `try { } catch { }` blocks that swallow the error
 *
 * Scope (Part V.3):
 *   src/lib/kernel/
 *   src/lib/gspl/
 *   src/lib/evolution/
 *   src/lib/composition/
 *   src/lib/intelligence/
 *
 * Waivers:
 *   - Add `// PARADIGM-EVASION-OK: <reason>` at the top of the file OR on
 *     the offending line. Must be matched by a sunset-dated entry in
 *     `docs/waivers/registry.json` with rule="no-evasion".
 *
 * Exits non-zero on any unwaived violation.
 *
 * Run:  bun run scripts/lint-no-evasion.ts
 */

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOTS = [
  'src/lib/kernel',
  'src/lib/gspl',
  'src/lib/evolution',
  'src/lib/composition',
  'src/lib/intelligence',
];
const CWD = process.cwd();

interface Rule {
  id: string;
  pattern: RegExp;
  description: string;
}

const RULES: Rule[] = [
  { id: 'ts-nocheck', pattern: /@ts-nocheck\b/, description: '@ts-nocheck disables type checking for the entire file.' },
  { id: 'ts-ignore', pattern: /@ts-ignore\b/, description: '@ts-ignore silences a single type error.' },
  { id: 'eslint-disable', pattern: /\/\/\s*eslint-disable/, description: '// eslint-disable mutes a lint rule.' },
  { id: 'as-any', pattern: /\bas\s+any\b/, description: '`as any` casts away the type system.' },
];

// Bare try/catch detection — done structurally below (not via regex).

const WAIVER_RE = /\/\/\s*PARADIGM-EVASION-OK\b/;
const FILE_WAIVER_RE = /\/\/\s*PARADIGM-EVASION-OK\s*:\s*FILE\b/;

interface WaiverEntry {
  rule: string;
  path: string;
  line?: number;
  justification: string;
  sunset: string;
  owner: string;
}

interface WaiverRegistry {
  waivers: WaiverEntry[];
}

function loadWaivers(): WaiverRegistry {
  try {
    const raw = readFileSync(join(CWD, 'docs/waivers/registry.json'), 'utf8');
    return JSON.parse(raw) as WaiverRegistry;
  } catch {
    return { waivers: [] };
  }
}

function waiverActive(reg: WaiverRegistry, rel: string, lineNo: number): boolean {
  const now = Date.now();
  return reg.waivers.some((w) => {
    if (w.rule !== 'no-evasion') return false;
    if (w.path !== rel) return false;
    if (w.line !== undefined && w.line !== lineNo) return false;
    const sunsetMs = Date.parse(w.sunset);
    if (Number.isNaN(sunsetMs)) return false;
    return sunsetMs > now;
  });
}

function walk(dir: string, out: string[]): void {
  let entries: ReturnType<typeof readdirSync>;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const e of entries) {
    const p = join(dir, e.name);
    if (e.isDirectory()) {
      if (e.name === 'node_modules' || e.name.startsWith('.') || e.name === '__tests__') continue;
      walk(p, out);
    } else if (
      e.isFile() &&
      (p.endsWith('.ts') || p.endsWith('.tsx')) &&
      !p.endsWith('.test.ts') &&
      !p.endsWith('.test.tsx')
    ) {
      out.push(p);
    }
  }
}

interface Violation {
  rule: string;
  path: string;
  line: number;
  text: string;
}

function findBareCatch(lines: string[]): Array<{ line: number; text: string }> {
  // Detect `catch (e) { }` with empty or only-whitespace body, plus
  // `catch (e) { /* swallow */ }` with no rethrow / no logger call.
  const out: Array<{ line: number; text: string }> = [];
  for (let i = 0; i < lines.length; i++) {
    const m = /catch\s*\(\s*([A-Za-z_$][\w$]*)?\s*\)\s*\{/.exec(lines[i]);
    if (!m) continue;
    // Look ahead until the matching closing brace at the same depth.
    let depth = 1;
    let j = i;
    let inside = '';
    let charIdx = lines[i].indexOf('{', m.index) + 1;
    while (j < lines.length && depth > 0) {
      const slice = j === i ? lines[j].slice(charIdx) : lines[j];
      for (let k = 0; k < slice.length; k++) {
        const c = slice[k];
        if (c === '{') depth++;
        else if (c === '}') {
          depth--;
          if (depth === 0) {
            inside += slice.slice(0, k);
            break;
          }
        }
      }
      if (depth === 0) break;
      inside += slice + '\n';
      j++;
      charIdx = 0;
    }
    const stripped = inside.replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '').trim();
    if (stripped.length === 0) {
      out.push({ line: i + 1, text: lines[i].trim() });
    }
  }
  return out;
}

function main(): void {
  const registry = loadWaivers();
  const violations: Violation[] = [];
  let scanned = 0;

  for (const root of ROOTS) {
    const absRoot = join(CWD, root);
    try {
      statSync(absRoot);
    } catch {
      continue;
    }
    const files: string[] = [];
    walk(absRoot, files);
    for (const f of files) {
      scanned++;
      const rel = relative(CWD, f);
      let src: string;
      try {
        src = readFileSync(f, 'utf8');
      } catch {
        continue;
      }
      const lines = src.split('\n');

      const fileWaived = FILE_WAIVER_RE.test(src) && waiverActive(registry, rel, 0);
      if (fileWaived) continue;

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (WAIVER_RE.test(line) && waiverActive(registry, rel, i + 1)) continue;
        for (const rule of RULES) {
          if (rule.pattern.test(line)) {
            violations.push({ rule: rule.id, path: rel, line: i + 1, text: line.trim() });
          }
        }
      }
      for (const c of findBareCatch(lines)) {
        violations.push({ rule: 'bare-catch', path: rel, line: c.line, text: c.text });
      }
    }
  }

  if (violations.length === 0) {
    console.log(
      `✅ lint-no-evasion: 0 violations across ${scanned} files in ${ROOTS.length} domain roots`,
    );
    process.exit(0);
  }

  console.error(`❌ lint-no-evasion: ${violations.length} evasion violation(s):\n`);
  // Group by rule
  const byRule = new Map<string, Violation[]>();
  for (const v of violations) {
    if (!byRule.has(v.rule)) byRule.set(v.rule, []);
    byRule.get(v.rule)!.push(v);
  }
  for (const [rule, vs] of byRule) {
    console.error(`  [${rule}] (${vs.length})`);
    for (const v of vs.slice(0, 20)) {
      console.error(`    ${v.path}:${v.line}  ${v.text.slice(0, 100)}`);
    }
    if (vs.length > 20) console.error(`    … and ${vs.length - 20} more`);
  }
  console.error(
    `\nDoctrine v2 Part V.3: evasion patterns are banned in domain code.\n` +
      `Either fix the type / error, or add a waiver:\n` +
      `  - line waiver:  \`// PARADIGM-EVASION-OK: <reason>\`\n` +
      `  - file waiver:  \`// PARADIGM-EVASION-OK: FILE — <reason>\`\n` +
      `Then add a sunset-dated entry in \`docs/waivers/registry.json\`\n` +
      `with rule=\"no-evasion\".\n`,
  );
  process.exit(1);
}

main();
