/**
 * World, Quest, and Game routes.
 * Slice 20 of the modular router split.
 */
import type { Express } from 'express';

export interface WorldGameDeps {
  optionalAuth: (req: any, res: any, next: any) => void;
  createWorldSeed: (seed: string) => any;
  generateWorld: (seed: any) => any;
  breedWorlds: (a: any, b: any, opts?: any) => any;
  mutateWorld: (p: any, opts?: any) => any;
  hashArtifact: (a: any) => string;
  composeQuest: (friend: any, world: any) => any;
  createFriendSeed: (seed: string) => any;
  createGameSeed: (quest: any) => any;
  generateGame: (seed: any) => any;
  evaluateGame: (game: any) => any;
  hashGameArtifact: (a: any) => string;
  evolveGames: (opts: any) => any;
  mapElitesGames: (opts: any) => any;
  directorBrief: (brief: string) => any;
  directedSearch: (brief: string, opts: any) => any;
  log: (level: string, msg: string, meta?: any) => void;
}

const hashWorldArtifact = (a: any) => a; // placeholder
const hashGameArtifact = (a: any) => a; // placeholder

export function registerWorldGameRoutes(app: Express, deps: WorldGameDeps): void {
  const { optionalAuth, createWorldSeed, generateWorld, breedWorlds, mutateWorld, composeQuest, createFriendSeed, createGameSeed, generateGame, evaluateGame, evolveGames, mapElitesGames, directorBrief, directedSearch, log } = deps;

  app.post('/api/v1/world/generate', async (req: any, res: any) => {
    try {
      const seedStr = String(req.body?.seed ?? '');
      if (!seedStr) return res.status(400).json({ error: 'seed (string) required' });
      const worldSeed = createWorldSeed(seedStr);
      const artifact = generateWorld(worldSeed);
      res.json({ worldSeed, artifact, hash: hashWorldArtifact(artifact) });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.post('/api/v1/quest/compose', async (req: any, res: any) => {
    try {
      const friend = req.body?.friend ?? (req.body?.friendSeed ? createFriendSeed(String(req.body.friendSeed)) : null);
      const world = req.body?.world ?? (req.body?.worldSeed ? generateWorld(createWorldSeed(String(req.body.worldSeed))) : null);
      if (!friend || !world) return res.status(400).json({ error: 'friend + world (seed strings or full objects) required' });
      const quest = composeQuest(friend, world);
      res.json({ quest });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.post('/api/v1/game/generate', async (req: any, res: any) => {
    try {
      let quest: any;
      if (req.body?.quest) { quest = req.body.quest; }
      else if (req.body?.friendSeed && req.body?.worldSeed) {
        const f = createFriendSeed(String(req.body.friendSeed));
        const w = createWorldSeed(String(req.body.worldSeed));
        quest = composeQuest(f, w);
      } else { return res.status(400).json({ error: 'quest OR (friendSeed + worldSeed) required' }); }
      const gameSeed = createGameSeed(quest);
      const artifact = generateGame(gameSeed);
      res.json({ gameSeed, artifact, hash: hashGameArtifact(artifact) });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.post('/api/v1/game/evaluate', async (req: any, res: any) => {
    try {
      const f = createFriendSeed(String(req.body?.friendSeed || ''));
      const w = createWorldSeed(String(req.body?.worldSeed || ''));
      const q = composeQuest(f, w);
      const game = generateGame(createGameSeed(q));
      const report = evaluateGame(game);
      res.json({ ok: true, friend: { id: f.id, name: f.name }, world: { id: w.id, name: w.name }, gameTitle: game.title, report });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.post('/api/v1/game/evolve', optionalAuth, (req: any, res: any) => {
    try {
      const opts = { pop: Number(req.body.pop ?? 12), generations: Number(req.body.generations ?? 3), initialSeed: String(req.body.initialSeed ?? `evolve-${Date.now()}`) };
      if (opts.pop > 64 || opts.generations > 8) { return res.status(400).json({ error: 'pop <= 64, generations <= 8' }); }
      const result = evolveGames(opts);
      res.json({ best: result.best, history: result.history, topK: result.topK });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.post('/api/v1/world/breed', optionalAuth, (req: any, res: any) => {
    try {
      const a = createWorldSeed(String(req.body.parentA));
      const b = createWorldSeed(String(req.body.parentB));
      const child = breedWorlds(a, b, { salt: req.body.salt });
      res.json({ worldSeed: child });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.post('/api/v1/world/mutate', optionalAuth, (req: any, res: any) => {
    try {
      const p = createWorldSeed(String(req.body.parent));
      const child = mutateWorld(p, { salt: req.body.salt, magnitude: Number(req.body.magnitude ?? 0.2) });
      res.json({ worldSeed: child });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.post('/api/v1/game/map-elites', optionalAuth, (req: any, res: any) => {
    try {
      const r = mapElitesGames({ initialSeed: String(req.body.initialSeed ?? 'me-' + Date.now()), paceBins: Math.min(8, Math.max(1, Number(req.body.paceBins) || 4)), iterations: Math.min(200, Math.max(4, Number(req.body.iterations) || 40)), randomFraction: req.body.randomFraction });
      res.json({ filled: r.filled, total: r.total, generations: r.generations, best: r.best, cells: [...r.cells.values()] });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.post('/api/v1/game/direct', optionalAuth, (req: any, res: any) => {
    try {
      const brief = String(req.body.brief ?? '').slice(0, 1024);
      if (!brief) return res.status(400).json({ error: 'brief required' });
      const search = (req.body.search ?? true) !== false;
      const spec = directorBrief(brief);
      if (!search) return res.json({ spec });
      const r = directedSearch(brief, { iterations: Math.min(120, Math.max(8, Number(req.body.iterations) || 30)) });
      res.json(r);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });
}
