/**
 * Friend routes: generate, breed, mutate, list, get, delete, sovereignty,
 * keys, anchor, marketplace, notes, lineage.
 * Slice 19 of the modular router split.
 */
import type { Express } from 'express';

export interface FriendDeps {
  optionalAuth: (req: any, res: any, next: any) => void;
  validateBody: (schema: any) => any;
  FriendGenerateSchema: any;
  FriendBreedSchema: any;
  FriendMutateSchema: any;
  FriendAnchorSchema: any;
  friendStore: { has: (id: string) => boolean; get: (id: string) => any; add: (f: any) => Promise<any>; remove: (id: string) => Promise<boolean>; list: (opts: any) => any[]; count: () => number; stats: () => any; lineage: (id: string, depth: number) => any; getNotes: (id: string, limit?: number) => any[]; appendNote: (id: string, note: any) => any; clearNotes: (id: string) => number };
  createFriendSeed: (seed: string, opts?: any) => any;
  generateFriend: (seed: any) => any;
  breedFriends: (a: any, b: any, salt: string) => any;
  mutateFriend: (parent: any, magnitude: number, salt: string) => any;
  generateFriendKeyPair: () => Promise<any>;
  signFriendSeed: (friend: any, priv: string, pub: string) => Promise<any>;
  verifyFriendSovereignty: (friend: any) => Promise<any>;
  prepareFriendMint: (friend: any) => any;
  anchorFriendOnChain: (opts: any) => Promise<any>;
  prepareList: (friend: any, priceWei: string) => any;
  prepareDelist: (friend: any) => any;
  prepareBuy: (friend: any, priceWei: string) => any;
  crypto: { createHash: (algo: string) => { update: (d: string, enc?: string) => any; digest: (enc: string) => string } };
  log: (level: string, msg: string, meta?: any) => void;
}

export function registerFriendRoutes(app: Express, deps: FriendDeps): void {
  const { optionalAuth, validateBody, FriendGenerateSchema, FriendBreedSchema, FriendMutateSchema, FriendAnchorSchema, friendStore, createFriendSeed, generateFriend, breedFriends, mutateFriend, generateFriendKeyPair, signFriendSeed, verifyFriendSovereignty, prepareFriendMint, anchorFriendOnChain, prepareList, prepareDelist, prepareBuy, crypto, log } = deps;

  app.post('/api/v1/friend/generate', optionalAuth, validateBody(FriendGenerateSchema), async (req: any, res: any) => {
    try {
      const { seed, name, archetypeBias } = req.body;
      const friendSeed = createFriendSeed(seed, { name, archetypeBias });
      const artifact = generateFriend(friendSeed);
      const existed = friendStore.has(friendSeed.id);
      await friendStore.add(friendSeed);
      log('INFO', existed ? 'Friend retrieved (already in store)' : 'Friend generated and stored', { id: friendSeed.id, name: friendSeed.name });
      res.json({ friendSeed, artifact, stored: !existed });
    } catch (e: any) { log('ERROR', 'Friend generate error', { error: e.message }); res.status(400).json({ error: 'Friend generation failed', message: e.message }); }
  });

  app.post('/api/v1/friend/breed', optionalAuth, validateBody(FriendBreedSchema), async (req: any, res: any) => {
    try {
      const { parentA, parentB, parentAId, parentBId, salt } = req.body as { parentA?: string; parentB?: string; parentAId?: string; parentBId?: string; salt?: string };
      const resolve = (id?: string, str?: string, label?: string): any => {
        if (id) { const f = friendStore.get(id); if (!f) throw new Error(`${label} id not found: ${id}`); return f; }
        if (str) return createFriendSeed(str);
        throw new Error(`${label} not provided (expected parent string or parentId)`);
      };
      const a = resolve(parentAId, parentA, 'parentA');
      const b = resolve(parentBId, parentB, 'parentB');
      const child = breedFriends(a, b, salt ?? '');
      const artifact = generateFriend(child);
      await friendStore.add(a); await friendStore.add(b);
      const existed = friendStore.has(child.id);
      await friendStore.add(child);
      log('INFO', 'Friend bred', { id: child.id, parents: [a.id, b.id], generation: child.derivation?.generation, newToStore: !existed });
      res.json({ friendSeed: child, artifact, parents: { a, b }, stored: !existed });
    } catch (e: any) { log('ERROR', 'Friend breed error', { error: e.message }); res.status(400).json({ error: 'Friend breed failed', message: e.message }); }
  });

  app.post('/api/v1/friend/mutate', optionalAuth, validateBody(FriendMutateSchema), async (req: any, res: any) => {
    try {
      const { parent, parentId, magnitude = 0.15, salt = '' } = req.body as { parent?: string; parentId?: string; magnitude?: number; salt?: string };
      let parentSeed: any;
      if (parentId) { const found = friendStore.get(parentId); if (!found) throw new Error(`parentId not found: ${parentId}`); parentSeed = found; }
      else if (parent) { parentSeed = createFriendSeed(parent); }
      else { throw new Error('parent or parentId required'); }
      const mutated = mutateFriend(parentSeed, magnitude, salt);
      const artifact = generateFriend(mutated);
      await friendStore.add(parentSeed);
      const existed = friendStore.has(mutated.id);
      await friendStore.add(mutated);
      log('INFO', 'Friend mutated', { id: mutated.id, parent: parentSeed.id, magnitude, newToStore: !existed });
      res.json({ friendSeed: mutated, artifact, parent: parentSeed, stored: !existed });
    } catch (e: any) { log('ERROR', 'Friend mutate error', { error: e.message }); res.status(400).json({ error: 'Friend mutate failed', message: e.message }); }
  });

  app.get('/api/v1/friend/list', (req: any, res: any) => {
    const offset = Number.parseInt(String(req.query.offset ?? '0'), 10);
    const limit = Math.min(Number.parseInt(String(req.query.limit ?? '50'), 10), 200);
    const operator = req.query.operator as 'genesis' | 'breed' | 'mutate' | undefined;
    const friends = friendStore.list({ offset, limit, operator });
    res.json({ total: friendStore.count(), offset, limit, operator: operator ?? null, stats: friendStore.stats(), friends });
  });

  app.get('/api/v1/friend/:id', (req: any, res: any) => {
    const f = friendStore.get(req.params.id);
    if (!f) return res.status(404).json({ error: 'Friend not found' });
    const artifact = generateFriend(f);
    res.json({ friendSeed: f, artifact });
  });

  app.get('/api/v1/friend/:id/lineage', (req: any, res: any) => {
    const depth = Math.min(Number.parseInt(String(req.query.depth ?? '6'), 10), 20);
    const lineage = friendStore.lineage(req.params.id, depth);
    if (!lineage) return res.status(404).json({ error: 'Friend not found' });
    const self = friendStore.get(req.params.id)!;
    res.json({ self: { id: self.id, name: self.name, generation: self.derivation?.generation ?? 0 }, ancestors: lineage.ancestors, descendants: lineage.descendants, depth });
  });

  app.delete('/api/v1/friend/:id', optionalAuth, async (req: any, res: any) => {
    const removed = await friendStore.remove(req.params.id);
    if (!removed) return res.status(404).json({ error: 'Friend not found' });
    log('INFO', 'Friend removed from store', { id: req.params.id });
    res.json({ removed: true, id: req.params.id });
  });

  app.post('/api/v1/friend/keys/generate', async (_req: any, res: any) => {
    try {
      const kp = await generateFriendKeyPair();
      log('INFO', 'Friend keypair generated', { publicKeyFingerprint: crypto.createHash('sha256').update(kp.publicKey, 'utf8').digest('hex').slice(0, 12) });
      res.json({ ...kp, algorithm: 'ECDSA-P256-SHA256' });
    } catch (e: any) { log('ERROR', 'Keypair generation failed', { error: e.message }); res.status(500).json({ error: 'Keypair generation failed', detail: e.message }); }
  });

  app.post('/api/v1/friend/:id/sign', optionalAuth, async (req: any, res: any) => {
    try {
      const friend = await friendStore.get(req.params.id);
      if (!friend) return res.status(404).json({ error: 'Friend not found' });
      const { privateKey, publicKey } = req.body || {};
      if (!privateKey || !publicKey) { return res.status(400).json({ error: 'privateKey and publicKey (both JWK strings) are required' }); }
      const signed = await signFriendSeed(friend, privateKey, publicKey);
      await friendStore.add(signed);
      log('INFO', 'Friend signed', { id: signed.id, publicKeyFingerprint: crypto.createHash('sha256').update(publicKey, 'utf8').digest('hex').slice(0, 12) });
      res.json({ friend: signed, sovereignty: signed.sovereignty });
    } catch (e: any) { log('WARN', 'Friend signing failed', { id: req.params.id, error: e.message }); res.status(400).json({ error: 'Signing failed', detail: e.message }); }
  });

  app.post('/api/v1/friend/:id/verify', async (req: any, res: any) => {
    const f = friendStore.get(req.params.id);
    if (!f) return res.status(404).json({ error: 'Friend not found' });
    const result = await verifyFriendSovereignty(f);
    res.json(result);
  });

  app.post('/api/v1/friend/:id/anchor/prepare', optionalAuth, (req: any, res: any) => {
    const f = friendStore.get(req.params.id);
    if (!f) return res.status(404).json({ error: 'Friend not found' });
    if (!f.sovereignty) { return res.status(400).json({ error: 'friend must be signed before anchoring on-chain' }); }
    const prepared = prepareFriendMint(f);
    res.json(prepared);
  });

  app.post('/api/v1/friend/:id/anchor', optionalAuth, validateBody(FriendAnchorSchema), async (req: any, res: any) => {
    const f = friendStore.get(req.params.id);
    if (!f) return res.status(404).json({ error: 'Friend not found' });
    log('INFO', 'Friend anchor requested', { friendId: f.id, ownerAddress: req.body.ownerAddress, contractAddress: req.body.contractAddress ?? '(env default)', network: req.body.network ?? '(default)' });
    const result = await anchorFriendOnChain({ friend: f, ownerAddress: req.body.ownerAddress, privateKey: req.body.privateKey, contractAddress: req.body.contractAddress, rpcUrl: req.body.rpcUrl, network: req.body.network, ipfsCid: req.body.ipfsCid });
    if (!result.success || !result.anchor) { log('WARN', 'Friend anchor failed', { friendId: f.id, error: result.error }); return res.status(400).json({ error: result.error ?? 'anchor failed' }); }
    const updated: any = { ...f, sovereignty: { ...f.sovereignty!, anchor: result.anchor } };
    await friendStore.add(updated);
    log('INFO', 'Friend anchored on-chain', { friendId: f.id, tokenId: result.anchor.tokenId, txHash: result.anchor.transactionHash, network: result.anchor.network });
    res.json({ friendSeed: updated, anchor: result.anchor });
  });

  app.post('/api/v1/friend/:id/list', optionalAuth, async (req: any, res: any) => {
    try {
      const friend = await friendStore.get(req.params.id);
      if (!friend) return res.status(404).json({ error: 'Friend not found' });
      const priceWei = String(req.body?.priceWei || '');
      if (!/^\d+$/.test(priceWei)) return res.status(400).json({ error: 'priceWei (decimal string) required' });
      const prep = prepareList(friend, priceWei);
      res.json({ ok: true, prep });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.post('/api/v1/friend/:id/delist', optionalAuth, async (req: any, res: any) => {
    try {
      const friend = await friendStore.get(req.params.id);
      if (!friend) return res.status(404).json({ error: 'Friend not found' });
      const prep = prepareDelist(friend);
      res.json({ ok: true, prep });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.post('/api/v1/friend/:id/buy', optionalAuth, async (req: any, res: any) => {
    try {
      const friend = await friendStore.get(req.params.id);
      if (!friend) return res.status(404).json({ error: 'Friend not found' });
      const priceWei = String(req.body?.priceWei || '');
      if (!/^\d+$/.test(priceWei)) return res.status(400).json({ error: 'priceWei (decimal string) required' });
      const prep = prepareBuy(friend, priceWei);
      res.json({ ok: true, prep });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.get('/api/v1/friend/:id/notes', (req: any, res: any) => {
    const f = friendStore.get(req.params.id);
    if (!f) return res.status(404).json({ error: 'Friend not found' });
    const limit = req.query.limit ? Math.max(1, Math.min(500, Number(req.query.limit))) : undefined;
    return res.json({ notes: friendStore.getNotes(f.id, limit) });
  });

  app.post('/api/v1/friend/:id/notes', optionalAuth, (req: any, res: any) => {
    const f = friendStore.get(req.params.id);
    if (!f) return res.status(404).json({ error: 'Friend not found' });
    const text = String(req.body?.text ?? '').trim();
    if (!text) return res.status(400).json({ error: 'text required' });
    if (text.length > 4096) return res.status(400).json({ error: 'text too long (max 4096)' });
    const kind = (req.body?.kind ?? 'user') as 'user' | 'friend' | 'observation' | 'milestone';
    if (!['user', 'friend', 'observation', 'milestone'].includes(kind)) { return res.status(400).json({ error: 'invalid kind' }); }
    const note = friendStore.appendNote(f.id, { text, kind, recordedAt: new Date().toISOString() });
    return res.json({ ok: true, note });
  });

  app.delete('/api/v1/friend/:id/notes', optionalAuth, (req: any, res: any) => {
    const f = friendStore.get(req.params.id);
    if (!f) return res.status(404).json({ error: 'Friend not found' });
    const cleared = friendStore.clearNotes(f.id);
    return res.json({ ok: true, cleared });
  });
}
