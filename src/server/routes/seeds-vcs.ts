/**
 * Seed VCS routes: commit, log, branches, checkout, diff, merge, refs.
 * Slice 16 of the modular router split.
 */
import type { Express } from 'express';

export interface SeedsVcsDeps {
  seeds: any[];
  optionalAuth: (req: any, res: any, next: any) => void;
  authorizeSeedMutation: (seed: any, req: any, res: any, action: string, audit?: any) => any;
  resolveCommitAuthor: (req: any, res: any, author?: string) => string | null;
  vcsCommit: (objects: any, refs: any, opts: any) => Promise<any>;
  vcsLog: (objects: any, from: string, limit: number) => Promise<any[]>;
  vcsBranch: (refs: any, seedId: string, name: string, fromCommit: string) => Promise<void>;
  vcsCheckout: (refs: any, seedId: string, name: string) => Promise<void>;
  diffTrees: (a: any, b: any) => any;
  mergeCommits: (objects: any, opts: any) => Promise<any>;
  vcsEnsureRef: (refs: any, seedId: string, branch: string, commit: string) => Promise<void>;
  vcsObjects: any;
  vcsRefs: any;
  log: (level: string, msg: string, meta?: any) => void;
  audit: (action: string, resource: string, resourceId?: string, details?: any, req?: any) => void;
}

export function registerSeedsVcsRoutes(app: Express, deps: SeedsVcsDeps): void {
  const { seeds, optionalAuth, authorizeSeedMutation, resolveCommitAuthor, vcsCommit, vcsLog, vcsBranch, vcsCheckout, diffTrees, mergeCommits, vcsEnsureRef, vcsObjects, vcsRefs, log, audit } = deps;

  app.post('/api/seeds/:id/commit', optionalAuth, async (req: any, res: any) => {
    try {
      const seed = seeds.find((s: any) => s.id === req.params.id);
      if (!seed) return res.status(404).json({ detail: 'Seed not found' });
      if (!authorizeSeedMutation(seed, req, res, 'vcs.commit', audit)) return;
      const branchName = typeof req.body?.branch === 'string' && req.body.branch.length ? req.body.branch : 'main';
      const message = typeof req.body?.message === 'string' ? req.body.message : '';
      const author = resolveCommitAuthor(req, res, req.body?.author);
      if (author === null) return;
      const result = await vcsCommit(vcsObjects, vcsRefs, { seed, branch: branchName, author, message });
      audit('vcs.commit', 'seed', seed.id, { branch: branchName, commit: result.commit }, req);
      res.json({ commit: result.commit, tree: result.tree, branch: branchName, treeChanged: result.treeChanged });
    } catch (e: any) { log('WARN', 'VCS commit failed', { error: e.message }); res.status(500).json({ detail: e.message || 'Commit failed' }); }
  });

  app.get('/api/seeds/:id/refs', async (req: any, res: any) => {
    try {
      const seed = seeds.find((s: any) => s.id === req.params.id);
      if (!seed) return res.status(404).json({ detail: 'Seed not found' });
      const refs = await vcsRefs.listRefs(seed.id);
      const head = await vcsRefs.getHead(seed.id);
      res.json({ refs, head });
    } catch (e: any) { res.status(500).json({ detail: e.message || 'Ref list failed' }); }
  });

  app.get('/api/seeds/:id/log', async (req: any, res: any) => {
    try {
      const seed = seeds.find((s: any) => s.id === req.params.id);
      if (!seed) return res.status(404).json({ detail: 'Seed not found' });
      let from = typeof req.query.from === 'string' ? req.query.from : null;
      if (!from) {
        const branchName = typeof req.query.branch === 'string' && req.query.branch.length ? req.query.branch : 'main';
        const ref = await vcsRefs.getRef(seed.id, branchName);
        if (!ref) return res.json({ entries: [] });
        from = ref.commit;
      }
      const limit = Math.max(1, Math.min(500, parseInt(req.query.limit as string) || 50));
      const entries = await vcsLog(vcsObjects, from, limit);
      res.json({ entries });
    } catch (e: any) { res.status(500).json({ detail: e.message || 'Log failed' }); }
  });

  app.post('/api/seeds/:id/branches', optionalAuth, async (req: any, res: any) => {
    try {
      const seed = seeds.find((s: any) => s.id === req.params.id);
      if (!seed) return res.status(404).json({ detail: 'Seed not found' });
      if (!authorizeSeedMutation(seed, req, res, 'vcs.branch', audit)) return;
      const name = typeof req.body?.name === 'string' ? req.body.name : '';
      if (!name.length) return res.status(400).json({ detail: 'name is required' });
      let fromCommit: string | null = null;
      const fromField = req.body?.from;
      if (typeof fromField === 'string' && fromField.length) { fromCommit = fromField; }
      else if (fromField && typeof fromField === 'object' && typeof fromField.branch === 'string') {
        const srcRef = await vcsRefs.getRef(seed.id, fromField.branch);
        if (!srcRef) return res.status(404).json({ detail: `source branch ${fromField.branch} not found` });
        fromCommit = srcRef.commit;
      } else {
        const head = await vcsRefs.getHead(seed.id);
        if (!head) return res.status(400).json({ detail: 'no HEAD set; specify `from`' });
        const headRef = await vcsRefs.getRef(seed.id, head);
        if (!headRef) return res.status(400).json({ detail: 'HEAD points to missing ref' });
        fromCommit = headRef.commit;
      }
      await vcsBranch(vcsRefs, seed.id, name, fromCommit ?? 'main');
      audit('vcs.branch', 'seed', seed.id, { name, from: fromCommit }, req);
      res.json({ name, commit: fromCommit });
    } catch (e: any) { res.status(400).json({ detail: e.message || 'Branch failed' }); }
  });

  app.post('/api/seeds/:id/checkout', optionalAuth, async (req: any, res: any) => {
    try {
      const seed = seeds.find((s: any) => s.id === req.params.id);
      if (!seed) return res.status(404).json({ detail: 'Seed not found' });
      if (!authorizeSeedMutation(seed, req, res, 'vcs.checkout', audit)) return;
      const name = typeof req.body?.branch === 'string' ? req.body.branch : '';
      if (!name) return res.status(400).json({ detail: 'branch is required' });
      await vcsCheckout(vcsRefs, seed.id, name);
      audit('vcs.checkout', 'seed', seed.id, { branch: name }, req);
      res.json({ head: name });
    } catch (e: any) { res.status(400).json({ detail: e.message || 'Checkout failed' }); }
  });

  app.get('/api/seeds/:id/diff', async (req: any, res: any) => {
    try {
      const seed = seeds.find((s: any) => s.id === req.params.id);
      if (!seed) return res.status(404).json({ detail: 'Seed not found' });
      const a = typeof req.query.a === 'string' ? req.query.a : '';
      const b = typeof req.query.b === 'string' ? req.query.b : '';
      if (!a || !b) return res.status(400).json({ detail: 'a and b query params required' });
      const resolveTree = async (ref: string) => {
        if (ref === 'seed') { const { treeFromSeed } = await import('../../lib/vcs/index.js'); return treeFromSeed(seed); }
        const c = await vcsObjects.getCommit(ref);
        if (!c) throw new Error(`commit not found: ${ref}`);
        const t = await vcsObjects.getTree(c.tree);
        if (!t) throw new Error(`tree not found for commit ${ref}`);
        return t;
      };
      const [ta, tb] = await Promise.all([resolveTree(a), resolveTree(b)]);
      const diff = diffTrees(ta, tb);
      res.json(diff);
    } catch (e: any) { res.status(400).json({ detail: e.message || 'Diff failed' }); }
  });

  app.post('/api/seeds/:id/merge', optionalAuth, async (req: any, res: any) => {
    try {
      const seed = seeds.find((s: any) => s.id === req.params.id);
      if (!seed) return res.status(404).json({ detail: 'Seed not found' });
      if (!authorizeSeedMutation(seed, req, res, 'vcs.merge', audit)) return;
      const ours = typeof req.body?.ours === 'string' ? req.body.ours : '';
      const theirs = typeof req.body?.theirs === 'string' ? req.body.theirs : '';
      if (!ours || !theirs) return res.status(400).json({ detail: 'ours and theirs required' });
      const result = await mergeCommits(vcsObjects, { seed_id: seed.id, ours, theirs });
      if (!result.clean) { return res.status(409).json({ conflicts: result.conflicts, base: result.base }); }
      const target = typeof req.body?.target === 'string' ? req.body.target : null;
      if (!target) { return res.json({ clean: true, tree: result.treeHash, base: result.base, committed: false }); }
      const author = resolveCommitAuthor(req, res, req.body?.author);
      if (author === null) return;
      const message = typeof req.body?.message === 'string' ? req.body.message : `Merge ${theirs.slice(0, 8)} into ${ours.slice(0, 8)}`;
      const mergedTree = result.tree!;
      const pseudoSeed = { id: seed.id, $domain: mergedTree.domain, $name: mergedTree.name, genes: mergedTree.genes, $lineage: { generation: (seed.$lineage?.generation ?? 0) + 1, operation: 'merge' } };
      await vcsEnsureRef(vcsRefs, seed.id, target, ours);
      const currentRef = await vcsRefs.getRef(seed.id, target);
      if (currentRef && currentRef.commit !== ours) { await vcsRefs.setRef(seed.id, target, ours); }
      const committed = await vcsCommit(vcsObjects, vcsRefs, { seed: pseudoSeed, branch: target, author, message, extraParents: [theirs] });
      audit('vcs.merge', 'seed', seed.id, { ours, theirs, target, commit: committed.commit }, req);
      res.json({ clean: true, tree: committed.tree, commit: committed.commit, base: result.base, committed: true, branch: target });
    } catch (e: any) { log('WARN', 'VCS merge failed', { error: e.message }); res.status(500).json({ detail: e.message || 'Merge failed' }); }
  });
}
