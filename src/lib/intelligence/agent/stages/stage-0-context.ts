/**
 * Stage 0 — LIVE CONTEXT (optional, pre-Parse)
 *
 * Gathers everything the agent should know BEFORE it interprets the
 * user's utterance. Three sources, in order:
 *   1. Working memory  — last N utterances + current focus seed
 *   2. Canon RAG       — top-K semantically similar prior seeds
 *   3. Semantic L3     — workspace conventions for the inferred domain
 *
 * Output is a `LiveContext` value the orchestrator surfaces to Stage 1
 * (Parse), which can use it as few-shot examples + disambiguators.
 *
 * Pure function. NO LLM. NO network.
 */

import type { MemoryOrchestrator } from '../../memory/types';
import type { CanonMemory } from '../../memory/canon';

export interface LiveContextOptions {
  conversationId?: string;
  recentUtterances?: number;
  canonHits?: number;
  semanticHits?: number;
}

export interface LiveContext {
  recentUtterances: Array<{ text: string; createdAt: number }>;
  canonHits: Array<{ key: string; similarity: number; preview?: string }>;
  semanticHits: Array<{ key: string; preview?: string }>;
  focusSeed?: { key: string; preview?: string };
}

const EMPTY: LiveContext = {
  recentUtterances: [],
  canonHits: [],
  semanticHits: [],
};

export async function gatherLiveContext(
  utterance: string,
  memory: MemoryOrchestrator | undefined,
  canon: CanonMemory | undefined,
  opts: LiveContextOptions = {},
): Promise<LiveContext> {
  if (!memory && !canon) return EMPTY;

  const out: LiveContext = { recentUtterances: [], canonHits: [], semanticHits: [] };

  // 1. Recent utterances from working memory (per conversation)
  if (memory && opts.conversationId) {
    try {
      const hits = await memory.search({
        topic: 'utterance',
        key: `utt:${opts.conversationId}:`,
        limit: opts.recentUtterances ?? 5,
      });
      out.recentUtterances = hits
        .map((h: any) => ({ text: String(h.value ?? ''), createdAt: h.updatedAt ?? 0 }))
        .filter((x) => x.text.length > 0)
        .sort((a, b) => b.createdAt - a.createdAt);
    } catch { /* working layer may be missing */ }
  }

  // 2. Canon RAG — top-K semantic neighbours of the current utterance
  if (canon) {
    try {
      const hits = await canon.recall(utterance, { limit: opts.canonHits ?? 3 });
      out.canonHits = hits.map((h: any) => ({
        key: String(h.entry?.key ?? ''),
        similarity: Number(h.similarity ?? 0),
        preview: typeof h.entry?.content === 'string'
          ? h.entry.content.slice(0, 120)
          : undefined,
      }));
    } catch { /* canon may be empty */ }
  }

  // 3. Semantic L3 — workspace conventions for the inferred domain
  if (memory) {
    try {
      const hits = await memory.search({
        topic: 'convention',
        limit: opts.semanticHits ?? 3,
      });
      out.semanticHits = hits.map((h: any) => ({
        key: String(h.key ?? ''),
        preview: typeof h.value === 'string' ? h.value.slice(0, 80) : undefined,
      }));
    } catch { /* layer may not be configured */ }
  }

  // 4. Focus seed — most recently created entry in working memory
  if (memory) {
    try {
      const recent = await memory.search({ topic: 'seed', limit: 1 });
      if (recent.length > 0) {
        out.focusSeed = {
          key: String(recent[0].key ?? ''),
          preview: typeof recent[0].value === 'string' ? recent[0].value.slice(0, 80) : undefined,
        };
      }
    } catch { /* no seeds yet */ }
  }

  return out;
}

/** Render a LiveContext as a compact text block for inclusion in LLM prompts. */
export function renderContextBlock(ctx: LiveContext): string {
  const parts: string[] = [];
  if (ctx.recentUtterances.length > 0) {
    parts.push('Recent utterances:');
    for (const u of ctx.recentUtterances) parts.push(`  - "${u.text}"`);
  }
  if (ctx.canonHits.length > 0) {
    parts.push('Canon hits (semantic neighbours):');
    for (const h of ctx.canonHits) {
      parts.push(`  - ${h.key} (similarity ${h.similarity.toFixed(2)})${h.preview ? `: ${h.preview}` : ''}`);
    }
  }
  if (ctx.semanticHits.length > 0) {
    parts.push('Workspace conventions:');
    for (const h of ctx.semanticHits) {
      parts.push(`  - ${h.key}${h.preview ? `: ${h.preview}` : ''}`);
    }
  }
  if (ctx.focusSeed) {
    parts.push(`Current focus seed: ${ctx.focusSeed.key}${ctx.focusSeed.preview ? ` — ${ctx.focusSeed.preview}` : ''}`);
  }
  return parts.join('\n');
}
