/**
 * JSON file-backed data store — the default for development.
 * Keeps seeds in memory with periodic flush to disk.
 * Drop-in compatible with the SeedStore interface.
 */
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import type { Seed, User, PaginationOptions, PaginatedResult, AuditEntry, SeedStore } from './types.js';

export class JsonStore implements SeedStore {
  readonly backend = 'json' as const;
  private seeds: Seed[] = [];
  private users: User[] = [];
  private auditLog: AuditEntry[] = [];
  private seedsFile: string;
  private usersFile: string;
  private auditFile: string;
  private dirty = false;
  private flushTimer: ReturnType<typeof setInterval> | null = null;

  constructor(private dataDir: string = path.join(process.cwd(), 'data')) {}

  async init(): Promise<void> {
    if (!fs.existsSync(this.dataDir)) fs.mkdirSync(this.dataDir, { recursive: true });

    this.seedsFile = path.join(this.dataDir, 'user-seeds.json');
    this.usersFile = path.join(this.dataDir, 'users.json');
    this.auditFile = path.join(this.dataDir, 'audit-log.json');

    // Load seeds
    if (fs.existsSync(this.seedsFile)) {
      try {
        const data = JSON.parse(fs.readFileSync(this.seedsFile, 'utf-8'));
        if (Array.isArray(data)) this.seeds = data;
      } catch {}
    }

    // Load users
    if (fs.existsSync(this.usersFile)) {
      try {
        const data = JSON.parse(fs.readFileSync(this.usersFile, 'utf-8'));
        if (Array.isArray(data)) this.users = data;
      } catch {}
    }

    // Load audit log
    if (fs.existsSync(this.auditFile)) {
      try {
        const data = JSON.parse(fs.readFileSync(this.auditFile, 'utf-8'));
        if (Array.isArray(data)) this.auditLog = data;
      } catch {}
    }

    // Auto-flush every 5 seconds if dirty
    this.flushTimer = setInterval(() => {
      if (this.dirty) this.flushSync();
    }, 5000);
  }

  async close(): Promise<void> {
    if (this.flushTimer) clearInterval(this.flushTimer);
    this.flushSync();
  }

  private flushSync(): void {
    try {
      fs.writeFileSync(this.seedsFile, JSON.stringify(this.seeds, null, 2));
      fs.writeFileSync(this.usersFile, JSON.stringify(this.users, null, 2));
      fs.writeFileSync(this.auditFile, JSON.stringify(this.auditLog.slice(-10000), null, 2));
      this.dirty = false;
    } catch {}
  }

  // ── Seeds ──────────────────────────────────────────────────────────────

  getAllSeeds(): Seed[] { return this.seeds; }

  getSeedById(id: string): Seed | undefined {
    return this.seeds.find(s => s.id === id);
  }

  findSeeds(opts: PaginationOptions): PaginatedResult<Seed> {
    let filtered = [...this.seeds];
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
    this.seeds.push(seed);
    this.dirty = true;
  }

  async addSeeds(seeds: Seed[]): Promise<void> {
    this.seeds.push(...seeds);
    this.dirty = true;
  }

  async updateSeed(id: string, update: Partial<Seed>): Promise<void> {
    const idx = this.seeds.findIndex(s => s.id === id);
    if (idx >= 0) {
      this.seeds[idx] = { ...this.seeds[idx], ...update };
      this.dirty = true;
    }
  }

  async deleteSeed(id: string): Promise<boolean> {
    const before = this.seeds.length;
    this.seeds = this.seeds.filter(s => s.id !== id);
    this.dirty = true;
    return this.seeds.length < before;
  }

  getSeedsByDomain(domain: string): Seed[] {
    return this.seeds.filter(s => s.$domain === domain);
  }

  getSeedCount(): number { return this.seeds.length; }

  async persist(): Promise<void> {
    this.dirty = true;
    this.flushSync();
  }

  // ── Users ──────────────────────────────────────────────────────────────

  getUsers(): User[] { return this.users; }

  getUserByUsername(username: string): User | undefined {
    return this.users.find(u => u.username === username);
  }

  async addUser(user: User): Promise<void> {
    this.users.push(user);
    this.dirty = true;
  }

  // ── Audit ──────────────────────────────────────────────────────────────

  async addAuditEntry(entry: AuditEntry): Promise<void> {
    this.auditLog.push(entry);
    this.dirty = true;
  }

  async getAuditLog(limit = 100): Promise<AuditEntry[]> {
    return this.auditLog.slice(-limit).reverse();
  }
}
