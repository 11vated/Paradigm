/**
 * Civilisation orchestrator — Doctrine 16 dispatch pipeline.
 *
 * 1. Parse intent
 * 2. Resolve strata to render
 * 3. Dispatch each renderer in deterministic order (sound, form, story,
 *    culture, economy, ritual). All seeded from intent hash.
 * 4. Compute conformance summary
 * 5. Bundle, hash, sign-ready
 */
import { createHash } from 'node:crypto';
import { rngFromHash } from '../kernel/rng';
import { ALL_STRATA } from './types';
import type {
  CivilisationIntent, CivilisationBundle, StratumArtifact,
  StratumId, ConformanceReport,
} from './types';
import {
  renderSound, renderForm, renderStory, renderCulture, renderEconomy, renderRitual,
  renderMotion, renderWorld, renderMind, renderTime, renderField,
} from './renderers';

const ORCHESTRATOR_VERSION = '1.0.0';

function canonicalizeIntent(intent: CivilisationIntent): string {
  // sort keys for determinism
  return JSON.stringify(intent, Object.keys(intent).sort() as any);
}

function summarizeConformance(strata: Record<StratumId, StratumArtifact | undefined>): ConformanceReport {
  let passed = 0, failed = 0, unimplemented = 0;
  const perStratum: ConformanceReport['perStratum'] = [];
  let covered = 0;
  for (const sid of ALL_STRATA) {
    const a = strata[sid];
    if (!a) continue;
    covered++;
    let p = 0, f = 0, u = 0;
    for (const v of Object.values(a.predicateReport)) {
      if (v === 'pass') p++;
      else if (v === 'fail') f++;
      else u++;
    }
    passed += p; failed += f; unimplemented += u;
    perStratum.push({ stratumId: sid, passed: p, failed: f, unimplemented: u });
  }
  return {
    strataCovered: covered,
    predicatesPassed: passed,
    predicatesFailed: failed,
    predicatesUnimplemented: unimplemented,
    perStratum,
  };
}

export interface ComposeOpts {
  formWidth?: number;
  formHeight?: number;
  worldWidth?: number;
  worldHeight?: number;
  strata?: StratumId[];
}

export function composeCivilisation(intent: CivilisationIntent, opts: ComposeOpts = {}): CivilisationBundle {
  const intentJson = canonicalizeIntent(intent);
  const intentHash = createHash('sha256').update(intentJson).digest('hex');
  const rng = rngFromHash(intentHash);
  const requested = opts.strata ?? intent.strataRequested ?? ['sound', 'form', 'story', 'culture', 'economy', 'ritual', 'motion', 'world', 'mind', 'time', 'field'];

  const strata: Partial<Record<StratumId, StratumArtifact>> = {};
  if (requested.includes('sound'))   strata.sound   = renderSound(intent, rngFromHash(intentHash + ':sound'));
  if (requested.includes('form'))    strata.form    = renderForm(intent, rngFromHash(intentHash + ':form'), { width: opts.formWidth ?? 384, height: opts.formHeight ?? 256 });
  if (requested.includes('story'))   strata.story   = renderStory(intent, rngFromHash(intentHash + ':story'));
  if (requested.includes('culture')) strata.culture = renderCulture(intent, rngFromHash(intentHash + ':culture'));
  if (requested.includes('economy')) strata.economy = renderEconomy(intent, rngFromHash(intentHash + ':economy'));
  if (requested.includes('ritual'))  strata.ritual  = renderRitual(intent, rngFromHash(intentHash + ':ritual'));
  if (requested.includes('motion'))  strata.motion  = renderMotion(intent, rngFromHash(intentHash + ':motion'));
  if (requested.includes('world'))   strata.world   = renderWorld(intent, rngFromHash(intentHash + ':world'),  { width: opts.worldWidth ?? 192, height: opts.worldHeight ?? 192 });
  if (requested.includes('mind'))    strata.mind    = renderMind(intent, rngFromHash(intentHash + ':mind'));
  if (requested.includes('time'))    strata.time    = renderTime(intent, rngFromHash(intentHash + ':time'));
  if (requested.includes('field'))   strata.field   = renderField(intent, rngFromHash(intentHash + ':field'));

  const conformance = summarizeConformance(strata as any);

  const stratumHashes = Object.fromEntries(
    Object.entries(strata).map(([k, v]) => [k, v!.contentHash])
  );
  const bundleCanonical = JSON.stringify({
    schema: 'https://paradigm.ai/schema/civilisation/v1',
    intentHash,
    stratumHashes,
    lineage: { parents: intent.parents ?? [], depth: (intent.parents?.length ?? 0) > 0 ? 1 : 0 },
  }, Object.keys({}).sort() as any);
  const bundleHash = createHash('sha256').update(bundleCanonical).digest('hex');
  const id = `${intent.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${bundleHash.slice(0, 12)}`;

  return {
    schema: 'https://paradigm.ai/schema/civilisation/v1',
    id,
    hash: bundleHash,
    intent,
    intentHash,
    strata,
    conformance,
    lineage: { parents: intent.parents ?? [], depth: (intent.parents?.length ?? 0) > 0 ? 1 : 0 },
    manifest: bundleHash,
    createdAt: 0,
    cliVersion: ORCHESTRATOR_VERSION,
  };
}

export function bundleSummary(bundle: CivilisationBundle): string {
  const lines: string[] = [];
  lines.push(`CIVILISATION  ${bundle.intent.name}  (${bundle.id})`);
  lines.push(`hash          ${bundle.hash.slice(0, 16)}…`);
  lines.push(`intent-hash   ${bundle.intentHash.slice(0, 16)}…`);
  lines.push(`strata        ${bundle.conformance.strataCovered}/11 covered`);
  for (const [sid, art] of Object.entries(bundle.strata)) {
    if (!art) continue;
    lines.push(`  ${sid.padEnd(8)} ${art.mime.padEnd(28)} ${String(art.size).padStart(7)}B  hash=${art.contentHash.slice(0, 12)}…`);
  }
  lines.push(`predicates    ${bundle.conformance.predicatesPassed} pass / ${bundle.conformance.predicatesFailed} fail / ${bundle.conformance.predicatesUnimplemented} unimpl`);
  if (bundle.lineage.parents.length > 0) {
    lines.push(`lineage       depth=${bundle.lineage.depth}, parents=${bundle.lineage.parents.length}`);
  }
  return lines.join('\n');
}
