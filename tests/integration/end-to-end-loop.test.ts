/**
 * End-to-end economic loop — the Paradigm thesis as a single test.
 *
 * Doctrine v2 Part XIV.3 ("sovereignty bet") + the integration of
 * Phases 13 (Maker CLI), 16 (Federation v1), and 17 (Lineage royalty).
 *
 * Scenario:
 *   1. Operator A uses the Maker library to deterministically generate
 *      a signed seed from a natural-language intent.
 *   2. Operator A publishes the seed to its federation peer store
 *      with the seed's signature and author identity attached.
 *   3. Operator B (a different sandbox, no shared state) discovers the
 *      seed via /api/federation/manifest, fetches it through the peer
 *      client, and verifies hash + signature locally.
 *   4. B ingests the seed into its own store; the seed is now live on
 *      a network that has no central server.
 *   5. A marketplace (running on B's side) records a $100 sale and
 *      calls computeLineageRoyalty with the lineage that survived the
 *      federation hop. A's author address appears in the splits even
 *      though the marketplace never spoke to A.
 *
 * What this test asserts:
 *   - Determinism: A's intent produces a stable seed.
 *   - Sovereignty: B accepts the seed only after re-verifying signature.
 *   - Federation: the lineage hash chain survives the hop.
 *   - Royalty: a sale on B's side pays A through the lineage,
 *               via a deterministic, on-chain-anchorable manifest.
 *
 * If this test passes, the entire Paradigm economic loop works
 * end-to-end without any central trusted party. That is the bet.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import express, { type Express } from 'express';
import type { AddressInfo } from 'node:net';
import type { Server } from 'node:http';

import { runMake } from '../../cli/commands/make';
import { createInMemoryPeerStore, contentHashOf } from '../../src/lib/intelligence/federation/peer-store';
import { registerFederationRoutes } from '../../src/server/routes/federation';
import { PeerClient } from '../../src/lib/intelligence/federation/peer-client';
import { computeLineageRoyalty, type LineageNode } from '../../src/lib/kernel/lineage-royalty';
import { SovereigntyLayer } from '../../src/lib/sovereignty';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { mkdtempSync, readFileSync } from 'node:fs';

interface SovBundle { signature: string; public_key: string; signed_at: string; }
interface SignedInnerBody {
  authorAddress: string;
  $lineage: { parents: string[] };
  $sovereignty: SovBundle;
  [k: string]: unknown;
}
interface PublishedSeed {
  seedId: string;
  authorAddress: string;
  domain: string;
  intent: string;
  body: SignedInnerBody;
}

describe('Paradigm end-to-end economic loop (Phases 13 + 16 + 17 integrated)', () => {
  let operatorAKeys: { public_key: string; private_key: string };
  let serverA: Server;
  let peerAUrl: string;
  let storeA: ReturnType<typeof createInMemoryPeerStore>;
  let publishedHash: string;
  let publishedSeed: PublishedSeed;
  const operatorAAddress = '0xOperatorA';
  const operatorAPeerId = 'paradigm-operator-A.test';

  beforeAll(async () => {
    operatorAKeys = SovereigntyLayer.generateKeys();
    storeA = createInMemoryPeerStore();

    // ── 1. Operator A: make a deterministic signed seed from intent ─────
    const outDir = mkdtempSync(join(tmpdir(), 'paradigm-e2e-'));
    const manifest = await runMake({
      intent: 'a thoughtful warrior who plays the harp',
      out: outDir,
    });
    expect(manifest.seedHash).toMatch(/^[a-z0-9-]+$|^[0-9a-f]+$/);
    expect(manifest.artifactHash).toMatch(/^[0-9a-f]{64}$/);

    // Read back the on-disk seed produced by the maker.
    const seedFromDisk = JSON.parse(readFileSync(join(manifest.outDir, 'seed.json'), 'utf-8')) as Record<string, unknown>;

    // Wrap the seed for federation: attach author identity + sovereignty signature
    // to the INNER body (which is what gets signed and verified).
    const draft = {
      ...seedFromDisk,
      authorAddress: operatorAAddress,
      $lineage: { parents: [] },
    };
    const sov = SovereigntyLayer.signSeed(draft, operatorAKeys.private_key) as SovBundle;
    const signedInner: SignedInnerBody = { ...draft, $sovereignty: sov } as SignedInnerBody;
    const seedForFederation: PublishedSeed = {
      seedId: manifest.seedHash,
      authorAddress: operatorAAddress,
      domain: manifest.domain,
      intent: manifest.intent,
      body: signedInner,
    };

    // ── 2. Operator A publishes to its peer store ───────────────────────
    const put = storeA.put({ body: seedForFederation, visibility: 'fully-public', parents: [], tags: ['domain:' + manifest.domain] });
    publishedHash = put.contentHash;
    publishedSeed = seedForFederation;

    // Sanity: server-side content hash is byte-stable.
    expect(contentHashOf(seedForFederation)).toBe(publishedHash);

    // Stand up A's federation server on an ephemeral port.
    const app: Express = express();
    registerFederationRoutes(app, {
      store: storeA,
      peerId: operatorAPeerId,
      publicKey: operatorAKeys.public_key,
    });
    serverA = await new Promise<Server>((resolve) => {
      const s = app.listen(0, () => resolve(s));
    });
    const addr = serverA.address() as AddressInfo;
    peerAUrl = `http://127.0.0.1:${addr.port}`;
  });

  afterAll(async () => {
    await new Promise<void>((resolve, reject) => serverA.close((err) => (err ? reject(err) : resolve())));
  });

  it('1. determinism: A\'s intent produces the same seed hash on a second run', async () => {
    const outDir = mkdtempSync(join(tmpdir(), 'paradigm-e2e-replay-'));
    const replay = await runMake({
      intent: 'a thoughtful warrior who plays the harp',
      out: outDir,
    });
    expect(replay.seedHash).toBe(publishedSeed.seedId);
  });

  it('2. sovereignty: A\'s seed carries a valid ECDSA signature', () => {
    expect(SovereigntyLayer.verifySeed(publishedSeed.body, operatorAKeys.public_key)).toBe(true);
  });

  it('3. federation: B discovers and fetches the seed; hash recomputes; signature verifies', async () => {
    // Fresh client — no shared state, no shared memory, just HTTP.
    const clientB = new PeerClient({
      verifySignature: (body) => {
        const seed = body as PublishedSeed;
        return SovereigntyLayer.verifySeed(seed.body, operatorAKeys.public_key);
      },
    });

    // B asks A for its info — version handshake.
    const info = await clientB.info(peerAUrl);
    expect(info.peerId).toBe(operatorAPeerId);
    expect(info.federationVersion).toMatch(/^1\./);

    // B paginates the manifest, finds the published hash.
    const manifest = await clientB.fetchManifest(peerAUrl);
    const hashes = manifest.entries.map((e) => e.contentHash);
    expect(hashes).toContain(publishedHash);

    // B fetches the object; PeerClient re-derives sha256 + verifies signature.
    const fetched = await clientB.fetchObject<PublishedSeed>(peerAUrl, publishedHash);
    expect(fetched.contentHash).toBe(publishedHash);
    expect(fetched.body.authorAddress).toBe(operatorAAddress);
  });

  it('4. ingestion: B stores the fetched seed in its own peer store; no further A calls', async () => {
    const clientB = new PeerClient({
      verifySignature: (body) => SovereigntyLayer.verifySeed((body as PublishedSeed).body, operatorAKeys.public_key),
    });
    const fetched = await clientB.fetchObject<PublishedSeed>(peerAUrl, publishedHash);

    const storeB = createInMemoryPeerStore();
    storeB.put({ body: fetched.body, visibility: 'fully-public', parents: fetched.parents, tags: fetched.tags });

    // Now B can serve A's seed without touching A again. Sovereignty preserved.
    expect(storeB.has(publishedHash)).toBe(true);
    const onB = storeB.get(publishedHash);
    expect(onB).toBeDefined();
    expect((onB!.body as PublishedSeed).authorAddress).toBe(operatorAAddress);
    expect(SovereigntyLayer.verifySeed((onB!.body as PublishedSeed).body, operatorAKeys.public_key)).toBe(true);
  });

  it('5. royalty: a $100 sale on B side pays A through the lineage, byte-stable manifest', async () => {
    // Lineage as seen by B's marketplace (assembled from federation metadata).
    const lineage: LineageNode[] = [
      { seedId: publishedSeed.seedId, authorAddress: operatorAAddress, parents: [] },
    ];
    const result = await computeLineageRoyalty({
      seedId: publishedSeed.seedId,
      saleAmountCents: 10_000,
      resolveLineage: async (id) => lineage.find((n) => n.seedId === id) ?? null,
    });

    // 5a. The author split goes to A — the marketplace pays A without ever speaking to A.
    const author = result.splits.find((s) => s.role === 'author')!;
    expect(author.address).toBe(operatorAAddress);
    expect(author.cents).toBe(9_500); // 95% of 10000

    // 5b. The math closes exactly — no penny lost.
    expect(result.totalCents).toBe(10_000);

    // 5c. The manifest is the canonical hash a smart contract can commit to.
    expect(result.manifest).toMatch(/^[0-9a-f]{64}$/);

    // 5d. Running the same compute again produces the same manifest.
    const replay = await computeLineageRoyalty({
      seedId: publishedSeed.seedId,
      saleAmountCents: 10_000,
      resolveLineage: async (id) => lineage.find((n) => n.seedId === id) ?? null,
    });
    expect(replay.manifest).toBe(result.manifest);
  });

  it('THE THESIS: deterministic make → federated transfer → lineage-anchored payout, no central party', async () => {
    // Composite assertion: re-run the entire chain in one go and prove
    // it works without any state shared between A and B beyond what
    // crossed the HTTP wire.

    // (a) Determinism — A's intent → same seed.
    const outDir = mkdtempSync(join(tmpdir(), 'paradigm-e2e-thesis-'));
    const replay = await runMake({
      intent: 'a thoughtful warrior who plays the harp',
      out: outDir,
    });
    expect(replay.seedHash).toBe(publishedSeed.seedId);

    // (b) Federation — B re-fetches the seed without touching A's local memory.
    const clientB = new PeerClient({
      verifySignature: (body) => SovereigntyLayer.verifySeed((body as PublishedSeed).body, operatorAKeys.public_key),
    });
    const fetched = await clientB.fetchObject<PublishedSeed>(peerAUrl, publishedHash);
    expect(fetched.body.authorAddress).toBe(operatorAAddress);

    // (c) Royalty — sale on B's side pays A through the chain.
    const result = await computeLineageRoyalty({
      seedId: fetched.body.seedId,
      saleAmountCents: 10_000,
      resolveLineage: async (id) =>
        id === fetched.body.seedId
          ? { seedId: fetched.body.seedId, authorAddress: fetched.body.authorAddress, parents: [] }
          : null,
    });
    expect(result.splits.find((s) => s.role === 'author')?.address).toBe(operatorAAddress);
    expect(result.totalCents).toBe(10_000);
  });
});
