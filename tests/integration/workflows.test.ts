/**
 * Integration Tests — End-to-End Workflows
 * 
 * Tests complete workflows across multiple modules to ensure
 * proper integration and data flow through the entire system.
 * 
 * Phase 17: Test Coverage to 90%+
 * Target: +5% coverage
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import type { Seed } from '../../src/lib/kernel/engines';
import { createFriendSeed } from '../../src/lib/friend/genesis';
// Force-register friend functor bridges (side-effect at module load)
import '../../src/lib/friend/composition';
import { composeSeed } from '../../src/lib/kernel/composition';
import { Xoshiro256StarStar } from '../../src/lib/kernel/rng';

// Test output directory
let testOutputDir: string;

beforeEach(() => {
  testOutputDir = fs.mkdtempSync(path.join(os.tmpdir(), 'paradigm-integration-test-'));
});

afterEach(() => {
  if (fs.existsSync(testOutputDir)) {
    fs.rmSync(testOutputDir, { recursive: true, force: true });
  }
});

describe('Integration Tests — End-to-End Workflows', () => {
  describe('Seed Creation → Composition Workflow', () => {
    it('should create Friend and compose to multiple domains', () => {
      // Step 1: Create Friend seed
      const friend = createFriendSeed('IntegrationFriend');
      expect(friend).toBeDefined();
      expect((friend as any).$name).toBeDefined();

      // Step 2: Compose to Music
      const music = composeSeed(friend, 'music');
      expect(music).toBeDefined();
      expect(music.$domain).toBe('music');
      expect(music.genes).toBeDefined();

      // Step 3: Compose to Visual2D
      const visual = composeSeed(friend, 'visual2d');
      expect(visual).toBeDefined();
      expect(visual.$domain).toBe('visual2d');
      expect(visual.genes).toBeDefined();

      // Step 4: Compose to Narrative
      const narrative = composeSeed(friend, 'narrative');
      expect(narrative).toBeDefined();
      expect(narrative.$domain).toBe('narrative');
      expect(narrative.genes).toBeDefined();

      // Verify all compositions are unique
      expect(music.$hash).not.toBe(visual.$hash);
      expect(music.$hash).not.toBe(narrative.$hash);
      expect(visual.$hash).not.toBe(narrative.$hash);
    });

    it('should maintain determinism across workflow', () => {
      // Create same Friend twice
      const friend1 = createFriendSeed('DeterministicFriend');
      const friend2 = createFriendSeed('DeterministicFriend');

      // Compose both to music
      const music1 = composeSeed(friend1, 'music');
      const music2 = composeSeed(friend2, 'music');

      // Results should be identical
      expect(music1.$domain).toBe(music2.$domain);
      expect(JSON.stringify(music1.genes)).toBe(JSON.stringify(music2.genes));
    });

    it('should handle multi-step composition chain', () => {
      // Friend → Music → Visual2D → Animation
      const friend = createFriendSeed('ChainFriend');
      const music = composeSeed(friend, 'music');
      const visual = composeSeed(music, 'visual2d');
      const animation = composeSeed(visual, 'animation');

      expect((friend as any).$name).toBeDefined();
      expect(music.$domain).toBe('music');
      expect(visual.$domain).toBe('visual2d');
      expect(animation.$domain).toBe('animation');
    });
  });

  describe('RNG → Seed → Composition Workflow', () => {
    it('should use RNG to create deterministic seed', () => {
      const rng = new Xoshiro256StarStar('test-seed-123');
      
      // Generate seed parameters using RNG
      const seed: Seed = {
        $domain: 'character',
        $name: 'RNGCharacter',
        $hash: 'rng-hash-' + rng.nextInt(0, 1000000),
        genes: {
          size: { type: 'float', value: rng.nextF64() },
          strength: { type: 'float', value: rng.nextF64() },
          agility: { type: 'float', value: rng.nextF64() }
        }
      };

      expect(seed).toBeDefined();
      expect(seed.genes?.size?.value).toBeGreaterThanOrEqual(0);
      expect(seed.genes?.size?.value).toBeLessThan(1);

      // Compose to music
      const music = composeSeed(seed, 'music');
      expect(music).toBeDefined();
      expect(music.$domain).toBe('music');
    });

    it('should produce consistent results with same RNG seed', () => {
      const rng1 = new Xoshiro256StarStar('consistent-seed');
      const rng2 = new Xoshiro256StarStar('consistent-seed');

      const val1 = rng1.nextF64();
      const val2 = rng2.nextF64();

      expect(val1).toBe(val2);
    });

    it('should handle RNG-driven batch seed creation', () => {
      const rng = new Xoshiro256StarStar('batch-seed');
      const seeds: Seed[] = [];

      for (let i = 0; i < 10; i++) {
        seeds.push({
          $domain: 'character',
          $name: `BatchChar${i}`,
          $hash: `batch-hash-${i}`,
          genes: {
            size: { type: 'float', value: rng.nextF64() }
          }
        });
      }

      expect(seeds).toHaveLength(10);
      expect(seeds.every(s => s.genes?.size?.value !== undefined && s.genes.size.value >= 0 && s.genes.size.value < 1)).toBe(true);

      // Compose all to music
      const musicSeeds = seeds.map(s => composeSeed(s, 'music'));
      expect(musicSeeds).toHaveLength(10);
      expect(musicSeeds.every(m => m.$domain === 'music')).toBe(true);
    });
  });

  describe('Friend → World → Quest Workflow', () => {
    it('should create Friend and compose to World', () => {
      const friend = createFriendSeed('QuestFriend');
      const world = composeSeed(friend, 'world');

      expect(friend).toBeDefined();
      expect(world).toBeDefined();
      expect(world.$domain).toBe('world');
    });

    it('should handle Friend × World composition', () => {
      const friend = createFriendSeed('AdventureFriend');
      const worldSeed: Seed = {
        $domain: 'world',
        $name: 'AdventureWorld',
        $hash: 'adventure-world-hash',
        genes: {
          worldType: { type: 'enum', value: 'fantasy' },
          size: { type: 'float', value: 0.8 }
        }
      };

      // Compose Friend to World
      const friendWorld = composeSeed(friend, 'world');
      expect(friendWorld).toBeDefined();
      expect(friendWorld.$domain).toBe('world');

      // Compose World to Game
      const game = composeSeed(worldSeed, 'game');
      expect(game).toBeDefined();
      expect(game.$domain).toBe('game');
    });
  });

  describe('Cross-Module Data Flow', () => {
    it('should preserve data through composition pipeline', () => {
      const friend = createFriendSeed('DataFlowFriend');
      
      // Track data through pipeline
      const music = composeSeed(friend, 'music');
      const visual = composeSeed(music, 'visual2d');
      const narrative = composeSeed(visual, 'narrative');

      // Each step should have valid data
      expect(music.genes).toBeDefined();
      expect(visual.genes).toBeDefined();
      expect(narrative.genes).toBeDefined();

      // Domains should be correct
      expect(music.$domain).toBe('music');
      expect(visual.$domain).toBe('visual2d');
      expect(narrative.$domain).toBe('narrative');
    });

    it('should handle parallel composition branches', () => {
      const friend = createFriendSeed('ParallelFriend');

      // Create multiple parallel branches
      const music = composeSeed(friend, 'music');
      const visual = composeSeed(friend, 'visual2d');
      const narrative = composeSeed(friend, 'narrative');
      const audio = composeSeed(friend, 'audio');
      const character = composeSeed(friend, 'character');

      // All branches should be valid
      expect(music.$domain).toBe('music');
      expect(visual.$domain).toBe('visual2d');
      expect(narrative.$domain).toBe('narrative');
      expect(audio.$domain).toBe('audio');
      expect(character.$domain).toBe('character');

      // All should have unique hashes
      const hashes = [music.$hash, visual.$hash, narrative.$hash, audio.$hash, character.$hash];
      const uniqueHashes = new Set(hashes);
      expect(uniqueHashes.size).toBe(5);
    });

    it('should handle convergent composition', () => {
      const friend1 = createFriendSeed('Friend1');
      const friend2 = createFriendSeed('Friend2');

      // Both compose to same domain
      const music1 = composeSeed(friend1, 'music');
      const music2 = composeSeed(friend2, 'music');

      // Should produce different results
      expect(music1.$domain).toBe('music');
      expect(music2.$domain).toBe('music');
      expect(music1.$hash).not.toBe(music2.$hash);
    });
  });

  describe('Error Recovery Workflow', () => {
    it('should recover from composition errors', () => {
      const friend = createFriendSeed('ErrorRecoveryFriend');

      // Try invalid composition
      try {
        composeSeed(friend, 'invalid-domain');
      } catch (error) {
        // Error should not break subsequent operations
      }

      // Should still work
      const music = composeSeed(friend, 'music');
      expect(music).toBeDefined();
      expect(music.$domain).toBe('music');
    });

    it('should handle partial workflow failures', () => {
      const friend = createFriendSeed('PartialFailureFriend');

      // First composition succeeds
      const music = composeSeed(friend, 'music');
      expect(music).toBeDefined();

      // Second composition may fail
      try {
        composeSeed(music, 'invalid-domain');
      } catch (error) {
        // Ignore
      }

      // Third composition should still work
      const visual = composeSeed(friend, 'visual2d');
      expect(visual).toBeDefined();
      expect(visual.$domain).toBe('visual2d');
    });

    it('should maintain state after errors', () => {
      const rng = new Xoshiro256StarStar('error-state-seed');

      // Generate some values
      const val1 = rng.nextF64();
      expect(val1).toBeGreaterThanOrEqual(0);

      // Try to cause error (won't actually error, but simulates recovery)
      try {
        const seed: Seed = {
          $domain: 'character',
          $name: 'ErrorChar',
          $hash: 'error-hash',
          genes: {}
        };
        composeSeed(seed, 'music');
      } catch (error) {
        // Ignore
      }

      // RNG should still work
      const val2 = rng.nextF64();
      expect(val2).toBeGreaterThanOrEqual(0);
      expect(val2).not.toBe(val1);
    });
  });

  describe('Performance Integration', () => {
    it('should handle large-scale workflow efficiently', () => {
      const start = Date.now();

      // Create 50 Friends and compose each to 3 domains
      for (let i = 0; i < 50; i++) {
        const friend = createFriendSeed(`ScaleFriend${i}`);
        composeSeed(friend, 'music');
        composeSeed(friend, 'visual2d');
        composeSeed(friend, 'narrative');
      }

      const duration = Date.now() - start;
      expect(duration).toBeLessThan(10000); // Should complete in < 10 seconds
    });

    it('should handle deep composition chains efficiently', () => {
      const start = Date.now();

      let seed: any = createFriendSeed('DeepChainFriend');
      const domains = ['music', 'visual2d', 'narrative', 'audio', 'character', 'game', 'animation', 'ui', 'physics', 'shader'];

      for (const domain of domains) {
        seed = composeSeed(seed, domain);
      }

      const duration = Date.now() - start;
      expect(duration).toBeLessThan(1000); // Should complete in < 1 second
      expect(seed).toBeDefined();
    });

    it('should handle concurrent workflows', async () => {
      const workflows = Array.from({ length: 20 }, (_, i) => async () => {
        const friend = createFriendSeed(`ConcurrentFriend${i}`);
        const music = composeSeed(friend, 'music');
        const visual = composeSeed(friend, 'visual2d');
        return { music, visual };
      });

      const start = Date.now();
      const results = await Promise.all(workflows.map(w => w()));
      const duration = Date.now() - start;

      expect(results).toHaveLength(20);
      expect(results.every(r => r.music && r.visual)).toBe(true);
      expect(duration).toBeLessThan(5000); // Should complete in < 5 seconds
    });
  });

  describe('Data Consistency Workflow', () => {
    it('should maintain consistency across multiple operations', () => {
      const friend = createFriendSeed('ConsistencyFriend');

      // Perform same composition multiple times
      const results = Array.from({ length: 10 }, () => composeSeed(friend, 'music'));

      // All results should be identical
      const firstHash = results[0].$hash;
      expect(results.every(r => r.$hash === firstHash)).toBe(true);

      const firstGenes = JSON.stringify(results[0].genes);
      expect(results.every(r => JSON.stringify(r.genes) === firstGenes)).toBe(true);
    });

    it('should handle state isolation between workflows', () => {
      const friend1 = createFriendSeed('IsolatedFriend1');
      const friend2 = createFriendSeed('IsolatedFriend2');

      // Interleave operations
      const music1a = composeSeed(friend1, 'music');
      const music2a = composeSeed(friend2, 'music');
      const music1b = composeSeed(friend1, 'music');
      const music2b = composeSeed(friend2, 'music');

      // Same friend should produce same results
      expect(music1a.$hash).toBe(music1b.$hash);
      expect(music2a.$hash).toBe(music2b.$hash);

      // Different friends should produce different results
      expect(music1a.$hash).not.toBe(music2a.$hash);
    });

    it('should validate data integrity through pipeline', () => {
      const friend = createFriendSeed('IntegrityFriend');

      // Create composition chain
      const music = composeSeed(friend, 'music');
      const visual = composeSeed(music, 'visual2d');
      const narrative = composeSeed(visual, 'narrative');

      // Verify each step has valid structure
      expect(music.$domain).toBe('music');
      expect(music.$name).toBeDefined();
      expect(music.$hash).toBeDefined();
      expect(music.genes).toBeDefined();

      expect(visual.$domain).toBe('visual2d');
      expect(visual.$name).toBeDefined();
      expect(visual.$hash).toBeDefined();
      expect(visual.genes).toBeDefined();

      expect(narrative.$domain).toBe('narrative');
      expect(narrative.$name).toBeDefined();
      expect(narrative.$hash).toBeDefined();
      expect(narrative.genes).toBeDefined();
    });
  });

  describe('Complete End-to-End Scenarios', () => {
    it('should execute complete creative workflow', () => {
      // Scenario: Create a Friend, generate their theme music, portrait, and story

      // Step 1: Create Friend
      const friend = createFriendSeed('CreativeFriend');
      expect(friend).toBeDefined();

      // Step 2: Generate theme music
      const themeMusic = composeSeed(friend, 'music');
      expect(themeMusic.$domain).toBe('music');

      // Step 3: Generate portrait
      const portrait = composeSeed(friend, 'visual2d');
      expect(portrait.$domain).toBe('visual2d');

      // Step 4: Generate backstory
      const backstory = composeSeed(friend, 'narrative');
      expect(backstory.$domain).toBe('narrative');

      // Step 5: Generate 3D avatar
      const avatar = composeSeed(friend, 'character');
      expect(avatar.$domain).toBe('character');

      // All artifacts should be unique but related
      const hashes = [themeMusic.$hash, portrait.$hash, backstory.$hash, avatar.$hash];
      const uniqueHashes = new Set(hashes);
      expect(uniqueHashes.size).toBe(4);
    });

    it('should execute complete game development workflow', () => {
      // Scenario: Create a game with world, characters, and music

      // Step 1: Create world
      const worldSeed: Seed = {
        $domain: 'world',
        $name: 'GameWorld',
        $hash: 'game-world-hash',
        genes: {
          worldType: { type: 'enum', value: 'fantasy' }
        }
      };

      // Step 2: Create main character
      const hero = createFriendSeed('GameHero');

      // Step 3: Compose world to game
      const game = composeSeed(worldSeed, 'game');
      expect(game.$domain).toBe('game');

      // Step 4: Create character avatar
      const heroAvatar = composeSeed(hero, 'character');
      expect(heroAvatar.$domain).toBe('character');

      // Step 5: Create game music
      const gameMusic = composeSeed(worldSeed, 'music');
      expect(gameMusic.$domain).toBe('music');

      // All components should be valid
      expect(game.genes).toBeDefined();
      expect(heroAvatar.genes).toBeDefined();
      expect(gameMusic.genes).toBeDefined();
    });

    it('should execute complete multimedia project workflow', () => {
      // Scenario: Create a multimedia project with visuals, audio, and animation

      const friend = createFriendSeed('MultimediaFriend');

      // Generate all media types
      const visual = composeSeed(friend, 'visual2d');
      const audio = composeSeed(friend, 'audio');
      const animation = composeSeed(friend, 'animation');
      const music = composeSeed(friend, 'music');
      const narrative = composeSeed(friend, 'narrative');

      // Verify all media types generated
      expect(visual.$domain).toBe('visual2d');
      expect(audio.$domain).toBe('audio');
      expect(animation.$domain).toBe('animation');
      expect(music.$domain).toBe('music');
      expect(narrative.$domain).toBe('narrative');

      // All should have valid genes
      expect(visual.genes).toBeDefined();
      expect(audio.genes).toBeDefined();
      expect(animation.genes).toBeDefined();
      expect(music.genes).toBeDefined();
      expect(narrative.genes).toBeDefined();
    });
  });
});

// Made with Bob
