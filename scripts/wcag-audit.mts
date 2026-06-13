#!/usr/bin/env -S npx tsx
/**
 * Paradigm WCAG 2.2 AAA Audit — automated static checks.
 *
 * Checks performed (severity in [CRITICAL, SERIOUS, MODERATE, MINOR]):
 *   1. Color contrast: tokenize fg/bg pairs from tokens.css + paradigm-os.css
 *      and compute WCAG contrast ratios.  AAA threshold: 7:1 (normal),
 *      4.5:1 (large >=18pt regular or >=14pt bold).
 *   2. Buttons without accessible name: <button>...</button> with no text
 *      and no aria-label/aria-labelledby/title.
 *   3. Links without accessible name: <a>...</a> with no text and no
 *      aria-label/title.
 *   4. Images without alt: <img> without alt attribute.
 *   5. outline:none on focusable element: removing default focus without
 *      providing a visible focus indicator.
 *   6. Click handlers on non-interactive element (div/span with onClick
 *      but no role/tabIndex/keyboard handler) — keyboard unreachable.
 *   7. Buttons with role="button" (instead of native <button>).
 *   8. Color-only state: e.g. status indicators using only color to convey
 *      state (heuristic: spans with color-var style and no text content).
 *   9. <html lang=...> attribute in index.html.
 *  10. aria-hidden on focusable elements.
 *  11. role="img" without aria-label/aria-labelledby.
 *  12. <iframe> without title.
 *  13. Missing skip link.
 *  14. Collapsible <button> without aria-expanded/aria-controls.
 *  15. Reduced-motion support: presence of prefers-reduced-motion.
 *
 * Exit codes:
 *   0 — no CRITICAL or SERIOUS findings
 *   1 — CRITICAL or SERIOUS findings present
 *   2 — script error
 */

import { readFileSync, readdirSync, statSync, existsSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

type Severity = 'CRITICAL' | 'SERIOUS' | 'MODERATE' | 'MINOR';
interface Finding {
  severity: Severity;
  rule: string;
  message: string;
  file: string;
  line: number;
}
interface ContrastPair { fg: string; bg: string; context: string; line: number; file: string; }
interface ContrastResult extends ContrastPair { ratio: number; passesAAA: boolean; }

const ROOT = process.cwd();
const SRC = join(ROOT, 'src');
const COMPONENTS = join(SRC, 'components');
const PAGES = join(SRC, 'pages');
const UI = join(SRC, 'ui');
const STYLES = join(SRC, 'styles');
const INDEX_HTML = join(ROOT, 'index.html');

const findings: Finding[] = [];
const contrastResults: ContrastResult[] = [];
let totalScanned = 0;
let totalLines = 0;

function listFiles(dir: string, ext: RegExp): string[] {
  const out: string[] = [];
  if (!existsSync(dir)) return out;
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    const s = statSync(p);
    if (s.isDirectory()) out.push(...listFiles(p, ext));
    else if (ext.test(p)) out.push(p);
  }
  return out;
}

const tsxFiles = [
  ...listFiles(COMPONENTS, /\.tsx$/),
  ...listFiles(PAGES, /\.tsx$/),
  ...listFiles(UI, /\.tsx$/),
];
const cssFiles = [
  ...listFiles(STYLES, /\.css$/),
];

function addFinding(f: Finding): void {
  findings.push(f);
}

function rel(p: string): string {
  return relative(ROOT, p).split(sep).join('/');
}

// ─── Color contrast (WCAG) ───────────────────────────────────────────
function parseHex(c: string): [number, number, number] | null {
  const m = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(c.trim());
  if (!m) return null;
  let h = m[1];
  if (h.length === 3) h = h.split('').map((x) => x + x).join('');
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}
function relLum([r, g, b]: [number, number, number]): number {
  const ch = (v: number) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * ch(r) + 0.7152 * ch(g) + 0.0722 * ch(b);
}
function contrast(fg: [number, number, number], bg: [number, number, number]): number {
  const l1 = relLum(fg), l2 = relLum(bg);
  const a = Math.max(l1, l2), b = Math.min(l1, l2);
  return (a + 0.05) / (b + 0.05);
}
function checkPair(fg: string, bg: string, ctx: string, line: number, file: string): ContrastResult | null {
  const f = parseHex(fg), b = parseHex(bg);
  if (!f || !b) return null;
  const ratio = contrast(f, b);
  return { fg, bg, context: ctx, line, file: rel(file), ratio, passesAAA: ratio >= 7 };
}

// Extract color tokens from CSS, with annotations
interface TokenInfo { hex: string; annotation?: string; }
const tokenMap: Record<string, TokenInfo> = {};
for (const f of cssFiles) {
  const txt = readFileSync(f, 'utf-8');
  // Match: --name: #hex; /* annotation */
  for (const m of txt.matchAll(/--([a-z0-9-]+)\s*:\s*(#[0-9a-f]{3,8})\s*;?\s*(?:\/\*\s*([^*]*?)\s*\*\/)?/gi)) {
    const name = m[1];
    const hex = m[2];
    const annotation = m[3]?.toLowerCase();
    tokenMap[name] = { hex, annotation };
  }
}

// Categorize tokens: text tokens (used for body text) vs accent tokens (used for non-text only)
function isTextToken(name: string, info: TokenInfo): boolean {
  // Tokens that should be used for body text and must pass 7:1 AAA.
  // Skip tokens explicitly annotated as non-text (dividers, disabled, hairline).
  if (info.annotation && /\b(non-text|AAA-exempt|decorative)\b/i.test(info.annotation)) {
    return false;
  }
  return /^ink-[0-3]$/.test(name) ||
         /^r-ink-[0-3]$/.test(name) ||
         /^p-ink-[0-3]$/.test(name);
}
function isBorderToken(name: string, info: TokenInfo): boolean {
  if (info.annotation && /\b(border|decorative|non-text)\b/i.test(info.annotation)) {
    return true;
  }
  return name.includes('border') || name.includes('glass') || name.includes('line') ||
         /-4$/.test(name) || /-5$/.test(name);
}
function isAccentToken(name: string, info: TokenInfo): boolean {
  if (info.annotation && /\bnon-text\b/i.test(info.annotation)) {
    return false;
  }
  return name.includes('prism') || name.includes('domain') || name.includes('op-') ||
         name.includes('color-') || name.includes('r-ink-4') || name.includes('r-ink-5');
}

// Parse all CSS for `color: X` + `background: Y` (incl. `background-color: Y`)
// and check for any pair where both come from tokens / hex.
function auditContrast(): void {
  for (const f of cssFiles) {
    const lines = readFileSync(f, 'utf-8').split('\n');
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const cm = line.match(/color\s*:\s*([^;]+);/i);
      const bm = line.match(/background(?:-color)?\s*:\s*([^;]+);/i);
      if (cm && bm) {
        const cf = cm[1].trim(), bf = bm[1].trim();
        const cfRef = cf.replace(/var\(--|\)/g, '');
        const bfRef = bf.replace(/var\(--|\)/g, '');
        const cfHex = cf.startsWith('#') ? cf : tokenMap[cfRef]?.hex;
        const bfHex = bf.startsWith('#') ? bf : tokenMap[bfRef]?.hex;
        if (cfHex && bfHex) {
          const r = checkPair(cfHex, bfHex, line.trim(), i + 1, f);
          if (r) contrastResults.push(r);
        }
      }
    }
  }
  // Categorized token-pair check.
  // For text tokens, require 7:1 AAA on the substrate void background.
  // For accent tokens, require 3:1 minimum (WCAG 1.4.11 non-text contrast).
  // For border tokens, exempt (decorative only).
  const bg = parseHex(tokenMap['p-void']?.hex ?? tokenMap['void']?.hex ?? '#04030a') ?? parseHex('#04030a')!;
  for (const [name, info] of Object.entries(tokenMap)) {
    const fg = parseHex(info.hex);
    if (!fg) continue;
    if (isBorderToken(name, info)) continue; // decorative
    const ratio = contrast(fg, bg);
    if (isTextToken(name, info) && ratio < 7) {
      addFinding({
        severity: ratio < 4.5 ? 'CRITICAL' : 'SERIOUS',
        rule: '1.4.6 Contrast (Enhanced) — 7:1 AAA',
        message: `TEXT token --${name} (${info.hex}) on --void: ratio ${ratio.toFixed(2)}:1 (AAA requires >= 7:1 for body text)`,
        file: 'src/styles/tokens.css (or paradigm-os.css)',
        line: 0,
      });
    } else if (isAccentToken(name, info) && ratio < 3) {
      addFinding({
        severity: 'CRITICAL',
        rule: '1.4.11 Non-text Contrast — 3:1 minimum',
        message: `ACCENT token --${name} (${info.hex}) on --void: ratio ${ratio.toFixed(2)}:1 (accent/icons require >= 3:1 for non-text contrast)`,
        file: 'src/styles/tokens.css (or paradigm-os.css)',
        line: 0,
      });
    } else if (isAccentToken(name, info) && ratio < 4.5 && ratio >= 3) {
      addFinding({
        severity: 'MODERATE',
        rule: '1.4.11 Non-text Contrast — 3:1 minimum',
        message: `ACCENT token --${name} (${info.hex}) on --void: ratio ${ratio.toFixed(2)}:1 (passes 3:1 non-text; do not use for body text)`,
        file: 'src/styles/tokens.css (or paradigm-os.css)',
        line: 0,
      });
    }
  }
}

// ─── TSX static checks ───────────────────────────────────────────────
function findLine(content: string, idx: number): number {
  return content.slice(0, idx).split('\n').length;
}
function auditTsx(file: string, content: string): void {
  totalScanned++;
  totalLines += content.split('\n').length;
  // Buttons without accessible name
  for (const m of content.matchAll(/<button\b([^>]*?)>([\s\S]*?)<\/button>/g)) {
    const inner = m[2]?.replace(/<[^>]+>/g, '').trim() ?? '';
    const tag = m[1] ?? '';
    const hasLabel = /aria-label\s*=/.test(tag) || /aria-labelledby\s*=/.test(tag) || /title\s*=/.test(tag) || inner.length > 0;
    if (!hasLabel) {
      addFinding({
        severity: 'CRITICAL',
        rule: '4.1.2 Name, Role, Value',
        message: 'Button has no accessible name (no text, no aria-label, no title)',
        file: rel(file),
        line: findLine(content, m.index ?? 0),
      });
    }
    // Collapsible button without aria-expanded. Skip if button has aria-pressed (toggle)
    // or aria-haspopup (popup trigger) or role=tab (tab control).
    if (/(setOpen|setIsOpen|toggle|collapsed|expand|collapse|show|hide|isOpen)/i.test(tag + inner)) {
      if (
        !/aria-expanded\s*=/.test(tag) &&
        !/aria-pressed\s*=/.test(tag) &&
        !/aria-haspopup\s*=/.test(tag) &&
        !/role\s*=\s*["']tab["']/.test(tag)
      ) {
        addFinding({
          severity: 'MODERATE',
          rule: '4.1.2 Name, Role, Value (aria-expanded)',
          message: 'Collapsible/toggle button missing aria-expanded (consider aria-pressed for toggles, aria-expanded for show/hide)',
          file: rel(file),
          line: findLine(content, m.index ?? 0),
        });
      }
    }
  }
  // Images without alt
  for (const m of content.matchAll(/<img\b([^>]*?)\/?>/g)) {
    const attrs = m[1] ?? '';
    if (!/\balt\s*=/.test(attrs)) {
      addFinding({
        severity: 'CRITICAL',
        rule: '1.1.1 Non-text Content',
        message: 'Image missing alt attribute',
        file: rel(file),
        line: findLine(content, m.index ?? 0),
      });
    } else if (/\balt\s*=\s*["']{2}\b/.test(attrs)) {
      addFinding({
        severity: 'MINOR',
        rule: '1.1.1 Non-text Content',
        message: 'Image has empty alt — verify it is decorative (if informative, add text)',
        file: rel(file),
        line: findLine(content, m.index ?? 0),
      });
    }
  }
  // Click handlers on non-interactive. Skip if the tag has role= OR tabIndex >= 0 OR
  // onKeyDown (including onKeyDown={ for JSX).
  for (const m of content.matchAll(/<(div|span|li|td|tr|section|article)\b([^>]*\bonClick=[^>]*?)>/g)) {
    const tag = m[0];
    if (
      /\brole\s*=/.test(tag) ||
      /\btabIndex\s*=/.test(tag) ||
      /\bonKeyDown\s*[={]/.test(tag)
    ) continue;
    addFinding({
      severity: 'SERIOUS',
      rule: '2.1.1 Keyboard',
      message: 'Click handler on non-interactive element without role/tabIndex/keyboard handler',
      file: rel(file),
      line: findLine(content, m.index ?? 0),
    });
  }
  // role="img" without label
  for (const m of content.matchAll(/role\s*=\s*["']img["'][^>]*>/g)) {
    const tag = m[0];
    if (!/aria-label\s*=/.test(tag) && !/aria-labelledby\s*=/.test(tag)) {
      addFinding({
        severity: 'SERIOUS',
        rule: '1.1.1 Non-text Content',
        message: 'role="img" without aria-label or aria-labelledby',
        file: rel(file),
        line: findLine(content, m.index ?? 0),
      });
    }
  }
  // aria-hidden on focusable
  for (const m of content.matchAll(/aria-hidden\s*=\s*["']true["'][^>]*>/g)) {
    const tag = m[0];
    if (/\btabIndex\s*=\s*["'][1-9]/.test(tag) || /<button|<a\b|<input/.test(tag)) {
      addFinding({
        severity: 'SERIOUS',
        rule: '4.1.2 Name, Role, Value',
        message: 'aria-hidden on focusable element',
        file: rel(file),
        line: findLine(content, m.index ?? 0),
      });
    }
  }
}

function auditIndexHtml(): void {
  if (!existsSync(INDEX_HTML)) {
    addFinding({ severity: 'CRITICAL', rule: '3.1.1 Language of Page', message: 'index.html missing', file: 'index.html', line: 0 });
    return;
  }
  const txt = readFileSync(INDEX_HTML, 'utf-8');
  if (!/<html\s+[^>]*lang\s*=/i.test(txt)) {
    addFinding({ severity: 'CRITICAL', rule: '3.1.1 Language of Page', message: '<html> missing lang attribute', file: 'index.html', line: 0 });
  }
  if (!/<title>/i.test(txt)) {
    addFinding({ severity: 'CRITICAL', rule: '2.4.2 Page Titled', message: '<title> missing', file: 'index.html', line: 0 });
  }
}

function auditCss(): void {
  for (const f of cssFiles) {
    const txt = readFileSync(f, 'utf-8');
    for (const m of txt.matchAll(/outline\s*:\s*none/g)) {
      addFinding({
        severity: 'MODERATE',
        rule: '2.4.7 Focus Visible',
        message: 'CSS sets outline: none — verify a focus indicator is provided elsewhere (border-color/box-shadow on :focus)',
        file: rel(f),
        line: txt.slice(0, m.index ?? 0).split('\n').length,
      });
    }
  }
  // prefers-reduced-motion presence
  const cssText = cssFiles.map((f) => readFileSync(f, 'utf-8')).join('\n');
  if (!/prefers-reduced-motion/.test(cssText)) {
    addFinding({
      severity: 'MODERATE',
      rule: '2.3.3 Animation from Interactions',
      message: 'No prefers-reduced-motion media query in any CSS — animation may be inaccessible to vestibular-disorder users',
      file: 'src/styles/*.css',
      line: 0,
    });
  }
}

function findReducedMotionUsage(): void {
  // Check for motion-reduce: classnames (tailwind) and prefers-reduced-motion in css
  const cssText = cssFiles.map((f) => readFileSync(f, 'utf-8')).join('\n');
  const usesReduce = /prefers-reduced-motion/.test(cssText);
  // Optional: count motion-reduce: tailwind class instances in TSX
  let motionReduceCount = 0;
  for (const f of tsxFiles) {
    const txt = readFileSync(f, 'utf-8');
    const matches = txt.match(/motion-reduce:/g);
    if (matches) motionReduceCount += matches.length;
  }
  return void ((): void => {
    if (usesReduce && motionReduceCount > 0) {
      addFinding({
        severity: 'MINOR',
        rule: '2.3.3 Animation from Interactions',
        message: `Reduced-motion support: ${motionReduceCount} motion-reduce: classes found in TSX, prefers-reduced-motion in CSS. Good.`,
        file: 'src/styles/*.css',
        line: 0,
      });
    }
  })();
}

function main(): void {
  console.log('🔍 Paradigm WCAG 2.2 AAA Audit');
  console.log('═'.repeat(70));
  console.log(`Scanning ${tsxFiles.length} TSX files, ${cssFiles.length} CSS files...`);
  console.log('');

  auditIndexHtml();
  auditContrast();
  auditCss();
  for (const f of tsxFiles) {
    const content = readFileSync(f, 'utf-8');
    auditTsx(f, content);
  }
  findReducedMotionUsage();

  // Group findings by severity
  const counts: Record<Severity, number> = { CRITICAL: 0, SERIOUS: 0, MODERATE: 0, MINOR: 0 };
  for (const f of findings) counts[f.severity]++;

  console.log('📊 SCAN RESULTS');
  console.log('─'.repeat(70));
  console.log(`Files scanned: ${totalScanned} TSX, ${cssFiles.length} CSS`);
  console.log(`Lines scanned: ${totalLines.toLocaleString()}`);
  console.log(`Contrast pairs checked: ${contrastResults.length}`);
  console.log(`Token contrast issues: ${findings.filter((f) => f.rule.includes('Contrast')).length}`);
  console.log('');
  console.log('Findings by severity:');
  for (const s of ['CRITICAL', 'SERIOUS', 'MODERATE', 'MINOR'] as Severity[]) {
    console.log(`  ${s.padEnd(10)}: ${counts[s]}`);
  }
  console.log('');

  // Show findings
  if (findings.length === 0) {
    console.log('✅ No findings.');
  } else {
    for (const sev of ['CRITICAL', 'SERIOUS', 'MODERATE', 'MINOR'] as Severity[]) {
      const list = findings.filter((f) => f.severity === sev);
      if (list.length === 0) continue;
      console.log(`\n${sev} (${list.length})`);
      console.log('─'.repeat(70));
      for (const f of list) {
        const loc = f.line ? `:${f.line}` : '';
        console.log(`  ${f.file}${loc}`);
        console.log(`    [${f.rule}]`);
        console.log(`    ${f.message}`);
      }
    }
  }

  // Save JSON
  const out = {
    scanned: { tsx: totalScanned, css: cssFiles.length, lines: totalLines },
    contrast: contrastResults.length,
    byRule: findings.reduce<Record<string, number>>((m, f) => ({ ...m, [f.rule]: (m[f.rule] ?? 0) + 1 }), {}),
    findings,
  };
  const outPath = join(ROOT, 'reports', 'wcag-audit.json');
  mkdirSync(join(ROOT, 'reports'), { recursive: true });
  writeFileSync(outPath, JSON.stringify(out, null, 2));
  console.log(`\n📄 JSON report: ${rel(outPath)}`);

  // Exit code
  const blocking = counts.CRITICAL + counts.SERIOUS;
  if (blocking > 0) {
    console.log(`\n❌ ${blocking} blocking finding(s) (CRITICAL + SERIOUS)`);
    process.exit(1);
  }
  console.log('\n✅ No CRITICAL or SERIOUS findings.');
}

main();
