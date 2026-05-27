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
import { kernelNowIso } from './src/lib/kernel/clock.js';
import { registerHealthRoutes } from './src/server/routes/health.js';
import { registerSovereignAgentRoutes } from './src/server/routes/sovereign-agent.js';
import { registerCompositionRoutes } from './src/server/routes/composition.js';
import { registerLibraryRoutes } from './src/server/routes/library.js';
import { registerGsplRoutes } from './src/server/routes/gspl.js';
import { registerAuthRoutes } from './src/server/routes/auth.js';
import { registerEvolveRoutes } from './src/server/routes/evolve.js';
import { registerSubstrateHealthRoutes } from './src/server/routes/substrate-health.js';
import { registerCommonsRoutes } from './src/server/routes/commons.js';
import { registerRoyaltyRoutes } from './src/server/routes/royalty.js';
import { registerLicenseRoutes } from './src/server/routes/license.js';
import { registerFederationRoutes } from './src/server/routes/federation.js';
import { createInMemoryPeerStore } from './src/lib/intelligence/federation/peer-store.js';
initServerPolyfills();

import express from 'express';
import http from 'http';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';

// ─── Core GSPL loader (existing) ─────────────────────────────────────────────
const loadAllGsplSeeds = (): any[] => [];

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
  getFunctor, findCompositionPath, composeSeed, getCompositionGraph,
  buildC2PAManifest, encodeC2PAManifest
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
  createFriendSeed, breedFriends, mutateFriend, generateFriend,
  getFriendStore, type FriendSeedData, type LineageNode,
  generateFriendKeyPair, signFriendSeed, verifyFriendSovereignty,
  anchorFriendOnChain, prepareFriendMint,
  prepareList, prepareDelist, prepareBuy,
} from './src/lib/friend/index.js';

// ─── NEW: Paradigm World + Quest + Game (Phase 3-5) ──────────────────────────
import { createWorldSeed, generateWorld, breedWorlds, mutateWorld, hashArtifact as hashWorldArtifact, composeQuest, type WorldSeedData, type QuestSeedData } from './src/lib/world/index.js';
import { createGameSeed, generateGame, evaluateGame, evolveGames, mapElitesGames, directorBrief, directedSearch, hashArtifact as hashGameArtifact, type GameSeedData, type GameArtifact } from './src/lib/game/index.js';

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

// ─── Extracted Route Modules (server split workstream C) ───────────────
import { registerSeedsCrudRoutes, registerSeedsGenerateRoutes } from './src/server/routes/seeds-crud.js';
import { registerSeedsOpsRoutes } from './src/server/routes/seeds-ops.js';
import { registerSeedsEvolutionRoutes } from './src/server/routes/seeds-evolution.js';
import { registerSeedsGrowRoutes } from './src/server/routes/seeds-grow.js';
import { registerSeedsExportRoutes, registerSeedsRenderRoutes } from './src/server/routes/seeds-output.js';
import { registerSeedsLineageRoutes } from './src/server/routes/seeds-lineage.js';
import { registerSeedsComposeRoutes } from './src/server/routes/seeds-compose.js';
import { registerSeedsVcsRoutes } from './src/server/routes/seeds-vcs.js';
import { registerSeedsSovereigntyRoutes } from './src/server/routes/seeds-sovereignty.js';
import { registerStatsMetaRoutes } from './src/server/routes/stats-meta.js';
import { registerAgentRoutes } from './src/server/routes/agent.js';
import { registerFriendRoutes } from './src/server/routes/friend.js';
import { registerWorldGameRoutes } from './src/server/routes/world-game.js';
import { registerDaoRoutes } from './src/server/routes/dao.js';
import { registerQftPipelineRoutes } from './src/server/routes/qft-pipeline.js';

// ─── NEW: Zod Validation ─────────────────────────────────────────────────────
import { validateBody } from './src/lib/validation/middleware.js';
import {
  RegisterSchema, LoginSchema,
  CreateSeedSchema, GenerateSeedSchema,
  MutateSeedSchema, EvolveSeedSchema, BreedSeedsSchema,
  EditGeneSchema, ComposeSeedSchema, GrowSeedSchema, BodyGrowSeedSchema,
  GsplParseSchema, GsplExecuteSchema,
  AgentQuerySchema,
  SignSeedSchema, VerifySeedSchema,
  MintSeedSchema,
  QftSimulateSchema, PipelineExecuteSchema,
  EmbedSeedSchema, LibraryImportSchema, SeedDistanceSchema,
  FriendGenerateSchema, FriendBreedSchema, FriendMutateSchema, FriendAnchorSchema,
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
  app.set('trust proxy', 1);

  // ── Security: CORS + Headers + Request ID ──────────────────────────────
  const allowedOrigins = process.env.CORS_ORIGINS
    ? process.env.CORS_ORIGINS.split(',').map(s => s.trim())
    : ['http://localhost:5173', 'http://localhost:4173', 'http://127.0.0.1:5173', 'http://127.0.0.1:4173'];
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

  // ── Friend Store (Phase 1/4): persistent FriendSeed registry ────────────
  const friendStore = getFriendStore(path.join(dataDir, 'friends'));
  await friendStore.load();
  log('INFO', `Friend store initialized`, { friendCount: friendStore.count() });

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

  // ── Health, readiness, and metrics (extracted to src/server/routes/health.ts) ──
  registerHealthRoutes(app, {
    startTime, metrics, DURATION_BUCKETS, seeds, cache, store,
    checkSbert, checkPostgres, checkStore, checkRedis, buildReport,
    getAllDomains, GENE_TYPES,
  });

  // ── Sovereign Agent — POST /run, /canon/ingest, GET /canon/search, /info ──
  registerSovereignAgentRoutes(app);
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

  // ── Route Registrations ──────────────────────────────────────────────────────
  // The following blocks register all API route handlers. Each set of routes
  // receives only the dependencies it needs via typed deps interfaces.

  const ARTIFACTS_BASE = path.resolve('data/artifacts');

  function safeArtifactPath(userPath: string): string | null {
    const resolved = path.resolve(userPath);
    if (!resolved.startsWith(ARTIFACTS_BASE)) return null;
    return resolved;
  }

  registerStatsMetaRoutes(app, { seeds, store, optionalAuth, validateBody, RegisterGeneTypeSchema, GENE_TYPES, getAllDomains, geneTypeRegistry, registerGSPLGeneType, validateGeneWithDetails, OPENAPI_SPEC, swaggerUIHTML, GSPL_GENE_TYPE_EXAMPLE, log, audit });

  registerSeedsExportRoutes(app, { seeds, saveSeeds, optionalAuth, ARTIFACTS_BASE, safeArtifactPath, log, renderSeed, getSupportedFormats, encodeGseed, decodeGseed, packagePSeed, buildC2PAManifest, encodeC2PAManifest });

  registerSeedsRenderRoutes(app, { seeds, saveSeeds, optionalAuth, ARTIFACTS_BASE, safeArtifactPath, renderSeed, getSupportedFormats, encodeGseed, decodeGseed, packagePSeed, log, buildC2PAManifest, encodeC2PAManifest });

  const authLimiter = createRateLimiter(60000, 20);
  registerAuthRoutes(app, { authLimiter, optionalAuth, validateBody, RegisterSchema, LoginSchema, registerUser, loginUser, refreshAccessToken, audit, metrics, log, revokeToken });

  registerSeedsCrudRoutes(app, { seeds, saveSeeds, optionalAuth, validateBody, CreateSeedSchema, GenerateSeedSchema, crypto: crypto as any, GENE_TYPES, validateGene, rngFromHash, deterministicSeedId, addOwnerIfAuthed, log, audit, metrics, IntelligenceLayer });

  registerSeedsGenerateRoutes(app, { seeds, saveSeeds, optionalAuth, validateBody, CreateSeedSchema, GenerateSeedSchema, crypto: crypto as any, GENE_TYPES, validateGene, rngFromHash, deterministicSeedId, addOwnerIfAuthed, log, audit, metrics, IntelligenceLayer });

  registerSeedsOpsRoutes(app, { seeds, saveSeeds, optionalAuth, validateBody, MutateSeedSchema, EvolveSeedSchema, BreedSeedsSchema, EditGeneSchema, SeedDistanceSchema, crypto: crypto as any, GENE_TYPES, mutateGene, crossoverGene, distanceGene, validateGeneWithDetails, rngFromHash, deterministicSeedId, addOwnerIfAuthed, authorizeSeedMutation, log, audit, metrics, inversePipeline, formatInverseResult });

  registerSeedsLineageRoutes(app, { seeds });

  registerSeedsGrowRoutes(app, { seeds, saveSeeds, optionalAuth, validateBody, BodyGrowSeedSchema, GrowSeedSchema, getAllDomains, growSeed, buildC2PAManifest, growCacheKey, cache, log });

  registerSeedsComposeRoutes(app, { seeds, saveSeeds, optionalAuth, validateBody, ComposeSeedSchema, crypto: crypto as any, composeSeed, findCompositionPath, log, audit, metrics });

  registerCompositionRoutes(app, { getCompositionGraph, findCompositionPath, cache, compositionPathKey });

  registerGsplRoutes(app, { validateBody, optionalAuth, GsplParseSchema, GsplExecuteSchema, seeds, saveSeeds });

  registerSeedsEvolutionRoutes(app, { seeds, saveSeeds, optionalAuth, validateBody, EmbedSeedSchema, crypto: crypto as any, rngFromHash, distanceGene, GENE_TYPES, log, metrics, evolutionJobs, IntelligenceLayer });

  registerSeedsVcsRoutes(app, { seeds, optionalAuth, authorizeSeedMutation, resolveCommitAuthor, vcsCommit, vcsLog, vcsBranch, vcsCheckout, diffTrees, mergeCommits, vcsEnsureRef, vcsObjects, vcsRefs, log, audit });

  registerLibraryRoutes(app, { seeds, saveSeeds, validateBody, optionalAuth, LibraryImportSchema });

  registerSeedsSovereigntyRoutes(app, { seeds, saveSeeds, optionalAuth, validateBody, SignSeedSchema, VerifySeedSchema, MintSeedSchema, crypto: crypto as any, SovereigntyLayer, OnChainSovereignty, canonicalizeSeed, seedDigestBytes32, createSovereignGene, isSovereignGene, getGeneProvenance, licenseSovereignGene, checkGenePermission, authorizeSeedMutation, LocalHmacSigner, LocalDryRunAnchor, LocalFilePin, mintSeedSovereignty, buildC2PAManifest, encodeGseed, log, audit });

  registerEvolveRoutes(app, { optionalAuth, evolutionJobs });
  registerSubstrateHealthRoutes(app);
  registerCommonsRoutes(app);
  registerRoyaltyRoutes(app);
  registerLicenseRoutes(app);

  // Federation v1 — Doctrine v2 Part VIII.16. Off in production by default;
  // enable explicitly with PARADIGM_FEDERATION_ENABLED=1.
  if (process.env.PARADIGM_FEDERATION_ENABLED === '1' || process.env.NODE_ENV !== 'production') {
    const federationStore = createInMemoryPeerStore();
    registerFederationRoutes(app, {
      store: federationStore,
      peerId: process.env.PARADIGM_PEER_ID ?? 'self.paradigm',
      publicKey: process.env.PARADIGM_PEER_PUBLIC_KEY ?? '',
      mirrorToken: process.env.PARADIGM_FEDERATION_MIRROR_TOKEN ?? undefined,
    });
    console.log('[federation] v1 routes registered (peer=' + (process.env.PARADIGM_PEER_ID ?? 'self.paradigm') + ')');
  }

  registerQftPipelineRoutes(app, { seeds, saveSeeds, optionalAuth, validateBody, QftSimulateSchema, PipelineExecuteSchema, QFTEngine, ParadigmPipeline, crypto: crypto as any, log });

  registerAgentRoutes(app, { seeds, saveSeeds, optionalAuth, validateBody, AgentQuerySchema, gsplAgent, pipelineOrchestrator, memorySystem, log, metrics });

  registerFriendRoutes(app, { optionalAuth, validateBody, FriendGenerateSchema, FriendBreedSchema, FriendMutateSchema, FriendAnchorSchema, friendStore, createFriendSeed, generateFriend, breedFriends, mutateFriend, generateFriendKeyPair, signFriendSeed, verifyFriendSovereignty, prepareFriendMint, anchorFriendOnChain, prepareList, prepareDelist, prepareBuy, crypto: crypto as any, log });

  registerWorldGameRoutes(app, { optionalAuth, createWorldSeed, generateWorld, breedWorlds, mutateWorld, hashArtifact: hashWorldArtifact, composeQuest, createFriendSeed, createGameSeed, generateGame, evaluateGame, evolveGames, mapElitesGames, directorBrief, directedSearch, hashGameArtifact, log });

  registerDaoRoutes(app, { optionalAuth, seeds, trainingCanon, daoProvider, log });


  // ARTIFACTS — serve grown outputs publicly so the browser can render them
  // ═════════════════════════════════════════════════════════════════════════
  const artifactsDir = path.join(process.cwd(), 'data', 'artifacts');
  app.use('/artifacts', express.static(artifactsDir, {
    maxAge: '1y',
    immutable: true,
    setHeaders: (res, filePath) => {
      if (filePath.endsWith('.svg'))  res.setHeader('Content-Type', 'image/svg+xml; charset=utf-8');
      if (filePath.endsWith('.html')) res.setHeader('Content-Type', 'text/html; charset=utf-8');
      if (filePath.endsWith('.wav'))  res.setHeader('Content-Type', 'audio/wav');
      if (filePath.endsWith('.mid'))  res.setHeader('Content-Type', 'audio/midi');
      if (filePath.endsWith('.pdb'))  res.setHeader('Content-Type', 'chemical/x-pdb');
      if (filePath.endsWith('.gltf')) res.setHeader('Content-Type', 'model/gltf+json');
      if (filePath.endsWith('.json')) res.setHeader('Content-Type', 'application/json');
    },
  }));
  app.use('/data/artifacts', express.static(artifactsDir));

  // CATCH-ALL & VITE
  // ═══════════════════════════════════════════════════════════════════════════

  app.use('/api/*', (req: any, res: any) => {
    log('WARN', `Unimplemented API: ${req.method} ${req.originalUrl}`);
    res.status(501).json({ detail: 'Not implemented' });
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true, allowedHosts: true },
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

  // ── Health-check retry loop ─────────────────────────────────────────────────
  // Retry the /health endpoint up to 3 times with 1s delay between attempts.
  for (let attempt = 1; attempt <= 3; attempt++) {
    await new Promise<void>((resolve) => setTimeout(resolve, 1000));
    try {
      const result = await fetch(`http://localhost:${PORT}/health`);
      if (result.ok) {
        log('INFO', `Health check passed on attempt ${attempt}`);
        break;
      }
      log('WARN', `Health check attempt ${attempt} returned ${result.status}`);
    } catch (err: any) {
      log('WARN', `Health check attempt ${attempt} failed: ${err?.message || err}`);
    }
  }
}

startServer();
