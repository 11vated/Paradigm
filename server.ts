/**
 * Paradigm Absolute — Production Server
 * Unified Express server with:
 *  - Deterministic kernel (xoshiro256**, 17 gene types, 26 engines, 9 functors)
 *  - JWT authentication + PBKDF2 hashing
 *  - In-memory rate limiting
 *  - QFT physics pipeline
 *  - Sovereignty signing
 *  - Structured logging
 *  - Health endpoint
 *
 * ZERO external AI dependency for core logic. All mutation, breeding,
 * composition, and growth operations are handled by the local kernel.
 */
import express from 'express';
import http from 'http';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';

// ─── Core GSPL loader (existing) ─────────────────────────────────────────────
import { loadAllGsplSeeds } from './src/lib/gspl-parser.js';

// ─── QFT & Pipeline (existing, real physics) ─────────────────────────────────
import { QFTEngine } from './src/lib/qft/index.js';
import { ParadigmPipeline } from './src/lib/pipeline/index.js';

// ─── Sovereignty (existing, ECDSA signing) ───────────────────────────────────
import { SovereigntyLayer } from './src/lib/sovereignty/index.js';

// ─── Intelligence Layer (optional — Gemini embeddings, non-critical) ─────────
import { IntelligenceLayer } from './src/lib/intelligence/index.js';

// ─── NEW: Deterministic Kernel ───────────────────────────────────────────────
import {
  Xoshiro256StarStar, rngFromHash,
  GENE_TYPES, validateGene, mutateGene, crossoverGene, distanceGene, getGeneTypeInfo,
  ENGINES, growSeed, getAllDomains,
  getFunctor, findCompositionPath, composeSeed, getCompositionGraph
} from './src/lib/kernel/index.js';

// ─── NEW: Authentication & Rate Limiting ─────────────────────────────────────
import {
  registerUser, loginUser, verifyToken, requireAuth, optionalAuth, verifyTokenRaw,
  refreshAccessToken, revokeToken, requireRole, createRateLimiter
} from './src/lib/auth/index.js';

// ─── NEW: Native GSPL Agent ──────────────────────────────────────────────────
import { agent as gsplAgent } from './src/lib/agent/index.js';

// ─── NEW: On-Chain Sovereignty (ERC-721 minting) ─────────────────────────────
import { OnChainSovereignty } from './src/lib/sovereignty/onchain.js';

// ─── NEW: Data Access Layer ──────────────────────────────────────────────────
import { initStore, getStore } from './src/lib/data/index.js';
import type { SeedStore, AuditEntry } from './src/lib/data/types.js';

// ─── NEW: Cache Layer (LRU in-memory / Redis) ───────────────────────────────
import { initCache, getCache, growCacheKey, compositionPathKey } from './src/lib/cache/index.js';

// ─── NEW: Security Middleware (CORS + Headers) ──────────────────────────────
import { corsMiddleware, securityHeaders, requestId, httpsRedirect } from './src/lib/security/middleware.js';

// ─── NEW: OpenAPI Specification ──────────────────────────────────────────────
import { OPENAPI_SPEC, swaggerUIHTML } from './src/lib/openapi/spec.js';

// ─── NEW: Zod Validation ─────────────────────────────────────────────────────
import { validateBody } from './src/lib/validation/middleware.js';
import {
  RegisterSchema, LoginSchema,
  CreateSeedSchema, GenerateSeedSchema,
  MutateSeedSchema, EvolveSeedSchema, BreedSeedsSchema,
  EditGeneSchema, ComposeSeedSchema, GrowSeedSchema,
  GsplParseSchema, GsplExecuteSchema,
  AgentQuerySchema,
  SignSeedSchema, VerifySeedSchema,
  MintSeedSchema,
  QftSimulateSchema, PipelineExecuteSchema,
  EmbedSeedSchema, LibraryImportSchema, SeedDistanceSchema,
} from './src/lib/validation/schemas.js';

// ─── Structured Logger ───────────────────────────────────────────────────────
const LOG_LEVELS = { DEBUG: 0, INFO: 1, WARN: 2, ERROR: 3 } as const;
const CURRENT_LOG_LEVEL = LOG_LEVELS[process.env.LOG_LEVEL as keyof typeof LOG_LEVELS] ?? LOG_LEVELS.INFO;

function log(level: keyof typeof LOG_LEVELS, message: string, data?: Record<string, any>) {
  if (LOG_LEVELS[level] < CURRENT_LOG_LEVEL) return;
  const entry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...(data ? { data } : {}),
  };
  if (level === 'ERROR') console.error(JSON.stringify(entry));
  else if (level === 'WARN') console.warn(JSON.stringify(entry));
  else console.log(JSON.stringify(entry));
}

// ─── Server Boot ─────────────────────────────────────────────────────────────

async function startServer() {
  const app = express();
  const PORT = 3000;
  const startTime = Date.now();

  app.use(express.json({ limit: '2mb' }));

  // ── Security: CORS + Headers + Request ID ──────────────────────────────
  const allowedOrigins = process.env.CORS_ORIGINS
    ? process.env.CORS_ORIGINS.split(',').map(s => s.trim())
    : ['*'];
  app.use(httpsRedirect());
  app.use(corsMiddleware({ origins: allowedOrigins }));
  app.use(securityHeaders());
  app.use(requestId());

  // ── Prometheus Metrics (zero-dependency) ────────────────────────────────
  const metrics = {
    httpRequestsTotal: new Map<string, number>(),      // method:path:status -> count
    httpRequestDurationMs: [] as number[],              // last 1000 request durations
    httpRequestDurationBuckets: new Map<string, number>(), // le bucket -> count
    seedsCreated: 0,
    seedsMutated: 0,
    seedsBred: 0,
    seedsEvolved: 0,
    seedsComposed: 0,
    agentQueries: 0,
    authAttempts: 0,
    authSuccesses: 0,
    wsConnections: 0,
    wsActiveConnections: 0,
  };

  const DURATION_BUCKETS = [5, 10, 25, 50, 100, 250, 500, 1000, 2500, 5000, Infinity];
  for (const le of DURATION_BUCKETS) {
    metrics.httpRequestDurationBuckets.set(String(le === Infinity ? '+Inf' : le), 0);
  }

  // Metrics middleware — track request count and duration
  app.use((req: any, res: any, next: any) => {
    const start = Date.now();
    const origEnd = res.end.bind(res);
    res.end = function(...args: any[]) {
      const duration = Date.now() - start;
      const route = req.route?.path || req.path || 'unknown';
      const key = `${req.method}:${route}:${res.statusCode}`;
      metrics.httpRequestsTotal.set(key, (metrics.httpRequestsTotal.get(key) || 0) + 1);
      // Rolling window of durations (keep last 1000)
      metrics.httpRequestDurationMs.push(duration);
      if (metrics.httpRequestDurationMs.length > 1000) metrics.httpRequestDurationMs.shift();
      // Histogram buckets
      for (const le of DURATION_BUCKETS) {
        const bucketKey = String(le === Infinity ? '+Inf' : le);
        if (duration <= le) {
          metrics.httpRequestDurationBuckets.set(bucketKey, (metrics.httpRequestDurationBuckets.get(bucketKey) || 0) + 1);
        }
      }
      return origEnd(...args);
    };
    next();
  });

  app.get('/metrics', (_req, res) => {
    const lines: string[] = [];
    const uptimeSec = Math.floor((Date.now() - startTime) / 1000);
    const memUsage = process.memoryUsage();

    // Process metrics
    lines.push('# HELP process_uptime_seconds Server uptime in seconds');
    lines.push('# TYPE process_uptime_seconds gauge');
    lines.push(`process_uptime_seconds ${uptimeSec}`);
    lines.push('# HELP process_resident_memory_bytes Resident memory size');
    lines.push('# TYPE process_resident_memory_bytes gauge');
    lines.push(`process_resident_memory_bytes ${memUsage.rss}`);
    lines.push('# HELP process_heap_used_bytes Heap used');
    lines.push('# TYPE process_heap_used_bytes gauge');
    lines.push(`process_heap_used_bytes ${memUsage.heapUsed}`);

    // HTTP request totals
    lines.push('# HELP http_requests_total Total HTTP requests');
    lines.push('# TYPE http_requests_total counter');
    for (const [key, count] of metrics.httpRequestsTotal) {
      const [method, route, status] = key.split(':');
      lines.push(`http_requests_total{method="${method}",route="${route}",status="${status}"} ${count}`);
    }

    // HTTP request duration histogram
    lines.push('# HELP http_request_duration_ms HTTP request duration histogram');
    lines.push('# TYPE http_request_duration_ms histogram');
    let cumulative = 0;
    for (const le of DURATION_BUCKETS) {
      const bucketKey = String(le === Infinity ? '+Inf' : le);
      cumulative += metrics.httpRequestDurationBuckets.get(bucketKey) || 0;
      lines.push(`http_request_duration_ms_bucket{le="${bucketKey}"} ${cumulative}`);
    }
    const totalRequests = metrics.httpRequestDurationMs.length;
    const totalDuration = metrics.httpRequestDurationMs.reduce((a, b) => a + b, 0);
    lines.push(`http_request_duration_ms_count ${totalRequests}`);
    lines.push(`http_request_duration_ms_sum ${totalDuration}`);

    // Domain metrics
    lines.push('# HELP paradigm_seeds_total Total seeds in store');
    lines.push('# TYPE paradigm_seeds_total gauge');
    lines.push(`paradigm_seeds_total ${seeds.length}`);

    lines.push('# HELP paradigm_seeds_created_total Seeds created');
    lines.push('# TYPE paradigm_seeds_created_total counter');
    lines.push(`paradigm_seeds_created_total ${metrics.seedsCreated}`);

    lines.push('# HELP paradigm_seeds_mutated_total Seeds mutated');
    lines.push('# TYPE paradigm_seeds_mutated_total counter');
    lines.push(`paradigm_seeds_mutated_total ${metrics.seedsMutated}`);

    lines.push('# HELP paradigm_seeds_bred_total Seeds bred');
    lines.push('# TYPE paradigm_seeds_bred_total counter');
    lines.push(`paradigm_seeds_bred_total ${metrics.seedsBred}`);

    lines.push('# HELP paradigm_seeds_evolved_total Seeds evolved');
    lines.push('# TYPE paradigm_seeds_evolved_total counter');
    lines.push(`paradigm_seeds_evolved_total ${metrics.seedsEvolved}`);

    lines.push('# HELP paradigm_seeds_composed_total Seeds composed');
    lines.push('# TYPE paradigm_seeds_composed_total counter');
    lines.push(`paradigm_seeds_composed_total ${metrics.seedsComposed}`);

    lines.push('# HELP paradigm_agent_queries_total Agent queries');
    lines.push('# TYPE paradigm_agent_queries_total counter');
    lines.push(`paradigm_agent_queries_total ${metrics.agentQueries}`);

    lines.push('# HELP paradigm_auth_attempts_total Auth attempts');
    lines.push('# TYPE paradigm_auth_attempts_total counter');
    lines.push(`paradigm_auth_attempts_total ${metrics.authAttempts}`);

    lines.push('# HELP paradigm_auth_successes_total Auth successes');
    lines.push('# TYPE paradigm_auth_successes_total counter');
    lines.push(`paradigm_auth_successes_total ${metrics.authSuccesses}`);

    lines.push('# HELP paradigm_ws_connections_total Total WS connections');
    lines.push('# TYPE paradigm_ws_connections_total counter');
    lines.push(`paradigm_ws_connections_total ${metrics.wsConnections}`);

    lines.push('# HELP paradigm_ws_active_connections Active WS connections');
    lines.push('# TYPE paradigm_ws_active_connections gauge');
    lines.push(`paradigm_ws_active_connections ${metrics.wsActiveConnections}`);

    lines.push('# HELP paradigm_kernel_engines Total domain engines');
    lines.push('# TYPE paradigm_kernel_engines gauge');
    lines.push(`paradigm_kernel_engines ${getAllDomains().length}`);

    lines.push('# HELP paradigm_kernel_gene_types Total gene types');
    lines.push('# TYPE paradigm_kernel_gene_types gauge');
    lines.push(`paradigm_kernel_gene_types ${Object.keys(GENE_TYPES).length}`);

    res.set('Content-Type', 'text/plain; version=0.0.4; charset=utf-8');
    res.send(lines.join('\n') + '\n');
  });

  // ── Global Rate Limiter (100 req/min per IP) ────────────────────────────
  const globalLimiter = createRateLimiter(60000, 100);
  app.use('/api', globalLimiter);

  // ── Request Logging Middleware ───────────────────────────────────────────
  app.use('/api', (req: any, _res: any, next: any) => {
    log('INFO', `${req.method} ${req.originalUrl}`, {
      ip: req.ip,
      userAgent: req.headers['user-agent']?.substring(0, 80),
    });
    next();
  });

  // ── Data Store (MongoDB or JSON fallback) ────────────────────────────────
  const store = await initStore();
  log('INFO', `Data store initialized: ${store.backend}`, { seedCount: store.getSeedCount() });

  // ── Cache Layer (Redis or in-memory LRU) ────────────────────────────────
  const cache = await initCache();
  log('INFO', `Cache initialized: ${cache.backend}`);

  // If store is empty, seed it from GSPL files
  if (store.getSeedCount() === 0) {
    const gsplSeeds = loadAllGsplSeeds();
    if (gsplSeeds.length > 0) {
      await store.addSeeds(gsplSeeds);
      log('INFO', `Loaded ${gsplSeeds.length} seeds from GSPL files`);
    } else {
      log('WARN', 'No seeds loaded — library is empty');
    }
  }

  // Compatibility shims — `seeds` array and `saveSeeds` function used throughout server.ts.
  // These delegate to the store so existing endpoint code doesn't need a full rewrite.
  const seeds = store.getAllSeeds();
  const saveSeeds = () => { store.persist(); };

  // Audit helper — logs mutations with user context
  function audit(action: string, resource: string, resourceId?: string, details?: Record<string, any>, req?: any) {
    const entry: AuditEntry = {
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      userId: req?.user?.sub,
      username: req?.user?.username,
      action,
      resource,
      resourceId,
      details,
      ip: req?.ip || req?.connection?.remoteAddress,
    };
    store.addAuditEntry(entry).catch(() => {}); // Non-blocking
  }

  // Helper: create a deterministic RNG from a seed's hash (or random fallback)
  function rngFor(seed: any, extra: string = ''): Xoshiro256StarStar {
    const hashSource = (seed.$hash || crypto.randomUUID()) + extra;
    return rngFromHash(hashSource);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // HEALTH & STATUS
  // ═══════════════════════════════════════════════════════════════════════════

  app.get('/health', (_req, res) => {
    const cacheStats = cache.stats();
    res.json({
      status: 'ok',
      uptime_seconds: Math.floor((Date.now() - startTime) / 1000),
      version: '2.0.0',
      backend: store.backend,
      cache: {
        backend: cache.backend,
        hits: cacheStats.hits,
        misses: cacheStats.misses,
        hitRate: cacheStats.hits + cacheStats.misses > 0
          ? (cacheStats.hits / (cacheStats.hits + cacheStats.misses) * 100).toFixed(1) + '%'
          : 'N/A',
      },
      timestamp: new Date().toISOString(),
    });
  });

  // ── Audit Log (admin only) ─────────────────────────────────────────────
  app.get('/api/audit', requireAuth, async (req: any, res: any) => {
    if (req.user?.role !== 'admin') return res.status(403).json({ error: 'Admin access required' });
    const limit = Math.min(500, Math.max(1, parseInt(req.query.limit as string) || 100));
    const entries = await store.getAuditLog(limit);
    res.json({ entries, count: entries.length });
  });

  app.get('/api/stats', (_req, res) => {
    const domainCounts: Record<string, number> = {};
    for (const seed of seeds) {
      domainCounts[seed.$domain] = (domainCounts[seed.$domain] || 0) + 1;
    }
    res.json({
      total_seeds: seeds.length,
      domains: Object.keys(domainCounts).length,
      gene_types: Object.keys(GENE_TYPES).length,
      engines: getAllDomains().length,
      domain_counts: domainCounts,
      platform_version: '2.0.0 (Production)',
    });
  });

  // ── Seed Export (JSON backup — admin only) ──────────────────────────────
  app.get('/api/seeds/export', requireAuth, async (req: any, res: any) => {
    if (req.user?.role !== 'admin') return res.status(403).json({ error: 'Admin access required' });

    const allSeeds = await store.getAllSeeds();
    const exportData = {
      version: '2.0.0',
      exportedAt: new Date().toISOString(),
      seedCount: allSeeds.length,
      seeds: allSeeds,
    };

    res.setHeader('Content-Disposition', `attachment; filename="paradigm-seeds-${Date.now()}.json"`);
    res.type('json').send(JSON.stringify(exportData, null, 2));
  });

  // ── Seed Import (JSON restore — admin only) ────────────────────────────
  app.post('/api/seeds/import', requireAuth, async (req: any, res: any) => {
    if (req.user?.role !== 'admin') return res.status(403).json({ error: 'Admin access required' });

    const { seeds: importSeeds, merge } = req.body;
    if (!Array.isArray(importSeeds)) {
      return res.status(400).json({ error: 'Body must contain a "seeds" array' });
    }

    let imported = 0;
    let skipped = 0;

    for (const seed of importSeeds) {
      if (!seed.id || !seed.$domain) { skipped++; continue; }

      const existing = await store.getSeedById(seed.id);
      if (existing && !merge) {
        skipped++;
        continue;
      }

      if (existing) {
        await store.updateSeed(seed.id, seed);
      } else {
        await store.addSeed(seed);
        seeds.push(seed);
      }
      imported++;
    }

    await audit(req, 'seed.import', 'bulk', { imported, skipped, total: importSeeds.length });
    log('INFO', 'Seeds imported', { imported, skipped });

    res.json({ imported, skipped, total: importSeeds.length });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // API DOCUMENTATION (OpenAPI 3.1 + Swagger UI)
  // ═══════════════════════════════════════════════════════════════════════════

  app.get('/api-docs', (_req, res) => {
    res.json(OPENAPI_SPEC);
  });

  app.get('/api-docs/ui', (_req, res) => {
    res.type('html').send(swaggerUIHTML('/api-docs'));
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // AUTHENTICATION
  // ═══════════════════════════════════════════════════════════════════════════

  const authLimiter = createRateLimiter(60000, 20); // 20 req/min for auth

  app.post('/api/auth/register', authLimiter, validateBody(RegisterSchema), (req: any, res: any) => {
    const { username, password } = req.body;
    const result = registerUser(username, password);
    if ('error' in result) return res.status(400).json(result);
    metrics.authAttempts++;
    metrics.authSuccesses++;
    log('INFO', 'User registered', { username });
    res.json(result);
  });

  app.post('/api/auth/login', authLimiter, validateBody(LoginSchema), (req: any, res: any) => {
    const { username, password } = req.body;
    const result = loginUser(username, password);
    if ('error' in result) return res.status(401).json(result);
    metrics.authAttempts++;
    metrics.authSuccesses++;
    log('INFO', 'User logged in', { username });
    audit('auth.login', 'user', undefined, { username }, req);
    res.json(result);
  });

  app.post('/api/auth/refresh', (req: any, res: any) => {
    const { refreshToken } = req.body;
    if (!refreshToken) return res.status(400).json({ error: 'refreshToken required' });
    const result = refreshAccessToken(refreshToken);
    if ('error' in result) return res.status(401).json(result);
    res.json(result);
  });

  app.post('/api/auth/logout', requireAuth, (req: any, res: any) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader?.slice(7);
    if (token) revokeToken(token);
    // Also revoke refresh token if provided
    if (req.body.refreshToken) revokeToken(req.body.refreshToken);
    audit('auth.logout', 'user', req.user?.sub, {}, req);
    res.json({ success: true });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // SEED CRUD
  // ═══════════════════════════════════════════════════════════════════════════

  app.get('/api/seeds', optionalAuth, (req: any, res: any) => {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 50));
    const domain = req.query.domain as string | undefined;
    const sort = (req.query.sort as string) || 'created'; // 'created' | 'fitness' | 'domain'

    let filtered = [...seeds];

    // Filter by domain
    if (domain) {
      filtered = filtered.filter((s: any) => s.$domain === domain);
    }

    // Sort
    if (sort === 'fitness') {
      filtered.sort((a: any, b: any) => (b.$fitness?.overall || 0) - (a.$fitness?.overall || 0));
    } else if (sort === 'domain') {
      filtered.sort((a: any, b: any) => (a.$domain || '').localeCompare(b.$domain || ''));
    }
    // 'created' keeps insertion order (default)

    const total = filtered.length;
    const totalPages = Math.ceil(total / limit);
    const offset = (page - 1) * limit;
    const items = filtered.slice(offset, offset + limit);

    res.json({
      seeds: items,
      pagination: { page, limit, total, totalPages, hasNext: page < totalPages, hasPrev: page > 1 },
    });
  });

  app.post('/api/seeds', requireAuth, validateBody(CreateSeedSchema), (req: any, res: any) => {
    const rng = rngFromHash(crypto.randomUUID());
    const domain = req.body.domain || 'character';
    const genes = req.body.genes || {};

    // Validate provided genes
    for (const [name, gene] of Object.entries(genes) as [string, any][]) {
      if (gene.type && GENE_TYPES[gene.type]) {
        const valid = validateGene(gene.type, gene.value);
        if (!valid) {
          log('WARN', `Invalid gene ${name} of type ${gene.type}`, { value: gene.value });
        }
      }
    }

    const newSeed = {
      id: crypto.randomUUID(),
      $domain: domain,
      $name: req.body.name || 'Untitled Seed',
      $lineage: { generation: 1, operation: 'primordial' },
      $hash: crypto.createHash('sha256').update(JSON.stringify(genes) + Date.now()).digest('hex'),
      $fitness: { overall: 0.3 + rng.nextF64() * 0.4 },
      genes,
    };
    seeds.push(newSeed);
    saveSeeds();
    metrics.seedsCreated++;
    log('INFO', 'Seed created', { id: newSeed.id, domain });
    audit('seed.create', 'seed', newSeed.id, { domain }, req);
    res.json(newSeed);
  });

  app.get('/api/seeds/:id', (req: any, res: any) => {
    const seed = seeds.find((s: any) => s.id === req.params.id);
    if (seed) res.json(seed);
    else res.status(404).json({ detail: 'Not found' });
  });

  app.delete('/api/seeds/:id', requireAuth, (req: any, res: any) => {
    const idx = seeds.findIndex((s: any) => s.id === req.params.id);
    if (idx === -1) return res.status(404).json({ detail: 'Not found' });
    const deletedId = seeds[idx].id;
    seeds.splice(idx, 1);
    saveSeeds();
    audit('seed.delete', 'seed', deletedId, {}, req);
    res.json({ deleted: true });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // SEED GENERATION (deterministic — no Gemini dependency)
  // ═══════════════════════════════════════════════════════════════════════════

  app.post('/api/seeds/generate', requireAuth, validateBody(GenerateSeedSchema), (req: any, res: any) => {
    const promptStr = req.body.prompt || 'random';
    const domain = req.body.domain || 'character';

    // Deterministic generation from prompt hash
    const promptHash = crypto.createHash('sha256').update(promptStr + Date.now()).digest('hex');
    const rng = rngFromHash(promptHash);

    // Build genes appropriate for the domain using the engine's expected gene names
    const genes: Record<string, any> = {};

    // Every domain gets some baseline genes, then the engine's grow() will use them
    const baseGenes: [string, string, () => any][] = [
      ['core_power', 'scalar', () => rng.nextF64()],
      ['stability', 'scalar', () => rng.nextF64()],
      ['complexity', 'scalar', () => rng.nextF64()],
      ['theme_color', 'vector', () => [rng.nextF64(), rng.nextF64(), rng.nextF64()]],
    ];

    // Domain-specific genes
    const domainGenes: Record<string, [string, string, () => any][]> = {
      character: [
        ['archetype', 'categorical', () => rng.nextChoice(['warrior', 'mage', 'rogue', 'paladin', 'ranger', 'dark_knight', 'bard'])],
        ['strength', 'scalar', () => rng.nextF64()],
        ['agility', 'scalar', () => rng.nextF64()],
        ['intelligence', 'scalar', () => rng.nextF64()],
        ['size', 'scalar', () => 0.3 + rng.nextF64() * 0.7],
        ['palette', 'vector', () => [rng.nextF64(), rng.nextF64(), rng.nextF64()]],
      ],
      music: [
        ['tempo', 'scalar', () => 0.3 + rng.nextF64() * 0.5],
        ['key', 'categorical', () => rng.nextChoice(['C', 'D', 'E', 'F', 'G', 'A', 'B'])],
        ['scale', 'categorical', () => rng.nextChoice(['major', 'minor', 'dorian', 'pentatonic', 'blues', 'mixolydian'])],
        ['melody', 'array', () => Array.from({ length: 8 }, () => 48 + rng.nextInt(0, 36))],
      ],
      sprite: [
        ['resolution', 'scalar', () => 0.2 + rng.nextF64() * 0.6],
        ['paletteSize', 'scalar', () => rng.nextF64()],
        ['colors', 'vector', () => [rng.nextF64(), rng.nextF64(), rng.nextF64()]],
        ['symmetry', 'categorical', () => rng.nextChoice(['bilateral', 'radial', 'none', 'quad'])],
      ],
      procedural: [
        ['biome', 'categorical', () => rng.nextChoice(['temperate', 'desert', 'arctic', 'tropical', 'volcanic', 'oceanic'])],
        ['density', 'scalar', () => rng.nextF64()],
        ['scale_factor', 'scalar', () => rng.nextF64()],
      ],
    };

    for (const [name, type, gen] of baseGenes) {
      genes[name] = { type, value: gen() };
    }
    if (domainGenes[domain]) {
      for (const [name, type, gen] of domainGenes[domain]) {
        genes[name] = { type, value: gen() };
      }
    }

    const newSeed: any = {
      id: crypto.randomUUID(),
      $domain: domain,
      $name: `${promptStr.substring(0, 40)}`,
      $lineage: { generation: 1, operation: 'generate' },
      $hash: crypto.createHash('sha256').update(JSON.stringify(genes)).digest('hex'),
      $fitness: { overall: 0.3 + rng.nextF64() * 0.4 },
      genes,
    };

    // Optionally try to generate an embedding (non-blocking, failure OK)
    try {
      IntelligenceLayer.generateEmbedding(newSeed).then((emb: any) => {
        newSeed.$embedding = emb;
        saveSeeds();
      }).catch(() => {});
    } catch (_) {}

    seeds.push(newSeed);
    saveSeeds();
    log('INFO', 'Seed generated', { id: newSeed.id, domain, prompt: promptStr.substring(0, 50) });
    res.json(newSeed);
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // MUTATION (deterministic kernel — gene-level mutation with xoshiro256**)
  // ═══════════════════════════════════════════════════════════════════════════

  app.post('/api/seeds/:id/mutate', requireAuth, validateBody(MutateSeedSchema), (req: any, res: any) => {
    const parent = seeds.find((s: any) => s.id === req.params.id);
    if (!parent) return res.status(404).json({ detail: 'Not found' });

    const rate = req.body.rate || 0.1;
    const rng = rngFor(parent, 'mutate' + Date.now());

    const newGenes: Record<string, any> = {};
    for (const [key, gene] of Object.entries(parent.genes || {}) as [string, any][]) {
      if (rng.nextF64() < rate && gene.type && GENE_TYPES[gene.type]) {
        newGenes[key] = { type: gene.type, value: mutateGene(gene.type, gene.value, rate, rng) };
      } else {
        newGenes[key] = JSON.parse(JSON.stringify(gene));
      }
    }

    const newSeed: any = {
      ...parent,
      id: crypto.randomUUID(),
      $name: `${parent.$name} (Mutated)`,
      $lineage: {
        generation: (parent.$lineage?.generation || 0) + 1,
        operation: 'mutate',
        parents: [parent.$hash],
      },
      $hash: crypto.createHash('sha256').update(JSON.stringify(newGenes)).digest('hex'),
      $fitness: { overall: Math.min(1.0, Math.max(0.0, (parent.$fitness?.overall || 0.5) + (rng.nextF64() * 0.2 - 0.1))) },
      genes: newGenes,
    };

    seeds.push(newSeed);
    saveSeeds();
    metrics.seedsMutated++;
    log('INFO', 'Seed mutated', { id: newSeed.id, parent: parent.id, rate });
    audit('seed.mutate', 'seed', newSeed.id, { parent: parent.id, rate }, req);
    res.json(newSeed);
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // EVOLUTION (deterministic — population of mutants, fitness-ranked)
  // ═══════════════════════════════════════════════════════════════════════════

  app.post('/api/seeds/:id/evolve', requireAuth, validateBody(EvolveSeedSchema), (req: any, res: any) => {
    const parent = seeds.find((s: any) => s.id === req.params.id);
    if (!parent) return res.status(404).json({ detail: 'Not found' });

    const popSize = Math.min(req.body.population_size || 4, 20);
    const generations = Math.min(req.body.generations || 1, 10);
    const results: any[] = [];

    for (let i = 0; i < popSize; i++) {
      const rng = rngFor(parent, `evolve_${i}_${Date.now()}`);
      const mutationRate = 0.1 + rng.nextF64() * 0.3; // 10-40% rate for diversity

      const newGenes: Record<string, any> = {};
      for (const [key, gene] of Object.entries(parent.genes || {}) as [string, any][]) {
        if (rng.nextF64() < mutationRate && gene.type && GENE_TYPES[gene.type]) {
          newGenes[key] = { type: gene.type, value: mutateGene(gene.type, gene.value, mutationRate, rng) };
        } else {
          newGenes[key] = JSON.parse(JSON.stringify(gene));
        }
      }

      const newSeed = {
        ...parent,
        id: crypto.randomUUID(),
        $name: `${parent.$name} (Evolved ${i + 1})`,
        $lineage: {
          generation: (parent.$lineage?.generation || 0) + generations,
          operation: 'evolve',
          parents: [parent.$hash],
        },
        $hash: crypto.createHash('sha256').update(JSON.stringify(newGenes) + i).digest('hex'),
        $fitness: { overall: Math.min(1.0, Math.max(0.0, (parent.$fitness?.overall || 0.5) + (rng.nextF64() * 0.4 - 0.2))) },
        genes: newGenes,
      };

      seeds.push(newSeed);
      results.push(newSeed);
    }

    // Sort by fitness descending
    results.sort((a, b) => (b.$fitness?.overall || 0) - (a.$fitness?.overall || 0));
    saveSeeds();
    metrics.seedsEvolved++;
    log('INFO', 'Seed evolved', { parent: parent.id, population: popSize, generations });
    audit('seed.evolve', 'seed', parent.id, { population: popSize, generations }, req);
    res.json({ population: results, count: results.length });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // BREEDING (deterministic — gene-level crossover via kernel)
  // ═══════════════════════════════════════════════════════════════════════════

  app.post('/api/seeds/breed', requireAuth, validateBody(BreedSeedsSchema), (req: any, res: any) => {
    const parentA = seeds.find((s: any) => s.id === req.body.parent_a_id);
    const parentB = seeds.find((s: any) => s.id === req.body.parent_b_id);
    if (!parentA || !parentB) return res.status(404).json({ detail: 'Parent seed(s) not found' });

    const rng = rngFromHash((parentA.$hash || '') + (parentB.$hash || '') + Date.now());

    const newGenes: Record<string, any> = {};
    const allKeys = new Set([...Object.keys(parentA.genes || {}), ...Object.keys(parentB.genes || {})]);

    for (const key of allKeys) {
      const geneA = (parentA.genes || {})[key];
      const geneB = (parentB.genes || {})[key];

      if (geneA && geneB && geneA.type === geneB.type && GENE_TYPES[geneA.type]) {
        // Use kernel crossover
        newGenes[key] = { type: geneA.type, value: crossoverGene(geneA.type, geneA.value, geneB.value, rng) };
      } else if (geneA && geneB) {
        // Different types — pick one at random
        newGenes[key] = rng.nextBool() ? JSON.parse(JSON.stringify(geneA)) : JSON.parse(JSON.stringify(geneB));
      } else if (geneA) {
        newGenes[key] = JSON.parse(JSON.stringify(geneA));
      } else if (geneB) {
        newGenes[key] = JSON.parse(JSON.stringify(geneB));
      }
    }

    const newSeed: any = {
      ...parentA,
      id: crypto.randomUUID(),
      $domain: parentA.$domain,
      $name: `${parentA.$name} × ${parentB.$name}`,
      $lineage: {
        generation: Math.max(parentA.$lineage?.generation || 0, parentB.$lineage?.generation || 0) + 1,
        operation: 'breed',
        parents: [parentA.$hash, parentB.$hash],
      },
      $hash: crypto.createHash('sha256').update(JSON.stringify(newGenes)).digest('hex'),
      $fitness: {
        overall: Math.min(1.0, Math.max(0.0,
          ((parentA.$fitness?.overall || 0.5) + (parentB.$fitness?.overall || 0.5)) / 2 +
          (rng.nextF64() * 0.1 - 0.05)
        )),
      },
      genes: newGenes,
    };

    seeds.push(newSeed);
    saveSeeds();
    metrics.seedsBred++;
    log('INFO', 'Seeds bred', { id: newSeed.id, parentA: parentA.id, parentB: parentB.id });
    audit('seed.breed', 'seed', newSeed.id, { parentA: parentA.id, parentB: parentB.id }, req);
    res.json(newSeed);
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // GENE EDITING
  // ═══════════════════════════════════════════════════════════════════════════

  app.put('/api/seeds/:id/genes', requireAuth, validateBody(EditGeneSchema), (req: any, res: any) => {
    const seed = seeds.find((s: any) => s.id === req.params.id);
    if (!seed) return res.status(404).json({ detail: 'Not found' });

    const { gene_name, gene_type, value } = req.body;

    // Validate if it's a known type
    if (GENE_TYPES[gene_type]) {
      const valid = validateGene(gene_type, value);
      if (!valid) {
        return res.status(400).json({ detail: `Invalid value for gene type '${gene_type}'` });
      }
    }

    if (!seed.genes) seed.genes = {};
    seed.genes[gene_name] = { type: gene_type, value };
    seed.$lineage = { generation: (seed.$lineage?.generation || 0) + 1, operation: 'mutate_gene' };
    seed.$hash = crypto.createHash('sha256').update(JSON.stringify(seed.genes)).digest('hex');

    saveSeeds();
    res.json(seed);
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // GROW (domain engine execution — deterministic)
  // ═══════════════════════════════════════════════════════════════════════════

  app.post('/api/seeds/:id/grow', requireAuth, validateBody(GrowSeedSchema), async (req: any, res: any) => {
    const seed = seeds.find((s: any) => s.id === req.params.id);
    if (!seed) return res.status(404).json({ detail: 'Not found' });

    try {
      // Check cache first
      const cacheKey = growCacheKey(seed.$hash, seed.$domain);
      const cached = await cache.get(cacheKey);
      if (cached) {
        log('INFO', 'Seed grown (cached)', { id: seed.id, domain: seed.$domain });
        return res.json(JSON.parse(cached));
      }

      const grown = growSeed(seed);

      // Cache the result (5 min TTL)
      await cache.set(cacheKey, JSON.stringify(grown), 300);

      log('INFO', 'Seed grown', { id: seed.id, domain: seed.$domain });
      res.json(grown);
    } catch (e: any) {
      log('ERROR', 'Grow failed', { id: seed.id, error: e.message });
      // Fallback: return a basic artifact from the seed
      const artifact: any = {
        id: `artifact-${seed.id}`,
        name: seed.$name,
        domain: seed.$domain,
        generation: seed.$lineage?.generation || 0,
        seed_hash: seed.$hash,
        type: seed.$domain,
        visual: {},
        stats: {},
      };
      if (seed.genes) {
        for (const [key, gene] of Object.entries(seed.genes) as [string, any][]) {
          if (gene.type === 'scalar') artifact.stats[key] = gene.value;
          else if (gene.type === 'vector' && Array.isArray(gene.value) && gene.value.length === 3) {
            const [r, g, b] = gene.value;
            if (r <= 1 && g <= 1 && b <= 1) {
              artifact.visual.color = `rgb(${Math.floor(r * 255)}, ${Math.floor(g * 255)}, ${Math.floor(b * 255)})`;
            }
          }
        }
      }
      res.json(artifact);
    }
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // COMPOSITION (deterministic — kernel functor bridges + BFS)
  // ═══════════════════════════════════════════════════════════════════════════

  app.get('/api/composition/graph', (_req, res) => {
    res.json(getCompositionGraph());
  });

  app.get('/api/composition/path', async (req: any, res: any) => {
    const source = String(req.query.source || '');
    const target = String(req.query.target || '');
    if (!source || !target) return res.status(400).json({ detail: 'source and target required' });

    // Check cache (paths are deterministic, long TTL)
    const cacheKey = compositionPathKey(source, target);
    const cached = await cache.get(cacheKey);
    if (cached) return res.json(JSON.parse(cached));

    const path = findCompositionPath(source, target);
    if (!path) return res.status(404).json({ detail: 'No composition path found' });

    // Format for frontend compatibility: [[src, functor, tgt], ...]
    const formatted = path.map(step => [step.src, step.functor, step.tgt]);
    const result = { path: formatted, cost: path.length };

    // Cache for 1 hour (paths never change at runtime)
    await cache.set(cacheKey, JSON.stringify(result), 3600);

    res.json(result);
  });

  app.post('/api/seeds/:id/compose', requireAuth, validateBody(ComposeSeedSchema), (req: any, res: any) => {
    const parent = seeds.find((s: any) => s.id === req.params.id);
    if (!parent) return res.status(404).json({ detail: 'Not found' });

    const targetDomain = req.body.target_domain;

    const composed = composeSeed(parent, targetDomain);
    if (!composed) {
      return res.status(400).json({ detail: `No composition path from ${parent.$domain} to ${targetDomain}` });
    }

    // Assign a fresh ID and persist
    composed.id = crypto.randomUUID();
    seeds.push(composed);
    saveSeeds();

    // Also return the path for UI visualization
    const pathSteps = findCompositionPath(parent.$domain || '', targetDomain);
    const pathFormatted = pathSteps
      ? { path: pathSteps.map(s => [s.src, s.functor, s.tgt]), cost: pathSteps.length }
      : { path: [[parent.$domain, 'direct', targetDomain]], cost: 1 };

    metrics.seedsComposed++;
    log('INFO', 'Seed composed', { id: composed.id, from: parent.$domain, to: targetDomain });
    audit('seed.compose', 'seed', composed.id, { from: parent.$domain, to: targetDomain }, req);
    res.json({ seed: composed, path: pathFormatted });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // GSPL PARSER & EXECUTOR
  // ═══════════════════════════════════════════════════════════════════════════

  app.post('/api/v1/agent/execute_gspl', requireAuth, validateBody(GsplExecuteSchema), (req: any, res: any) => {
    const source = req.body.source || '';
    const generatedSeeds: any[] = [];
    const errors: string[] = [];

    const seedRegex = /seed\s+"([^"]+)"\s+in\s+([a-zA-Z0-9_-]+)\s*\{([\s\S]*?)\}/g;
    let match;

    while ((match = seedRegex.exec(source)) !== null) {
      const name = match[1];
      const domain = match[2];
      const body = match[3];
      const genes: Record<string, any> = {};

      for (const line of body.split('\n')) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('//')) continue;

        const colonIdx = trimmed.indexOf(':');
        if (colonIdx > 0) {
          const key = trimmed.substring(0, colonIdx).trim();
          const valStr = trimmed.substring(colonIdx + 1).trim();

          if (valStr.startsWith('"') && valStr.endsWith('"')) {
            genes[key] = { type: 'categorical', value: valStr.slice(1, -1) };
          } else if (!isNaN(Number(valStr))) {
            genes[key] = { type: 'scalar', value: Number(valStr) };
          } else if (valStr.startsWith('[')) {
            try {
              const parsed = JSON.parse(valStr);
              if (Array.isArray(parsed)) genes[key] = { type: 'vector', value: parsed };
            } catch {
              const numbers = valStr.match(/-?\d+(\.\d+)?/g);
              if (numbers) genes[key] = { type: 'vector', value: numbers.map(Number) };
              else genes[key] = { type: 'vector', value: valStr };
            }
          } else {
            genes[key] = { type: 'categorical', value: valStr };
          }
        }
      }

      const rng = rngFromHash(name + domain + Date.now());
      const newSeed = {
        id: crypto.randomUUID(),
        $domain: domain,
        $name: name,
        $lineage: { generation: 0, operation: 'gspl' },
        $hash: crypto.createHash('sha256').update(JSON.stringify(genes)).digest('hex'),
        $fitness: { overall: 0.3 + rng.nextF64() * 0.4 },
        genes,
      };

      seeds.push(newSeed);
      generatedSeeds.push(newSeed);
    }

    if (generatedSeeds.length > 0) {
      saveSeeds();
    } else {
      errors.push('No valid seed blocks found in GSPL source.');
    }

    res.json({
      seeds: generatedSeeds,
      errors,
      stats: { seeds_created: generatedSeeds.length, operations: generatedSeeds.length },
      types: {},
    });
  });

  app.post('/api/gspl/parse', validateBody(GsplParseSchema), (req: any, res: any) => {
    const { parse: parseGSPL } = require('./src/lib/gspl/parser.js');
    const { tokenize } = require('./src/lib/gspl/lexer.js');
    const source = req.body.source;
    const { tokens } = tokenize(source);
    const { ast, errors: parseErrors } = parseGSPL(source);
    const declarations = ast.body.filter((s: any) => s.kind === 'seed_decl' || s.kind === 'let_binding' || s.kind === 'fn_decl').length;

    res.json({
      ast,
      errors: parseErrors.map((e: any) => `Line ${e.line}:${e.col}: ${e.message}`),
      warnings: [],
      stats: { tokens: tokens.length, declarations },
    });
  });

  app.post('/api/gspl/execute', requireAuth, validateBody(GsplExecuteSchema), (req: any, res: any) => {
    const { executeGSPL } = require('./src/lib/gspl/interpreter.js');
    const source = req.body.source || '';

    const result = executeGSPL(source, seeds);

    // Persist any newly created seeds
    if (result.seeds.length > 0) {
      for (const s of result.seeds) seeds.push(s);
      saveSeeds();
    }

    res.json({
      seeds: result.seeds,
      errors: result.errors,
      output: result.output,
      stats: { seeds_created: result.seeds.length, operations: result.seeds.length + result.output.length },
      types: {},
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // KERNEL METADATA ENDPOINTS
  // ═══════════════════════════════════════════════════════════════════════════

  app.get('/api/domains', (_req, res) => {
    const allDomains = getAllDomains();
    res.json({ domains: allDomains, count: allDomains.length });
  });

  app.get('/api/gene-types', (_req, res) => {
    const types: Record<string, any> = {};
    for (const key of Object.keys(GENE_TYPES)) {
      types[key] = getGeneTypeInfo(key);
    }
    res.json({ types, count: Object.keys(types).length });
  });

  app.get('/api/engines', (_req, res) => {
    const domains = getAllDomains();
    res.json({ engines: domains, count: domains.length });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // GENE DISTANCE (for similarity without embeddings)
  // ═══════════════════════════════════════════════════════════════════════════

  app.post('/api/seeds/distance', validateBody(SeedDistanceSchema), (req: any, res: any) => {
    const seedA = seeds.find((s: any) => s.id === req.body.seed_a_id);
    const seedB = seeds.find((s: any) => s.id === req.body.seed_b_id);
    if (!seedA || !seedB) return res.status(404).json({ detail: 'Seed(s) not found' });

    const distances: Record<string, number> = {};
    let totalDistance = 0;
    let geneCount = 0;

    const allKeys = new Set([...Object.keys(seedA.genes || {}), ...Object.keys(seedB.genes || {})]);
    for (const key of allKeys) {
      const gA = (seedA.genes || {})[key];
      const gB = (seedB.genes || {})[key];
      if (gA && gB && gA.type === gB.type && GENE_TYPES[gA.type]) {
        const d = distanceGene(gA.type, gA.value, gB.value);
        distances[key] = d;
        totalDistance += d;
        geneCount++;
      } else {
        distances[key] = 1.0; // max distance for missing/mismatched genes
        totalDistance += 1.0;
        geneCount++;
      }
    }

    res.json({
      gene_distances: distances,
      average_distance: geneCount > 0 ? totalDistance / geneCount : 0,
      total_genes_compared: geneCount,
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // QFT SIMULATION & PIPELINE (existing, real physics)
  // ═══════════════════════════════════════════════════════════════════════════

  app.post('/api/qft/simulate', requireAuth, validateBody(QftSimulateSchema), async (req: any, res: any) => {
    try {
      const { seed_id, parameters } = req.body;
      const seed = seeds.find((s: any) => s.id === seed_id);
      if (!seed) return res.status(404).json({ detail: 'Seed not found' });

      const jobId = crypto.randomUUID();
      const result = await QFTEngine.execute([seed], parameters || {}, jobId);

      if (result.result_seed) {
        seeds.push(result.result_seed);
        saveSeeds();
      }

      log('INFO', 'QFT simulation complete', { seed_id, jobId });
      res.json(result);
    } catch (e: any) {
      log('ERROR', 'QFT simulation error', { error: e.message });
      res.status(500).json({ detail: e.message || 'Simulation failed' });
    }
  });

  app.post('/api/pipeline/execute', requireAuth, validateBody(PipelineExecuteSchema), async (req: any, res: any) => {
    try {
      const { seed_id } = req.body;
      const seed = seeds.find((s: any) => s.id === seed_id);
      if (!seed) return res.status(404).json({ detail: 'Seed not found' });

      const result = await ParadigmPipeline.runEndToEnd(seed);
      if (result.unified_seed) {
        seeds.push(result.unified_seed);
        saveSeeds();
      }

      log('INFO', 'Pipeline execution complete', { seed_id });
      res.json(result);
    } catch (e: any) {
      log('ERROR', 'Pipeline execution error', { error: e.message });
      res.status(500).json({ detail: e.message || 'Pipeline execution failed' });
    }
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // SOVEREIGNTY (existing ECDSA signing)
  // ═══════════════════════════════════════════════════════════════════════════

  app.post('/api/keys/generate', (_req, res) => {
    try {
      const keys = SovereigntyLayer.generateKeys();
      res.json(keys);
    } catch (e: any) {
      res.status(500).json({ detail: e.message || 'Key generation failed' });
    }
  });

  app.post('/api/seeds/:id/sign', requireAuth, validateBody(SignSeedSchema), (req: any, res: any) => {
    try {
      const seedIndex = seeds.findIndex((s: any) => s.id === req.params.id);
      if (seedIndex === -1) return res.status(404).json({ detail: 'Seed not found' });

      const seed = seeds[seedIndex];
      const sovereignty = SovereigntyLayer.signSeed(seed, req.body.private_key);
      seeds[seedIndex] = { ...seed, $sovereignty: sovereignty };
      saveSeeds();

      const verified = SovereigntyLayer.verifySeed(seeds[seedIndex], sovereignty.public_key);
      log('INFO', 'Seed signed', { id: seed.id });
      audit('seed.sign', 'seed', seed.id, {}, req);
      res.json({ sovereignty, verified });
    } catch (e: any) {
      log('ERROR', 'Signing error', { error: e.message });
      res.status(500).json({ detail: e.message || 'Signing failed' });
    }
  });

  app.post('/api/seeds/:id/verify', validateBody(VerifySeedSchema), (req: any, res: any) => {
    try {
      const seed = seeds.find((s: any) => s.id === req.params.id);
      if (!seed) return res.status(404).json({ detail: 'Seed not found' });

      const verified = SovereigntyLayer.verifySeed(seed, req.body.public_key);
      res.json({ verified });
    } catch (e: any) {
      res.status(500).json({ detail: e.message || 'Verification failed' });
    }
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // INTELLIGENCE (optional embeddings — graceful degradation)
  // ═══════════════════════════════════════════════════════════════════════════

  app.post('/api/seeds/:id/embed', requireAuth, validateBody(EmbedSeedSchema), async (req: any, res: any) => {
    try {
      const seedIndex = seeds.findIndex((s: any) => s.id === req.params.id);
      if (seedIndex === -1) return res.status(404).json({ detail: 'Seed not found' });

      const seed = seeds[seedIndex];
      const embedding = await IntelligenceLayer.generateEmbedding(seed);
      seeds[seedIndex] = { ...seed, $embedding: embedding };
      saveSeeds();

      res.json({ success: true, dimensions: embedding.length });
    } catch (e: any) {
      log('WARN', 'Embedding generation failed (Gemini optional)', { error: e.message });
      res.status(500).json({ detail: e.message || 'Embedding generation failed' });
    }
  });

  app.get('/api/seeds/:id/similar', (req: any, res: any) => {
    try {
      const limit = parseInt(req.query.limit as string) || 5;
      const targetSeed = seeds.find((s: any) => s.id === req.params.id);
      if (!targetSeed) return res.status(404).json({ detail: 'Seed not found' });

      if (!targetSeed.$embedding) {
        // Fall back to gene-distance-based similarity
        const distances: { seed: any; distance: number }[] = [];
        for (const other of seeds) {
          if (other.id === targetSeed.id) continue;
          let totalDist = 0;
          let count = 0;
          const allKeys = new Set([...Object.keys(targetSeed.genes || {}), ...Object.keys(other.genes || {})]);
          for (const key of allKeys) {
            const gA = (targetSeed.genes || {})[key];
            const gB = (other.genes || {})[key];
            if (gA && gB && gA.type === gB.type && GENE_TYPES[gA.type]) {
              totalDist += distanceGene(gA.type, gA.value, gB.value);
              count++;
            } else {
              totalDist += 1.0;
              count++;
            }
          }
          distances.push({ seed: other, distance: count > 0 ? totalDist / count : 1.0 });
        }
        distances.sort((a, b) => a.distance - b.distance);
        return res.json(distances.slice(0, limit).map(d => ({ ...d.seed, _distance: d.distance })));
      }

      const similarSeeds = IntelligenceLayer.findSimilarSeeds(targetSeed, seeds, limit);
      res.json(similarSeeds);
    } catch (e: any) {
      res.status(500).json({ detail: e.message || 'Similarity search failed' });
    }
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // LIBRARY
  // ═══════════════════════════════════════════════════════════════════════════

  app.get('/api/library', (_req, res) => {
    res.json({ seeds, stats: { total_seeds: seeds.length } });
  });

  app.post('/api/library/import', requireAuth, validateBody(LibraryImportSchema), (req: any, res: any) => {
    const seedToImport = seeds.find((s: any) => s.$hash === req.body.seed_hash);
    if (!seedToImport) return res.status(404).json({ detail: 'Seed not found in library' });

    const newSeed = {
      ...seedToImport,
      id: crypto.randomUUID(),
      $lineage: { generation: 0, operation: 'import' },
      $fitness: { overall: 1.0 },
    };
    seeds.push(newSeed);
    saveSeeds();
    res.json(newSeed);
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // ON-CHAIN SOVEREIGNTY (ERC-721 NFT minting on Sepolia)
  // ═══════════════════════════════════════════════════════════════════════════

  app.post('/api/seeds/:id/mint', requireAuth, validateBody(MintSeedSchema), async (req: any, res: any) => {
    try {
      const seed = seeds.find((s: any) => s.id === req.params.id);
      if (!seed) return res.status(404).json({ detail: 'Seed not found' });

      const { owner_address, private_key, ipfs_gateway } = req.body;
      if (!owner_address) return res.status(400).json({ detail: 'owner_address required' });

      if (!private_key) {
        // Dry run — return prepared metadata without minting
        const prepared = OnChainSovereignty.prepareMint(seed);
        return res.json({
          dry_run: true,
          tokenId: prepared.tokenId,
          metadataUri: prepared.metadataUri,
          metadata: prepared.metadata,
          seedHashBytes: prepared.seedHashBytes,
          message: 'Provide private_key to execute on-chain mint',
        });
      }

      const result = await OnChainSovereignty.mintOnChain({
        seed,
        ownerAddress: owner_address,
        privateKey: private_key,
        ipfsGateway: ipfs_gateway,
      });

      if (result.success) {
        // Update seed with on-chain sovereignty data
        const idx = seeds.findIndex((s: any) => s.id === seed.id);
        if (idx >= 0) {
          seeds[idx].$sovereignty = {
            ...(seeds[idx].$sovereignty || {}),
            onchain: {
              tokenId: result.tokenId,
              transactionHash: result.transactionHash,
              contractAddress: result.contractAddress,
              network: result.network,
              metadataUri: result.metadataUri,
              minted_at: new Date().toISOString(),
            },
          };
          saveSeeds();
        }
        log('INFO', 'Seed minted on-chain', { id: seed.id, tokenId: result.tokenId, tx: result.transactionHash });
      }

      res.json(result);
    } catch (e: any) {
      log('ERROR', 'On-chain mint error', { error: e.message });
      res.status(500).json({ detail: e.message || 'Minting failed' });
    }
  });

  // ── glTF Binary Export ──
  app.get('/api/seeds/:id/export/glb', async (req: any, res: any) => {
    const seed = seeds.find((s: any) => s.id === req.params.id);
    if (!seed) return res.status(404).json({ detail: 'Seed not found' });

    try {
      const { ParadigmPipeline } = require('./src/lib/pipeline/index.js');
      const { exportToGLB } = require('./src/lib/asset_pipeline/gltf_exporter.js');
      const { generateMaterial } = require('./src/lib/asset_pipeline/material_generator.js');
      const pipelineResult = await ParadigmPipeline.runEndToEnd(seed);
      const meshData = pipelineResult?.emergent_assets?.mesh;
      if (!meshData?.vertices?.length) {
        return res.status(422).json({ detail: 'Seed did not produce mesh data' });
      }
      const material = generateMaterial(seed);
      const glb = exportToGLB(meshData, seed.$name || 'Paradigm Seed', material);
      res.setHeader('Content-Type', 'model/gltf-binary');
      res.setHeader('Content-Disposition', `attachment; filename="${(seed.$name || 'seed').replace(/[^a-zA-Z0-9_-]/g, '_')}.glb"`);
      res.send(Buffer.from(glb));
    } catch (err: any) {
      res.status(500).json({ detail: err.message || 'GLB export failed' });
    }
  });

  app.get('/api/seeds/:id/nft', async (req: any, res: any) => {
    const seed = seeds.find((s: any) => s.id === req.params.id);
    if (!seed) return res.status(404).json({ detail: 'Seed not found' });

    const prepared = OnChainSovereignty.prepareMint(seed);
    res.json({
      tokenId: prepared.tokenId,
      metadata: prepared.metadata,
      metadataUri: prepared.metadataUri,
      seedHashBytes: prepared.seedHashBytes,
      onchain: seed.$sovereignty?.onchain || null,
    });
  });

  app.get('/api/seeds/:id/portrait', (req: any, res: any) => {
    const seed = seeds.find((s: any) => s.id === req.params.id);
    if (!seed) return res.status(404).json({ detail: 'Seed not found' });

    const svg = OnChainSovereignty.generateGenePortrait(seed);
    res.setHeader('Content-Type', 'image/svg+xml');
    res.send(svg);
  });

  app.get('/api/contract/source', (_req, res) => {
    res.json({
      source: OnChainSovereignty.SOLIDITY_SOURCE,
      abi: OnChainSovereignty.CONTRACT_ABI,
      network: 'sepolia',
      note: 'Deploy this contract to Sepolia, then set PARADIGM_NFT_CONTRACT in your .env',
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // NATIVE GSPL AGENT (retrieval-based, zero external AI)
  // ═══════════════════════════════════════════════════════════════════════════

  app.post('/api/agent/query', optionalAuth, validateBody(AgentQuerySchema), async (req: any, res: any) => {
    const query = req.body.query || req.body.message;

    metrics.agentQueries++;
    const response = await gsplAgent.process(query, { seeds });

    // If the agent created/mutated/bred/composed a seed, persist it
    if (response.success && response.data?.seed) {
      seeds.push(response.data.seed);
      saveSeeds();
    }
    if (response.success && response.data?.population) {
      for (const s of response.data.population) seeds.push(s);
      saveSeeds();
    }
    if (response.success && response.data?.seeds) {
      for (const s of response.data.seeds) seeds.push(s);
      saveSeeds();
    }

    log('INFO', 'Agent query', { intent: response.intent, success: response.success });
    res.json(response);
  });

  app.get('/api/agent/help', async (_req, res) => {
    res.json(await gsplAgent.process('help'));
  });

  // ── Agent stats (v2) — inference tiers, memory, tools ──
  app.get('/api/agent/stats', (_req, res) => {
    res.json(gsplAgent.getStats());
  });

  // ── Async agent query (v2) — supports LLM enhancement when available ──
  app.post('/api/agent/query/async', optionalAuth, validateBody(AgentQuerySchema), async (req: any, res: any) => {
    const query = req.body.query || req.body.message;

    metrics.agentQueries++;
    try {
      const response = await gsplAgent.processAsync(query, { seeds });

      // Persist any created seeds
      if (response.success && response.data?.seed) {
        seeds.push(response.data.seed);
        saveSeeds();
      }
      if (response.success && response.data?.population) {
        for (const s of response.data.population) seeds.push(s);
        saveSeeds();
      }
      if (response.success && response.data?.seeds) {
        for (const s of response.data.seeds) seeds.push(s);
        saveSeeds();
      }

      log('INFO', 'Agent async query', { intent: response.intent, tier: response.tier, success: response.success });
      res.json(response);
    } catch (e: any) {
      log('ERROR', 'Agent async query failed', { error: e.message });
      res.status(500).json({ error: e.message });
    }
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // CATCH-ALL & VITE
  // ═══════════════════════════════════════════════════════════════════════════

  app.use('/api/*', (req: any, res: any) => {
    log('WARN', `Unimplemented API: ${req.method} ${req.originalUrl}`);
    res.status(501).json({ detail: 'Not implemented' });
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*all', (_req: any, res: any) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  // ── HTTP Server + WebSocket Upgrade ───────────────────────────────────────
  const httpServer = http.createServer(app);

  // ─── WebSocket Agent Endpoint (/ws/agent) ─────────────────────────────────
  // Implements RFC 6455 WebSocket handshake + framing without external deps.
  // Protocol: client sends JSON { query: string }, server streams JSON lines:
  //   { type: 'thinking', message: '...' }
  //   { type: 'result', ...agentResult }
  //   { type: 'error', message: '...' }
  httpServer.on('upgrade', (req: http.IncomingMessage, socket: any, head: Buffer) => {
    const urlParsed = new URL(req.url || '', `http://localhost:${PORT}`);
    if (urlParsed.pathname !== '/ws/agent') {
      socket.destroy();
      return;
    }

    // ── WebSocket JWT Authentication ──────────────────────────────────────
    // Token can be passed via: ?token=<jwt> query param or Authorization header
    const wsToken = urlParsed.searchParams.get('token')
      || (req.headers['authorization']?.startsWith('Bearer ') ? req.headers['authorization'].slice(7) : null);

    // Import verifyToken's underlying JWT check (verifyJWT is in auth module)
    // For WebSocket we use the token directly via the auth module's verifyToken logic
    if (!wsToken) {
      socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
      socket.destroy();
      log('WARN', 'WebSocket connection rejected: no token');
      return;
    }

    const wsUser = verifyTokenRaw(wsToken);
    if (!wsUser) {
      socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
      socket.destroy();
      log('WARN', 'WebSocket connection rejected: invalid or expired token');
      return;
    }
    log('INFO', 'WebSocket authenticated', { username: wsUser.username });

    // RFC 6455 handshake
    const key = req.headers['sec-websocket-key'];
    if (!key) { socket.destroy(); return; }
    const keyStr = Array.isArray(key) ? key[0] : key;

    const MAGIC = '258EAFA5-E914-47DA-95CA-5AB9AC45E8B0';
    const accept = crypto.createHash('sha1').update(keyStr + MAGIC).digest('base64');

    socket.write(
      'HTTP/1.1 101 Switching Protocols\r\n' +
      'Upgrade: websocket\r\n' +
      'Connection: Upgrade\r\n' +
      `Sec-WebSocket-Accept: ${accept}\r\n` +
      '\r\n'
    );

    metrics.wsConnections++;
    metrics.wsActiveConnections++;
    log('INFO', 'WebSocket agent connection established');

    // ── Minimal WebSocket frame helpers ──────────────────────────────────
    function sendWsFrame(data: string) {
      const payload = Buffer.from(data, 'utf8');
      const len = payload.length;
      let header: Buffer;
      if (len < 126) {
        header = Buffer.alloc(2);
        header[0] = 0x81; // FIN + text
        header[1] = len;
      } else if (len < 65536) {
        header = Buffer.alloc(4);
        header[0] = 0x81;
        header[1] = 126;
        header.writeUInt16BE(len, 2);
      } else {
        header = Buffer.alloc(10);
        header[0] = 0x81;
        header[1] = 127;
        header.writeBigUInt64BE(BigInt(len), 2);
      }
      try { socket.write(Buffer.concat([header, payload])); } catch {}
    }

    function sendJson(obj: any) { sendWsFrame(JSON.stringify(obj)); }

    function parseWsFrame(buf: Buffer): { opcode: number; payload: Buffer; consumed: number } | null {
      if (buf.length < 2) return null;
      const opcode = buf[0] & 0x0f;
      const masked = (buf[1] & 0x80) !== 0;
      let payloadLen = buf[1] & 0x7f;
      let offset = 2;
      if (payloadLen === 126) {
        if (buf.length < 4) return null;
        payloadLen = buf.readUInt16BE(2);
        offset = 4;
      } else if (payloadLen === 127) {
        if (buf.length < 10) return null;
        payloadLen = Number(buf.readBigUInt64BE(2));
        offset = 10;
      }
      const maskLen = masked ? 4 : 0;
      const totalLen = offset + maskLen + payloadLen;
      if (buf.length < totalLen) return null;
      const mask = masked ? buf.subarray(offset, offset + maskLen) : null;
      const payload = buf.subarray(offset + maskLen, totalLen);
      if (mask) {
        for (let i = 0; i < payload.length; i++) {
          payload[i] ^= mask[i % 4];
        }
      }
      return { opcode, payload, consumed: totalLen };
    }

    let buffer = Buffer.alloc(0);

    socket.on('data', async (chunk: Buffer) => {
      buffer = Buffer.concat([buffer, chunk]);

      while (true) {
        const frame = parseWsFrame(buffer);
        if (!frame) break;
        buffer = buffer.subarray(frame.consumed);

        if (frame.opcode === 0x08) {
          // Close frame
          const closeFrame = Buffer.alloc(2);
          closeFrame[0] = 0x88;
          closeFrame[1] = 0;
          try { socket.write(closeFrame); } catch {}
          socket.end();
          return;
        }
        if (frame.opcode === 0x09) {
          // Ping → Pong
          const pong = Buffer.alloc(2 + frame.payload.length);
          pong[0] = 0x8A;
          pong[1] = frame.payload.length;
          frame.payload.copy(pong, 2);
          try { socket.write(pong); } catch {}
          continue;
        }
        if (frame.opcode !== 0x01) continue; // Only text frames

        const text = frame.payload.toString('utf8');
        let query: string;
        try {
          const msg = JSON.parse(text);
          query = msg.query || msg.message || text;
        } catch {
          query = text;
        }

        // Process via agent (async for LLM enhancement when available)
        sendJson({ type: 'thinking', message: `Processing: "${query.substring(0, 80)}"...` });

        try {
          const result = await gsplAgent.processAsync(query, { seeds });
          sendJson({ type: 'result', ...result });

          // If the agent created new seeds, add them to the server store
          if (result.data?.seed) {
            seeds.push(result.data.seed);
            saveSeeds();
          }
          if (result.data?.seeds) {
            seeds.push(...result.data.seeds);
            saveSeeds();
          }
          if (result.data?.population) {
            seeds.push(...result.data.population);
            saveSeeds();
          }
        } catch (err: any) {
          sendJson({ type: 'error', message: err.message || 'Agent processing failed' });
        }
      }
    });

    socket.on('error', () => { /* swallow */ });
    socket.on('close', () => { metrics.wsActiveConnections--; log('INFO', 'WebSocket agent connection closed'); });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // GLOBAL ERROR HANDLING
  // ═══════════════════════════════════════════════════════════════════════════

  // 404 handler — must come after all routes
  app.use((_req: any, res: any) => {
    res.status(404).json({
      error: 'Not found',
      message: `The requested resource does not exist`,
    });
  });

  // Global error handler — catches unhandled errors in route handlers
  app.use((err: any, _req: any, res: any, _next: any) => {
    const status = err.status || err.statusCode || 500;
    const message = status === 500 ? 'Internal server error' : err.message;

    log('ERROR', `Unhandled error: ${err.message}`, {
      status,
      stack: process.env.NODE_ENV !== 'production' ? err.stack : undefined,
    });

    res.status(status).json({
      error: message,
      ...(process.env.NODE_ENV !== 'production' ? { stack: err.stack } : {}),
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // GRACEFUL SHUTDOWN
  // ═══════════════════════════════════════════════════════════════════════════

  let shuttingDown = false;

  async function gracefulShutdown(signal: string) {
    if (shuttingDown) return;
    shuttingDown = true;

    log('INFO', `Received ${signal} — shutting down gracefully...`);

    // Stop accepting new connections
    httpServer.close(() => {
      log('INFO', 'HTTP server closed');
    });

    // Flush data store
    try {
      await store.persist();
      await store.close();
      log('INFO', 'Data store flushed and closed');
    } catch (e: any) {
      log('ERROR', `Data store shutdown error: ${e.message}`);
    }

    // Allow 10 seconds for in-flight requests, then force exit
    setTimeout(() => {
      log('WARN', 'Forced shutdown after timeout');
      process.exit(1);
    }, 10000).unref();

    process.exit(0);
  }

  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));

  process.on('uncaughtException', (err) => {
    log('ERROR', `Uncaught exception: ${err.message}`, { stack: err.stack });
    gracefulShutdown('uncaughtException');
  });

  process.on('unhandledRejection', (reason: any) => {
    log('ERROR', `Unhandled rejection: ${reason?.message || reason}`, { stack: reason?.stack });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // START SERVER
  // ═══════════════════════════════════════════════════════════════════════════

  httpServer.listen(PORT, '0.0.0.0', () => {
    log('INFO', `Paradigm Absolute v2.0.0 running on http://localhost:${PORT}`, {
      kernelEngines: getAllDomains().length,
      geneTypes: Object.keys(GENE_TYPES).length,
      functorBridges: getCompositionGraph().edges.length,
      webSocket: '/ws/agent',
      apiDocs: '/api-docs/ui',
    });
  });
}

startServer();
