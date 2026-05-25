/**
 * Plan executor — activates the Director.
 *
 * Proves: a Director plan runs end-to-end across real engines, every node
 * lands in the manifest with primaryPath set, the manifest is deterministic,
 * unknown engines surface as error nodes (with continueOnError) instead of
 * aborting.
 */
import { describe, it as test, expect, beforeAll, afterAll } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { planUniverse } from '../../src/lib/engines/director';
import { executePlan, writeManifest } from '../../src/lib/engines/executor';

const TMP = path.join(os.tmpdir(), 'paradigm-executor-' + Date.now());
beforeAll(() => fs.mkdirSync(TMP, { recursive: true }));
afterAll(() => fs.rmSync(TMP, { recursive: true, force: true }));

function makeSeed(label: string) {
  return {
    $hash: `executor-test-${label}`,
    $kind: 'universe' as const,
    $version: '1.0',
  };
}

describe('plan executor', () => {
  test('executes a fantasy-epic plan end-to-end', async () => {
    const plan = planUniverse('a sweeping fantasy epic of dragons and starlight');
    const root = path.join(TMP, 'run-1');
    const manifest = await executePlan(plan, makeSeed('run-1'), { outputRoot: root, continueOnError: true });

    expect(manifest.archetype).toBe('fantasy-high');
    expect(manifest.nodeCount).toBeGreaterThan(0);
    // Some of the engines (matter/molecule, world/ecosystem, story/film) succeed
    // even in headless test mode; field/quantum requires no DOM. The plan layer
    // is deterministic so okCount must be > 0.
    expect(manifest.okCount).toBeGreaterThan(0);
    expect(manifest.nodes.length).toBe(manifest.nodeCount);
    for (const node of manifest.nodes) {
      expect(node.id).toBeTruthy();
      expect(node.engine).toBeTruthy();
      expect(['ok', 'error']).toContain(node.status);
      if (node.status === 'ok') expect(node.primaryPath).toBeTruthy();
      if (node.status === 'error') expect(node.error?.message).toBeTruthy();
    }
  });

  test('manifest writes to disk as canonical JSON', async () => {
    const plan = planUniverse('arena combat');
    const root = path.join(TMP, 'run-write');
    const manifest = await executePlan(plan, makeSeed('write'), { outputRoot: root, continueOnError: true });
    const p = writeManifest(manifest, root);
    expect(fs.existsSync(p)).toBe(true);
    const raw = fs.readFileSync(p, 'utf-8');
    const parsed = JSON.parse(raw);
    expect(parsed.archetype).toBe('abstract');
    expect(Array.isArray(parsed.nodes)).toBe(true);
  });

  test('determinism: same prompt + same seed → same archetype + same node count', async () => {
    const a = await executePlan(planUniverse('cyberpunk noir'), makeSeed('det'),
      { outputRoot: path.join(TMP, 'det-a'), continueOnError: true });
    const b = await executePlan(planUniverse('cyberpunk noir'), makeSeed('det'),
      { outputRoot: path.join(TMP, 'det-b'), continueOnError: true });
    expect(a.archetype).toBe(b.archetype);
    expect(a.nodeCount).toBe(b.nodeCount);
    expect(a.nodes.map((n) => n.engine)).toEqual(b.nodes.map((n) => n.engine));
    expect(a.nodes.map((n) => n.id)).toEqual(b.nodes.map((n) => n.id));
  });

  test('errors collected when continueOnError=true; first error aborts otherwise', async () => {
    // Inject a corrupt plan with an unknown engine id
    const plan = planUniverse('test');
    const corrupted = { ...plan, nodes: [{ id: 'bad', engine: 'nonexistent' as never, kind: 'x', dependsOn: [] }, ...plan.nodes] };
    const ok = await executePlan(corrupted as never, makeSeed('err-ok'),
      { outputRoot: path.join(TMP, 'err-ok'), continueOnError: true });
    expect(ok.errorCount).toBeGreaterThanOrEqual(1);
    expect(ok.nodes[0].status).toBe('error');
    expect(ok.nodes[0].error?.message).toMatch(/unknown engine/);

    const abort = await executePlan(corrupted as never, makeSeed('err-abort'),
      { outputRoot: path.join(TMP, 'err-abort') });
    expect(abort.nodeCount).toBe(1);
    expect(abort.nodes[0].status).toBe('error');
  });
});
