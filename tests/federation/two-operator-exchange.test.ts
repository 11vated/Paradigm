/**
 * Federation v1 — two-operator exchange end-to-end (Doctrine v2 Part VIII.16).
 *
 * Exit gate: "two operators exchange signed seeds without a central
 * server; lineage preserved."
 *
 * Topology under test:
 *   Operator A — Express server, hosts a signed root seed and its parent.
 *   Operator B — fresh peer with empty store, pulls the lineage from A.
 *
 * Verification (the client is the trust anchor):
 *   1. B re-derives contentHashOf(body) for every fetched object and
 *      rejects on mismatch.
 *   2. B re-verifies the signature carried in `$sovereignty`.
 *   3. B ingests in topological order (parents before child) so the
 *      lineage chain is closed at end-of-pull.
 *   4. Federation version major must match.
 *   5. `mirror-allowed` objects require the bearer token.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import express from 'express';
import type { AddressInfo } from 'node:net';
import type { Server } from 'node:http';
import { createInMemoryPeerStore, contentHashOf } from '../../src/lib/intelligence/federation/peer-store';
import { registerFederationRoutes } from '../../src/server/routes/federation';
import { PeerClient, FederationError } from '../../src/lib/intelligence/federation/peer-client';
import { SovereigntyLayer } from '../../src/lib/sovereignty';

interface SignedSeed {
  $domain: string;
  $name: string;
  $hash: string;
  $lineage?: { parents: string[] };
  genes: Record<string, unknown>;
  $sovereignty: { signature: string; public_key: string; signed_at: string };
}

function makeSeed(name: string, genes: Record<string, unknown>): Omit<SignedSeed, '$sovereignty'> & { $hash: string } {
  const draft = { $domain: 'character', $name: name, genes };
  const hash = contentHashOf(draft);
  return { ...draft, $hash: hash };
}

describe('Doctrine v2 Part VIII.16 — two-operator federation exchange', () => {
  let serverA: Server;
  let peerAUrl: string;
  let storeA: ReturnType<typeof createInMemoryPeerStore>;

  // Stable identity for operator A (deterministic test keys are fine; never re-use in prod).
  const operatorAKeys = SovereigntyLayer.generateKeys();
  const operatorAPeerId = 'peer-A.test';

  let parentHash: string;
  let childHash: string;
  let mirrorOnlyHash: string;
  const mirrorToken = 'mirror-token-deadbeef';

  beforeAll(async () => {
    storeA = createInMemoryPeerStore();

    // Build a signed parent → child lineage.
    const parentDraft = makeSeed('parent-warrior', { hp: 100 });
    const parentSov = SovereigntyLayer.signSeed(parentDraft, operatorAKeys.private_key);
    const signedParent: SignedSeed = { ...parentDraft, $sovereignty: parentSov };
    const parentPut = storeA.put({ body: signedParent, visibility: 'fully-public', parents: [], tags: ['domain:character'] });
    parentHash = parentPut.contentHash;

    const childDraft = {
      ...makeSeed('child-warrior', { hp: 120 }),
      $lineage: { parents: [parentHash] },
    };
    const childSov = SovereigntyLayer.signSeed(childDraft, operatorAKeys.private_key);
    const signedChild: SignedSeed = { ...childDraft, $sovereignty: childSov };
    const childPut = storeA.put({ body: signedChild, visibility: 'fully-public', parents: [parentHash], tags: ['domain:character'] });
    childHash = childPut.contentHash;

    // A mirror-allowed object (visible only with bearer token).
    const mirrorDraft = makeSeed('private-warrior', { hp: 999 });
    const mirrorSov = SovereigntyLayer.signSeed(mirrorDraft, operatorAKeys.private_key);
    const signedMirror: SignedSeed = { ...mirrorDraft, $sovereignty: mirrorSov };
    const mirrorPut = storeA.put({ body: signedMirror, visibility: 'mirror-allowed', parents: [], tags: ['domain:character', 'restricted'] });
    mirrorOnlyHash = mirrorPut.contentHash;

    // Stand up operator A on an ephemeral port.
    const app = express();
    registerFederationRoutes(app, {
      store: storeA,
      peerId: operatorAPeerId,
      publicKey: operatorAKeys.public_key,
      mirrorToken,
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

  it('handshake: B reads A info and major version matches', async () => {
    const client = new PeerClient();
    const info = await client.info(peerAUrl);
    expect(info.peerId).toBe(operatorAPeerId);
    expect(info.publicKey).toBe(operatorAKeys.public_key);
    expect(info.federationVersion).toMatch(/^1\./);
    expect(info.objectCount).toBe(3);
    expect(info.headHash).toMatch(/^[0-9a-f]{64}$/);
    expect(info.mirrorAuthRequired).toBe(true);
  });

  it('manifest: B sees only fully-public objects without a token', async () => {
    const client = new PeerClient();
    const m = await client.fetchManifest(peerAUrl);
    const hashes = m.entries.map((e) => e.contentHash);
    expect(hashes).toContain(parentHash);
    expect(hashes).toContain(childHash);
    expect(hashes).not.toContain(mirrorOnlyHash);
    expect(m.nextCursor).toBeNull();
  });

  it('manifest: B with mirror token sees the mirror-allowed object too', async () => {
    const client = new PeerClient({ mirrorToken });
    const m = await client.fetchManifest(peerAUrl);
    const hashes = m.entries.map((e) => e.contentHash);
    expect(hashes).toContain(mirrorOnlyHash);
  });

  it('fetchObject: hash mismatch is detected and rejected by the client', async () => {
    const client = new PeerClient();
    // Ask for a child's hash from a server route that lies about contents.
    // Simulate by injecting a fetcher that returns a tampered body.
    const tamperingClient = new PeerClient({
      fetcher: (async (_input: string | URL | Request, _init?: RequestInit) => {
        return new Response(
          JSON.stringify({ contentHash: childHash, body: { tampered: true }, parents: [], tags: [] }),
          { status: 200, headers: { 'content-type': 'application/json' } },
        );
      }) as typeof globalThis.fetch,
    });
    await expect(tamperingClient.fetchObject(peerAUrl, childHash)).rejects.toBeInstanceOf(FederationError);
    // Honest fetch on real client still works.
    const honest = await client.fetchObject<SignedSeed>(peerAUrl, childHash);
    expect(honest.contentHash).toBe(childHash);
  });

  it('signature: B verifies A\'s signature on fetched seeds', async () => {
    const client = new PeerClient({
      verifySignature: (body) => SovereigntyLayer.verifySeed(body, operatorAKeys.public_key),
    });
    const obj = await client.fetchObject<SignedSeed>(peerAUrl, childHash);
    expect(obj.body.$sovereignty).toBeDefined();
    expect(obj.body.$sovereignty.public_key).toBe(operatorAKeys.public_key);
  });

  it('signature: forged-key verification REJECTS the fetched object', async () => {
    const wrongKeys = SovereigntyLayer.generateKeys();
    const client = new PeerClient({
      verifySignature: (body) => SovereigntyLayer.verifySeed(body, wrongKeys.public_key),
    });
    await expect(client.fetchObject(peerAUrl, childHash)).rejects.toMatchObject({ code: 'signature' });
  });

  it('LINEAGE PRESERVED: B pulls child + parent in topological order', async () => {
    const client = new PeerClient({
      verifySignature: (body) => SovereigntyLayer.verifySeed(body, operatorAKeys.public_key),
    });
    const ordered = await client.pullSeedWithLineage<SignedSeed>(peerAUrl, childHash);
    // Topological: parents before children.
    expect(ordered.map((o) => o.contentHash)).toEqual([parentHash, childHash]);
    // The child references the parent it followed.
    expect(ordered[1].body.$lineage?.parents).toEqual([parentHash]);
    // Both signatures valid.
    for (const o of ordered) {
      expect(SovereigntyLayer.verifySeed(o.body, operatorAKeys.public_key)).toBe(true);
    }
  });

  it('NO CENTRAL SERVER: B ingests A\'s lineage into its own store and serves it standalone', async () => {
    const client = new PeerClient({
      verifySignature: (body) => SovereigntyLayer.verifySeed(body, operatorAKeys.public_key),
    });
    const ordered = await client.pullSeedWithLineage<SignedSeed>(peerAUrl, childHash);

    const storeB = createInMemoryPeerStore();
    for (const o of ordered) {
      storeB.put({ body: o.body, visibility: 'fully-public', parents: o.parents, tags: o.tags });
    }

    // B can now answer queries about A's lineage without ever calling A again.
    expect(storeB.has(parentHash)).toBe(true);
    expect(storeB.has(childHash)).toBe(true);
    expect(storeB.size()).toBe(2);

    // The child's parents resolve fully inside B.
    const childInB = storeB.get(childHash);
    expect(childInB).toBeDefined();
    expect(childInB!.parents).toEqual([parentHash]);
    expect(storeB.get(childInB!.parents[0])).toBeDefined();
  });

  it('mirror-allowed: 403 without token, 200 with token, lineage works either way', async () => {
    const noAuth = new PeerClient();
    await expect(noAuth.fetchObject(peerAUrl, mirrorOnlyHash)).rejects.toMatchObject({ code: 'http', status: 403 });
    const withAuth = new PeerClient({ mirrorToken });
    const obj = await withAuth.fetchObject(peerAUrl, mirrorOnlyHash);
    expect(obj.contentHash).toBe(mirrorOnlyHash);
  });
});
