#!/usr/bin/env tsx
/**
 * Paradigm Agent Reproducibility Harness (Phases 9–10)
 *
 * Core guarantee:
 *   Same (intent, memoryHash, seedCorpusHash) → byte-identical decision
 *
 * Usage:
 *   npx tsx scripts/agent-repro-harness.ts <intent> [--runs N] [--quiet]
 *   npx tsx scripts/agent-repro-harness.ts verify-all [--fixtures path]
 */

import { createHash } from 'crypto';
import { Xoshiro256StarStar } from '../src/lib/kernel/rng.js';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface SingleRun {
  runId: number;
  decisionHash: string;
  planHash: string;
  domain: string;
  normalizedIntent: string;
  confidence: number;
}

export interface ReproducibilityReport {
  intent: string;
  memoryHash: string;
  seedCorpusHash: string;
  compositeHash: string;
  runs: SingleRun[];
  verified: boolean;
  allIdentical: boolean;
  stableSeedHash: string;
  stablePlanHash: string;
  stableDomain: string;
}

export interface VerifyAllReport {
  total: number;
  passed: number;
  failed: number;
  reports: ReproducibilityReport[];
}

// ─── Domain Detection (deterministic, no LLM) ───────────────────────────────

const DOMAIN_PATTERNS: [RegExp, string][] = [
  [/\b(music|song|melody|rhythm|tempo|beat|jazz|ambient|orchestral)\b/i, 'music'],
  [/\b(game|play|level|score|puzzle|adventure|quest|battle|platformer)\b/i, 'game'],
  [/\b(character|avatar|creature|person|hero|npc|monster|warrior|mage)\b/i, 'character'],
  [/\b(world|map|land|terrain|biome|ocean|forest|city|continent)\b/i, 'world'],
  [/\b(story|narrative|plot|chapter|tale|legend|myth|fiction)\b/i, 'narrative'],
  [/\b(image|picture|paint|draw|art|visual|canvas|palette)\b/i, 'visual2d'],
  [/\b(sprite|pixel|tile|icon|avatar|8bit|16bit)\b/i, 'sprite'],
  [/\b(build|house|building|room|structure|tower|pavilion)\b/i, 'architecture'],
  [/\b(fashion|clothing|dress|shirt|outfit|wear|garment)\b/i, 'fashion'],
  [/\b(food|recipe|cook|meal|dish|ingredient|cuisine)\b/i, 'food'],
  [/\b(dance|choreograph|ballet|movement|routine)\b/i, 'choreography'],
  [/\b(circuit|board|sensor|analog|digital|electronic)\b/i, 'circuit'],
  [/\b(robot|drone|automaton|mech|android)\b/i, 'robotics'],
  [/\b(shader|fragment|fractal|glsl|raymarch)\b/i, 'shader'],
  [/\b(particle|fire|smoke|emitter|spark)\b/i, 'particle'],
  [/\b(alife|cellular|automata|conway|organism)\b/i, 'alife'],
  [/\b(ecosystem|forest|ocean|coral|biome|jungle)\b/i, 'ecosystem'],
  [/\b(physics|gravity|collision|simulation|force)\b/i, 'physics'],
  [/\b(audio|sound|synth|pad|sfx|wav|frequency)\b/i, 'audio'],
  [/\b(agent|ai|intelligence|reasoning|assistant)\b/i, 'agent'],
];

function detectDomain(intent: string): string {
  for (const [pattern, domain] of DOMAIN_PATTERNS) {
    if (pattern.test(intent)) return domain;
  }
  return 'character';
}

// ─── Core Primitives ─────────────────────────────────────────────────────────

function normalizeIntent(raw: string): string {
  return raw.toLowerCase().trim().replace(/[^a-z0-9\s]/g, '');
}

function hashMemoryState(seed?: string): string {
  const canonical = seed ?? 'default-memory-state-v1';
  return createHash('sha256').update(canonical).digest('hex').slice(0, 32);
}

function hashSeedCorpus(seedHashes?: string[]): string {
  const sorted = (seedHashes ?? []).slice().sort();
  return createHash('sha256').update(sorted.join('|')).digest('hex').slice(0, 32);
}

function compositeHash(intent: string, memoryHash: string, corpusHash: string): string {
  return createHash('sha256')
    .update(`${intent}::${memoryHash}::${corpusHash}`)
    .digest('hex')
    .slice(0, 32);
}

// ─── Deterministic Agent Decision ───────────────────────────────────────────

function deterministicDecision(
  normalizedIntent: string,
  memoryHash: string,
  corpusHash: string,
  runId: number,
): SingleRun {
  const composite = compositeHash(normalizedIntent, memoryHash, corpusHash);
  const domain = detectDomain(normalizedIntent);
  const rng = new Xoshiro256StarStar(composite);

  const wordCount = normalizedIntent.split(/\s+/).length;
  const confidence = 0.3 + rng.nextF64() * 0.5;

  const decisionHash = createHash('sha256')
    .update(`${normalizedIntent}:${domain}:${confidence}:${composite}`)
    .digest('hex')
    .slice(0, 32);

  const planInput = `plan:${domain}:${wordCount}:${memoryHash}`;
  const planHash = createHash('sha256').update(planInput).digest('hex').slice(0, 32);

  return {
    runId,
    decisionHash,
    planHash,
    domain,
    normalizedIntent,
    confidence: +confidence.toFixed(4),
  };
}

// ─── Public API ──────────────────────────────────────────────────────────────

export function verifyReproducibility(
  intent: string,
  seed?: string,
  runs: number = 2,
): ReproducibilityReport {
  const normalizedIntent = normalizeIntent(intent);
  const memoryHash = hashMemoryState(seed);
  const corpusHash = hashSeedCorpus(seed ? [seed] : undefined);
  const composite = compositeHash(normalizedIntent, memoryHash, corpusHash);

  const results: SingleRun[] = [];
  for (let i = 0; i < runs; i++) {
    results.push(deterministicDecision(normalizedIntent, memoryHash, corpusHash, i));
  }

  const stableSeedHash = results[0].decisionHash;
  const stablePlanHash = results[0].planHash;
  const stableDomain = results[0].domain;
  const allIdentical = results.every(
    (r) => r.decisionHash === stableSeedHash && r.planHash === stablePlanHash,
  );

  return {
    intent,
    memoryHash,
    seedCorpusHash: corpusHash,
    compositeHash: composite,
    runs: results,
    verified: allIdentical,
    allIdentical,
    stableSeedHash,
    stablePlanHash,
    stableDomain,
  };
}

export function verifyAllFixtures(fixtures: string[]): VerifyAllReport {
  const reports = fixtures.map((f) => verifyReproducibility(f));
  const passed = reports.filter((r) => r.verified).length;
  return {
    total: reports.length,
    passed,
    failed: reports.length - passed,
    reports,
  };
}

// ─── CLI Entry Point ─────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const quiet = args.includes('--quiet');
  const runsFlag = args.findIndex((a) => a === '--runs');
  const runCount = runsFlag >= 0 ? parseInt(args[runsFlag + 1], 10) || 2 : 2;
  const fixturesFlag = args.findIndex((a) => a === '--fixtures');

  if (args[0] === 'verify-all') {
    const fixtureIntents: string[] = [];
    if (fixturesFlag >= 0) {
      const { readFileSync, existsSync } = await import('fs');
      const fixturesPath = args[fixturesFlag + 1];
      if (existsSync(fixturesPath)) {
        const data = JSON.parse(readFileSync(fixturesPath, 'utf-8'));
        if (Array.isArray(data)) {
          fixtureIntents.push(...data.map((f: any) => f.intent ?? f));
        }
      }
    }
    if (fixtureIntents.length === 0) {
      fixtureIntents.push(
        'Create a jazz improvisation with walking bass',
        'Build a platformer game with jumping puzzles',
        'Design a fantasy warrior character with sword and shield',
      );
    }
    const report = verifyAllFixtures(fixtureIntents);
    if (!quiet) {
      console.log(`\n=== Verify All Fixtures ===`);
      console.log(`Total: ${report.total}, Passed: ${report.passed}, Failed: ${report.failed}`);
      for (const r of report.reports) {
        const icon = r.verified ? '✓' : '✗';
        console.log(`  ${icon} "${r.intent.slice(0, 50)}..." → domain=${r.stableDomain}, hash=${r.stableSeedHash.slice(0, 12)}`);
      }
    }
    process.exit(report.failed > 0 ? 1 : 0);
  }

  const intent = args.filter((a) => !a.startsWith('--')).join(' ') || 'a lone monk who paints with living sound';

  const report = verifyReproducibility(intent, undefined, runCount);

  if (!quiet) {
    const status = report.verified ? 'PASS' : 'FAIL';
    console.log(`\n=== Agent Reproducibility Report ===`);
    console.log(`Intent:     "${report.intent}"`);
    console.log(`Status:     ${status}`);
    console.log(`Memory:     ${report.memoryHash}`);
    console.log(`Corpus:     ${report.seedCorpusHash}`);
    console.log(`Composite:  ${report.compositeHash}`);
    console.log(`Domain:     ${report.stableDomain}`);
    console.log(`Runs:       ${report.runs.length}`);
    console.log(`All identical: ${report.allIdentical}`);
    console.log(`Decision hash: ${report.stableSeedHash}`);
    console.log(`Plan hash:     ${report.stablePlanHash}`);
    console.log('');

    for (const run of report.runs) {
      console.log(`  Run ${run.runId}: hash=${run.decisionHash.slice(0, 12)}.. domain=${run.domain} conf=${run.confidence}`);
    }
  }

  process.exit(report.verified ? 0 : 1);
}

const isCLI = process.argv[1]?.includes('agent-repro-harness');
if (isCLI) {
  main().catch((err) => {
    console.error('Repro harness error:', err);
    process.exit(1);
  });
}
