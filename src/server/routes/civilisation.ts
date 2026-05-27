/**
 * Civilisation routes — Doctrine 16 dispatch endpoint.
 *
 *   POST /api/civilisation/compose
 *     body: { name, key?, mode?, tempo?, parents?, formWidth?, formHeight? }
 *     → CivilisationBundle (inlined bytesB64 for small strata)
 *
 *   GET  /api/civilisation/strata
 *     → [{ stratumId, description }]
 *
 *   GET  /api/civilisation/health
 *     → { ok, sampleHash }
 */
import type { Express, Request, Response } from 'express';
import { composeCivilisation } from '../../lib/civilisation/orchestrator.js';
import { breedCivilisations } from '../../lib/civilisation/breeding.js';
import { ALL_STRATA } from '../../lib/civilisation/types';

const STRATA_DESCRIPTIONS: Record<string, string> = {
  form: 'Visible geometry rendered by the spectral raymarcher',
  motion: 'Skeletal animation and dynamics (Phase 3 substrate)',
  sound: 'Composed music with functional harmony, voice leading, mastering',
  mind: 'Behavior trees and agent policies',
  story: 'Narrative generated via Tracery-style grammar',
  world: 'Spatial layout, heightfields, biomes',
  field: 'Physics constants and rule predicates',
  culture: 'Glossary, taboos, practices',
  time: 'Chronology and calendar systems',
  economy: 'Royalty graph + license terms + price model',
  ritual: 'Recurring ceremonies with typed participants and outcomes',
};

export function registerCivilisationRoutes(app: Express): void {
  app.get('/api/civilisation/health', (_req: Request, res: Response) => {
    const sample = composeCivilisation(
      { name: 'health-check', custodian: '0xCheck' },
      { formWidth: 64, formHeight: 64, strata: ['story', 'culture', 'economy', 'ritual'] }
    );
    res.json({
      ok: true,
      bundleHash: sample.hash,
      strataCovered: sample.conformance.strataCovered,
    });
  });

  app.get('/api/civilisation/strata', (_req: Request, res: Response) => {
    res.json({
      schema: 'https://paradigm.ai/schema/civilisation-strata/v1',
      strata: ALL_STRATA.map(sid => ({
        stratumId: sid,
        description: STRATA_DESCRIPTIONS[sid] || '',
      })),
    });
  });

  app.post('/api/civilisation/compose', (req: Request, res: Response) => {
    try {
      const body = req.body as Record<string, unknown>;
      const name = typeof body.name === 'string' && body.name.trim() ? body.name : 'unnamed';
      const intent: any = {
        name,
        key: typeof body.key === 'string' ? body.key : 'D',
        mode: typeof body.mode === 'string' ? body.mode : 'dorian',
        tempo: typeof body.tempo === 'number' ? body.tempo : 92,
        parents: Array.isArray(body.parents) ? body.parents : [],
        custodian: typeof body.custodian === 'string' ? body.custodian : '0xCustodian',
        strataRequested: Array.isArray(body.strata) ? body.strata : undefined,
      };
      const opts: any = {
        formWidth: typeof body.formWidth === 'number' ? Math.min(512, body.formWidth) : 320,
        formHeight: typeof body.formHeight === 'number' ? Math.min(384, body.formHeight) : 224,
      };
      const t0 = Date.now();
      const bundle = composeCivilisation(intent, opts);
      const elapsed = Date.now() - t0;
      res.json({ bundle, composedInMs: elapsed });
    } catch (err) {
      res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
    }
  });

  app.post('/api/civilisation/breed', (req: Request, res: Response) => {
    try {
      const body = req.body as Record<string, unknown>;
      const parentA = body.parentA as any;
      const parentB = body.parentB as any;
      if (!parentA?.hash || !parentB?.hash) {
        res.status(400).json({ error: 'parentA and parentB must be full CivilisationBundle objects with .hash' });
        return;
      }
      const opts: any = {
        name: typeof body.name === 'string' && body.name.trim() ? body.name : undefined,
        strata: Array.isArray(body.strata) ? body.strata : undefined,
        formWidth: typeof body.formWidth === 'number' ? Math.min(512, body.formWidth) : 320,
        formHeight: typeof body.formHeight === 'number' ? Math.min(384, body.formHeight) : 224,
      };
      const t0 = Date.now();
      const bundle = breedCivilisations(parentA, parentB, opts);
      const elapsed = Date.now() - t0;
      res.json({ bundle, composedInMs: elapsed, parentHashes: [parentA.hash, parentB.hash] });
    } catch (err) {
      res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
    }
  });
}
