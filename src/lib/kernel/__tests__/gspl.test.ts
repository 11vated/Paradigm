/**
 * GSPL INTERPRETER TESTS
 *
 * Unit tests for GSPL (Generative Seed Programming Language)
 */
/* eslint-disable @typescript-eslint/no-require-imports -- Test fixtures use dynamic require() to load kernel modules lazily across describe blocks. */
import { describe, it, expect, beforeEach } from 'vitest';
import { Xoshiro256StarStar, rngFromHash } from '../../src/lib/kernel/rng';

describe('GSPL Interpreter', () => {
  let rng: Xoshiro256StarStar;

  beforeEach(() => {
    rng = rngFromHash('gspl-test-seed');
  });

  describe('Lexer', () => {
    it('should tokenize basic keywords', () => {
      const { tokenize } = require('../../src/lib/kernel/gspl-lexer');
      const tokens = tokenize('mutate breed evolve');
      
      expect(tokens.length).toBe(3);
      expect(tokens[0].type).toBe('keyword');
      expect(tokens[0].value).toBe('mutate');
    });

    it('should tokenize numbers', () => {
      const { tokenize } = require('../../src/lib/kernel/gspl-lexer');
      const tokens = tokenize('0.5 1.0 100');
      
      expect(tokens.length).toBe(3);
      expect(tokens[0].type).toBe('number');
      expect(tokens[0].value).toBe('0.5');
    });

    it('should tokenize identifiers', () => {
      const { tokenize } = require('../../src/lib/kernel/gspl-lexer');
      const tokens = tokenize('mySeed character_1');
      
      expect(tokens.length).toBe(2);
      expect(tokens[0].type).toBe('identifier');
    });

    it('should handle operators', () => {
      const { tokenize } = require('../../src/lib/kernel/gspl-lexer');
      const tokens = tokenize('+ - * / =');
      
      expect(tokens.length).toBe(5);
      expect(tokens[0].type).toBe('operator');
    });
  });

  describe('Parser', () => {
    it('should parse mutate expression', () => {
      const { parse } = require('../../src/lib/kernel/gspl-parser');
      const ast = parse('mutate(seed, 0.1)');
      
      expect(ast.type).toBe('call');
      expect(ast.name).toBe('mutate');
      expect(ast.args.length).toBe(2);
    });

    it('should parse breed expression', () => {
      const { parse } = require('../../src/lib/kernel/gspl-parser');
      const ast = parse('breed(parent1, parent2, 0.5)');
      
      expect(ast.type).toBe('call');
      expect(ast.name).toBe('breed');
      expect(ast.args.length).toBe(3);
    });

    it('should parse nested expressions', () => {
      const { parse } = require('../../src/lib/kernel/gspl-parser');
      const ast = parse('mutate(breed(a, b), 0.2)');
      
      expect(ast.type).toBe('call');
      expect(ast.args[0].type).toBe('call');
      expect(ast.args[0].name).toBe('breed');
    });

    it('should throw on malformed syntax', () => {
      const { parse } = require('../../src/lib/kernel/gspl-parser');
      expect(() => parse('mutate(seed')).toThrow();
    });
  });

  describe('Interpreter', () => {
    it('should execute mutate builtin', async () => {
      const { executeGSPL } = require('../../src/lib/kernel/gspl-interpreter');
      const seed = { $domain: 'character', $name: 'Test' };
      const result = await executeGSPL('mutate(seed, 0.1)', { seed, rng });
      
      expect(result).toBeDefined();
      expect(result.id).not.toBe(seed.id);
    });

    it('should execute breed builtin', async () => {
      const { executeGSPL } = require('../../src/lib/kernel/gspl-interpreter');
      const seed1 = { $domain: 'character', $name: 'Test1' };
      const seed2 = { $domain: 'character', $name: 'Test2' };
      const result = await executeGSPL('breed(seed1, seed2, 0.5)', { seed1, seed2, rng });
      
      expect(result).toBeDefined();
    });

    it('should execute evolve builtin', async () => {
      const { executeGSPL } = require('../../src/lib/kernel/gspl-interpreter');
      const seed = { $domain: 'character', $name: 'Test' };
      const result = await executeGSPL('evolve(seed, fitnessFn)', { seed, rng });
      
      expect(result).toBeDefined();
    });

    it('should execute crossover builtin', async () => {
      const { executeGSPL } = require('../../src/lib/kernel/gspl-interpreter');
      const seed1 = { $domain: 'character', $name: 'Test1' };
      const seed2 = { $domain: 'character', $name: 'Test2' };
      const result = await executeGSPL('crossover(seed1, seed2)', { seed1, seed2, rng });
      
      expect(result).toBeDefined();
    });
  });

  describe('Determinism', () => {
    it('should produce same output with same seed and RNG', async () => {
      const { executeGSPL } = require('../../src/lib/kernel/gspl-interpreter');
      
      const seed = { $domain: 'character', $name: 'DeterminismTest' };
      const rng1 = rngFromHash('same-seed-123');
      const rng2 = rngFromHash('same-seed-123');
      
      const result1 = await executeGSPL('mutate(seed, 0.1)', { seed, rng: rng1 });
      const result2 = await executeGSPL('mutate(seed, 0.1)', { seed, rng: rng2 });
      
      expect(result1.id).toBe(result2.id);
    });

    it('should produce different output with different RNG seeds', async () => {
      const { executeGSPL } = require('../../src/lib/kernel/gspl-interpreter');
      
      const seed = { $domain: 'character', $name: 'Test' };
      const rng1 = rngFromHash('seed-aaa');
      const rng2 = rngFromHash('seed-bbb');
      
      const result1 = await executeGSPL('mutate(seed, 0.3)', { seed, rng: rng1 });
      const result2 = await executeGSPL('mutate(seed, 0.3)', { seed, rng: rng2 });
      
      expect(result1.id).not.toBe(result2.id);
    });
  });

  describe('Error Handling', () => {
    it('should throw on unknown builtin', async () => {
      const { executeGSPL } = require('../../src/lib/kernel/gspl-interpreter');
      const seed = { $domain: 'character' };
      
      await expect(
        executeGSPL('unknownFunction(seed)', { seed, rng })
      ).rejects.toThrow();
    });

    it('should throw on invalid arguments', async () => {
      const { executeGSPL } = require('../../src/lib/kernel/gspl-interpreter');
      const seed = { $domain: 'character' };
      
      await expect(
        executeGSPL('mutate(seed, "invalid")', { seed, rng })
      ).rejects.toThrow();
    });
  });
});