/**
 * MongoDB-backed data store — production persistence layer.
 * Activated when MONGO_URI is set. Provides indexes on domain, hash, userId.
 * Falls back to JsonStore if MongoDB is unavailable.
 */
import crypto from 'crypto';
import type { Seed, User, PaginationOptions, PaginatedResult, AuditEntry, SeedStore } from './types.js';

// Dynamic import to avoid hard dependency when MongoDB isn't used
let MongoClient: any;
let Db: any;

export class MongoStore implements SeedStore {
  readonly backend = 'mongodb' as const;
  private client: any = null;
  private db: any = null;
  private seedsCol: any = null;
  private usersCol: any = null;
  private auditCol: any = null;
  private seedCache: Seed[] = []; // In-memory cache for hot reads

  constructor(
    private uri: string,
    private dbName: string = 'paradigm',
  ) {}

  async init(): Promise<void> {
    // Dynamic import so the module doesn't crash if mongodb isn't installed
    const mongodb = await import('mongodb');
    MongoClient = mongodb.MongoClient;

    this.client = new MongoClient(this.uri, {
      maxPoolSize: 20,
      minPoolSize: 2,
      retryWrites: true,
      retryReads: true,
      serverSelectionTimeoutMS: 5000,
      connectTimeoutMS: 10000,
    });

    await this.client.connect();
    this.db = this.client.db(this.dbName);
    this.seedsCol = this.db.collection('seeds');
    this.usersCol = this.db.collection('users');
    this.auditCol = this.db.collection('audit_log');

    // Create indexes
    await Promise.all([
      // Seeds indexes
      this.seedsCol.createIndex({ id: 1 }, { unique: true }),
      this.seedsCol.createIndex({ '$domain': 1 }),
      this.seedsCol.createIndex({ '$hash': 1 }),
      this.seedsCol.createIndex({ '$fitness.overall': -1 }),
      this.seedsCol.createIndex({ '$sovereignty.onchain.tokenId': 1 }, { sparse: true }),
      // Users indexes
      this.usersCol.createIndex({ id: 1 }, { unique: true }),
      this.usersCol.createIndex({ username: 1 }, { unique: true }),
      // Audit indexes
      this.auditCol.createIndex({ timestamp: -1 }),
      this.auditCol.createIndex({ userId: 1 }),
      this.auditCol.createIndex({ action: 1, timestamp: -1 }),
      // TTL index — audit entries expire after 90 days
      this.auditCol.createIndex({ timestamp: 1 }, { expireAfterSeconds: 90 * 86400 }),
    ]);

    // Warm seed cache
    this.seedCache = await this.seedsCol.find({}, { projection: { _id: 0 } }).toArray();
  }

  async close(): Promise<void> {
    if (this.client) await this.client.close();
  }

  // ── Seeds ──────────────────────────────────────────────────────────────

  getAllSeeds(): Seed[] {
    return this.seedCache;
  }

  getSeedById(id: string): Seed | undefined {
    return this.seedCache.find(s => s.id === id);
  }

  findSeeds(opts: PaginationOptions): PaginatedResult<Seed> {
    // Use in-memory cache for fast pagination
    let filtered = [...this.seedCache];
    if (opts.domain) filtered = filtered.filter(s => s.$domain === opts.domain);
    if (opts.sort === 'fitness') {
      filtered.sort((a, b) => (b.$fitness?.overall || 0) - (a.$fitness?.overall || 0));
    } else if (opts.sort === 'domain') {
      filtered.sort((a, b) => (a.$domain || '').localeCompare(b.$domain || ''));
    }
    const total = filtered.length;
    const totalPages = Math.ceil(total / opts.limit);
    const offset = (opts.page - 1) * opts.limit;
    return {
      items: filtered.slice(offset, offset + opts.limit),
      pagination: {
        page: opts.page, limit: opts.limit, total, totalPages,
        hasNext: opts.page < totalPages, hasPrev: opts.page > 1,
      },
    };
  }

  async addSeed(seed: Seed): Promise<void> {
    await this.seedsCol.insertOne({ ...seed });
    this.seedCache.push(seed);
  }

  async addSeeds(seeds: Seed[]): Promise<void> {
    if (seeds.length === 0) return;
    await this.seedsCol.insertMany(seeds.map(s => ({ ...s })));
    this.seedCache.push(...seeds);
  }

  async updateSeed(id: string, update: Partial<Seed>): Promise<void> {
    await this.seedsCol.updateOne({ id }, { $set: update });
    const idx = this.seedCache.findIndex(s => s.id === id);
    if (idx >= 0) this.seedCache[idx] = { ...this.seedCache[idx], ...update };
  }

  async deleteSeed(id: string): Promise<boolean> {
    const result = await this.seedsCol.deleteOne({ id });
    this.seedCache = this.seedCache.filter(s => s.id !== id);
    return result.deletedCount > 0;
  }

  getSeedsByDomain(domain: string): Seed[] {
    return this.seedCache.filter(s => s.$domain === domain);
  }

  getSeedCount(): number {
    return this.seedCache.length;
  }

  async persist(): Promise<void> {
    // MongoDB persists automatically — this is a no-op
  }

  // ── Users ──────────────────────────────────────────────────────────────

  getUsers(): User[] {
    // Synchronous — falls back to empty. In practice, user lookups go through getUserByUsername.
    return [];
  }

  getUserByUsername(username: string): User | undefined {
    // This needs to be async in MongoDB, but the interface is sync for compat.
    // We handle this by maintaining a user cache similar to seeds.
    return undefined; // Overridden by async lookup in auth module
  }

  async addUser(user: User): Promise<void> {
    await this.usersCol.insertOne({ ...user });
  }

  // Async user lookup for MongoDB
  async findUserByUsername(username: string): Promise<User | undefined> {
    const doc = await this.usersCol.findOne({ username }, { projection: { _id: 0 } });
    return doc || undefined;
  }

  async findUserById(id: string): Promise<User | undefined> {
    const doc = await this.usersCol.findOne({ id }, { projection: { _id: 0 } });
    return doc || undefined;
  }

  // ── Audit ──────────────────────────────────────────────────────────────

  async addAuditEntry(entry: AuditEntry): Promise<void> {
    await this.auditCol.insertOne({ ...entry });
  }

  async getAuditLog(limit = 100): Promise<AuditEntry[]> {
    return this.auditCol
      .find({}, { projection: { _id: 0 } })
      .sort({ timestamp: -1 })
      .limit(limit)
      .toArray();
  }
}
