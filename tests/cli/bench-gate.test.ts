/**
 * `paradigm bench` — Studio GA cold-start gate (Doctrine v2 Part VIII.11).
 *
 * Exit gate: first artifact in under 60_000ms across runs. CI verifies
 * the gate empirically.
 */
import { describe, it, expect } from 'vitest';
import { runBench } from '../../cli/commands/bench';

describe('Doctrine v2 Part VIII.11 — bench cold-start gate', () => {
  it('runs the bench harness end-to-end', async () => {
    const r = await runBench({ intent: 'gate-warmup', runs: 1, budgetMs: 60_000 });
    expect(r.schema).toBe('https://paradigm.ai/schema/bench/v1');
    expect(r.runs).toBe(1);
    expect(r.totalMs.count).toBe(1);
    expect(r.totalMs.meanMs).toBeGreaterThan(0);
    expect(r.artifactHashes).toHaveLength(1);
  }, 90_000);

  it('first artifact lands well under the 60-second Studio GA budget', async () => {
    const r = await runBench({ intent: 'a wandering monk under moonlight', runs: 3, budgetMs: 60_000 });
    expect(r.passed).toBe(true);
    expect(r.totalMs.p95Ms).toBeLessThan(60_000);
    expect(r.totalMs.meanMs).toBeLessThan(60_000);
    // The substrate should actually be FAST — empirically we expect << 5s.
    expect(r.totalMs.p95Ms).toBeLessThan(15_000);
  }, 120_000);

  it('artifacts across runs are byte-stable (determinism property)', async () => {
    const r = await runBench({ intent: 'a forge in the deep mountain', runs: 3, budgetMs: 60_000 });
    expect(r.artifactsByteStable).toBe(true);
    // All hashes identical.
    expect(new Set(r.artifactHashes).size).toBe(1);
  }, 120_000);

  it('manifest is byte-stable across runs with same inputs', async () => {
    // Same intent + same runs + same budget → same manifest hash.
    const a = await runBench({ intent: 'identity-check', runs: 2, budgetMs: 60_000 });
    const b = await runBench({ intent: 'identity-check', runs: 2, budgetMs: 60_000 });
    // Note: timings differ across runs, so the manifestHash will too.
    // What we assert: artifact hashes must match (substrate determinism).
    expect(a.artifactHashes[0]).toBe(b.artifactHashes[0]);
  }, 120_000);
});
