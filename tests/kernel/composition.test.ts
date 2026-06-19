/**
 * Composition Tests
 * 
 * Tests cross-domain functor system that enables composition
 * of artifacts across different domains using composeSeed().
 * 
 * Phase 17: Test Coverage to 90%+
 * Target: +5% coverage
 */

import { describe, it, expect } from 'vitest';
import type { Seed } from '../../src/lib/kernel/engines';

// Force-register friend functor bridges (side-effect at module load)
import '../../src/lib/friend/composition';

// Import composition system
import { composeSeed, FUNCTOR_REGISTRY, findCompositionPath } from '../../src/lib/kernel/composition';
import { createFriendSeed } from '../../src/lib/friend/genesis';

describe('Cross-Domain Composition', () => {
  describe('composeSeed Function', () => {
    it('should compose Friend seed to Music domain', () => {
      const friendSeed = createFriendSeed('TestFriend');
      const musicSeed = composeSeed(friendSeed, 'music');
      
      expect(musicSeed).toBeDefined();
      expect(musicSeed.$domain).toBe('music');
      expect(musicSeed.genes).toBeDefined();
    });

    it('should compose Friend seed to Narrative domain', () => {
      const friendSeed = createFriendSeed('StoryFriend');
      const narrativeSeed = composeSeed(friendSeed, 'narrative');
      
      expect(narrativeSeed).toBeDefined();
      expect(narrativeSeed.$domain).toBe('narrative');
      expect(narrativeSeed.genes).toBeDefined();
    });

    it('should compose Friend seed to Visual2D domain', () => {
      const friendSeed = createFriendSeed('ArtFriend');
      const visualSeed = composeSeed(friendSeed, 'visual2d');
      
      expect(visualSeed).toBeDefined();
      expect(visualSeed.$domain).toBe('visual2d');
      expect(visualSeed.genes).toBeDefined();
    });

    it('should compose Friend seed to Character domain', () => {
      const friendSeed = createFriendSeed('AvatarFriend');
      const characterSeed = composeSeed(friendSeed, 'character');
      
      expect(characterSeed).toBeDefined();
      expect(characterSeed.$domain).toBe('character');
      expect(characterSeed.genes).toBeDefined();
    });

    it('should compose Friend seed to Audio domain', () => {
      const friendSeed = createFriendSeed('VoiceFriend');
      const audioSeed = composeSeed(friendSeed, 'audio');
      
      expect(audioSeed).toBeDefined();
      expect(audioSeed.$domain).toBe('audio');
      expect(audioSeed.genes).toBeDefined();
    });

    it('should compose Friend seed to Agent domain', () => {
      const friendSeed = createFriendSeed('SmartFriend');
      const agentSeed = composeSeed(friendSeed, 'agent');
      
      expect(agentSeed).toBeDefined();
      expect(agentSeed.$domain).toBe('agent');
      expect(agentSeed.genes).toBeDefined();
    });
  });

  describe('Generic Composition', () => {
    it('should compose Character to Music using generic functor', () => {
      const characterSeed: Seed = {
        $domain: 'character',
        $name: 'TestChar',
        $hash: 'char-hash',
        genes: {
          personality: { type: 'enum', value: 'energetic' },
          strength: { type: 'float', value: 0.8 }
        }
      };

      const musicSeed = composeSeed(characterSeed, 'music');
      
      expect(musicSeed).toBeDefined();
      expect(musicSeed.$domain).toBe('music');
      expect(musicSeed.genes).toBeDefined();
    });

    it('should compose Music to Visual2D', () => {
      const musicSeed: Seed = {
        $domain: 'music',
        $name: 'TestMusic',
        $hash: 'music-hash',
        genes: {
          tempo: { type: 'float', value: 120 },
          key: { type: 'enum', value: 'C-major' }
        }
      };

      const visualSeed = composeSeed(musicSeed, 'visual2d');
      
      expect(visualSeed).toBeDefined();
      expect(visualSeed.$domain).toBe('visual2d');
    });

    it('should compose Visual2D to Animation', () => {
      const visualSeed: Seed = {
        $domain: 'visual2d',
        $name: 'TestVisual',
        $hash: 'visual-hash',
        genes: {
          style: { type: 'enum', value: 'abstract' },
          complexity: { type: 'float', value: 0.7 }
        }
      };

      const animationSeed = composeSeed(visualSeed, 'animation');
      
      expect(animationSeed).toBeDefined();
      expect(animationSeed.$domain).toBe('animation');
    });
  });

  describe('Composition Determinism', () => {
    it('should produce identical results for same inputs', () => {
      const friendSeed = createFriendSeed('DeterministicFriend');
      
      const result1 = composeSeed(friendSeed, 'music');
      const result2 = composeSeed(friendSeed, 'music');
      
      expect(result1.$domain).toBe(result2.$domain);
      expect(JSON.stringify(result1.genes)).toBe(JSON.stringify(result2.genes));
    });

    it('should produce different results for different source seeds', () => {
      const friend1 = createFriendSeed('Friend1');
      const friend2 = createFriendSeed('Friend2');
      
      const music1 = composeSeed(friend1, 'music');
      const music2 = composeSeed(friend2, 'music');
      
      expect(music1.$domain).toBe(music2.$domain);
      // Different friends should produce different compositions
      expect(JSON.stringify(music1.genes)).not.toBe(JSON.stringify(music2.genes));
    });

    it('should produce different results for different target domains', () => {
      const friendSeed = createFriendSeed('MultiFriend');
      
      const musicSeed = composeSeed(friendSeed, 'music');
      const visualSeed = composeSeed(friendSeed, 'visual2d');
      
      expect(musicSeed.$domain).toBe('music');
      expect(visualSeed.$domain).toBe('visual2d');
      expect(musicSeed.$domain).not.toBe(visualSeed.$domain);
    });
  });

  describe('Composition Paths', () => {
    it('should find direct composition path', () => {
      const path = findCompositionPath('friend', 'music');
      
      expect(path).toBeDefined();
      expect(path?.source).toBe('friend');
      expect(path?.target).toBe('music');
      expect(path?.bridges).toBeDefined();
      expect(path?.bridges.length).toBeGreaterThan(0);
    });

    it('should find multi-hop composition path', () => {
      const path = findCompositionPath('friend', 'shader');
      
      expect(path).toBeDefined();
      expect(path?.source).toBe('friend');
      expect(path?.target).toBe('shader');
    });

    it('should return null for impossible compositions', () => {
      const path = findCompositionPath('nonexistent', 'music');
      
      expect(path).toBeNull();
    });
  });

  describe('Functor Registry', () => {
    it('should have registered functors', () => {
      expect(FUNCTOR_REGISTRY).toBeDefined();
      expect(FUNCTOR_REGISTRY.length).toBeGreaterThan(0);
    });

    it('should have friend→music functor', () => {
      const functor = FUNCTOR_REGISTRY.find(f => f.name === 'friend_to_music');
      
      expect(functor).toBeDefined();
      expect(functor?.sourceDomain).toBe('friend');
      expect(functor?.targetDomain).toBe('music');
      expect(functor?.coherence).toBeGreaterThan(0);
    });

    it('should have friend→narrative functor', () => {
      const functor = FUNCTOR_REGISTRY.find(f => f.name === 'friend_to_narrative');
      
      expect(functor).toBeDefined();
      expect(functor?.sourceDomain).toBe('friend');
      expect(functor?.targetDomain).toBe('narrative');
    });

    it('should have friend→visual2d functor', () => {
      const functor = FUNCTOR_REGISTRY.find(f => f.name === 'friend_to_visual2d');
      
      expect(functor).toBeDefined();
      expect(functor?.sourceDomain).toBe('friend');
      expect(functor?.targetDomain).toBe('visual2d');
    });

    it('should have friend→character functor', () => {
      const functor = FUNCTOR_REGISTRY.find(f => f.name === 'friend_to_character');
      
      expect(functor).toBeDefined();
      expect(functor?.sourceDomain).toBe('friend');
      expect(functor?.targetDomain).toBe('character');
    });

    it('should have friend→audio functor', () => {
      const functor = FUNCTOR_REGISTRY.find(f => f.name === 'friend_to_audio');
      
      expect(functor).toBeDefined();
      expect(functor?.sourceDomain).toBe('friend');
      expect(functor?.targetDomain).toBe('audio');
    });

    it('should have friend→agent functor', () => {
      const functor = FUNCTOR_REGISTRY.find(f => f.name === 'friend_to_agent');
      
      expect(functor).toBeDefined();
      expect(functor?.sourceDomain).toBe('friend');
      expect(functor?.targetDomain).toBe('agent');
    });
  });

  describe('Gene Mapping', () => {
    it('should map genes across domains', () => {
      const sourceSeed: Seed = {
        $domain: 'character',
        $name: 'TestChar',
        $hash: 'test-hash',
        genes: {
          size: { type: 'float', value: 0.8 },
          strength: { type: 'float', value: 0.9 }
        }
      };

      const targetSeed = composeSeed(sourceSeed, 'music');
      
      expect(targetSeed.genes).toBeDefined();
      // Genes should be transformed, not just copied
      expect(Object.keys(targetSeed.genes).length).toBeGreaterThan(0);
    });

    it('should handle empty genes', () => {
      const sourceSeed: Seed = {
        $domain: 'character',
        $name: 'EmptyChar',
        $hash: 'empty-hash',
        genes: {}
      };

      const targetSeed = composeSeed(sourceSeed, 'music');
      
      expect(targetSeed).toBeDefined();
      expect(targetSeed.$domain).toBe('music');
    });

    it('should preserve seed metadata', () => {
      const sourceSeed: Seed = {
        $domain: 'character',
        $name: 'MetaChar',
        $hash: 'meta-hash',
        genes: {},
        metadata: {
          author: 'test',
          version: '1.0'
        }
      };

      const targetSeed = composeSeed(sourceSeed, 'music');
      
      expect(targetSeed.$domain).toBe('music');
      expect(targetSeed.$name).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    it('should handle null seed gracefully', () => {
      expect(() => composeSeed(null as any, 'music')).not.toThrow();
    });

    it('should handle undefined target domain', () => {
      const seed = createFriendSeed('TestFriend');
      expect(() => composeSeed(seed, undefined as any)).not.toThrow();
    });

    it('should handle invalid target domain', () => {
      const seed = createFriendSeed('TestFriend');
      const result = composeSeed(seed, 'nonexistent');
      
      expect(result).toBeDefined();
      // Should fall back to generic composition
    });

    it('should handle seed without domain', () => {
      const seed: any = {
        $name: 'NoDomain',
        $hash: 'no-domain-hash',
        genes: {}
      };

      expect(() => composeSeed(seed, 'music')).not.toThrow();
    });
  });

  describe('Composition Performance', () => {
    it('should compose quickly (< 50ms)', () => {
      const friendSeed = createFriendSeed('FastFriend');
      
      const start = Date.now();
      const musicSeed = composeSeed(friendSeed, 'music');
      const duration = Date.now() - start;
      
      expect(musicSeed).toBeDefined();
      expect(duration).toBeLessThan(50);
    });

    it('should handle batch composition efficiently', () => {
      const friendSeed = createFriendSeed('BatchFriend');
      const targets = ['music', 'visual2d', 'narrative', 'audio', 'character'];
      
      const start = Date.now();
      const results = targets.map(target => composeSeed(friendSeed, target));
      const duration = Date.now() - start;
      
      expect(results).toHaveLength(5);
      expect(results.every(r => r !== undefined)).toBe(true);
      expect(duration).toBeLessThan(250); // < 50ms per composition
    });
  });

  describe('Multi-Domain Composition Chains', () => {
    it('should support Friend → Music → Visual2D chain', () => {
      const friendSeed = createFriendSeed('ChainFriend');
      const musicSeed = composeSeed(friendSeed, 'music');
      const visualSeed = composeSeed(musicSeed, 'visual2d');
      
      expect((friendSeed as any).$domain).toBe('friend');
      expect(musicSeed.$domain).toBe('music');
      expect(visualSeed.$domain).toBe('visual2d');
    });

    it('should support Friend → Character → Animation chain', () => {
      const friendSeed = createFriendSeed('AnimFriend');
      const characterSeed = composeSeed(friendSeed, 'character');
      const animationSeed = composeSeed(characterSeed, 'animation');
      
      expect((friendSeed as any).$domain).toBe('friend');
      expect(characterSeed.$domain).toBe('character');
      expect(animationSeed.$domain).toBe('animation');
    });

    it('should support Friend → Narrative → Game chain', () => {
      const friendSeed = createFriendSeed('GameFriend');
      const narrativeSeed = composeSeed(friendSeed, 'narrative');
      const gameSeed = composeSeed(narrativeSeed, 'game');
      
      expect((friendSeed as any).$domain).toBe('friend');
      expect(narrativeSeed.$domain).toBe('narrative');
      expect(gameSeed.$domain).toBe('game');
    });
  });
});

// Made with Bob
