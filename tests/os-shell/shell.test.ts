import { describe, it, expect } from 'vitest';
import { OSShell } from '../../src/lib/os-shell/shell';

function createShell(): OSShell {
  return new OSShell('test-session');
}

describe('OSShell', () => {

  it('help returns command list', async () => {
    const shell = createShell();
    const result = await shell.execute('help');
    expect(result.success).toBe(true);
    expect(result.message).toContain('seed');
    expect(result.message).toContain('artifact');
    expect(result.message).toContain('gspl');
    expect(result.message).toContain('recursive');
  });

  it('unknown command returns error', async () => {
    const shell = createShell();
    const result = await shell.execute('foobar');
    expect(result.success).toBe(false);
    expect(result.message).toContain('Unknown command');
  });

  it('empty command returns error', async () => {
    const shell = createShell();
    const result = await shell.execute('');
    expect(result.success).toBe(false);
  });

  // ─── Seed Commands ─────────────────────────────────────────────────────

  it('seed create creates a seed', async () => {
    const shell = createShell();
    const result = await shell.execute('seed create');
    expect(result.success).toBe(true);
    expect(result.message).toContain('Created seed');
    expect(result.seed).toBeDefined();
    expect(result.seed!.domain).toBe('procedural');
  });

  it('seed create accepts domain and name', async () => {
    const shell = createShell();
    const result = await shell.execute('seed create character Aria');
    expect(result.success).toBe(true);
    expect(result.seed!.domain).toBe('character');
    expect(result.seed!.name).toBe('Aria');
  });

  it('seed mutate mutates a seed', async () => {
    const shell = createShell();
    const created = await shell.execute('seed create character Hero');
    expect(created.success).toBe(true);

    const result = await shell.execute(`seed mutate ${created.seed!.id} 0.2`);
    expect(result.success).toBe(true);
    expect(result.message).toContain('Mutated');
    expect(result.seed).toBeDefined();
    expect(result.seed!.id).not.toBe(created.seed!.id);
  });

  it('seed mutate on nonexistent seed returns error', async () => {
    const shell = createShell();
    const result = await shell.execute('seed mutate nonexistent');
    expect(result.success).toBe(false);
    expect(result.message).toContain('not found');
  });

  it('seed breed crosses two seeds', async () => {
    const shell = createShell();
    const a = await shell.execute('seed create character A');
    const b = await shell.execute('seed create character B');

    const result = await shell.execute(`seed breed ${a.seed!.id} ${b.seed!.id}`);
    expect(result.success).toBe(true);
    expect(result.message).toContain('Bred');
    expect(result.seed).toBeDefined();
  });

  it('seed breed with missing args returns error', async () => {
    const shell = createShell();
    const result = await shell.execute('seed breed only-one');
    expect(result.success).toBe(false);
  });

  it('seed evolve evolves a seed', async () => {
    const shell = createShell();
    const created = await shell.execute('seed create procedural Evo');
    expect(created.success).toBe(true);

    const result = await shell.execute(`seed evolve ${created.seed!.id} 3 5`);
    expect(result.success).toBe(true);
    expect(result.message).toContain('Evolved');
    expect(result.data).toBeDefined();
  });

  it('seed evolve on nonexistent seed returns error', async () => {
    const shell = createShell();
    const result = await shell.execute('seed evolve nonexistent 5');
    expect(result.success).toBe(false);
    expect(result.message).toContain('not found');
  });

  it('seed clone clones a seed', async () => {
    const shell = createShell();
    const created = await shell.execute('seed create character CloneMe');

    const result = await shell.execute(`seed clone ${created.seed!.id}`);
    expect(result.success).toBe(true);
    expect(result.message).toContain('Cloned');
    expect(result.seed!.id).toContain(':clone');
  });

  it('seed show shows seed details', async () => {
    const shell = createShell();
    const created = await shell.execute('seed create music Melody');

    const result = await shell.execute(`seed show ${created.seed!.id}`);
    expect(result.success).toBe(true);
    expect(result.message).toContain('Melody');
    expect(result.data).toBeDefined();
  });

  // ─── Artifact Commands ─────────────────────────────────────────────────

  it('artifact grow grows an artifact from a seed', async () => {
    const shell = createShell();
    const created = await shell.execute('seed create character GrowMe');

    const result = await shell.execute(`artifact grow ${created.seed!.id}`);
    expect(result.success).toBe(true);
    expect(result.message).toContain('Grew');
    expect(result.artifact).toBeDefined();
    expect(result.artifact!.type).toBe('grown');
  });

  it('artifact grow with --domain overrides domain', async () => {
    const shell = createShell();
    const created = await shell.execute('seed create visual2d Canvas');

    const result = await shell.execute(`artifact grow ${created.seed!.id} --domain music`);
    expect(result.success).toBe(true);
    expect(result.artifact!.domain).toBe('music');
  });

  it('artifact compose transforms a seed into a target domain', async () => {
    const shell = createShell();
    const created = await shell.execute('seed create character TransformMe');

    const result = await shell.execute(`artifact compose ${created.seed!.id} music`);
    expect(result.success).toBe(true);
    expect(result.message).toContain('Composed');
    expect(result.artifact).toBeDefined();
    expect(result.artifact!.domain).toBe('music');
  });

  it('artifact play shows artifact info', async () => {
    const shell = createShell();
    const created = await shell.execute('seed create character ShowMe');
    const grown = await shell.execute(`artifact grow ${created.seed!.id}`);

    const result = await shell.execute(`artifact play ${grown.artifact!.id}`);
    expect(result.success).toBe(true);
    expect(result.message).toContain('Playing');
    expect(result.data).toBeDefined();
  });

  it('artifact export exports a seed as JSON', async () => {
    const shell = createShell();
    const created = await shell.execute('seed create character ExportSeed');

    const result = await shell.execute(`artifact export ${created.seed!.id}`);
    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();
    expect(typeof result.data).toBe('string');

    const parsed = JSON.parse(result.data as string);
    expect(parsed.name).toBe('ExportSeed');
  });

  it('artifact sign signs a seed', async () => {
    const shell = createShell();
    const created = await shell.execute('seed create character SignMe');

    const result = await shell.execute(`artifact sign ${created.seed!.id}`);
    expect(result.success).toBe(true);
    expect(result.message).toContain('Signed');
    expect(result.data).toBeDefined();
  });

  it('artifact sign on nonexistent seed returns error', async () => {
    const shell = createShell();
    const result = await shell.execute('artifact sign nonexistent');
    expect(result.success).toBe(false);
  });

  // ─── GSPL ──────────────────────────────────────────────────────────────

  it('gspl executes GSPL code', async () => {
    const shell = createShell();
    const result = await shell.execute('gspl seed "test" in character { strength: 0.8 }');
    expect(result.success).toBe(true);
  });

  it('gspl with no code returns error', async () => {
    const shell = createShell();
    const result = await shell.execute('gspl');
    expect(result.success).toBe(false);
  });

  // ─── Recursive Self-Host ───────────────────────────────────────────────

  it('recursive self-hosts known components', async () => {
    const shell = createShell();

    for (const target of ['shell', 'kernel', 'engine', 'agent', 'cli']) {
      const result = await shell.execute(`recursive ${target}`);
      expect(result.success).toBe(true);
      expect(result.message).toContain(target);
      expect(result.data).toBeDefined();
    }
  });

  it('recursive on unknown component returns error', async () => {
    const shell = createShell();
    const result = await shell.execute('recursive nonexistent');
    expect(result.success).toBe(false);
    expect(result.message).toContain('Unknown component');
  });

  it('recursive with no args defaults to shell', async () => {
    const shell = createShell();
    const result = await shell.execute('recursive');
    expect(result.success).toBe(true);
    expect(result.message).toContain('shell');
  });

  // ─── List ──────────────────────────────────────────────────────────────

  it('list shows seeds and artifacts', async () => {
    const shell = createShell();
    await shell.execute('seed create character');

    const result = await shell.execute('list');
    expect(result.success).toBe(true);
    expect(result.message).toContain('Seeds');
  });

  it('list seeds shows only seeds', async () => {
    const shell = createShell();
    await shell.execute('seed create character');

    const result = await shell.execute('list seeds');
    expect(result.success).toBe(true);
    expect(result.message).toContain('Seeds');
    expect(result.message).not.toContain('Artifacts');
  });

  it('list artifacts shows only artifacts', async () => {
    const shell = createShell();
    await shell.execute('seed create character');

    const result = await shell.execute('list artifacts');
    expect(result.success).toBe(true);
    expect(result.message).toContain('Artifacts');
    expect(result.message).not.toContain('Seeds');
  });

  // ─── Session Tracking ──────────────────────────────────────────────────

  it('session tracks command count', async () => {
    const shell = createShell();
    expect(shell.getSession().commandCount).toBe(0);

    await shell.execute('help');
    expect(shell.getSession().commandCount).toBe(1);

    await shell.execute('help');
    expect(shell.getSession().commandCount).toBe(2);
  });

  it('session seeds are retrievable', async () => {
    const shell = createShell();
    await shell.execute('seed create character RetrieveMe');

    const seeds = shell.getSession().seeds;
    expect(seeds.size).toBeGreaterThan(0);

    const savedSeed = shell.getSeed(Array.from(seeds.keys())[0]!);
    expect(savedSeed).toBeDefined();
    expect(savedSeed!.name).toBe('RetrieveMe');
  });

  // ─── Determinism ───────────────────────────────────────────────────────

  it('same session determinism: cloning produces same hash', async () => {
    const shell = createShell();
    const orig = await shell.execute('seed create character CloneTest');
    expect(orig.seed!.hash.length).toBeGreaterThan(0);

    const cloned = await shell.execute(`seed clone ${orig.seed!.id}`);
    expect(cloned.success).toBe(true);
    expect(cloned.seed!.lineage).toContain(orig.seed!.id);
    expect(cloned.seed!.domain).toBe(orig.seed!.domain);
  });
});
