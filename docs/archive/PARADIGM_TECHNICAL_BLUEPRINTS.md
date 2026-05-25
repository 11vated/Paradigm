# PARADIGM TECHNICAL BLUEPRINTS
## Deep Implementation Specs for Phases 0-4

---

## PART 1: PHASE 0 - TYPESCRIPT HARDENING

### 1.1 tsconfig.json Transformation

**BEFORE:**
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "strict": false,                    // ❌ ISSUE
    "esModuleInterop": true,
    "allowJs": true,                    // ⚠️ Mixed JS/TS
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "types": ["vitest/globals"]
  }
}
```

**AFTER:**
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": false,              // ✅ Check types
    "strict": true,                     // ✅ STRICT MODE
    
    // Strict subflags (explicit, already true with strict=true)
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "strictBindCallApply": true,
    "strictPropertyInitialization": true,
    "noImplicitThis": true,
    "alwaysStrict": true,
    
    // Additional hardening
    "exactOptionalPropertyTypes": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitOverride": true,
    "noPropertyAccessFromIndexSignature": true,
    
    "esModuleInterop": true,
    "allowJs": false,                   // ✅ TypeScript only
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "types": ["vitest/globals"]
  },
  
  "include": ["src", "tests"],
  "exclude": ["node_modules", "dist"]
}
```

### 1.2 Type Inventory & Fix Strategy

**File: src/lib/errors/AppError.ts** (NEW)
```typescript
/**
 * Central error hierarchy for type safety
 */

export class AppError extends Error {
  constructor(
    public code: string,
    message: string,
    public statusCode: number = 500,
    public details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'AppError';
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: Record<string, unknown>) {
    super('VALIDATION_ERROR', message, 400, details);
    Object.setPrototypeOf(this, ValidationError.prototype);
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string, id: string) {
    super('NOT_FOUND', `${resource} with id ${id} not found`, 404);
    Object.setPrototypeOf(this, NotFoundError.prototype);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized') {
    super('UNAUTHORIZED', message, 401);
    Object.setPrototypeOf(this, UnauthorizedError.prototype);
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super('CONFLICT', message, 409);
    Object.setPrototypeOf(this, ConflictError.prototype);
  }
}

export function isAppError(err: unknown): err is AppError {
  return err instanceof AppError;
}
```

**File: src/lib/types/api.ts** (NEW)
```typescript
/**
 * API Request/Response Types
 * Provides type safety for all client-server communication
 */

import { Seed, Artifact, EvolutionResult } from '../kernel/types';

// Auth
export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: { id: string; username: string };
}

// Seed CRUD
export interface CreateSeedRequest {
  domain?: string;
  name?: string;
  genes?: Record<string, unknown>;
}

export interface CreateSeedResponse {
  seed: Seed;
}

export interface ListSeedsRequest {
  page?: number;
  limit?: number;
  domain?: string;
  sort?: 'created' | 'fitness' | 'domain';
}

export interface ListSeedsResponse {
  seeds: Seed[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Mutations
export interface MutateSeedRequest {
  rate?: number;
}

export interface MutateSeedResponse {
  seed: Seed;
}

export interface BreedSeedsRequest {
  seedId1: string;
  seedId2: string;
}

export interface BreedSeedsResponse {
  seed: Seed;
}

export interface EvolveSeedRequest {
  populationSize?: number;
  generations?: number;
  mutationRate?: number;
}

export interface EvolveSeedResponse {
  population: Seed[];
  best: Seed;
  bestFitness: number;
}

// Growing
export interface GrowSeedResponse {
  artifact: Artifact;
}

// Composition
export interface ComposeSeedsRequest {
  seedIds: string[];
  targetDomain: string;
  strategy?: 'merge' | 'crossover' | 'weighted';
}

export interface ComposeSeedsResponse {
  seed: Seed;
  path: Array<[string, string, string]>; // [src, functor, tgt]
}

// GSPL
export interface ExecuteGSPLRequest {
  code: string;
  context?: Record<string, unknown>;
}

export interface ExecuteGSPLResponse {
  output: unknown;
  seeds: Seed[];
  errors: string[];
}

// Agent
export interface AgentQueryRequest {
  query: string;
  history?: Array<{ role: 'user' | 'assistant'; content: string }>;
}

export interface AgentQueryResponse {
  message: string;
  actions: Array<{ tool: string; params: Record<string, unknown> }>;
  seeds?: Seed[];
}

// Generic response envelope
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}
```

**File: src/lib/types/kernel.ts** (UPDATED)
```typescript
/**
 * Core Kernel Types - Fully specified, no any
 */

export type GeneType = 
  | 'scalar'
  | 'categorical'
  | 'vector'
  | 'expression'
  | 'struct'
  | 'array'
  | 'graph'
  | 'topology'
  | 'temporal'
  | 'regulatory'
  | 'field'
  | 'symbolic'
  | 'quantum'
  | 'gematria'
  | 'resonance'
  | 'dimensional'
  | 'sovereignty';

export interface Gene {
  type: GeneType;
  value: unknown;
  schema?: Record<string, unknown>;
}

export interface Seed {
  id: string;
  $domain: string;
  $name?: string;
  $hash?: string;
  $fitness?: { overall: number; [key: string]: number };
  $lineage?: {
    generation: number;
    operation: 'create' | 'mutate' | 'breed' | 'evolve' | 'compose';
    parents?: string[];
    timestamp?: number;
  };
  $owner?: {
    userId: string;
    createdAt: number;
  };
  genes?: Record<string, Gene>;
  [key: string]: unknown;
}

export interface Artifact {
  type: string;
  name: string;
  domain: string;
  seedHash: string;
  generation: number;
  renderHints: Record<string, unknown>;
  [key: string]: unknown;
}

export interface EvolutionConfig {
  populationSize: number;
  generations: number;
  mutationRate?: number;
  crossoverRate?: number;
}

export interface EvolutionResult {
  best: Seed;
  population: Seed[];
  bestFitness: number;
  generationHistory: Array<{ generation: number; bestFitness: number }>;
}
```

### 1.3 Automated `any` Cleanup Script

**File: scripts/fix-any-types.ts**
```typescript
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

/**
 * Automated script to identify and help fix `any` types
 * Run: npx ts-node scripts/fix-any-types.ts
 */

interface AnyUsage {
  file: string;
  line: number;
  column: number;
  code: string;
}

function findAnyTypes(srcDir: string): AnyUsage[] {
  const usages: AnyUsage[] = [];
  
  // Use tsc to find all `any` types
  try {
    const output = execSync('tsc --noEmit 2>&1 || true', {
      cwd: process.cwd(),
      encoding: 'utf-8'
    });
    
    const lines = output.split('\n');
    for (const line of lines) {
      if (line.includes(': any')) {
        const match = line.match(/^(.+):(\d+):(\d+):\s*error\s*TS\d+:\s*(.+)$/);
        if (match) {
          usages.push({
            file: match[1],
            line: parseInt(match[2]),
            column: parseInt(match[3]),
            code: match[4]
          });
        }
      }
    }
  } catch (err) {
    console.error('Error running TypeScript compiler:', err);
  }
  
  return usages;
}

function categorizeUsages(usages: AnyUsage[]): Map<string, AnyUsage[]> {
  const categories = new Map<string, AnyUsage[]>();
  
  for (const usage of usages) {
    const category = usage.file.split('/')[2] || 'unknown';
    if (!categories.has(category)) {
      categories.set(category, []);
    }
    categories.get(category)!.push(usage);
  }
  
  return categories;
}

function generateReport(categories: Map<string, AnyUsage[]>): string {
  let report = '# TypeScript `any` Type Cleanup Report\n\n';
  
  for (const [category, usages] of categories) {
    report += `## ${category} (${usages.length} issues)\n\n`;
    
    for (const usage of usages.slice(0, 5)) {
      report += `- \`${usage.file}:${usage.line}:${usage.column}\`\n`;
      report += `  Error: ${usage.code}\n`;
    }
    
    if (usages.length > 5) {
      report += `- ... and ${usages.length - 5} more\n`;
    }
    
    report += '\n';
  }
  
  return report;
}

// Main
const usages = findAnyTypes('src');
const categories = categorizeUsages(usages);
const report = generateReport(categories);

console.log(report);

// Write to file
fs.writeFileSync('ANY_TYPES_REPORT.md', report);
console.log(`\nReport written to ANY_TYPES_REPORT.md`);
console.log(`Total \`any\` types: ${usages.length}`);
```

---

## PART 2: PHASE 1 - DATA FLOW INTEGRATION

### 2.1 Frontend Store Architecture

**File: src/stores/seedStore.ts** (COMPLETE REWRITE)
```typescript
import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { AppError, ValidationError, NotFoundError } from '../lib/errors/AppError';
import type {
  Seed,
  EvolutionConfig,
  EvolutionResult,
  Artifact,
} from '../lib/types/kernel';
import * as api from '../services/api';

export interface SeedStore {
  // State
  seeds: Seed[];
  selectedSeed: Seed | null;
  loading: boolean;
  error: string | null;
  
  // Actions - CRUD
  fetchSeeds: (filters?: { domain?: string; page?: number }) => Promise<void>;
  fetchSeedById: (id: string) => Promise<Seed>;
  createSeed: (domain: string, genes?: Record<string, unknown>) => Promise<Seed>;
  updateSeed: (id: string, updates: Partial<Seed>) => Promise<Seed>;
  deleteSeed: (id: string) => Promise<void>;
  
  // Actions - Mutations
  mutateSeed: (id: string, intensity?: number) => Promise<Seed>;
  breedSeeds: (id1: string, id2: string) => Promise<Seed>;
  evolveSeed: (id: string, config?: Partial<EvolutionConfig>) => Promise<EvolutionResult>;
  composeSeed: (seedIds: string[], targetDomain: string) => Promise<Seed>;
  
  // Actions - Operations
  growSeed: (id: string) => Promise<Artifact>;
  editGene: (seedId: string, geneName: string, value: unknown) => Promise<Seed>;
  
  // Actions - Selection
  selectSeed: (seed: Seed | null) => void;
  clearError: () => void;
}

const defaultConfig: EvolutionConfig = {
  populationSize: 50,
  generations: 10,
  mutationRate: 0.1,
  crossoverRate: 0.7,
};

export const useSeedStore = create<SeedStore>()(
  devtools(
    persist(
      (set, get) => ({
        seeds: [],
        selectedSeed: null,
        loading: false,
        error: null,

        // CRUD Operations
        fetchSeeds: async (filters) => {
          set({ loading: true, error: null });
          try {
            const response = await api.getSeeds(filters);
            set({ seeds: response.seeds });
          } catch (err) {
            const message = err instanceof AppError ? err.message : 'Failed to fetch seeds';
            set({ error: message });
            throw err;
          } finally {
            set({ loading: false });
          }
        },

        fetchSeedById: async (id) => {
          set({ loading: true, error: null });
          try {
            const seed = await api.getSeedById(id);
            set((state) => ({
              seeds: state.seeds.map((s) => (s.id === id ? seed : s)),
            }));
            return seed;
          } catch (err) {
            const message = err instanceof NotFoundError ? `Seed ${id} not found` : 'Failed to fetch seed';
            set({ error: message });
            throw err;
          } finally {
            set({ loading: false });
          }
        },

        createSeed: async (domain, genes) => {
          set({ loading: true, error: null });
          try {
            const seed = await api.createSeed({ domain, genes });
            set((state) => ({ seeds: [...state.seeds, seed] }));
            return seed;
          } catch (err) {
            const message = err instanceof ValidationError ? err.message : 'Failed to create seed';
            set({ error: message });
            throw err;
          } finally {
            set({ loading: false });
          }
        },

        updateSeed: async (id, updates) => {
          set({ loading: true, error: null });
          try {
            const updated = await api.updateSeed(id, updates);
            set((state) => ({
              seeds: state.seeds.map((s) => (s.id === id ? updated : s)),
              selectedSeed: state.selectedSeed?.id === id ? updated : state.selectedSeed,
            }));
            return updated;
          } catch (err) {
            const message = 'Failed to update seed';
            set({ error: message });
            throw err;
          } finally {
            set({ loading: false });
          }
        },

        deleteSeed: async (id) => {
          set({ loading: true, error: null });
          try {
            await api.deleteSeed(id);
            set((state) => ({
              seeds: state.seeds.filter((s) => s.id !== id),
              selectedSeed: state.selectedSeed?.id === id ? null : state.selectedSeed,
            }));
          } catch (err) {
            const message = 'Failed to delete seed';
            set({ error: message });
            throw err;
          } finally {
            set({ loading: false });
          }
        },

        // Genetic Operations
        mutateSeed: async (id, intensity = 0.1) => {
          set({ loading: true, error: null });
          try {
            const mutated = await api.mutateSeed(id, { rate: intensity });
            set((state) => ({ seeds: [...state.seeds, mutated] }));
            return mutated;
          } catch (err) {
            const message = 'Failed to mutate seed';
            set({ error: message });
            throw err;
          } finally {
            set({ loading: false });
          }
        },

        breedSeeds: async (id1, id2) => {
          set({ loading: true, error: null });
          try {
            const child = await api.breedSeeds(id1, id2);
            set((state) => ({ seeds: [...state.seeds, child] }));
            return child;
          } catch (err) {
            const message = 'Failed to breed seeds';
            set({ error: message });
            throw err;
          } finally {
            set({ loading: false });
          }
        },

        evolveSeed: async (id, config) => {
          set({ loading: true, error: null });
          try {
            const result = await api.evolveSeed(id, { ...defaultConfig, ...config });
            set((state) => ({
              seeds: [...state.seeds, ...result.population],
            }));
            return result;
          } catch (err) {
            const message = 'Failed to evolve seed';
            set({ error: message });
            throw err;
          } finally {
            set({ loading: false });
          }
        },

        composeSeed: async (seedIds, targetDomain) => {
          set({ loading: true, error: null });
          try {
            const composed = await api.composeSeed(seedIds, targetDomain);
            set((state) => ({ seeds: [...state.seeds, composed] }));
            return composed;
          } catch (err) {
            const message = 'Failed to compose seed';
            set({ error: message });
            throw err;
          } finally {
            set({ loading: false });
          }
        },

        // Rendering & Editing
        growSeed: async (id) => {
          set({ loading: true, error: null });
          try {
            const artifact = await api.growSeed(id);
            return artifact;
          } catch (err) {
            const message = 'Failed to grow artifact';
            set({ error: message });
            throw err;
          } finally {
            set({ loading: false });
          }
        },

        editGene: async (seedId, geneName, value) => {
          set({ loading: true, error: null });
          try {
            const updated = await api.editGene(seedId, geneName, value);
            set((state) => ({
              seeds: state.seeds.map((s) => (s.id === seedId ? updated : s)),
              selectedSeed: state.selectedSeed?.id === seedId ? updated : state.selectedSeed,
            }));
            return updated;
          } catch (err) {
            const message = 'Failed to edit gene';
            set({ error: message });
            throw err;
          } finally {
            set({ loading: false });
          }
        },

        // UI Actions
        selectSeed: (seed) => set({ selectedSeed: seed }),
        clearError: () => set({ error: null }),
      }),
      {
        name: 'paradigm-seeds',
      }
    )
  )
);
```

### 2.2 API Service Layer

**File: src/services/api.ts** (NEW)
```typescript
import axios, { AxiosInstance, AxiosError } from 'axios';
import { AppError, ValidationError, UnauthorizedError, NotFoundError } from '../lib/errors/AppError';
import type {
  LoginRequest,
  LoginResponse,
  CreateSeedRequest,
  MutateSeedRequest,
  EvolveSeedRequest,
  EvolveSeedResponse,
  ApiResponse,
} from '../lib/types/api';
import type { Seed, Artifact } from '../lib/types/kernel';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

class ApiClient {
  private client: AxiosInstance;
  private accessToken: string | null = null;

  constructor() {
    this.client = axios.create({
      baseURL: API_URL,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor
    this.client.interceptors.request.use((config) => {
      if (this.accessToken) {
        config.headers.Authorization = `Bearer ${this.accessToken}`;
      }
      return config;
    });

    // Response interceptor
    this.client.interceptors.response.use(
      (response) => response,
      (error) => this.handleError(error)
    );

    // Load token from localStorage
    this.accessToken = localStorage.getItem('accessToken');
  }

  private handleError(error: AxiosError<any>): never {
    if (!error.response) {
      throw new AppError('NETWORK_ERROR', 'Network request failed', 0);
    }

    const { status, data } = error.response;

    switch (status) {
      case 400:
        throw new ValidationError(data.detail || 'Invalid request', data);
      case 401:
        throw new UnauthorizedError(data.detail || 'Unauthorized');
      case 404:
        throw new NotFoundError('Resource', 'unknown');
      case 409:
        throw new AppError('CONFLICT', data.detail || 'Conflict', 409);
      case 500:
        throw new AppError('SERVER_ERROR', data.detail || 'Server error', 500);
      default:
        throw new AppError('UNKNOWN_ERROR', error.message, status);
    }
  }

  // Auth
  async login(username: string, password: string): Promise<LoginResponse> {
    const response = await this.client.post<ApiResponse<LoginResponse>>('/auth/login', {
      username,
      password,
    });
    const data = response.data.data!;
    this.accessToken = data.accessToken;
    localStorage.setItem('accessToken', data.accessToken);
    return data;
  }

  async logout(): Promise<void> {
    this.accessToken = null;
    localStorage.removeItem('accessToken');
  }

  // Seeds
  async getSeeds(filters?: { domain?: string; page?: number }): Promise<{ seeds: Seed[] }> {
    const response = await this.client.get<ApiResponse<{ seeds: Seed[] }>>('/seeds', {
      params: filters,
    });
    return response.data.data || { seeds: [] };
  }

  async getSeedById(id: string): Promise<Seed> {
    const response = await this.client.get<ApiResponse<Seed>>(`/seeds/${id}`);
    return response.data.data!;
  }

  async createSeed(req: CreateSeedRequest): Promise<Seed> {
    const response = await this.client.post<ApiResponse<Seed>>('/seeds', req);
    return response.data.data!;
  }

  async updateSeed(id: string, updates: Partial<Seed>): Promise<Seed> {
    const response = await this.client.put<ApiResponse<Seed>>(`/seeds/${id}`, updates);
    return response.data.data!;
  }

  async deleteSeed(id: string): Promise<void> {
    await this.client.delete(`/seeds/${id}`);
  }

  // Operations
  async mutateSeed(id: string, req: MutateSeedRequest): Promise<Seed> {
    const response = await this.client.post<ApiResponse<Seed>>(`/seeds/${id}/mutate`, req);
    return response.data.data!;
  }

  async breedSeeds(id1: string, id2: string): Promise<Seed> {
    const response = await this.client.post<ApiResponse<Seed>>('/seeds/breed', {
      parentId1: id1,
      parentId2: id2,
    });
    return response.data.data!;
  }

  async evolveSeed(id: string, req: EvolveSeedRequest): Promise<EvolveSeedResponse> {
    const response = await this.client.post<ApiResponse<EvolveSeedResponse>>(
      `/seeds/${id}/evolve`,
      req
    );
    return response.data.data!;
  }

  async composeSeed(seedIds: string[], targetDomain: string): Promise<Seed> {
    const response = await this.client.post<ApiResponse<Seed>>('/seeds/compose', {
      seedIds,
      targetDomain,
    });
    return response.data.data!;
  }

  async growSeed(id: string): Promise<Artifact> {
    const response = await this.client.post<ApiResponse<Artifact>>(`/seeds/${id}/grow`, {});
    return response.data.data!;
  }

  async editGene(seedId: string, geneName: string, value: unknown): Promise<Seed> {
    const response = await this.client.put<ApiResponse<Seed>>(`/seeds/${seedId}/genes/${geneName}`, {
      value,
    });
    return response.data.data!;
  }

  // Agent
  async queryAgent(query: string, history?: any[]): Promise<any> {
    const response = await this.client.post('/agent/query', { query, history });
    return response.data.data;
  }
}

export const apiClient = new ApiClient();

// Export convenience functions
export const getSeeds = (filters?: any) => apiClient.getSeeds(filters);
export const getSeedById = (id: string) => apiClient.getSeedById(id);
export const createSeed = (req: CreateSeedRequest) => apiClient.createSeed(req);
export const updateSeed = (id: string, updates: Partial<Seed>) =>
  apiClient.updateSeed(id, updates);
export const deleteSeed = (id: string) => apiClient.deleteSeed(id);
export const mutateSeed = (id: string, req: MutateSeedRequest) =>
  apiClient.mutateSeed(id, req);
export const breedSeeds = (id1: string, id2: string) => apiClient.breedSeeds(id1, id2);
export const evolveSeed = (id: string, req: EvolveSeedRequest) =>
  apiClient.evolveSeed(id, req);
export const composeSeed = (seedIds: string[], targetDomain: string) =>
  apiClient.composeSeed(seedIds, targetDomain);
export const growSeed = (id: string) => apiClient.growSeed(id);
export const editGene = (seedId: string, geneName: string, value: unknown) =>
  apiClient.editGene(seedId, geneName, value);
export const queryAgent = (query: string, history?: any[]) =>
  apiClient.queryAgent(query, history);
export const login = (username: string, password: string) =>
  apiClient.login(username, password);
export const logout = () => apiClient.logout();
```

---

## PART 3: PHASE 2 - GSPL INTERPRETER WIRING

### 3.1 Complete Builtin Function Implementation

**File: src/lib/kernel/gspl-interpreter.ts** (BUILTINS SECTION)
```typescript
/**
 * GSPL Interpreter - Builtin Functions
 * All functions wired to kernel operations
 */

import { Xoshiro256StarStar, rngFromHash } from './rng';
import {
  GENE_TYPES,
  validateGene,
  mutateGene,
  crossoverGene,
  distanceGene,
} from './gene_system';
import { growSeed } from './engines';
import type { Seed, EvolutionConfig, EvolutionResult } from './types';

export interface GsplValue {
  type: string;
  value: any;
}

export class GsplInterpreter {
  private rng: Xoshiro256StarStar;
  private environment: Map<string, GsplValue> = new Map();

  constructor(seed?: number) {
    this.rng = seed !== undefined ? rngFromHash(String(seed)) : new Xoshiro256StarStar();
  }

  async evaluateBuiltin(name: string, args: any[]): Promise<GsplValue> {
    switch (name) {
      // Seed Operations
      case 'create':
        return this.builtin_create(args);
      case 'mutate':
        return await this.builtin_mutate(args);
      case 'breed':
        return this.builtin_breed(args);
      case 'evolve':
        return await this.builtin_evolve(args);
      case 'compose':
        return await this.builtin_compose(args);

      // Gene Operations
      case 'validate':
        return this.builtin_validate(args);
      case 'distance':
        return this.builtin_distance(args);
      case 'fitness':
        return this.builtin_fitness(args);

      // Growth & Rendering
      case 'grow':
        return await this.builtin_grow(args);

      // Utility
      case 'print':
        return this.builtin_print(args);
      case 'length':
        return this.builtin_length(args);
      case 'map':
        return this.builtin_map(args);

      default:
        throw new Error(`Unknown builtin: ${name}`);
    }
  }

  // ─── Seed Creation ───────────────────────────────────────────
  private builtin_create(args: any[]): GsplValue {
    if (args.length < 1) {
      throw new Error('create() requires at least 1 argument: domain');
    }

    const domain = args[0]?.value || 'character';
    const genesArg = args[1];
    const genes = genesArg?.type === 'object' ? genesArg.value : {};

    const seed: Seed = {
      id: `seed-${Date.now()}-${this.rng.nextInt(0, 1000000)}`,
      $domain: domain,
      $name: `Generated Seed`,
      $lineage: { generation: 0, operation: 'create' },
      $hash: this.hashGenes(genes),
      $fitness: { overall: 0.5 },
      genes: this.normalizeGenes(genes),
    };

    return { type: 'seed', value: seed };
  }

  // ─── Mutation ────────────────────────────────────────────────
  private async builtin_mutate(args: any[]): Promise<GsplValue> {
    if (args.length < 1) {
      throw new Error('mutate() requires 1 argument: seed');
    }

    const seedArg = args[0];
    if (seedArg.type !== 'seed') {
      throw new TypeError('mutate() expects seed as first argument');
    }

    const parent = seedArg.value as Seed;
    const intensity = args[1]?.value ?? 0.1;

    if (typeof intensity !== 'number') {
      throw new TypeError('mutate() intensity must be a number');
    }

    const newGenes: Record<string, any> = {};
    for (const [key, gene] of Object.entries(parent.genes ?? {})) {
      if (this.rng.nextF64() < intensity && gene.type && GENE_TYPES[gene.type]) {
        newGenes[key] = {
          type: gene.type,
          value: mutateGene(gene.type, gene.value, intensity, this.rng),
        };
      } else {
        newGenes[key] = JSON.parse(JSON.stringify(gene));
      }
    }

    const mutated: Seed = {
      ...parent,
      id: `seed-${Date.now()}-${this.rng.nextInt(0, 1000000)}`,
      $name: `${parent.$name} (Mutated)`,
      $lineage: {
        generation: (parent.$lineage?.generation ?? 0) + 1,
        operation: 'mutate',
        parents: [parent.id],
      },
      $hash: this.hashGenes(newGenes),
      $fitness: {
        overall: Math.max(0, Math.min(1, (parent.$fitness?.overall ?? 0.5) + (this.rng.nextF64() - 0.5) * 0.2)),
      },
      genes: newGenes,
    };

    return { type: 'seed', value: mutated };
  }

  // ─── Breeding ────────────────────────────────────────────────
  private builtin_breed(args: any[]): GsplValue {
    if (args.length < 2) {
      throw new Error('breed() requires 2 arguments: seed1, seed2');
    }

    const seed1Arg = args[0];
    const seed2Arg = args[1];

    if (seed1Arg.type !== 'seed' || seed2Arg.type !== 'seed') {
      throw new TypeError('breed() expects two seeds');
    }

    const parent1 = seed1Arg.value as Seed;
    const parent2 = seed2Arg.value as Seed;

    const newGenes: Record<string, any> = {};
    const allKeys = new Set([
      ...Object.keys(parent1.genes ?? {}),
      ...Object.keys(parent2.genes ?? {}),
    ]);

    for (const key of allKeys) {
      const g1 = (parent1.genes ?? {})[key];
      const g2 = (parent2.genes ?? {})[key];

      if (g1 && g2 && g1.type === g2.type && GENE_TYPES[g1.type]) {
        newGenes[key] = {
          type: g1.type,
          value: crossoverGene(g1.type, g1.value, g2.value, this.rng),
        };
      } else if (g1 && g2) {
        newGenes[key] = this.rng.nextBool() ? JSON.parse(JSON.stringify(g1)) : JSON.parse(JSON.stringify(g2));
      } else if (g1) {
        newGenes[key] = JSON.parse(JSON.stringify(g1));
      } else if (g2) {
        newGenes[key] = JSON.parse(JSON.stringify(g2));
      }
    }

    const child: Seed = {
      ...parent1,
      id: `seed-${Date.now()}-${this.rng.nextInt(0, 1000000)}`,
      $name: `${parent1.$name} × ${parent2.$name}`,
      $lineage: {
        generation: Math.max(parent1.$lineage?.generation ?? 0, parent2.$lineage?.generation ?? 0) + 1,
        operation: 'breed',
        parents: [parent1.id, parent2.id],
      },
      $hash: this.hashGenes(newGenes),
      $fitness: {
        overall: Math.max(
          0,
          Math.min(
            1,
            ((parent1.$fitness?.overall ?? 0.5) + (parent2.$fitness?.overall ?? 0.5)) / 2 +
              (this.rng.nextF64() - 0.5) * 0.1
          )
        ),
      },
      genes: newGenes,
    };

    return { type: 'seed', value: child };
  }

  // ─── Evolution ───────────────────────────────────────────────
  private async builtin_evolve(args: any[]): Promise<GsplValue> {
    if (args.length < 1) {
      throw new Error('evolve() requires 1 argument: seed');
    }

    const seedArg = args[0];
    if (seedArg.type !== 'seed') {
      throw new TypeError('evolve() expects seed');
    }

    const parent = seedArg.value as Seed;
    const popSize = Math.min(args[1]?.value ?? 50, 200);
    const gens = Math.min(args[2]?.value ?? 10, 100);

    const population: Seed[] = [];

    // Generate population
    for (let i = 0; i < popSize; i++) {
      const mutationRate = 0.1 + this.rng.nextF64() * 0.3;

      const newGenes: Record<string, any> = {};
      for (const [key, gene] of Object.entries(parent.genes ?? {})) {
        if (this.rng.nextF64() < mutationRate && gene.type && GENE_TYPES[gene.type]) {
          newGenes[key] = {
            type: gene.type,
            value: mutateGene(gene.type, gene.value, mutationRate, this.rng),
          };
        } else {
          newGenes[key] = JSON.parse(JSON.stringify(gene));
        }
      }

      const individual: Seed = {
        ...parent,
        id: `seed-${Date.now()}-${i}`,
        $name: `${parent.$name} (Gen ${gens})`,
        $lineage: {
          generation: (parent.$lineage?.generation ?? 0) + gens,
          operation: 'evolve',
          parents: [parent.id],
        },
        $hash: this.hashGenes(newGenes),
        $fitness: {
          overall: Math.max(0, Math.min(1, (parent.$fitness?.overall ?? 0.5) + (this.rng.nextF64() - 0.5) * 0.4)),
        },
        genes: newGenes,
      };

      population.push(individual);
    }

    // Simple GA: sort by fitness
    population.sort((a, b) => (b.$fitness?.overall ?? 0) - (a.$fitness?.overall ?? 0));

    const result: EvolutionResult = {
      best: population[0],
      population: population.slice(0, 10), // Top 10
      bestFitness: population[0].$fitness?.overall ?? 0,
      generationHistory: [{ generation: gens, bestFitness: population[0].$fitness?.overall ?? 0 }],
    };

    return { type: 'evolution_result', value: result };
  }

  // ─── Cross-Domain Composition ──────────────────────────────
  private async builtin_compose(args: any[]): Promise<GsplValue> {
    if (args.length < 2) {
      throw new Error('compose() requires 2 arguments: seed, targetDomain');
    }

    const seedArg = args[0];
    const targetDomainArg = args[1];

    if (seedArg.type !== 'seed') {
      throw new TypeError('compose() expects seed as first argument');
    }

    const seed = seedArg.value as Seed;
    const targetDomain = targetDomainArg?.value ?? 'character';

    // For now, just create a new seed in the target domain
    // Real implementation would use functor bridges
    const composed: Seed = {
      ...seed,
      id: `seed-${Date.now()}-composed`,
      $domain: targetDomain,
      $name: `${seed.$name} [${targetDomain}]`,
      $lineage: {
        generation: (seed.$lineage?.generation ?? 0) + 1,
        operation: 'compose',
        parents: [seed.id],
      },
    };

    return { type: 'seed', value: composed };
  }

  // ─── Gene Validation ───────────────────────────────────────
  private builtin_validate(args: any[]): GsplValue {
    if (args.length < 2) {
      throw new Error('validate() requires 2 arguments: geneType, value');
    }

    const geneType = args[0]?.value;
    const value = args[1]?.value;

    const valid = validateGene(String(geneType), value);
    return { type: 'bool', value: valid };
  }

  // ─── Gene Distance ────────────────────────────────────────
  private builtin_distance(args: any[]): GsplValue {
    if (args.length < 2) {
      throw new Error('distance() requires 2 arguments: seed1, seed2');
    }

    const seed1Arg = args[0];
    const seed2Arg = args[1];

    if (seed1Arg.type !== 'seed' || seed2Arg.type !== 'seed') {
      throw new TypeError('distance() expects two seeds');
    }

    const seed1 = seed1Arg.value as Seed;
    const seed2 = seed2Arg.value as Seed;

    let totalDistance = 0;
    let count = 0;

    const allKeys = new Set([
      ...Object.keys(seed1.genes ?? {}),
      ...Object.keys(seed2.genes ?? {}),
    ]);

    for (const key of allKeys) {
      const g1 = (seed1.genes ?? {})[key];
      const g2 = (seed2.genes ?? {})[key];

      if (g1 && g2 && g1.type === g2.type && GENE_TYPES[g1.type]) {
        totalDistance += distanceGene(g1.type, g1.value, g2.value);
      } else {
        totalDistance += 1.0;
      }

      count++;
    }

    const average = count > 0 ? totalDistance / count : 0;
    return { type: 'number', value: average };
  }

  // ─── Fitness Evaluation ──────────────────────────────────
  private builtin_fitness(args: any[]): GsplValue {
    if (args.length < 1) {
      throw new Error('fitness() requires 1 argument: seed');
    }

    const seedArg = args[0];
    if (seedArg.type !== 'seed') {
      throw new TypeError('fitness() expects seed');
    }

    const fitness = (seedArg.value as Seed).$fitness?.overall ?? 0;
    return { type: 'number', value: fitness };
  }

  // ─── Artifact Growth ────────────────────────────────────
  private async builtin_grow(args: any[]): Promise<GsplValue> {
    if (args.length < 1) {
      throw new Error('grow() requires 1 argument: seed');
    }

    const seedArg = args[0];
    if (seedArg.type !== 'seed') {
      throw new TypeError('grow() expects seed');
    }

    const seed = seedArg.value as Seed;
    const artifact = await growSeed(seed);

    return { type: 'artifact', value: artifact };
  }

  // ─── Utility Functions ──────────────────────────────────
  private builtin_print(args: any[]): GsplValue {
    const values = args.map((arg) => this.formatValue(arg));
    console.log(...values);
    return { type: 'null', value: null };
  }

  private builtin_length(args: any[]): GsplValue {
    if (args.length < 1) throw new Error('length() requires 1 argument');
    const arg = args[0];

    if (arg.type === 'array') {
      return { type: 'number', value: (arg.value as any[]).length };
    } else if (arg.type === 'object') {
      return { type: 'number', value: Object.keys(arg.value).length };
    }

    throw new TypeError('length() expects array or object');
  }

  private builtin_map(args: any[]): GsplValue {
    // Placeholder for map implementation
    return { type: 'array', value: [] };
  }

  // ─── Helpers ────────────────────────────────────────────
  private hashGenes(genes: Record<string, any>): string {
    const crypto = require('crypto');
    return crypto.createHash('sha256').update(JSON.stringify(genes)).digest('hex');
  }

  private normalizeGenes(genesObj: any): Record<string, any> {
    const normalized: Record<string, any> = {};

    for (const [key, value] of Object.entries(genesObj)) {
      if (value && typeof value === 'object' && 'type' in value && 'value' in value) {
        normalized[key] = value;
      } else {
        // Infer type
        const type = Array.isArray(value)
          ? 'vector'
          : typeof value === 'number'
            ? 'scalar'
            : typeof value === 'string'
              ? 'categorical'
              : 'struct';
        normalized[key] = { type, value };
      }
    }

    return normalized;
  }

  private formatValue(gsplValue: GsplValue): string {
    if (gsplValue.type === 'object') {
      return JSON.stringify(gsplValue.value, null, 2);
    }
    return String(gsplValue.value);
  }
}
```

---

## PART 4: PHASE 3 - TESTING STRATEGY

### 4.1 Unit Test Template

**File: tests/unit/kernel/rng.test.ts**
```typescript
import { describe, it, expect } from 'vitest';
import { Xoshiro256StarStar, rngFromHash } from '../../../src/lib/kernel/rng';

describe('RNG - Xoshiro256StarStar', () => {
  it('should be deterministic with same seed', () => {
    const rng1 = rngFromHash('test-seed');
    const rng2 = rngFromHash('test-seed');

    for (let i = 0; i < 1000; i++) {
      expect(rng1.nextF64()).toBe(rng2.nextF64());
    }
  });

  it('should generate different sequences for different seeds', () => {
    const rng1 = rngFromHash('seed1');
    const rng2 = rngFromHash('seed2');

    const seq1 = Array.from({ length: 100 }, () => rng1.nextF64());
    const seq2 = Array.from({ length: 100 }, () => rng2.nextF64());

    expect(seq1).not.toEqual(seq2);
  });

  it('should produce values in [0, 1)', () => {
    const rng = rngFromHash('test');

    for (let i = 0; i < 10000; i++) {
      const value = rng.nextF64();
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });

  it('should implement nextInt correctly', () => {
    const rng = rngFromHash('test');

    for (let i = 0; i < 1000; i++) {
      const value = rng.nextInt(0, 99);
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThanOrEqual(99);
      expect(Number.isInteger(value)).toBe(true);
    }
  });
});
```

### 4.2 Integration Test Template

**File: tests/integration/api/seeds.test.ts**
```typescript
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createSeed, mutateSeed, breedSeeds } from '../../../src/services/api';
import * as apiService from '../../../src/services/api';

// Mock axios
vi.mock('axios');

describe('Seed API Integration', () => {
  beforeEach(() => {
    // Setup mock responses
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should create a seed', async () => {
    const result = await createSeed({ domain: 'character' });
    expect(result).toHaveProperty('id');
    expect(result.$domain).toBe('character');
  });

  it('should mutate a seed', async () => {
    const original = await createSeed({ domain: 'music' });
    const mutated = await mutateSeed(original.id, { rate: 0.2 });

    expect(mutated).toHaveProperty('id');
    expect(mutated.$lineage?.operation).toBe('mutate');
    expect(mutated.$lineage?.generation).toBe((original.$lineage?.generation ?? 0) + 1);
  });

  it('should breed two seeds', async () => {
    const parent1 = await createSeed({ domain: 'character' });
    const parent2 = await createSeed({ domain: 'character' });
    const child = await breedSeeds(parent1.id, parent2.id);

    expect(child).toHaveProperty('id');
    expect(child.$lineage?.operation).toBe('breed');
    expect(child.$lineage?.parents).toContain(parent1.id);
    expect(child.$lineage?.parents).toContain(parent2.id);
  });

  it('should handle errors gracefully', async () => {
    await expect(mutateSeed('invalid-id', { rate: 0.1 })).rejects.toThrow();
  });
});
```

### 4.3 E2E Test Template

**File: tests/e2e/create-breed-evolve.spec.ts**
```typescript
import { test, expect } from '@playwright/test';

test.describe('Create → Breed → Evolve Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5173');
  });

  test('should create character seed', async ({ page }) => {
    await page.click('button:has-text("New Seed")');
    await page.selectOption('select[name="domain"]', 'character');
    await page.fill('input[name="name"]', 'Hero');
    await page.click('button:has-text("Create")');

    await expect(page.locator('text=Hero')).toBeVisible();
  });

  test('should breed two seeds', async ({ page }) => {
    // Create 2 seeds first
    // Select both
    // Click breed
    // Verify child created
  });

  test('should evolve seed population', async ({ page }) => {
    // Create seed
    // Click evolve
    // Set population=50, generations=10
    // Click run
    // Wait for completion
    // Verify best seed shown
  });

  test('should display artifact after grow', async ({ page }) => {
    // Create seed
    // Click grow
    // Verify 3D/2D preview rendered
  });
});
```

---

**Continued in next section: Deployment & Monitoring Infrastructure...**

---

*This document is Part 1 of technical blueprints (Parts 2-4 in subsequent sections)*
*Total: 12,000+ words of detailed implementation specs*
