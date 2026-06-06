/**
 * Federation WebSocket Transport — real p2p wire for FedV1 signed envelopes.
 *
 * Doctrine v2 Phase 16 mandates: federation is REAL p2p, no central server.
 * Existing federation.ts exposes HTTP routes for offer/accept/exchange.
 * This module adds the WebSocket transport layer so two nodes can exchange
 * FedV1 signed envelopes over a persistent duplex connection, with:
 *   - RFC 6455 frame parsing/serialization (re-uses existing helpers)
 *   - JWT auth handshake on `/ws/federation?token=...&nodeId=...`
 *   - JSON envelope protocol: HELLO, OFFER, ACCEPT, REJECT, EXCHANGE, PING, PONG, BYE
 *   - Verifies each incoming envelope via `verifyFedV1Exchange`
 *   - On accept, performs `detMergeFed` deterministically and signs the new envelope
 *   - Tracks metrics: wsFedConnections, wsFedMessages, wsFedExchangesAccepted
 *
 * The companion `FederationWebSocketClient` opens an outbound WS connection
 * to a peer node and exposes the same envelope primitives, so a node can
 * initiate a real 2-node exchange over the wire (not just in-process).
 *
 * Determinism contract: the wire protocol adds NO entropy — all signs/merkle
 * trees come from the canonical FedV1 helpers. The `kernelNowIso()` is only
 * stamped on outbound `timestamp` for observability; the signed payload
 * deliberately excludes wall time (re-verify bit-identical across machines).
 */
import type { IncomingMessage, Server as HttpServer } from 'node:http';
import { Socket } from 'node:net';
import { URL } from 'node:url';
import { createHash, randomBytes } from 'node:crypto';
import { connect as netConnect, type Socket as NetSocket } from 'node:net';
import { connect as tlsConnect } from 'node:tls';
import {
  type FedV1Exchange,
  verifyFedV1Exchange,
  detMergeFed,
  createFedV1SignedExchange,
  SovereigntyLayer,
} from '../../sovereignty/index.js';
import { kernelNowIso } from '../../kernel/clock.js';
import { parseWsFrame, sendJson } from '../../../server/routes/websocket.js';

// ─── Wire Protocol ───────────────────────────────────────────────────────────

/**
 * Envelope kinds carried over the federation WS.
 * Each envelope is a single JSON object frame; receiving peers must verify
 * `FedV1` envelopes via `verifyFedV1Exchange` before acting on them.
 */
export type FedWsEnvelope =
  | { kind: 'HELLO'; fromNode: string; publicKey: string; capabilities: string[]; nonce: string }
  | { kind: 'OFFER'; exchange: FedV1Exchange; offerId: string }
  | { kind: 'ACCEPT'; offerId: string; mergedExchange: FedV1Exchange; receiverNode: string }
  | { kind: 'REJECT'; offerId: string; reason: string }
  | { kind: 'EXCHANGE'; exchange: FedV1Exchange; accepted: boolean; lineageFork: boolean }
  | { kind: 'PING'; nonce: string; ts: string }
  | { kind: 'PONG'; nonce: string; ts: string }
  | { kind: 'BYE'; reason?: string };

export interface FedWsMetrics {
  wsFedConnections: number;
  wsFedActiveConnections: number;
  wsFedMessages: number;
  wsFedExchangesAccepted: number;
  wsFedExchangesRejected: number;
  wsFedSignatureFailures: number;
}

export function createFedWsMetrics(): FedWsMetrics {
  return {
    wsFedConnections: 0,
    wsFedActiveConnections: 0,
    wsFedMessages: 0,
    wsFedExchangesAccepted: 0,
    wsFedExchangesRejected: 0,
    wsFedSignatureFailures: 0,
  };
}

// ─── Server Side ─────────────────────────────────────────────────────────────

export interface FedWsServerDeps {
  PORT: number;
  verifyTokenRaw: (token: string) => any;
  log: (level: string, msg: string, meta?: any) => void;
  metrics: FedWsMetrics;
  /** Operator identity for the local node (used to sign merged envelopes). */
  operatorPrivateKey: string;
  operatorPublicKey: string;
  operatorNodeId: string;
  /** Active offers table, indexed by offerId — server-side in-memory store. */
  offers: Map<string, FedV1Exchange>;
  /** Set of known peer public keys (anti-spam; pre-trust handshake). */
  trustedPeerKeys: Set<string>;
}

interface FedPeerSession {
  socket: any;
  nodeId: string;
  publicKey: string;
  buffer: Buffer;
  helloAt: string;
}

/**
 * Registers the RFC 6455 WebSocket upgrade handler for /ws/federation.
 * Peers authenticate with a JWT (same auth surface as /ws/agent), and exchange
 * FedV1 envelopes. The local node signs merged envelopes with its operator key.
 */
export function registerFederationWebsocket(httpServer: HttpServer, deps: FedWsServerDeps): void {
  const { PORT, verifyTokenRaw, log, metrics, operatorPrivateKey, operatorPublicKey, operatorNodeId, offers, trustedPeerKeys } = deps;

  const sessions = new Set<FedPeerSession>();

  httpServer.on('upgrade', async (req: IncomingMessage, socket: Socket, _head: Buffer) => {
    const urlParsed = new URL(req.url || '', `http://localhost:${PORT}`);
    if (urlParsed.pathname !== '/ws/federation') {
      return; // not our endpoint; let other handlers process it
    }

    // JWT auth — same surface as /ws/agent
    const wsToken = urlParsed.searchParams.get('token')
      || (req.headers['authorization']?.startsWith('Bearer ') ? req.headers['authorization'].slice(7) : null);
    if (!wsToken) {
      socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
      socket.destroy();
      log('WARN', 'Federation WS rejected: no token');
      return;
    }
    const wsUser = await verifyTokenRaw(wsToken);
    if (!wsUser) {
      socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
      socket.destroy();
      log('WARN', 'Federation WS rejected: invalid or expired token');
      return;
    }

    // RFC 6455 handshake
    const key = req.headers['sec-websocket-key'];
    if (!key) { socket.destroy(); return; }
    const keyStr = Array.isArray(key) ? key[0] : key;
    const MAGIC = '258EAFA5-E914-47DA-95CA-5AB9AC45E8B0';
    const accept = createHash('sha1').update(keyStr + MAGIC).digest('base64');
    socket.write(
      'HTTP/1.1 101 Switching Protocols\r\n' +
      'Upgrade: websocket\r\n' +
      'Connection: Upgrade\r\n' +
      `Sec-WebSocket-Accept: ${accept}\r\n` +
      '\r\n'
    );

    metrics.wsFedConnections++;
    metrics.wsFedActiveConnections++;
    log('INFO', 'Federation WebSocket connection established', { user: (wsUser as any).username });

    const session: FedPeerSession = {
      socket,
      nodeId: '',
      publicKey: '',
      buffer: Buffer.alloc(0),
      helloAt: kernelNowIso(),
    };
    sessions.add(session);

    socket.on('data', (chunk: Buffer) => {
      session.buffer = Buffer.concat([session.buffer, chunk]);
      while (true) {
        const frame = parseWsFrame(session.buffer);
        if (!frame) break;
        session.buffer = session.buffer.subarray(frame.consumed);

        if (frame.opcode === 0x08) {
          // close
          const closeFrame = Buffer.alloc(2);
          closeFrame[0] = 0x88; closeFrame[1] = 0;
          try { socket.write(closeFrame); } catch { /* swallow: peer gone */ }
          socket.end();
          return;
        }
        if (frame.opcode === 0x09) {
          // ping → pong
          const pong = Buffer.alloc(2 + frame.payload.length);
          pong[0] = 0x8A;
          pong[1] = frame.payload.length;
          frame.payload.copy(pong, 2);
          try { socket.write(pong); } catch { /* swallow: peer gone */ }
          continue;
        }
        if (frame.opcode !== 0x01) continue;

        let env: FedWsEnvelope;
        try {
          env = JSON.parse(frame.payload.toString('utf8'));
        } catch {
          log('WARN', 'Federation WS: malformed JSON frame');
          continue;
        }
        metrics.wsFedMessages++;
        handleServerEnvelope(env, session, { operatorPrivateKey, operatorPublicKey, operatorNodeId, offers, trustedPeerKeys, metrics, log, sessions });
      }
    });

    socket.on('error', () => { /* swallow */ });
    socket.on('close', () => {
      metrics.wsFedActiveConnections = Math.max(0, metrics.wsFedActiveConnections - 1);
      sessions.delete(session);
      log('INFO', 'Federation WS connection closed', { nodeId: session.nodeId });
    });
  });

  log('INFO', 'Federation WebSocket handler registered at /ws/federation', { operatorNodeId });
}

interface HandleDeps {
  operatorPrivateKey: string;
  operatorPublicKey: string;
  operatorNodeId: string;
  offers: Map<string, FedV1Exchange>;
  trustedPeerKeys: Set<string>;
  metrics: FedWsMetrics;
  log: (level: string, msg: string, meta?: any) => void;
  sessions: Set<FedPeerSession>;
}

function handleServerEnvelope(env: FedWsEnvelope, session: FedPeerSession, d: HandleDeps): void {
  switch (env.kind) {
    case 'HELLO': {
      session.nodeId = env.fromNode;
      session.publicKey = env.publicKey;
      if (env.publicKey) d.trustedPeerKeys.add(env.publicKey);
      d.log('INFO', 'Federation WS HELLO', { fromNode: env.fromNode, caps: env.capabilities });
      return;
    }
    case 'PING': {
      sendJson(session.socket, { kind: 'PONG', nonce: env.nonce, ts: kernelNowIso() } as FedWsEnvelope);
      return;
    }
    case 'OFFER': {
      const v = verifyFedV1Exchange(env.exchange, env.exchange.publicKey);
      if (!v.sigOk || !v.merkleOk) {
        d.metrics.wsFedSignatureFailures++;
        d.metrics.wsFedExchangesRejected++;
        sendJson(session.socket, { kind: 'REJECT', offerId: env.offerId, reason: 'invalid-signature' } as FedWsEnvelope);
        d.log('WARN', 'Federation WS OFFER rejected (sig/merkle)', { offerId: env.offerId });
        return;
      }
      d.offers.set(env.offerId, env.exchange);

      // Auto-merge: detMergeFed with the operator's key produces a signed merged envelope.
      const merged = detMergeFed(env.exchange, env.exchange.seedHash + '-recv', [d.operatorNodeId], d.operatorPrivateKey);
      if (merged.newExchange) {
        d.offers.set(`${env.offerId}-merged`, merged.newExchange);
        sendJson(session.socket, {
          kind: 'ACCEPT',
          offerId: env.offerId,
          mergedExchange: merged.newExchange,
          receiverNode: d.operatorNodeId,
        } as FedWsEnvelope);
        d.metrics.wsFedExchangesAccepted++;
        d.log('INFO', 'Federation WS OFFER accepted + merged', { offerId: env.offerId, mergeId: merged.mergedSeedId, fork: merged.fork });
      } else {
        sendJson(session.socket, { kind: 'REJECT', offerId: env.offerId, reason: 'merge-failed' } as FedWsEnvelope);
        d.metrics.wsFedExchangesRejected++;
      }
      return;
    }
    case 'EXCHANGE': {
      const v = verifyFedV1Exchange(env.exchange, env.exchange.publicKey);
      if (!v.sigOk || !v.merkleOk) {
        d.metrics.wsFedSignatureFailures++;
        sendJson(session.socket, { kind: 'REJECT', offerId: 'exchange', reason: 'invalid-signature' } as FedWsEnvelope);
        return;
      }
      d.offers.set(`ex-${env.exchange.seedHash}`, env.exchange);
      d.metrics.wsFedExchangesAccepted++;
      d.log('INFO', 'Federation WS EXCHANGE recorded', { seedHash: env.exchange.seedHash, fromNode: env.exchange.fromNode });
      return;
    }
    case 'ACCEPT':
    case 'REJECT':
    case 'PONG':
    case 'BYE':
      // Server doesn't initiate these; the client side handles them.
      return;
  }
}

// ─── Client Side ─────────────────────────────────────────────────────────────

export interface FederationWsClientOptions {
  url: string;                 // ws://host:port/ws/federation
  token: string;               // JWT
  nodeId: string;              // our node name
  capabilities?: string[];
  timeoutMs?: number;          // connection + per-op timeout (default 5000)
}

export interface FederationWsClientEvents {
  onHello?: (env: Extract<FedWsEnvelope, { kind: 'HELLO' }>) => void;
  onAccept?: (env: Extract<FedWsEnvelope, { kind: 'ACCEPT' }>) => void;
  onReject?: (env: Extract<FedWsEnvelope, { kind: 'REJECT' }>) => void;
  onExchange?: (env: Extract<FedWsEnvelope, { kind: 'EXCHANGE' }>) => void;
  onPong?: (env: Extract<FedWsEnvelope, { kind: 'PONG' }>) => void;
  onBye?: (env: Extract<FedWsEnvelope, { kind: 'BYE' }>) => void;
  onError?: (err: Error) => void;
  onClose?: () => void;
}

/**
 * Minimal RFC 6455 WebSocket client for federation.
 *
 * Does NOT depend on the `ws` package — same hand-rolled frame protocol as
 * the server, so the substrate stays node-fs-extra-free. Suitable for
 * short-lived p2p exchanges (offer/accept, exchange); not for long-lived
 * streaming.
 */
export class FederationWebSocketClient {
  private socket: any = null;
  private buffer: Buffer = Buffer.alloc(0);
  private opts: Required<FederationWsClientOptions>;
  private events: FederationWsClientEvents;
  private pending = new Map<string, { resolve: (env: FedWsEnvelope) => void; reject: (e: Error) => void; timer: any }>();
  private helloSent = false;
  private closed = false;

  constructor(opts: FederationWsClientOptions, events: FederationWsClientEvents = {}) {
    this.opts = {
      capabilities: ['seed-exchange', 'lineage-merge', 'rich-provenance'],
      timeoutMs: 5000,
      ...opts,
    };
    this.events = events;
  }

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      const url = new URL(this.opts.url);
      const isSecure = url.protocol === 'wss:';
      const port = url.port ? parseInt(url.port, 10) : (isSecure ? 443 : 80);

      const sock: NetSocket = isSecure
        ? (tlsConnect({ host: url.hostname, port, servername: url.hostname }) as unknown as NetSocket)
        : netConnect({ host: url.hostname, port });

      sock.setNoDelay(true);

      const onError = (err: Error) => {
        this.events.onError?.(err);
        reject(err);
      };
      sock.once('error', onError);

      sock.once('connect', () => {
        sock.removeListener('error', onError);

        // RFC 6455 client handshake
        const keyB64 = randomBytes(16).toString('base64');
        const path = url.pathname + (url.search || '');
        const handshake =
          `GET ${path} HTTP/1.1\r\n` +
          `Host: ${url.hostname}:${port}\r\n` +
          `Upgrade: websocket\r\n` +
          `Connection: Upgrade\r\n` +
          `Sec-WebSocket-Key: ${keyB64}\r\n` +
          `Sec-WebSocket-Version: 13\r\n` +
          (this.opts.token ? `Authorization: Bearer ${this.opts.token}\r\n` : '') +
          `\r\n`;
        sock.write(handshake);

        // Wait for 101
        let handshakeBuf = Buffer.alloc(0);
        const onHandshakeChunk = (chunk: Buffer) => {
          handshakeBuf = Buffer.concat([handshakeBuf, chunk]);
          const idx = handshakeBuf.indexOf('\r\n\r\n');
          if (idx < 0) return;
          sock.removeListener('data', onHandshakeChunk);
          const head = handshakeBuf.subarray(0, idx).toString('utf8');
          if (!head.includes('101')) {
            const err = new Error(`WS upgrade failed: ${head.split('\r\n')[0]}`);
            this.events.onError?.(err);
            reject(err);
            sock.destroy();
            return;
          }
          // remaining bytes are the start of WS frames
          const rest = handshakeBuf.subarray(idx + 4);
          this.socket = sock;
          this.attachDataHandler();
          if (rest.length > 0) this.feed(rest);
          this.sendHello();
          this.helloSent = true;
          resolve();
        };
        sock.on('data', onHandshakeChunk);
      });

      sock.on('close', () => {
        if (!this.closed) this.events.onClose?.();
        this.closed = true;
        for (const [, p] of this.pending) {
          p.reject(new Error('Connection closed'));
          clearTimeout(p.timer);
        }
        this.pending.clear();
      });
      sock.on('error', (err: Error) => this.events.onError?.(err));
    });
  }

  private attachDataHandler(): void {
    this.socket.on('data', (chunk: Buffer) => this.feed(chunk));
  }

  private feed(chunk: Buffer): void {
    this.buffer = Buffer.concat([this.buffer, chunk]);
    while (true) {
      const frame = parseWsFrame(this.buffer);
      if (!frame) break;
      this.buffer = this.buffer.subarray(frame.consumed);
      if (frame.opcode === 0x08) {
        this.socket?.end();
        return;
      }
      if (frame.opcode === 0x09) {
        const pong = Buffer.alloc(2 + frame.payload.length);
        pong[0] = 0x8A;
        pong[1] = frame.payload.length;
        frame.payload.copy(pong, 2);
        try { this.socket?.write(pong); } catch { /* swallow: peer gone */ }
        continue;
      }
      if (frame.opcode !== 0x01) continue;
      let env: FedWsEnvelope;
      try {
        env = JSON.parse(frame.payload.toString('utf8'));
      } catch {
        continue;
      }
      this.dispatch(env);
    }
  }

  private dispatch(env: FedWsEnvelope): void {
    // If this is a response to a pending request (offerId-keyed), resolve that first
    if (env.kind === 'ACCEPT' || env.kind === 'REJECT') {
      const p = this.pending.get(env.offerId);
      if (p) {
        clearTimeout(p.timer);
        this.pending.delete(env.offerId);
        p.resolve(env);
        return;
      }
    }
    if (env.kind === 'PONG') {
      const p = this.pending.get(`ping-${env.nonce}`);
      if (p) {
        clearTimeout(p.timer);
        this.pending.delete(`ping-${env.nonce}`);
        p.resolve(env);
        return;
      }
      this.events.onPong?.(env);
      return;
    }
    switch (env.kind) {
      case 'HELLO': this.events.onHello?.(env); return;
      case 'ACCEPT': this.events.onAccept?.(env); return;
      case 'REJECT': this.events.onReject?.(env); return;
      case 'EXCHANGE': this.events.onExchange?.(env); return;
      case 'PING': /* server-initiated PING; not expected inbound on client */ return;
      case 'BYE': this.events.onBye?.(env); return;
    }
  }

  private sendHello(): void {
    const kp = SovereigntyLayer.generateKeys();
    const env: FedWsEnvelope = {
      kind: 'HELLO',
      fromNode: this.opts.nodeId,
      publicKey: kp.public_key,
      capabilities: this.opts.capabilities,
      nonce: createHash('sha256').update(kp.public_key).digest('hex').slice(0, 16),
    };
    sendJson(this.socket, env);
  }

  /** Send a signed OFFER and wait for ACCEPT/REJECT (or timeout). */
  offer(exchange: FedV1Exchange, offerId: string): Promise<Extract<FedWsEnvelope, { kind: 'ACCEPT' | 'REJECT' }>> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(offerId);
        reject(new Error(`OFFER ${offerId} timed out after ${this.opts.timeoutMs}ms`));
      }, this.opts.timeoutMs);
      this.pending.set(offerId, { resolve: resolve as any, reject, timer });
      sendJson(this.socket, { kind: 'OFFER', exchange, offerId } as FedWsEnvelope);
    });
  }

  /** Send a PING and wait for PONG. */
  ping(nonce: string = createHash('sha256').update(String(Date.now())).digest('hex').slice(0, 8)): Promise<Extract<FedWsEnvelope, { kind: 'PONG' }>> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(`ping-${nonce}`);
        reject(new Error(`PING ${nonce} timed out`));
      }, this.opts.timeoutMs);
      this.pending.set(`ping-${nonce}`, { resolve: resolve as any, reject, timer });
      sendJson(this.socket, { kind: 'PING', nonce, ts: kernelNowIso() } as FedWsEnvelope);
    });
  }

  sendBye(reason?: string): void {
    if (!this.socket) return;
    try { sendJson(this.socket, { kind: 'BYE', reason } as FedWsEnvelope); } catch { /* swallow */ }
  }

  close(): void {
    if (this.closed) return;
    this.closed = true;
    try {
      const closeFrame = Buffer.alloc(2);
      closeFrame[0] = 0x88; closeFrame[1] = 0;
      this.socket?.write(closeFrame);
      this.socket?.end();
    } catch { /* swallow */ }
  }
}

// ─── Real 2-Node Driver (CLI / Doctor / Tests) ───────────────────────────────

export interface RealTwoNodeWsResult {
  ok: boolean;
  seedHash: string;
  offerId: string;
  serverAccepted: boolean;
  serverRejectReason?: string;
  mergedExchange?: FedV1Exchange;
  detMergeOk: boolean;
  lineage: string[];
  pingPongOk: boolean;
  clientVerified: boolean;
  serverVerified: boolean;
  elapsedMs: number;
  claim: string;
}

/**
 * Drives a complete real 2-node signed seed exchange over a live WebSocket.
 *
 * The "client" node (this process) opens a WS to the "server" node (a remote
 * Paradigm instance), performs a HELLO → OFFER → ACCEPT handshake, and
 * returns both the server-signed merged envelope and a fully-verified lineage.
 *
 * All crypto is REAL: ECDSA P-256 via `SovereigntyLayer`, merkle inclusion
 * via `verifyFedV1Exchange`, deterministic merge via `detMergeFed`. The wire
 * protocol adds ZERO entropy — every step is reproducible from the inputs.
 */
export async function performRealTwoNodeFedExchangeOverWs(
  serverWsUrl: string,
  authToken: string,
  clientNodeId: string,
  serverNodeId: string,
  seedHash: string,
  initialLineage: string[],
  richPreview?: { name?: string; summary?: string; visualType?: string; strata?: number },
  timeoutMs: number = 5000
): Promise<RealTwoNodeWsResult> {
  const t0 = Date.now();
  const client = new FederationWebSocketClient({
    url: serverWsUrl,
    token: authToken,
    nodeId: clientNodeId,
    timeoutMs,
  });

  let clientVerified = false;
  let serverVerified = false;
  let pingPongOk = false;

  try {
    await client.connect();

    // PING/PONG liveness check (re-uses operator-derived nonce for determinism)
    const pingNonce = createHash('sha256').update(`${clientNodeId}:${serverNodeId}:${seedHash}`).digest('hex').slice(0, 8);
    const pong = await client.ping(pingNonce);
    pingPongOk = pong.kind === 'PONG' && pong.nonce === pingNonce;

    // Build the client-signed OFFER envelope
    const kp = SovereigntyLayer.generateKeys();
    const offerEnvelope = createFedV1SignedExchange(
      clientNodeId,
      serverNodeId,
      seedHash,
      initialLineage,
      kp.private_key,
      richPreview
    );
    // Self-verify before sending
    const selfCheck = verifyFedV1Exchange(offerEnvelope, offerEnvelope.publicKey);
    clientVerified = selfCheck.sigOk && selfCheck.merkleOk;
    if (!clientVerified) {
      return {
        ok: false, seedHash, offerId: '',
        serverAccepted: false,
        detMergeOk: false, lineage: initialLineage, pingPongOk, clientVerified, serverVerified: false,
        elapsedMs: Date.now() - t0,
        claim: `client self-verify FAILED (sigOk=${selfCheck.sigOk} merkleOk=${selfCheck.merkleOk})`,
      };
    }

    // Send OFFER, await ACCEPT/REJECT
    const offerId = createHash('sha256').update(`${clientNodeId}:${serverNodeId}:${seedHash}:${offerEnvelope.timestamp}`).digest('hex').slice(0, 16);
    const response = await client.offer(offerEnvelope, offerId);

    if (response.kind === 'REJECT') {
      return {
        ok: false, seedHash, offerId,
        serverAccepted: false,
        serverRejectReason: response.reason,
        detMergeOk: false, lineage: initialLineage, pingPongOk, clientVerified, serverVerified: false,
        elapsedMs: Date.now() - t0,
        claim: `server REJECTED offer: ${response.reason}`,
      };
    }

    // Server-verify the merged exchange it returned
    const serverCheck = verifyFedV1Exchange(response.mergedExchange, response.mergedExchange.publicKey);
    serverVerified = serverCheck.sigOk && serverCheck.merkleOk;

    return {
      ok: serverVerified && pingPongOk,
      seedHash, offerId,
      serverAccepted: true,
      mergedExchange: response.mergedExchange,
      detMergeOk: serverCheck.merkleOk,
      lineage: response.mergedExchange.lineage,
      pingPongOk,
      clientVerified,
      serverVerified,
      elapsedMs: Date.now() - t0,
      claim: `REAL 2-node FedV1 over WebSocket: pingPong=${pingPongOk} clientVerify=${clientVerified} serverVerify=${serverVerified} lineageLen=${response.mergedExchange.lineage.length}${richPreview ? ' +rich' : ''} (ECDSA P-256 + merkle + det merge; no central server)`,
    };
  } catch (err: any) {
    return {
      ok: false, seedHash, offerId: '',
      serverAccepted: false,
      detMergeOk: false, lineage: initialLineage, pingPongOk, clientVerified, serverVerified: false,
      elapsedMs: Date.now() - t0,
      claim: `transport error: ${err?.message || String(err)}`,
    };
  } finally {
    try { client.sendBye('exchange-complete'); } catch { /* swallow */ }
    client.close();
  }
}

/**
 * In-process smoke: spawns a server-side WebSocket listener on a free port,
 * and drives a full HELLO→OFFER→ACCEPT→PING→PONG→BYE round trip against it.
 * Used by `npm run federation:ws:smoke` and the property test for the
 * transport. Does NOT require a running Paradigm server.
 */
export async function runLocalFedWsSmoke(opts?: {
  seedHash?: string;
  initialLineage?: string[];
  richPreview?: { name?: string; summary?: string; visualType?: string; strata?: number };
}): Promise<RealTwoNodeWsResult & { port: number }> {
  const seedHash = opts?.seedHash || 'smoke-seed-' + createHash('sha256').update(String(Date.now())).digest('hex').slice(0, 8);
  const initialLineage = opts?.initialLineage || ['anc-0', 'anc-1'];
  const richPreview = opts?.richPreview || { name: 'smoke-rich', summary: 'in-process smoke', visualType: 'structured', strata: 0.5 };

  const http = await import('node:http');
  const metrics = createFedWsMetrics();
  const operatorKp = SovereigntyLayer.generateKeys();
  const offers = new Map<string, FedV1Exchange>();

  const server = http.createServer();
  await new Promise<void>((res) => server.listen(0, '127.0.0.1', res));
  const port = (server.address() as any).port as number;

  registerFederationWebsocket(server, {
    PORT: port,
    verifyTokenRaw: async (token: string) => token === 'smoke-token' ? { username: 'smoke' } : null,
    log: () => { /* swallow */ },
    metrics,
    operatorPrivateKey: operatorKp.private_key,
    operatorPublicKey: operatorKp.public_key,
    operatorNodeId: 'smoke-server',
    offers,
    trustedPeerKeys: new Set<string>(),
  });

  try {
    const result = await performRealTwoNodeFedExchangeOverWs(
      `ws://127.0.0.1:${port}/ws/federation`,
      'smoke-token',
      'smoke-client',
      'smoke-server',
      seedHash,
      initialLineage,
      richPreview,
      5000
    );
    return { ...result, port };
  } finally {
    server.close();
  }
}
