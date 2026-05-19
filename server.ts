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

// ─── Browser API Polyfills (jsdom for server-side canvas/DOM) ───────────────
import { initServerPolyfills } from './src/lib/kernel/server-polyfills.js';
initServerPolyfills();

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
  Xoshiro256Star, rngFromHash,
  GENE_TYPES, validateGene, mutateGene, crossoverGene, distanceGene, getGeneTypeInfo, validateGeneWithDetails,
  ENGINES, growSeed, getAllDomains,
  getFunctor, findCompositionPath, composeSeed, getCompositionGraph
} from './src/lib/kernel/index.js';
import { geneTypeRegistry, GENE_TYPE_LIST } from './src/lib/kernel/gene-type-registry.js';
import {
  registerGSPLGeneType, parseGSPLGeneType, GSPL_GENE_TYPE_EXAMPLE,
} from './src/lib/kernel/gspl-gene-type.js';
import {
  createSovereignGene, mutateSovereignGene, breedSovereignGenes,
  licenseSovereignGene, getGeneProvenance, checkGenePermission,
  extractValue, isSovereignGene,
} from './src/lib/kernel/gene-sovereignty.js';
import { inversePipeline, formatInverseResult } from './src/lib/kernel/inverse-pipeline.js';
import { renderSeed, getSupportedFormats, packagePSeed, parsePSeed } from './src/lib/rendering/seed-render-service.js';
import { encodeGseed, decodeGseed, signGseed, verifyGseedSignature, writeGseedFile, readGseedFile, exportGseedToFile } from './src/lib/kernel/binary-format.js';
import { creativeDAO, trainingCanon, DEFAULT_ROYALTY_CURVE } from './src/lib/blockchain/creative-dao.js';
import * as daoProvider from './src/lib/blockchain/dao-provider.js';
import { RegisterGeneTypeSchema } from './src/lib/validation/schemas.js';

// ─── NEW: Authentication & Rate Limiting ─────────────────────────────────────
import {
  registerUser, loginUser, verifyToken, requireAuth, optionalAuth, verifyTokenRaw,
  refreshAccessToken, revokeToken, requireRole, createRateLimiter
} from './src/lib/auth/index.js';

// ─── NEW: Seed Ownership & Authorization (Phase 3) ───────────────────────────
import {
  addOwnerIfAuthed,
  authorizeSeedMutation,
  resolveCommitAuthor,
} from './src/lib/auth/ownership.js';

// ─── NEW: Native GSPL Agent ──────────────────────────────────────────────────
import { agent as gsplAgent, Orchestrator } from './src/lib/agent/index.js';

// ─── NEW: Paradigm Friend (Phase 1) ──────────────────────────────────────────
import {
  createFriendSeed,
  breedFriends,
  mutateFriend,
  generateFriend,
} from './src/lib/friend/index.js';

// ─── NEW: Memory System + Sub-Agent Pipeline ─────────────────────────────────
import { MemorySystem } from './src/lib/commons/memory/memory-system.js';

const memorySystem = new MemorySystem('server');
gsplAgent.setMemorySystem(memorySystem);
const pipelineOrchestrator = new Orchestrator({ defaultDomain: 'character' });

// ─── NEW: Evolution Job Tracking ─────────────────────────────────────────
interface EvolutionJob {
  id: string;
  status: 'queued' | 'running' | 'completed' | 'failed' | 'cancelled';
  algorithm: string;
  populationSize: number;
  generations: number;
  seedId: string;
  createdAt: number;
  completedAt?: number;
  result?: any;
  error?: string;
}

const evolutionJobs: Map<string, EvolutionJob> = new Map();

// ─── NEW: On-Chain Sovereignty (ERC-721 minting) ─────────────────────────────
import { OnChainSovereignty } from './src/lib/sovereignty/onchain.js';
import {
  canonicalizeSeed,
  seedDigestBytes32,
} from './src/lib/sovereignty/canonical.js';
import {
  LocalHmacSigner,
  LocalDryRunAnchor,
  LocalFilePin,
  mintSeedSovereignty,
} from './src/lib/sovereignty/adapters.js';

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
  FriendGenerateSchema, FriendBreedSchema, FriendMutateSchema,
} from './src/lib/validation/schemas.js';
import { persistCustomGeneTypes, loadCustomGeneTypes } from './src/lib/data/index.js';

// ─── Structured Logger (Phase 1: pino) ──────────────────────────────────────
// The shape `log('LEVEL', 'msg', {data})` is preserved so existing call sites
// don't need to change. Internals now go through pino, which gives us JSON
// output, redaction, and child loggers. See src/lib/logger/index.ts.
import { log } from './src/lib/logger/index.js';

// ─── Readiness probes (Phase 1: /ready endpoint) ───────────────────────────
import {
  checkSbert, checkPostgres, checkStore, buildReport, checkRedis
} from './src/lib/health/readiness.js';

// ─── Seed Version Control (Phase 2: git-for-seeds) ─────────────────────────
import {
  initFileVcs,
  commit as vcsCommit,
  log as vcsLog,
  diffTrees,
  mergeCommits,
  branch as vcsBranch,
  checkout as vcsCheckout,
  ensureRef as vcsEnsureRef,
  findMergeBase,
  type ObjectStore as VcsObjectStoreT,
  type RefStore as VcsRefStoreT,
} from './src/lib/vcs/index.js';

// ─── Server Boot ─────────────────────────────────────────────────────────────

async function startServer() {
  const app = express();
  const PORT = Number.parseInt(process.env.PORT || '3000', 10);
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
  const dataDir = path.join(process.cwd(), 'data');
  const loadedTypes = loadCustomGeneTypes(dataDir);
  if (loadedTypes > 0) log('INFO', `Loaded ${loadedTypes} custom gene type(s) from storage`);
  log('INFO', `Data store initialized: ${store.backend}`, { seedCount: store.getSeedCount() });

  // ── Cache Layer (Redis or in-memory LRU) ────────────────────────────────
  const cache = await initCache();
  log('INFO', `Cache initialized: ${cache.backend}`);

  // ── VCS (git-for-seeds) — file-backed object + ref stores ────────────────
  // We reuse the `data/` directory next to user-seeds.json so backups pick
  // up both together. If this path is wrong for a given deployment, set
  // PARADIGM_VCS_DIR and we'll use that instead.
  const vcsDir = process.env.PARADIGM_VCS_DIR ?? path.join(process.cwd(), 'data');
  const { objects: vcsObjects, refs: vcsRefs } = initFileVcs(vcsDir);
  log('INFO', 'VCS initialized', { dir: vcsDir });

  // If store is empty, seed it from GSPL files
  if ((await store.getSeedCount()) === 0) {
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
  // Must await since all store methods are now async (supports PostgreSQL, MongoDB, and JSON backends).
  const seeds: any[] = await store.getAllSeeds();
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

  // Deterministic ID counter (resets per server start — same inputs → same outputs within a run)
  let deterministicIdCounter = 0;
  function deterministicSeedId(parentHash?: string, extra?: string): string {
    deterministicIdCounter += 1;
    const base = parentHash ? parentHash.slice(0, 16) : deterministicIdCounter.toString(36);
    const suffix = extra ? `-${extra}` : '';
    return `seed-${base}${suffix}-${deterministicIdCounter.toString(36).padStart(4, '0')}`;
  }

  // Helper: create a deterministic RNG from a seed's hash
  function rngFor(seed: any, extra: string = ''): ReturnType<typeof rngFromHash> {
    const hashSource = (seed.$hash || seed.id || 'deterministic-fallback') + extra;
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

  // Readiness probe — separate from liveness so load balancers can drain
  // traffic from degraded instances without killing the process. Checks run
  // in parallel so a single slow dep can't blow the client's timeout.
  // See src/lib/health/readiness.ts for per-check semantics.
  app.get('/ready', async (_req, res) => {
    const sbertUrl = process.env.SBERT_URL;
    // Only attempt a pg probe when DATABASE_URL is set — otherwise importing
    // the pg module would construct a pool that immediately fails.
    const pgProbe: (() => Promise<unknown>) | undefined = process.env.DATABASE_URL
      ? async () => {
          const { probePg } = await import('./src/lib/intelligence/pgvector.js');
          await probePg();
        }
      : undefined;

    const [sbert, postgres, storeCheck, redisCheck] = await Promise.all([
      checkSbert(sbertUrl),
      checkPostgres(pgProbe),
      checkStore(async () => store.getAllSeeds()),
      checkRedis(),
    ]);

    const report = buildReport([storeCheck, postgres, sbert, redisCheck]);
    res.status(report.ready ? 200 : 503).json(report);
  });

  // ── Audit Log (admin only) ─────────────────────────────────────────────
  app.get('/api/audit', optionalAuth, async (req: any, res: any) => {
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
  app.get('/api/seeds/export', optionalAuth, async (req: any, res: any) => {
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
  app.post('/api/seeds/import', optionalAuth, async (req: any, res: any) => {
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

    await audit('seed.import', 'bulk', 'bulk-import', { imported, skipped, total: importSeeds.length }, req);
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

  app.post('/api/auth/logout', optionalAuth, (req: any, res: any) => {
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

  app.post('/api/seeds', optionalAuth, validateBody(CreateSeedSchema), (req: any, res: any) => {
    const domain = req.body.domain || 'character';
    const genes = req.body.genes || {};
    const seedHash = crypto.createHash('sha256').update(JSON.stringify({ domain, genes })).digest('hex');
    const rng = rngFromHash(seedHash);

    // Validate provided genes
    for (const [name, gene] of Object.entries(genes) as [string, any][]) {
      if (gene.type && GENE_TYPES[gene.type]) {
        const valid = validateGene(gene.type, gene.value);
        if (!valid) {
          log('WARN', `Invalid gene ${name} of type ${gene.type}`, { value: gene.value });
        }
      }
    }

    const newSeed: any = {
      id: deterministicSeedId(seedHash),
      $domain: domain,
      $name: req.body.name || 'Untitled Seed',
      $lineage: { generation: 1, operation: 'primordial', timestamp: 0 },
      $hash: seedHash,
      $fitness: { overall: 0.3 + rng.nextF64() * 0.4 },
      genes,
    };
    // Phase 3: stamp owner if authed. Unowned (legacy) otherwise.
    addOwnerIfAuthed(newSeed, req.user);
    seeds.push(newSeed);
    saveSeeds();
    metrics.seedsCreated++;
    log('INFO', 'Seed created', { id: newSeed.id, domain, owner: newSeed.$owner?.userId ?? null });
    audit('seed.create', 'seed', newSeed.id, { domain, owner: newSeed.$owner?.userId ?? null }, req);
    res.json(newSeed);
  });

  app.get('/api/seeds/:id', (req: any, res: any) => {
    const seed = seeds.find((s: any) => s.id === req.params.id);
    if (seed) res.json(seed);
    else res.status(404).json({ detail: 'Not found' });
  });

  app.delete('/api/seeds/:id', optionalAuth, (req: any, res: any) => {
    const idx = seeds.findIndex((s: any) => s.id === req.params.id);
    if (idx === -1) return res.status(404).json({ detail: 'Not found' });
    const seed = seeds[idx];
    // Phase 3: owner-only delete (admin override allowed).
    if (!authorizeSeedMutation(seed, req, res, 'seed.delete', audit)) return;
    const deletedId = seed.id;
    seeds.splice(idx, 1);
    saveSeeds();
    audit('seed.delete', 'seed', deletedId, {}, req);
    res.json({ deleted: true });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // SEED GENERATION (deterministic — no Gemini dependency)
  // ═══════════════════════════════════════════════════════════════════════════

  app.post('/api/seeds/generate', optionalAuth, validateBody(GenerateSeedSchema), (req: any, res: any) => {
    const promptStr = req.body.prompt || 'random';
    const domain = req.body.domain || 'character';

    // Deterministic generation from prompt hash
    const promptHash = crypto.createHash('sha256').update(promptStr).digest('hex');
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

  /**
   * Inverse pipeline: artifact/description → seed
   * POST /api/seeds/inverse
   * Body: { data?, mimeType?, description?, domain? }
   */
  app.post('/api/seeds/inverse', optionalAuth, async (req: any, res: any) => {
    const input = req.body || {};
    if (!input.description && !input.data) {
      return res.status(400).json({ error: 'Provide description or data' });
    }
    try {
      const result = await inversePipeline(input);
      if (result.seed) {
        seeds.push(result.seed);
        saveSeeds();
      }
      log('INFO', 'Inverse pipeline completed', { domain: result.domain, confidence: result.confidence });
      res.json(formatInverseResult(result));
    } catch (err: any) {
      log('ERROR', 'Inverse pipeline failed', { error: err.message });
      res.status(500).json({ error: 'Inverse pipeline failed', message: err.message });
    }
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // MUTATION (deterministic kernel — gene-level mutation with xoshiro256**)
  // ═══════════════════════════════════════════════════════════════════════════

  app.post('/api/seeds/:id/mutate', optionalAuth, validateBody(MutateSeedSchema), (req: any, res: any) => {
    const parent = seeds.find((s: any) => s.id === req.params.id);
    if (!parent) return res.status(404).json({ detail: 'Not found' });

    const rate = req.body.rate || 0.1;
    const rng = rngFor(parent, 'mutate');

    const newGenes: Record<string, any> = {};
    for (const [key, gene] of Object.entries(parent.genes || {}) as [string, any][]) {
      if (rng.nextF64() < rate && gene.type && GENE_TYPES[gene.type]) {
        newGenes[key] = { type: gene.type, value: mutateGene(gene.type, gene.value, rate, rng) };
      } else {
        newGenes[key] = JSON.parse(JSON.stringify(gene));
      }
    }

    const mutateHash = crypto.createHash('sha256').update(JSON.stringify(newGenes)).digest('hex');
    const newSeed: any = {
      ...parent,
      id: deterministicSeedId(parent.$hash, 'mutate'),
      $name: `${parent.$name} (Mutated)`,
      $lineage: {
        generation: (parent.$lineage?.generation || 0) + 1,
        operation: 'mutate',
        parents: [parent.$hash],
        timestamp: 0,
      },
      $hash: mutateHash,
      $fitness: { overall: Math.min(1.0, Math.max(0.0, (parent.$fitness?.overall || 0.5) + (rng.nextF64() * 0.2 - 0.1))) },
      genes: newGenes,
    };
    // Phase 3: derivations strip parent owner; actor (if authed) becomes new owner.
    delete newSeed.$owner;
    addOwnerIfAuthed(newSeed, req.user);

    seeds.push(newSeed);
    saveSeeds();
    metrics.seedsMutated++;
    log('INFO', 'Seed mutated', { id: newSeed.id, parent: parent.id, rate, owner: newSeed.$owner?.userId ?? null });
    audit('seed.mutate', 'seed', newSeed.id, { parent: parent.id, rate }, req);
    res.json(newSeed);
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // EVOLUTION (deterministic — population of mutants, fitness-ranked)
  // ═══════════════════════════════════════════════════════════════════════════

  app.post('/api/seeds/:id/evolve', optionalAuth, validateBody(EvolveSeedSchema), async (req: any, res: any) => {
    const parent = seeds.find((s: any) => s.id === req.params.id);
    if (!parent) return res.status(404).json({ detail: 'Not found' });

    const popSize = Math.min(req.body.population_size || 4, 20);
    const generations = Math.min(req.body.generations || 1, 10);
    const algorithm = req.body.algorithm || 'ga';
    const results: any[] = [];

    if (algorithm === 'ga' || algorithm === 'map-elites' || algorithm === 'cmaes' || algorithm === 'poet' || algorithm === 'dqd' || algorithm === 'aurora' || algorithm === 'nslc') {
      const { GeneticAlgorithm, MAPElites, CMAES, POET, DQD, AURORA, NSLC } = await import('./src/lib/evolution/index.js');
      const rng = rngFor(parent, `evolve_${algorithm}`);
      const geneKeys = Object.keys(parent.genes || {});

      if (algorithm === 'ga') {
        const ga = new GeneticAlgorithm(rng);
        const gaResult = await ga.evolve([parent], (s) => s.$fitness?.overall || 0.5, {
          populationSize: popSize, generationLimit: generations, mutationRate: 0.2, crossoverRate: 0.7, tournamentSize: 3, elitismCount: 1,
        });
        results.push(...gaResult.population);
      } else if (algorithm === 'map-elites') {
        const me = new MAPElites((s) => geneKeys.map(k => (s.genes as any)?.[k]?.value || 0.5), { gridSize: [5, 5], mutationRate: 0.15, crossoverRate: 0.6 });
        const meResult = me.run([parent], (s) => s.$fitness?.overall || 0.5, generations);
        results.push(...Array.from(meResult.population.values()).map(c => c.seed));
      } else if (algorithm === 'cmaes') {
        const cmaes = new CMAES({ populationSize: popSize, generations, initialSigma: 0.3 });
        const cmaesResult = await cmaes.optimize(parent, (s) => s.$fitness?.overall || 0.5, geneKeys);
        results.push(cmaesResult.best);
      } else if (algorithm === 'dqd') {
        const dqd = new DQD({ populationSize: popSize, generations, mutationRate: 0.15, gradientSteps: 2 });
        const dqdResult = await dqd.run([parent], async (s) => s.$fitness?.overall || 0.5, (s) => geneKeys.slice(0, 2).map(k => (s.genes as any)?.[k]?.value || 0.5));
        results.push(dqdResult.best);
      } else if (algorithm === 'aurora') {
        const aurora = new AURORA({ archiveSize: popSize * 5, generations, mutationRate: 0.2 });
        const auroraResult = await aurora.run([parent], async (s) => s.$fitness?.overall || 0.5, (s) => geneKeys.slice(0, 2).map(k => (s.genes as any)?.[k]?.value || 0.5));
        results.push(...auroraResult.archive.slice(0, popSize).map(a => a.seed));
      } else if (algorithm === 'nslc') {
        const nslc = new NSLC({ archiveSize: popSize * 5, generations, mutationRate: 0.2 });
        const nslcResult = await nslc.run([parent], async (s) => s.$fitness?.overall || 0.5, (s) => geneKeys.slice(0, 2).map(k => (s.genes as any)?.[k]?.value || 0.5));
        results.push(...nslcResult.archive.slice(0, popSize).map(a => a.seed));
      } else {
        const poet = new POET({ maxEnvironments: popSize, generations, mutationRate: 0.2 });
        const poetResult = await poet.run([parent], async (env, sol) => sol.$fitness?.overall || 0.5, (env, r) => {
          const child = JSON.parse(JSON.stringify(env));
          if (child.genes) for (const [, g] of Object.entries(child.genes)) { const ge = g as any; if (typeof ge.value === 'number') ge.value = Math.max(0, Math.min(1, ge.value + (r.nextF64() - 0.5) * 0.2)); }
          return child;
        });
        results.push(...poetResult.environments.slice(0, popSize).map(e => e.solution));
      }
    } else {
      for (let i = 0; i < popSize; i++) {
        const rng = rngFor(parent, `evolve_${i}`);
        const mutationRate = 0.1 + rng.nextF64() * 0.3;
        const newGenes: Record<string, any> = {};
        for (const [key, gene] of Object.entries(parent.genes || {}) as [string, any][]) {
          if (rng.nextF64() < mutationRate && gene.type && GENE_TYPES[gene.type]) {
            newGenes[key] = { type: gene.type, value: mutateGene(gene.type, gene.value, mutationRate, rng) };
          } else {
            newGenes[key] = JSON.parse(JSON.stringify(gene));
          }
        }
        const evolveHash = crypto.createHash('sha256').update(JSON.stringify(newGenes) + i).digest('hex');
        results.push({
          ...parent,
          id: deterministicSeedId(parent.$hash, `evolve-${i}`),
          $name: `${parent.$name} (Evolved ${i + 1})`,
          $lineage: { generation: (parent.$lineage?.generation || 0) + generations, operation: 'evolve', parents: [parent.$hash], timestamp: 0 },
          $hash: evolveHash,
          $fitness: { overall: Math.min(1.0, Math.max(0.0, (parent.$fitness?.overall || 0.5) + (rng.nextF64() * 0.4 - 0.2))) },
          genes: newGenes,
        });
      }
    }

    results.sort((a, b) => (b.$fitness?.overall || 0) - (a.$fitness?.overall || 0));
    for (const seed of results) { seeds.push(seed); }
    saveSeeds();
    metrics.seedsEvolved++;
    log('INFO', 'Seed evolved', { parent: parent.id, population: popSize, generations, algorithm });
    audit('seed.evolve', 'seed', parent.id, { population: popSize, generations, algorithm }, req);
    res.json({ population: results, count: results.length, algorithm });
  });

  app.get('/api/evolution/algorithms', (_req: any, res: any) => {
    res.json({
      algorithms: [
        { id: 'ga', name: 'Genetic Algorithm', description: 'Tournament selection + crossover + mutation + elitism' },
        { id: 'map-elites', name: 'MAP-Elites', description: 'Quality-diversity grid-based population mapping' },
        { id: 'cmaes', name: 'CMA-ES', description: 'Covariance Matrix Adaptation Evolution Strategy' },
        { id: 'poet', name: 'POET', description: 'Paired Open-Ended Trailblazer (co-evolves environments + solutions)' },
        { id: 'dqd', name: 'DQD', description: 'Differentiable Quality Diversity (gradient-based QD)' },
        { id: 'aurora', name: 'AURORA', description: 'Adaptive User-guided Retrieval for Open-Ended Runtime Adaptation' },
        { id: 'nslc', name: 'NSLC', description: 'Novelty Search with Local Competition' },
      ],
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // BREEDING (deterministic — gene-level crossover via kernel)
  // ═══════════════════════════════════════════════════════════════════════════

  app.post('/api/seeds/breed', optionalAuth, validateBody(BreedSeedsSchema), (req: any, res: any) => {
    const parentA = seeds.find((s: any) => s.id === req.body.parent_a_id);
    const parentB = seeds.find((s: any) => s.id === req.body.parent_b_id);
    if (!parentA || !parentB) return res.status(404).json({ detail: 'Parent seed(s) not found' });

    const rng = rngFromHash((parentA.$hash || '') + (parentB.$hash || ''));

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

    const breedHash = crypto.createHash('sha256').update(JSON.stringify(newGenes)).digest('hex');
    const newSeed: any = {
      ...parentA,
      id: deterministicSeedId(parentA.$hash, 'breed'),
      $domain: parentA.$domain,
      $name: `${parentA.$name} × ${parentB.$name}`,
      $lineage: {
        generation: Math.max(parentA.$lineage?.generation || 0, parentB.$lineage?.generation || 0) + 1,
        operation: 'breed',
        parents: [parentA.$hash, parentB.$hash],
        parent_ids: [parentA.id, parentB.id],
        ancestry_depth: Math.max(
          parentA.$lineage?.ancestry_depth || 0,
          parentB.$lineage?.ancestry_depth || 0
        ) + 1,
        timestamp: 0,
      },
      $hash: breedHash,
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

  app.put('/api/seeds/:id/genes', optionalAuth, validateBody(EditGeneSchema), (req: any, res: any) => {
    const seed = seeds.find((s: any) => s.id === req.params.id);
    if (!seed) return res.status(404).json({ detail: 'Not found' });
    // Phase 3: editing genes on an owned seed requires ownership (in-place mutation).
    if (!authorizeSeedMutation(seed, req, res, 'seed.edit_genes', audit)) return;

    const { gene_name, gene_type, value } = req.body;

    // Validate if it's a known type
    if (GENE_TYPES[gene_type]) {
      const result = validateGeneWithDetails(gene_type, value);
      if (!result.valid) {
        return res.status(400).json({
          error: 'Invalid gene value',
          message: result.errors.join('. '),
          details: result.errors,
          suggestion: result.suggestion,
          docs: '/api/docs#genes'
        });
      }
    }

    if (!seed.genes) seed.genes = {};
    seed.genes[gene_name] = { type: gene_type, value };
    seed.$lineage = { 
      generation: (seed.$lineage?.generation || 0) + 1, 
      operation: 'mutate_gene',
      timestamp: 0
    };
    seed.$hash = crypto.createHash('sha256').update(JSON.stringify(seed.genes)).digest('hex');

    saveSeeds();
    res.json(seed);
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // LINEAGE TRACKING
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Get full lineage/ancestry chain for a seed
   * GET /api/seeds/:id/lineage
   */
  app.get('/api/seeds/:id/lineage', async (req: any, res: any) => {
    const seed = seeds.find((s: any) => s.id === req.params.id);
    if (!seed) {
      return res.status(404).json({
        error: 'Seed not found',
        message: `No seed found with ID '${req.params.id}'`,
        suggestion: 'Check the seed ID and try again',
        example: { id: '53a6edaf-9a76-46ea-845b-ae283e8ad21c' },
        docs: '/api/docs#lineage'
      });
    }

    const lineage: any[] = [];
    const visited = new Set<string>();
    const queue = [{ seed, depth: 0 }];

    while (queue.length > 0 && queue.length < 100) { // Limit depth to prevent infinite loops
      const { seed: current, depth } = queue.shift()!;
      
      if (visited.has(current.$hash)) continue;
      visited.add(current.$hash);

      lineage.push({
        id: current.id,
        hash: current.$hash,
        name: current.$name,
        domain: current.$domain,
        generation: current.$lineage?.generation || 0,
        operation: current.$lineage?.operation || 'primordial',
        parents: current.$lineage?.parents || [],
        parent_ids: current.$lineage?.parent_ids || [],
        depth
      });

      // Find parents
      const parentHashes = current.$lineage?.parents || [];
      for (const parentHash of parentHashes) {
        const parent = seeds.find((s: any) => s.$hash === parentHash);
        if (parent && !visited.has(parent.$hash)) {
          queue.push({ seed: parent, depth: depth + 1 });
        }
      }
    }

    // Sort by depth (ancestors first)
    lineage.sort((a, b) => a.depth - b.depth);

    res.json({
      seed_id: req.params.id,
      seed_hash: seed.$hash,
      lineage,
      total_ancestors: lineage.length - 1,
      max_depth: Math.max(...lineage.map(l => l.depth)),
      docs: '/api/docs#lineage'
    });
  });

  /**
   * Get descendants of a seed
   * GET /api/seeds/:id/descendants
   */
  app.get('/api/seeds/:id/descendants', async (req: any, res: any) => {
    const seed = seeds.find((s: any) => s.id === req.params.id);
    if (!seed) {
      return res.status(404).json({
        error: 'Seed not found',
        message: `No seed found with ID '${req.params.id}'`,
        suggestion: 'Check the seed ID and try again',
        docs: '/api/docs#descendants'
      });
    }

    const descendants: any[] = [];
    const visited = new Set<string>();

    // Find all seeds that have this seed as an ancestor
    for (const s of seeds) {
      if (s.id === seed.id) continue;
      
      const parents = s.$lineage?.parents || [];
      if (parents.includes(seed.$hash)) {
        descendants.push({
          id: s.id,
          hash: s.$hash,
          name: s.$name,
          domain: s.$domain,
          generation: s.$lineage?.generation || 0,
          operation: s.$lineage?.operation || 'unknown',
          relationship: 'child'
        });
        visited.add(s.$hash);
      }
    }

    // Limit to first 100 descendants
    const limited = descendants.slice(0, 100);

    res.json({
      seed_id: req.params.id,
      seed_hash: seed.$hash,
      descendants: limited,
      total_descendants: descendants.length,
      limited: descendants.length > 100,
      docs: '/api/docs#descendants'
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // GROW (domain engine execution — deterministic)
  // ═══════════════════════════════════════════════════════════════════════════

  app.post('/api/seeds/:id/grow', optionalAuth, validateBody(GrowSeedSchema), async (req: any, res: any) => {
    const seed = seeds.find((s: any) => s.id === req.params.id);
    if (!seed) {
      return res.status(404).json({
        error: 'Seed not found',
        message: `No seed found with ID '${req.params.id}'`,
        suggestion: 'Check the seed ID and try again',
        example: { id: '53a6edaf-9a76-46ea-845b-ae283e8ad21c' },
        docs: '/api/docs#seeds'
      });
    }

    // Check if domain is supported - use dynamic list from kernel
    const supportedDomains = getAllDomains();
    
    // Domain alias mapping for backward compatibility
    const DOMAIN_ALIASES: Record<string, string> = {
      '2d': 'visual2d', 'visual-2d': 'visual2d', 'visual_2d': 'visual2d', '2dvisual': 'visual2d',
      '3d': 'geometry3d', 'geometry-3d': 'geometry3d', 'geometry_3d': 'geometry3d', '3dgeometry': 'geometry3d',
      'full-game': 'fullgame', 'full_game': 'fullgame', 'full game': 'fullgame',
      'anims': 'animation', 'animations': 'animation', 'animate': 'animation',
      'narratives': 'narrative', 'story': 'narrative', 'stories': 'narrative',
      'sound': 'audio', 'sfx': 'audio',
      'ecosystems': 'ecosystem', 'eco': 'ecosystem',
      'shaders': 'shader', 'glsl': 'shader',
      'particles': 'particle', 'vfx': 'particle',
      'typo': 'typography', 'type': 'typography', 'fonts': 'typography',
      'arch': 'architecture', 'buildings': 'architecture',
      'robot': 'robotics', 'robots': 'robotics',
      'car': 'vehicle', 'cars': 'vehicle',
      'furnitures': 'furniture',
      'fashions': 'fashion', 'cloth': 'fashion', 'clothing': 'fashion',
      'circuits': 'circuit', 'electronics': 'circuit',
      'dance': 'choreography',
      'agents': 'agent', 'npc': 'agent',
      'recipes': 'food', 'recipe': 'food',
      'procgen': 'procedural', 'noise': 'procedural',
      'artificial_life': 'alife',
      'user_interface': 'ui', 'interface': 'ui',
      'algorithm': 'procedural', 'algorithms': 'procedural',
      'biology': 'ecosystem', 'biochemistry': 'ecosystem',
      'engineering': 'physics',
      'data': 'procedural', 'analytics': 'procedural',
      'camera': 'visual2d', 'photography': 'visual2d',
      'creature': 'character', 'monster': 'character', 'beast': 'character',
      'scene': 'visual2d', 'environment': 'procedural',
      'weather': 'procedural', 'climate': 'procedural',
      'lighting': 'shader', 'illumination': 'shader',
      'materials': 'procedural',
      'plant': 'ecosystem', 'plants': 'ecosystem', 'flora': 'ecosystem',
      'field': 'physics', 'force': 'physics',
      'style': 'visual2d', 'styling': 'visual2d', 'theme': 'visual2d',
      'framework': 'agent', 'system': 'agent',
      'cross-domain': 'agent', 'multidomain': 'agent', 'hybrid': 'agent',
      'fluid': 'physics', 'liquid': 'physics', 'gas': 'physics',
      'element': 'alife', 'elements': 'alife',
      'abstract': 'visual2d', 'generative': 'procedural',
    };

    // Helper: find closest domain match with alias support
    function findClosestDomain(input: string, candidates: string[]): string | null {
      if (!input) return null;
      const lower = input.toLowerCase().trim();
      if (candidates.includes(lower)) return lower;
      if (DOMAIN_ALIASES[lower]) return DOMAIN_ALIASES[lower];
      for (const c of candidates) {
        if (c.includes(lower) || lower.includes(c)) return c;
      }
      for (const [alias, canonical] of Object.entries(DOMAIN_ALIASES)) {
        if (candidates.includes(canonical) && (alias.includes(lower) || lower.includes(alias))) return canonical;
      }
      return null;
    }

    if (!seed.$domain || !supportedDomains.includes(seed.$domain)) {
      const closest = findClosestDomain(seed.$domain || '', supportedDomains);
      if (closest && supportedDomains.includes(closest)) {
        // Auto-fix: remap the seed's domain to the closest match
        const oldDomain = seed.$domain;
        seed.$domain = closest;
        log('INFO', `Auto-fixed domain "${oldDomain}" → "${closest}" for seed ${seed.id}`);
      } else {
        return res.status(400).json({
          error: 'Unsupported domain',
          message: `Domain '${seed.$domain}' is not supported for growth`,
          supported_domains: supportedDomains,
          suggestion: closest 
            ? `Did you mean '${closest}'?`
            : `Use a seed with one of these domains: ${supportedDomains.slice(0, 5).join(', ')}...`,
          example: { domain: 'character' },
          docs: '/api/docs#domains'
        });
      }
    }

    try {
      // Check cache first
      const cacheKey = growCacheKey(seed.$hash, seed.$domain);
      const cached = await cache.get(cacheKey);
      if (cached) {
        log('INFO', 'Seed grown (cached)', { id: seed.id, domain: seed.$domain });
        return res.json(JSON.parse(cached));
      }

      const grown = await growSeed(seed);

      // Cache the result (5 min TTL)
      await cache.set(cacheKey, JSON.stringify(grown), 300);

      log('INFO', 'Seed grown', { id: seed.id, domain: seed.$domain });
      res.json(grown);
    } catch (e: any) {
      log('ERROR', 'Grow failed', { id: seed.id, error: e.message });
      
      // Provide helpful error based on the exception
      let errorMessage = 'Failed to grow seed';
      let suggestion = 'Try again or contact support if the issue persists';
      
      if (e.message.includes('document is not defined')) {
        errorMessage = 'Server configuration error - browser APIs not available';
        suggestion = 'This is a server configuration issue. Please contact support.';
      } else if (e.message.includes('generator')) {
        errorMessage = `Domain generator error for '${seed.$domain}'`;
        suggestion = `The ${seed.$domain} generator encountered an issue. Try a different seed.`;
      }
      
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
        error: {
          message: errorMessage,
          suggestion,
          originalError: e.message
        }
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

    const pathResult = findCompositionPath(source, target);
    if (!pathResult) return res.status(404).json({ detail: 'No composition path found' });

    // Format for frontend compatibility: [[src, functor, tgt], ...]
    const formatted = pathResult.bridges.map(name => [source, name, target]);
    const result = { path: formatted, cost: pathResult.bridges.length, coherence: pathResult.totalCoherence };

    // Cache for 1 hour (paths never change at runtime)
    await cache.set(cacheKey, JSON.stringify(result), 3600);

    res.json(result);
  });

  app.post('/api/seeds/:id/compose', optionalAuth, validateBody(ComposeSeedSchema), (req: any, res: any) => {
    const parent = seeds.find((s: any) => s.id === req.params.id);
    if (!parent) return res.status(404).json({ detail: 'Not found' });

    const targetDomain = req.body.target_domain;

    const composed = composeSeed(parent, targetDomain);
    if (!composed) {
      return res.status(400).json({ detail: `No composition path from ${parent.$domain} to ${targetDomain}` });
    }

    // Assign a fresh ID and persist
    (composed as any).id = crypto.randomUUID();
    seeds.push(composed as any);
    saveSeeds();

    // Also return the path for UI visualization
    const pathResult = findCompositionPath(parent.$domain || '', targetDomain);
    const pathFormatted = pathResult
      ? { path: pathResult.bridges.map(name => [parent.$domain, name, targetDomain]), cost: pathResult.bridges.length, coherence: pathResult.totalCoherence }
      : { path: [[parent.$domain, 'direct', targetDomain]], cost: 1 };

    metrics.seedsComposed++;
    log('INFO', 'Seed composed', { id: composed.id, from: parent.$domain, to: targetDomain });
    audit('seed.compose', 'seed', composed.id, { from: parent.$domain, to: targetDomain }, req);
    res.json({ seed: composed, path: pathFormatted });
  });

  // ─── Phase 9 — Cross-domain multi-source composition ────────────────────
  // Fuse N seeds from N different domains into one target-domain seed.
  // Body: { seed_ids: string[], target_domain: string, strategy?, weights?, strict?, name?, persist? }
  app.post('/api/seeds/compose/cross-domain', optionalAuth, async (req: any, res: any) => {
    try {
      const { seed_ids, target_domain, strategy, weights, strict, name, persist } = req.body ?? {};
      if (!Array.isArray(seed_ids) || seed_ids.length === 0) {
        return res.status(400).json({ detail: 'seed_ids must be a non-empty array' });
      }
      if (!target_domain || typeof target_domain !== 'string') {
        return res.status(400).json({ detail: 'target_domain required' });
      }

      const inputs: any[] = [];
      const missing: string[] = [];
      for (const id of seed_ids) {
        const seed = seeds.find((s: any) => s.id === id);
        if (!seed) missing.push(id);
        else inputs.push(seed);
      }
      if (missing.length > 0) {
        return res.status(404).json({ detail: 'Unknown seed ids', missing });
      }

      const { composeMultiDomain, planMultiDomainComposition } = await import('./src/lib/composition/cross_domain.js');
      const plan = planMultiDomainComposition(inputs, target_domain);
      const result = composeMultiDomain(inputs, target_domain, {
        strategy,
        weights: Array.isArray(weights) ? weights : undefined,
        strict: Boolean(strict),
        name,
      });

      const out: any = result.seed;
      if (persist) {
        out.id = crypto.randomUUID();
        seeds.push(out);
        saveSeeds();
        metrics.seedsComposed++;
        audit('seed.compose.cross_domain', 'seed', out.id, { strategy, target_domain, sources: seed_ids }, req);
      }

      log('INFO', 'Cross-domain compose', { strategy, target_domain, used: result.contributions.filter(c => c.reachable).length });
      res.json({
        seed: out,
        plan,
        contributions: result.contributions,
        resolutions: result.resolutions,
      });
    } catch (err: any) {
      const msg = err?.message ?? String(err);
      const status = /cannot reach|no input seed/i.test(msg) ? 422 : 400;
      res.status(status).json({ detail: msg });
    }
  });

  // Pre-flight: which inputs reach the target, what paths they'd take.
  app.post('/api/seeds/compose/cross-domain/plan', optionalAuth, async (req: any, res: any) => {
    try {
      const { seed_ids, target_domain } = req.body ?? {};
      if (!Array.isArray(seed_ids) || seed_ids.length === 0) {
        return res.status(400).json({ detail: 'seed_ids must be a non-empty array' });
      }
      if (!target_domain || typeof target_domain !== 'string') {
        return res.status(400).json({ detail: 'target_domain required' });
      }
      const inputs = seed_ids.map((id: string) => seeds.find((s: any) => s.id === id)).filter((seed: any): seed is any => Boolean(seed));
      if (inputs.length !== seed_ids.length) {
        return res.status(404).json({ detail: 'Unknown seed ids' });
      }
      const { planMultiDomainComposition } = await import('./src/lib/composition/cross_domain.js');
      res.json(planMultiDomainComposition(inputs, target_domain));
    } catch (err: any) {
      res.status(400).json({ detail: err?.message ?? String(err) });
    }
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // GSPL PARSER & EXECUTOR
  // ═══════════════════════════════════════════════════════════════════════════

  app.post('/api/v1/agent/execute_gspl', optionalAuth, validateBody(GsplExecuteSchema), (req: any, res: any) => {
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

      const rng = rngFromHash(name + domain);
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

  app.post('/api/gspl/execute', optionalAuth, validateBody(GsplExecuteSchema), (req: any, res: any) => {
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
    const all = geneTypeRegistry.getAll();
    res.json({
      types: all.map(t => ({ name: t.name, parent: t.parent, category: t.category, description: t.description })),
      count: all.length,
      can_register: true,
      example: GSPL_GENE_TYPE_EXAMPLE,
    });
  });

  app.post('/api/gene-types/register', optionalAuth, validateBody(RegisterGeneTypeSchema), (req: any, res: any) => {
    const { name, base_type, description, constraints, validate, mutate, crossover, distance } = req.body;

    const result = registerGSPLGeneType({
      name, baseType: base_type, description, constraints,
      validate, mutate, crossover, distance,
    });

    if (!result.success) {
      return res.status(400).json({ error: 'Gene type registration failed', errors: result.errors });
    }

    log('INFO', `Gene type registered: ${result.name}`, { user: req.user?.username });
    audit('gene_type.register', 'gene_type', result.name, { base_type }, req);
    res.json({ success: true, name: result.name, message: `Gene type "${result.name}" registered` });
  });

  /**
   * Validate a gene value
   * POST /api/gene/validate
   * Body: { gene_type: string, value: any, schema?: GeneSchema }
   */
  app.post('/api/gene/validate', (req: any, res: any) => {
    const { gene_type, value, schema } = req.body;
    
    if (!gene_type) {
      return res.status(400).json({
        error: 'Missing gene_type',
        message: 'The gene_type field is required',
        suggestion: 'Provide a valid gene type: scalar, categorical, vector, etc.',
        example: { gene_type: 'scalar', value: 0.5 },
        docs: '/api/docs#genes'
      });
    }
    
    const result = validateGeneWithDetails(gene_type, value, schema);
    
    if (result.valid) {
      res.json({
        valid: true,
        message: 'Gene value is valid',
        gene_type,
        value_type: typeof value,
        docs: '/api/docs#genes'
      });
    } else {
      res.status(400).json({
        valid: false,
        error: 'Gene validation failed',
        message: result.errors.join('. '),
        details: result.errors,
        suggestion: result.suggestion,
        example: getGeneExample(gene_type),
        docs: '/api/docs#genes'
      });
    }
  });

  /**
   * Get example value for a gene type
   */
  function getGeneExample(geneType: string): any {
    const examples: Record<string, any> = {
      scalar: { gene_type: 'scalar', value: 0.75, schema: { min: 0, max: 1 } },
      categorical: { gene_type: 'categorical', value: 'warrior', schema: { choices: ['warrior', 'mage', 'rogue'] } },
      vector: { gene_type: 'vector', value: [0.5, 0.3, 0.9], schema: { dimensions: 3 } },
      expression: { gene_type: 'expression', value: 'sin(x * PI) / 2' },
      struct: { gene_type: 'struct', value: { head: 0.5, torso: 0.8, limbs: 0.6 } },
      array: { gene_type: 'array', value: [1, 2, 3, 4, 5] },
      graph: { gene_type: 'graph', value: { nodes: [{id: 1}, {id: 2}], edges: [{from: 1, to: 2}] } },
      topology: { gene_type: 'topology', value: { vertices: [[0,0,0], [1,0,0]], faces: [[0,1,2]] } },
      temporal: { gene_type: 'temporal', value: { keyframes: [{time: 0, value: 0}, {time: 1, value: 1}] } },
      regulatory: { gene_type: 'regulatory', value: { activation_threshold: 0.5, inhibition_strength: 0.3 } },
      field: { gene_type: 'field', value: { resolution: 32, values: new Array(32).fill(0.5) } },
      symbolic: { gene_type: 'symbolic', value: { grammar: 'S -> NP VP', symbols: ['S', 'NP', 'VP'] } },
      quantum: { gene_type: 'quantum', value: { superposition: [0.7, 0.3], basis: ['A', 'B'] } },
      gematria: { gene_type: 'gematria', value: { word: 'PARADIGM', value: 123 } },
      resonance: { gene_type: 'resonance', value: { frequencies: [440, 880, 1760], amplitudes: [1, 0.5, 0.25] } },
      dimensional: { gene_type: 'dimensional', value: [0.1, 0.2, 0.3, 0.4, 0.5] },
      sovereignty: { gene_type: 'sovereignty', value: { author_pubkey: '0x...', timestamp: 0 } }
    };
    return examples[geneType] || { gene_type: 'scalar', value: 0.5 };
  }

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

  app.post('/api/qft/simulate', optionalAuth, validateBody(QftSimulateSchema), async (req: any, res: any) => {
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

  app.post('/api/pipeline/execute', optionalAuth, validateBody(PipelineExecuteSchema), async (req: any, res: any) => {
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

  app.post('/api/seeds/:id/sign', optionalAuth, validateBody(SignSeedSchema), (req: any, res: any) => {
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

  // Embeds via the self-hosted SBERT sidecar when SBERT_URL is set, then
  // persists the vector to pgvector. If either dep is unavailable we fall
  // back to the legacy Gemini path so dev/test envs keep working.
  app.post('/api/seeds/:id/embed', optionalAuth, validateBody(EmbedSeedSchema), async (req: any, res: any) => {
    try {
      const seedIndex = seeds.findIndex((s: any) => s.id === req.params.id);
      if (seedIndex === -1) return res.status(404).json({ detail: 'Seed not found' });

      const seed = seeds[seedIndex];
      const sbertUrl = process.env.SBERT_URL;
      const databaseUrl = process.env.DATABASE_URL;

      let embedding: number[];
      let source: 'sbert' | 'gemini' = 'gemini';
      if (sbertUrl) {
        // Self-hosted path (D-5): deterministic render + SBERT + optional pgvector upsert.
        const { embedSeed } = await import('./src/lib/intelligence/embedding-client.js');
        embedding = await embedSeed(seed);
        source = 'sbert';

        if (databaseUrl) {
          try {
            const { upsertEmbedding } = await import('./src/lib/intelligence/pgvector.js');
            await upsertEmbedding({
              seed_hash: seed.$hash,
              seed_id: seed.id,
              domain: seed.$domain,
              name: seed.$name ?? null,
              embedding,
            });
          } catch (e: any) {
            // Non-fatal: we still return the vector so the client can use it
            // in-process. Similarity search will just fall back to gene distance.
            log('WARN', 'pgvector upsert failed; vector returned without persistence', { error: e.message });
          }
        }
      } else {
        embedding = await IntelligenceLayer.generateEmbedding(seed);
      }

      seeds[seedIndex] = { ...seed, $embedding: embedding };
      saveSeeds();

      res.json({ success: true, dimensions: embedding.length, source });
    } catch (e: any) {
      log('WARN', 'Embedding generation failed', { error: e.message });
      res.status(500).json({ detail: e.message || 'Embedding generation failed' });
    }
  });

  app.get('/api/seeds/:id/similar', async (req: any, res: any) => {
    try {
      const limit = parseInt(req.query.limit as string) || 5;
      const targetSeed = seeds.find((s: any) => s.id === req.params.id);
      if (!targetSeed) return res.status(404).json({ detail: 'Seed not found' });

      // Prefer pgvector ANN when SBERT + DATABASE_URL are both configured.
      // Requires the target seed's embedding already exist in the table;
      // if it doesn't, we embed-on-read so a first-time /similar call still
      // works instead of silently falling back.
      if (process.env.SBERT_URL && process.env.DATABASE_URL) {
        try {
          const { embedSeed } = await import('./src/lib/intelligence/embedding-client.js');
          const { findSimilar, upsertEmbedding } = await import('./src/lib/intelligence/pgvector.js');
          let vector: number[];
          if (Array.isArray(targetSeed.$embedding) && targetSeed.$embedding.length > 0) {
            vector = targetSeed.$embedding;
          } else {
            vector = await embedSeed(targetSeed);
            // Opportunistic: store it so future queries hit pgvector directly.
            upsertEmbedding({
              seed_hash: targetSeed.$hash,
              seed_id: targetSeed.id,
              domain: targetSeed.$domain,
              name: targetSeed.$name ?? null,
              embedding: vector,
            }).catch((e) => log('WARN', 'pgvector opportunistic upsert failed', { error: e.message }));
          }
          const hits = await findSimilar({
            vector,
            limit,
            excludeHash: targetSeed.$hash,
          });
          // Return full seed objects so the response shape matches the legacy path.
          // Missing seeds (DB has embedding but in-memory cache doesn't) are skipped.
          const byHash = new Map(seeds.map((s: any) => [s.$hash, s]));
          const result = hits
            .map((h) => {
              const s = byHash.get(h.seed_hash);
              return s ? { ...s, _distance: h.distance } : null;
            })
            .filter((x) => x !== null);
          return res.json(result);
        } catch (e: any) {
          log('WARN', 'pgvector similarity failed; falling back to gene distance', { error: e.message });
          // fall through to legacy path
        }
      }

      // Legacy fallback: gene-space distance. Preserved so tests without
      // external deps still succeed.
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
      res.json(distances.slice(0, limit).map(d => ({ ...d.seed, _distance: d.distance })));
    } catch (e: any) {
      res.status(500).json({ detail: e.message || 'Similarity search failed' });
    }
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // VERSION CONTROL (git-for-seeds)
  // Every seed has a content-addressable history. `main` is auto-created
  // on the first commit. See src/lib/vcs/ for the object model.
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Snapshot the current state of a seed onto a branch. Body:
   *   { branch?: string = 'main', message: string, author?: string }
   *
   * If the branch doesn't exist this is the first commit on it; parents[] is
   * empty. If it does, we parent onto its tip. Same-content commits on the
   * same message produce the same commit hash (content-addressable) — this
   * is a feature, not a bug: retries are idempotent.
   */
  app.post('/api/seeds/:id/commit', optionalAuth, async (req: any, res: any) => {
    try {
      const seed = seeds.find((s: any) => s.id === req.params.id);
      if (!seed) return res.status(404).json({ detail: 'Seed not found' });
      // Phase 3: only owner/admin may commit to an owned seed's history.
      if (!authorizeSeedMutation(seed, req, res, 'vcs.commit', audit)) return;

      const branchName = typeof req.body?.branch === 'string' && req.body.branch.length
        ? req.body.branch
        : 'main';
      const message = typeof req.body?.message === 'string' ? req.body.message : '';
      // Phase 3: author is bound to the authenticated user when present,
      // and req.body.author must match (or be omitted). Forging is rejected.
      const author = resolveCommitAuthor(req, res, req.body?.author);
      if (author === null) return; // response already sent

      const result = await vcsCommit(vcsObjects, vcsRefs, {
        seed,
        branch: branchName,
        author,
        message,
      });

      audit('vcs.commit', 'seed', seed.id, { branch: branchName, commit: result.commit }, req);
      res.json({
        commit: result.commit,
        tree: result.tree,
        branch: branchName,
        treeChanged: result.treeChanged,
      });
    } catch (e: any) {
      log('WARN', 'VCS commit failed', { error: e.message });
      res.status(500).json({ detail: e.message || 'Commit failed' });
    }
  });

  /** List refs (branches/tags) for a seed. */
  app.get('/api/seeds/:id/refs', async (req: any, res: any) => {
    try {
      const seed = seeds.find((s: any) => s.id === req.params.id);
      if (!seed) return res.status(404).json({ detail: 'Seed not found' });
      const refs = await vcsRefs.listRefs(seed.id);
      const head = await vcsRefs.getHead(seed.id);
      res.json({ refs, head });
    } catch (e: any) {
      res.status(500).json({ detail: e.message || 'Ref list failed' });
    }
  });

  /**
   * Walk first-parent history from a given commit (or from the tip of ?branch=).
   * Query: branch=main (default), from=<commit>, limit=50
   */
  app.get('/api/seeds/:id/log', async (req: any, res: any) => {
    try {
      const seed = seeds.find((s: any) => s.id === req.params.id);
      if (!seed) return res.status(404).json({ detail: 'Seed not found' });

      let from = typeof req.query.from === 'string' ? req.query.from : null;
      if (!from) {
        const branchName = typeof req.query.branch === 'string' && req.query.branch.length
          ? req.query.branch
          : 'main';
        const ref = await vcsRefs.getRef(seed.id, branchName);
        if (!ref) return res.json({ entries: [] });
        from = ref.commit;
      }
      const limit = Math.max(1, Math.min(500, parseInt(req.query.limit as string) || 50));
      const entries = await vcsLog(vcsObjects, from, limit);
      res.json({ entries });
    } catch (e: any) {
      res.status(500).json({ detail: e.message || 'Log failed' });
    }
  });

  /**
   * Create a new branch from an existing commit or from another branch's tip.
   * Body: { name: string, from?: string | { branch: string } }
   * Default: branch off the current HEAD's tip.
   */
  app.post('/api/seeds/:id/branches', optionalAuth, async (req: any, res: any) => {
    try {
      const seed = seeds.find((s: any) => s.id === req.params.id);
      if (!seed) return res.status(404).json({ detail: 'Seed not found' });
      if (!authorizeSeedMutation(seed, req, res, 'vcs.branch', audit)) return;
      const name = typeof req.body?.name === 'string' ? req.body.name : '';
      if (!name.length) return res.status(400).json({ detail: 'name is required' });

      // Resolve `from` → commit hash
      let fromCommit: string | null = null;
      const fromField = req.body?.from;
      if (typeof fromField === 'string' && fromField.length) {
        fromCommit = fromField;
      } else if (fromField && typeof fromField === 'object' && typeof fromField.branch === 'string') {
        const srcRef = await vcsRefs.getRef(seed.id, fromField.branch);
        if (!srcRef) return res.status(404).json({ detail: `source branch ${fromField.branch} not found` });
        fromCommit = srcRef.commit;
      } else {
        // Default: use current HEAD's ref
        const head = await vcsRefs.getHead(seed.id);
        if (!head) return res.status(400).json({ detail: 'no HEAD set; specify `from`' });
        const headRef = await vcsRefs.getRef(seed.id, head);
        if (!headRef) return res.status(400).json({ detail: 'HEAD points to missing ref' });
        fromCommit = headRef.commit;
      }

      await vcsBranch(vcsRefs, seed.id, name, fromCommit);
      audit('vcs.branch', 'seed', seed.id, { name, from: fromCommit }, req);
      res.json({ name, commit: fromCommit });
    } catch (e: any) {
      res.status(400).json({ detail: e.message || 'Branch failed' });
    }
  });

  app.post('/api/seeds/:id/checkout', optionalAuth, async (req: any, res: any) => {
    try {
      const seed = seeds.find((s: any) => s.id === req.params.id);
      if (!seed) return res.status(404).json({ detail: 'Seed not found' });
      if (!authorizeSeedMutation(seed, req, res, 'vcs.checkout', audit)) return;
      const name = typeof req.body?.branch === 'string' ? req.body.branch : '';
      if (!name) return res.status(400).json({ detail: 'branch is required' });
      await vcsCheckout(vcsRefs, seed.id, name);
      audit('vcs.checkout', 'seed', seed.id, { branch: name }, req);
      res.json({ head: name });
    } catch (e: any) {
      res.status(400).json({ detail: e.message || 'Checkout failed' });
    }
  });

  /**
   * Diff two commits (or a commit against current seed state via ?head=seed).
   * Query: a=<commit>, b=<commit> | a=<commit>&b=seed
   */
  app.get('/api/seeds/:id/diff', async (req: any, res: any) => {
    try {
      const seed = seeds.find((s: any) => s.id === req.params.id);
      if (!seed) return res.status(404).json({ detail: 'Seed not found' });
      const a = typeof req.query.a === 'string' ? req.query.a : '';
      const b = typeof req.query.b === 'string' ? req.query.b : '';
      if (!a || !b) return res.status(400).json({ detail: 'a and b query params required' });

      const resolveTree = async (ref: string) => {
        if (ref === 'seed') {
          // Diff against current working state (uncommitted)
          const { treeFromSeed } = await import('./src/lib/vcs/index.js');
          return treeFromSeed(seed);
        }
        const c = await vcsObjects.getCommit(ref);
        if (!c) throw new Error(`commit not found: ${ref}`);
        const t = await vcsObjects.getTree(c.tree);
        if (!t) throw new Error(`tree not found for commit ${ref}`);
        return t;
      };
      const [ta, tb] = await Promise.all([resolveTree(a), resolveTree(b)]);
      const diff = diffTrees(ta, tb);
      res.json(diff);
    } catch (e: any) {
      res.status(400).json({ detail: e.message || 'Diff failed' });
    }
  });

  /**
   * Three-way merge two commits (`ours`, `theirs`) for this seed.
   * Body: { ours: <commit>, theirs: <commit>, target?: <branch>, message?, author? }
   *
   * If the merge is clean AND `target` is provided, we write a merge commit
   * to that branch. If clean but no target, we return the merged tree hash
   * without committing (preview).
   * If conflicts, we return 409 with the conflict list and no new state.
   */
  app.post('/api/seeds/:id/merge', optionalAuth, async (req: any, res: any) => {
    try {
      const seed = seeds.find((s: any) => s.id === req.params.id);
      if (!seed) return res.status(404).json({ detail: 'Seed not found' });
      if (!authorizeSeedMutation(seed, req, res, 'vcs.merge', audit)) return;
      const ours = typeof req.body?.ours === 'string' ? req.body.ours : '';
      const theirs = typeof req.body?.theirs === 'string' ? req.body.theirs : '';
      if (!ours || !theirs) return res.status(400).json({ detail: 'ours and theirs required' });

      const result = await mergeCommits(vcsObjects, { seed_id: seed.id, ours, theirs });

      if (!result.clean) {
        return res.status(409).json({
          conflicts: result.conflicts,
          base: result.base,
        });
      }

      const target = typeof req.body?.target === 'string' ? req.body.target : null;
      if (!target) {
        // Preview only — return the merged tree hash so the client can inspect.
        return res.json({
          clean: true,
          tree: result.treeHash,
          base: result.base,
          committed: false,
        });
      }

      // Write a merge commit with two parents on the target branch.
      const author = resolveCommitAuthor(req, res, req.body?.author);
      if (author === null) return;
      const message = typeof req.body?.message === 'string' ? req.body.message : `Merge ${theirs.slice(0, 8)} into ${ours.slice(0, 8)}`;
      // For the commit, we need a seed-shaped input. Rehydrate from the merged tree:
      const mergedTree = result.tree!;
      const pseudoSeed = {
        id: seed.id,
        $domain: mergedTree.domain,
        $name: mergedTree.name,
        genes: mergedTree.genes,
        $lineage: { generation: (seed.$lineage?.generation ?? 0) + 1, operation: 'merge' },
      };
      // Set primary parent to ours, secondary to theirs, via extraParents on a
      // branch that currently points at `ours`. We do that by forcing the ref
      // to `ours` first (if not already), then committing with extraParents=[theirs].
      await vcsEnsureRef(vcsRefs, seed.id, target, ours);
      // If the branch already existed and pointed elsewhere, move it to `ours`
      // so our commit parents[0] === ours.
      const currentRef = await vcsRefs.getRef(seed.id, target);
      if (currentRef && currentRef.commit !== ours) {
        await vcsRefs.setRef(seed.id, target, ours);
      }
      const committed = await vcsCommit(vcsObjects, vcsRefs, {
        seed: pseudoSeed,
        branch: target,
        author,
        message,
        extraParents: [theirs],
      });
      audit('vcs.merge', 'seed', seed.id, { ours, theirs, target, commit: committed.commit }, req);
      res.json({
        clean: true,
        tree: committed.tree,
        commit: committed.commit,
        base: result.base,
        committed: true,
        branch: target,
      });
    } catch (e: any) {
      log('WARN', 'VCS merge failed', { error: e.message });
      res.status(500).json({ detail: e.message || 'Merge failed' });
    }
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // LIBRARY
  // ═══════════════════════════════════════════════════════════════════════════

  app.get('/api/library', (_req, res) => {
    res.json({ seeds, stats: { total_seeds: seeds.length } });
  });

  app.post('/api/library/import', optionalAuth, validateBody(LibraryImportSchema), (req: any, res: any) => {
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

  app.post('/api/seeds/:id/mint', optionalAuth, validateBody(MintSeedSchema), async (req: any, res: any) => {
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

  // ═══════════════════════════════════════════════════════════════════════════
  // SOVEREIGNTY PREVIEW / DRY-RUN (Phase 7)
  //
  // Canonical digest → sign → pin → (dry) anchor flow without any on-chain
  // broadcast. Returns exactly what would be signed, pinned, and anchored
  // on Base L2 so the UI can show a preview the user can inspect before
  // spending gas. Safe to call from unauthenticated clients: the only
  // mutation is to the local pin directory (which is itself ephemeral in
  // dev, and ignored in CI).
  // ═══════════════════════════════════════════════════════════════════════════

  // Lazy-constructed so tests / dev environments without a writable
  // `.paradigm/pins` dir don't crash on server boot.
  let _sovereigntyPin: LocalFilePin | null = null;
  let _sovereigntyAnchor: LocalDryRunAnchor | null = null;
  const getSovereigntyPin = () => (_sovereigntyPin ??= new LocalFilePin());
  const getSovereigntyAnchor = () => (_sovereigntyAnchor ??= new LocalDryRunAnchor());

  app.get('/api/seeds/:id/sovereignty/canonical', (req: any, res: any) => {
    const seed = seeds.find((s: any) => s.id === req.params.id);
    if (!seed) return res.status(404).json({ detail: 'Seed not found' });
    const { canonicalJson, digest, stripped } = canonicalizeSeed(seed);
    res.json({
      seed_id: seed.id,
      canonical_json: canonicalJson,
      digest_hex: digest,
      digest_bytes32: `0x${digest}`,
      stripped,
    });
  });

  app.post('/api/seeds/:id/sovereignty/preview', optionalAuth, async (req: any, res: any) => {
    try {
      const seed = seeds.find((s: any) => s.id === req.params.id);
      if (!seed) return res.status(404).json({ detail: 'Seed not found' });

      const ownerAddress =
        req.body?.owner_address ?? req.user?.address ?? '0x0000000000000000000000000000000000000000';
      // A preview is a dry-run through the full adapter stack, using the
      // local deterministic signer so the response is reproducible in tests.
      const signer = new LocalHmacSigner({
        id: req.body?.signer_id ?? 'paradigm-preview',
        key: req.body?.signer_key ?? 'paradigm-preview-key',
      });
      const anchor = getSovereigntyAnchor();
      const pin = getSovereigntyPin();

      // Build the metadata the real anchor would pin. Reuse the existing
      // buildSeedMetadata path from onchain.ts so the preview is faithful.
      const prepared = OnChainSovereignty.prepareMint(seed);
      const result = await mintSeedSovereignty({
        seed,
        metadata: prepared.metadata,
        owner: ownerAddress,
        signer,
        anchor,
        pin,
      });

      res.json({
        dry_run: true,
        seed_id: seed.id,
        digest: result.digest,
        canonical_json_length: result.canonicalJson.length,
        signature: {
          signer: result.signature.signer,
          algorithm: result.signature.algorithm,
          signature: result.signature.signature,
          signed_at: result.signature.signedAt,
        },
        pin: {
          backend: result.pin.backend,
          uri: result.pin.uri,
          size_bytes: result.pin.sizeBytes,
          content_digest: result.pin.contentDigest,
        },
        anchor: {
          network: result.anchor.network,
          chain_id: result.anchor.chainId,
          token_id: result.anchor.tokenId,
          transaction_hash: result.anchor.transactionHash,
          metadata_uri: result.anchor.metadataUri,
          owner: result.anchor.owner,
          dry_run: result.anchor.dryRun,
        },
        // The metadata that would be pinned to Arweave in production.
        metadata: prepared.metadata,
        warning:
          'This is a dry-run. No transaction was broadcast and no real network was contacted. Use /mint with a private key to execute the real mint on Base L2.',
      });
    } catch (e: any) {
      log('ERROR', 'Sovereignty preview error', { error: e?.message });
      res.status(500).json({ detail: e?.message ?? 'Preview failed' });
    }
  });

  app.post('/api/seeds/:id/sovereignty/verify', async (req: any, res: any) => {
    try {
      const seed = seeds.find((s: any) => s.id === req.params.id);
      if (!seed) return res.status(404).json({ detail: 'Seed not found' });
      const sig = req.body?.signature;
      if (!sig) return res.status(400).json({ detail: 'signature required' });
      if (sig.algorithm !== 'local-hmac-sha256') {
        return res.status(400).json({
          detail: `verify endpoint only supports local-hmac-sha256 signatures (got ${sig.algorithm}); use an on-chain explorer for EIP-712`,
        });
      }
      const signer = new LocalHmacSigner({
        id: sig.signer,
        key: req.body?.signer_key ?? 'paradigm-preview-key',
      });
      const ok = await signer.verify(seed, sig);
      res.json({
        valid: ok,
        current_digest: seedDigestBytes32(seed),
        signature_digest: sig.digest,
        digest_matches: sig.digest === seedDigestBytes32(seed),
      });
    } catch (e: any) {
      log('ERROR', 'Sovereignty verify error', { error: e?.message });
      res.status(500).json({ detail: e?.message ?? 'Verify failed' });
    }
  });

  /**
   * Get on-chain sovereignty status for a seed
   * GET /api/seeds/:id/sovereignty/onchain
   */
  app.get('/api/seeds/:id/sovereignty/onchain', async (req: any, res: any) => {
    const seed = seeds.find((s: any) => s.id === req.params.id);
    if (!seed) return res.status(404).json({ detail: 'Seed not found' });

    const { canonicalJson, digest } = canonicalizeSeed(seed);
    const onChainConfig = {
      sepolia: process.env.SEPOLIA_RPC_URL ? {
        contract: process.env.PARADIGM_NFT_CONTRACT || '0x0000000000000000000000000000000000000000',
        network: 'sepolia',
        chain_id: 11155111,
        explorer: 'https://sepolia.etherscan.io',
      } : null,
    };

    res.json({
      seed_id: seed.id,
      seed_name: seed.name,
      digest_hex: digest,
      canonical_json_length: canonicalJson.length,
      minted: !!seed.nft?.minted,
      token_id: seed.nft?.tokenId || null,
      contract_address: seed.nft?.contractAddress || null,
      transaction_hash: seed.nft?.transactionHash || null,
      configured_networks: Object.fromEntries(
        Object.entries(onChainConfig).filter(([_, v]) => v !== null)
      ),
      links: {
        sovereignty_canonical: `/api/seeds/${seed.id}/sovereignty/canonical`,
        sovereignty_preview: `/api/seeds/${seed.id}/sovereignty/preview`,
        sovereignty_verify: `/api/seeds/${seed.id}/sovereignty/verify`,
      },
    });
  });

  // ── glTF Binary Export ──
  // Smooth/blocky opt-in via `?smooth=1`. Smooth = Marching Cubes (Phase 4),
  // blocky = legacy voxel-quad extractor. Keeping both so callers migrating
  // from blocky mesh assumptions don't break silently.
  app.get('/api/seeds/:id/export/glb', async (req: any, res: any) => {
    const seed = seeds.find((s: any) => s.id === req.params.id);
    if (!seed) return res.status(404).json({ detail: 'Seed not found' });

    // Opt-in smooth MC mesh. Accept `1`, `true`, or `yes` as truthy.
    const smoothRaw = String(req.query?.smooth ?? '').toLowerCase();
    const smoothMesh = smoothRaw === '1' || smoothRaw === 'true' || smoothRaw === 'yes';

    try {
      const { ParadigmPipeline } = require('./src/lib/pipeline/index.js');
      const { exportToGLB } = require('./src/lib/asset_pipeline/gltf_exporter.js');
      const { generateMaterial } = require('./src/lib/asset_pipeline/material_generator.js');
      const pipelineResult = await ParadigmPipeline.runEndToEnd(seed, { smoothMesh });
      const meshData = pipelineResult?.emergent_assets?.mesh;
      if (!meshData?.vertices?.length) {
        return res.status(422).json({ detail: 'Seed did not produce mesh data' });
      }
      const material = generateMaterial(seed);
      const glb = exportToGLB(meshData, seed.$name || 'Paradigm Seed', material);
      res.setHeader('Content-Type', 'model/gltf-binary');
      res.setHeader('X-Paradigm-Mesh-Mode', smoothMesh ? 'smooth-mc' : 'blocky');
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

  // ── Per-gene sovereignty ──

  app.post('/api/seeds/:id/genes/:geneKey/sovereignty', optionalAuth, (req: any, res: any) => {
    const seed = seeds.find((s: any) => s.id === req.params.id);
    if (!seed) return res.status(404).json({ detail: 'Seed not found' });
    const geneKey = req.params.geneKey;
    if (!seed.genes?.[geneKey]) return res.status(404).json({ detail: 'Gene not found' });

    const gene = seed.genes[geneKey];
    const sovereign = createSovereignGene(gene, req.body.creator || 'anonymous', req.body.license);
    seed.genes[geneKey] = sovereign;
    saveSeeds();
    res.json({ gene: sovereign });
  });

  app.get('/api/seeds/:id/genes/:geneKey/sovereignty', (req: any, res: any) => {
    const seed = seeds.find((s: any) => s.id === req.params.id);
    if (!seed) return res.status(404).json({ detail: 'Seed not found' });
    const geneKey = req.params.geneKey;
    if (!seed.genes?.[geneKey]) return res.status(404).json({ detail: 'Gene not found' });

    const gene = seed.genes[geneKey];
    const ownership = gene.ownership || { creator: 'unknown', lineage: [] };
    res.json({ geneKey, ownership, license: gene.ownership?.license || null });
  });

  // ── Evolution worker (async, off-main-thread) ──

   app.post('/api/seeds/:id/evolve/async', optionalAuth, async (req: any, res: any) => {
     const parent = seeds.find((s: any) => s.id === req.params.id);
     if (!parent) return res.status(404).json({ detail: 'Not found' });

     const algorithm = req.body.algorithm || 'ga';
     const popSize = Math.min(req.body.population_size || 20, 100);
     const generations = Math.min(req.body.generations || 10, 50);

     const jobId = `evolve_${parent.$hash}_${Date.now()}`;
     
     // Create job entry
     const job: EvolutionJob = {
       id: jobId,
       status: 'queued',
       algorithm,
       populationSize: popSize,
       generations,
       seedId: parent.id,
       createdAt: Date.now()
     };
     evolutionJobs.set(jobId, job);
     
     res.json({ jobId, status: 'queued', algorithm, population_size: popSize, generations });

     // Run in background
     (async () => {
       try {
         // Update job status
         job.status = 'running';
         
         const { GeneticAlgorithm, MAPElites, CMAES, POET, DQD, AURORA, NSLC } = await import('./src/lib/evolution/index.js');
         const rng = rngFor(parent, `async_evolve_${algorithm}`);
         const geneKeys = Object.keys(parent.genes || {});
         let result: any[] = [];

         if (algorithm === 'ga') {
           const ga = new GeneticAlgorithm(rng);
           const gaResult = await ga.evolve([parent], (s) => s.$fitness?.overall || 0.5, {
             populationSize: popSize, generationLimit: generations, mutationRate: 0.2, crossoverRate: 0.7, tournamentSize: 3, elitismCount: 1,
           });
           result = gaResult.population;
         } else if (algorithm === 'map-elites') {
           const me = new MAPElites((s) => geneKeys.map(k => (s.genes as any)?.[k]?.value || 0.5), { gridSize: [5, 5] });
           const meResult = me.run([parent], (s) => s.$fitness?.overall || 0.5, generations);
           result = Array.from(meResult.population.values()).map(c => c.seed);
         } else if (algorithm === 'cmaes') {
           const cmaes = new CMAES({ populationSize: popSize, generations });
           const cmaesResult = await cmaes.optimize(parent, (s) => s.$fitness?.overall || 0.5, geneKeys);
           result = [cmaesResult.best];
         } else if (algorithm === 'dqd') {
           const dqd = new DQD({ populationSize: popSize, generations });
           const dqdResult = await dqd.run([parent], async (s) => s.$fitness?.overall || 0.5, (s) => geneKeys.slice(0, 2).map(k => (s.genes as any)?.[k]?.value || 0.5));
           result = [dqdResult.best];
         } else if (algorithm === 'aurora') {
           const aurora = new AURORA({ archiveSize: popSize * 5, generations });
           const auroraResult = await aurora.run([parent], async (s) => s.$fitness?.overall || 0.5, (s) => geneKeys.slice(0, 2).map(k => (s.genes as any)?.[k]?.value || 0.5));
           result = auroraResult.archive.slice(0, popSize).map(a => a.seed);
         } else if (algorithm === 'nslc') {
           const nslc = new NSLC({ archiveSize: popSize * 5, generations });
           const nslcResult = await nslc.run([parent], async (s) => s.$fitness?.overall || 0.5, (s) => geneKeys.slice(0, 2).map(k => (s.genes as any)?.[k]?.value || 0.5));
           result = nslcResult.archive.slice(0, popSize).map(a => a.seed);
         } else {
           const poet = new POET({ maxEnvironments: popSize, generations });
           const poetResult = await poet.run([parent], async (env, sol) => sol.$fitness?.overall || 0.5, (env, r) => {
             const child = JSON.parse(JSON.stringify(env));
             if (child.genes) for (const [, g] of Object.entries(child.genes)) { const ge = g as any; if (typeof ge.value === 'number') ge.value = Math.max(0, Math.min(1, ge.value + (r.nextF64() - 0.5) * 0.2)); }
             return child;
           });
           result = poetResult.environments.slice(0, popSize).map(e => e.solution);
         }

         for (const seed of result) { seeds.push(seed); }
         saveSeeds();
         metrics.seedsEvolved++;
         
         // Update job with result
         job.status = 'completed';
         job.completedAt = Date.now();
         job.result = result;
         
         log('INFO', 'Async evolution complete', { jobId, count: result.length });
       } catch (e: any) {
         // Update job with error
         job.status = 'failed';
         job.error = e.message;
         job.completedAt = Date.now();
         
         log('ERROR', 'Async evolution failed', { jobId, error: e.message });
       }
      })();
    });

   // ─── Evolution Job Management Endpoints ───────────────────────────────────
   // Get status of an evolution job
   app.get('/api/evolve/:jobId/status', optionalAuth, (req: any, res: any) => {
     const job = evolutionJobs.get(req.params.jobId);
     if (!job) return res.status(404).json({ detail: 'Job not found' });
     
     // Return job info without sensitive data
     res.json({
       id: job.id,
       status: job.status,
       algorithm: job.algorithm,
       populationSize: job.populationSize,
       generations: job.generations,
       seedId: job.seedId,
       createdAt: job.createdAt,
       completedAt: job.completedAt
     });
   });

   // Get result of a completed evolution job
   app.get('/api/evolve/:jobId/result', optionalAuth, (req: any, res: any) => {
     const job = evolutionJobs.get(req.params.jobId);
     if (!job) return res.status(404).json({ detail: 'Job not found' });
     
     if (job.status !== 'completed') {
       return res.status(400).json({ 
         detail: `Job is not completed. Current status: ${job.status}` 
       });
     }
     
     res.json({
       id: job.id,
       status: job.status,
       result: job.result,
       completedAt: job.completedAt
     });
   });

   // Cancel an evolution job (only works if still queued or running)
   app.delete('/api/evolve/:jobId/cancel', optionalAuth, (req: any, res: any) => {
     const job = evolutionJobs.get(req.params.jobId);
     if (!job) return res.status(404).json({ detail: 'Job not found' });
     
     if (job.status === 'completed' || job.status === 'failed' || job.status === 'cancelled') {
       return res.status(400).json({ 
         detail: `Cannot cancel job with status: ${job.status}` 
       });
     }
     
     job.status = 'cancelled';
     job.completedAt = Date.now();
     
     res.json({ 
       id: job.id, 
       status: job.status, 
       completedAt: job.completedAt 
     });
   });

   // ── Lightweight 3D mesh preview (Phase 4/5) ──
  // Returns a JSON mesh the frontend can render directly in WebGL without
  // running the heavy QFT pipeline. The default path (unknown/custom seed
  // domain) now produces a Marching-Cubes mesh instead of a generic sphere.
  app.get('/api/seeds/:id/preview/mesh', (req: any, res: any) => {
    const seed = seeds.find((s: any) => s.id === req.params.id);
    if (!seed) return res.status(404).json({ detail: 'Seed not found' });

    try {
      const { generatePreviewMesh } = require('./src/lib/asset_pipeline/preview_generator.js');
      // Build a preview "artifact" from seed identity so the MC default path
      // has enough identity to derive a stable per-seed shape.
      const artifact = {
        type: seed.$domain || 'default',
        id: seed.id,
        seed_id: seed.id,
        name: seed.$name || 'Paradigm Seed',
        visual: seed.visual,
        mesh: seed.mesh,
        building: seed.building,
        particles: seed.particles,
      };
      const mesh = generatePreviewMesh(artifact);
      if (!mesh) return res.status(422).json({ detail: 'Unable to generate preview mesh' });
      res.json({
        seedId: seed.id,
        vertexCount: mesh.vertices.length / 3,
        triangleCount: mesh.indices.length / 3,
        mesh,
      });
    } catch (err: any) {
      res.status(500).json({ detail: err.message || 'Preview mesh failed' });
    }
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

  // ── Phi-4 inference client status (Phase 8) ──
  // Probes the configured OpenAI-compatible endpoint and reports which
  // tiers are actually available. No Gemini. No fallback to hosted APIs.
  // A KERNEL-only result means your local inference server isn't up.
  app.get('/api/agent/inference/phi4/status', async (_req: any, res: any) => {
    try {
      const { getPhi4Client, InferenceTier } = await import('./src/lib/agent/index.js');
      const client = getPhi4Client();
      const health = await client.health();
      res.json({
        available: health.available,
        tiers: {
          kernel: health.tiers[InferenceTier.KERNEL],
          fast: health.tiers[InferenceTier.FAST],
          standard: health.tiers[InferenceTier.STANDARD],
          deep: health.tiers[InferenceTier.DEEP],
        },
        configured_models: {
          fast: client.configuredModel(InferenceTier.FAST),
          standard: client.configuredModel(InferenceTier.STANDARD),
          deep: client.configuredModel(InferenceTier.DEEP),
        },
        loaded_models: client.loadedModels(),
        max_available_tier: client.maxAvailableTier(),
      });
    } catch (e: any) {
      log('ERROR', 'Phi-4 status error', { error: e?.message });
      res.status(500).json({ detail: e?.message ?? 'status failed' });
    }
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
  // SUB-AGENT PIPELINE (6-Stage Generation via sub-agents)
  // ═══════════════════════════════════════════════════════════════════════════

  app.post('/api/agents/generate-seed', optionalAuth, async (req: any, res: any) => {
    const { description, domain } = req.body || {};
    if (!description) {
      return res.status(400).json({ detail: 'description is required' });
    }
    try {
      const result = await pipelineOrchestrator.runPipeline(description, domain, memorySystem);
      if (!result.success) {
        return res.status(500).json({ detail: result.error, duration: result.duration });
      }
      // Persist any created seed
      if (result.growth?.seed) {
        seeds.push(result.growth.seed);
        saveSeeds();
      }
      log('INFO', 'Pipeline generate-seed', { domain: result.intent?.domain, success: true, refineCount: result.refineCount });
      res.json(result);
    } catch (e: any) {
      log('ERROR', 'Pipeline generate-seed failed', { error: e.message });
      res.status(500).json({ detail: e.message });
    }
  });

  app.post('/api/agents/refine', optionalAuth, async (req: any, res: any) => {
    const { seedHash, feedback } = req.body || {};
    if (!seedHash || !feedback) {
      return res.status(400).json({ detail: 'seedHash and feedback are required' });
    }
    try {
      const existingSeed = seeds.find((s: any) => s.$hash === seedHash || s.id === seedHash);
      if (!existingSeed) {
        return res.status(404).json({ detail: 'Seed not found' });
      }
      const description = `Refine: ${existingSeed.$name || 'seed'}. Feedback: ${feedback}`;
      const result = await pipelineOrchestrator.runPipeline(
        description,
        existingSeed.$domain,
        memorySystem,
        seeds,
      );
      if (!result.success) {
        return res.status(500).json({ detail: result.error });
      }
      if (result.growth?.seed) {
        seeds.push(result.growth.seed);
        saveSeeds();
      }
      res.json({ refinedSeed: result.growth?.seed, confidence: result.validation?.confidence, result });
    } catch (e: any) {
      res.status(500).json({ detail: e.message });
    }
  });

  app.get('/api/agents/memory/exemplars', optionalAuth, async (_req: any, res: any) => {
    try {
      const count = memorySystem.exemplar?.count() || 0;
      res.json({ exemplars: [], count, note: 'Use domain filter for detailed results' });
    } catch (e: any) {
      res.status(500).json({ detail: e.message });
    }
  });

  app.post('/api/agents/memory/record', optionalAuth, async (req: any, res: any) => {
    const { seed, description, rating } = req.body || {};
    if (!seed || !description) {
      return res.status(400).json({ detail: 'seed and description are required' });
    }
    try {
      const seedId = seed.id || seed.$hash || 'unknown';
      const seedHash = seed.$hash || seed.hash || '';
      memorySystem.recordEpisode(
        rating >= 0.7 ? 'success' : 'attempt',
        seed.$domain || 'unknown',
        description,
        seedId,
        seedHash,
        (rating || 0) >= 0.5,
      );
      res.json({ stored: true });
    } catch (e: any) {
      res.status(500).json({ detail: e.message });
    }
  });

  app.get('/api/agents/stats', optionalAuth, async (_req: any, res: any) => {
    try {
      res.json({
        memory: memorySystem.getStats(),
        subAgents: pipelineOrchestrator.getAllSubAgents().map(a => ({
          name: a.name, stage: a.stage, isLLMBacked: a.isLLMBacked, hasToolAccess: a.hasToolAccess,
        })),
        orchestratorConfigured: true,
      });
    } catch (e: any) {
      res.status(500).json({ detail: e.message });
    }
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // PARADIGM FRIEND  (Phase 1)
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Grow a Friend from a seed string.
   * POST /api/v1/friend/generate
   * Body: { seed: string, name?: string, archetypeBias?: BodyArchetype }
   * Returns: { friendSeed: FriendSeedData, artifact: FriendArtifact }
   *
   * Determinism contract: same body → byte-identical response (modulo the
   * `meta.elapsedMs` observability field).
   */
  app.post(
    '/api/v1/friend/generate',
    optionalAuth,
    validateBody(FriendGenerateSchema),
    (req: any, res: any) => {
      try {
        const { seed, name, archetypeBias } = req.body;
        const friendSeed = createFriendSeed(seed, { name, archetypeBias });
        const artifact = generateFriend(friendSeed);
        log('INFO', 'Friend generated', {
          id: friendSeed.id,
          name: friendSeed.name,
        });
        res.json({ friendSeed, artifact });
      } catch (e: any) {
        log('ERROR', 'Friend generate error', { error: e.message });
        res.status(400).json({
          error: 'Friend generation failed',
          message: e.message,
        });
      }
    },
  );

  /**
   * Breed two Friends — deterministic child given the same parents+salt.
   * POST /api/v1/friend/breed
   * Body: { parentA: string, parentB: string, salt?: string }
   * Returns: { friendSeed: FriendSeedData, artifact: FriendArtifact,
   *            parents: { a: FriendSeedData, b: FriendSeedData } }
   */
  app.post(
    '/api/v1/friend/breed',
    optionalAuth,
    validateBody(FriendBreedSchema),
    (req: any, res: any) => {
      try {
        const { parentA, parentB, salt } = req.body;
        const a = createFriendSeed(parentA);
        const b = createFriendSeed(parentB);
        const child = breedFriends(a, b, salt ?? '');
        const artifact = generateFriend(child);
        log('INFO', 'Friend bred', {
          id: child.id,
          parents: [a.id, b.id],
          generation: child.derivation?.generation,
        });
        res.json({
          friendSeed: child,
          artifact,
          parents: { a, b },
        });
      } catch (e: any) {
        log('ERROR', 'Friend breed error', { error: e.message });
        res.status(400).json({
          error: 'Friend breed failed',
          message: e.message,
        });
      }
    },
  );

  /**
   * Mutate a Friend — deterministic given (parent, magnitude, salt).
   * POST /api/v1/friend/mutate
   * Body: { parent: string, magnitude?: number, salt?: string }
   * Returns: { friendSeed: FriendSeedData, artifact: FriendArtifact,
   *            parent: FriendSeedData }
   */
  app.post(
    '/api/v1/friend/mutate',
    optionalAuth,
    validateBody(FriendMutateSchema),
    (req: any, res: any) => {
      try {
        const { parent, magnitude = 0.15, salt = '' } = req.body;
        const parentSeed = createFriendSeed(parent);
        const mutated = mutateFriend(parentSeed, magnitude, salt);
        const artifact = generateFriend(mutated);
        log('INFO', 'Friend mutated', {
          id: mutated.id,
          parent: parentSeed.id,
          magnitude,
        });
        res.json({
          friendSeed: mutated,
          artifact,
          parent: parentSeed,
        });
      } catch (e: any) {
        log('ERROR', 'Friend mutate error', { error: e.message });
        res.status(400).json({
          error: 'Friend mutate failed',
          message: e.message,
        });
      }
    },
  );

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
   httpServer.on('upgrade', async (req: http.IncomingMessage, socket: any, head: Buffer) => {
     const urlParsed = new URL(req.url || '', `http://localhost:${PORT}`);
     if (urlParsed.pathname !== '/ws/agent') {
       socket.destroy();
       return;
     }

     // ── WebSocket JWT Authentication ──────────────────────────────
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

     const wsUser = await verifyTokenRaw(wsToken);
     if (!wsUser) {
       socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
       socket.destroy();
       log('WARN', 'WebSocket connection rejected: invalid or expired token');
       return;
     }
     log('INFO', 'WebSocket authenticated', { username: (wsUser as any).username });

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
  // PER-GENE PROVENANCE (Phase 1.3: Atomic Sovereignty)
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Get the full provenance chain for a specific gene
   * GET /api/seeds/:id/gene/:name/provenance
   */
  app.get('/api/seeds/:id/gene/:name/provenance', (req: any, res: any) => {
    const seed = seeds.find((s: any) => s.id === req.params.id);
    if (!seed) return res.status(404).json({ error: 'Seed not found' });

    const gene = seed.genes?.[req.params.name];
    if (!gene) return res.status(404).json({ error: 'Gene not found' });

    if (isSovereignGene(gene)) {
      return res.json(getGeneProvenance(gene));
    }

    // Non-sovereign: return basic info
    return res.json({
      creator: 'legacy',
      history: [],
      currentValue: gene.value,
      legacy: true,
    });
  });

  /**
   * Set a license on a specific gene
   * POST /api/seeds/:id/gene/:name/license
   */
  app.post('/api/seeds/:id/gene/:name/license', optionalAuth, (req: any, res: any) => {
    const seed = seeds.find((s: any) => s.id === req.params.id);
    if (!seed) return res.status(404).json({ error: 'Seed not found' });

    const geneName = req.params.name;
    const rawGene = seed.genes?.[geneName];
    if (!rawGene) return res.status(404).json({ error: 'Gene not found' });

    const userId = req.user?.sub || req.user?.username || 'anonymous';
    const { type, commercial, derivatives, attribution, shareAlike, royaltyBps } = req.body;

    let gene = isSovereignGene(rawGene)
      ? rawGene
      : createSovereignGene(rawGene.value, rawGene.type || 'scalar', userId);

    gene = licenseSovereignGene(gene, {
      type: type || 'custom',
      commercial: commercial !== false,
      derivatives: derivatives !== false,
      attribution,
      shareAlike,
      royaltyBps,
    }, userId);

    seed.genes[geneName] = gene;
    saveSeeds();
    log('INFO', `Gene ${geneName} licensed`, { seed: seed.id, user: userId });
    audit('gene.license', 'gene', `${seed.id}:${geneName}`, { license: type }, req);
    res.json({ success: true, provenance: getGeneProvenance(gene) });
  });

  /**
   * Check permissions on a gene
   * GET /api/seeds/:id/gene/:name/permission?operation=mutate&user=bob
   */
  app.get('/api/seeds/:id/gene/:name/permission', (req: any, res: any) => {
    const seed = seeds.find((s: any) => s.id === req.params.id);
    if (!seed) return res.status(404).json({ error: 'Seed not found' });

    const gene = seed.genes?.[req.params.name];
    if (!gene) return res.status(404).json({ error: 'Gene not found' });
    if (!isSovereignGene(gene)) {
      return res.json({ allowed: true, reason: 'Legacy gene — no restrictions' });
    }

    const operation = (req.query.operation as string) || 'mutate';
    const userId = (req.query.user as string) || 'anonymous';
    const result = checkGenePermission(gene, operation as any, userId);
    res.json(result);
  });

  /**
   * Make a gene sovereign (wrap raw value with creator attribution)
   * POST /api/seeds/:id/gene/:name/sovereignize
   */
  app.post('/api/seeds/:id/gene/:name/sovereignize', optionalAuth, (req: any, res: any) => {
    const seed = seeds.find((s: any) => s.id === req.params.id);
    if (!seed) return res.status(404).json({ error: 'Seed not found' });

    const geneName = req.params.name;
    const rawGene = seed.genes?.[geneName];
    if (!rawGene) return res.status(404).json({ error: 'Gene not found' });

    if (isSovereignGene(rawGene)) {
      return res.json({ success: true, message: 'Already sovereign', provenance: getGeneProvenance(rawGene) });
    }

    const userId = req.user?.sub || req.user?.username || seed.$owner?.userId || 'anonymous';
    const sovereign = createSovereignGene(
      rawGene.value,
      rawGene.type || 'scalar',
      userId,
    );
    seed.genes[geneName] = sovereign;
    saveSeeds();
    log('INFO', `Gene ${geneName} sovereignized`, { seed: seed.id, user: userId });
    res.json({ success: true, message: 'Gene is now sovereign', provenance: getGeneProvenance(sovereign) });
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
  // PHASE 4: UNIVERSAL CONTENT FABRIC — Seed Render & .pseed
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Render a seed to a requested format (cache-first, grow on miss)
   * GET /api/v1/render/:hash?format=glb
   */
  app.get('/api/v1/render/:hash', async (req: any, res: any) => {
    const seed = seeds.find((s: any) => s.$hash === req.params.hash || s.id === req.params.hash);
    if (!seed) return res.status(404).json({ error: 'Seed not found' });

    const format = req.query.format || 'json';
    const supportedFormats = getSupportedFormats(seed.$domain);
    if (format !== 'json' && !supportedFormats.includes(format)) {
      return res.status(400).json({ error: `Format '${format}' not supported for domain '${seed.$domain}'`, supported: supportedFormats });
    }

    try {
      const result = await renderSeed(seed, format as any);
      res.set('Content-Type', result.mimeType);
      res.set('X-Seed-Hash', result.seedHash);
      res.set('X-Generation-Quality', result.quality);
      res.set('X-Cache', result.cached ? 'HIT' : 'MISS');
      res.send(result.data);
    } catch (err: any) {
      res.status(500).json({ error: 'Render failed', message: err.message });
    }
  });

  /**
   * Export a seed as .pseed package
   * GET /api/seeds/:id/export/pseed
   */
  app.get('/api/seeds/:id/export/pseed', (req: any, res: any) => {
    const seed = seeds.find((s: any) => s.id === req.params.id);
    if (!seed) return res.status(404).json({ error: 'Seed not found' });

    const pkg = packagePSeed(seed);
    res.set('Content-Type', 'application/vnd.paradigm.seed');
    res.set('Content-Disposition', `attachment; filename="${seed.$name || 'seed'}.pseed"`);
    res.send(pkg);
  });

  /**
   * Import a .pseed package
   * POST /api/seeds/import/pseed
   */
  app.post('/api/seeds/import/pseed', (req: any, res: any) => {
    try {
      const { parsePSeed } = require('./src/lib/rendering/seed-render-service.js');
      const pkg = parsePSeed(Buffer.from(JSON.stringify(req.body)));
      if (!pkg.seed) return res.status(400).json({ error: 'Invalid .pseed file: missing seed' });

      seeds.push(pkg.seed);
      saveSeeds();
      log('INFO', 'Seed imported from .pseed', { name: pkg.metadata.name });
      res.json({ success: true, seed: { id: pkg.seed.id, name: pkg.metadata.name, domain: pkg.metadata.domain } });
    } catch (err: any) {
      res.status(400).json({ error: 'Invalid .pseed file', message: err.message });
    }
  });

  /**
   * Export a seed as .gseed binary
   * GET /api/seeds/:id/export.gseed
   */
  app.get('/api/seeds/:id/export.gseed', (req: any, res: any) => {
    try {
      const seed = seeds.find((s: any) => s.id === req.params.id);
      if (!seed) return res.status(404).json({ error: 'Seed not found' });

      const output = seed.$lastOutput || { format: 'json' };
      const gseed = encodeGseed({
        version: { major: 1, minor: 1 },
        timestamp: Date.now(),
        flags: { hasC2PA: false, hasOutputs: !!output.mesh, encryptedSeed: false, royaltyEnabled: false, compressed: true },
        seedHash: seed.$hash || seed.id,
        metadata: {
          schema: 'https://paradigm.ai/schema/gseed-metadata/v1',
          author: seed.$metadata?.author || 'Anonymous',
          title: seed.$name || 'Untitled Seed',
          generator: seed.$domain || 'unknown',
          created: new Date().toISOString(),
          license: 'CC0',
        },
        outputs: output.mesh ? [{ type: 1, index: 0, data: new TextEncoder().encode(output.mesh) }] : undefined,
      });

      res.set('Content-Type', 'application/x-paradigm-gseed');
      res.set('Content-Disposition', `attachment; filename="${seed.$name || 'seed'}.gseed"`);
      res.send(Buffer.from(gseed));
    } catch (err: any) {
      res.status(500).json({ error: 'Export failed', message: err.message });
    }
  });

  /**
   * Import a .gseed binary
   * POST /api/seeds/import.gseed
   */
  app.post('/api/seeds/import.gseed', (req: any, res: any) => {
    try {
      const raw = req.body;
      if (!raw || !Buffer.isBuffer(raw) && typeof raw !== 'object') {
        return res.status(400).json({ error: 'Invalid .gseed: expected binary data' });
      }

      const buffer = Buffer.isBuffer(raw) ? new Uint8Array(raw) : new Uint8Array(Buffer.from(JSON.stringify(raw)));
      const pkg = decodeGseed(buffer);

      // Reconstruct a minimal seed from the package
      const seed: any = {
        id: pkg.seedHash,
        $hash: pkg.seedHash,
        $name: pkg.metadata?.title || 'Imported Seed',
        $domain: pkg.metadata?.generator || 'unknown',
        $metadata: pkg.metadata || {},
      };

      seeds.push(seed);
      saveSeeds();
      log('INFO', 'Seed imported from .gseed', { name: seed.$name });
      res.json({ success: true, seed: { id: seed.id, name: seed.$name, domain: seed.$domain } });
    } catch (err: any) {
      res.status(400).json({ error: 'Invalid .gseed file', message: err.message });
    }
  });

  /**
   * Get supported render formats for a domain
   * GET /api/v1/formats/:domain
   */
  app.get('/api/v1/formats/:domain', (req: any, res: any) => {
    const formats = getSupportedFormats(req.params.domain);
    res.json({ domain: req.params.domain, formats });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // PHASE 5: NETWORK STATE — Creative DAO & Training Canon
  // ═══════════════════════════════════════════════════════════════════════════

  // Initialize on-chain DAO if configured
  if (process.env.GOVERNOR_ADDRESS && process.env.TIMELOCK_ADDRESS) {
    try {
      const rpcUrl = process.env.ETHEREUM_RPC_URL || process.env.SEPOLIA_RPC_URL;
      daoProvider.configureOnChainDAO(
        process.env.GOVERNOR_ADDRESS,
        process.env.TIMELOCK_ADDRESS,
        rpcUrl,
      );
    } catch (e: any) {
      log('WARN', 'Failed to initialize on-chain DAO', { error: e.message });
    }
  }

  /**
   * Get DAO state
   * GET /api/v1/dao
   */
  app.get('/api/v1/dao', async (_req: any, res: any) => {
    res.json(await daoProvider.getDAOState());
  });

  /**
   * Propose a DAO action
   * POST /api/v1/dao/propose
   */
  app.post('/api/v1/dao/propose', optionalAuth, async (req: any, res: any) => {
    const { title, description, type, payload, stake, targets, values, calldatas } = req.body;
    if (!title || !type || !payload) return res.status(400).json({ error: 'Missing required fields' });

    const result = await daoProvider.propose(
      targets || [],
      values || [],
      calldatas || [],
      description || '',
      title, type, payload, req.user?.sub || 'anonymous', stake || 0,
    );
    if ('error' in result) return res.status(400).json(result);
    res.json(result);
  });

  /**
   * Vote on a proposal
   * POST /api/v1/dao/vote/:id
   */
  app.post('/api/v1/dao/vote/:id', optionalAuth, async (req: any, res: any) => {
    const { support, votingPower } = req.body;
    const result = await daoProvider.vote(req.params.id, req.user?.sub || 'anonymous', support, votingPower || 1);
    if ('error' in result) return res.status(400).json(result);
    res.json(result);
  });

  /**
   * Execute a passed proposal
   * POST /api/v1/dao/execute/:id
   */
  app.post('/api/v1/dao/execute/:id', optionalAuth, async (req: any, res: any) => {
    const result = await daoProvider.executeProposal(req.params.id);
    if ('error' in result) return res.status(400).json(result);
    log('INFO', `DAO proposal executed: ${req.params.id}`, { user: req.user?.sub });
    res.json(result);
  });

  /**
   * List proposals
   * GET /api/v1/dao/proposals
   */
  app.get('/api/v1/dao/proposals', async (_req: any, res: any) => {
    const status = _req.query.status as any;
    res.json(await daoProvider.getProposals(status));
  });

  /**
   * Register a seed for the AI Training Data Canon
   * POST /api/v1/canon/register
   */
  app.post('/api/v1/canon/register', optionalAuth, (req: any, res: any) => {
    const { seedId, license } = req.body;
    const seed = seeds.find((s: any) => s.id === seedId);
    if (!seed) return res.status(404).json({ error: 'Seed not found' });

    const result = trainingCanon.register(seed, license || 'CC-BY-4.0');
    if ('error' in result) return res.status(400).json(result);

    log('INFO', `Seed registered in training canon: ${seedId}`, { license });
    res.json(result);
  });

  /**
   * Query the Training Data Canon
   * GET /api/v1/canon/query
   */
  app.get('/api/v1/canon/query', (_req: any, res: any) => {
    const results = trainingCanon.query({
      domains: _req.query.domains?.split(','),
      minQuality: parseFloat(_req.query.minQuality || '0'),
      limit: parseInt(_req.query.limit || '100', 10),
    });
    res.json({ count: results.length, entries: results });
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
      persistCustomGeneTypes(dataDir);
      await store.persist();
      await store.close();
      log('INFO', 'Data store flushed and closed');
    } catch (e: any) {
      log('ERROR', `Data store shutdown error: ${e.message}`);
    }

    // Flush VCS stores (file-backed objects + refs)
    try {
      (vcsObjects as any).close?.();
      (vcsRefs as any).close?.();
      log('INFO', 'VCS stores flushed and closed');
    } catch (e: any) {
      log('ERROR', `VCS shutdown error: ${e.message}`);
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
