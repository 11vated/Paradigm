/**
 * DAO, Canon, Ambient, and Cosmos routes.
 * Slice 22 of the modular router split.
 */
import type { Express } from 'express';

export interface DaoDeps {
  optionalAuth: (req: any, res: any, next: any) => void;
  seeds: any[];
  trainingCanon: { register: (seed: any, license: string) => any; query: (opts: any) => any[] };
  daoProvider: { getDAOState: () => Promise<any>; propose: (targets: string[], values: string[], calldatas: string[], description: string, title: string, type: 'domain' | 'substrate' | 'governance' | 'gene_type' | 'treasury' | 'royalty_curve', payload: any, userId: string, stake: number) => Promise<any>; vote: (id: string, voter: string, support: boolean, power: number) => Promise<any>; executeProposal: (id: string) => Promise<any>; getProposals: (status?: string) => Promise<any[]> };
  log: (level: string, msg: string, meta?: any) => void;
}

export function registerDaoRoutes(app: Express, deps: DaoDeps): void {
  const { optionalAuth, seeds, trainingCanon, daoProvider, log } = deps;

  app.get('/api/cosmos/engines', async (_req: any, res: any) => {
    try {
      const { getAllDomains } = await import('../../lib/kernel/engines.js');
      const { DOMAIN_MAP } = await import('../../lib/kernel/engine-dispatcher.js');
      const pipeline = getAllDomains();
      const dispatcher = Object.keys(DOMAIN_MAP);
      const all = [...new Set([...pipeline, ...dispatcher])].sort();
      res.json({ engines: all.map((domain) => ({ domain, label: domain, contractScore: 0.85 })), count: all.length });
    } catch (e: any) { res.status(500).json({ detail: e?.message ?? 'cosmos failed' }); }
  });

  app.get('/api/ambient/peers', (_req: any, res: any) => { res.json({ peers: [], count: 0 }); });
  app.get('/api/ambient/canon', (_req: any, res: any) => { res.json({ delta: 0, registrations: [] }); });
  app.get('/api/ambient/dao', (_req: any, res: any) => { res.json({ proposalsOpen: 0, treasuryHealthy: true }); });
  app.get('/api/ambient/marketplace', (_req: any, res: any) => { res.json({ listings: 0, mints: 0 }); });

  app.get('/api/v1/dao', async (_req: any, res: any) => { res.json(await daoProvider.getDAOState()); });

  app.post('/api/v1/dao/propose', optionalAuth, async (req: any, res: any) => {
    const { title, description, type, payload, stake, targets, values, calldatas } = req.body;
    if (!title || !type || !payload) return res.status(400).json({ error: 'Missing required fields' });
    const result = await daoProvider.propose(targets || [], values || [], calldatas || [], description || '', title, type, payload, req.user?.sub || 'anonymous', stake || 0);
    if ('error' in result) return res.status(400).json(result);
    res.json(result);
  });

  app.post('/api/v1/dao/vote/:id', optionalAuth, async (req: any, res: any) => {
    const { support, votingPower } = req.body;
    const result = await daoProvider.vote(req.params.id, req.user?.sub || 'anonymous', support, votingPower || 1);
    if ('error' in result) return res.status(400).json(result);
    res.json(result);
  });

  app.post('/api/v1/dao/execute/:id', optionalAuth, async (req: any, res: any) => {
    const result = await daoProvider.executeProposal(req.params.id);
    if ('error' in result) return res.status(400).json(result);
    log('INFO', `DAO proposal executed: ${req.params.id}`, { user: req.user?.sub });
    res.json(result);
  });

  app.get('/api/v1/dao/proposals', async (_req: any, res: any) => {
    const status = _req.query.status as any;
    res.json(await daoProvider.getProposals(status));
  });

  app.post('/api/v1/canon/register', optionalAuth, (req: any, res: any) => {
    const { seedId, license } = req.body;
    const seed = seeds.find((s: any) => s.id === seedId);
    if (!seed) return res.status(404).json({ error: 'Seed not found' });
    const result = trainingCanon.register(seed, license || 'CC-BY-4.0');
    if ('error' in result) return res.status(400).json(result);
    log('INFO', `Seed registered in training canon: ${seedId}`, { license });
    res.json(result);
  });

  app.get('/api/v1/canon/query', (_req: any, res: any) => {
    const results = trainingCanon.query({ domains: _req.query.domains?.split(','), minQuality: parseFloat(_req.query.minQuality || '0'), limit: parseInt(_req.query.limit || '100', 10) });
    res.json({ count: results.length, entries: results });
  });
}
