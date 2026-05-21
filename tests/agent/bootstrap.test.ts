/**
 * Self-bootstrapping loop tests.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import {
  InMemoryBootstrapStore,
  captureFromAgentRun,
  exampleId,
  exportJsonl,
  exportShareGpt,
  exportAlpaca,
  curate,
  type BootstrapExample,
} from '../../src/lib/intelligence/bootstrap';

function fakeExample(over: Partial<BootstrapExample> = {}): BootstrapExample {
  return {
    id: 'fake',
    rawUtterance: 'melancholy ocean ally named aria',
    intent: { top: 'CREATE', sub: 'character', domains: ['character', 'friend'] },
    planHash: 'p_abc',
    seedHash: 's_def',
    oracleScore: 0.92,
    oracleAxes: { coherence: 0.9, novelty: 0.85 },
    llm: { provider: 'ollama', model: 'qwen2.5:7b' },
    capturedAt: 1000,
    iteration: 0,
    userApproved: undefined,
    ...over,
  };
}

describe('Self-bootstrapping store', () => {
  let store: InMemoryBootstrapStore;
  beforeEach(() => {
    store = new InMemoryBootstrapStore();
  });

  it('capture round-trips a single example', async () => {
    const ex = fakeExample();
    await store.capture(ex);
    const out = await store.list();
    expect(out).toHaveLength(1);
    expect(out[0].rawUtterance).toBe('melancholy ocean ally named aria');
  });

  it('rejects examples missing required fields', async () => {
    await expect(store.capture(fakeExample({ id: '' }))).rejects.toThrow();
    await expect(store.capture(fakeExample({ rawUtterance: '' }))).rejects.toThrow();
  });

  it('exampleId is deterministic — same utterance + planHash → same id', () => {
    const a = exampleId('hello', 'p_abc');
    const b = exampleId('hello', 'p_abc');
    const c = exampleId('hello', 'p_xyz');
    expect(a).toBe(b);
    expect(a).not.toBe(c);
    expect(a).toHaveLength(32);
  });

  it('captureFromAgentRun builds a valid example', () => {
    const ex = captureFromAgentRun({
      rawUtterance: 'a melancholy ocean ally named Aria',
      intent: { top: 'CREATE', sub: 'character', domains: ['character'] },
      planHash: 'p_abc',
      seedHash: 's_def',
      oracleScore: 0.91,
      llm: { provider: 'ollama', model: 'qwen2.5:7b' },
    });
    expect(ex.id).toHaveLength(32);
    expect(ex.oracleScore).toBe(0.91);
    expect(ex.iteration).toBe(0);
  });

  it('list filters by minScore + topIntents + userApprovedOnly + since', async () => {
    await store.capture(fakeExample({ id: '1', oracleScore: 0.50, capturedAt: 100 }));
    await store.capture(fakeExample({ id: '2', oracleScore: 0.90, capturedAt: 200, userApproved: true }));
    await store.capture(fakeExample({ id: '3', oracleScore: 0.95, capturedAt: 300, intent: { top: 'EVOLVE', domains: ['friend'] } }));

    expect((await store.list({ minScore: 0.85 })).length).toBe(2);
    expect((await store.list({ userApprovedOnly: true })).length).toBe(1);
    expect((await store.list({ topIntents: ['EVOLVE'] })).length).toBe(1);
    expect((await store.list({ since: 200 })).length).toBe(2);
  });

  it('stats reports total + avgScore + highQuality + per-intent counts', async () => {
    await store.capture(fakeExample({ id: '1', oracleScore: 0.50 }));
    await store.capture(fakeExample({ id: '2', oracleScore: 0.90, userApproved: true }));
    await store.capture(fakeExample({ id: '3', oracleScore: 0.95 }));

    const s = await store.stats();
    expect(s.total).toBe(3);
    expect(s.highQuality).toBe(2);
    expect(s.userApproved).toBe(1);
    expect(s.avgScore).toBeCloseTo((0.5 + 0.9 + 0.95) / 3, 3);
    expect(s.byTopIntent['CREATE']).toBe(3);
  });

  it('exportJsonl is lossless', async () => {
    await store.capture(fakeExample({ id: '1' }));
    await store.capture(fakeExample({ id: '2', oracleScore: 0.85 }));
    const exs = await store.list();
    const r = exportJsonl(exs);
    expect(r.count).toBe(2);
    const parsed = r.body.split('\n').map((l) => JSON.parse(l));
    expect(parsed[0].id).toBe('1');
    expect(parsed[1].oracleScore).toBe(0.85);
  });

  it('exportShareGpt builds two-turn conversation rows', async () => {
    await store.capture(fakeExample());
    const r = exportShareGpt(await store.list());
    const row = JSON.parse(r.body);
    expect(row.conversations[0].from).toBe('human');
    expect(row.conversations[1].from).toBe('gpt');
    expect(row.score).toBe(0.92);
  });

  it('exportAlpaca builds instruction/input/output rows', async () => {
    await store.capture(fakeExample());
    const r = exportAlpaca(await store.list());
    const row = JSON.parse(r.body);
    expect(row.instruction).toContain('GSPL');
    expect(row.input).toBe('melancholy ocean ally named aria');
  });

  it('curate picks top-K by score', () => {
    const exs = [0.5, 0.95, 0.8, 0.91, 0.6].map((s, i) => fakeExample({ id: `${i}`, oracleScore: s }));
    const top = curate(exs, { topPercent: 0.4 }); // top 40% of 5 = 2
    expect(top).toHaveLength(2);
    expect(top[0].oracleScore).toBe(0.95);
    expect(top[1].oracleScore).toBe(0.91);
  });

  it('curate enforces minScore + userApprovedOnly', () => {
    const exs = [
      fakeExample({ id: '1', oracleScore: 0.5, userApproved: false }),
      fakeExample({ id: '2', oracleScore: 0.9, userApproved: true }),
      fakeExample({ id: '3', oracleScore: 0.95, userApproved: false }),
    ];
    expect(curate(exs, { minScore: 0.85 }).length).toBe(2);
    expect(curate(exs, { userApprovedOnly: true }).length).toBe(1);
    expect(curate(exs, { minScore: 0.85, userApprovedOnly: true }).length).toBe(1);
  });
});
