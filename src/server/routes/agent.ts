/**
 * Agent routes: query, stream, async, agents, memory, stats, help, inference.
 * Slice 18 of the modular router split.
 */
import type { Express } from 'express';

export interface AgentDeps {
  seeds: any[];
  saveSeeds: () => void;
  optionalAuth: (req: any, res: any, next: any) => void;
  validateBody: (schema: any) => any;
  AgentQuerySchema: any;
  gsplAgent: { process: (q: string, ctx: any) => Promise<any>; processAsync: (q: string, ctx: any) => Promise<any>; getStats: () => any };
  pipelineOrchestrator: { runPipeline: (desc: string, domain: string, mem: any, seeds?: any[]) => Promise<any>; getAllSubAgents: () => { name: string; stage: number; isLLMBacked: boolean; hasToolAccess: boolean }[] };
  memorySystem: { exemplar: { count: () => number; list: () => any[]; findByDomain: (domain: string) => any[] }; recordEpisode: (...args: any[]) => void; getStats: () => any };
  log: (level: string, msg: string, meta?: any) => void;
  metrics: { agentQueries: number };
}

export function registerAgentRoutes(app: Express, deps: AgentDeps): void {
  const { seeds, saveSeeds, optionalAuth, validateBody, AgentQuerySchema, gsplAgent, pipelineOrchestrator, memorySystem, log, metrics } = deps;

  app.post('/api/agent/query', optionalAuth, validateBody(AgentQuerySchema), async (req: any, res: any) => {
    const query = req.body.query || req.body.message;
    metrics.agentQueries++;
    const response = await gsplAgent.process(query, { seeds });
    if (response.success && response.data?.seed) { seeds.push(response.data.seed); saveSeeds(); }
    if (response.success && response.data?.population) { for (const s of response.data.population) seeds.push(s); saveSeeds(); }
    if (response.success && response.data?.seeds) { for (const s of response.data.seeds) seeds.push(s); saveSeeds(); }
    log('INFO', 'Agent query', { intent: response.intent, success: response.success });
    res.json(response);
  });

  app.post('/api/agent/stream', optionalAuth, validateBody(AgentQuerySchema), async (req: any, res: any) => {
    const query = req.body.query || req.body.message;
    metrics.agentQueries++;
    res.setHeader('Content-Type', 'text/event-stream');
    // no-transform stops well-behaved proxies from buffering/altering the
    // stream; X-Accel-Buffering disables nginx response buffering specifically.
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    // Open the response immediately so the client gets headers (TTFB) without
    // waiting for the kernel to finish composing — this is what keeps the
    // browser from sitting on a blank "Evolving seed…" state.
    if (typeof res.flushHeaders === 'function') res.flushHeaders();
    const flush = () => { if (typeof res.flush === 'function') res.flush(); };
    const write = (obj: Record<string, unknown>) => { res.write(`data: ${JSON.stringify(obj)}\n\n`); flush(); };
    // Comment-frame heartbeat keeps the connection warm during long kernel
    // composition so intermediaries don't drop it and the client's idle
    // watchdog never trips. Lines starting with ':' are ignored by SSE parsers.
    res.write(': open\n\n'); flush();
    const heartbeat = setInterval(() => { try { res.write(': ping\n\n'); flush(); } catch { /* socket closed */ } }, 10000);
    try {
      const response = await gsplAgent.process(query, { seeds });
      clearInterval(heartbeat);
      if (response.success && response.data?.seed) { seeds.push(response.data.seed); saveSeeds(); }
      if (response.success && response.data?.population) { for (const s of response.data.population) seeds.push(s); saveSeeds(); }
      if (response.success && response.data?.seeds) { for (const s of response.data.seeds) seeds.push(s); saveSeeds(); }
      const message = String(response.message || '');
      const parts = message.split(/(\s+)/).filter((p) => p.length > 0);
      for (const token of parts) { write({ type: 'delta', token }); }
      if (response.plan?.steps?.length) { write({ type: 'card', kind: 'plan', payload: { summary: message.slice(0, 240), steps: response.plan.steps.map((s: any) => s.operation || 'kernel step') } }); }
      if (response.data?.seed) { write({ type: 'seed_updated', seed: response.data.seed }); write({ type: 'card', kind: 'gspl-source', payload: { kind: 'json', seed: response.data.seed } }); }
      write({ type: 'tier', tier: response.tier ?? 0 });
      write({ type: 'done', latencyMs: 0 });
      res.end();
    } catch (e: any) { clearInterval(heartbeat); write({ type: 'delta', token: `Error: ${e?.message ?? 'stream failed'}` }); write({ type: 'done', latencyMs: 0 }); res.end(); }
  });

  app.get('/api/agent/help', async (_req, res) => { res.json(await gsplAgent.process('help', {})); });
  app.get('/api/agent/stats', (_req, res) => { res.json(gsplAgent.getStats()); });

  app.get('/api/agent/inference/phi4/status', async (_req: any, res: any) => {
    try {
      const { getPhi4Client, InferenceTier } = await import('../../lib/agent/index.js');
      const client = getPhi4Client();
      const health = await client.health();
      res.json({ available: health.available, tiers: { kernel: health.tiers[InferenceTier.KERNEL], fast: health.tiers[InferenceTier.FAST], standard: health.tiers[InferenceTier.STANDARD], deep: health.tiers[InferenceTier.DEEP] }, configured_models: { fast: client.configuredModel(InferenceTier.FAST), standard: client.configuredModel(InferenceTier.STANDARD), deep: client.configuredModel(InferenceTier.DEEP) }, loaded_models: client.loadedModels(), max_available_tier: client.maxAvailableTier() });
    } catch (e: any) { log('ERROR', 'Phi-4 status error', { error: e?.message }); res.status(500).json({ detail: e?.message ?? 'status failed' }); }
  });

  app.post('/api/agent/query/async', optionalAuth, validateBody(AgentQuerySchema), async (req: any, res: any) => {
    const query = req.body.query || req.body.message;
    metrics.agentQueries++;
    try {
      const response = await gsplAgent.processAsync(query, { seeds });
      if (response.success && response.data?.seed) { seeds.push(response.data.seed); saveSeeds(); }
      if (response.success && response.data?.population) { for (const s of response.data.population) seeds.push(s); saveSeeds(); }
      if (response.success && response.data?.seeds) { for (const s of response.data.seeds) seeds.push(s); saveSeeds(); }
      log('INFO', 'Agent async query', { intent: response.intent, tier: response.tier, success: response.success });
      res.json(response);
    } catch (e: any) { log('ERROR', 'Agent async query failed', { error: e.message }); res.status(500).json({ error: e.message }); }
  });

  app.post('/api/agents/generate-seed', optionalAuth, async (req: any, res: any) => {
    const { description, domain } = req.body || {};
    if (!description) { return res.status(400).json({ detail: 'description is required' }); }
    try {
      const result = await pipelineOrchestrator.runPipeline(description, domain, memorySystem);
      if (!result.success) { return res.status(500).json({ detail: result.error, duration: result.duration }); }
      if (result.growth?.seed) { seeds.push(result.growth.seed); saveSeeds(); }
      log('INFO', 'Pipeline generate-seed', { domain: result.intent?.domain, success: true, refineCount: result.refineCount });
      res.json(result);
    } catch (e: any) { log('ERROR', 'Pipeline generate-seed failed', { error: e.message }); res.status(500).json({ detail: e.message }); }
  });

  app.post('/api/agents/refine', optionalAuth, async (req: any, res: any) => {
    const { seedHash, feedback } = req.body || {};
    if (!seedHash || !feedback) { return res.status(400).json({ detail: 'seedHash and feedback are required' }); }
    try {
      const existingSeed = seeds.find((s: any) => s.$hash === seedHash || s.id === seedHash);
      if (!existingSeed) { return res.status(404).json({ detail: 'Seed not found' }); }
      const description = `Refine: ${existingSeed.$name || 'seed'}. Feedback: ${feedback}`;
      const result = await pipelineOrchestrator.runPipeline(description, existingSeed.$domain, memorySystem, seeds);
      if (!result.success) { return res.status(500).json({ detail: result.error }); }
      if (result.growth?.seed) { seeds.push(result.growth.seed); saveSeeds(); }
      res.json({ refinedSeed: result.growth?.seed, confidence: result.validation?.confidence, result });
    } catch (e: any) { res.status(500).json({ detail: e.message }); }
  });

  app.get('/api/agents/memory/exemplars', optionalAuth, async (req: any, res: any) => {
    try {
      const domain = req.query.domain as string | undefined;
      const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
      const entries = domain ? memorySystem.exemplar?.findByDomain(domain) ?? [] : memorySystem.exemplar?.list() ?? [];
      res.json({ exemplars: entries.slice(0, limit), count: memorySystem.exemplar?.count() || 0 });
    } catch (e: any) { res.status(500).json({ detail: e.message }); }
  });

  app.post('/api/agents/memory/record', optionalAuth, async (req: any, res: any) => {
    const { seed, description, rating } = req.body || {};
    if (!seed || !description) { return res.status(400).json({ detail: 'seed and description are required' }); }
    try {
      const seedId = seed.id || seed.$hash || 'unknown';
      const seedHash = seed.$hash || seed.hash || '';
      memorySystem.recordEpisode(rating >= 0.7 ? 'success' : 'attempt', seed.$domain || 'unknown', description, seedId, seedHash, (rating || 0) >= 0.5);
      res.json({ stored: true });
    } catch (e: any) { res.status(500).json({ detail: e.message }); }
  });

  app.get('/api/agents/stats', optionalAuth, async (_req: any, res: any) => {
    try {
      res.json({ memory: memorySystem.getStats(), subAgents: pipelineOrchestrator.getAllSubAgents().map(a => ({ name: a.name, stage: a.stage, isLLMBacked: a.isLLMBacked, hasToolAccess: a.hasToolAccess })), orchestratorConfigured: true });
    } catch (e: any) { res.status(500).json({ detail: e.message }); }
  });
}
