/**
 * Genesis routes — Doctrine v2 Part XII (Public hero loop).
 *
 *   POST /api/genesis            { sessionToken? } → GenesisPackage
 *   GET  /api/genesis/:shortHash                   → GenesisPackage
 *   POST /api/genesis/:shortHash/fork  { forkerToken } → forked GenesisPackage
 *   GET  /api/genesis/health                       → { ok, sampleHash }
 *
 * The store is in-memory for v1. v2 wires this into the peer-store
 * so genesis seeds propagate through federation by default.
 */
import type { Express, Request, Response } from 'express';
import {
  genesisFromToken,
  packageGenesis,
  permalinkOf,
  genesisSelfCheck,
  newSessionToken,
  type GenesisPackage,
  type GenesisSeed,
} from '../../lib/genesis/genesis-engine.js';
import type { LineageNode } from '../../lib/kernel/lineage-royalty.js';

interface StoredGenesis {
  pkg: GenesisPackage;
  lineageGraph: ReadonlyArray<LineageNode>;
}

class GenesisStore {
  private readonly byShortHash = new Map<string, StoredGenesis>();

  put(pkg: GenesisPackage, lineageGraph: ReadonlyArray<LineageNode> = []): void {
    this.byShortHash.set(pkg.seed.$hash.slice(0, 16), { pkg, lineageGraph });
  }

  get(shortHash: string): StoredGenesis | undefined {
    return this.byShortHash.get(shortHash);
  }

  size(): number {
    return this.byShortHash.size;
  }

  /** Build the lineage chain for a given seed by walking parents back to root. */
  lineageOf(seed: GenesisSeed): ReadonlyArray<LineageNode> {
    const chain: LineageNode[] = [];
    const visited = new Set<string>();
    const queue: string[] = [seed.$hash];
    while (queue.length > 0) {
      const hash = queue.shift()!;
      if (visited.has(hash)) continue;
      visited.add(hash);
      const stored = this.byShortHash.get(hash.slice(0, 16));
      if (!stored) continue;
      chain.push({
        seedId: stored.pkg.seed.$hash,
        authorAddress: stored.pkg.seed.$sovereignty.authorToken,
        parents: stored.pkg.seed.$lineage.parents.map(String),
      });
      for (const p of stored.pkg.seed.$lineage.parents) {
        if (!visited.has(p)) queue.push(p);
      }
    }
    return chain;
  }
}

export interface GenesisRoutesOpts {
  store?: GenesisStore;
}

export function createGenesisStore(): GenesisStore {
  return new GenesisStore();
}

export function registerGenesisRoutes(app: Express, opts: GenesisRoutesOpts = {}): GenesisStore {
  const store = opts.store ?? new GenesisStore();

  app.get('/api/genesis/health', async (_req: Request, res: Response) => {
    const check = await genesisSelfCheck();
    res.status(check.ok ? 200 : 503).json({ ...check, storeSize: store.size() });
  });

  app.post('/api/genesis', async (req: Request, res: Response) => {
    const body = (req.body ?? {}) as { sessionToken?: unknown };
    const token = typeof body.sessionToken === 'string' && body.sessionToken.length > 0
      ? body.sessionToken
      : newSessionToken();
    const seed = genesisFromToken(token);
    const pkg = await packageGenesis(seed);
    store.put(pkg);
    res.status(201).json({ ...pkg, sessionToken: token });
  });

  app.get('/api/genesis/:shortHash', (req: Request, res: Response) => {
    const sh = String(req.params.shortHash);
    if (!/^[0-9a-f]{4,64}$/.test(sh)) {
      return res.status(400).json({ error: 'invalid short hash' });
    }
    const stored = store.get(sh.slice(0, 16));
    if (!stored) return res.status(404).json({ error: 'genesis not found', shortHash: sh });
    res.json({
      ...stored.pkg,
      lineage: store.lineageOf(stored.pkg.seed),
    });
  });

  app.post('/api/genesis/:shortHash/fork', async (req: Request, res: Response) => {
    const sh = String(req.params.shortHash);
    const body = (req.body ?? {}) as { forkerToken?: unknown };
    const forkerToken = typeof body.forkerToken === 'string' && body.forkerToken.length > 0
      ? body.forkerToken
      : newSessionToken();
    const parent = store.get(sh.slice(0, 16));
    if (!parent) return res.status(404).json({ error: 'parent genesis not found' });
    const parentLineage = store.lineageOf(parent.pkg.seed);
    const childSeed = genesisFromToken(forkerToken, [parent.pkg.seed.$hash]);
    const childPkg = await packageGenesis(childSeed, parentLineage);
    store.put(childPkg, parentLineage);
    res.status(201).json({
      ...childPkg,
      sessionToken: forkerToken,
      parent: { permalink: permalinkOf(parent.pkg.seed), $hash: parent.pkg.seed.$hash },
    });
  });

  return store;
}
