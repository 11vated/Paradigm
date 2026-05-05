/**
 * Data access layer type definitions.
 * Both JSON file and MongoDB backends implement this interface.
 */

export interface Seed {
  id: string;
  $domain: string;
  $name: string;
  $lineage: { generation: number; operation: string; parents?: string[] };
  $hash: string;
  $fitness: { overall: number };
  $sovereignty?: Record<string, any>;
  $embedding?: number[];
  genes: Record<string, { type: string; value: any }>;
  [key: string]: any;
}

export interface User {
  id: string;
  username: string;
  passwordHash: string;
  createdAt: string;
  role: 'user' | 'admin';
}

export interface PaginationOptions {
  page: number;
  limit: number;
  domain?: string;
  sort?: 'created' | 'fitness' | 'domain';
}

export interface PaginatedResult<T> {
  items: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export interface AuditEntry {
  id: string;
  timestamp: string;
  userId?: string;
  username?: string;
  action: string;
  resource: string;
  resourceId?: string;
  details?: Record<string, any>;
  ip?: string;
}

export interface SeedStore {
  // Lifecycle
  init(): Promise<void>;
  close(): Promise<void>;

  // Seeds
  getAllSeeds(): Seed[];
  getSeedById(id: string): Seed | undefined;
  findSeeds(opts: PaginationOptions): PaginatedResult<Seed>;
  addSeed(seed: Seed): Promise<void>;
  addSeeds(seeds: Seed[]): Promise<void>;
  updateSeed(id: string, update: Partial<Seed>): Promise<void>;
  deleteSeed(id: string): Promise<boolean>;
  getSeedsByDomain(domain: string): Seed[];
  getSeedCount(): number;
  persist(): Promise<void>;

  // Users
  getUsers(): User[];
  getUserByUsername(username: string): User | undefined;
  addUser(user: User): Promise<void>;

  // Audit log
  addAuditEntry(entry: AuditEntry): Promise<void>;
  getAuditLog(limit?: number): Promise<AuditEntry[]>;

  // Info
  readonly backend: 'json' | 'mongodb';
}
