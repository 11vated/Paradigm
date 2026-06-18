/**
 * Sovereign Agent — HTTP surface.
 *
 * POST /api/sovereign-agent/run        — single-shot agent.run(utterance)
 * POST /api/sovereign-agent/canon/ingest  — embed + store a seed in canon
 * GET  /api/sovereign-agent/canon/search?q=... — top-K semantic recall
 *
 * Sovereignty: defaults to MockSeedLLM. To plug a real local provider,
 * set PARADIGM_LLM_PROVIDER=ollama|llamacpp|webllm in the server env
 * and supply the corresponding base URL.
 */
import type { Express, Request, Response } from 'express';
import { requireAuth, optionalAuth } from '../../lib/auth/index.js';
import { SovereignAgent } from '../../lib/intelligence/agent/orchestrator';
import { defaultSubAgents } from '../../lib/intelligence/agent/sub-agents';
import { DefaultMemoryOrchestrator } from '../../lib/intelligence/memory/orchestrator';
import { CanonMemory } from '../../lib/intelligence/memory/canon';
import { SemanticMemory } from '../../lib/intelligence/memory/semantic';
import { MockSeedLLM, createSeedLLM, type SeedLLM } from '../../lib/intelligence/llm/base';
import { kernelNow } from '../../lib/kernel/clock';
import type { Embedder } from '../../lib/intelligence/memory/types';

/** Cheap built-in embedder for the demo path (real version uses Transformers.js). */
class HashEmbedder implements Embedder {
  readonly model = 'hash-fallback-v1';
  readonly dim = 64;
  async ready(): Promise<void> {}
  async embed(text: string): Promise<Float32Array> {
    const v = new Float32Array(this.dim);
    const t = text.toLowerCase();
    for (let i = 0; i < t.length; i++) {
      v[i % this.dim] += t.charCodeAt(i) / 255;
    }
    // L2 normalize
    let n = 0;
    for (let i = 0; i < this.dim; i++) n += v[i] * v[i];
    n = Math.sqrt(n) || 1;
    for (let i = 0; i < this.dim; i++) v[i] /= n;
    return v;
  }
  async embedBatch(texts: string[]): Promise<Float32Array[]> {
    return Promise.all(texts.map((t) => this.embed(t)));
  }
}

export interface SovereignAgentDeps {
  /** Optional override — server can wire a configured Ollama/llama.cpp/WebLLM */
  llm?: SeedLLM;
  /** Optional override — server can wire a persistent SemanticMemory path */
  semanticPath?: string;
}

export function registerSovereignAgentRoutes(app: Express, deps: SovereignAgentDeps = {}): void {
  const provider = (process.env.PARADIGM_LLM_PROVIDER || 'mock') as
    | 'mock' | 'ollama' | 'llamacpp' | 'webllm' | 'openai' | 'anthropic';
  const llm: SeedLLM = deps.llm ?? (provider === 'mock' ? new MockSeedLLM() : createSeedLLM({ provider }));

  const semantic = new SemanticMemory(deps.semanticPath ?? '/dev/shm/paradigm-semantic.json');
  const memory = new DefaultMemoryOrchestrator();
  (memory as any).layers = { ...((memory as any).layers ?? {}), semantic };
  const embedder = new HashEmbedder();
  const canon = new CanonMemory({ store: semantic, embedder });
  const agent = new SovereignAgent(llm, memory, defaultSubAgents(), '0.1', canon);

  app.post('/api/sovereign-agent/run', requireAuth, async (req: Request, res: Response) => {
    const t0 = kernelNow();
    try {
      const body = (req.body ?? {}) as { utterance?: string; feedbackLoop?: boolean; skipValidate?: boolean };
      if (!body.utterance || typeof body.utterance !== 'string') {
        res.status(400).json({ error: 'utterance (string) is required' });
        return;
      }
      const report = await agent.run(body.utterance, {
        feedbackLoop: body.feedbackLoop ? { enabled: true, maxIterations: 3 } : undefined,
        skipValidate: body.skipValidate,
        annotateReality: true,
      });
      res.json({
        ok: true,
        elapsedMs: kernelNow() - t0,
        intent: {
          top: report.intent.top,
          sub: report.intent.sub,
          domains: report.intent.domains,
          adjectives: report.intent.adjectives.map((a) => ({ word: a.word, valence: a.vector[0] ?? 0, arousal: a.vector[1] ?? 0, dominance: a.vector[2] ?? 0 })),
          entities: report.intent.entities.map((e) => ({ kind: e.kind, text: e.text, canonRef: e.canonRef })),
        },
        planHash: report.plan.planHash,
        planStepsCount: report.plan.steps.length,
        planSteps: report.plan.steps.slice(0, 6).map((s) => ({ op: (s as any).op, path: (s as any).path ?? null })),
        seed: report.seed,
        oracle: report.validated?.oracle,
        signed: !!report.validated?.signature,
        reality: report.reality,
        iterations: report.iterations,
        timings: report.timings,
      });
    } catch (err: any) {
      res.status(500).json({ ok: false, error: err?.message ?? String(err) });
    }
  });

  app.post('/api/sovereign-agent/canon/ingest', requireAuth, async (req: Request, res: Response) => {
    try {
      const { seed } = (req.body ?? {}) as { seed?: unknown };
      if (!seed) {
        res.status(400).json({ error: 'seed is required' });
        return;
      }
      const id = await canon.ingest(seed as any);
      res.json({ ok: true, id });
    } catch (err: any) {
      res.status(500).json({ ok: false, error: err?.message ?? String(err) });
    }
  });

  app.get('/api/sovereign-agent/canon/search', optionalAuth, async (req: Request, res: Response) => {
    try {
      const q = String(req.query.q ?? '').trim();
      const k = Math.min(50, Math.max(1, parseInt(String(req.query.k ?? '10'), 10) || 10));
      if (!q) {
        res.status(400).json({ error: 'q (string) is required' });
        return;
      }
      const hits = await canon.recall(q, { limit: k });
      res.json({ ok: true, q, count: hits.length, hits });
    } catch (err: any) {
      res.status(500).json({ ok: false, error: err?.message ?? String(err) });
    }
  });

  app.get('/api/sovereign-agent/info', optionalAuth, (_req: Request, res: Response) => {
    res.json({
      ok: true,
      provider,
      agentVersion: '0.1',
      embedder: { model: embedder.model, dim: embedder.dim },
      endpoints: [
        'POST /api/sovereign-agent/run',
        'POST /api/sovereign-agent/canon/ingest',
        'GET  /api/sovereign-agent/canon/search?q=...&k=10',
        'GET  /api/sovereign-agent/info',
      ],
    });
  });

  // ─── Alias endpoint for /api/agents/advanced-generate (semantic-driven path) ────
  // Maps the GSPL agent's interface (description, domain) to Sovereign Agent's (utterance).
  app.post('/api/agents/advanced-generate', requireAuth, async (req: Request, res: Response) => {
    const t0 = kernelNow();
    try {
      const body = (req.body ?? {}) as { description?: string; domain?: string; feedbackLoop?: boolean };
      if (!body.description || typeof body.description !== 'string') {
        res.status(400).json({ error: 'description (string) is required' });
        return;
      }
      // Prepend domain hint if provided, to guide intent resolution
      const utterance = body.domain ? `[${body.domain}] ${body.description}` : body.description;
      const report = await agent.run(utterance, {
        feedbackLoop: body.feedbackLoop ? { enabled: true, maxIterations: 3 } : undefined,
        annotateReality: true,
      });
      res.json({
        ok: true,
        elapsedMs: kernelNow() - t0,
        seed: report.seed,
        validated: report.validated,
        oracle: report.validated?.oracle,
        reality: report.reality,
        iterations: report.iterations,
        timings: report.timings,
        method: 'sovereign-agent',
      });
    } catch (err: any) {
      res.status(500).json({ ok: false, error: err?.message ?? String(err) });
    }
  });
}
