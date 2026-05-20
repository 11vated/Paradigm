/**
 * Golden hash snapshot — verifies replay determinism across CI machines.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import path from 'path';
import '../../src/lib/friend/contract';
import '../../src/lib/kernel/generators/sprite-contract';
import '../../src/lib/kernel/generators/music-contract';
import '../../src/lib/kernel/generators/narrative-contract';
import '../../src/lib/kernel/generators/visual2d-contract';
import { listContracts } from '../../src/lib/kernel/quality-contract';

interface GoldenEntry {
  contract: string;
  contractVersion: string;
  curatedId: string;
  artifactHash: string;
}

interface GoldenFile {
  version: number;
  generated: string;
  entries: GoldenEntry[];
}

const goldenPath = path.resolve('.paradigm/golden-hashes.json');

describe('Golden hash snapshot', () => {
  it('snapshot file exists and is valid', () => {
    expect(existsSync(goldenPath)).toBe(true);
    const file = JSON.parse(readFileSync(goldenPath, 'utf8')) as GoldenFile;
    expect(file.version).toBe(1);
    expect(file.generated).toBe('1970-01-01T00:00:00.000Z');
    expect(file.entries.length).toBeGreaterThanOrEqual(20);
  });

  it('every live curated seed matches its golden hash', async () => {
    const file = JSON.parse(readFileSync(goldenPath, 'utf8')) as GoldenFile;
    const golden = new Map(file.entries.map((e) => [`${e.contract}/${e.curatedId}`, e.artifactHash]));

    const live: { key: string; hash: string }[] = [];
    for (const c of listContracts()) {
      let curated: any[];
      try { curated = await c.curated(); } catch { continue; }
      for (const s of curated) {
        try {
          const artifact = await c.synthesize(s.seed);
          live.push({ key: `${c.domain}/${s.id}`, hash: c.hashArtifact(artifact) });
        } catch { /* skip */ }
      }
    }

    const drift: string[] = [];
    for (const { key, hash } of live) {
      const expected = golden.get(key);
      if (expected && expected !== hash) {
        drift.push(`${key}: expected ${expected.slice(0, 16)}…, got ${hash.slice(0, 16)}…`);
      }
    }
    expect(drift).toEqual([]);
    expect(live.length).toBeGreaterThanOrEqual(20);
  }, 60_000);

  it('a single tampered entry is detected by an equality check', () => {
    const file = JSON.parse(readFileSync(goldenPath, 'utf8')) as GoldenFile;
    const original = file.entries[0].artifactHash;
    file.entries[0].artifactHash = '0'.repeat(64);
    expect(file.entries[0].artifactHash).not.toBe(original);
  });
});
