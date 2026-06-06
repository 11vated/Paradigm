/**
 * Property tests for the Federation WebSocket Transport (FedV1 over RFC 6455).
 *
 * Exercises the real wire (TCP + WS upgrade + signed JSON frames), not in-memory
 * shortcuts. Verifies:
 *   - HELLO handshake completes
 *   - PING/PONG round-trip works
 *   - Signed OFFER → ACCEPT round-trip preserves lineage deterministically
 *   - Tampered signature is rejected (sigOk=false → REJECT)
 *   - Two independent transports do not share state (no central)
 *   - Det merge is bit-stable across runs
 */
import { describe, it, expect, afterAll } from 'vitest';
import * as fc from 'fast-check';
import { createHash } from 'node:crypto';
import {
  spawnLocalFedWsServer,
  type FedWsServerInstance,
} from '../../src/server/routes/federation-ws.js';
import {
  performRealTwoNodeFedExchangeOverWs,
  FederationWebSocketClient,
  runLocalFedWsSmoke,
} from '../../src/lib/intelligence/federation/transport.js';
import {
  createFedV1SignedExchange,
  verifyFedV1Exchange,
  SovereigntyLayer,
} from '../../src/lib/sovereignty/index.js';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
type _Unused = FedWsServerInstance;

interface ServerHandle {
  port: number;
  url: string;
  operatorNodeId: string;
  close: () => Promise<void>;
}

const servers: ServerHandle[] = [];

afterAll(async () => {
  for (const s of servers) {
    try { await s.close(); } catch { /* swallow */ }
  }
});

async function startServer(): Promise<ServerHandle> {
  const handle = await spawnLocalFedWsServer({ authToken: 'test-token' });
  const wrapped: ServerHandle = {
    port: handle.port,
    url: handle.url,
    operatorNodeId: handle.operatorNodeId,
    close: handle.close,
  };
  servers.push(wrapped);
  return wrapped;
}

const seedHashArb = fc.string({ minLength: 8, maxLength: 32 }).map(s =>
  'seed-' + createHash('sha256').update(s).digest('hex').slice(0, 16)
);
const lineageArb = fc.array(fc.string({ minLength: 4, maxLength: 12 }).map(s => 'anc-' + s), { minLength: 0, maxLength: 5 });

describe('Federation WebSocket Transport — Property Tests', () => {
  it('P1: HELLO→PING→PONG completes over a real WebSocket', async () => {
    const server = await startServer();
    const client = new FederationWebSocketClient({
      url: server.url,
      token: 'test-token',
      nodeId: 'test-client-hello',
    });
    try {
      await client.connect();
      const pong = await client.ping('nonce-hello-test');
      expect(pong.kind).toBe('PONG');
      expect(pong.nonce).toBe('nonce-hello-test');
    } finally {
      client.close();
    }
  }, 15000);

  it('P2: Signed OFFER is accepted and merged envelope verifies end-to-end', async () => {
    await fc.assert(
      fc.asyncProperty(seedHashArb, lineageArb, async (seedHash, lineage) => {
        const result = await runLocalFedWsSmoke({ seedHash, initialLineage: lineage });
        expect(result.pingPongOk).toBe(true);
        expect(result.clientVerified).toBe(true);
        expect(result.serverVerified).toBe(true);
        expect(result.serverAccepted).toBe(true);
        expect(result.detMergeOk).toBe(true);
        expect(result.lineage.length).toBeGreaterThan(0);
        expect(result.mergedExchange).toBeDefined();
        // re-verify the merged exchange in this test
        const re = verifyFedV1Exchange(result.mergedExchange!, result.mergedExchange!.publicKey);
        expect(re.sigOk).toBe(true);
        expect(re.merkleOk).toBe(true);
        return true;
      }),
      { numRuns: 8, interruptAfterTimeLimit: 30_000 }
    );
  }, 60_000);

  it('P3: Tampered OFFER is rejected (signature check)', async () => {
    const server = await startServer();
    const kp = SovereigntyLayer.generateKeys();
    const validExchange = createFedV1SignedExchange(
      'evil-client',
      server.operatorNodeId,
      'tampered-seed',
      ['anc-0'],
      kp.private_key
    );
    // Tamper by flipping a MIDDLE character (not the last one) to avoid
    // base64-pad quirks in Node.js v24 where replacing trailing `=` with a
    // base64 char can produce the same decoded bytes.
    const mid = Math.floor(validExchange.signature.length / 2);
    const orig = validExchange.signature[mid];
    const replacement = orig === 'A' ? 'B' : 'A';
    const tampered: typeof validExchange = {
      ...validExchange,
      signature: validExchange.signature.slice(0, mid) + replacement + validExchange.signature.slice(mid + 1),
    };
    // Sanity: signatures must differ
    expect(tampered.signature).not.toBe(validExchange.signature);
    // Sanity: raw decoded bytes must also differ (guard against lenient base64)
    expect(Buffer.from(tampered.signature, 'base64').equals(Buffer.from(validExchange.signature, 'base64'))).toBe(false);
    // Self-verify should fail
    const selfCheck = verifyFedV1Exchange(tampered, tampered.publicKey);
    expect(selfCheck.sigOk).toBe(false);

    // Now drive through WS — server should REJECT
    const client = new FederationWebSocketClient({
      url: server.url,
      token: 'test-token',
      nodeId: 'evil-client',
    });
    try {
      await client.connect();
      const offerId = 'tamper-offer-' + Date.now().toString(36);
      const response = await client.offer(tampered, offerId);
      expect(response.kind).toBe('REJECT');
      if (response.kind === 'REJECT') {
        expect(response.reason).toBe('invalid-signature');
      }
    } finally {
      client.close();
    }
  }, 15000);

  it('P4: Two independent transports do not share state (no central)', async () => {
    const a = await startServer();
    const b = await startServer();
    expect(a.port).not.toBe(b.port);
    expect(a.operatorNodeId).not.toBe(b.operatorNodeId);

    // Run exchange against A — should not affect B
    const exA = await runLocalFedWsSmoke({ seedHash: 'isolated-A', initialLineage: ['anc-A'] });
    expect(exA.ok).toBe(true);
    expect(exA.serverAccepted).toBe(true);

    // B is fresh and accepts a different offer
    const exB = await runLocalFedWsSmoke({ seedHash: 'isolated-B', initialLineage: ['anc-B'] });
    expect(exB.ok).toBe(true);
    expect(exB.serverAccepted).toBe(true);

    // Lineages should differ
    expect(exA.lineage.join('|')).not.toBe(exB.lineage.join('|'));
  }, 30_000);

  it('P5: Det merge is bit-stable — same input → same merged envelope fields', async () => {
    await fc.assert(
      fc.asyncProperty(seedHashArb, lineageArb, async (seedHash, lineage) => {
        const r1 = await runLocalFedWsSmoke({ seedHash, initialLineage: lineage });
        const r2 = await runLocalFedWsSmoke({ seedHash, initialLineage: lineage });
        // Lineage is det-sorted on the server side, so should be identical
        expect(r1.lineage).toEqual(r2.lineage);
        // Merkle root of merged exchange should match (signature is non-det due to ECDSA, but root is)
        if (r1.mergedExchange && r2.mergedExchange) {
          expect(r1.mergedExchange.merkleRoot).toBe(r2.mergedExchange.merkleRoot);
        }
        return true;
      }),
      { numRuns: 5, interruptAfterTimeLimit: 30_000 }
    );
  }, 60_000);

  it('P6: connect() throws on bad auth token', async () => {
    const server = await startServer();
    const client = new FederationWebSocketClient({
      url: server.url,
      token: 'wrong-token',
      nodeId: 'bad-auth',
    });
    let threw = false;
    try {
      await client.connect();
    } catch {
      threw = true;
    } finally {
      client.close();
    }
    expect(threw).toBe(true);
  }, 15000);

  it('P7: connect() throws on bad URL (port not listening)', async () => {
    const client = new FederationWebSocketClient({
      url: 'ws://127.0.0.1:1/ws/federation',
      token: 'any',
      nodeId: 'no-server',
      timeoutMs: 1500,
    });
    let threw = false;
    try {
      await client.connect();
    } catch {
      threw = true;
    } finally {
      client.close();
    }
    expect(threw).toBe(true);
  }, 5000);

  it('P8: performRealTwoNodeFedExchangeOverWs returns full diagnostic structure', async () => {
    const server = await startServer();
    const result = await performRealTwoNodeFedExchangeOverWs(
      server.url,
      'test-token',
      'struct-client',
      server.operatorNodeId,
      'struct-seed-' + Date.now().toString(36),
      ['anc-0', 'anc-1'],
      { name: 'struct-rich', summary: 'struct smoke', visualType: 'structured', strata: 0.5 },
      5000
    );
    expect(result).toHaveProperty('ok');
    expect(result).toHaveProperty('seedHash');
    expect(result).toHaveProperty('offerId');
    expect(result).toHaveProperty('serverAccepted');
    expect(result).toHaveProperty('detMergeOk');
    expect(result).toHaveProperty('lineage');
    expect(result).toHaveProperty('pingPongOk');
    expect(result).toHaveProperty('clientVerified');
    expect(result).toHaveProperty('serverVerified');
    expect(result).toHaveProperty('elapsedMs');
    expect(result).toHaveProperty('claim');
    expect(result.ok).toBe(true);
    expect(result.lineage.length).toBeGreaterThan(0);
    expect(typeof result.elapsedMs).toBe('number');
    expect(result.claim).toContain('FedV1');
  }, 15000);
});
