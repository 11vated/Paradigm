import { describe, it, expect } from 'vitest';
import { executeGSPL } from '../../src/lib/gspl/interpreter.js';

describe('GSPL Interpreter', () => {
  describe('seed creation', () => {
    it('creates a seed from declaration', async () => {
      const result = await executeGSPL('seed "Warrior" in character { strength: 0.9, agility: 0.7 }');
      expect(result.errors).toHaveLength(0);
      expect(result.seeds).toHaveLength(1);
      expect(result.seeds[0].$domain).toBe('character');
      expect(result.seeds[0].$name).toBe('Warrior');
      expect(result.seeds[0].genes.strength).toMatchObject({ type: 'scalar', value: 0.9 });
      expect(result.seeds[0].genes.agility).toMatchObject({ type: 'scalar', value: 0.7 });
    });

    it('creates a seed with array genes', async () => {
      const result = await executeGSPL('seed "ColorSeed" in sprite { palette: [0.8, 0.2, 0.1] }');
      expect(result.seeds).toHaveLength(1);
      expect(result.seeds[0].genes.palette.type).toBe('vector');
      expect(result.seeds[0].genes.palette.value).toEqual([0.8, 0.2, 0.1]);
    });

    it('creates a seed with categorical genes', async () => {
      const result = await executeGSPL('seed "Bard" in character { archetype: "bard" }');
      expect(result.seeds[0].genes.archetype).toMatchObject({ type: 'categorical', value: 'bard' });
    });

    it('assigns unique IDs to different seeds', async () => {
      const result = await executeGSPL(`
        seed "A" in character { strength: 0.5 }
        seed "B" in character { strength: 0.6 }
      `);
      expect(result.seeds).toHaveLength(2);
      expect(result.seeds[0].$hash).not.toBe(result.seeds[1].$hash);
    });

    it('assigns valid hashes', async () => {
      const result = await executeGSPL('seed "Test" in character { strength: 0.5 }');
      expect(result.seeds[0].$hash).toBeDefined();
      expect(result.seeds[0].$hash.length).toBeGreaterThan(10);
    });
  });

  describe('determinism', () => {
    it('produces identical results for identical input', async () => {
      const src = 'seed "Warrior" in character { strength: 0.9 }';
      const r1 = await executeGSPL(src);
      const r2 = await executeGSPL(src);
      expect(r1.seeds[0].$hash).toBe(r2.seeds[0].$hash);
    });
  });

  describe('let bindings', () => {
    it('binds and uses variables', async () => {
      const result = await executeGSPL(`
        let x = 42
        print(x)
      `);
      expect(result.output).toContain('42');
    });

    it('supports arithmetic in bindings', async () => {
      const result = await executeGSPL(`
        let x = 2 + 3 * 4
        print(x)
      `);
      expect(result.output).toContain('14');
    });
  });

  describe('control flow', () => {
    it('executes if-true branch', async () => {
      const result = await executeGSPL(`
        let x = 10
        if x > 5 { print("big") } else { print("small") }
      `);
      expect(result.output).toContain('big');
    });

    it('executes else branch', async () => {
      const result = await executeGSPL(`
        let x = 3
        if x > 5 { print("big") } else { print("small") }
      `);
      expect(result.output).toContain('small');
    });

    it('iterates for loop', async () => {
      const result = await executeGSPL(`
        for i in range(5) { print(i) }
      `);
      expect(result.output).toEqual(['0', '1', '2', '3', '4']);
    });

    it('caps for loop at MAX_ITERATIONS', async () => {
      const result = await executeGSPL(`
        for i in range(9999) { print(i) }
      `);
      expect(result.output.length).toBeLessThanOrEqual(1000);
      expect(result.errors.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('functions', () => {
    it('defines and calls user functions', async () => {
      const result = await executeGSPL(`
        fn double(x) { return x * 2 }
        let r = double(21)
        print(r)
      `);
      expect(result.output).toContain('42');
    });

    it('supports nested function calls', async () => {
      const result = await executeGSPL(`
        fn add(a, b) { return a + b }
        fn mul(a, b) { return a * b }
        print(add(mul(3, 4), 2))
      `);
      expect(result.output).toContain('14');
    });
  });

  describe('kernel operations', () => {
    it('mutate produces a new seed', async () => {
      const result = await executeGSPL(`
        seed "Original" in character { strength: 0.5, agility: 0.5 }
        let m = mutate(Original, 0.3)
        print(m.$name)
      `);
      expect(result.seeds.length).toBeGreaterThanOrEqual(2);
      const mutated = result.seeds.find(s => s.$lineage?.operation === 'gspl_mutate');
      expect(mutated).toBeDefined();
      expect(mutated!.$lineage.parents).toBeDefined();
    });

    it('breed combines two seeds', async () => {
      const result = await executeGSPL(`
        seed "ParentA" in character { strength: 0.9 }
        seed "ParentB" in character { strength: 0.1 }
        let child = breed(ParentA, ParentB)
      `);
      expect(result.seeds.length).toBeGreaterThanOrEqual(3);
      const offspring = result.seeds.find(s => s.$lineage?.operation === 'gspl_breed');
      expect(offspring).toBeDefined();
      expect(offspring!.$lineage.parents).toHaveLength(2);
    });

    it('grow returns an artifact', async () => {
      const result = await executeGSPL(`
        seed "Hero" in character { strength: 0.8, agility: 0.6 }
        let a = grow(Hero)
        print(a)
      `);
      // grow returns an artifact object — verify it printed something (JSON-stringified)
      expect(result.errors).toHaveLength(0);
      expect(result.output.length).toBeGreaterThan(0);
      expect(result.output[0]).toContain('character');
    });

    it('evolve produces a population', async () => {
      const result = await executeGSPL(`
        seed "Base" in character { strength: 0.5 }
        let pop = evolve(Base, 5)
        print(len(pop))
      `);
      expect(result.output).toContain('5');
    });
  });

  describe('built-in functions', () => {
    it('len works on arrays', async () => {
      const result = await executeGSPL('print(len([1, 2, 3]))');
      console.log('DEBUG len test:', JSON.stringify(result));
      expect(result.output).toContain('3');
    });

    it('domains returns 27 domains', async () => {
      const result = await executeGSPL('print(len(domains()))');
      expect(result.output[0]).toBe('27');
    });

    it('range generates sequences', async () => {
      const result = await executeGSPL('print(len(range(10)))');
      expect(result.output).toContain('10');
    });

    it('math functions work', async () => {
      const result = await executeGSPL('print(abs(-5))');
      expect(result.output).toContain('5');
    });
  });

  describe('evolve statement', () => {
    it('executes evolve statement with default ga method', async () => {
      const result = await executeGSPL(`
        seed "Base" in character { strength: 0.5 }
        evolve Base using "ga" with { count: 5 }
      `);
      if (result.errors.length > 0) console.log('EVOLVE GA errors:', JSON.stringify(result.errors));
      expect(result.errors).toHaveLength(0);
      const stmtSeeds = result.seeds.filter((s: any) => s.$lineage?.operation === 'gspl_evolve_stmt');
      expect(stmtSeeds.length).toBeGreaterThanOrEqual(4);
    });

    it('executes evolve statement with random method', async () => {
      const result = await executeGSPL(`
        seed "Base" in character { strength: 0.5 }
        evolve Base using "random" with { count: 3 }
      `);
      expect(result.errors).toHaveLength(0);
      const stmtSeeds = result.seeds.filter((s: any) => s.$lineage?.operation === 'gspl_evolve_stmt_random');
      expect(stmtSeeds.length).toBe(3);
    });
  });

  describe('missing builtins', () => {
    it('diff compares two records', async () => {
      const result = await executeGSPL(`
        let a = { name: "alpha", value: 1 }
        let b = { name: "beta", value: 2 }
        let d = diff(a, b)
        print(d.name)
      `);
      expect(result.errors).toHaveLength(0);
      expect(result.output.length).toBeGreaterThan(0);
    });

    it('interpolate blends values at t=0.5', async () => {
      const result = await executeGSPL(`
        let a = { value: 0 }
        let b = { value: 100 }
        let m = interpolate(a, b, 0.5)
        print(m.value)
      `);
      expect(result.errors).toHaveLength(0);
      expect(result.output[0]).toBe('50');
    });

    it('rate returns a score between 0 and 1', async () => {
      const result = await executeGSPL(`
        seed "Rater" in character { strength: 0.5 }
        let s = rate(Rater)
        print(s)
      `);
      expect(result.errors).toHaveLength(0);
      const score = parseFloat(result.output[0]);
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(1);
    });

    it('sign adds a signature to a seed', async () => {
      const result = await executeGSPL(`
        seed "Signable" in character { strength: 0.7 }
        let s = sign(Signable)
        print(s.signature)
      `);
      expect(result.errors).toHaveLength(0);
      expect(result.output[0]).toBeDefined();
      expect(result.output[0].length).toBeGreaterThan(0);
    });

    it('anchor adds an anchor hash to a seed', async () => {
      const result = await executeGSPL(`
        seed "Anchorable" in character { strength: 0.7 }
        let a = anchor(Anchorable)
        print(a.$anchor)
      `);
      expect(result.errors).toHaveLength(0);
      expect(result.output[0]).toBeDefined();
      expect(result.output[0].length).toBeGreaterThan(0);
    });
  });

  describe('error handling', () => {
    it('reports unknown function error', async () => {
      const result = await executeGSPL('nonexistent()');
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('does not crash on empty input', async () => {
      const result = await executeGSPL('');
      expect(result.errors).toHaveLength(0);
      expect(result.seeds).toHaveLength(0);
    });
  });
});
