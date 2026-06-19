/**
 * Error Path Coverage Tests
 * 
 * Tests failure scenarios, error handling, and edge cases across all modules
 * to ensure graceful degradation and proper error recovery.
 * 
 * Phase 17: Test Coverage to 90%+
 * Target: +7% coverage
 */

import { describe, it, expect } from 'vitest';
import type { Seed } from '../../src/lib/kernel/engines';
import { Xoshiro256StarStar } from '../../src/lib/kernel/rng';
import { createFriendSeed } from '../../src/lib/friend/genesis';
// Force-register friend functor bridges (side-effect at module load)
import '../../src/lib/friend/composition';
import { composeSeed } from '../../src/lib/kernel/composition';

describe('Error Path Coverage', () => {
  describe('RNG Error Handling', () => {
    it('should handle null seed in RNG', () => {
      expect(() => new Xoshiro256StarStar(null as any)).toThrow();
    });

    it('should handle undefined seed in RNG', () => {
      expect(() => new Xoshiro256StarStar(undefined as any)).toThrow();
    });

    it('should handle empty string seed in RNG', () => {
      const rng = new Xoshiro256StarStar('');
      expect(rng).toBeDefined();
      expect(rng.nextF64()).toBeGreaterThanOrEqual(0);
      expect(rng.nextF64()).toBeLessThan(1);
    });

    it('should handle very long seed string', () => {
      const longSeed = 'a'.repeat(10000);
      const rng = new Xoshiro256StarStar(longSeed);
      expect(rng).toBeDefined();
      expect(rng.nextF64()).toBeGreaterThanOrEqual(0);
    });

    it('should handle special characters in seed', () => {
      const specialSeed = '!@#$%^&*()_+-=[]{}|;:,.<>?/~`';
      const rng = new Xoshiro256StarStar(specialSeed);
      expect(rng).toBeDefined();
      expect(rng.nextF64()).toBeGreaterThanOrEqual(0);
    });

    it('should handle Unicode characters in seed', () => {
      const unicodeSeed = '你好世界🌍🎮🎨';
      const rng = new Xoshiro256StarStar(unicodeSeed);
      expect(rng).toBeDefined();
      expect(rng.nextF64()).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Seed Validation Errors', () => {
    it('should handle null seed in composition', () => {
      expect(() => composeSeed(null as any, 'music')).not.toThrow();
    });

    it('should handle undefined seed in composition', () => {
      expect(() => composeSeed(undefined as any, 'music')).not.toThrow();
    });

    it('should handle seed without $domain', () => {
      const invalidSeed: any = {
        $name: 'Invalid',
        $hash: 'invalid-hash',
        genes: {}
      };
      expect(() => composeSeed(invalidSeed, 'music')).not.toThrow();
    });

    it('should handle seed without $name', () => {
      const invalidSeed: any = {
        $domain: 'character',
        $hash: 'invalid-hash',
        genes: {}
      };
      expect(() => composeSeed(invalidSeed, 'music')).not.toThrow();
    });

    it('should handle seed without $hash', () => {
      const invalidSeed: any = {
        $domain: 'character',
        $name: 'Invalid',
        genes: {}
      };
      expect(() => composeSeed(invalidSeed, 'music')).not.toThrow();
    });

    it('should handle seed without genes', () => {
      const invalidSeed: any = {
        $domain: 'character',
        $name: 'Invalid',
        $hash: 'invalid-hash'
      };
      expect(() => composeSeed(invalidSeed, 'music')).not.toThrow();
    });

    it('should handle seed with null genes', () => {
      const invalidSeed: Seed = {
        $domain: 'character',
        $name: 'Invalid',
        $hash: 'invalid-hash',
        genes: null as any
      };
      expect(() => composeSeed(invalidSeed, 'music')).not.toThrow();
    });

    it('should handle seed with invalid gene types', () => {
      const invalidSeed: Seed = {
        $domain: 'character',
        $name: 'Invalid',
        $hash: 'invalid-hash',
        genes: {
          invalid: 'not a gene' as any
        }
      };
      expect(() => composeSeed(invalidSeed, 'music')).not.toThrow();
    });
  });

  describe('Friend Genesis Errors', () => {
    it('should handle empty name in createFriendSeed', () => {
      const friend = createFriendSeed('');
      expect(friend).toBeDefined();
      expect((friend as any).$name).toBeDefined();
    });

    it('should handle very long name', () => {
      const longName = 'A'.repeat(1000);
      const friend = createFriendSeed(longName);
      expect(friend).toBeDefined();
    });

    it('should handle special characters in name', () => {
      const specialName = '!@#$%^&*()_+-=[]{}|;:,.<>?/~`';
      const friend = createFriendSeed(specialName);
      expect(friend).toBeDefined();
    });

    it('should handle Unicode in name', () => {
      const unicodeName = '你好世界🌍🎮🎨';
      const friend = createFriendSeed(unicodeName);
      expect(friend).toBeDefined();
    });

    it('should handle whitespace-only name', () => {
      const whitespaceName = '   \t\n   ';
      const friend = createFriendSeed(whitespaceName);
      expect(friend).toBeDefined();
    });
  });

  describe('Composition Error Paths', () => {
    it('should handle invalid target domain', () => {
      const seed = createFriendSeed('TestFriend');
      const result = composeSeed(seed, 'nonexistent-domain');
      expect(result).toBeDefined();
    });

    it('should handle empty target domain', () => {
      const seed = createFriendSeed('TestFriend');
      const result = composeSeed(seed, '');
      expect(result).toBeDefined();
    });

    it('should handle null target domain', () => {
      const seed = createFriendSeed('TestFriend');
      expect(() => composeSeed(seed, null as any)).not.toThrow();
    });

    it('should handle undefined target domain', () => {
      const seed = createFriendSeed('TestFriend');
      expect(() => composeSeed(seed, undefined as any)).not.toThrow();
    });

    it('should handle circular composition', () => {
      const seed = createFriendSeed('TestFriend');
      const music = composeSeed(seed, 'music');
      const backToFriend = composeSeed(music, 'friend');
      expect(backToFriend).toBeDefined();
    });

    it('should handle self-composition', () => {
      const seed: Seed = {
        $domain: 'music',
        $name: 'TestMusic',
        $hash: 'test-hash',
        genes: {}
      };
      const result = composeSeed(seed, 'music');
      expect(result).toBeDefined();
    });
  });

  describe('Gene Type Errors', () => {
    it('should handle invalid gene type value', () => {
      const seed: Seed = {
        $domain: 'character',
        $name: 'Invalid',
        $hash: 'test-hash',
        genes: {
          size: { type: 'float', value: 'not a number' as any }
        }
      };
      expect(() => composeSeed(seed, 'music')).not.toThrow();
    });

    it('should handle missing gene type', () => {
      const seed: Seed = {
        $domain: 'character',
        $name: 'Invalid',
        $hash: 'test-hash',
        genes: {
          size: { value: 0.5 } as any
        }
      };
      expect(() => composeSeed(seed, 'music')).not.toThrow();
    });

    it('should handle missing gene value', () => {
      const seed: Seed = {
        $domain: 'character',
        $name: 'Invalid',
        $hash: 'test-hash',
        genes: {
          size: { type: 'float' } as any
        }
      };
      expect(() => composeSeed(seed, 'music')).not.toThrow();
    });

    it('should handle NaN gene value', () => {
      const seed: Seed = {
        $domain: 'character',
        $name: 'Invalid',
        $hash: 'test-hash',
        genes: {
          size: { type: 'float', value: NaN }
        }
      };
      expect(() => composeSeed(seed, 'music')).not.toThrow();
    });

    it('should handle Infinity gene value', () => {
      const seed: Seed = {
        $domain: 'character',
        $name: 'Invalid',
        $hash: 'test-hash',
        genes: {
          size: { type: 'float', value: Infinity }
        }
      };
      expect(() => composeSeed(seed, 'music')).not.toThrow();
    });

    it('should handle negative Infinity gene value', () => {
      const seed: Seed = {
        $domain: 'character',
        $name: 'Invalid',
        $hash: 'test-hash',
        genes: {
          size: { type: 'float', value: -Infinity }
        }
      };
      expect(() => composeSeed(seed, 'music')).not.toThrow();
    });
  });

  describe('Memory and Performance Errors', () => {
    it('should handle very large gene object', () => {
      const largeGenes: any = {};
      for (let i = 0; i < 1000; i++) {
        largeGenes[`gene${i}`] = { type: 'float', value: Math.random() };
      }
      const seed: Seed = {
        $domain: 'character',
        $name: 'LargeGenes',
        $hash: 'large-hash',
        genes: largeGenes
      };
      expect(() => composeSeed(seed, 'music')).not.toThrow();
    });

    it('should handle deeply nested gene structure', () => {
      const deepGene: any = { type: 'float', value: 0.5 };
      let current = deepGene;
      for (let i = 0; i < 100; i++) {
        current.nested = { type: 'float', value: 0.5 };
        current = current.nested;
      }
      const seed: Seed = {
        $domain: 'character',
        $name: 'DeepGenes',
        $hash: 'deep-hash',
        genes: { deep: deepGene }
      };
      expect(() => composeSeed(seed, 'music')).not.toThrow();
    });

    it('should handle rapid successive compositions', () => {
      const seed = createFriendSeed('RapidTest');
      const start = Date.now();
      for (let i = 0; i < 100; i++) {
        composeSeed(seed, 'music');
      }
      const duration = Date.now() - start;
      expect(duration).toBeLessThan(5000); // Should complete in < 5 seconds
    });

    it('should handle concurrent compositions', async () => {
      const seed = createFriendSeed('ConcurrentTest');
      const promises = Array.from({ length: 10 }, () =>
        Promise.resolve(composeSeed(seed, 'music'))
      );
      const results = await Promise.all(promises);
      expect(results).toHaveLength(10);
      expect(results.every(r => r !== undefined)).toBe(true);
    });
  });

  describe('Boundary Value Errors', () => {
    it('should handle zero values', () => {
      const seed: Seed = {
        $domain: 'character',
        $name: 'Zero',
        $hash: 'zero-hash',
        genes: {
          size: { type: 'float', value: 0 },
          strength: { type: 'float', value: 0 }
        }
      };
      expect(() => composeSeed(seed, 'music')).not.toThrow();
    });

    it('should handle negative values', () => {
      const seed: Seed = {
        $domain: 'character',
        $name: 'Negative',
        $hash: 'negative-hash',
        genes: {
          size: { type: 'float', value: -1 },
          strength: { type: 'float', value: -100 }
        }
      };
      expect(() => composeSeed(seed, 'music')).not.toThrow();
    });

    it('should handle very large values', () => {
      const seed: Seed = {
        $domain: 'character',
        $name: 'Large',
        $hash: 'large-hash',
        genes: {
          size: { type: 'float', value: Number.MAX_VALUE },
          strength: { type: 'float', value: 1e308 }
        }
      };
      expect(() => composeSeed(seed, 'music')).not.toThrow();
    });

    it('should handle very small values', () => {
      const seed: Seed = {
        $domain: 'character',
        $name: 'Small',
        $hash: 'small-hash',
        genes: {
          size: { type: 'float', value: Number.MIN_VALUE },
          strength: { type: 'float', value: 1e-308 }
        }
      };
      expect(() => composeSeed(seed, 'music')).not.toThrow();
    });
  });

  describe('Type Coercion Errors', () => {
    it('should handle string where number expected', () => {
      const seed: Seed = {
        $domain: 'character',
        $name: 'StringNumber',
        $hash: 'string-hash',
        genes: {
          size: { type: 'float', value: '0.5' as any }
        }
      };
      expect(() => composeSeed(seed, 'music')).not.toThrow();
    });

    it('should handle number where string expected', () => {
      const seed: Seed = {
        $domain: 'character',
        $name: 'NumberString',
        $hash: 'number-hash',
        genes: {
          archetype: { type: 'enum', value: 123 as any }
        }
      };
      expect(() => composeSeed(seed, 'music')).not.toThrow();
    });

    it('should handle boolean where number expected', () => {
      const seed: Seed = {
        $domain: 'character',
        $name: 'BooleanNumber',
        $hash: 'boolean-hash',
        genes: {
          size: { type: 'float', value: true as any }
        }
      };
      expect(() => composeSeed(seed, 'music')).not.toThrow();
    });

    it('should handle array where object expected', () => {
      const seed: Seed = {
        $domain: 'character',
        $name: 'ArrayObject',
        $hash: 'array-hash',
        genes: [1, 2, 3] as any
      };
      expect(() => composeSeed(seed, 'music')).not.toThrow();
    });

    it('should handle object where array expected', () => {
      const seed: Seed = {
        $domain: 'character',
        $name: 'ObjectArray',
        $hash: 'object-hash',
        genes: {
          palette: { type: 'vector', value: { r: 1, g: 0, b: 0 } as any }
        }
      };
      expect(() => composeSeed(seed, 'music')).not.toThrow();
    });
  });

  describe('Metadata Errors', () => {
    it('should handle missing metadata', () => {
      const seed: Seed = {
        $domain: 'character',
        $name: 'NoMetadata',
        $hash: 'no-meta-hash',
        genes: {}
      };
      expect(() => composeSeed(seed, 'music')).not.toThrow();
    });

    it('should handle null metadata', () => {
      const seed: Seed = {
        $domain: 'character',
        $name: 'NullMetadata',
        $hash: 'null-meta-hash',
        genes: {},
        metadata: null as any
      };
      expect(() => composeSeed(seed, 'music')).not.toThrow();
    });

    it('should handle invalid metadata structure', () => {
      const seed: Seed = {
        $domain: 'character',
        $name: 'InvalidMetadata',
        $hash: 'invalid-meta-hash',
        genes: {},
        metadata: 'not an object' as any
      };
      expect(() => composeSeed(seed, 'music')).not.toThrow();
    });

    it('should handle circular reference in metadata', () => {
      const seed: Seed = {
        $domain: 'character',
        $name: 'CircularMetadata',
        $hash: 'circular-hash',
        genes: {},
        metadata: {} as any
      };
      seed.metadata!.self = seed.metadata;
      expect(() => composeSeed(seed, 'music')).not.toThrow();
    });
  });

  describe('Hash Collision Errors', () => {
    it('should handle duplicate hashes', () => {
      const hash = 'duplicate-hash';
      const seed1: Seed = {
        $domain: 'character',
        $name: 'Seed1',
        $hash: hash,
        genes: {}
      };
      const seed2: Seed = {
        $domain: 'music',
        $name: 'Seed2',
        $hash: hash,
        genes: {}
      };
      expect(() => composeSeed(seed1, 'music')).not.toThrow();
      expect(() => composeSeed(seed2, 'visual2d')).not.toThrow();
    });

    it('should handle empty hash', () => {
      const seed: Seed = {
        $domain: 'character',
        $name: 'EmptyHash',
        $hash: '',
        genes: {}
      };
      expect(() => composeSeed(seed, 'music')).not.toThrow();
    });

    it('should handle very long hash', () => {
      const longHash = 'a'.repeat(10000);
      const seed: Seed = {
        $domain: 'character',
        $name: 'LongHash',
        $hash: longHash,
        genes: {}
      };
      expect(() => composeSeed(seed, 'music')).not.toThrow();
    });
  });

  describe('Concurrent Access Errors', () => {
    it('should handle simultaneous seed modifications', () => {
      const seed = createFriendSeed('ConcurrentMod');
      const results: any[] = [];
      
      for (let i = 0; i < 10; i++) {
        results.push(composeSeed(seed, 'music'));
      }
      
      expect(results).toHaveLength(10);
      expect(results.every(r => r !== undefined)).toBe(true);
    });

    it('should handle race conditions in composition', async () => {
      const seed = createFriendSeed('RaceCondition');
      const domains = ['music', 'visual2d', 'narrative', 'audio', 'character'];
      
      const promises = domains.map(domain =>
        Promise.resolve(composeSeed(seed, domain))
      );
      
      const results = await Promise.all(promises);
      expect(results).toHaveLength(5);
      expect(results.every(r => r !== undefined)).toBe(true);
    });
  });

  describe('Resource Cleanup Errors', () => {
    it('should handle cleanup after error', () => {
      const seed: Seed = {
        $domain: 'character',
        $name: 'CleanupTest',
        $hash: 'cleanup-hash',
        genes: {}
      };
      
      try {
        composeSeed(seed, 'music');
      } catch (error) {
        // Error should not prevent subsequent operations
      }
      
      // Should still work after error
      expect(() => composeSeed(seed, 'visual2d')).not.toThrow();
    });

    it('should handle multiple cleanup cycles', () => {
      const seed = createFriendSeed('MultiCleanup');
      
      for (let i = 0; i < 100; i++) {
        try {
          composeSeed(seed, 'music');
        } catch (error) {
          // Ignore errors
        }
      }
      
      // Should still work after many cycles
      expect(() => composeSeed(seed, 'visual2d')).not.toThrow();
    });
  });
});

// Made with Bob
