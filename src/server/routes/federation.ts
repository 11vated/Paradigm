/**
 * Federation HTTP routes — Doctrine v2 Part VIII.16 v1.
 *
 * Three routes; this is the entirety of the v1 cross-operator surface.
 * No central server. Any operator can peer with any other operator by
 * pointing its client at the other's `/api/federation/info`.
 *
 *   GET /api/federation/info               — peer identity + capabilities
 *   GET /api/federation/manifest           — list of object hashes hosted
 *   GET /api/federation/objects/:hash      — fetch one object's body
 *
 * Authentication (v1):
 *   - `fully-public` objects are returned regardless of auth.
 *   - `mirror-allowed` objects require `Authorization: Bearer <token>`
 *     matching `FEDERATION_MIRROR_TOKEN`.
 *   - `private` objects are never returned over this surface.
 *
 * Determinism / verification (Part VIII.16 exit gate):
 *   - The client MUST recompute sha256(canonical(body)) and reject the
 *     response if it does not match the requested hash. The server
 *     does not need to do this — the client is the trust anchor.
 *   - The client MUST re-verify any `$sovereignty` signature on the
 *     body before treating the object as trustworthy.
 */
import type { Express, Request, Response } from 'express';
import type { PeerStore } from '../../lib/intelligence/federation/peer-store.js';
import { contentHashOf } from '../../lib/intelligence/federation/peer-store.js';

export interface FederationRouteOpts {
  store: PeerStore;
  /** Stable identifier this operator publishes to peers. */
  peerId: string;
  /** Public key (PEM, base64, hex, …) the operator uses to sign objects. */
  publicKey: string;
  /** Optional bearer token; if set, gates `mirror-allowed` objects. */
  mirrorToken?: string | undefined;
  /** Hard cap on manifest page size. */
  manifestPageSize?: number;
}

/** Federation surface version. Clients reject mismatched majors. */
export const FEDERATION_VERSION = '1.0.0' as const;

interface InfoResponse {
  peerId: string;
  publicKey: string;
  federationVersion: typeof FEDERATION_VERSION;
  objectCount: number;
  headHash: string;
  mirrorAuthRequired: boolean;
}

function trustLevel(req: Request, opts: FederationRouteOpts): 'public' | 'mirror' {
  if (!opts.mirrorToken) return 'public';
  const auth = req.header('authorization');
  if (!auth || !auth.startsWith('Bearer ')) return 'public';
  return auth.slice('Bearer '.length) === opts.mirrorToken ? 'mirror' : 'public';
}

export function registerFederationRoutes(app: Express, opts: FederationRouteOpts): void {
  const pageSize = Math.max(1, Math.min(opts.manifestPageSize ?? 1000, 10000));

  app.get('/api/federation/info', (req: Request, res: Response) => {
    const trust = trustLevel(req, opts);
    const body: InfoResponse = {
      peerId: opts.peerId,
      publicKey: opts.publicKey,
      federationVersion: FEDERATION_VERSION,
      objectCount: opts.store.size(),
      headHash: opts.store.headHash(trust),
      mirrorAuthRequired: Boolean(opts.mirrorToken),
    };
    res.json(body);
  });

  app.get('/api/federation/manifest', (req: Request, res: Response) => {
    const trust = trustLevel(req, opts);
    const all = opts.store.manifest(trust);
    const cursor = typeof req.query.cursor === 'string' ? req.query.cursor : '';
    const startIdx = cursor ? all.findIndex((e) => e.contentHash > cursor) : 0;
    const safeStart = startIdx === -1 ? all.length : startIdx;
    const page = all.slice(safeStart, safeStart + pageSize);
    const nextCursor = safeStart + pageSize < all.length ? page[page.length - 1]?.contentHash ?? null : null;
    res.json({
      headHash: opts.store.headHash(trust),
      entries: page,
      nextCursor,
    });
  });

  app.get('/api/federation/objects/:hash', (req: Request, res: Response) => {
    const hash = String(req.params.hash || '').toLowerCase();
    if (!/^[0-9a-f]{64}$/.test(hash)) {
      res.status(400).json({ error: 'invalid contentHash; expected 64 lowercase hex chars' });
      return;
    }
    const obj = opts.store.get(hash);
    if (!obj) {
      res.status(404).json({ error: 'not found' });
      return;
    }
    if (obj.visibility === 'private') {
      // Privacy-preserving: indistinguishable from not-found.
      res.status(404).json({ error: 'not found' });
      return;
    }
    if (obj.visibility === 'mirror-allowed' && trustLevel(req, opts) !== 'mirror') {
      res.status(403).json({ error: 'mirror auth required for this object' });
      return;
    }
    // Server-side sanity: refuse to serve if recomputed hash drifted (paranoid).
    if (contentHashOf(obj.body) !== obj.contentHash) {
      res.status(500).json({ error: 'object hash mismatch on server' });
      return;
    }
    res.json({
      contentHash: obj.contentHash,
      body: obj.body,
      parents: obj.parents,
      tags: obj.tags,
    });
  });

  app.post('/api/federation/publish', (req: Request, res: Response) => {
    const body = req.body as Record<string, unknown>;
    if (!body || typeof body !== 'object' || typeof body.body !== 'object' || body.body === null) {
      res.status(400).json({ error: 'body field is required and must be an object' });
      return;
    }
    const requestedVisibility = (typeof body.visibility === 'string' ? body.visibility : 'fully-public') as
      | 'fully-public'
      | 'mirror-allowed'
      | 'private';
    if (!['fully-public', 'mirror-allowed', 'private'].includes(requestedVisibility)) {
      res.status(400).json({ error: 'visibility must be fully-public | mirror-allowed | private' });
      return;
    }
    if (requestedVisibility !== 'fully-public' && trustLevel(req, opts) !== 'mirror') {
      res.status(403).json({ error: 'mirror auth required to publish non-public objects' });
      return;
    }
    const parents = Array.isArray(body.parents) ? body.parents.filter((p): p is string => typeof p === 'string') : undefined;
    const tags = Array.isArray(body.tags) ? body.tags.filter((t): t is string => typeof t === 'string') : undefined;
    try {
      const obj = opts.store.put({
        body: body.body,
        visibility: requestedVisibility,
        parents,
        tags,
      });
      res.status(201).json({
        contentHash: obj.contentHash,
        visibility: obj.visibility,
        parents: obj.parents,
        tags: obj.tags,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      res.status(500).json({ error: msg });
    }
  });
}
