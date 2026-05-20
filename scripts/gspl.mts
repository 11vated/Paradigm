#!/usr/bin/env -S npx tsx
/**
 * Paradigm GSPL CLI — lex, parse, and run .gspl files with pretty diagnostics.
 */
import { readFileSync } from 'fs';
import { diagnoseGspl, formatDiagnostic } from '../src/lib/kernel/gspl-diagnose';

const [, , cmd, ...rest] = process.argv;

if (!cmd || cmd === '--help' || cmd === '-h') {
  console.log(`paradigm gspl <subcommand>

Commands:
  parse <file>     Lex + parse a .gspl file; print AST or diagnostics.
  check <file>     Parse and exit nonzero on error (CI-friendly).

Examples:
  npx tsx scripts/gspl.mts parse examples/melancholy_bard.gspl
  npx tsx scripts/gspl.mts check examples/drum_loop.gspl
`);
  process.exit(cmd ? 0 : 1);
}

const file = rest[0];
if (!file) { console.error('error: missing <file> argument'); process.exit(2); }

const src = readFileSync(file, 'utf8');
const r = diagnoseGspl(src);

if (cmd === 'check') {
  if (r.ok) { console.log(`✓ ${file} — parsed cleanly (${r.ast?.length ?? 0} top-level nodes)`); process.exit(0); }
  for (const e of r.errors) console.error(formatDiagnostic(e));
  process.exit(1);
}

if (cmd === 'parse') {
  if (!r.ok) { for (const e of r.errors) console.error(formatDiagnostic(e)); process.exit(1); }
  console.log(`✓ parsed (${r.ast?.length ?? 0} top-level nodes)`);
  console.log(JSON.stringify(r.ast, null, 2));
  process.exit(0);
}

console.error(`error: unknown subcommand '${cmd}'`);
process.exit(2);
