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
    // Keep the in-memory log bounded so it can never grow unbounded between
    // flushes. The on-disk copy is already capped to the last 10k entries in
    // `flushSync`; we mirror that here.
    if (this.auditLog.length > 10000) {
      this.auditLog.splice(0, this.auditLog.length - 10000);
    }
    this.dirty = true;
  }

  async getAuditLog(limit = 1000): Promise<AuditEntry[]> {
    // Return most-recent-first. Take the last `limit` entries (newest), then
    // reverse so index 0 is the newest entry. This matches the API contract
    // tested by "returns most recent entries first".
    const n = Math.max(0, Math.min(limit, this.auditLog.length));
    return this.auditLog.slice(-n).reverse();
  }
}

// Silence unused-import lint for `crypto`; kept for future audit-ID hashing.
void crypto;
