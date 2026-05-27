# Observability Audit — OpenTelemetry Assessment

**Date:** May 26, 2026

## Current State

A zero-dependency Prometheus-format `/api/metrics` endpoint exposes:

| Metric | Type | Source |
|--------|------|--------|
| `process_uptime_seconds` | gauge | `Date.now() - startTime` |
| `process_resident_memory_bytes` | gauge | `process.memoryUsage().rss` |
| `process_heap_used_bytes` | gauge | `process.memoryUsage().heapUsed` |
| `cache_hits_total` / `cache_misses_total` | counter | in-memory LRU or Redis |
| `cache_hit_ratio` | gauge | computed |
| `cache_size` | gauge | current entry count |
| `http_requests_total{method,route,status}` | counter | middleware on every request |
| `http_request_duration_ms_bucket{le}` | histogram | 11 buckets (5ms–+Inf) |
| `http_request_duration_quantiles{p="0.5/0.95/0.99"}` | gauge | computed from rolling 1000-sample window |
| `paradigm_seeds_*` (created/mutated/bred/evolved/composed) | counter | incremented by route handlers |
| `paradigm_agent_queries_total` | counter | agent endpoint |
| `paradigm_auth_attempts_total` / `paradigm_auth_successes_total` | counter | auth middleware |
| `paradigm_ws_connections_total` / `paradigm_ws_active_connections` | counter/gauge | WebSocket lifecycle |
| `paradigm_kernel_engines` / `paradigm_kernel_gene_types` | gauge | kernel metadata |

## Assessment

### Strengths
- **Zero dependencies** — no OTEL SDK, exporter, or collector to maintain
- **Prometheus-native** — scrapable directly by any Prometheus-compatible system (Grafana, Mimir, VictoriaMetrics)
- **Covers key signals** — request rates, latency distributions, business-domain counters, cache efficiency
- **Already deployed** — both `/api/metrics` and `/metrics` are live, no changes needed to enable

### Gaps vs. full OTEL

| Gap | Impact | Mitigation |
|-----|--------|------------|
| **No distributed tracing** | Can't trace a single request across service boundaries | Not needed — single-process Express app (no microservices) |
| **No span-level attribution** | Can't pinpoint which middleware/handler adds latency | Latency quantiles + route-level breakdown are sufficient |
| **No semantic conventions** | Non-standard label names | Labels follow Prometheus best practices (`snake_case`) |
| **No automatic instrumentation** | Must manually add metrics to new routes | Trivial — add one counter increment per route |

### Verdict

**Full OTEL SDK is not warranted.** The existing endpoint provides production-grade observability for a single-process application. Adding `@opentelemetry/js` would add ~40 dependencies, increase startup time, and provide no actionable signal that the current system doesn't already capture.

### Recommended additions (low effort, high value)

1. ✅ **Latency quantiles** (p50/p95/p99) — added May 26
2. ✅ **Cache metrics** (hits, misses, ratio, size) — added May 26
3. **Health-check metrics** — expose `/health` response times (for SLI tracking)
4. **Error budget** — expose `http_requests_total{status=~"5.."}` as a ratio of total (for SLO monitoring)

These are small additions to the existing handler and don't require OTEL dependencies.

## Future Consideration

If the architecture evolves to **multiple services** (e.g., separate ingestion, rendering, agent workers), OTEL becomes justified for trace propagation. At that point, swap the hand-rolled handler in `health.ts` for the `@opentelemetry/prometheus-exporter` — the metric names are compatible.
