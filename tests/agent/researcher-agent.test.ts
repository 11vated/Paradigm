/**
 * Researcher sub-agent tests — air-gap default + network grant behavior.
 */
import { describe, it, expect } from 'vitest';
import { ResearcherAgent } from '../../src/lib/intelligence/agent/sub-agents/researcher-agent';
import { DEFAULT_TOOL_GRANTS } from '../../src/lib/intelligence/tools/types';
import type { SubAgentInput } from '../../src/lib/intelligence/agent/types';

function mkInput(words: string[]): SubAgentInput {
  return {
    intent: {
      raw: 'research dragons',
      top: 'INFORM',
      domains: ['narrative'],
      adjectives: words.map((w) => ({ word: w, vector: new Array(12).fill(0.3), intensity: 0.8, polarity: 1, weight: 0.5 })),
      entities: [],
      references: [],
      context: { tone: 'neutral' },
      budget: { latencyMsTarget: 1000, depth: 'shallow', quality: 0.6 },
      confidence: 0.7,
    },
    partial: [],
    memory: {
      recall: () => undefined,
      lookup: () => undefined,
      worldFact: () => undefined,
    },
  };
}

describe('ResearcherAgent', () => {
  it('air-gap mode (no harness): abstains with critique', async () => {
    const r = new ResearcherAgent();
    const out = await r.run(mkInput(['ancient', 'mythic']));
    expect(out.abstained).toBe(true);
    expect(out.produced).toHaveLength(0);
    expect(out.critiques?.[0]).toMatch(/air-gap/i);
  });

  it('has the researcher key registered in DEFAULT_TOOL_GRANTS', () => {
    expect(DEFAULT_TOOL_GRANTS).toHaveProperty('researcher');
    expect(DEFAULT_TOOL_GRANTS.researcher).toContain('web_search');
    expect(DEFAULT_TOOL_GRANTS.researcher).toContain('browse_page');
    expect(DEFAULT_TOOL_GRANTS.researcher).toContain('fetch_json');
  });

  it('network-failure path: abstains and surfaces error in critique', async () => {
    const stubHarness = {
      invoke: async () => { throw new Error('connection refused'); },
    } as any;
    const r = new ResearcherAgent({ harness: stubHarness });
    const out = await r.run(mkInput(['ancient']));
    expect(out.abstained).toBe(true);
    expect(out.critiques?.[0]).toMatch(/connection refused/);
  });

  it('successful search path: returns citations summary in critique', async () => {
    const stubHarness = {
      invoke: async () => ({
        ok: true,
        value: {
          results: [
            { url: 'https://example.com/dragons', title: 'Dragon Lore', snippet: 'In the time before...' },
            { url: 'https://example.com/myth', title: 'Mythic Beasts', snippet: 'Wyrms of the deep...' },
          ],
        },
      }),
    } as any;
    const r = new ResearcherAgent({ harness: stubHarness, maxCitations: 5 });
    const out = await r.run(mkInput(['ancient', 'mythic']));
    expect(out.abstained).toBe(false);
    expect(out.critiques?.[0]).toMatch(/2 citations/);
  });
});
