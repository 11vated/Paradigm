import { describe, it, expect } from 'vitest';
import { Xoshiro256StarStar, rngFromHash } from '../../src/lib/kernel/rng';
import { GENE_TYPES, validateGene, mutateGene, crossoverGene, distanceGene } from '../../src/lib/kernel/gene_system';
import { getAllDomains, growSeed } from '../../src/lib/kernel/engines';
import { findCompositionPath, getFunctor, FUNCTOR_REGISTRY } from '../../src/lib/kernel/composition';
import { DOMAINS, resolveDomain } from '../../src/lib/kernel/domain-constants';

describe('Seed Lifecycle E2E', () => {
  // ─── 1. Create: Make a primordial seed via RNG ───────────────────────────
  it('1. Create — builds a valid primordial seed from domain genes', () => {
    const rng = rngFromHash('e2e-test-seed-001');
    const domain = 'character';
    const genes: Record<string, { type: string; value: any }> = {
      archetype: { type: 'categorical', value: 'warrior' },
      strength: { type: 'scalar', value: 0.8 },
      agility: { type: 'scalar', value: 0.5 },
      palette: { type: 'vector', value: [0.2, 0.15, 0.1] },
      size: { type: 'scalar', value: 1.75 },
    };

    expect(domain).toBeTruthy();
    expect(Object.keys(genes).length).toBeGreaterThanOrEqual(3);

    for (const [name, gene] of Object.entries(genes)) {
      if (gene.type && (GENE_TYPES as any)[gene.type]) {
        const valid = validateGene(gene.type, gene.value);
        expect(valid, `Gene "${name}" of type "${gene.type}" should validate`).toBe(true);
      }
    }

    // Verify RNG produces deterministic output
    const a = rng.nextF64();
    const b = rng.nextF64();
    const c = rng.nextF64();
    const rng2 = rngFromHash('e2e-test-seed-001');
    expect(rng2.nextF64()).toBe(a);
    expect(rng2.nextF64()).toBe(b);
    expect(rng2.nextF64()).toBe(c);
  });

  // ─── 2. Grow: Run through a domain engine ────────────────────────────────
  it('2. Grow — runs through domain engine and returns artifact', async () => {
    const seed = {
      id: 'e2e-grow-001', $domain: 'character', $name: 'Test Warrior',
      $hash: 'sha256:e2e-test-hash', $lineage: { generation: 0, operation: 'primordial' as const },
      $fitness: { overall: 0.5 },
      genes: {
        archetype: { type: 'categorical', value: 'warrior' },
        strength: { type: 'scalar', value: 0.8 },
      },
    };
    const artifact = await growSeed(seed);
    expect(artifact).toBeDefined();
    expect(artifact.type).toBe('character');
    expect(artifact.domain).toBe('character');
    expect(artifact.seed_hash).toBeTruthy();
    expect(artifact.render_hints).toBeDefined();
    expect(artifact.generation_quality).toBeDefined();
  });

  // ─── 3. Mutate: Apply gene-level mutation ────────────────────────────────
  it('3. Mutate — applies gene-level mutation deterministically', () => {
    const rng = rngFromHash('e2e-mutate-test');
    const type = 'scalar';
    const original = 0.5;
    const rate = 0.2;

    const mutated = mutateGene(type, original, rate, rng);
    expect(typeof mutated).toBe('number');
    expect(mutated).not.toBeNaN();
    expect(mutated).toBeGreaterThanOrEqual(0);

    // Determinism check
    const rng2 = rngFromHash('e2e-mutate-test');
    expect(mutateGene(type, original, rate, rng2)).toBe(mutated);
  });

  // ─── 4. Breed: Cross two seeds ───────────────────────────────────────────
  it('4. Breed — crosses two seeds via gene-level crossover', () => {
    const rng = rngFromHash('e2e-breed-test');
    const type = 'scalar';

    const parentA = 0.8;
    const parentB = 0.3;

    const child = crossoverGene(type, parentA, parentB, rng);
    expect(typeof child).toBe('number');
    expect(child).not.toBeNaN();

    // Determinism check
    const rng2 = rngFromHash('e2e-breed-test');
    expect(crossoverGene(type, parentA, parentB, rng2)).toBe(child);
  });

  // ─── 5. Evolve: Generate a population and find fittest ───────────────────
  it('5. Evolve — generates diverse population from seed', () => {
    const rng = rngFromHash('e2e-evolve-test');
    const domain = 'character';
    const baseGenes = { strength: { type: 'scalar' as const, value: 0.5 } };
    const popSize = 5;

    const population = Array.from({ length: popSize }, (_, i) => {
      const seedRng = rng.fork(`evolve-${i}`);
      return {
        id: `e2e-pop-${i}`, $domain: domain, $name: `Mutant ${i}`,
        $hash: `hash-pop-${i}`, $lineage: { generation: 1, operation: 'mutate' as const },
        $fitness: { overall: 0.3 + seedRng.nextF64() * 0.5 },
        genes: { strength: { type: 'scalar' as const, value: mutateGene('scalar', 0.5, 0.2, seedRng) } },
      };
    });

    expect(population).toHaveLength(popSize);
    population.sort((a, b) => (b.$fitness?.overall || 0) - (a.$fitness?.overall || 0));
    expect(population[0].$fitness.overall).toBeGreaterThanOrEqual(population[popSize - 1].$fitness.overall);

    // Verify diversity
    const fitnesses = population.map(s => s.$fitness.overall);
    const uniqueFitnesses = new Set(fitnesses);
    expect(uniqueFitnesses.size).toBeGreaterThan(1);
  });

  // ─── 6. Compose: Cross-domain functor pathfinding ───────────────────────
  it('6. Compose — finds cross-domain functor path', () => {
    const path = findCompositionPath('character', 'fullgame');
    expect(path).not.toBeNull();
    expect(path!.bridges.length).toBeGreaterThanOrEqual(1);
    expect(path!.totalCoherence).toBeGreaterThan(0);

    const bridge = getFunctor('character_to_sprite');
    expect(bridge).toBeDefined();
    expect(bridge!.sourceDomain).toBe('character');
    expect(bridge!.targetDomain).toBe('sprite');
    expect(bridge!.coherence).toBeGreaterThan(0);

    // All functors obey invariants
    for (const f of FUNCTOR_REGISTRY) {
      expect(f.name).toBeTruthy();
      expect(f.sourceDomain).toBeTruthy();
      expect(f.targetDomain).toBeTruthy();
      expect(f.coherence).toBeGreaterThan(0);
      expect(f.coherence).toBeLessThanOrEqual(1);
    }
  });

  // ─── 7. Domain coverage: Every domain has an engine ──────────────────────
  it('7. Domains — all domains have registered engines', () => {
    const engines = getAllDomains();
    expect(engines.length).toBeGreaterThanOrEqual(27);
    for (const domain of DOMAINS) {
      expect(engines).toContain(domain);
    }
  });

  // ─── 8. Distance: Genetic distance between seeds ─────────────────────────
  it('8. Distance — computes meaningful genetic distance', () => {
    const type = 'scalar';
    const a = 0.0;
    const b = 1.0;
    const d = distanceGene(type, a, b);
    expect(d).toBeGreaterThan(0);
    expect(distanceGene(type, a, a)).toBe(0);
    expect(distanceGene(type, a, b)).toBe(distanceGene(type, b, a));
  });

  // ─── 9. RNG determinism cross-type ──────────────────────────────────────
  it('9. RNG — all sampling methods are deterministic', () => {
    const seed = 'determinism-test';
    const rng = rngFromHash(seed);

    const floatA = rng.nextF64();
    const intA = rng.nextInt(0, 100);
    const boolA = rng.nextBool();

    const rng2 = rngFromHash(seed);
    expect(rng2.nextF64()).toBe(floatA);
    expect(rng2.nextInt(0, 100)).toBe(intA);
    expect(rng2.nextBool()).toBe(boolA);
  });

  // ─── 10. Domain alias resolution ────────────────────────────────────────
  it('10. Aliases — domain aliases resolve correctly', () => {
    expect(resolveDomain('character')).toBe('character');
    expect(resolveDomain('sound')).toBe('audio');
    expect(resolveDomain('creature')).toBe('character');
    expect(resolveDomain('dance')).toBe('choreography');
    expect(resolveDomain('algorithm')).toBe('procedural');
    expect(resolveDomain('')).toBeNull();
    expect(resolveDomain(null as any)).toBeNull();
  });
});
