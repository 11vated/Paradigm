/**
 * Executor — reality archetype routing (WS37).
 * Proves: when archetype is reality-*, field nodes go through renderReality
 * (not the generic engine.generate).
 */
import { describe, it as test, expect, beforeAll, afterAll } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { planUniverse } from '../../src/lib/engines/director';
import { executePlan } from '../../src/lib/engines/executor';

const TMP = path.join(os.tmpdir(), 'paradigm-exec-reality-' + Date.now());
beforeAll(() => fs.mkdirSync(TMP, { recursive: true }));
afterAll(() => fs.rmSync(TMP, { recursive: true, force: true }));

const makeSeed = (hash: string) => ({ $hash: hash, $domain: 'reality', genes: {} });

describe('executor reality routing', () => {
  test('reality-quantum plan: field node routed via renderReality', async () => {
    const plan = planUniverse('render the quantum wavefunction of hydrogen 1s orbital');
    const manifest = await executePlan(plan, makeSeed('q-1'), { outputRoot: path.join(TMP, 'q'), continueOnError: true });
    expect(manifest.archetype).toBe('reality-quantum');
    const fieldNode = manifest.nodes.find((n: any) => n.engine === 'field');
    expect(fieldNode).toBeDefined();
    expect(fieldNode!.status).toBe('ok');
    expect(fieldNode!.primaryPath).toBeTruthy();
    expect(fs.existsSync(fieldNode!.primaryPath!)).toBe(true);
    // renderReality stamps fieldKind='quantum' in metrics
    expect((fieldNode!.metrics as any)?.fieldKind).toBe('quantum');
  });

  test('reality-em plan: field node uses electromagnetic kind', async () => {
    const plan = planUniverse('magnetar surface emitting x-ray jets');
    const manifest = await executePlan(plan, makeSeed('em-1'), { outputRoot: path.join(TMP, 'em'), continueOnError: true });
    expect(manifest.archetype).toBe('reality-em');
    const fieldNode = manifest.nodes.find((n: any) => n.engine === 'field');
    expect(fieldNode).toBeDefined();
    expect(fieldNode!.status).toBe('ok');
    expect((fieldNode!.metrics as any)?.fieldKind).toBe('electromagnetic');
  });

  test('reality-cosmic plan: field node uses cosmological kind', async () => {
    const plan = planUniverse('gravitational lensing of a distant quasar by dark matter halo');
    const manifest = await executePlan(plan, makeSeed('c-1'), { outputRoot: path.join(TMP, 'c'), continueOnError: true });
    expect(manifest.archetype).toBe('reality-cosmic');
    const fieldNode = manifest.nodes.find((n: any) => n.engine === 'field');
    expect(fieldNode!.status).toBe('ok');
    expect((fieldNode!.metrics as any)?.fieldKind).toBe('cosmological');
  });

  test('fantasy plan: field engine NOT in schedule', async () => {
    const plan = planUniverse('a sweeping fantasy epic of dragons and starlight');
    expect(plan.nodes.find((n) => n.engine === 'field')).toBeUndefined();
  });
});
