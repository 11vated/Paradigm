/**
 * Tests for the database migration system.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { runMigrations, getCurrentVersion, getMigrationStatus, MIGRATIONS } from '../../src/lib/data/migrations.js';
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
    try { fs.rmSync(TEST_DIR, { recursive: true, force: true }); } catch {}
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

    const seed = store.getSeedById('test-seed-1') as any;
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

    const seed = store.getSeedById('test-seed-upper') as any;
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
