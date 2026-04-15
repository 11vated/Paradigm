/**
 * Tests for the pino-backed structured logger (Phase 1.3).
 *
 * Pino writes through a SonicBoom stream that bypasses `process.stdout.write`
 * spies, so we use `createLogger(destination)` with our own in-memory
 * Writable to capture JSON lines. The exported `log(level, message, data)`
 * API is tested separately by spying on the underlying pinoLogger.
 *
 * Redaction is the load-bearing behavior here: if this breaks, tokens land
 * in logs shipped to Grafana, which is a security incident.
 */
import { describe, it, expect } from 'vitest';
import { Writable } from 'node:stream';
import { createLogger, log, pinoLogger } from '../../src/lib/logger/index.js';

/** In-memory destination. pino pushes NDJSON into it line-by-line. */
function makeCapture() {
  const chunks: string[] = [];
  const stream = new Writable({
    write(chunk, _enc, cb) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk.toString('utf8') : String(chunk));
      cb();
    },
  });
  return {
    stream,
    entries(): any[] {
      return chunks
        .join('')
        .split('\n')
        .filter((l) => l.length > 0)
        .map((l) => JSON.parse(l));
    },
  };
}

describe('createLogger / structured output', () => {
  it('writes JSON with level/msg/service', () => {
    const cap = makeCapture();
    const logger = createLogger(cap.stream);
    logger.info('hello world');
    const entries = cap.entries();
    expect(entries).toHaveLength(1);
    expect(entries[0].level).toBe('info');
    expect(entries[0].msg).toBe('hello world');
    expect(entries[0].service).toBe('paradigm-app');
  });

  it('merges data fields into top-level record', () => {
    const cap = makeCapture();
    const logger = createLogger(cap.stream);
    logger.info({ user_id: 'abc', request_id: 'req-1' }, 'user created');
    const entry = cap.entries()[0];
    expect(entry.user_id).toBe('abc');
    expect(entry.request_id).toBe('req-1');
  });

  it('uses ISO timestamps', () => {
    const cap = makeCapture();
    const logger = createLogger(cap.stream);
    logger.info('time check');
    const entry = cap.entries()[0];
    expect(entry.time).toBeDefined();
    // pino.stdTimeFunctions.isoTime produces "time":"2026-..."
    expect(typeof entry.time).toBe('string');
    expect(entry.time).toMatch(/T.*Z$/);
  });

  it('writes warn/error at the right level', () => {
    const cap = makeCapture();
    const logger = createLogger(cap.stream);
    logger.warn('warn msg');
    logger.error('err msg');
    const entries = cap.entries();
    expect(entries[0].level).toBe('warn');
    expect(entries[1].level).toBe('error');
  });
});

describe('redaction', () => {
  it('redacts top-level secret-ish fields', () => {
    const cap = makeCapture();
    const logger = createLogger(cap.stream);
    logger.info(
      {
        authorization: 'Bearer sekret',
        password: 'hunter2',
        passwordHash: 'pbkdf2$...',
        token: 'tkn',
        accessToken: 'acc',
        refreshToken: 'ref',
        jwt: 'eyJ...',
        secret: 'shh',
        apiKey: 'key',
        api_key: 'k2',
      },
      'secrets everywhere',
    );
    const entry = cap.entries()[0];
    expect(entry.authorization).toBe('[REDACTED]');
    expect(entry.password).toBe('[REDACTED]');
    expect(entry.passwordHash).toBe('[REDACTED]');
    expect(entry.token).toBe('[REDACTED]');
    expect(entry.accessToken).toBe('[REDACTED]');
    expect(entry.refreshToken).toBe('[REDACTED]');
    expect(entry.jwt).toBe('[REDACTED]');
    expect(entry.secret).toBe('[REDACTED]');
    expect(entry.apiKey).toBe('[REDACTED]');
    expect(entry.api_key).toBe('[REDACTED]');
  });

  it('redacts one-level-nested sensitive fields under arbitrary keys', () => {
    const cap = makeCapture();
    const logger = createLogger(cap.stream);
    logger.info(
      {
        user: { password: 'nope', email: 'a@b.com' },
        request: { authorization: 'Bearer x' },
      },
      'nested',
    );
    const entry = cap.entries()[0];
    expect(entry.user.password).toBe('[REDACTED]');
    expect(entry.user.email).toBe('a@b.com');
    expect(entry.request.authorization).toBe('[REDACTED]');
  });

  it('childLogger inherits redaction', () => {
    const cap = makeCapture();
    const logger = createLogger(cap.stream);
    const child = logger.child({ request_id: 'req-42' });
    child.info({ token: 'secret-tkn' }, 'child event');
    const entry = cap.entries()[0];
    expect(entry.request_id).toBe('req-42');
    expect(entry.token).toBe('[REDACTED]');
  });
});

describe('log() wrapper', () => {
  it('exports as a callable function that accepts legacy signature', () => {
    // We can't easily capture stdout from the default pinoLogger, so we
    // just assert the wrapper doesn't throw on the legacy signature.
    // The underlying pinoLogger behavior is covered above via createLogger.
    expect(() => log('INFO', 'hello')).not.toThrow();
    expect(() => log('INFO', 'with data', { k: 'v' })).not.toThrow();
    expect(() => log('WARN', 'warn')).not.toThrow();
    expect(() => log('ERROR', 'err', { error: 'boom' })).not.toThrow();
  });

  it('pinoLogger exposes the expected methods', () => {
    expect(typeof pinoLogger.info).toBe('function');
    expect(typeof pinoLogger.warn).toBe('function');
    expect(typeof pinoLogger.error).toBe('function');
    expect(typeof pinoLogger.child).toBe('function');
  });
});
