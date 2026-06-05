/**
 * Tests for the database migration system.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { runMigrations, getCurrentVersion, getMigrationStatus, MIGRATIONS, stripKnownHashFragments } from '../../src/lib/data/migrations.js';
import { JsonStore } from '../../src/lib/data/json-store.js';
import fs from 'fs';
import path from 'path';

const TEST_DIR = path.join(process.cwd(), 'data', '_test_migrations');

describe('Migration System', () => {
  let store: JsonStore;

  beforeEach(async () => {
    fs.mkdirSync(TEST_DIR, { recursive: true });
    store = new JsonStore(TEST_DIR);
    await store.init();
  });

  afterEach(async () => {
    await store.close();
    try { fs.rmSync(TEST_DIR, { recursive: true, force: true }); } catch { /* swallow: best-effort test cleanup, fixture torn down */ }
  });

  it('starts at version 0 with no migrations applied', () => {
    expect(getCurrentVersion(TEST_DIR)).toBe(0);
  });

  it('runs all migrations on fresh store', async () => {
    const count = await runMigrations(store, TEST_DIR);
    expect(count).toBe(MIGRATIONS.length);
    expect(getCurrentVersion(TEST_DIR)).toBe(MIGRATIONS[MIGRATIONS.length - 1].version);
  });

  it('does not re-run already applied migrations', async () => {
    const first = await runMigrations(store, TEST_DIR);
    expect(first).toBe(MIGRATIONS.length);

    const second = await runMigrations(store, TEST_DIR);
    expect(second).toBe(0);
  });

  it('migration status shows correct counts', async () => {
    const before = getMigrationStatus(TEST_DIR);
    expect(before.currentVersion).toBe(0);
    expect(before.pendingCount).toBe(MIGRATIONS.length);

    await runMigrations(store, TEST_DIR);

    const after = getMigrationStatus(TEST_DIR);
    expect(after.currentVersion).toBe(MIGRATIONS[MIGRATIONS.length - 1].version);
    expect(after.pendingCount).toBe(0);
    expect(after.applied.length).toBe(MIGRATIONS.length);
  });

  it('records appliedAt timestamp for each migration', async () => {
    const before = Date.now();
    await runMigrations(store, TEST_DIR);
    const after = Date.now();

    const status = getMigrationStatus(TEST_DIR);
    for (const record of status.applied) {
      const ts = new Date(record.appliedAt).getTime();
      expect(ts).toBeGreaterThanOrEqual(before);
      expect(ts).toBeLessThanOrEqual(after + 100);
    }
  });

  it('migration v2 adds $version and $createdAt to seeds', async () => {
    // Add a seed without metadata fields
    await store.addSeed({
      id: 'test-seed-1',
      $domain: 'character',
      $name: 'Test',
      $hash: 'abc123',
      $lineage: { generation: 0, operation: 'create', parents: [] },
      $fitness: { overall: 0.5 },
      genes: {},
    } as any);

    await runMigrations(store, TEST_DIR);

    const seed = await store.getSeedById('test-seed-1') as any;
    expect(seed.$version).toBe(1);
    expect(seed.$createdAt).toBeTruthy();
    expect(seed.$updatedAt).toBeTruthy();
  });

  it('migration v3 normalizes domain names to lowercase', async () => {
    await store.addSeed({
      id: 'test-seed-upper',
      $domain: 'Character', // Mixed case
      $name: 'Upper Test',
      $hash: 'def456',
      $lineage: { generation: 0, operation: 'create', parents: [] },
      $fitness: { overall: 0.5 },
      genes: {},
    } as any);

    await runMigrations(store, TEST_DIR);

    const seed = await store.getSeedById('test-seed-upper') as any;
    expect(seed.$domain).toBe('character');
  });

  it('persists migration file across store restarts', async () => {
    await runMigrations(store, TEST_DIR);
    await store.close();

    // Reopen — migrations should already be recorded
    const store2 = new JsonStore(TEST_DIR);
    await store2.init();

    const count = await runMigrations(store2, TEST_DIR);
    expect(count).toBe(0); // Nothing to apply

    await store2.close();
  });

  it('migration v5 strips baked-in hash fragments from seed names', async () => {
    await store.addSeed({
      id: 'seed-bab69f55eeb28345-0001',
      $domain: 'visual2d',
      $name: 'Cyberpunk City Skyline In Rain bab69f',
      $hash: 'bab69f55eeb283458406dd7ea178d99035a94bd91d7ec27699967e7ffd669e46',
      $lineage: { generation: 1, operation: 'primordial', parents: [] },
      $fitness: { overall: 0.5 },
      genes: {},
    } as any);
    await store.addSeed({
      id: 'seed-210d3e8c-breed-0005',
      $domain: 'character',
      $name: 'Parent d48da8 × Parent 3f5cef',
      $hash: '210d3e8c95a9de4890da2c65a80aca3d022562d025ca7832a2275888540b1ee4',
      $lineage: { generation: 2, operation: 'breed', parents: [
        'd48da81118aeabd00250a6fada4e78a8e2995a8aa5094261890531a5fa1eb033',
        '3f5cef7744343f5d7438f532bac77c929714b6938a4ee897167d9772471379a1',
      ] },
      $fitness: { overall: 0.6 },
      genes: {},
    } as any);

    await runMigrations(store, TEST_DIR);

    const a = await store.getSeedById('seed-bab69f55eeb28345-0001') as any;
    const b = await store.getSeedById('seed-210d3e8c-breed-0005') as any;
    expect(a.$name).toBe('Cyberpunk City Skyline In Rain');
    expect(b.$name).toBe('Parent × Parent');
  });

  it('stripKnownHashFragments preserves real words and unknown hex tokens', () => {
    const known = new Set(['bab69f', 'd48da8']);
    // Strips a known fragment.
    expect(stripKnownHashFragments('Cyberpunk Rain bab69f', known)).toBe('Cyberpunk Rain');
    // Preserves a six-letter word that is coincidentally all hex but NOT a known hash prefix.
    expect(stripKnownHashFragments('Ornate Facade', known)).toBe('Ornate Facade');
    expect(stripKnownHashFragments('A Decade Of Bloom', known)).toBe('A Decade Of Bloom');
    // Leaves a hex token that is not a known prefix untouched.
    expect(stripKnownHashFragments('Vision ffffff', known)).toBe('Vision ffffff');
    // If stripping would empty the name, keep the original.
    expect(stripKnownHashFragments('bab69f', known)).toBe('bab69f');
  });

  it('MIGRATIONS array is in order', () => {
    for (let i = 1; i < MIGRATIONS.length; i++) {
      expect(MIGRATIONS[i].version).toBeGreaterThan(MIGRATIONS[i - 1].version);
    }
  });

  it('all migrations have name and up function', () => {
    for (const m of MIGRATIONS) {
      expect(typeof m.name).toBe('string');
      expect(m.name.length).toBeGreaterThan(0);
      expect(typeof m.up).toBe('function');
    }
  });
});
