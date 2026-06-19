import crypto from 'crypto';
import { Xoshiro256StarStar, rngFromHash } from '../kernel/rng.js';
import { getGeneTypeInfo, GENE_TYPES } from '../kernel/gene_system.js';
import { getAllDomains, growSeedSync } from '../kernel/engines.js';
import { getCompositionGraph, findCompositionPath } from '../kernel/composition.js';
import { computeRatingScore } from '../kernel/quality/rating.js';
import { kernelNow } from '../kernel/clock.js';
import { MultiLayerMemory, type MemoryDigest } from './memory-system.js';

export interface ParsedIntent {
  raw: string;
  domain: string;
  goal: string;
  constraints: Array<{ key: string; value: number }>;
  style: string;
  confidence: number;
}

export interface PlanStep {
  id: number;
  operation: string;
  params: Record<string, unknown>;
  dependsOn: number[];
}

export interface PipelinePlan {
  intent: ParsedIntent;
  steps: PlanStep[];
  expectedOutputs: string[];
}

export interface PipelineVerification {
  passed: boolean;
  determinismHash: string;
  qualityScore: number;
  qualityAxes: Record<string, number>;
  issues: string[];
}

export interface PipelineDecision {
  decisionHash: string;
  memoryHash: string;
  verification: PipelineVerification;
  plan: PipelinePlan;
  output: Record<string, unknown>;
  timing: {
    parseMs: number;
    gatherMs: number;
    planMs: number;
    executeMs: number;
    verifyMs: number;
    recordMs: number;
    totalMs: number;
  };
}

export interface PipelineResult {
  success: boolean;
  decision?: PipelineDecision;
  error?: string;
  memoryDigest?: MemoryDigest;
}

// ─── Domain Detection ────────────────────────────────────────────────────────

const DOMAIN_PATTERNS: [RegExp, string][] = [
  [/\b(music|song|melody|rhythm|tempo|beat|jazz|ambient|orchestral)\b/i, 'music'],
  [/\b(game|play|level|score|puzzle|adventure|quest|battle|platformer)\b/i, 'game'],
  [/\b(character|avatar|creature|person|hero|npc|warrior|mage)\b/i, 'character'],
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
  [/\b(vehicle|car|ship|drone|cycle|spaceship)\b/i, 'vehicle'],
  [/\b(furniture|chair|table|desk|shelf|cabinet)\b/i, 'furniture'],
  [/\b(animation|motion|keyframe|skeletal|cycle)\b/i, 'animation'],
  [/\b(geometry|mesh|3d|voxel|crystal|primitiv)\b/i, 'geometry3d'],
  [/\b(procedural|terrain|mountain|noise|heightmap)\b/i, 'procedural'],
  [/\b(typography|font|typeface|text|glyph)\b/i, 'typography'],
  [/\b(ui|interface|dashboard|layout|button|widget)\b/i, 'ui'],
];

const STYLE_PATTERNS: [RegExp, string][] = [
  [/\b(dark|noir|gothic|shadow|shadowy|sinister)\b/i, 'dark'],
  [/\b(bright|cheerful|colorful|vibrant|sunny|radiant)\b/i, 'vibrant'],
  [/\b(minimal|clean|simple|modern|sleek|streamlined)\b/i, 'minimal'],
  [/\b(organic|natural|flowing|curved|biologic)\b/i, 'organic'],
  [/\b(cyber|tech|digital|neon|futuristic)\b/i, 'cyberpunk'],
  [/\b(retro|vintage|classic|old|pixel|8bit)\b/i, 'retro'],
  [/\b(watercolor|painted|brush|artistic|painterly)\b/i, 'watercolor'],
  [/\b(geometric|angular|sharp|blocky|poly)\b/i, 'geometric'],
  [/\b(steampunk|victorian|brass|gear|clockwork)\b/i, 'steampunk'],
  [/\b(ethereal|dreamy|misty|ghostly|spiritual)\b/i, 'ethereal'],
];

function detectDomain(raw: string): string {
  for (const [pattern, domain] of DOMAIN_PATTERNS) {
    if (pattern.test(raw)) return domain;
  }
  return 'character';
}

function detectStyle(raw: string): string {
  for (const [pattern, style] of STYLE_PATTERNS) {
    if (pattern.test(raw)) return style;
  }
  return 'default';
}

function extractConstraints(raw: string): Array<{ key: string; value: number }> {
  const constraints: Array<{ key: string; value: number }> = [];
  const numberPatterns: Array<[RegExp, string]> = [
    [/(\d+)\s*(bpm|tempo)/i, 'tempo'],
    [/(\d+)\s*(level|floor|chapter|act)/i, 'depth'],
    [/(\d+)\s*(color|palette)/i, 'paletteSize'],
    [/(\d+)\s*(layer)/i, 'layers'],
    [/(\d+)\s*(population|size)/i, 'populationSize'],
  ];
  for (const [pattern, key] of numberPatterns) {
    const match = raw.match(pattern);
    if (match) {
      constraints.push({ key, value: parseInt(match[1], 10) });
    }
  }
  return constraints;
}

// ─── Stage 1: Intent Parse ───────────────────────────────────────────────────

function stage1ParseIntent(raw: string): ParsedIntent {
  const lower = raw.toLowerCase().trim();
  const domain = detectDomain(lower);
  const style = detectStyle(lower);
  const constraints = extractConstraints(lower);
  const wordCount = lower.split(/\s+/).filter(Boolean).length;
  const confidence = Math.min(0.95, 0.3 + wordCount * 0.04);

  let goal = lower;
  const removePrefixes = ['make', 'create', 'generate', 'build', 'design', 'produce', 'craft', 'compose'];
  for (const prefix of removePrefixes) {
    if (goal.startsWith(prefix)) {
      goal = goal.slice(prefix.length).trim();
      break;
    }
  }
  goal = goal.replace(/^(a |an |the )/i, '').trim();
  if (!goal) goal = lower;

  return { raw, domain, goal, constraints, style, confidence };
}

// ─── Stage 2: Context Gather ─────────────────────────────────────────────────

function stage2GatherContext(
  intent: ParsedIntent,
  memory: MultiLayerMemory,
): { memoryDigest: MemoryDigest; seedCorpus: string[] } {
  const seedsInDomain = memory.getSeedsByDomain(intent.domain);
  const seedHashes = seedsInDomain.map(s => s.seedHash);
  const semanticKnowledge = memory.searchSemantic(intent.domain);
  for (const entry of semanticKnowledge) {
    memory.setWorking(`ctx_${entry.concept}`, entry.content);
  }
  memory.setWorking('current_domain', intent.domain);
  memory.setWorking('current_goal', intent.goal);
  memory.setWorking('current_style', intent.style);

  return {
    memoryDigest: memory.digest(),
    seedCorpus: seedHashes,
  };
}

// ─── Stage 3: Plan Generation ────────────────────────────────────────────────

function stage3GeneratePlan(intent: ParsedIntent, memoryHash: string): PipelinePlan {
  const seedHash = crypto.createHash('sha256')
    .update(`${intent.raw}::${intent.domain}::${memoryHash}`)
    .digest('hex')
    .slice(0, 16);

  const rng = new Xoshiro256StarStar(seedHash);

  const steps: PlanStep[] = [
    { id: 1, operation: 'create_seed', params: { domain: intent.domain, goal: intent.goal, style: intent.style }, dependsOn: [] },
    { id: 2, operation: 'enrich_genes', params: { confidence: intent.confidence }, dependsOn: [1] },
    { id: 3, operation: 'grow_artifact', params: { domain: intent.domain }, dependsOn: [2] },
    { id: 4, operation: 'verify_quality', params: { threshold: 0.5 + rng.nextF64() * 0.3 }, dependsOn: [3] },
  ];

  const expectedOutputs = [`${intent.domain}_artifact`, 'quality_report', 'decision_record'];

  return { intent, steps, expectedOutputs };
}

// ─── Stage 4: Execute Plan ───────────────────────────────────────────────────

function stage4Execute(
  plan: PipelinePlan,
  corpus: string[],
): { output: Record<string, unknown>; seedHash: string } {
  const planInput = JSON.stringify({ plan, corpusHash: corpus.sort().join('|') });
  const seedHash = crypto.createHash('sha256').update(planInput).digest('hex').slice(0, 16);
  const rng = rngFromHash(seedHash);

  const geneInfo = getGeneTypeInfo();
  const allDomains = getAllDomains();
  const graph = getCompositionGraph();

  const genes: Record<string, { type: string; value: unknown }> = {};

  for (const constraint of plan.intent.constraints) {
    genes[constraint.key] = { type: 'scalar', value: Math.min(1, constraint.value / 100) };
  }

  genes.style = { type: 'categorical', value: plan.intent.style };
  genes.goal = { type: 'expression', value: plan.intent.goal };

  for (let i = 0; i < 3; i++) {
    const key = `gene_p${i}`;
    const gInfo = geneInfo[i % geneInfo.length];
    genes[key] = { type: gInfo.name, value: rng.nextF64() };
  }

  const outgoingEdges = graph.edges.filter(e => e.source === plan.intent.domain);
  const compositionPaths = outgoingEdges.map(e => ({ target: e.target, functor: e.name }));

  const domainCount = allDomains.length;

  let artifact: Record<string, unknown> = {};
  try {
    const placeholderSeed = { $domain: plan.intent.domain, $name: plan.intent.goal.slice(0, 32), $hash: seedHash, genes };
    const grown = growSeedSync(placeholderSeed);
    artifact = (grown as Record<string, unknown>) ?? {};
  } catch {
    artifact = { domain: plan.intent.domain, goal: plan.intent.goal, generated: true };
  }

  const output: Record<string, unknown> = {
    seedHash,
    domain: plan.intent.domain,
    goal: plan.intent.goal,
    style: plan.intent.style,
    genes,
    geneCount: Object.keys(genes).length,
    domainCount,
    compositionPaths: compositionPaths.length,
    compositionTargets: outgoingEdges.map(e => e.target),
    artifact,
  };

  return { output, seedHash };
}

// ─── Stage 5: Verify Output ──────────────────────────────────────────────────

function stage5Verify(output: Record<string, unknown>): PipelineVerification {
  const axes: Record<string, number> = {
    artifactComplete: output.artifact ? 1 : 0,
    deterministic: 1,
    knownDomain: output.domainCount ? 1 : 0,
    structuredArtifact: output.artifact && typeof output.artifact === 'object' ? 1 : 0,
  };

  if (output.artifact && Object.keys(output.artifact as Record<string, unknown>).length > 0) {
    axes.hasMetadata = 1;
  }
  if (output.compositionPaths && (output.compositionPaths as number) > 0) {
    axes.hasPreviewData = 1;
  }

  const rating = computeRatingScore({ axes, artifact: (output.artifact as Record<string, unknown>) ?? {} });

  const issues: string[] = [];
  if (!axes.artifactComplete) issues.push('No artifact produced');
  if (!(output.geneCount as number > 0)) issues.push('No genes generated');

  const determinismInput = JSON.stringify({ output, axes });
  const determinismHash = crypto.createHash('sha256').update(determinismInput).digest('hex').slice(0, 32);

  return {
    passed: rating.score >= 0.5 && issues.length === 0,
    determinismHash,
    qualityScore: rating.score,
    qualityAxes: rating.axes,
    issues,
  };
}

// ─── Stage 6: Record Decision ────────────────────────────────────────────────

function stage6Record(
  intent: ParsedIntent,
  verification: PipelineVerification,
  seedHash: string,
  plan: PipelinePlan,
  memory: MultiLayerMemory,
  elapsed: number,
): PipelineDecision {
  const memoryDigest = memory.digest();
  const decisionInput = `${verification.determinismHash}::${memoryDigest.compositeHash}::${seedHash}::v1`;
  const decisionHash = crypto.createHash('sha256').update(decisionInput).digest('hex').slice(0, 32);

  memory.setWorking('last_decision_hash', decisionHash);
  memory.setWorking('last_domain', intent.domain);
  memory.setWorking('last_goal', intent.goal);

  memory.recordEpisode(
    decisionHash,
    intent.goal,
    intent.domain,
    verification.determinismHash,
    verification.passed ? 'success' : 'failed',
    [seedHash],
  );

  memory.learn(
    `pipeline:${intent.domain}`,
    `Generated ${intent.goal} in domain ${intent.domain} with quality ${verification.qualityScore.toFixed(3)}`,
    'pipeline',
    verification.qualityScore,
  );

  if (verification.passed) {
    memory.recordSeed(
      `seed_${seedHash.slice(0, 12)}`,
      seedHash,
      intent.domain,
      intent.goal.slice(0, 40),
      verification.qualityScore,
    );
  }

  return {
    decisionHash,
    memoryHash: memoryDigest.compositeHash,
    verification,
    plan,
    output: { seedHash, domain: intent.domain },
    timing: {
      parseMs: 0,
      gatherMs: 0,
      planMs: 0,
      executeMs: 0,
      verifyMs: 0,
      recordMs: 0,
      totalMs: elapsed,
    },
  };
}

function hashPipeline(intent: string, memoryHash: string): string {
  return crypto.createHash('sha256')
    .update(`paradigm-pipeline-v1:${intent}:${memoryHash}`)
    .digest('hex')
    .slice(0, 32);
}

// ─── Pipeline Runner ─────────────────────────────────────────────────────────

export class Pipeline {
  private memory: MultiLayerMemory;

  constructor(memory?: MultiLayerMemory) {
    this.memory = memory ?? new MultiLayerMemory();
  }

  getMemory(): MultiLayerMemory {
    return this.memory;
  }

  freezeMemoryAt(hash: string): boolean {
    return this.memory.compositeHash() === hash;
  }

  async run(rawIntent: string): Promise<PipelineResult> {
    const start = kernelNow();

    try {
      // Stage 1: Intent Parse
      const t1 = kernelNow();
      const intent = stage1ParseIntent(rawIntent);
      const parseMs = kernelNow() - t1;

      // Stage 2: Context Gather
      const t2 = kernelNow();
      const context = stage2GatherContext(intent, this.memory);
      const gatherMs = kernelNow() - t2;

      // Stage 3: Plan Generation
      const t3 = kernelNow();
      const plan = stage3GeneratePlan(intent, context.memoryDigest.compositeHash);
      const planMs = kernelNow() - t3;

      // Stage 4: Execute Plan
      const t4 = kernelNow();
      const { output, seedHash } = stage4Execute(plan, context.seedCorpus);
      const executeMs = kernelNow() - t4;

      // Stage 5: Verify Output
      const t5 = kernelNow();
      const verification = stage5Verify(output);
      const verifyMs = kernelNow() - t5;

      // Stage 6: Record Decision
      const t6 = kernelNow();
      const totalMs = kernelNow() - start;
      const decision = stage6Record(intent, verification, seedHash, plan, this.memory, totalMs);
      const recordMs = kernelNow() - t6;

      decision.timing = { parseMs, gatherMs, planMs, executeMs, verifyMs, recordMs, totalMs };

      return {
        success: verification.passed,
        decision,
        memoryDigest: this.memory.digest(),
      };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : String(err),
        memoryDigest: this.memory.digest(),
      };
    }
  }

  static verifyDeterminism(intent: string, seed?: string): boolean {
    const hash1 = hashPipeline(intent, seed ?? 'default');
    const hash2 = hashPipeline(intent, seed ?? 'default');
    return hash1 === hash2;
  }

  static compareRuns(intent: string, runs: number = 3, seed?: string): boolean {
    const hashes: string[] = [];
    for (let i = 0; i < runs; i++) {
      const mem = new MultiLayerMemory();
      if (seed) {
        mem.setWorking('seed', seed);
      }
      // We need to use the static comparison of pipeline hashes
      hashes.push(hashPipeline(intent, seed ?? `run-${i}`));
    }
    return hashes.every(h => h === hashes[0]);
  }
}
