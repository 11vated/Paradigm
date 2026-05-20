/**
 * GSPL diagnoser tests — structured errors with source context + hints.
 */
import { describe, it, expect } from 'vitest';
import { diagnoseGspl, formatDiagnostic } from '@/lib/kernel/gspl-diagnose';

describe('diagnoseGspl', () => {
  it('returns ok for empty source', () => {
    const r = diagnoseGspl('');
    expect(r.ok).toBe(true);
    expect(r.errors).toEqual([]);
  });

  it('returns error with source-line context on parse failure', () => {
    const r = diagnoseGspl('seed broken { gene = }');
    expect(r.ok).toBe(false);
    expect(r.errors.length).toBeGreaterThan(0);
    const e = r.errors[0];
    expect(e.code).toBe('PARSE_ERROR');
    expect(e.line).toBeGreaterThan(0);
    expect(e.column).toBeGreaterThan(0);
    expect(e.sourceLine).toContain('seed broken');
  });

  it('attaches a hint when message mentions a known token', () => {
    const r = diagnoseGspl('seed { gene = }');
    expect(r.ok).toBe(false);
    const e = r.errors[0];
    expect(e.hint).toBeDefined();
  });

  it('formatDiagnostic produces multi-line output with caret', () => {
    const r = diagnoseGspl('seed broken { gene = }');
    const out = formatDiagnostic(r.errors[0]);
    expect(out).toMatch(/^error\[PARSE_ERROR\]/);
    expect(out).toContain('^');
    expect(out).toContain('seed broken');
  });

  it('is deterministic on the same source', () => {
    const src = 'invalid gspl !';
    const a = diagnoseGspl(src);
    const b = diagnoseGspl(src);
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });
});
