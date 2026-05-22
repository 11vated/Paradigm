/**
 * New Domain Generators — smoke tests
 * Verifies: website, field, quantum, molecule, cosmology
 * Each test: grow a seed → check output file exists + key metrics
 */

import { describe, test, expect, beforeAll, afterAll } from 'bun:test';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

import { generateWebsite }  from '../../src/lib/kernel/generators/website';
import { generateField }    from '../../src/lib/kernel/generators/field';
import { generateQuantum }  from '../../src/lib/kernel/generators/quantum';
import { generateMolecule } from '../../src/lib/kernel/generators/molecule';
import { generateCosmology } from '../../src/lib/kernel/generators/cosmology';

const TMP = path.join(os.tmpdir(), 'paradigm-test-' + Date.now());
beforeAll(() => fs.mkdirSync(TMP, { recursive: true }));
afterAll(() => fs.rmSync(TMP, { recursive: true, force: true }));

function makeSeed(domain: string, extra?: Record<string, unknown>) {
  return {
    $hash: `test-${domain}-0123456789abcdef`,
    $name: `test-${domain}`,
    $domain: domain,
    genes: {},
    ...extra,
  };
}

describe('Website Generator', () => {
  test('produces a valid HTML file', async () => {
    const seed = makeSeed('website');
    const out = await generateWebsite(seed, path.join(TMP, 'website.html'));
    expect(out.filePath).toBeTruthy();
    expect(fs.existsSync(out.filePath)).toBe(true);
    const html = out.indexHtml;
    expect(html).toContain('<!DOCTYPE html>');
    expect(html).toContain('<style>');
    expect(html).toContain('<script>');
    expect(html).toContain('Grown by Paradigm');
    expect(out.sectionCount).toBeGreaterThan(0);
    expect(out.lineCount).toBeGreaterThan(100);
  });

  test('same seed produces bit-identical HTML (determinism)', async () => {
    const seed = makeSeed('website');
    const [a, b] = await Promise.all([
      generateWebsite(seed, path.join(TMP, 'website-a.html')),
      generateWebsite(seed, path.join(TMP, 'website-b.html')),
    ]);
    expect(a.indexHtml).toBe(b.indexHtml);
  });

  test('different seeds produce different HTML', async () => {
    const s1 = makeSeed('website', { $hash: 'aaa-website-seed-1' });
    const s2 = makeSeed('website', { $hash: 'bbb-website-seed-2' });
    const [a, b] = await Promise.all([
      generateWebsite(s1, path.join(TMP, 'website-s1.html')),
      generateWebsite(s2, path.join(TMP, 'website-s2.html')),
    ]);
    expect(a.indexHtml).not.toBe(b.indexHtml);
  });
});

describe('Field Generator (FDTD EM Simulation)', () => {
  test('produces SVG and JSON files', async () => {
    const seed = makeSeed('field');
    const out = await generateField(seed, path.join(TMP, 'field.svg'));
    expect(out.svgPath).toBeTruthy();
    expect(fs.existsSync(out.svgPath)).toBe(true);
    expect(fs.existsSync(out.jsonPath)).toBe(true);

    const svg = fs.readFileSync(out.svgPath, 'utf-8');
    expect(svg).toContain('<svg');
    expect(svg).toContain('FIELD');
    expect(svg.length).toBeGreaterThan(1000);

    const json = JSON.parse(fs.readFileSync(out.jsonPath, 'utf-8'));
    expect(json.fieldType).toBeTruthy();
    expect(json.gridSize).toBeGreaterThanOrEqual(32);
    expect(json.snapshots).toBeInstanceOf(Array);
  });

  test('is deterministic', async () => {
    const seed = makeSeed('field', { $hash: 'field-determ-test-abc123' });
    const [a, b] = await Promise.all([
      generateField(seed, path.join(TMP, 'field-a.svg')),
      generateField(seed, path.join(TMP, 'field-b.svg')),
    ]);
    const svgA = fs.readFileSync(a.svgPath, 'utf-8');
    const svgB = fs.readFileSync(b.svgPath, 'utf-8');
    expect(svgA).toBe(svgB);
  });

  test('energy density is non-zero for active simulation', async () => {
    const seed = makeSeed('field');
    const out = await generateField(seed, path.join(TMP, 'field-energy.svg'));
    expect(out.energyDensity).toBeGreaterThan(0);
  });
});

describe('Quantum Generator (Schrödinger Equation)', () => {
  test('produces SVG and JSON files', async () => {
    const seed = makeSeed('quantum');
    const out = await generateQuantum(seed, path.join(TMP, 'quantum.svg'));
    expect(fs.existsSync(out.svgPath)).toBe(true);
    expect(fs.existsSync(out.jsonPath)).toBe(true);

    const svg = fs.readFileSync(out.svgPath, 'utf-8');
    expect(svg).toContain('<svg');
    expect(svg).toContain('|ψ|²');
    expect(svg.length).toBeGreaterThan(5000);
  });

  test('wavefunction normalization is close to 1', async () => {
    const seed = makeSeed('quantum');
    const out = await generateQuantum(seed, path.join(TMP, 'quantum-norm.svg'));
    expect(out.normalization).toBeGreaterThan(0);
  });

  test('is deterministic', async () => {
    const seed = makeSeed('quantum', { $hash: 'quantum-determ-xyz987' });
    const [a, b] = await Promise.all([
      generateQuantum(seed, path.join(TMP, 'quantum-a.svg')),
      generateQuantum(seed, path.join(TMP, 'quantum-b.svg')),
    ]);
    const svgA = fs.readFileSync(a.svgPath, 'utf-8');
    const svgB = fs.readFileSync(b.svgPath, 'utf-8');
    expect(svgA).toBe(svgB);
  });
});

describe('Molecule Generator (Structural Chemistry)', () => {
  test('produces SVG, PDB, and JSON files', async () => {
    const seed = makeSeed('molecule');
    const out = await generateMolecule(seed, path.join(TMP, 'mol.svg'));
    expect(fs.existsSync(out.svgPath)).toBe(true);
    expect(fs.existsSync(out.pdbPath)).toBe(true);
    expect(fs.existsSync(out.jsonPath)).toBe(true);

    const svg = fs.readFileSync(out.svgPath, 'utf-8');
    expect(svg).toContain('<svg');
    expect(svg).toContain('MW');

    const pdb = fs.readFileSync(out.pdbPath, 'utf-8');
    expect(pdb).toContain('ATOM');
    expect(pdb).toContain('END');
  });

  test('molecular weight is physically reasonable', async () => {
    const seed = makeSeed('molecule');
    const out = await generateMolecule(seed, path.join(TMP, 'mol-mw.svg'));
    expect(out.mw).toBeGreaterThan(0);
    expect(out.mw).toBeLessThan(10000);
    expect(out.atomCount).toBeGreaterThan(0);
    expect(out.bondCount).toBeGreaterThan(0);
  });

  test('is deterministic', async () => {
    const seed = makeSeed('molecule', { $hash: 'mol-determ-test-def456' });
    const [a, b] = await Promise.all([
      generateMolecule(seed, path.join(TMP, 'mol-a.svg')),
      generateMolecule(seed, path.join(TMP, 'mol-b.svg')),
    ]);
    expect(a.formula).toBe(b.formula);
    expect(a.mw).toBe(b.mw);
    expect(a.atomCount).toBe(b.atomCount);
  });

  test('all molecular classes produce valid structures', async () => {
    const classes = ['organic', 'aromatic', 'heterocyclic', 'peptide', 'nucleotide', 'organometallic', 'polymer', 'inorganic'] as const;
    for (const cls of classes) {
      const seed = {
        $hash: `mol-${cls}-test`,
        $name: `test-${cls}`,
        $domain: 'molecule',
        genes: { moleculeClass: { type: 'categorical', value: cls } },
      };
      const out = await generateMolecule(seed, path.join(TMP, `mol-${cls}.svg`));
      expect(out.atomCount).toBeGreaterThan(0);
      expect(out.formula.length).toBeGreaterThan(0);
    }
  });
});

describe('Cosmology Generator (N-Body Leapfrog)', () => {
  test('produces SVG and JSON files', async () => {
    const seed = makeSeed('cosmology');
    const out = await generateCosmology(seed, path.join(TMP, 'cosmo.svg'));
    expect(fs.existsSync(out.svgPath)).toBe(true);
    expect(fs.existsSync(out.jsonPath)).toBe(true);

    const svg = fs.readFileSync(out.svgPath, 'utf-8');
    expect(svg).toContain('<svg');
    expect(svg).toContain('bodies');
    expect(svg.length).toBeGreaterThan(2000);
  });

  test('produces N > 0 bodies', async () => {
    const seed = makeSeed('cosmology');
    const out = await generateCosmology(seed, path.join(TMP, 'cosmo-n.svg'));
    expect(out.bodyCount).toBeGreaterThan(0);
    expect(out.timeSteps).toBeGreaterThan(0);
  });

  test('is deterministic', async () => {
    const seed = makeSeed('cosmology', { $hash: 'cosmo-determ-ghi789' });
    const [a, b] = await Promise.all([
      generateCosmology(seed, path.join(TMP, 'cosmo-a.svg')),
      generateCosmology(seed, path.join(TMP, 'cosmo-b.svg')),
    ]);
    const svgA = fs.readFileSync(a.svgPath, 'utf-8');
    const svgB = fs.readFileSync(b.svgPath, 'utf-8');
    expect(svgA).toBe(svgB);
    expect(a.bodyCount).toBe(b.bodyCount);
  });

  test('all scenarios produce valid simulations', async () => {
    const scenarios = ['galaxy', 'solar_system', 'black_hole', 'galaxy_collision'] as const;
    for (const sc of scenarios) {
      const seed = {
        $hash: `cosmo-${sc}-test`,
        $name: `test-${sc}`,
        $domain: 'cosmology',
        genes: { scenario: { type: 'categorical', value: sc } },
      };
      const out = await generateCosmology(seed, path.join(TMP, `cosmo-${sc}.svg`));
      expect(out.bodyCount).toBeGreaterThan(0);
      expect(out.scenario).toBe(sc);
    }
  });
});
