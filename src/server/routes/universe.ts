/**
 * Universe routes — the doctrinal headline HTTP surface.
 *
 * Exposes the Multiverse Director + Plan Executor over HTTP:
 *   POST /api/universe/plan   { prompt, seedHash? } → UniversePlan (dry-run)
 *   POST /api/universe/grow   { prompt, seedHash? } → UniverseManifest (real)
 *
 * Added by paradigm-infinite/ws-28.
 */
import type { Express, Request, Response, RequestHandler } from 'express';
import * as path from 'node:path';
import { planUniverse, classifyArchetype, validatePlan } from '../../lib/engines/director';
import { executePlan } from '../../lib/engines/executor';
import type { Seed } from '../../lib/kernel/engines';

interface Deps {
  optionalAuth: RequestHandler;
  universesRoot?: string;
  log: (level: any, msg: string, meta?: Record<string, unknown>) => void;
}

function deriveSeedHash(prompt: string, salt?: string): string {
  const input = `${prompt}|${salt ?? 'universe'}`;
  let h = 0xcbf29ce484222325n;
  for (let i = 0; i < input.length; i++) {
    h = BigInt.asUintN(64, (h ^ BigInt(input.charCodeAt(i))) * 0x100000001b3n);
  }
  return h.toString(16).padStart(16, '0');
}

function makeSeed(seedHash: string, prompt: string): Seed {
  return {
    $hash: seedHash,
    $domain: 'universe' as any,
    $version: '1.0.0',
    $genes: { prompt: { value: prompt, kind: 'string' as any } as any },
  } as Seed;
}

export function registerUniverseRoutes(app: Express, deps: Deps): void {
  const universesRoot = deps.universesRoot ?? path.join(process.cwd(), '.universes');

  app.post('/api/universe/plan', deps.optionalAuth, async (req: Request, res: Response) => {
    try {
      const prompt = String((req.body as any)?.prompt ?? '');
      if (!prompt.trim()) return res.status(400).json({ error: 'prompt required' });
      const seedHash = String((req.body as any)?.seedHash ?? deriveSeedHash(prompt));
      const plan = planUniverse(prompt);
      const validation = validatePlan(plan);
      res.json({ plan, archetype: classifyArchetype(prompt), validation });
    } catch (e: any) {
      deps.log('ERROR', 'POST /api/universe/plan failed', { err: e?.message });
      res.status(500).json({ error: e?.message ?? 'plan failed' });
    }
  });

  app.post('/api/universe/grow', deps.optionalAuth, async (req: Request, res: Response) => {
    try {
      const prompt = String((req.body as any)?.prompt ?? '');
      if (!prompt.trim()) return res.status(400).json({ error: 'prompt required' });
      const seedHash = String((req.body as any)?.seedHash ?? deriveSeedHash(prompt));
      const continueOnError = Boolean((req.body as any)?.continueOnError ?? true);
      const plan = planUniverse(prompt);
      const seed = makeSeed(seedHash, prompt);
      const outputRoot = path.join(universesRoot, seedHash);
      const manifest = await executePlan(plan, seed, {
        outputRoot,
        continueOnError,
      });
      res.json({ manifest, outputRoot });
    } catch (e: any) {
      deps.log('ERROR', 'POST /api/universe/grow failed', { err: e?.message });
      res.status(500).json({ error: e?.message ?? 'grow failed' });
    }
  });
}
