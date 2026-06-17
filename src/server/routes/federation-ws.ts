/**
 * Federation WebSocket Routes — real p2p transport diagnostics.
 *
 *   GET  /federation/ws/status     — current WS metrics + active sessions
 *   GET  /federation/ws/smoke      — in-process 2-node WS exchange roundtrip
 *   POST /federation/ws/init       — initialize operator keypair (idempotent)
 *
 * Doctrine v2 Phase 16: federation is real p2p, no central server. The smoke
 * endpoint drives a complete HELLO→OFFER→ACCEPT→PING→PONG→BYE roundtrip
 * between two WebSocket endpoints inside the same process (different ports
 * to exercise the actual TCP/WS layer, not in-memory shortcuts).
 */
import type { Request, Response } from 'express';
import * as crypto from 'crypto';
import {
  type FedWsMetrics,
  createFedWsMetrics,
  runLocalFedWsSmoke,
  performRealTwoNodeFedExchangeOverWs,
} from '../../lib/intelligence/federation/index.js';
import { SovereigntyLayer, type FedV1Exchange } from '../../lib/sovereignty/index.js';
import { createServer as httpCreateServer } from 'node:http';
import { registerFederationWebsocket } from '../../lib/intelligence/federation/transport.js';
import { kernelNowIso } from '../../lib/kernel/clock.js';

interface FedWsRuntime {
  metrics: FedWsMetrics;
  operatorPrivateKey: string;
  operatorPublicKey: string;
  operatorNodeId: string;
  activeSessions: number;
  initializedAt: string;
}

let runtime: FedWsRuntime = {
  metrics: createFedWsMetrics(),
  operatorPrivateKey: '',
  operatorPublicKey: '',
  operatorNodeId: '',
  activeSessions: 0,
  initializedAt: '',
};

function ensureInitialized(): FedWsRuntime {
  if (!runtime.operatorPrivateKey) {
    const kp = SovereigntyLayer.generateKeys();
    runtime = {
      ...runtime,
      operatorPrivateKey: kp.private_key,
      operatorPublicKey: kp.public_key,
      operatorNodeId: `paradigm-${crypto.createHash('sha256').update(kp.public_key).digest('hex').slice(0, 8)}`,
      initializedAt: kernelNowIso(),
    };
  }
  return runtime;
}

export function registerFederationWsRoutes(app: any): void {
  ensureInitialized();

  /**
   * GET /federation/ws/status
   * Returns transport metrics + local operator identity.
   */
  app.get('/federation/ws/status', (_req: Request, res: Response) => {
    const r = ensureInitialized();
    res.json({
      operatorNodeId: r.operatorNodeId,
      operatorPublicKeyFingerprint: crypto.createHash('sha256').update(r.operatorPublicKey).digest('hex').slice(0, 16),
      metrics: r.metrics,
      initializedAt: r.initializedAt,
      protocol: 'FedV1 over RFC 6455 WebSocket',
      endpoints: {
        server: '/ws/federation',
        client: 'FederationWebSocketClient (see lib/intelligence/federation/transport.ts)',
      },
      capabilities: ['seed-exchange', 'lineage-merge', 'rich-provenance', 'deterministic-merge'],
    });
  });

  /**
   * POST /federation/ws/init
   * Re-init the operator keypair. Idempotent — only re-keys if `force=true`.
   */
  app.post('/federation/ws/init', (req: Request, res: Response) => {
    const force = req.body?.force === true;
    if (runtime.operatorPrivateKey && !force) {
      res.json({
        reKeyed: false,
        operatorNodeId: runtime.operatorNodeId,
        operatorPublicKeyFingerprint: crypto.createHash('sha256').update(runtime.operatorPublicKey).digest('hex').slice(0, 16),
        message: 'Operator key already initialized. Pass {force:true} to re-key.',
      });
      return;
    }
    const kp = SovereigntyLayer.generateKeys();
    runtime = {
      metrics: createFedWsMetrics(),
      operatorPrivateKey: kp.private_key,
      operatorPublicKey: kp.public_key,
      operatorNodeId: `paradigm-${crypto.createHash('sha256').update(kp.public_key).digest('hex').slice(0, 8)}`,
      activeSessions: 0,
      initializedAt: kernelNowIso(),
    };
    res.json({
      reKeyed: true,
      operatorNodeId: runtime.operatorNodeId,
      operatorPublicKeyFingerprint: crypto.createHash('sha256').update(runtime.operatorPublicKey).digest('hex').slice(0, 16),
    });
  });

  /**
   * GET /federation/ws/smoke
   * Drives an in-process 2-node real WS exchange: spins up a WS server on a
   * free port, opens a client connection to it, performs a signed
   * HELLO→OFFER→ACCEPT→PING→PONG→BYE round trip, and returns the full
   * result. Exercises the entire real-wire path (TCP + RFC 6455 + FedV1).
   */
  app.get('/federation/ws/smoke', async (req: Request, res: Response) => {
    try {
      const seedHash = (req.query.seedHash as string) || `smoke-${Date.now().toString(36)}`;
      const initialLineage = ((req.query.lineage as string) || 'anc-0,anc-1').split(',').filter(Boolean);
      const includeRich = req.query.rich !== '0';

      const result = await runLocalFedWsSmoke({
        seedHash,
        initialLineage,
        richPreview: includeRich
          ? { name: 'smoke-rich', summary: 'in-process WS smoke', visualType: 'structured', strata: 0.5 }
          : undefined,
      });

      res.json({
        ...result,
        protocol: 'FedV1/RFC6455',
        transport: 'WebSocket (ws://)',
        // Surface a redacted merged envelope so callers can verify the merkle/lineage
        mergedExchangeSummary: result.mergedExchange ? {
          fromNode: result.mergedExchange.fromNode,
          toNode: result.mergedExchange.toNode,
          seedHash: result.mergedExchange.seedHash,
          lineageLen: result.mergedExchange.lineage.length,
          merkleRoot: result.mergedExchange.merkleRoot.slice(0, 16) + '…',
          hasRichPreview: !!result.mergedExchange.richPreview,
        } : null,
      });
    } catch (err: any) {
      res.status(500).json({ error: 'smoke-failed', message: err?.message || String(err) });
    }
  });

  /**
   * POST /federation/ws/dial
   * Drives a real WS exchange against an external Paradigm node. Body:
   *   { url: 'wss://...', token: 'jwt', clientNodeId, serverNodeId, seedHash, lineage?, richPreview? }
   * Used by cross-node integration tests + production cross-cluster offers.
   */
  app.post('/federation/ws/dial', async (req: Request, res: Response) => {
    const { url, token, clientNodeId, serverNodeId, seedHash, lineage, richPreview, timeoutMs } = req.body || {};
    if (!url || !token || !clientNodeId || !serverNodeId || !seedHash) {
      res.status(400).json({
        error: 'missing-fields',
        required: ['url', 'token', 'clientNodeId', 'serverNodeId', 'seedHash'],
      });
      return;
    }
    try {
      const result = await performRealTwoNodeFedExchangeOverWs(
        url,
        token,
        clientNodeId,
        serverNodeId,
        seedHash,
        Array.isArray(lineage) ? lineage : [],
        richPreview,
        typeof timeoutMs === 'number' ? timeoutMs : 5000
      );
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: 'dial-failed', message: err?.message || String(err) });
    }
  });

  /**
   * GET /federation/ws/local-server-info
   * Returns the URL of the local WebSocket server (if registered) so callers
   * know how to dial back. Reads from env to avoid hard-coding.
   */
  app.get('/federation/ws/local-server-info', (_req: Request, res: Response) => {
    const r = ensureInitialized();
    const port = process.env.PORT || '3000';
    res.json({
      nodeId: r.operatorNodeId,
      wsUrl: `ws://localhost:${port}/ws/federation`,
      httpUrl: `http://localhost:${port}/federation`,
      requireAuth: true,
      protocol: 'FedV1 over RFC 6455',
    });
  });

  console.log('[Federation WS] Routes registered at /federation/ws/*');
}

/**
 * Register the /ws/federation upgrade handler against the live http server.
 * Reuses the route file's runtime operator keypair (idempotent init).
 * Idempotent — safe to call once during boot.
 */
export function registerFederationWsUpgrade(
  httpServer: import('node:http').Server,
  deps: {
    PORT: number;
    verifyTokenRaw: (token: string) => any;
    log: (level: string, msg: string, meta?: any) => void;
  }
): void {
  ensureInitialized();
  const r = runtime;
  const offers = new Map<string, FedV1Exchange>();
  const trustedPeerKeys = new Set<string>();
  registerFederationWebsocket(httpServer, {
    PORT: deps.PORT,
    verifyTokenRaw: deps.verifyTokenRaw,
    log: deps.log,
    metrics: r.metrics,
    operatorPrivateKey: r.operatorPrivateKey,
    operatorPublicKey: r.operatorPublicKey,
    operatorNodeId: r.operatorNodeId,
    offers,
    trustedPeerKeys,
  });
  deps.log('INFO', 'Federation WebSocket upgrade handler attached', { endpoint: '/ws/federation', nodeId: r.operatorNodeId });
}

/**
 * Spin up an in-process WS server bound to a free port and wire the FedV1
 * handler. Used by tests and the doctor/smoke CLI to verify the transport
 * without needing the full Express app. Returns the port and a close fn.
 */
export async function spawnLocalFedWsServer(opts?: { nodeId?: string; authToken?: string }): Promise<{
  port: number;
  url: string;
  operatorPublicKey: string;
  operatorNodeId: string;
  close: () => Promise<void>;
}> {
  const operatorKp = SovereigntyLayer.generateKeys();
  const operatorNodeId = opts?.nodeId || `local-${crypto.createHash('sha256').update(operatorKp.public_key).digest('hex').slice(0, 6)}`;
  const authToken = opts?.authToken || 'local-test-token';

  const metrics = createFedWsMetrics();
  const offers = new Map<string, FedV1Exchange>();
  const trustedPeerKeys = new Set<string>();

  const server = httpCreateServer();
  await new Promise<void>((res, rej) => server.listen(0, '127.0.0.1', () => res()).once('error', rej));
  const port = (server.address() as any).port as number;

  registerFederationWebsocket(server, {
    PORT: port,
    verifyTokenRaw: async (t: string) => t === authToken ? { username: 'local' } : null,
    log: () => { /* swallow */ },
    metrics,
    operatorPrivateKey: operatorKp.private_key,
    operatorPublicKey: operatorKp.public_key,
    operatorNodeId,
    offers,
    trustedPeerKeys,
  });

  return {
    port,
    url: `ws://127.0.0.1:${port}/ws/federation`,
    operatorPublicKey: operatorKp.public_key,
    operatorNodeId,
    close: () => new Promise<void>((res) => server.close(() => res())),
  };
}
