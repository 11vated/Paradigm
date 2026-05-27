/**
 * License routes — Doctrine v2 Part VIII.18 v1.
 *
 *   POST /api/license/evaluate
 *     body: { license: SeedLicense, intendedUse: IntendedUse, now?: ISO }
 *     → { allowed, requirements, royaltyBp, reason, manifest }
 *
 *   POST /api/license/build
 *     body: { type, custodian, ... }  (omit schema, manifest, signature)
 *     → { license: SeedLicense (unsigned), manifest }
 */
import type { Express, Request, Response } from 'express';
import {
  evaluateLicense,
  buildLicense,
  isStructurallyValid,
  type SeedLicense,
  type IntendedUse,
  type LicenseType,
} from '../../lib/kernel/seed-license.js';

const ALLOWED_TYPES: LicenseType[] = [
  'public-domain',
  'attribution',
  'attribution-share-alike',
  'noncommercial',
  'commercial-royalty',
  'all-rights-reserved',
  'custom',
];

const ALLOWED_USES: IntendedUse[] = [
  'view',
  'public-display',
  'remix',
  'commercial-display',
  'commercial-resale',
  'redistribute',
];

export function registerLicenseRoutes(app: Express): void {
  app.post('/api/license/evaluate', (req: Request, res: Response) => {
    const body = (req.body ?? {}) as { license?: unknown; intendedUse?: unknown; now?: unknown };
    if (!isStructurallyValid(body.license)) {
      res.status(400).json({ error: 'license is structurally invalid (schema / manifest mismatch?)' });
      return;
    }
    if (typeof body.intendedUse !== 'string' || !ALLOWED_USES.includes(body.intendedUse as IntendedUse)) {
      res.status(400).json({ error: `intendedUse must be one of ${ALLOWED_USES.join(', ')}` });
      return;
    }
    const verdict = evaluateLicense(body.license, body.intendedUse as IntendedUse, {
      now: typeof body.now === 'string' ? body.now : undefined,
    });
    res.json({
      ...verdict,
      manifest: body.license.manifest,
    });
  });

  app.post('/api/license/build', (req: Request, res: Response) => {
    const body = (req.body ?? {}) as Record<string, unknown>;
    if (typeof body.type !== 'string' || !ALLOWED_TYPES.includes(body.type as LicenseType)) {
      res.status(400).json({ error: `type must be one of ${ALLOWED_TYPES.join(', ')}` });
      return;
    }
    if (typeof body.custodian !== 'string' || !body.custodian) {
      res.status(400).json({ error: 'custodian (string) required' });
      return;
    }
    const built = buildLicense({
      type: body.type as LicenseType,
      version: typeof body.version === 'string' ? body.version : '1.0.0',
      custodian: body.custodian,
      attribution: (body.attribution as SeedLicense['attribution']) ?? undefined,
      royaltyBp: typeof body.royaltyBp === 'number' ? body.royaltyBp : undefined,
      territories: Array.isArray(body.territories) ? (body.territories as string[]) : undefined,
      expires: typeof body.expires === 'string' ? body.expires : undefined,
      terms: typeof body.terms === 'string' ? body.terms : undefined,
    });
    res.json({ license: built });
  });
}
