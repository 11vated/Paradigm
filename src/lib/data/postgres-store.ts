import { Pool } from 'pg';
import type { SeedStore, Seed, User, AuditEntry, PaginationOptions, PaginatedResult } from './types';

// Column sets are documented here for the production Postgres schema mirror:
//   SEED_FIELDS = id, hash, domain, payload, signature, author_id, parent_count,
//     quality_vector, quality_scalar, title, description, tags, license, visibility,
//     is_marketplace, generation, operation, lineage_parents, fitness_overall,
//     federation_origin, created_at, updated_at
//   USER_FIELDS = id, username, email, display_name, password_hash, sovereignty_pubkey,
//     sovereignty_thumbprint, stripe_account_id, role, is_verified, seed_count,
//     last_login_at, created_at, updated_at

export class PostgresStore implements SeedStore {
  readonly backend = 'postgres' as const;
  private pool: Pool;
  private _ready = false;

  constructor(connectionString: string) {
    this.pool = new Pool({ connectionString, max: 20, idleTimeoutMillis: 30000 });
  }

  async init(): Promise<void> {
    await this.pool.query('SELECT 1');
    this._ready = true;
  }

  async close(): Promise<void> {
    await this.pool.end();
  }

  // ─── HELPERS ───────────────────────────────────────────────────────────────

  private rowToSeed(row: any): Seed {
    return {
      id: row.hash,
      $domain: row.domain,
      $name: row.title || 'Untitled',
      $hash: row.hash,
      $lineage: {
        generation: row.generation ?? 0,
        operation: row.operation ?? 'primordial',
        parents: row.lineage_parents || [],
      },
      $fitness: { overall: row.fitness_overall ?? 0.5 },
      genes: row.payload?.genes || {},
      ...(row.payload || {}),
    };
  }

  private seedToRow(seed: Seed): any {
    return {
      hash: seed.$hash || seed.id,
      domain: seed.$domain || 'unknown',
      payload: JSONB(seed),
      generation: seed.$lineage?.generation ?? 0,
      operation: seed.$lineage?.operation ?? 'primordial',
      title: seed.$name || null,
      fitness_overall: seed.$fitness?.overall ?? null,
      lineage_parents: seed.$lineage?.parents || [],
    };
  }

  // ─── SEEDS ─────────────────────────────────────────────────────────────────

  async getAllSeeds(): Promise<Seed[]> {
    const { rows } = await this.pool.query('SELECT * FROM seeds ORDER BY created_at DESC');
    return rows.map(r => this.rowToSeed(r));
  }

  async getSeedById(id: string): Promise<Seed | undefined> {
    const { rows } = await this.pool.query(
      'SELECT * FROM seeds WHERE hash = $1 OR id::text = $1 LIMIT 1', [id]);
    return rows.length > 0 ? this.rowToSeed(rows[0]) : undefined;
  }

  async findSeeds(opts: PaginationOptions): Promise<PaginatedResult<Seed>> {
    const conditions: string[] = [];
    const params: any[] = [];
    let paramIdx = 1;

    if (opts.domain) {
      conditions.push(`domain = $${paramIdx++}`);
      params.push(opts.domain);
    }

    const where = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';
    const sortField = opts.sort === 'fitness' ? 'fitness_overall' : 'created_at';
    const sortDir = 'DESC';

    const countResult = await this.pool.query(`SELECT COUNT(*) FROM seeds ${where}`, params);
    const total = parseInt(countResult.rows[0].count, 10);
    const limit = Math.min(opts.limit ?? 50, 100);
    const offset = ((opts.page ?? 1) - 1) * limit;

    params.push(limit);
    params.push(offset);
    const { rows } = await this.pool.query(
      `SELECT * FROM seeds ${where} ORDER BY ${sortField} ${sortDir} LIMIT $${paramIdx++} OFFSET $${paramIdx++}`,
      params);

    const totalPages = Math.ceil(total / limit);
    return {
      items: rows.map(r => this.rowToSeed(r)),
      pagination: {
        page: opts.page ?? 1, limit, total, totalPages,
        hasNext: (opts.page ?? 1) < totalPages,
        hasPrev: (opts.page ?? 1) > 1,
      },
    };
  }

  async addSeed(seed: Seed): Promise<void> {
    const row = this.seedToRow(seed);
    await this.pool.query(
      `INSERT INTO seeds (hash, domain, payload, generation, operation, title, fitness_overall, lineage_parents, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
       ON CONFLICT (hash) DO UPDATE SET payload = EXCLUDED.payload, updated_at = NOW()`,
      [row.hash, row.domain, row.payload, row.generation, row.operation, row.title, row.fitness_overall, row.lineage_parents]);
  }

  async addSeeds(seeds: Seed[]): Promise<void> {
    for (const seed of seeds) await this.addSeed(seed);
  }

  async updateSeed(id: string, update: Partial<Seed>): Promise<void> {
    const fields: string[] = [];
    const params: any[] = [];
    let idx = 1;

    if (update.$domain) { fields.push(`domain = $${idx++}`); params.push(update.$domain); }
    if (update.$name) { fields.push(`title = $${idx++}`); params.push(update.$name); }
    if (update.$fitness) { fields.push(`fitness_overall = $${idx++}`); params.push(update.$fitness.overall); }
    if (update.$lineage) {
      fields.push(`generation = $${idx++}`); params.push(update.$lineage.generation ?? 0);
      fields.push(`operation = $${idx++}`); params.push(update.$lineage.operation ?? 'unknown');
    }
    fields.push(`updated_at = NOW()`);

    params.push(id);
    await this.pool.query(
      `UPDATE seeds SET ${fields.join(', ')} WHERE hash = $${idx} OR id::text = $${idx}`,
      params);
  }

  async deleteSeed(id: string): Promise<boolean> {
    const { rowCount } = await this.pool.query(
      'DELETE FROM seeds WHERE hash = $1 OR id::text = $1', [id]);
    return (rowCount ?? 0) > 0;
  }

  async getSeedsByDomain(domain: string): Promise<Seed[]> {
    const { rows } = await this.pool.query('SELECT * FROM seeds WHERE domain = $1', [domain]);
    return rows.map(r => this.rowToSeed(r));
  }

  async getSeedCount(): Promise<number> {
    const { rows } = await this.pool.query('SELECT COUNT(*) as count FROM seeds');
    return parseInt(rows[0].count, 10);
  }

  async persist(): Promise<void> {
    // PostgreSQL persists automatically
  }

  // ─── USERS ─────────────────────────────────────────────────────────────────

  getUsers(): User[] {
    throw new Error('PostgresStore.getUsers() requires async');
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const { rows } = await this.pool.query('SELECT * FROM users WHERE username = $1 LIMIT 1', [username]);
    if (rows.length === 0) return undefined;
    const r = rows[0];
    return { id: r.id, username: r.username, passwordHash: r.password_hash, createdAt: r.created_at, role: r.role };
  }

  async addUser(user: User): Promise<void> {
    await this.pool.query(
      `INSERT INTO users (username, password_hash, role, created_at)
       VALUES ($1, $2, $3, NOW()) ON CONFLICT (username) DO NOTHING`,
      [user.username, user.passwordHash, user.role || 'user']);
  }

  // ─── AUDIT ─────────────────────────────────────────────────────────────────

  async addAuditEntry(entry: AuditEntry): Promise<void> {
    await this.pool.query(
      `INSERT INTO audit_log (id, user_id, username, action, resource, resource_id, details, ip_address, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())`,
      [entry.id, entry.userId, entry.username, entry.action, entry.resource, entry.resourceId,
       entry.details ? JSON.stringify(entry.details) : null, entry.ip]);
  }

  async getAuditLog(limit: number = 100): Promise<AuditEntry[]> {
    const { rows } = await this.pool.query(
      'SELECT * FROM audit_log ORDER BY created_at DESC LIMIT $1', [limit]);
    return rows.map(r => ({
      id: r.id, timestamp: r.created_at, userId: r.user_id, username: r.username,
      action: r.action, resource: r.resource, resourceId: r.resource_id,
      details: r.details, ip: r.ip_address,
    }));
  }
}

function JSONB(obj: any): any {
  return JSON.parse(JSON.stringify(obj));
}
