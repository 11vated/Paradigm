/**
 * Database Migration System
 * ─────────────────────────────────────────────────────────────────────────────
 * Tracks and applies schema changes via versioned migration scripts.
 * Works with both JsonStore (file-based) and MongoStore (MongoDB) backends.
 *
 * Each migration has:
 *  - version: monotonically increasing integer
 *  - name: human-readable description
 *  - up(store): apply the migration
 *
 * Applied migrations are tracked in a `_migrations` metadata file/collection.
 * On startup, initStore() calls runMigrations() which applies any pending ones.
 */

import fs from 'fs';
import path from 'path';

// ─── Migration Definition ───────────────────────────────────────────────────

export interface Migration {
  version: number;
  name: string;
  up: (store: any) => Promise<void>;
  down?: (store: any) => Promise<void>;
}

// ─── Migration Registry ─────────────────────────────────────────────────────
// Add new migrations at the end. Never delete or reorder existing ones.

export const MIGRATIONS: Migration[] = [
  {
    version: 1,
    name: 'initial-schema',
    up: async (_store: any) => {
      // v1: Base schema — seeds, users, audit. No changes needed (already created by stores).
    },
    down: async (_store: any) => {
      // v1: Nothing to undo — base schema is always required.
    },
  },
  {
    version: 2,
    name: 'add-seed-metadata-fields',
    down: async (store: any) => {
      const seeds = await store.getAllSeeds();
      for (const seed of seeds) {
        delete seed.$version;
        delete seed.$createdAt;
        delete seed.$updatedAt;
        await store.updateSeed(seed.id, seed);
      }
    },
    up: async (store: any) => {
      // Ensure all seeds have $version and $createdAt fields
      const seeds = await store.getAllSeeds();
      for (const seed of seeds) {
        let updated = false;
        if (!seed.$version) {
          seed.$version = 1;
          updated = true;
        }
        if (!seed.$createdAt) {
          seed.$createdAt = seed.$lineage?.timestamp || new Date().toISOString();
          updated = true;
        }
        if (!seed.$updatedAt) {
          seed.$updatedAt = seed.$createdAt;
          updated = true;
        }
        if (updated) {
          await store.updateSeed(seed.id, seed);
        }
      }
    },
  },
  {
    version: 3,
    name: 'normalize-domain-names',
    down: async (_store: any) => {
      // Domain names were lowercased — no reliable way to restore original case.
      // This is a safe no-op since lowercase is valid everywhere.
    },
    up: async (store: any) => {
      // Ensure all domain names are lowercase (historical data might have mixed case)
      const seeds = await store.getAllSeeds();
      for (const seed of seeds) {
        if (seed.$domain && seed.$domain !== seed.$domain.toLowerCase()) {
          seed.$domain = seed.$domain.toLowerCase();
          await store.updateSeed(seed.id, seed);
        }
      }
    },
  },
  {
    version: 4,
    name: 'add-user-metadata',
    down: async (store: any) => {
      const users = await store.getUsers();
      for (const user of users) {
        delete user.lastLoginAt;
        delete user.seedCount;
        if (store.updateUser) await store.updateUser(user.id, user);
      }
    },
    up: async (store: any) => {
      // Ensure all users have lastLoginAt and seedCount fields
      const users = await store.getUsers();
      for (const user of users) {
        let updated = false;
        if (!user.lastLoginAt) {
          user.lastLoginAt = user.createdAt;
          updated = true;
        }
        if (user.seedCount === undefined) {
          user.seedCount = 0;
          updated = true;
        }
        if (updated && store.updateUser) {
          await store.updateUser(user.id, user);
        }
      }
    },
  },
];

// ─── Migration Tracker ──────────────────────────────────────────────────────

interface MigrationRecord {
  version: number;
  name: string;
  appliedAt: string;
}

const MIGRATION_FILE = 'migrations.json';

/**
 * Get list of already-applied migration versions.
 */
function getAppliedMigrations(dataDir: string): MigrationRecord[] {
  const filePath = path.join(dataDir, MIGRATION_FILE);
  try {
    if (fs.existsSync(filePath)) {
      return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    }
  } catch {
    // Ignore parse errors
  }
  return [];
}

/**
 * Record that a migration was applied.
 */
function recordMigration(dataDir: string, migration: Migration): void {
  const applied = getAppliedMigrations(dataDir);
  applied.push({
    version: migration.version,
    name: migration.name,
    appliedAt: new Date().toISOString(),
  });
  const filePath = path.join(dataDir, MIGRATION_FILE);
  fs.writeFileSync(filePath, JSON.stringify(applied, null, 2));
}

/**
 * Run all pending migrations against the given store.
 * Returns the number of migrations applied.
 */
export async function runMigrations(store: any, dataDir: string): Promise<number> {
  const applied = getAppliedMigrations(dataDir);
  const appliedVersions = new Set(applied.map(m => m.version));

  const pending = MIGRATIONS.filter(m => !appliedVersions.has(m.version))
    .sort((a, b) => a.version - b.version);

  if (pending.length === 0) return 0;

  let count = 0;
  for (const migration of pending) {
    try {
      await migration.up(store);
      recordMigration(dataDir, migration);
      count++;
    } catch (err: any) {
      // Log but don't crash — migration errors are non-fatal
      console.error(`[MIGRATION] Failed to apply v${migration.version} (${migration.name}): ${err.message}`);
      break; // Stop at first failure to preserve ordering
    }
  }

  return count;
}

/**
 * Rollback the last applied migration.
 * Returns the version that was rolled back, or 0 if nothing to rollback.
 */
export async function runRollback(store: any, dataDir: string): Promise<number> {
  const applied = getAppliedMigrations(dataDir);
  if (applied.length === 0) return 0;

  const latest = applied.reduce((a, b) => a.version > b.version ? a : b);
  const migration = MIGRATIONS.find(m => m.version === latest.version);

  if (!migration?.down) {
    console.error(`[MIGRATION] No down() for v${latest.version} (${latest.name})`);
    return 0;
  }

  try {
    await migration.down(store);
    // Remove from applied list
    const remaining = applied.filter(m => m.version !== latest.version);
    const filePath = path.join(dataDir, MIGRATION_FILE);
    fs.writeFileSync(filePath, JSON.stringify(remaining, null, 2));
    return latest.version;
  } catch (err: any) {
    console.error(`[MIGRATION] Rollback v${latest.version} failed: ${err.message}`);
    return 0;
  }
}

/**
 * Get the current migration version (highest applied).
 */
export function getCurrentVersion(dataDir: string): number {
  const applied = getAppliedMigrations(dataDir);
  if (applied.length === 0) return 0;
  return Math.max(...applied.map(m => m.version));
}

/**
 * Get migration status for diagnostics.
 */
export function getMigrationStatus(dataDir: string): {
  currentVersion: number;
  latestVersion: number;
  pendingCount: number;
  applied: MigrationRecord[];
} {
  const applied = getAppliedMigrations(dataDir);
  const appliedVersions = new Set(applied.map(m => m.version));
  const pending = MIGRATIONS.filter(m => !appliedVersions.has(m.version));

  return {
    currentVersion: getCurrentVersion(dataDir),
    latestVersion: MIGRATIONS.length > 0 ? MIGRATIONS[MIGRATIONS.length - 1].version : 0,
    pendingCount: pending.length,
    applied,
  };
}
