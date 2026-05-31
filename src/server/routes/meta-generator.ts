/**
 * MetaGenerator Routes — Phase 13
 * 
 * POST /meta/generate    — Generate a new generator from a spec
 * POST /meta/verify      — Verify a generated generator
 * GET  /meta/list        — List all generated generators
 * GET  /meta/:id         — Get a specific generated generator
 * POST /meta/improve     — Attempt to improve an existing generator
 */

import type { Request, Response } from 'express';
import { MetaGenerator, SelfImprovementLoop } from '../../lib/kernel/meta-generator';

const metaGen = new MetaGenerator();
const improvementLoop = new SelfImprovementLoop();

export function registerMetaGeneratorRoutes(app: any) {
  /**
   * POST /meta/generate
   * Generate a new generator from a specification.
   */
  app.post('/meta/generate', (req: Request, res: Response) => {
    const { domain, name, description, parameters, output, strata } = req.body;

    if (!domain || !name) {
      res.status(400).json({ error: 'Missing domain or name' });
      return;
    }

    const spec = {
      domain,
      name,
      description: description || `Auto-generated ${domain} generator`,
      parameters: parameters || [
        { name: 'complexity', type: 'number' as const, default: 0.5, description: 'Output complexity' },
      ],
      output: output || { type: 'json' as const, description: 'Generated artifact' },
      strata: strata || ['Form'],
    };

    const generated = metaGen.generate(spec);

    res.json({
      id: generated.id,
      domain: generated.spec.domain,
      name: generated.spec.name,
      sourceHash: generated.sourceHash,
      sourceLength: generated.source.length,
      generatedAt: generated.generatedAt,
      parentSeedHash: generated.parentSeedHash,
    });
  });

  /**
   * POST /meta/verify
   * Verify a generated generator.
   */
  app.post('/meta/verify', (req: Request, res: Response) => {
    const { id } = req.body;

    if (!id) {
      res.status(400).json({ error: 'Missing id' });
      return;
    }

    const verified = metaGen.verify(id);
    const gen = metaGen.get(id);

    res.json({
      id,
      verified,
      sourceHash: gen?.sourceHash,
    });
  });

  /**
   * GET /meta/list
   * List all generated generators.
   */
  app.get('/meta/list', (req: Request, res: Response) => {
    const generators = metaGen.list();
    res.json({
      generators: generators.map(g => ({
        id: g.id,
        domain: g.spec.domain,
        name: g.spec.name,
        sourceHash: g.sourceHash,
        verified: g.verified,
        generatedAt: g.generatedAt,
      })),
      total: generators.length,
    });
  });

  /**
   * GET /meta/:id
   * Get a specific generated generator.
   */
  app.get('/meta/:id', (req: Request, res: Response) => {
    const gen = metaGen.get(req.params.id);
    if (!gen) {
      res.status(404).json({ error: 'Generator not found' });
      return;
    }

    res.json({
      id: gen.id,
      spec: gen.spec,
      sourceHash: gen.sourceHash,
      source: gen.source,
      verified: gen.verified,
      generatedAt: gen.generatedAt,
      parentSeedHash: gen.parentSeedHash,
    });
  });

  /**
   * POST /meta/improve
   * Attempt to improve an existing generator.
   */
  app.post('/meta/improve', (req: Request, res: Response) => {
    const { currentSource, targetDomain, improvementGoal } = req.body;

    if (!currentSource || !targetDomain) {
      res.status(400).json({ error: 'Missing currentSource or targetDomain' });
      return;
    }

    const attempt = improvementLoop.improve(currentSource, targetDomain, improvementGoal || 'general improvement');

    res.json({
      id: attempt.id,
      targetGenerator: attempt.targetGenerator,
      improvementScore: attempt.improvementScore,
      accepted: attempt.accepted,
      beforeHash: attempt.beforeHash,
      afterHash: attempt.afterHash,
    });
  });

  /**
   * GET /meta/improvements
   * List all improvement attempts.
   */
  app.get('/meta/improvements', (req: Request, res: Response) => {
    const attempts = improvementLoop.listAttempts();
    const accepted = improvementLoop.getAcceptedAttempts();

    res.json({
      total: attempts.length,
      accepted: accepted.length,
      attempts: attempts.slice(-20), // Last 20
    });
  });

  console.log('[MetaGenerator] Routes registered at /meta/*');
}
