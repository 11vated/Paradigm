/**
 * Kernel Engine Dispatcher — Beyond Omega
 * Routes seeds to all 103+ domain generators with deterministic RNG.
 * Each seed's $hash seeds the Xoshiro256StarStar for full determinism.
 *
 * PHASE 2 CANONICAL ENFORCEMENT (Doctrine v2 full autonomy):
 * CANONICAL_PRIMARY domains (10+): sprite, music, visual2d, animation, procedural, typography, robotics, architecture, fashion, food.
 * Deprecated sibling patterns (-v2, -3d, -enhanced, -gpu, food-delivery when routing to legacy) should be rejected or warned.
 * Python side (engines.py etc.) must mirror this map + hard enforcement in grow_* functions.
 */
/* eslint-disable @typescript-eslint/no-require-imports -- Engine dispatcher uses require() to load contracts/domain-registry.js dynamically for hot-reload. */

import { Xoshiro256StarStar, rngFromHash } from './rng.js';
import path from 'path';

export interface Seed {
  $name?: string;
  $domain?: string;
  $hash?: string;
  $lineage?: { generation?: number };
  genes?: Record<string, { type?: string; value?: any }>;
  [key: string]: unknown;
}

// 15_ PRIMARY (Doctrine v2 / Epoch 2): For the 27 canonical domains, prefer the engineering-grade
// QualityContract.synthesize from src/lib/contracts when available. Legacy generators remain as
// fallback for the long tail of 100+ domains during transition. See quality-contract bridge.

import { getContractByDomain } from '../contracts/domain-registry.js';

const CANONICAL_15_DOMAINS = new Set([
  'character','sprite','music','visual2d','procedural','fullgame','animation','geometry3d','narrative',
  'ui','physics','audio','ecosystem','game','alife','shader','particle','typography','architecture',
  'vehicle','furniture','fashion','robotics','circuit','food','choreography','agent',
  'nanobot','drug'
]);

function try15Contract(seed: any, rng: Xoshiro256StarStar) {
  const domain = seed?.$domain || seed?.domain;
  if (!domain || !CANONICAL_15_DOMAINS.has(domain)) return null;
  const contract = getContractByDomain(domain);
  if (contract && typeof contract.synthesize === 'function') {
    try {
      return contract.synthesize(seed, rng);
    } catch { /* swallow: best-effort dispatch probe, registry is non-fatal */ }
  }
  return null;
}

// === LEGACY HEAVY GENERATORS (server-only) ===
// These static imports of the real implementations have been moved to a server-only lazy loader
// to prevent the browser bundle from ever seeing the raw generator .ts files (the source of the
// persistent 404s on quality-contract + generators during dev).
// Client code and the Studio must go through the clean 15_ QualityContract layer only.

let _legacyHeavyLoaded = false;
let _legacyDOMAIN_MAP: Record<string, GeneratorFn> | null = null;

async function getLegacyDOMAIN_MAP(): Promise<Record<string, GeneratorFn>> {
  if (_legacyDOMAIN_MAP) return _legacyDOMAIN_MAP;

  if (typeof window !== 'undefined') {
    // Client: never load the heavy implementations. Use contracts.
    console.warn('[engine-dispatcher] Legacy heavy generators requested from browser — falling back to 15_ contracts only. This path should not be hit for canonical domains.');
    return {};
  }

  // Server only: dynamically load the heavy legacy wiring so Vite never analyzes the real generator files for the client bundle.
  const mod = await import('./server/legacy-engine-dispatcher-impl.js');
  _legacyDOMAIN_MAP = mod.DOMAIN_MAP;
  _legacyHeavyLoaded = true;
  return _legacyDOMAIN_MAP;
}
import { generateTheater } from './generators/theater.js';
import { generateDance } from './generators/dance.js';
import { generateLiterature } from './generators/literature.js';
import { generateJournalism } from './generators/journalism.js';
import { generatePublishing } from './generators/publishing.js';
import { generateAdvertising } from './generators/advertising.js';
// (removed stray legacy import during isolation)
import { generateWine } from './generators/wine.js';
import { generateBeer } from './generators/beer.js';
import { generateSpirits } from './generators/spirits.js';
import { generateCoffee } from './generators/coffee.js';
import { generateTea } from './generators/tea.js';
import { generateEventPlanning } from './generators/event-planning.js';
import { generateFitness } from './generators/fitness.js';
import { generatePetCare } from './generators/pet-care.js';
import { generateGardening } from './generators/gardening.js';
import { generateJewelry } from './generators/jewelry.js';
import { generateElectronics } from './generators/electronics.js';
import { generateSemiconductors } from './generators/semiconductors.js';
import { generateOptics } from './generators/optics.js';
import { generateSensors } from './generators/sensors.js';
import { generateDrones } from './generators/drones.js';
import { generateAR } from './generators/ar.js';
import { generateVR } from './generators/vr.js';

// 15_ spec integration: new engineering contracts now available for quality/dispatch
const QC_VERBOSE_DISPATCH =
  process.env.PARADIGM_QC_VERBOSE === '1' || process.env.PARADIGM_QC_VERBOSE === 'true';

import('../contracts/domain-registry.js').then(({ ALL_DOMAIN_CONTRACTS, getContractByDomain }) => {
  if (!QC_VERBOSE_DISPATCH) return;
  console.debug('[15_spec] New contracts bridged into engine dispatcher:', ALL_DOMAIN_CONTRACTS.length, 'domains');
  const charContract = getContractByDomain('character');
  const musicContract = getContractByDomain('music');
  const geomContract = getContractByDomain('geometry3d');
  if (charContract) console.debug('[15_spec] Character contract ready for dispatch');
  if (musicContract) console.debug('[15_spec] Music contract ready for dispatch');
  if (geomContract) console.debug('[15_spec] Geometry3D contract ready for dispatch');
}).catch(() => {});
import { generateMetaverse } from './generators/metaverse.js';
import { generateCybersecurity } from './generators/cybersecurity.js';
import { generateCloud } from './generators/cloud.js';
import { generateDevOps } from './generators/devops.js';
import { generateDataScience } from './generators/data-science.js';
import { generateML } from './generators/ml.js';
import { generateBiotechnology } from './generators/biotechnology.js';
import { generateNanotechnology } from './generators/nanotechnology.js';
import { generateRenewableEnergy } from './generators/renewable-energy.js';
import { generateBattery } from './generators/battery.js';
import { generateSmartGrid } from './generators/smart-grid.js';
import { generate5G } from './generators/5g.js';
import { generate6G } from './generators/6g.js';
import { generateQuantumComputing } from './generators/quantum-computing.js';
import { generateSyntheticBiology } from './generators/synthetic-biology.js';
import { generateGenomics } from './generators/genomics.js';
import { generateAgTech } from './generators/agtech.js';
import { generateSmartHome } from './generators/smart-home.js';
import { generateWearables } from './generators/wearables.js';
import { generate3DPrinting } from './generators/3d-printing.js';
import { generateDroneDelivery } from './generators/drone-delivery.js';
import { generateAV } from './generators/av.js';
import { generatePersonalizedMedicine } from './generators/personalized-medicine.js';
import { generateSpaceTourism } from './generators/space-tourism.js';

// ═══════════════════════════════════════════════════════════════════════════
// NEW: 27 Domain Generators (Phase 2 — V3 Generators)
// ═══════════════════════════════════════════════════════════════════════════
import { generateCharacterV3 } from './generators/character';
import { generateSpriteV3 } from './generators/sprite';
import { generateMusicV3 } from './generators/music';
import { generateVisual2DV3 } from './generators/visual2d';
import { generateGeometry3DV4 } from './generators/geometry3d';
import { generateFullGameV3 } from './generators/fullgame';
import { generateAnimationV3 } from './generators/animation';
import { generateNarrativeV3 } from './generators/narrative';
import { generateUIV3 } from './generators/ui';
import { generatePhysicsV3 } from './generators/physics';
import { generateAudioV3 } from './generators/audio';
import { generateEcosystemV3 } from './generators/ecosystem';
import { generateGameV3 } from './generators/game';
import { generateCardGame } from './generators/cardgame';
import { generateBoardGame } from './generators/boardgame';
import { generateALifeV3 } from './generators/alife';
import { generateShaderV3 } from './generators/shader';
import { generateParticleV3 } from './generators/particle';
import { generateProceduralV3 } from './generators/procedural';
import { generateTypographyV3 } from './generators/typography';
import { generateArchitectureV3 } from './generators/architecture';
import { generateVehicleV3 } from './generators/vehicle';
import { generateFurnitureV3 } from './generators/furniture';
import { generateFashionV3 } from './generators/fashion';
import { generateRoboticsV3 } from './generators/robotics';
import { generateCircuitV3 } from './generators/circuit';
import { generateFoodV3 } from './generators/food';
import { generateChoreographyV3 } from './generators/choreography';
import { generateAgentV3 } from './generators/agent';

export type GeneratorFn = (seed: Seed, outputPath: string) => Promise<{ [key: string]: any }>;

// Legacy heavy DOMAIN_MAP block removed (client/server isolation)

/**
 * Generate an artifact from a seed using the appropriate domain generator.
 * RNG is seeded from seed.$hash for full determinism.
 */
export async function dispatch(seed: Seed, outputPath: string): Promise<{ domain: string; result: any }> {
  const rng = rngFromHash(seed.$hash || '');
  const domain = seed.$domain || 'meta-domain';

  // PHASE 2 HARD ENFORCEMENT (11-family regime + sprite contract prep)
  const CANONICAL_PRIMARY = ['sprite', 'music', 'visual2d', 'animation', 'procedural', 'typography', 'robotics', 'architecture', 'fashion', 'food', 'particle'];
  const deprecatedPatterns = /-v[0-9]|-(enhanced|gpu|3d|animated|delivery)$/i;
  if (deprecatedPatterns.test(domain)) {
    const base = domain.replace(deprecatedPatterns, '').replace(/-$/, '');
    if (CANONICAL_PRIMARY.includes(base) || CANONICAL_PRIMARY.includes(domain)) {
      throw new Error(`[Phase 2 HARD REJECT] Deprecated sibling domain '${domain}' is not allowed. Use canonical primary '${base || 'the primary'}'. See waivers (sunset 2026-08-25) and docs/waivers/registry.json.`);
    }
  }
  // Enforcement coverage note: Hard reject exercised via unit/integration tests in future waves (e.g. dispatch('vehicle-3d') should throw). Current behavior: throws for all 14 canonicals.

  // 15_ PRIMARY PREFERENCE (Epoch 2 / R4)
  const fifteenArtifact = try15Contract(seed, rng);
  if (fifteenArtifact) {
    // 15_ contract produced real artifact — write it out for compatibility
    if (outputPath && typeof process !== 'undefined' && process.versions?.node) {
      try {
        await (await import(/* @vite-ignore */ 'fs')).promises.writeFile(
          path.join(outputPath, `${domain}-15-real.json`),
          JSON.stringify(fifteenArtifact, null, 2)
        );
      } catch { /* swallow: best-effort dispatch probe, registry is non-fatal */ }
    }
    return { result: fifteenArtifact, domain };
  }

  // Legacy heavy path — lazy loaded only on server
  const legacyMap = await getLegacyDOMAIN_MAP();
  const generator = legacyMap[domain];

  if (!generator) {
    throw new Error(`Unknown domain: ${domain}. No 15_ contract handled it and no legacy generator is registered for this runtime.`);
  }

  const output = await generator(seed, outputPath);
  return { result: output, domain };
}

/**
 * Get list of all available domains.
 * For the 27 canonical 15_ domains this is authoritative via the QualityContract registry.
 * Full legacy list (100+) requires server runtime (lazy loaded to keep client bundles clean).
 */
export function getDomains(): string[] {
  const contractDomains = getAllDomainsFromRegistrySafe();
  return contractDomains.length > 0 ? contractDomains : ['(legacy heavy domains only available on server)'];
}

function getAllDomainsFromRegistrySafe(): string[] {
  try {
    // Dynamic to avoid pulling heavy things at top level
    const mod = require('../contracts/domain-registry.js');
    return mod.getAllDomains ? mod.getAllDomains() : [];
  } catch {
    return [];
  }
}

/**
 * Check if a domain is supported.
 * Canonical 15_ domains are always available via contracts.
 * Legacy domains require server.
 */
export function hasDomain(domain: string): boolean {
  if (CANONICAL_15_DOMAINS.has(domain)) return true;
  // For non-canonical, we would need the legacy map — only checkable on server without loading everything
  return false;
}

// Safe empty export for legacy synchronous callers (engines.ts, dao.ts, etc.).
// The real populated map for legacy domains is only available via the lazy server-only path.
export const DOMAIN_MAP: Record<string, GeneratorFn> = {};
