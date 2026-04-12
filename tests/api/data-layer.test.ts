/**
 * Integration tests for the Data Access Layer (JsonStore)
 * Tests seed CRUD, pagination, user management, and audit logging.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { JsonStore } from '../../src/lib/data/json-store.js';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const TEST_DIR = path.join(process.cwd(), 'data', '_test_dal');

function makeSeed(overrides: Record<string, any> = {}) {
  const id = crypto.randomUUID();
  return {
    id,
    $domain: 'character',
    $name: `Test Seed ${id.slice(0, 6)}`,
    $hash: crypto.createHash('sha256').update(id).digest('hex').slice(0, 16),
    $lineage: { generation: 0, operation: 'create', parents: [] },
    $fitness: { overall: Math.random() },
    genes: { strength: { type: 'scalar', value: 0.5 } },
    ...overrides,
  };
}

describe('JsonStore Data Layer', () => {
  let store: JsonStore;

  beforeEach(async () => {
    // Create fresh test directory
    fs.mkdirSync(TEST_DIR, { recursive: true });
    store = new JsonStore(TEST_DIR);
    await store.init();
  });

  afterEach(async () => {
    await store.close();
    // Clean up test files
    try {
      fs.rmSync(TEST_DIR, { recursive: true, force: true });
    } catch {}
  });

  // ─── Seed CRUD ─────────────────────────────────────────────────────────────

  describe('Seed CRUD', () => {
    it('adds and retrieves a seed by ID', async () => {
      const seed = makeSeed();
      await store.addSeed(seed);
      const found = await store.getSeedById(seed.id);
      expect(found).toBeTruthy();
      expect(found!.id).toBe(seed.id);
      expect(found!.$name).toBe(seed.$name);
    });

    it('returns null for non-existent seed', async () => {
      const found = await store.getSeedById('nonexistent-id');
      expect(found).toBeFalsy();
    });

    it('lists all seeds', async () => {
      const s1 = makeSeed();
      const s2 = makeSeed({ $domain: 'music' });
      await store.addSeed(s1);
      await store.addSeed(s2);

      const all = await store.getAllSeeds();
      expect(all.length).toBe(2);
    });

    it('updates an existing seed', async () => {
      const seed = makeSeed();
      await store.addSeed(seed);

      const updated = { ...seed, $name: 'Updated Name' };
      await store.updateSeed(seed.id, updated);

      const found = await store.getSeedById(seed.id);
      expect(found!.$name).toBe('Updated Name');
    });

    it('deletes a seed', async () => {
      const seed = makeSeed();
      await store.addSeed(seed);
      const deleted = await store.deleteSeed(seed.id);
      expect(deleted).toBe(true);

      const found = await store.getSeedById(seed.id);
      expect(found).toBeFalsy();
    });

    it('returns false when deleting non-existent seed', async () => {
      const deleted = await store.deleteSeed('ghost-id');
      expect(deleted).toBe(false);
    });

    it('handles batch add via addSeeds', async () => {
      const seeds = [makeSeed(), makeSeed(), makeSeed()];
      await store.addSeeds(seeds);
      const all = await store.getAllSeeds();
      expect(all.length).toBe(3);
    });
  });

  // ─── Query & Filtering ────────────────────────────────────────────────────

  describe('Query & Filtering', () => {
    it('filters seeds by domain', async () => {
      await store.addSeeds([
        makeSeed({ $domain: 'character' }),
        makeSeed({ $domain: 'character' }),
        makeSeed({ $domain: 'music' }),
        makeSeed({ $domain: 'sprite' }),
      ]);

      const characters = await store.getSeedsByDomain('character');
      expect(characters.length).toBe(2);

      const music = await store.getSeedsByDomain('music');
      expect(music.length).toBe(1);
    });

    it('returns seed count', async () => {
      await store.addSeeds([makeSeed(), makeSeed(), makeSeed()]);
      const count = await store.getSeedCount();
      expect(count).toBe(3);
    });

    it('returns 0 count for empty store', async () => {
      const count = await store.getSeedCount();
      expect(count).toBe(0);
    });

    it('finds seeds with pagination', async () => {
      // Add 15 seeds
      const seeds = Array.from({ length: 15 }, (_, i) =>
        makeSeed({ $domain: i % 2 === 0 ? 'character' : 'music' })
      );
      await store.addSeeds(seeds);

      const page1 = await store.findSeeds({ page: 1, limit: 5 });
      expect(page1.items.length).toBe(5);
      expect(page1.pagination.total).toBe(15);
      expect(page1.pagination.totalPages).toBe(3);
      expect(page1.pagination.hasNext).toBe(true);
      expect(page1.pagination.hasPrev).toBe(false);

      const page3 = await store.findSeeds({ page: 3, limit: 5 });
      expect(page3.items.length).toBe(5);
      expect(page3.pagination.hasNext).toBe(false);
      expect(page3.pagination.hasPrev).toBe(true);
    });

    it('finds seeds filtered by domain with pagination', async () => {
      await store.addSeeds([
        makeSeed({ $domain: 'character' }),
        makeSeed({ $domain: 'character' }),
        makeSeed({ $domain: 'character' }),
        makeSeed({ $domain: 'music' }),
      ]);

      const result = await store.findSeeds({ page: 1, limit: 10, domain: 'character' });
      expect(result.items.length).toBe(3);
      expect(result.pagination.total).toBe(3);
    });
  });

  // ─── User Management ──────────────────────────────────────────────────────

  describe('User Management', () => {
    it('adds and retrieves a user', async () => {
      const user = { id: crypto.randomUUID(), username: 'alice', passwordHash: 'hash123', role: 'admin' as const, createdAt: new Date().toISOString() };
      await store.addUser(user);

      const found = await store.getUserByUsername('alice');
      expect(found).toBeTruthy();
      expect(found!.username).toBe('alice');
      expect(found!.role).toBe('admin');
    });

    it('returns null for non-existent user', async () => {
      const found = await store.getUserByUsername('nobody');
      expect(found).toBeFalsy();
    });

    it('lists all users', async () => {
      await store.addUser({ id: '1', username: 'a', passwordHash: 'h', role: 'admin', createdAt: new Date().toISOString() });
      await store.addUser({ id: '2', username: 'b', passwordHash: 'h', role: 'user', createdAt: new Date().toISOString() });

      const users = await store.getUsers();
      expect(users.length).toBe(2);
    });
  });

  // ─── Audit Logging ────────────────────────────────────────────────────────

  describe('Audit Logging', () => {
    it('records and retrieves audit entries', async () => {
      const entry = {
        timestamp: new Date().toISOString(),
        userId: 'user-1',
        action: 'seed.create' as const,
        resourceId: 'seed-123',
        details: { domain: 'character' },
      };
      await store.addAuditEntry(entry);

      const log = await store.getAuditLog(10);
      expect(log.length).toBe(1);
      expect(log[0].action).toBe('seed.create');
      expect(log[0].userId).toBe('user-1');
    });

    it('returns most recent entries first', async () => {
      for (let i = 0; i < 5; i++) {
        await store.addAuditEntry({
          timestamp: new Date(Date.now() + i * 1000).toISOString(),
          userId: 'user-1',
          action: 'seed.mutate',
          resourceId: `seed-${i}`,
        });
      }

      const log = await store.getAuditLog(3);
      expect(log.length).toBe(3);
      // Most recent first
      expect(log[0].resourceId).toBe('seed-4');
    });

    it('respects limit parameter', async () => {
      for (let i = 0; i < 10; i++) {
        await store.addAuditEntry({
          timestamp: new Date().toISOString(),
          userId: 'u',
          action: 'seed.create',
          resourceId: `s-${i}`,
        });
      }

      const log = await store.getAuditLog(3);
      expect(log.length).toBe(3);
    });
  });

  // ─── Persistence ──────────────────────────────────────────────────────────

  describe('Persistence', () => {
    it('survives close and reopen', async () => {
      const seed = makeSeed();
      await store.addSeed(seed);
      await store.persist();
      await store.close();

      // Re-open
      const store2 = new JsonStore(TEST_DIR);
      await store2.init();

      const found = await store2.getSeedById(seed.id);
      expect(found).toBeTruthy();
      expect(found!.id).toBe(seed.id);

      await store2.close();
    });

    it('persists users across restarts', async () => {
      await store.addUser({ id: '1', username: 'persist_user', passwordHash: 'h', role: 'admin', createdAt: new Date().toISOString() });
      await store.persist();
      await store.close();

      const store2 = new JsonStore(TEST_DIR);
      await store2.init();

      const found = await store2.getUserByUsername('persist_user');
      expect(found).toBeTruthy();

      await store2.close();
    });
  });
});
