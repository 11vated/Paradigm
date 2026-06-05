/**
 * Data layer factory — creates the appropriate store backend.
 *
 * Priority: PostgreSQL (DATABASE_URL) → MongoDB (MONGO_URI) → JSON file fallback.
 */
import { JsonStore } from './json-store.js';
import { MongoStore } from './mongo-store.js';
import { PostgresStore } from './postgres-store.js';
import { runMigrations } from './migrations.js';
import type { SeedStore } from './types.js';
import path from 'path';

export type { Seed, User, PaginationOptions, PaginatedResult, AuditEntry, SeedStore } from './types.js';
export { JsonStore } from './json-store.js';
export { MongoStore } from './mongo-store.js';
export { PostgresStore } from './postgres-store.js';
export { getMigrationStatus } from './migrations.js';
export { persistCustomGeneTypes, loadCustomGeneTypes } from './gene-type-persistence.js';

let _store: SeedStore | null = null;

/**
 * Initialize and return the data store. Call once at server startup.
 * Priority: PostgreSQL (DATABASE_URL) → MongoDB (MONGO_URI) → JSON file (dev default).
 */
export async function initStore(): Promise<SeedStore> {
  if (_store) return _store;

  const dataDir = path.join(process.cwd(), 'data');

  let store: SeedStore | null = null;

  // 1. Try PostgreSQL (production primary)
  const dbUrl = process.env.DATABASE_URL;
  if (dbUrl) {
    try {
      store = new PostgresStore(dbUrl);
      await store.init();
      console.log(`[DATA] Connected to PostgreSQL: ${dbUrl.replace(/\/\/[^:]+:[^@]+@/, '//***@***@')}`);
      _store = store;
      return store;
    } catch (err: any) {
      console.error(`[DATA] PostgreSQL connection failed: ${err.message}`);
      store = null;
    }
  }

  // 2. Try MongoDB (legacy primary)
  const mongoUri = process.env.MONGO_URI;
  if (mongoUri) {
    try {
      store = new MongoStore(mongoUri, process.env.MONGO_DB || 'paradigm');
      await store.init();
      console.log(`[DATA] Connected to MongoDB: ${mongoUri.replace(/\/\/[^@]+@/, '//***@')}`);
      _store = store;
      await runMigrations(store, dataDir);
      return store;
    } catch (err: any) {
      console.error(`[DATA] MongoDB connection failed: ${err.message}`);
    }
  }

  // 3. JSON file fallback (development default)
  store = new JsonStore();
  await store.init();
  console.log(`[DATA] Using JSON file storage (set DATABASE_URL for PostgreSQL)`);
  _store = store;
  const appliedJson = await runMigrations(store, dataDir);
  // Flush any data migrations rewrote (e.g. seed-name hygiene) so the cleaned
  // state is durable rather than only living in memory until the next write.
  if (appliedJson > 0 && typeof (store as any).persist === 'function') {
    await (store as any).persist();
  }

  return store;
}

/**
 * Get the current store instance. Throws if not initialized.
 */
export function getStore(): SeedStore {
  if (!_store) throw new Error('Data store not initialized. Call initStore() first.');
  return _store;
}
