/**
 * Readiness probe for Phase 1 (D-4 observability track).
 *
 * Distinct from `/health` which is a *liveness* probe: "is the process up?".
 * `/ready` is a *readiness* probe: "can this instance serve real traffic right now?".
 *
 * The two diverge when:
 *   - Postgres (pgvector) is unreachable → similarity search would 500
 *   - SBERT sidecar is down → new seeds can't be embedded
 *   - Disk is full → audit log writes would fail
 *
 * A Kubernetes/Nomad scheduler should remove the pod from the load balancer
 * on readiness failure while leaving the process running (liveness still ok).
 *
 * Design notes:
 *  - Each check has its own short timeout. A slow dep should not cascade.
 *  - Each check is independent and runs in parallel. One dep going down
 *    should not starve the others' timing budget.
 *  - `required: false` checks are reported but don't flip overall status.
 *    Phase 1 treats pgvector + sbert as required; legacy Mongo is optional
 *    (behind the docker-compose `legacy` profile).
 */

export type DependencyStatus = 'ok' | 'degraded' | 'down' | 'skipped';

export interface DependencyCheck {
  name: string;
  status: DependencyStatus;
  latency_ms: number;
  required: boolean;
  detail?: string;
}

export interface ReadinessReport {
  ready: boolean;
  checks: DependencyCheck[];
  timestamp: string;
}

export interface CheckOptions {
  timeoutMs?: number;
}

/**
 * Run a function with a hard timeout. If the function rejects or exceeds
 * the timeout, returns a `down` DependencyCheck.
 *
 * Two cancellation mechanisms in play:
 *   1. AbortController.signal — propagated into fn() so cooperative fetches
 *      can cancel sockets instead of hanging.
 *   2. Promise.race — guarantees we resolve at `timeoutMs` even if fn()
 *      ignores the signal (e.g. a pg query without statement_timeout, or
 *      a `new Promise(r => setTimeout(r, N))` that doesn't listen on it).
 *
 * Without (2), any non-cooperative dep could blow the readiness SLA.
 */
async function withTimeout<T>(
  name: string,
  required: boolean,
  fn: (signal: AbortSignal) => Promise<T>,
  timeoutMs: number,
  interpret: (result: T) => { status: DependencyStatus; detail?: string },
): Promise<DependencyCheck> {
  const started = Date.now();
  const controller = new AbortController();
  let timer: NodeJS.Timeout | undefined;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      controller.abort();
      reject(new Error(`timeout after ${timeoutMs}ms`));
    }, timeoutMs);
  });
  try {
    const result = await Promise.race([fn(controller.signal), timeoutPromise]);
    const { status, detail } = interpret(result as T);
    return {
      name,
      status,
      latency_ms: Date.now() - started,
      required,
      detail,
    };
  } catch (err: any) {
    return {
      name,
      status: 'down',
      latency_ms: Date.now() - started,
      required,
      detail: err?.message ?? String(err),
    };
  } finally {
    if (timer) clearTimeout(timer);
  }
}

/**
 * Ping the SBERT sidecar's /health endpoint. Required for similarity search,
 * but only when SBERT_URL is set — in local/unit-test environments the
 * sidecar is absent and we skip rather than fail.
 */
export async function checkSbert(
  sbertUrl: string | undefined,
  opts: CheckOptions = {},
): Promise<DependencyCheck> {
  if (!sbertUrl) {
    return {
      name: 'sbert',
      status: 'skipped',
      latency_ms: 0,
      required: false,
      detail: 'SBERT_URL unset',
    };
  }
  return withTimeout(
    'sbert',
    true,
    async (signal) => {
      const res = await fetch(`${sbertUrl.replace(/\/$/, '')}/health`, { signal });
      if (!res.ok) throw new Error(`sbert /health returned ${res.status}`);
      const body = (await res.json()) as { status?: string; dim?: number; model?: string };
      return body;
    },
    opts.timeoutMs ?? 2000,
    (body) => ({
      status: body.status === 'ok' ? 'ok' : 'degraded',
      detail: body.model ? `model=${body.model} dim=${body.dim}` : undefined,
    }),
  );
}

/**
 * Postgres check — caller passes a function that executes `SELECT 1`. We
 * deliberately keep the pg client out of this module to avoid coupling the
 * readiness module to a specific driver (pg, postgres.js, etc.). Phase 1.4
 * wires in the real client; until then callers pass `undefined` and the
 * check reports `skipped`.
 */
export async function checkPostgres(
  probe: (() => Promise<unknown>) | undefined,
  opts: CheckOptions = {},
): Promise<DependencyCheck> {
  if (!probe) {
    return {
      name: 'postgres',
      status: 'skipped',
      latency_ms: 0,
      required: false,
      detail: 'DATABASE_URL unset',
    };
  }
  return withTimeout(
    'postgres',
    true,
    async (_signal) => probe(),
    opts.timeoutMs ?? 1500,
    () => ({ status: 'ok' }),
  );
}

/**
 * Seed store probe — runs `store.getAllSeeds()` (or similar) and reports
 * latency. Always required; if the primary store is dead the process is
 * useless even if pg/sbert are fine.
 */
export async function checkStore(
  probe: () => Promise<unknown>,
  opts: CheckOptions = {},
): Promise<DependencyCheck> {
  return withTimeout(
    'store',
    true,
    async (_signal) => probe(),
    opts.timeoutMs ?? 1000,
    () => ({ status: 'ok' }),
  );
}

/**
 * Compose the overall readiness report. `ready: true` iff every required
 * check is `ok`. Non-required checks are informational only.
 */
export function buildReport(checks: DependencyCheck[]): ReadinessReport {
  const ready = checks.every((c) => !c.required || c.status === 'ok');
  return {
    ready,
    checks,
    timestamp: new Date().toISOString(),
  };
}
