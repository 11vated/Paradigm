/**
 * Stage 1 — PARSE
 *
 * Takes a raw natural-language utterance and the conversation context
 * and produces a fully structured `ParsedIntent`:
 *   - top-level intent (10-way classification)
 *   - sub-intent (within the chosen top)
 *   - target domains (music, character, world, ...)
 *   - adjectives normalized into 12-D vectors (with intensity/polarity/weight)
 *   - named entities (character names, world refs, prior seeds)
 *   - budget hints (quality, time, novelty)
 *
 * Strategy: LLM-driven extraction with the intent taxonomy as a
 * structured grammar. The LLM is *not* asked to make any creative
 * decisions here — it is only an extractor. If the LLM is unavailable
 * or the call fails, we fall back to a regex + lexicon-based parser
 * that handles the most common phrasings.
 *
 * The Stage-1 output is fully serializable and forms part of the
 * lineage record. Same utterance + same lexicon version → same intent.
 */

import type { SeedLLM } from '../../llm/base';
import {
  ADJECTIVE_LEXICON,
  INTENSITY_MODIFIERS,
  NEGATION_TOKENS,
  normalizeAdjective,
} from '../adjective-normalization';
import { INTENT_TAXONOMY, INTENT_MAP, buildIntentTaxonomyPrompt } from '../intent-taxonomy';
import type {
  Adjective,
  NamedEntity,
  ParsedIntent,
  TopLevelIntent,
} from '../types';

export interface ParseOptions {
  llm?: SeedLLM;
  /** Names known to the user's canon, for entity resolution */
  knownNames?: Map<string, string>; // name → seed hash
  /** Domains the user has been working in recently (Stage-0 hint) */
  recentDomains?: string[];
}

export async function parse(raw: string, opts: ParseOptions = {}): Promise<ParsedIntent> {
  // Always run the heuristic parser first — it's deterministic and fast.
  const heuristic = heuristicParse(raw, opts);

  // If we have an LLM and the heuristic is uncertain, refine.
  if (opts.llm && heuristicIsUncertain(heuristic)) {
    try {
      const refined = await llmRefine(raw, heuristic, opts.llm);
      return refined;
    } catch {
      // Sovereignty: if the local model is offline, never fail loudly here.
      // We just trust the heuristic. The user can re-ask if it misclassifies.
    }
  }
  return heuristic;
}

// ─── Heuristic parser ──────────────────────────────────────────────────

function heuristicParse(raw: string, opts: ParseOptions): ParsedIntent {
  const lower = raw.toLowerCase();
  const tokens = tokenize(lower);

  // 1) Top-level intent — first matching trigger wins
  let top: TopLevelIntent = 'CREATE';
  let sub: string | undefined;
  for (const spec of INTENT_TAXONOMY) {
    if (spec.triggers.some((t) => lower.includes(t))) {
      top = spec.top;
      // Pick sub-intent whose example tokens overlap most
      const subSpec = spec.subIntents
        .map((s) => ({ id: s.id, score: overlapScore(tokens, s.examples) }))
        .sort((a, b) => b.score - a.score)[0];
      if (subSpec && subSpec.score > 0) sub = subSpec.id;
      break;
    }
  }

  // 2) Domains — keyword based; cumulative
  const domains = inferDomains(lower, opts.recentDomains ?? []);

  // 3) Adjectives — walk tokens, consume known adjectives + their modifiers
  const adjectives = extractAdjectives(tokens);

  // 4) Entities — look up known names, plus "the X" patterns
  const entities = extractEntities(raw, tokens, opts.knownNames);

  // 5) References — collect seed hashes referenced explicitly
  const references = extractRefs(raw);

  // 6) Budget hints — phrases like "high quality", "fast", "wild"
  const budget = extractBudget(lower);

  return {
    raw,
    top,
    sub,
    domains,
    adjectives,
    entities,
    references,
    budget,
    context: {},
  };
}

function heuristicIsUncertain(p: ParsedIntent): boolean {
  if (!p.sub) return true;
  if (p.domains.length === 0) return true;
  if (p.adjectives.length === 0 && p.raw.split(/\s+/).length > 6) return true;
  return false;
}

function overlapScore(tokens: string[], examples: string[]): number {
  const tset = new Set(tokens);
  let best = 0;
  for (const ex of examples) {
    const eset = new Set(tokenize(ex.toLowerCase()));
    let n = 0;
    for (const t of eset) if (tset.has(t)) n++;
    if (n > best) best = n;
  }
  return best;
}

function tokenize(s: string): string[] {
  return s.match(/[a-z0-9'-]+/g) ?? [];
}

function inferDomains(text: string, recent: string[]): string[] {
  const domains = new Set<string>();
  const map: Array<[RegExp, string]> = [
    [/character|persona|friend|hero|villain|npc/i, 'character'],
    [/music|song|melody|theme|score|soundtrack|beat/i, 'music'],
    [/world|setting|planet|realm|city|forest|ocean/i, 'world'],
    [/game|level|quest|mechanic|playable/i, 'game'],
    [/sprite|pixel|atlas/i, 'sprite'],
    [/3d|mesh|model|object/i, 'object'],
    [/visual|painting|poster|illustration|art/i, 'visual'],
    [/story|narrative|chapter|scene|dialogue/i, 'narrative'],
    [/vehicle|ship|car|drone|mech/i, 'vehicle'],
    [/architecture|building|temple|cathedral/i, 'architecture'],
    [/audio|sound|sfx|ambience/i, 'audio'],
    [/physics|gravity|atmosphere/i, 'physics'],
  ];
  for (const [re, d] of map) if (re.test(text)) domains.add(d);
  if (domains.size === 0) for (const d of recent.slice(0, 3)) domains.add(d);
  return [...domains];
}

function extractAdjectives(tokens: string[]): Adjective[] {
  const out: Adjective[] = [];
  for (let i = 0; i < tokens.length; i++) {
    const word = tokens[i];
    if (!(word in ADJECTIVE_LEXICON)) continue;

    let intensity = 1;
    let polarity: 1 | -1 = 1;
    let weight = 1;

    // Look backwards for modifiers / negation in a small window
    for (let j = Math.max(0, i - 2); j < i; j++) {
      const prev = tokens[j];
      if (INTENSITY_MODIFIERS[prev]) intensity *= INTENSITY_MODIFIERS[prev];
      if (NEGATION_TOKENS.has(prev)) polarity = -1;
    }

    // First adjective is often the dominant one; give it higher weight
    if (i < 4) weight = 1.2;

    const adj = normalizeAdjective(word, intensity, polarity, weight);
    if (adj) out.push(adj);
  }
  return out;
}

function extractEntities(raw: string, _tokens: string[], known?: Map<string, string>): NamedEntity[] {
  const out: NamedEntity[] = [];
  // Capitalized tokens after the first word, not following a period
  const matches = raw.match(/(?<!\.\s)\b[A-Z][a-z]{2,}/g) ?? [];
  for (const name of matches) {
    const canonRef = known?.get(name.toLowerCase());
    out.push({
      kind: canonRef ? 'reference' : 'character',
      text: name,
      ...(canonRef ? { canonRef } : {}),
    });
  }
  return out;
}

function extractRefs(raw: string): string[] {
  return raw.match(/0x[a-f0-9]{8,}/gi)?.map((s) => s.toLowerCase()) ?? [];
}

function extractBudget(text: string): ParsedIntent['budget'] {
  const out: ParsedIntent['budget'] = {};
  if (/high quality|polished|finished/.test(text)) out.quality = 0.9;
  if (/draft|rough|quick/.test(text)) out.quality = 0.4;
  if (/wild|strange|surprise|unusual|novel/.test(text)) out.novelty = 0.85;
  if (/safe|classic|standard/.test(text)) out.novelty = 0.25;
  if (/fast|quickly|now/.test(text)) out.timeMs = 3000;
  return out;
}

// ─── LLM refinement ────────────────────────────────────────────────────

async function llmRefine(
  raw: string,
  heuristic: ParsedIntent,
  llm: SeedLLM,
): Promise<ParsedIntent> {
  const prompt = buildRefinePrompt(raw, heuristic);
  // We re-use the generic LLM's text completion via the seed-shaped API.
  // The local model is given a strict JSON schema and instructed to
  // emit only the missing fields. We never trust it to override
  // heuristic-locked fields like the raw text.
  const seedShape = await llm.generateSeed(prompt).catch(() => null);
  if (!seedShape) return heuristic;

  const refined: ParsedIntent = { ...heuristic };
  const parsed = (seedShape as unknown as { genes?: { intent?: Record<string, unknown> } }).genes?.intent;
  if (!parsed) return heuristic;

  if (typeof parsed.top === 'string' && isTopLevel(parsed.top)) refined.top = parsed.top;
  if (typeof parsed.sub === 'string' && INTENT_MAP.has(parsed.sub)) refined.sub = parsed.sub;
  if (Array.isArray(parsed.domains)) {
    const merged = new Set<string>([...refined.domains, ...parsed.domains.filter((d): d is string => typeof d === 'string')]);
    refined.domains = [...merged];
  }
  return refined;
}

function isTopLevel(s: string): s is TopLevelIntent {
  return ['CREATE', 'EVOLVE', 'COMPOSE', 'BREED', 'EXPLAIN', 'CRITIQUE', 'TRANSPOSE', 'EMBODY', 'NAVIGATE', 'GOVERN'].includes(s);
}

function buildRefinePrompt(raw: string, heuristic: ParsedIntent): string {
  return [
    `You are the Stage-1 parser for the Paradigm Sovereign Agent.`,
    `Classify the user utterance against this taxonomy:`,
    ``,
    buildIntentTaxonomyPrompt(),
    ``,
    `User utterance: """${raw}"""`,
    `Heuristic guess (may be wrong):`,
    `  top=${heuristic.top}, sub=${heuristic.sub ?? '(none)'}, domains=${heuristic.domains.join(',')}`,
    ``,
    `Emit a JSON seed-shaped object with this schema:`,
    `  { genes: { intent: { top: <top>, sub: <sub-id>, domains: [<domain>, ...] } } }`,
    `Do not invent fields. If unsure, leave a field out.`,
  ].join('\n');
}
