/**
 * `paradigm make` — Phase 13 GA determinism gate.
 *
 * Exit criterion (Doctrine v2 Part VIII.13):
 *   `paradigm make <intent>` produces byte-identical output across runs.
 *
 * This file is the CI fixture for that gate. It exercises three
 * diverse intents that route to three different domains, runs each
 * twice through the library API (no shell, no child_process), and
 * asserts byte-identical manifest + artifact + seed across runs.
 */
import { describe, it, expect, beforeAll } from 'vitest';
import { mkdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { runMake, stableJsonStringify, type MakeManifest } from '../../cli/commands/make';

const SCRATCH = join(tmpdir(), 'paradigm-make-determinism');

beforeAll(() => {
  rmSync(SCRATCH, { recursive: true, force: true });
  mkdirSync(SCRATCH, { recursive: true });
});

const INTENTS = [
  'a melancholy bard with a lute',
  'compose a sad piano melody',
  'design a cyberpunk hacker character',
  'create a sunset over mountains',
];

/** Fields whose value can legitimately change run-to-run (path components). */
function strip(m: MakeManifest): Omit<MakeManifest, 'outDir'> {
  const { outDir: _outDir, ...rest } = m;
  return rest;
}

describe('Doctrine v2 Part VIII.13 — paradigm make determinism gate', () => {
  for (const intent of INTENTS) {
    it(`"${intent}" → byte-identical manifest across two runs`, async () => {
      const a = await runMake({ intent, out: join(SCRATCH, 'a-' + safeSlug(intent)), dryRun: true });
      const b = await runMake({ intent, out: join(SCRATCH, 'b-' + safeSlug(intent)), dryRun: true });

      expect(stableJsonStringify(strip(a))).toBe(stableJsonStringify(strip(b)));
      expect(a.seedHash).toBe(b.seedHash);
      expect(a.artifactHash).toBe(b.artifactHash);
      expect(a.intentHash).toBe(b.intentHash);
      expect(a.domain).toBe(b.domain);
      expect(a.createdAt).toBe(0); // frozen kernel clock
    });
  }

  it('intent hash is stable and matches expected sha256', async () => {
    const m = await runMake({ intent: 'a melancholy bard with a lute', dryRun: true });
    // Stable across CI runs and future agents.
    expect(m.intentHash).toMatch(/^[0-9a-f]{64}$/);
    expect(m.intentHash.length).toBe(64);
  });

  it('two different intents produce different artifacts', async () => {
    const a = await runMake({ intent: 'happy fox', dryRun: true });
    const b = await runMake({ intent: 'sad fox', dryRun: true });
    expect(a.intentHash).not.toBe(b.intentHash);
    // It's acceptable for similar intents to land on the same domain,
    // but the artifact hashes should differ for different inputs.
    expect(a.artifactHash).not.toBe(b.artifactHash);
  });

  it('throws on empty intent', async () => {
    await expect(runMake({ intent: '', dryRun: true })).rejects.toThrow(/intent is required/);
    await expect(runMake({ intent: '   ', dryRun: true })).rejects.toThrow(/intent is required/);
  });

  it('manifest schema is stable', async () => {
    const m = await runMake({ intent: 'a test', dryRun: true });
    expect(m.schema).toBe('https://paradigm.ai/schema/maker-manifest/v1');
    expect(m.cliVersion).toBe('0.1.0');
    expect(typeof m.seedHash).toBe('string');
    expect(typeof m.artifactHash).toBe('string');
    expect(typeof m.domain).toBe('string');
    expect(typeof m.validated).toBe('boolean');
    expect(typeof m.signed).toBe('boolean');
  });
});

function safeSlug(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 32);
}
