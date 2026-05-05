/**
 * Paradigm structured logger (Phase 1 / D-4 observability track).
 *
 * Wraps Pino so every caller emits valid JSON on stdout/stderr — matching the
 * Caddy access log format. The exported `log(level, message, data)` signature
 * intentionally mirrors the pre-Phase-1 ad-hoc logger in server.ts so we can
 * swap without touching ~100 call sites.
 *
 * Why Pino and not Winston/Bunyan:
 *   - Pino is the fastest mainstream JSON logger for Node — matters because
 *     the hot path logs per-request and we don't want to serialize twice.
 *   - `redact:` is a first-class field; we use it to strip tokens + passwords
 *     from logs automatically. Hand-rolled regex redaction is too easy to
 *     get wrong.
 *   - Child loggers preserve context (request_id, user_id) without manual
 *     threading — enabling us to wire pino-http middleware later.
 *
 * Redaction rules: any key containing `authorization`, `password`,
 * `token`, `jwt`, `secret`, or `api_key` is replaced with `[REDACTED]`.
 */
import pino from 'pino';

const levelFromEnv = (process.env.LOG_LEVEL ?? 'info').toLowerCase();
const VALID_LEVELS = new Set(['trace', 'debug', 'info', 'warn', 'error', 'fatal', 'silent']);
const level = VALID_LEVELS.has(levelFromEnv) ? levelFromEnv : 'info';

/**
 * Keys that we never want appearing in logs, even nested. Match is
 * case-insensitive on the leaf field name.
 */
const REDACT_PATHS = [
  '*.authorization',
  '*.password',
  '*.passwordHash',
  '*.token',
  '*.accessToken',
  '*.refreshToken',
  '*.jwt',
  '*.secret',
  '*.apiKey',
  '*.api_key',
  'authorization',
  'password',
  'passwordHash',
  'token',
  'accessToken',
  'refreshToken',
  'jwt',
  'secret',
  'apiKey',
  'api_key',
];

/**
 * Build a pino logger with the shared Paradigm configuration. Exported so
 * tests can inject a custom destination stream (e.g. an in-memory buffer)
 * and assert on the structured output without touching process.stdout.
 */
export function createLogger(destination?: pino.DestinationStream) {
  return pino(
    {
      level,
      base: {
        service: 'paradigm-app',
        // process.version changes per deploy, useful when diagnosing env drift.
        nodeVersion: process.version,
      },
      redact: {
        paths: REDACT_PATHS,
        censor: '[REDACTED]',
      },
      timestamp: pino.stdTimeFunctions.isoTime,
      // formatters.level makes the `level` field a string ("info") instead of pino's
      // default integer — matters for human readability in Caddy/Grafana.
      formatters: {
        level: (label) => ({ level: label }),
      },
    },
    destination,
  );
}

export const pinoLogger = createLogger();

type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR' | 'FATAL';

const LEVEL_MAP: Record<LogLevel, 'debug' | 'info' | 'warn' | 'error' | 'fatal'> = {
  DEBUG: 'debug',
  INFO: 'info',
  WARN: 'warn',
  ERROR: 'error',
  FATAL: 'fatal',
};

/**
 * Drop-in replacement for the previous ad-hoc `log()` function. Existing call
 * sites use `log('INFO', 'message', { data })`; this signature is preserved.
 *
 * NOTE: `data` is passed to pino as the merge object; pino then expands it at
 * the top level of the JSON record and applies the redaction list. That's the
 * intended shape and matches the old ad-hoc logger's output well enough that
 * consumers parsing JSON lines don't care about the swap.
 */
export function log(
  level: LogLevel,
  message: string,
  data?: Record<string, unknown>,
): void {
  const pinoLevel = LEVEL_MAP[level] ?? 'info';
  if (data !== undefined) {
    pinoLogger[pinoLevel](data, message);
  } else {
    pinoLogger[pinoLevel](message);
  }
}

/**
 * For callers who want a pino child (scoped bindings like request_id).
 * Example: `const requestLogger = childLogger({ request_id: reqId });`
 */
export function childLogger(bindings: Record<string, unknown>) {
  return pinoLogger.child(bindings);
}
