/**
 * Health, readiness, and Prometheus metrics routes.
 *
 * Extracted from server.ts as the first slice of the modular router
 * pattern. Future clusters (auth, agent, seeds, v1) will follow the
 * same shape: pass a typed deps bundle, register routes inside.
 */
import type { Express, Request, Response } from 'express';

export interface HealthDeps {
  startTime: number;
  metrics: {
    httpRequestsTotal: Map<string, number>;
    httpRequestDurationMs: number[];
    httpRequestDurationBuckets: Map<string, number>;
    seedsCreated: number;
    
    
    
    [k: string]: unknown;
  };
  DURATION_BUCKETS: readonly number[];
  seeds: { length: number }[];
  cache: { stats: () => { hits: number; misses: number; [k: string]: unknown }; backend: string };
  store: { backend: string; getAllSeeds: () => Promise<unknown[]> };
  checkSbert: (url?: string) => Promise<any>;
  checkPostgres: (probe?: () => Promise<unknown>) => Promise<unknown>;
  checkStore: (probe: () => Promise<unknown>) => Promise<unknown>;
  checkRedis: () => Promise<unknown>;
  buildReport: (checks: any[]) => any;
  getAllDomains: () => unknown[];
  GENE_TYPES: Record<string, unknown>;
}

export function registerHealthRoutes(app: Express, deps: HealthDeps): void {
  const { startTime, metrics, DURATION_BUCKETS, seeds, cache, store } = deps;

  const metricsHandler = (_req: Request, res: Response) => {
    const lines: string[] = [];
    const uptimeSec = Math.floor((Date.now() - startTime) / 1000);
    const memUsage = process.memoryUsage();

    // Latency quantiles
    const sorted = [...metrics.httpRequestDurationMs].sort((a, b) => a - b);
    function quantile(p: number): number {
      if (sorted.length === 0) return 0;
      const idx = Math.floor(p * sorted.length);
      return sorted[Math.min(idx, sorted.length - 1)];
    }

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

    // Cache metrics
    const cs = cache.stats();
    const cacheTotal = cs.hits + cs.misses;
    lines.push('# HELP cache_hits_total Cache hits');
    lines.push('# TYPE cache_hits_total counter');
    lines.push(`cache_hits_total ${cs.hits}`);
    lines.push('# HELP cache_misses_total Cache misses');
    lines.push('# TYPE cache_misses_total counter');
    lines.push(`cache_misses_total ${cs.misses}`);
    lines.push('# HELP cache_hit_ratio Cache hit ratio (0-1)');
    lines.push('# TYPE cache_hit_ratio gauge');
    lines.push(`cache_hit_ratio ${cacheTotal > 0 ? (cs.hits / cacheTotal).toFixed(4) : 0}`);
    lines.push('# HELP cache_size Current cache entry count');
    lines.push('# TYPE cache_size gauge');
    lines.push(`cache_size ${cs.size}`);

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
    lines.push('# HELP http_request_duration_quantiles HTTP request duration quantiles');
    lines.push('# TYPE http_request_duration_quantiles gauge');
    lines.push(`http_request_duration_quantiles{quantile="0.5"} ${quantile(0.5)}`);
    lines.push(`http_request_duration_quantiles{quantile="0.95"} ${quantile(0.95)}`);
    lines.push(`http_request_duration_quantiles{quantile="0.99"} ${quantile(0.99)}`);

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
    lines.push(`paradigm_kernel_engines ${deps.getAllDomains().length}`);

    lines.push('# HELP paradigm_kernel_gene_types Total gene types');
    lines.push('# TYPE paradigm_kernel_gene_types gauge');
    lines.push(`paradigm_kernel_gene_types ${Object.keys(deps.GENE_TYPES).length}`);

    res.set('Content-Type', 'text/plain; version=0.0.4; charset=utf-8');
    res.send(lines.join('\n') + '\n');
  };
  app.get('/api/metrics', metricsHandler);
  app.get('/metrics', metricsHandler);

  const healthHandler = (_req: Request, res: Response) => {
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
  };
  app.get('/api/health', healthHandler);
  app.get('/health', healthHandler);

  // Readiness probe — separate from liveness so load balancers can drain
  // traffic from degraded instances without killing the process. Checks run
  // in parallel so a single slow dep can't blow the client's timeout.
  // See src/lib/health/readiness.ts for per-check semantics.
  const readyHandler = async (_req: Request, res: Response) => {
    const sbertUrl = process.env.SBERT_URL;
    // Only attempt a pg probe when DATABASE_URL is set — otherwise importing
    // the pg module would construct a pool that immediately fails.
    const pgProbe: (() => Promise<unknown>) | undefined = process.env.DATABASE_URL
      ? async () => {
          const { probePg } = await import('../../lib/intelligence/pgvector.js' as any);
          await probePg();
        }
      : undefined;

    const [sbert, postgres, storeCheck, redisCheck] = await Promise.all([
      deps.checkSbert(sbertUrl),
      deps.checkPostgres(pgProbe),
      deps.checkStore(async () => store.getAllSeeds()),
      deps.checkRedis(),
    ]);

    const report = deps.buildReport([storeCheck, postgres, sbert, redisCheck]);
    res.status(report.ready ? 200 : 503).json(report);
  };
  app.get('/api/ready', readyHandler);
  app.get('/ready', readyHandler);
}
