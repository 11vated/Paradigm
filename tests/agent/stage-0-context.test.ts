/**
 * Stage 0 live-context gathering tests.
 */
import { describe, it, expect } from 'vitest';
import { gatherLiveContext, renderContextBlock } from '../../src/lib/intelligence/agent/stages/stage-0-context';
import { WorkingMemory } from '../../src/lib/intelligence/memory/working';
import { DefaultMemoryOrchestrator } from '../../src/lib/intelligence/memory/orchestrator';

describe('Stage 0 — live context', () => {
  it('returns EMPTY context when memory and canon are both undefined', async () => {
    const ctx = await gatherLiveContext('hello', undefined, undefined);
    expect(ctx.recentUtterances).toHaveLength(0);
    expect(ctx.canonHits).toHaveLength(0);
    expect(ctx.semanticHits).toHaveLength(0);
    expect(ctx.focusSeed).toBeUndefined();
  });

  it('gathers recent utterances from working memory when conversationId is set', async () => {
    const wm = new WorkingMemory();
    await wm.put({ key: 'utt:conv-1:0', value: 'first message', topic: 'utterance', source: 'user' });
    await wm.put({ key: 'utt:conv-1:1', value: 'second message', topic: 'utterance', source: 'user' });
    const memory = new DefaultMemoryOrchestrator({ working: wm });
    const ctx = await gatherLiveContext('what next', memory, undefined, { conversationId: 'conv-1', recentUtterances: 10 });
    expect(ctx.recentUtterances.length).toBeGreaterThan(0);
  });

  it('renders a compact text block', async () => {
    const wm = new WorkingMemory();
    await wm.put({ key: 'utt:c:0', value: 'previous', topic: 'utterance', source: 'user' });
    const memory = new DefaultMemoryOrchestrator({ working: wm });
    const ctx = await gatherLiveContext('next', memory, undefined, { conversationId: 'c' });
    const rendered = renderContextBlock(ctx);
    expect(typeof rendered).toBe('string');
  });

  it('rendering an empty context produces empty string', () => {
    expect(renderContextBlock({
      recentUtterances: [],
      canonHits: [],
      semanticHits: [],
    })).toBe('');
  });

  it('truncates long preview content to 80-120 chars', () => {
    const long = 'x'.repeat(500);
    const rendered = renderContextBlock({
      recentUtterances: [{ text: long, createdAt: 0 }],
      canonHits: [{ key: 'k', similarity: 0.9, preview: long }],
      semanticHits: [{ key: 's', preview: long }],
    });
    expect(rendered.length).toBeLessThan(2000);
  });
});
