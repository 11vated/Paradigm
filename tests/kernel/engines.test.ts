/**
 * Unit tests for the 27 domain engines
 * Validates: engine registry, growSeed dispatch, output structure
 * Comprehensive per-domain coverage: type field, render_hints, gene responsiveness,
 * empty-gene resilience, and domain-specific output fields.
 */
import { describe, it, expect } from 'vitest';
import { ENGINES, growSeed, getAllDomains } from '../../src/lib/kernel/engines.js';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeSeed(domain: string, genes: Record<string, any> = {}): any {
  return {
    id: 'test-' + domain,
    $domain: domain,
    $name: 'Test ' + domain,
    $lineage: { generation: 1, operation: 'test' },
    $hash: 'testhash-' + domain,
    $fitness: { overall: 0.5 },
    genes,
  };
}

// ─── Registry ─────────────────────────────────────────────────────────────────

describe('Domain Engines', () => {
  describe('registry', () => {
    it('has exactly 27 engines', () => {
      expect(getAllDomains().length).toBe(27);
    });

    it('getAllDomains returns string array', () => {
      const domains = getAllDomains();
      for (const d of domains) {
        expect(typeof d).toBe('string');
        expect(d.length).toBeGreaterThan(0);
      }
    });

    it('contains critical domains', () => {
      const domains = getAllDomains();
      const critical = ['character', 'sprite', 'music', 'visual2d', 'procedural', 'fullgame', 'physics', 'narrative', 'geometry3d', 'agent'];
      for (const c of critical) {
        expect(domains).toContain(c);
      }
    });
  });

  // ─── Generic growSeed tests ───────────────────────────────────────────────

  describe('growSeed', () => {
    const baseSeed = (domain: string) => ({
      id: 'test-id',
      $domain: domain,
      $name: 'Test Seed',
      $lineage: { generation: 1, operation: 'test' },
      $hash: 'abc123',
      $fitness: { overall: 0.5 },
      genes: {
        core_power: { type: 'scalar', value: 0.7 },
        stability: { type: 'scalar', value: 0.5 },
        complexity: { type: 'scalar', value: 0.4 },
      },
    });

    it('returns an object for every domain', () => {
      for (const domain of getAllDomains()) {
        const seed = baseSeed(domain);
        const result = growSeed(seed);
        expect(result).toBeDefined();
        expect(typeof result).toBe('object');
      }
    });

    it('character engine produces character artifact', () => {
      const seed = {
        ...baseSeed('character'),
        genes: {
          ...baseSeed('character').genes,
          archetype: { type: 'categorical', value: 'warrior' },
          strength: { type: 'scalar', value: 0.8 },
          agility: { type: 'scalar', value: 0.6 },
          intelligence: { type: 'scalar', value: 0.3 },
        },
      };
      const result = growSeed(seed);
      expect(result).toBeDefined();
    });

    it('music engine produces music artifact', () => {
      const seed = {
        ...baseSeed('music'),
        genes: {
          ...baseSeed('music').genes,
          tempo: { type: 'scalar', value: 0.6 },
          key: { type: 'categorical', value: 'C' },
          scale: { type: 'categorical', value: 'major' },
        },
      };
      const result = growSeed(seed);
      expect(result).toBeDefined();
    });

    it('handles seeds with minimal genes', () => {
      const seed = {
        id: 'minimal',
        $domain: 'character',
        $name: 'Minimal',
        $lineage: { generation: 0, operation: 'test' },
        $hash: 'min',
        $fitness: { overall: 0.1 },
        genes: {},
      };
      // Should not throw even with empty genes
      expect(() => growSeed(seed)).not.toThrow();
    });

    it('agent engine produces agent config artifact', () => {
      const seed = {
        ...baseSeed('agent'),
        genes: {
          persona: { type: 'categorical', value: 'architect' },
          temperature: { type: 'scalar', value: 0.7 },
          reasoning_depth: { type: 'scalar', value: 0.8 },
          exploration_rate: { type: 'scalar', value: 0.3 },
          confidence_threshold: { type: 'scalar', value: 0.6 },
          verbosity: { type: 'scalar', value: 0.5 },
          autonomy: { type: 'scalar', value: 0.7 },
          creativity_bias: { type: 'scalar', value: 0.4 },
          max_reasoning_steps: { type: 'scalar', value: 0.5 },
          context_window: { type: 'scalar', value: 0.6 },
          domain_focus: { type: 'vector', value: new Array(27).fill(0).map((_, i) => i === 0 ? 1 : 0) },
          gene_expertise: { type: 'vector', value: new Array(17).fill(0).map((_, i) => i === 0 ? 1 : 0) },
          tool_permissions: { type: 'struct', value: { create: true, mutate: true, breed: true, compose: true, grow: true, evolve: true, compute_distance: true, find_path: true, query_knowledge: true } },
        },
      };
      const result = growSeed(seed);
      expect(result).toBeDefined();
      expect(result.config).toBeDefined();
      expect(result.render_hints?.mode).toBe('chat_interface');
    });

    it('returns different results for different gene values', () => {
      const seedA = {
        ...baseSeed('character'),
        $name: 'WeakOne',
        genes: { core_power: { type: 'scalar', value: 0.1 }, archetype: { type: 'categorical', value: 'rogue' } },
      };
      const seedB = {
        ...baseSeed('character'),
        $name: 'StrongOne',
        genes: { core_power: { type: 'scalar', value: 0.9 }, archetype: { type: 'categorical', value: 'warrior' } },
      };
      const resultA = JSON.stringify(growSeed(seedA));
      const resultB = JSON.stringify(growSeed(seedB));
      expect(resultA).not.toEqual(resultB);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Per-domain comprehensive tests (27 domains x 5 tests each)
  // ═══════════════════════════════════════════════════════════════════════════

  // ─── 1. character ─────────────────────────────────────────────────────────

  describe('character engine', () => {
    it('produces correct type field', () => {
      const result = growSeed(makeSeed('character'));
      expect(result.type).toBe('character');
    });

    it('includes render_hints.mode', () => {
      const result = growSeed(makeSeed('character'));
      expect(typeof result.render_hints?.mode).toBe('string');
      expect(result.render_hints.mode.length).toBeGreaterThan(0);
    });

    it('responds to gene changes', () => {
      const a = growSeed(makeSeed('character', { strength: { type: 'scalar', value: 0.1 }, archetype: { type: 'categorical', value: 'rogue' } }));
      const b = growSeed(makeSeed('character', { strength: { type: 'scalar', value: 0.9 }, archetype: { type: 'categorical', value: 'warrior' } }));
      expect(JSON.stringify(a)).not.toEqual(JSON.stringify(b));
    });

    it('handles empty genes gracefully', () => {
      expect(() => growSeed(makeSeed('character'))).not.toThrow();
      const result = growSeed(makeSeed('character'));
      expect(result).toBeDefined();
      expect(result.type).toBe('character');
    });

    it('produces domain-specific output fields', () => {
      const result = growSeed(makeSeed('character', { strength: { type: 'scalar', value: 0.7 } }));
      expect(result.visual).toBeDefined();
      expect(typeof result.visual.body_width).toBe('number');
      expect(result.stats).toBeDefined();
      expect(typeof result.stats.strength).toBe('number');
      expect(result.archetype).toBeDefined();
    });
  });

  // ─── 2. sprite ────────────────────────────────────────────────────────────

  describe('sprite engine', () => {
    it('produces correct type field', () => {
      const result = growSeed(makeSeed('sprite'));
      expect(result.type).toBe('sprite');
    });

    it('includes render_hints.mode', () => {
      const result = growSeed(makeSeed('sprite'));
      expect(typeof result.render_hints?.mode).toBe('string');
      expect(result.render_hints.mode.length).toBeGreaterThan(0);
    });

    it('responds to gene changes', () => {
      const a = growSeed(makeSeed('sprite', { resolution: { type: 'scalar', value: 0.2 } }));
      const b = growSeed(makeSeed('sprite', { resolution: { type: 'scalar', value: 0.9 } }));
      expect(JSON.stringify(a)).not.toEqual(JSON.stringify(b));
    });

    it('handles empty genes gracefully', () => {
      expect(() => growSeed(makeSeed('sprite'))).not.toThrow();
      const result = growSeed(makeSeed('sprite'));
      expect(result).toBeDefined();
      expect(result.type).toBe('sprite');
    });

    it('produces domain-specific output fields', () => {
      const result = growSeed(makeSeed('sprite'));
      expect(result.visual).toBeDefined();
      expect(typeof result.visual.resolution).toBe('number');
      expect(typeof result.visual.palette_size).toBe('number');
    });
  });

  // ─── 3. music ─────────────────────────────────────────────────────────────

  describe('music engine', () => {
    it('produces correct type field', () => {
      const result = growSeed(makeSeed('music'));
      expect(result.type).toBe('music');
    });

    it('includes render_hints.mode', () => {
      const result = growSeed(makeSeed('music'));
      expect(typeof result.render_hints?.mode).toBe('string');
      expect(result.render_hints.mode.length).toBeGreaterThan(0);
    });

    it('responds to gene changes', () => {
      const a = growSeed(makeSeed('music', { tempo: { type: 'scalar', value: 0.1 }, key: { type: 'categorical', value: 'C' } }));
      const b = growSeed(makeSeed('music', { tempo: { type: 'scalar', value: 0.9 }, key: { type: 'categorical', value: 'G' } }));
      expect(JSON.stringify(a)).not.toEqual(JSON.stringify(b));
    });

    it('handles empty genes gracefully', () => {
      expect(() => growSeed(makeSeed('music'))).not.toThrow();
      const result = growSeed(makeSeed('music'));
      expect(result).toBeDefined();
      expect(result.type).toBe('music');
    });

    it('produces domain-specific output fields', () => {
      const result = growSeed(makeSeed('music'));
      expect(result.musical).toBeDefined();
      expect(typeof result.musical.tempo).toBe('number');
      expect(typeof result.musical.key).toBe('string');
    });
  });

  // ─── 4. visual2d ──────────────────────────────────────────────────────────

  describe('visual2d engine', () => {
    it('produces correct type field', () => {
      const result = growSeed(makeSeed('visual2d'));
      expect(result.type).toBe('visual2d');
    });

    it('includes render_hints.mode', () => {
      const result = growSeed(makeSeed('visual2d'));
      expect(typeof result.render_hints?.mode).toBe('string');
      expect(result.render_hints.mode.length).toBeGreaterThan(0);
    });

    it('responds to gene changes', () => {
      const a = growSeed(makeSeed('visual2d', { style: { type: 'categorical', value: 'abstract' }, complexity: { type: 'scalar', value: 0.1 } }));
      const b = growSeed(makeSeed('visual2d', { style: { type: 'categorical', value: 'realistic' }, complexity: { type: 'scalar', value: 0.9 } }));
      expect(JSON.stringify(a)).not.toEqual(JSON.stringify(b));
    });

    it('handles empty genes gracefully', () => {
      expect(() => growSeed(makeSeed('visual2d'))).not.toThrow();
      const result = growSeed(makeSeed('visual2d'));
      expect(result).toBeDefined();
      expect(result.type).toBe('visual2d');
    });

    it('produces domain-specific output fields', () => {
      const result = growSeed(makeSeed('visual2d'));
      expect(result.visual).toBeDefined();
      expect(result.visual.style).toBeDefined();
      expect(typeof result.visual.layers).toBe('number');
    });
  });

  // ─── 5. procedural ────────────────────────────────────────────────────────

  describe('procedural engine', () => {
    it('produces correct type field', () => {
      const result = growSeed(makeSeed('procedural'));
      expect(result.type).toBe('procedural');
    });

    it('includes render_hints.mode', () => {
      const result = growSeed(makeSeed('procedural'));
      expect(typeof result.render_hints?.mode).toBe('string');
      expect(result.render_hints.mode.length).toBeGreaterThan(0);
    });

    it('responds to gene changes', () => {
      const a = growSeed(makeSeed('procedural', { octaves: { type: 'scalar', value: 0.2 }, biome: { type: 'categorical', value: 'desert' } }));
      const b = growSeed(makeSeed('procedural', { octaves: { type: 'scalar', value: 0.9 }, biome: { type: 'categorical', value: 'tundra' } }));
      expect(JSON.stringify(a)).not.toEqual(JSON.stringify(b));
    });

    it('handles empty genes gracefully', () => {
      expect(() => growSeed(makeSeed('procedural'))).not.toThrow();
      const result = growSeed(makeSeed('procedural'));
      expect(result).toBeDefined();
      expect(result.type).toBe('procedural');
    });

    it('produces domain-specific output fields', () => {
      const result = growSeed(makeSeed('procedural'));
      expect(result.terrain).toBeDefined();
      expect(typeof result.terrain.octaves).toBe('number');
      expect(result.terrain.biome).toBeDefined();
    });
  });

  // ─── 6. fullgame ──────────────────────────────────────────────────────────

  describe('fullgame engine', () => {
    it('produces correct type field', () => {
      const result = growSeed(makeSeed('fullgame'));
      expect(result.type).toBe('fullgame');
    });

    it('includes render_hints.mode', () => {
      const result = growSeed(makeSeed('fullgame'));
      expect(typeof result.render_hints?.mode).toBe('string');
      expect(result.render_hints.mode.length).toBeGreaterThan(0);
    });

    it('responds to gene changes', () => {
      const a = growSeed(makeSeed('fullgame', { genre: { type: 'categorical', value: 'action' }, difficulty: { type: 'scalar', value: 0.1 } }));
      const b = growSeed(makeSeed('fullgame', { genre: { type: 'categorical', value: 'rpg' }, difficulty: { type: 'scalar', value: 0.9 } }));
      expect(JSON.stringify(a)).not.toEqual(JSON.stringify(b));
    });

    it('handles empty genes gracefully', () => {
      expect(() => growSeed(makeSeed('fullgame'))).not.toThrow();
      const result = growSeed(makeSeed('fullgame'));
      expect(result).toBeDefined();
      expect(result.type).toBe('fullgame');
    });

    it('produces domain-specific output fields', () => {
      const result = growSeed(makeSeed('fullgame'));
      expect(result.game).toBeDefined();
      expect(result.game.genre).toBeDefined();
      expect(typeof result.game.levels).toBe('number');
      expect(result.progression).toBeDefined();
    });
  });

  // ─── 7. animation ─────────────────────────────────────────────────────────

  describe('animation engine', () => {
    it('produces correct type field', () => {
      const result = growSeed(makeSeed('animation'));
      expect(result.type).toBe('animation');
    });

    it('includes render_hints.mode', () => {
      const result = growSeed(makeSeed('animation'));
      expect(typeof result.render_hints?.mode).toBe('string');
      expect(result.render_hints.mode.length).toBeGreaterThan(0);
    });

    it('responds to gene changes', () => {
      const a = growSeed(makeSeed('animation', { frameCount: { type: 'scalar', value: 0.2 }, fps: { type: 'scalar', value: 0.3 } }));
      const b = growSeed(makeSeed('animation', { frameCount: { type: 'scalar', value: 0.9 }, fps: { type: 'scalar', value: 0.8 } }));
      expect(JSON.stringify(a)).not.toEqual(JSON.stringify(b));
    });

    it('handles empty genes gracefully', () => {
      expect(() => growSeed(makeSeed('animation'))).not.toThrow();
      const result = growSeed(makeSeed('animation'));
      expect(result).toBeDefined();
      expect(result.type).toBe('animation');
    });

    it('produces domain-specific output fields', () => {
      const result = growSeed(makeSeed('animation'));
      expect(result.animation).toBeDefined();
      expect(typeof result.animation.frame_count).toBe('number');
      expect(typeof result.animation.fps).toBe('number');
      expect(result.keyframes).toBeDefined();
      expect(Array.isArray(result.keyframes)).toBe(true);
    });
  });

  // ─── 8. geometry3d ────────────────────────────────────────────────────────

  describe('geometry3d engine', () => {
    it('produces correct type field', () => {
      const result = growSeed(makeSeed('geometry3d'));
      expect(result.type).toBe('geometry3d');
    });

    it('includes render_hints.mode', () => {
      const result = growSeed(makeSeed('geometry3d'));
      expect(typeof result.render_hints?.mode).toBe('string');
      expect(result.render_hints.mode.length).toBeGreaterThan(0);
    });

    it('responds to gene changes', () => {
      const a = growSeed(makeSeed('geometry3d', { primitive: { type: 'categorical', value: 'cube' }, detail: { type: 'scalar', value: 0.2 } }));
      const b = growSeed(makeSeed('geometry3d', { primitive: { type: 'categorical', value: 'sphere' }, detail: { type: 'scalar', value: 0.9 } }));
      expect(JSON.stringify(a)).not.toEqual(JSON.stringify(b));
    });

    it('handles empty genes gracefully', () => {
      expect(() => growSeed(makeSeed('geometry3d'))).not.toThrow();
      const result = growSeed(makeSeed('geometry3d'));
      expect(result).toBeDefined();
      expect(result.type).toBe('geometry3d');
    });

    it('produces domain-specific output fields', () => {
      const result = growSeed(makeSeed('geometry3d'));
      expect(result.mesh).toBeDefined();
      expect(result.mesh.primitive).toBeDefined();
      expect(typeof result.mesh.subdivisions).toBe('number');
      expect(result.material).toBeDefined();
    });
  });

  // ─── 9. narrative ─────────────────────────────────────────────────────────

  describe('narrative engine', () => {
    it('produces correct type field', () => {
      const result = growSeed(makeSeed('narrative'));
      expect(result.type).toBe('narrative');
    });

    it('includes render_hints.mode', () => {
      const result = growSeed(makeSeed('narrative'));
      expect(typeof result.render_hints?.mode).toBe('string');
      expect(result.render_hints.mode.length).toBeGreaterThan(0);
    });

    it('responds to gene changes', () => {
      const a = growSeed(makeSeed('narrative', { structure: { type: 'categorical', value: 'heros_journey' }, tone: { type: 'categorical', value: 'epic' } }));
      const b = growSeed(makeSeed('narrative', { structure: { type: 'categorical', value: 'nonlinear' }, tone: { type: 'categorical', value: 'dark' } }));
      expect(JSON.stringify(a)).not.toEqual(JSON.stringify(b));
    });

    it('handles empty genes gracefully', () => {
      expect(() => growSeed(makeSeed('narrative'))).not.toThrow();
      const result = growSeed(makeSeed('narrative'));
      expect(result).toBeDefined();
      expect(result.type).toBe('narrative');
    });

    it('produces domain-specific output fields', () => {
      const result = growSeed(makeSeed('narrative'));
      expect(result.story).toBeDefined();
      expect(result.story.structure).toBeDefined();
      expect(typeof result.story.acts).toBe('number');
      expect(result.narrative).toBeDefined();
    });
  });

  // ─── 10. ui ───────────────────────────────────────────────────────────────

  describe('ui engine', () => {
    it('produces correct type field', () => {
      const result = growSeed(makeSeed('ui'));
      expect(result.type).toBe('ui');
    });

    it('includes render_hints.mode', () => {
      const result = growSeed(makeSeed('ui'));
      expect(typeof result.render_hints?.mode).toBe('string');
      expect(result.render_hints.mode.length).toBeGreaterThan(0);
    });

    it('responds to gene changes', () => {
      const a = growSeed(makeSeed('ui', { layout: { type: 'categorical', value: 'dashboard' }, density: { type: 'scalar', value: 0.1 } }));
      const b = growSeed(makeSeed('ui', { layout: { type: 'categorical', value: 'split' }, density: { type: 'scalar', value: 0.9 } }));
      expect(JSON.stringify(a)).not.toEqual(JSON.stringify(b));
    });

    it('handles empty genes gracefully', () => {
      expect(() => growSeed(makeSeed('ui'))).not.toThrow();
      const result = growSeed(makeSeed('ui'));
      expect(result).toBeDefined();
      expect(result.type).toBe('ui');
    });

    it('produces domain-specific output fields', () => {
      const result = growSeed(makeSeed('ui'));
      expect(result.interface).toBeDefined();
      expect(result.interface.layout).toBeDefined();
      expect(typeof result.interface.grid_columns).toBe('number');
      expect(result.design).toBeDefined();
    });
  });

  // ─── 11. physics ──────────────────────────────────────────────────────────

  describe('physics engine', () => {
    it('produces correct type field', () => {
      const result = growSeed(makeSeed('physics'));
      expect(result.type).toBe('physics');
    });

    it('includes render_hints.mode', () => {
      const result = growSeed(makeSeed('physics'));
      expect(typeof result.render_hints?.mode).toBe('string');
      expect(result.render_hints.mode.length).toBeGreaterThan(0);
    });

    it('responds to gene changes', () => {
      const a = growSeed(makeSeed('physics', { gravity: { type: 'scalar', value: 0.1 }, friction: { type: 'scalar', value: 0.1 } }));
      const b = growSeed(makeSeed('physics', { gravity: { type: 'scalar', value: 0.9 }, friction: { type: 'scalar', value: 0.9 } }));
      expect(JSON.stringify(a)).not.toEqual(JSON.stringify(b));
    });

    it('handles empty genes gracefully', () => {
      expect(() => growSeed(makeSeed('physics'))).not.toThrow();
      const result = growSeed(makeSeed('physics'));
      expect(result).toBeDefined();
      expect(result.type).toBe('physics');
    });

    it('produces domain-specific output fields', () => {
      const result = growSeed(makeSeed('physics'));
      expect(result.simulation).toBeDefined();
      expect(typeof result.simulation.gravity_ms2).toBe('number');
      expect(typeof result.simulation.dt).toBe('number');
      expect(result.config).toBeDefined();
    });
  });

  // ─── 12. audio ────────────────────────────────────────────────────────────

  describe('audio engine', () => {
    it('produces correct type field', () => {
      const result = growSeed(makeSeed('audio'));
      expect(result.type).toBe('audio');
    });

    it('includes render_hints.mode', () => {
      const result = growSeed(makeSeed('audio'));
      expect(typeof result.render_hints?.mode).toBe('string');
      expect(result.render_hints.mode.length).toBeGreaterThan(0);
    });

    it('responds to gene changes', () => {
      const a = growSeed(makeSeed('audio', { soundType: { type: 'categorical', value: 'sfx' }, duration: { type: 'scalar', value: 0.1 } }));
      const b = growSeed(makeSeed('audio', { soundType: { type: 'categorical', value: 'ambient' }, duration: { type: 'scalar', value: 0.9 } }));
      expect(JSON.stringify(a)).not.toEqual(JSON.stringify(b));
    });

    it('handles empty genes gracefully', () => {
      expect(() => growSeed(makeSeed('audio'))).not.toThrow();
      const result = growSeed(makeSeed('audio'));
      expect(result).toBeDefined();
      expect(result.type).toBe('audio');
    });

    it('produces domain-specific output fields', () => {
      const result = growSeed(makeSeed('audio'));
      expect(result.audio).toBeDefined();
      expect(result.audio.type).toBeDefined();
      expect(typeof result.audio.duration_ms).toBe('number');
      expect(result.synthesis).toBeDefined();
    });
  });

  // ─── 13. ecosystem ────────────────────────────────────────────────────────

  describe('ecosystem engine', () => {
    it('produces correct type field', () => {
      const result = growSeed(makeSeed('ecosystem'));
      expect(result.type).toBe('ecosystem');
    });

    it('includes render_hints.mode', () => {
      const result = growSeed(makeSeed('ecosystem'));
      expect(typeof result.render_hints?.mode).toBe('string');
      expect(result.render_hints.mode.length).toBeGreaterThan(0);
    });

    it('responds to gene changes', () => {
      const a = growSeed(makeSeed('ecosystem', { speciesCount: { type: 'scalar', value: 0.1 }, environment: { type: 'categorical', value: 'forest' } }));
      const b = growSeed(makeSeed('ecosystem', { speciesCount: { type: 'scalar', value: 0.9 }, environment: { type: 'categorical', value: 'ocean' } }));
      expect(JSON.stringify(a)).not.toEqual(JSON.stringify(b));
    });

    it('handles empty genes gracefully', () => {
      expect(() => growSeed(makeSeed('ecosystem'))).not.toThrow();
      const result = growSeed(makeSeed('ecosystem'));
      expect(result).toBeDefined();
      expect(result.type).toBe('ecosystem');
    });

    it('produces domain-specific output fields', () => {
      const result = growSeed(makeSeed('ecosystem'));
      expect(result.ecosystem).toBeDefined();
      expect(typeof result.ecosystem.species_count).toBe('number');
      expect(typeof result.ecosystem.stability).toBe('number');
      expect(result.dynamics).toBeDefined();
    });
  });

  // ─── 14. game ─────────────────────────────────────────────────────────────

  describe('game engine', () => {
    it('produces correct type field', () => {
      const result = growSeed(makeSeed('game'));
      expect(result.type).toBe('game');
    });

    it('includes render_hints.mode', () => {
      const result = growSeed(makeSeed('game'));
      expect(typeof result.render_hints?.mode).toBe('string');
      expect(result.render_hints.mode.length).toBeGreaterThan(0);
    });

    it('responds to gene changes', () => {
      const a = growSeed(makeSeed('game', { mechanicType: { type: 'categorical', value: 'turn_based' }, complexity: { type: 'scalar', value: 0.1 } }));
      const b = growSeed(makeSeed('game', { mechanicType: { type: 'categorical', value: 'realtime' }, complexity: { type: 'scalar', value: 0.9 } }));
      expect(JSON.stringify(a)).not.toEqual(JSON.stringify(b));
    });

    it('handles empty genes gracefully', () => {
      expect(() => growSeed(makeSeed('game'))).not.toThrow();
      const result = growSeed(makeSeed('game'));
      expect(result).toBeDefined();
      expect(result.type).toBe('game');
    });

    it('produces domain-specific output fields', () => {
      const result = growSeed(makeSeed('game'));
      expect(result.mechanic).toBeDefined();
      expect(result.mechanic.type).toBeDefined();
      expect(typeof result.mechanic.rule_count).toBe('number');
      expect(result.design).toBeDefined();
    });
  });

  // ─── 15. alife ────────────────────────────────────────────────────────────

  describe('alife engine', () => {
    it('produces correct type field', () => {
      const result = growSeed(makeSeed('alife'));
      expect(result.type).toBe('alife');
    });

    it('includes render_hints.mode', () => {
      const result = growSeed(makeSeed('alife'));
      expect(typeof result.render_hints?.mode).toBe('string');
      expect(result.render_hints.mode.length).toBeGreaterThan(0);
    });

    it('responds to gene changes', () => {
      const a = growSeed(makeSeed('alife', { rules: { type: 'categorical', value: 'conway' }, gridSize: { type: 'scalar', value: 0.2 } }));
      const b = growSeed(makeSeed('alife', { rules: { type: 'categorical', value: 'wireworld' }, gridSize: { type: 'scalar', value: 0.9 } }));
      expect(JSON.stringify(a)).not.toEqual(JSON.stringify(b));
    });

    it('handles empty genes gracefully', () => {
      expect(() => growSeed(makeSeed('alife'))).not.toThrow();
      const result = growSeed(makeSeed('alife'));
      expect(result).toBeDefined();
      expect(result.type).toBe('alife');
    });

    it('produces domain-specific output fields', () => {
      const result = growSeed(makeSeed('alife'));
      expect(result.alife).toBeDefined();
      expect(result.alife.rules).toBeDefined();
      expect(typeof result.alife.grid_size).toBe('number');
      expect(result.simulation).toBeDefined();
    });
  });

  // ─── 16. shader ───────────────────────────────────────────────────────────

  describe('shader engine', () => {
    it('produces correct type field', () => {
      const result = growSeed(makeSeed('shader'));
      expect(result.type).toBe('shader');
    });

    it('includes render_hints.mode', () => {
      const result = growSeed(makeSeed('shader'));
      expect(typeof result.render_hints?.mode).toBe('string');
      expect(result.render_hints.mode.length).toBeGreaterThan(0);
    });

    it('responds to gene changes', () => {
      const a = growSeed(makeSeed('shader', { shaderType: { type: 'categorical', value: 'fragment' }, complexity: { type: 'scalar', value: 0.1 } }));
      const b = growSeed(makeSeed('shader', { shaderType: { type: 'categorical', value: 'vertex' }, complexity: { type: 'scalar', value: 0.9 } }));
      expect(JSON.stringify(a)).not.toEqual(JSON.stringify(b));
    });

    it('handles empty genes gracefully', () => {
      expect(() => growSeed(makeSeed('shader'))).not.toThrow();
      const result = growSeed(makeSeed('shader'));
      expect(result).toBeDefined();
      expect(result.type).toBe('shader');
    });

    it('produces domain-specific output fields', () => {
      const result = growSeed(makeSeed('shader'));
      expect(result.shader).toBeDefined();
      expect(result.shader.type).toBeDefined();
      expect(result.shader.technique).toBeDefined();
      expect(typeof result.shader.iterations).toBe('number');
      expect(result.glsl).toBeDefined();
    });
  });

  // ─── 17. particle ─────────────────────────────────────────────────────────

  describe('particle engine', () => {
    it('produces correct type field', () => {
      const result = growSeed(makeSeed('particle'));
      expect(result.type).toBe('particle');
    });

    it('includes render_hints.mode', () => {
      const result = growSeed(makeSeed('particle'));
      expect(typeof result.render_hints?.mode).toBe('string');
      expect(result.render_hints.mode.length).toBeGreaterThan(0);
    });

    it('responds to gene changes', () => {
      const a = growSeed(makeSeed('particle', { emitter: { type: 'categorical', value: 'point' }, count: { type: 'scalar', value: 0.1 } }));
      const b = growSeed(makeSeed('particle', { emitter: { type: 'categorical', value: 'sphere' }, count: { type: 'scalar', value: 0.9 } }));
      expect(JSON.stringify(a)).not.toEqual(JSON.stringify(b));
    });

    it('handles empty genes gracefully', () => {
      expect(() => growSeed(makeSeed('particle'))).not.toThrow();
      const result = growSeed(makeSeed('particle'));
      expect(result).toBeDefined();
      expect(result.type).toBe('particle');
    });

    it('produces domain-specific output fields', () => {
      const result = growSeed(makeSeed('particle'));
      expect(result.particles).toBeDefined();
      expect(result.particles.emitter).toBeDefined();
      expect(typeof result.particles.count).toBe('number');
      expect(result.physics).toBeDefined();
      expect(result.visual).toBeDefined();
    });
  });

  // ─── 18. typography ───────────────────────────────────────────────────────

  describe('typography engine', () => {
    it('produces correct type field', () => {
      const result = growSeed(makeSeed('typography'));
      expect(result.type).toBe('typography');
    });

    it('includes render_hints.mode', () => {
      const result = growSeed(makeSeed('typography'));
      expect(typeof result.render_hints?.mode).toBe('string');
      expect(result.render_hints.mode.length).toBeGreaterThan(0);
    });

    it('responds to gene changes', () => {
      const a = growSeed(makeSeed('typography', { style: { type: 'categorical', value: 'serif' }, contrast: { type: 'scalar', value: 0.1 } }));
      const b = growSeed(makeSeed('typography', { style: { type: 'categorical', value: 'mono' }, contrast: { type: 'scalar', value: 0.9 } }));
      expect(JSON.stringify(a)).not.toEqual(JSON.stringify(b));
    });

    it('handles empty genes gracefully', () => {
      expect(() => growSeed(makeSeed('typography'))).not.toThrow();
      const result = growSeed(makeSeed('typography'));
      expect(result).toBeDefined();
      expect(result.type).toBe('typography');
    });

    it('produces domain-specific output fields', () => {
      const result = growSeed(makeSeed('typography'));
      expect(result.typography).toBeDefined();
      expect(result.typography.style).toBeDefined();
      expect(result.typography.weight_range).toBeDefined();
      expect(Array.isArray(result.typography.weight_range)).toBe(true);
      expect(result.metrics).toBeDefined();
    });
  });

  // ─── 19. architecture ─────────────────────────────────────────────────────

  describe('architecture engine', () => {
    it('produces correct type field', () => {
      const result = growSeed(makeSeed('architecture'));
      expect(result.type).toBe('architecture');
    });

    it('includes render_hints.mode', () => {
      const result = growSeed(makeSeed('architecture'));
      expect(typeof result.render_hints?.mode).toBe('string');
      expect(result.render_hints.mode.length).toBeGreaterThan(0);
    });

    it('responds to gene changes', () => {
      const a = growSeed(makeSeed('architecture', { style: { type: 'categorical', value: 'modern' }, scale: { type: 'scalar', value: 0.1 } }));
      const b = growSeed(makeSeed('architecture', { style: { type: 'categorical', value: 'gothic' }, scale: { type: 'scalar', value: 0.9 } }));
      expect(JSON.stringify(a)).not.toEqual(JSON.stringify(b));
    });

    it('handles empty genes gracefully', () => {
      expect(() => growSeed(makeSeed('architecture'))).not.toThrow();
      const result = growSeed(makeSeed('architecture'));
      expect(result).toBeDefined();
      expect(result.type).toBe('architecture');
    });

    it('produces domain-specific output fields', () => {
      const result = growSeed(makeSeed('architecture'));
      expect(result.building).toBeDefined();
      expect(result.building.style).toBeDefined();
      expect(typeof result.building.floors).toBe('number');
      expect(result.dimensions).toBeDefined();
      expect(result.structural).toBeDefined();
    });
  });

  // ─── 20. vehicle ──────────────────────────────────────────────────────────

  describe('vehicle engine', () => {
    it('produces correct type field', () => {
      const result = growSeed(makeSeed('vehicle'));
      expect(result.type).toBe('vehicle');
    });

    it('includes render_hints.mode', () => {
      const result = growSeed(makeSeed('vehicle'));
      expect(typeof result.render_hints?.mode).toBe('string');
      expect(result.render_hints.mode.length).toBeGreaterThan(0);
    });

    it('responds to gene changes', () => {
      const a = growSeed(makeSeed('vehicle', { propulsion: { type: 'categorical', value: 'electric' }, speed: { type: 'scalar', value: 0.1 } }));
      const b = growSeed(makeSeed('vehicle', { propulsion: { type: 'categorical', value: 'combustion' }, speed: { type: 'scalar', value: 0.9 } }));
      expect(JSON.stringify(a)).not.toEqual(JSON.stringify(b));
    });

    it('handles empty genes gracefully', () => {
      expect(() => growSeed(makeSeed('vehicle'))).not.toThrow();
      const result = growSeed(makeSeed('vehicle'));
      expect(result).toBeDefined();
      expect(result.type).toBe('vehicle');
    });

    it('produces domain-specific output fields', () => {
      const result = growSeed(makeSeed('vehicle'));
      expect(result.vehicle).toBeDefined();
      expect(result.vehicle.propulsion).toBeDefined();
      expect(typeof result.vehicle.top_speed_kmh).toBe('number');
      expect(result.performance).toBeDefined();
    });
  });

  // ─── 21. furniture ────────────────────────────────────────────────────────

  describe('furniture engine', () => {
    it('produces correct type field', () => {
      const result = growSeed(makeSeed('furniture'));
      expect(result.type).toBe('furniture');
    });

    it('includes render_hints.mode', () => {
      const result = growSeed(makeSeed('furniture'));
      expect(typeof result.render_hints?.mode).toBe('string');
      expect(result.render_hints.mode.length).toBeGreaterThan(0);
    });

    it('responds to gene changes', () => {
      const a = growSeed(makeSeed('furniture', { furnitureType: { type: 'categorical', value: 'chair' }, material: { type: 'categorical', value: 'wood' } }));
      const b = growSeed(makeSeed('furniture', { furnitureType: { type: 'categorical', value: 'sofa' }, material: { type: 'categorical', value: 'metal' } }));
      expect(JSON.stringify(a)).not.toEqual(JSON.stringify(b));
    });

    it('handles empty genes gracefully', () => {
      expect(() => growSeed(makeSeed('furniture'))).not.toThrow();
      const result = growSeed(makeSeed('furniture'));
      expect(result).toBeDefined();
      expect(result.type).toBe('furniture');
    });

    it('produces domain-specific output fields', () => {
      const result = growSeed(makeSeed('furniture'));
      expect(result.furniture).toBeDefined();
      expect(result.furniture.type).toBeDefined();
      expect(result.furniture.material).toBeDefined();
      expect(result.dimensions).toBeDefined();
      expect(result.properties).toBeDefined();
    });
  });

  // ─── 22. fashion ──────────────────────────────────────────────────────────

  describe('fashion engine', () => {
    it('produces correct type field', () => {
      const result = growSeed(makeSeed('fashion'));
      expect(result.type).toBe('fashion');
    });

    it('includes render_hints.mode', () => {
      const result = growSeed(makeSeed('fashion'));
      expect(typeof result.render_hints?.mode).toBe('string');
      expect(result.render_hints.mode.length).toBeGreaterThan(0);
    });

    it('responds to gene changes', () => {
      const a = growSeed(makeSeed('fashion', { garmentType: { type: 'categorical', value: 'dress' }, fabric: { type: 'categorical', value: 'silk' } }));
      const b = growSeed(makeSeed('fashion', { garmentType: { type: 'categorical', value: 'jacket' }, fabric: { type: 'categorical', value: 'denim' } }));
      expect(JSON.stringify(a)).not.toEqual(JSON.stringify(b));
    });

    it('handles empty genes gracefully', () => {
      expect(() => growSeed(makeSeed('fashion'))).not.toThrow();
      const result = growSeed(makeSeed('fashion'));
      expect(result).toBeDefined();
      expect(result.type).toBe('fashion');
    });

    it('produces domain-specific output fields', () => {
      const result = growSeed(makeSeed('fashion'));
      expect(result.garment).toBeDefined();
      expect(result.garment.type).toBeDefined();
      expect(result.garment.fabric).toBeDefined();
      expect(result.textile).toBeDefined();
      expect(result.construction).toBeDefined();
    });
  });

  // ─── 23. robotics ─────────────────────────────────────────────────────────

  describe('robotics engine', () => {
    it('produces correct type field', () => {
      const result = growSeed(makeSeed('robotics'));
      expect(result.type).toBe('robotics');
    });

    it('includes render_hints.mode', () => {
      const result = growSeed(makeSeed('robotics'));
      expect(typeof result.render_hints?.mode).toBe('string');
      expect(result.render_hints.mode.length).toBeGreaterThan(0);
    });

    it('responds to gene changes', () => {
      const a = growSeed(makeSeed('robotics', { robotType: { type: 'categorical', value: 'humanoid' }, dof: { type: 'scalar', value: 0.2 } }));
      const b = growSeed(makeSeed('robotics', { robotType: { type: 'categorical', value: 'wheeled' }, dof: { type: 'scalar', value: 0.9 } }));
      expect(JSON.stringify(a)).not.toEqual(JSON.stringify(b));
    });

    it('handles empty genes gracefully', () => {
      expect(() => growSeed(makeSeed('robotics'))).not.toThrow();
      const result = growSeed(makeSeed('robotics'));
      expect(result).toBeDefined();
      expect(result.type).toBe('robotics');
    });

    it('produces domain-specific output fields', () => {
      const result = growSeed(makeSeed('robotics'));
      expect(result.robot).toBeDefined();
      expect(result.robot.type).toBeDefined();
      expect(typeof result.robot.dof).toBe('number');
      expect(result.capabilities).toBeDefined();
    });
  });

  // ─── 24. circuit ──────────────────────────────────────────────────────────

  describe('circuit engine', () => {
    it('produces correct type field', () => {
      const result = growSeed(makeSeed('circuit'));
      expect(result.type).toBe('circuit');
    });

    it('includes render_hints.mode', () => {
      const result = growSeed(makeSeed('circuit'));
      expect(typeof result.render_hints?.mode).toBe('string');
      expect(result.render_hints.mode.length).toBeGreaterThan(0);
    });

    it('responds to gene changes', () => {
      const a = growSeed(makeSeed('circuit', { circuitType: { type: 'categorical', value: 'digital' }, complexity: { type: 'scalar', value: 0.1 } }));
      const b = growSeed(makeSeed('circuit', { circuitType: { type: 'categorical', value: 'rf' }, complexity: { type: 'scalar', value: 0.9 } }));
      expect(JSON.stringify(a)).not.toEqual(JSON.stringify(b));
    });

    it('handles empty genes gracefully', () => {
      expect(() => growSeed(makeSeed('circuit'))).not.toThrow();
      const result = growSeed(makeSeed('circuit'));
      expect(result).toBeDefined();
      expect(result.type).toBe('circuit');
    });

    it('produces domain-specific output fields', () => {
      const result = growSeed(makeSeed('circuit'));
      expect(result.circuit).toBeDefined();
      expect(result.circuit.type).toBeDefined();
      expect(typeof result.circuit.layers).toBe('number');
      expect(result.electrical).toBeDefined();
      expect(result.layout).toBeDefined();
    });
  });

  // ─── 25. food ─────────────────────────────────────────────────────────────

  describe('food engine', () => {
    it('produces correct type field', () => {
      const result = growSeed(makeSeed('food'));
      expect(result.type).toBe('food');
    });

    it('includes render_hints.mode', () => {
      const result = growSeed(makeSeed('food'));
      expect(typeof result.render_hints?.mode).toBe('string');
      expect(result.render_hints.mode.length).toBeGreaterThan(0);
    });

    it('responds to gene changes', () => {
      const a = growSeed(makeSeed('food', { cuisine: { type: 'categorical', value: 'italian' }, complexity: { type: 'scalar', value: 0.1 } }));
      const b = growSeed(makeSeed('food', { cuisine: { type: 'categorical', value: 'japanese' }, complexity: { type: 'scalar', value: 0.9 } }));
      expect(JSON.stringify(a)).not.toEqual(JSON.stringify(b));
    });

    it('handles empty genes gracefully', () => {
      expect(() => growSeed(makeSeed('food'))).not.toThrow();
      const result = growSeed(makeSeed('food'));
      expect(result).toBeDefined();
      expect(result.type).toBe('food');
    });

    it('produces domain-specific output fields', () => {
      const result = growSeed(makeSeed('food'));
      expect(result.recipe).toBeDefined();
      expect(result.recipe.cuisine).toBeDefined();
      expect(typeof result.recipe.complexity).toBe('number');
      expect(result.flavor).toBeDefined();
      expect(result.preparation).toBeDefined();
    });
  });

  // ─── 26. choreography ─────────────────────────────────────────────────────

  describe('choreography engine', () => {
    it('produces correct type field', () => {
      const result = growSeed(makeSeed('choreography'));
      expect(result.type).toBe('choreography');
    });

    it('includes render_hints.mode', () => {
      const result = growSeed(makeSeed('choreography'));
      expect(typeof result.render_hints?.mode).toBe('string');
      expect(result.render_hints.mode.length).toBeGreaterThan(0);
    });

    it('responds to gene changes', () => {
      const a = growSeed(makeSeed('choreography', { style: { type: 'categorical', value: 'ballet' }, tempo: { type: 'scalar', value: 0.1 } }));
      const b = growSeed(makeSeed('choreography', { style: { type: 'categorical', value: 'hiphop' }, tempo: { type: 'scalar', value: 0.9 } }));
      expect(JSON.stringify(a)).not.toEqual(JSON.stringify(b));
    });

    it('handles empty genes gracefully', () => {
      expect(() => growSeed(makeSeed('choreography'))).not.toThrow();
      const result = growSeed(makeSeed('choreography'));
      expect(result).toBeDefined();
      expect(result.type).toBe('choreography');
    });

    it('produces domain-specific output fields', () => {
      const result = growSeed(makeSeed('choreography'));
      expect(result.choreography).toBeDefined();
      expect(result.choreography.style).toBeDefined();
      expect(typeof result.choreography.tempo_bpm).toBe('number');
      expect(result.structure).toBeDefined();
      expect(result.spatial).toBeDefined();
    });
  });

  // ─── 27. agent ────────────────────────────────────────────────────────────

  describe('agent engine', () => {
    it('produces correct type field', () => {
      const result = growSeed(makeSeed('agent'));
      expect(result.type).toBe('agent');
    });

    it('includes render_hints.mode', () => {
      const result = growSeed(makeSeed('agent'));
      expect(typeof result.render_hints?.mode).toBe('string');
      expect(result.render_hints.mode.length).toBeGreaterThan(0);
    });

    it('responds to gene changes', () => {
      const a = growSeed(makeSeed('agent', { persona: { type: 'categorical', value: 'artist' }, temperature: { type: 'scalar', value: 0.1 } }));
      const b = growSeed(makeSeed('agent', { persona: { type: 'categorical', value: 'critic' }, temperature: { type: 'scalar', value: 0.9 } }));
      expect(JSON.stringify(a)).not.toEqual(JSON.stringify(b));
    });

    it('handles empty genes gracefully', () => {
      expect(() => growSeed(makeSeed('agent'))).not.toThrow();
      const result = growSeed(makeSeed('agent'));
      expect(result).toBeDefined();
      expect(result.type).toBe('agent');
    });

    it('produces domain-specific output fields', () => {
      const result = growSeed(makeSeed('agent'));
      expect(result.config).toBeDefined();
      expect(result.config.persona).toBeDefined();
      expect(typeof result.config.temperature).toBe('number');
      expect(typeof result.config.systemPrompt).toBe('string');
    });
  });
});
