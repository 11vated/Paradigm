/**
 * Federation Peer Client — Doctrine v2 Part VIII.16 v1.
 *
 * The trust anchor of federation is the *client*, not the server.
 * Every object fetched is re-hashed, signatures re-verified, and
 * lineage edges re-checked before the object is trusted.
 *
 * v1 API:
 *   info(peerUrl)                  — handshake, federation version sanity
 *   fetchObject(peerUrl, hash)     — fetch one object; verifies hash
 *   fetchManifest(peerUrl, cursor) — paginated manifest
 *   pullSeedWithLineage(peerUrl, hash, opts)
 *                                  — recursive pull along lineage edges;
 *                                    bounded by depth + total objects
 */
import { contentHashOf, type FederationObject, type Visibility } from './peer-store.js';

export interface PeerInfo {
  peerId: string;
  publicKey: string;
  federationVersion: string;
  objectCount: number;
  headHash: string;
  mirrorAuthRequired: boolean;
}

export interface FetchedObject<TBody = unknown> {
  contentHash: string;
  body: TBody;
  parents: ReadonlyArray<string>;
  tags: ReadonlyArray<string>;
}

export class FederationError extends Error {
  constructor(
    message: string,
    readonly code: 'invalid-hash' | 'hash-mismatch' | 'http' | 'version-mismatch' | 'signature' | 'depth-exceeded' | 'object-limit',
    readonly status?: number,
  ) {
    super(message);
    this.name = 'FederationError';
  }
}

export interface ClientOpts {
  /** Bearer token offered to the peer for mirror-allowed objects. */
  mirrorToken?: string;
  /** Optional `fetch` injection for tests / non-Node runtimes. */
  fetcher?: typeof globalThis.fetch;
  /** Optional signature verifier; if absent, signatures are *not* checked. */
  verifySignature?: (body: unknown) => boolean;
}

const MAJOR_VERSION = 1;

function parseMajor(version: string): number {
  const m = /^(\d+)\./.exec(version);
  return m ? Number(m[1]) : NaN;
}

export class PeerClient {
  constructor(private readonly opts: ClientOpts = {}) {}

  private get fetcher(): typeof globalThis.fetch {
    return this.opts.fetcher ?? globalThis.fetch;
  }

  private authHeaders(): HeadersInit {
    const h: Record<string, string> = { accept: 'application/json' };
    if (this.opts.mirrorToken) h['authorization'] = `Bearer ${this.opts.mirrorToken}`;
    return h;
  }

  async info(peerUrl: string): Promise<PeerInfo> {
    const url = peerUrl.replace(/\/$/, '') + '/api/federation/info';
    const r = await this.fetcher(url, { headers: this.authHeaders() });
    if (!r.ok) throw new FederationError(`info ${r.status}`, 'http', r.status);
    const info = (await r.json()) as PeerInfo;
    if (parseMajor(info.federationVersion) !== MAJOR_VERSION) {
      throw new FederationError(
        `federation major version mismatch (peer=${info.federationVersion}, self=${MAJOR_VERSION})`,
        'version-mismatch',
      );
    }
    return info;
  }

  async fetchObject<TBody = unknown>(peerUrl: string, contentHash: string): Promise<FetchedObject<TBody>> {
    if (!/^[0-9a-f]{64}$/.test(contentHash)) {
      throw new FederationError(`invalid hash: ${contentHash}`, 'invalid-hash');
    }
    const url = peerUrl.replace(/\/$/, '') + `/api/federation/objects/${contentHash}`;
    const r = await this.fetcher(url, { headers: this.authHeaders() });
    if (!r.ok) throw new FederationError(`fetchObject ${r.status}`, 'http', r.status);
    const wrapped = (await r.json()) as FetchedObject<TBody>;

    // CLIENT IS TRUST ANCHOR — recompute hash.
    const recomputed = contentHashOf(wrapped.body);
    if (recomputed !== contentHash) {
      throw new FederationError(
        `hash mismatch: requested=${contentHash} recomputed=${recomputed}`,
        'hash-mismatch',
      );
    }
    if (this.opts.verifySignature && !this.opts.verifySignature(wrapped.body)) {
      throw new FederationError('signature verification failed', 'signature');
    }
    return wrapped;
  }

  async fetchManifest(
    peerUrl: string,
    cursor: string | null = null,
  ): Promise<{ headHash: string; entries: Array<{ contentHash: string; parents: ReadonlyArray<string>; tags: ReadonlyArray<string> }>; nextCursor: string | null }> {
    const u = new URL(peerUrl.replace(/\/$/, '') + '/api/federation/manifest');
    if (cursor) u.searchParams.set('cursor', cursor);
    const r = await this.fetcher(u.toString(), { headers: this.authHeaders() });
    if (!r.ok) throw new FederationError(`manifest ${r.status}`, 'http', r.status);
    return r.json();
  }

  /**
   * Pull an object and recursively pull its lineage parents. Returns
   * the objects in topological order (parents before children) so the
   * caller can ingest them into its own store without dangling refs.
   *
   * The recursion is bounded by `maxDepth` and `maxObjects` to prevent
   * adversarial lineage bombs from a malicious peer.
   */
  async pullSeedWithLineage<TBody = unknown>(
    peerUrl: string,
    rootHash: string,
    opts: { maxDepth?: number; maxObjects?: number } = {},
  ): Promise<Array<FetchedObject<TBody>>> {
    const maxDepth = opts.maxDepth ?? 32;
    const maxObjects = opts.maxObjects ?? 1024;
    const seen = new Set<string>();
    const order: Array<FetchedObject<TBody>> = [];

    const visit = async (hash: string, depth: number): Promise<void> => {
      if (seen.has(hash)) return;
      if (depth > maxDepth) throw new FederationError(`lineage depth > ${maxDepth}`, 'depth-exceeded');
      if (seen.size >= maxObjects) throw new FederationError(`lineage objects > ${maxObjects}`, 'object-limit');
      seen.add(hash);
      const obj = await this.fetchObject<TBody>(peerUrl, hash);
      // depth-first so parents land in `order` before children
      for (const p of obj.parents) {
        await visit(p, depth + 1);
      }
      order.push(obj);
    };

    await visit(rootHash, 0);
    return order;
  }
}

/** Convenience: re-export so tests don't need two imports. */
export { contentHashOf, type FederationObject, type Visibility };
