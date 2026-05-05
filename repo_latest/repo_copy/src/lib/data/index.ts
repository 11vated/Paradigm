/**
 * Data layer factory — creates the appropriate store backend.
 *
 * If MONGO_URI is set, uses MongoDB with connection pooling and indexes.
 * Otherwise falls back to JSON file storage (development default).
 */
import { JsonStore } from './json-store.js';
import { MongoStore } from './mongo-store.js';
import { runMigrations, getMigrationStatus } from './migrations.js';
import type { SeedStore } from './types.js';
import path from 'path';

export type { Seed, User, PaginationOptions, PaginatedResult, AuditEntry, SeedStore } from './types.js';
export { JsonStore } from './json-store.js';
export { MongoStore } from './mongo-store.js';
export { getMigrationStatus } from './migrations.js';

let _store: SeedStore | null = null;

/**
 * Initialize and return the data store. Call once at server startup.
 * Automatically selects MongoDB or JSON based on MONGO_URI env var.
 */
export async function initStore(): Promise<SeedStore> {
  if (_store) return _store;

  const mongoUri = process.env.MONGO_URI;

  if (mongoUri) {
    try {
      const store = new MongoStore(mongoUri, process.env.MONGO_DB || 'paradigm');
      await store.init();
      console.log(`[DATA] Connected to MongoDB: ${mongoUri.replace(/\/\/[^@]+@/, '//***@')}`);
      _store = store;

      // Run pending migrations
      const dataDir = path.join(process.cwd(), 'data');
      const migrated = await runMigrations(store, dataDir);
      if (migrated > 0) console.log(`[DATA] Applied ${migrated} migration(s)`);

      return store;
    } catch (err: any) {
      console.error(`[DATA] MongoDB connection failed: ${err.message}`);
      console.error('[DATA] Falling back to JSON file storage.');
    }
  }

  const store = new JsonStore();
  await store.init();
  console.log(`[DATA] Using JSON file storage (set MONGO_URI for MongoDB)`);
  _store = store;

  // Run pending migrations
  const dataDir = path.join(process.cwd(), 'data');
  const migrated = await runMigrations(store, dataDir);
  if (migrated > 0) console.log(`[DATA] Applied ${migrated} migration(s)`);

  return store;
}

/**
 * Get the current store instance. Throws if not initialized.
 */
export function getStore(): SeedStore {
  if (!_store) throw new Error('Data store not initialized. Call initStore() first.');
  return _store;
}
