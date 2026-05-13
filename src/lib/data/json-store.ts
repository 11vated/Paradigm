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
  private seedsFile = '';
  private usersFile = '';
  private auditFile = '';
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
      } catch {
        // Ignore parse errors
      }
    }

    // Load users
    if (fs.existsSync(this.usersFile)) {
      try {
        const data = JSON.parse(fs.readFileSync(this.usersFile, 'utf-8'));
        if (Array.isArray(data)) this.users = data;
      } catch {
        // Ignore parse errors
      }
    }

    // Load audit log
    if (fs.existsSync(this.auditFile)) {
      try {
        const data = JSON.parse(fs.readFileSync(this.auditFile, 'utf-8'));
        if (Array.isArray(data)) this.auditLog = data;
      } catch {
        // Ignore parse errors
      }
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

  /**
   * Atomic write: write to `${path}.tmp.${pid}.${ts}`, fsync, then rename.
   * Phase 0 / G-06: the previous `fs.writeFileSync` was not crash-safe — a
   * process death mid-write would leave a truncated JSON file and on the next
   * boot `init()` would silently drop the partial data (`catch {}` on parse
   * error). The rename-over-target pattern guarantees the destination file
   * always contains a complete prior version OR the complete new version —
   * never a partial mix. Linux `fsync` before rename ensures the data is
   * flushed to disk before the directory entry flips.
   */
  private atomicWriteJson(targetPath: string, value: unknown): void {
    const serialized = JSON.stringify(value, null, 2);
    const tmpPath = `${targetPath}.tmp.${process.pid}.${Date.now()}`;
    let fd: number | null = null;
    try {
      fd = fs.openSync(tmpPath, 'w');
      fs.writeSync(fd, serialized);
      try {
        fs.fsyncSync(fd);
      } catch {
        // fsync may be unsupported on some FS (tmpfs, WSL edge cases) — tolerate.
      }
      fs.closeSync(fd);
      fd = null;
      fs.renameSync(tmpPath, targetPath);
    } finally {
      if (fd !== null) {
        try { fs.closeSync(fd); } catch { /* ignore */ }
      }
      // Best-effort cleanup of orphan temp file if rename failed.
      if (fs.existsSync(tmpPath)) {
        try { fs.unlinkSync(tmpPath); } catch { /* ignore */ }
      }
    }
  }

  private flushSync(): void {
    try {
      this.atomicWriteJson(this.seedsFile, this.seeds);
      this.atomicWriteJson(this.usersFile, this.users);
      this.atomicWriteJson(this.auditFile, this.auditLog.slice(-10000));
      this.dirty = false;
    } catch {
      // Intentionally swallowed — next flush tick will retry. In Phase 1 we
      // route this through the pino logger as a WARN-level event.
    }
  }

  // ── Seeds ──────────────────────────────────────────────────────────────

  async getAllSeeds(): Promise<Seed[]> { return this.seeds; }

  async getSeedById(id: string): Promise<Seed | undefined> {
    return this.seeds.find(s => s.id === id || s.$hash === id);
  }

  async findSeeds(opts: PaginationOptions): Promise<PaginatedResult<Seed>> {
    let filtered = [...this.seeds];
    if (opts.domain) filtered = filtered.filter(s => s.$domain === opts.domain);
    if (opts.sort === 'fitness') filtered.sort((a, b) => (b.$fitness?.overall ?? 0) - (a.$fitness?.overall ?? 0));
    const total = filtered.length;
    const limit = Math.min(opts.limit ?? 50, 100);
    const offset = ((opts.page ?? 1) - 1) * limit;
    const totalPages = Math.ceil(total / limit);
    return {
      items: filtered.slice(offset, offset + limit),
      pagination: { page: opts.page ?? 1, limit, total, totalPages, hasNext: (opts.page ?? 1) < totalPages, hasPrev: (opts.page ?? 1) > 1 },
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
    const idx = this.seeds.findIndex(s => s.id === id || s.$hash === id);
    if (idx !== -1) { Object.assign(this.seeds[idx], update); this.dirty = true; }
  }

  async deleteSeed(id: string): Promise<boolean> {
    const idx = this.seeds.findIndex(s => s.id === id || s.$hash === id);
    if (idx !== -1) { this.seeds.splice(idx, 1); this.dirty = true; return true; }
    return false;
  }

  async getSeedsByDomain(domain: string): Promise<Seed[]> {
    return this.seeds.filter(s => s.$domain === domain);
  }

  async getSeedCount(): Promise<number> { return this.seeds.length; }

  async persist(): Promise<void> {
    if (!this.dirty) return;
    this.dirty = false;
    try {
      fs.writeFileSync(this.seedsFile, JSON.stringify(this.seeds, null, 2));
      fs.writeFileSync(this.usersFile, JSON.stringify(this.users, null, 2));
      fs.writeFileSync(this.auditFile, JSON.stringify(this.auditLog, null, 2));
    } catch (err) {
      console.error('[JsonStore] persist error:', err);
    }
  }

  // ─── USERS ────────────────────────────────────────────────────────────────

  async getUsers(): Promise<User[]> { return this.users; }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return this.users.find(u => u.username === username);
  }

  // ── Users ────────────────────────────────────────────────────────────────
  async addUser(user: User): Promise<void> {
    this.users.push(user);
    this.dirty = true;
  }

  // ── Audit ──────────────────────────────────────────────────────────────

  async addAuditEntry(entry: AuditEntry): Promise<void> {
    this.auditLog.push(entry);
    if (this.auditLog.length > 10000) {
      this.auditLog.splice(0, this.auditLog.length - 10000);
    }
    this.dirty = true;
  }

  async getAuditLog(limit = 1000): Promise<AuditEntry[]> {
    const n = Math.max(0, Math.min(limit, this.auditLog.length));
    return this.auditLog.slice(-n).reverse();
  }

  // ── Sync compatibility shims (for older tests that call sync methods) ───
  // These are NOT part of the SeedStore interface but are present for
  // backward compatibility with test code that expects sync returns.
  getUsersSync(): User[] { return this.users; }
  getUserByUsernameSync(username: string): User | undefined { return this.users.find(u => u.username === username); }
  getSeedsByDomainSync(domain: string): Seed[] { return this.seeds.filter(s => s.$domain === domain); }
  getSeedCountSync(): number { return this.seeds.length; }
}
