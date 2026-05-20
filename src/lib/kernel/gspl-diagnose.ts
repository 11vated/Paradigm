/**
 * GSPL 2.0 Diagnostics — structured errors with source context + hints.
 */
import { GsplLexer } from './gspl-lexer';
import { GsplParser, type ASTNode } from './gspl-parser';

export interface GsplDiagnostic {
  code: string;
  message: string;
  hint?: string;
  line: number;
  column: number;
  sourceLine: string;
}

export interface DiagnoseResult {
  ok: boolean;
  ast: ASTNode[] | null;
  errors: GsplDiagnostic[];
}

const HINTS: Record<string, string> = {
  EOF: 'unexpected end of file — did you forget a closing `}` or `)`?',
  IDENT: 'expected an identifier — did you mistype a keyword?',
  STRING: 'expected a string literal — wrap text in "double" or `back` quotes.',
  NUMBER: 'expected a number — check for missing digits or stray characters.',
};

function parseLineCol(msg: string): { line: number; col: number } | null {
  const m = msg.match(/line (\d+),\s*col(?:umn)?\s*(\d+)/i);
  if (!m) return null;
  return { line: Number(m[1]), col: Number(m[2]) };
}

function sourceLineAt(src: string, line: number): string {
  return src.split(/\r?\n/)[line - 1] ?? '';
}

function hintFromMessage(msg: string): string | undefined {
  for (const key of Object.keys(HINTS)) {
    if (msg.includes(key)) return HINTS[key];
  }
  return undefined;
}

export function diagnoseGspl(source: string): DiagnoseResult {
  const errors: GsplDiagnostic[] = [];
  try {
    const tokens = new GsplLexer(source).tokenize();
    const ast = new GsplParser(tokens).parse();
    return { ok: true, ast, errors: [] };
  } catch (e: any) {
    const msg = String(e?.message ?? e);
    const lc = parseLineCol(msg) ?? { line: 1, col: 1 };
    errors.push({
      code: 'PARSE_ERROR',
      message: msg,
      hint: hintFromMessage(msg),
      line: lc.line,
      column: lc.col,
      sourceLine: sourceLineAt(source, lc.line),
    });
    return { ok: false, ast: null, errors };
  }
}

export function formatDiagnostic(d: GsplDiagnostic): string {
  const pointer = ' '.repeat(Math.max(0, d.column - 1)) + '^';
  const lines = [
    `error[${d.code}] line ${d.line}:${d.column}`,
    `  | ${d.sourceLine}`,
    `  | ${pointer}`,
    `  = ${d.message}`,
  ];
  if (d.hint) lines.push(`  hint: ${d.hint}`);
  return lines.join('\n');
}
