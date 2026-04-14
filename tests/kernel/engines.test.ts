/**
 * Comprehensive tests for all 27 domain engines.
 * 5 tests per domain: type, render_hints, gene responsiveness, empty genes, domain-specific fields.
 */
import { describe, it, expect } from 'vitest';
import { growSeed, getAllDomains } from '../../src/lib/kernel/engines.js';

function makeSeed(domain: string, genes: Record<string, any> = {}): any {
  return {
    id: 'test-' + domain, $domain: domain, $name: 'Test ' + domain,
    $lineage: { generation: 1, operation: 'test' }, $hash: 'testhash-' + domain,
    $fitness: { overall: 0.5 }, genes,
  };
}

// ─── Registry Tests ─────────────────────────────────────────────────────────

describe('Engine Registry', () => {
  it('has exactly 27 engines', () => { expect(getAllDomains().length).toBe(27); });
  it('getAllDomains returns string array', () => { for (const d of getAllDomains()) expect(typeof d).toBe('string'); });
  it('contains critical domains', () => {
    const d = getAllDomains();
    for (const name of ['character', 'sprite', 'music', 'fullgame', 'physics', 'agent', 'narrative', 'geometry3d'])
      expect(d).toContain(name);
  });
});

// ─── growSeed Smoke Tests ────────────────────────────────────────────────────

describe('growSeed (all domains)', () => {
  it('returns object for every domain', () => {
    for (const d of getAllDomains()) {
      const result = growSeed(makeSeed(d, { core_power: { type: 'scalar', value: 0.7 } }));
      expect(result).toBeDefined();
      expect(typeof result).toBe('object');
    }
  });
  it('handles minimal genes', () => {
    const result = growSeed(makeSeed('character', {}));
    expect(result.type).toBe('character');
  });
  it('returns different results for different genes', () => {
    const a = growSeed(makeSeed('character', { strength: { type: 'scalar', value: 0.1 } }));
    const b = growSeed(makeSeed('character', { strength: { type: 'scalar', value: 0.9 } }));
    expect(a.stats?.strength).not.toBe(b.stats?.strength);
  });
});

// ─── Per-Domain Tests ────────────────────────────────────────────────────────

const domainTests: Record<string, { genes: Record<string, any>; checks: (r: any) => void }> = {
  character: {
    genes: { strength: { type: 'scalar', value: 0.8 }, agility: { type: 'scalar', value: 0.6 }, archetype: { type: 'categorical', value: 'warrior' }, palette: { type: 'vector', value: [0.7, 0.3, 0.2] } },
    checks: (r) => { expect(r.visual?.body_width).toBeDefined(); expect(r.stats?.strength).toBeDefined(); expect(r.archetype).toBe('warrior'); },
  },
  sprite: {
    genes: { resolution: { type: 'scalar', value: 0.5 }, colors: { type: 'vector', value: [0.8, 0.2, 0.3] } },
    checks: (r) => { expect(r.visual?.resolution).toBeDefined(); expect(r.visual?.palette_size).toBeDefined(); },
  },
  music: {
    genes: { tempo: { type: 'scalar', value: 0.5 }, key: { type: 'categorical', value: 'C' }, scale: { type: 'categorical', value: 'minor' } },
    checks: (r) => { expect(r.musical?.tempo).toBeDefined(); expect(r.musical?.key).toBe('C'); },
  },
  visual2d: {
    genes: { style: { type: 'categorical', value: 'abstract' }, complexity: { type: 'scalar', value: 0.7 } },
    checks: (r) => { expect(r.visual?.style).toBe('abstract'); expect(r.visual?.layers).toBeGreaterThan(0); },
  },
  procedural: {
    genes: { octaves: { type: 'scalar', value: 0.6 }, biome: { type: 'categorical', value: 'alpine' } },
    checks: (r) => { expect(r.terrain?.octaves).toBeDefined(); expect(r.terrain?.biome).toBe('alpine'); },
  },
  fullgame: {
    genes: { genre: { type: 'categorical', value: 'rpg' }, difficulty: { type: 'scalar', value: 0.6 }, levelCount: { type: 'scalar', value: 0.7 } },
    checks: (r) => { expect(r.game?.genre).toBe('rpg'); expect(r.game?.levels).toBeGreaterThan(0); },
  },
  animation: {
    genes: { frameCount: { type: 'scalar', value: 0.5 }, fps: { type: 'scalar', value: 0.5 }, motionType: { type: 'categorical', value: 'skeletal' } },
    checks: (r) => { expect(r.animation?.frame_count).toBeGreaterThan(0); expect(r.animation?.fps).toBeGreaterThan(0); },
  },
  geometry3d: {
    genes: { primitive: { type: 'categorical', value: 'sphere' }, detail: { type: 'scalar', value: 0.7 }, material: { type: 'categorical', value: 'metal' } },
    checks: (r) => { expect(r.mesh?.primitive).toBe('sphere'); expect(r.mesh?.subdivisions).toBeGreaterThan(0); },
  },
  narrative: {
    genes: { structure: { type: 'categorical', value: 'heros_journey' }, tone: { type: 'categorical', value: 'epic' }, characters: { type: 'array', value: ['hero', 'villain'] }, complexity: { type: 'scalar', value: 0.6 } },
    checks: (r) => { expect(r.story?.structure).toBe('heros_journey'); expect(r.story?.acts).toBeGreaterThan(0); },
  },
  ui: {
    genes: { layout: { type: 'categorical', value: 'dashboard' }, theme: { type: 'categorical', value: 'dark' }, density: { type: 'scalar', value: 0.5 } },
    checks: (r) => { expect(r.interface?.layout).toBe('dashboard'); expect(r.interface?.theme).toBe('dark'); },
  },
  physics: {
    genes: { gravity: { type: 'scalar', value: 0.5 }, friction: { type: 'scalar', value: 0.3 }, elasticity: { type: 'scalar', value: 0.8 } },
    checks: (r) => { expect(r.simulation).toBeDefined(); },
  },
  audio: {
    genes: { soundType: { type: 'categorical', value: 'sfx' }, duration: { type: 'scalar', value: 0.5 }, frequency: { type: 'scalar', value: 440 } },
    checks: (r) => { expect(r.audio?.type).toBe('sfx'); expect(r.audio?.duration_ms).toBeGreaterThan(0); },
  },
  ecosystem: {
    genes: { speciesCount: { type: 'scalar', value: 0.6 }, environment: { type: 'categorical', value: 'forest' }, stability: { type: 'scalar', value: 0.7 } },
    checks: (r) => { expect(r.ecosystem?.species_count).toBeGreaterThan(0); expect(r.ecosystem?.environment).toBe('forest'); },
  },
  game: {
    genes: { mechanicType: { type: 'categorical', value: 'turn_based' }, complexity: { type: 'scalar', value: 0.6 }, players: { type: 'scalar', value: 2 } },
    checks: (r) => { expect(r.mechanic?.type).toBe('turn_based'); },
  },
  alife: {
    genes: { rules: { type: 'categorical', value: 'conway' }, gridSize: { type: 'scalar', value: 0.5 }, density: { type: 'scalar', value: 0.3 } },
    checks: (r) => { expect(r.alife?.rules).toBe('conway'); expect(r.alife?.grid_size).toBeGreaterThan(0); },
  },
  shader: {
    genes: { shaderType: { type: 'categorical', value: 'fragment' }, technique: { type: 'categorical', value: 'raymarching' }, complexity: { type: 'scalar', value: 0.6 } },
    checks: (r) => { expect(r.shader?.type).toBe('fragment'); expect(r.shader?.technique).toBe('raymarching'); },
  },
  particle: {
    genes: { emitter: { type: 'categorical', value: 'point' }, count: { type: 'scalar', value: 0.5 }, lifetime: { type: 'scalar', value: 2.0 } },
    checks: (r) => { expect(r.particles?.emitter).toBe('point'); expect(r.particles?.count).toBeGreaterThan(0); },
  },
  typography: {
    genes: { style: { type: 'categorical', value: 'sans_serif' }, xHeight: { type: 'scalar', value: 0.5 }, contrast: { type: 'scalar', value: 0.4 } },
    checks: (r) => { expect(r.typography?.style).toBe('sans_serif'); expect(r.typography?.weight_range).toBeDefined(); },
  },
  architecture: {
    genes: { style: { type: 'categorical', value: 'modern' }, scale: { type: 'scalar', value: 0.6 }, materials: { type: 'array', value: ['steel', 'glass'] } },
    checks: (r) => { expect(r.building?.style).toBe('modern'); expect(r.building?.floors).toBeGreaterThan(0); },
  },
  vehicle: {
    genes: { propulsion: { type: 'categorical', value: 'electric' }, speed: { type: 'scalar', value: 0.7 }, mass: { type: 'scalar', value: 0.4 } },
    checks: (r) => { expect(r.vehicle?.propulsion).toBe('electric'); },
  },
  furniture: {
    genes: { furnitureType: { type: 'categorical', value: 'chair' }, style: { type: 'categorical', value: 'modern' }, material: { type: 'categorical', value: 'wood' }, quality: { type: 'scalar', value: 0.7 } },
    checks: (r) => { expect(r.furniture?.type).toBe('chair'); expect(r.furniture?.material).toBe('wood'); },
  },
  fashion: {
    genes: { garmentType: { type: 'categorical', value: 'dress' }, fabric: { type: 'categorical', value: 'silk' }, palette: { type: 'vector', value: [0.8, 0.1, 0.3] }, complexity: { type: 'scalar', value: 0.5 } },
    checks: (r) => { expect(r.garment?.type).toBe('dress'); expect(r.garment?.fabric).toBe('silk'); },
  },
  robotics: {
    genes: { robotType: { type: 'categorical', value: 'humanoid' }, dof: { type: 'scalar', value: 0.6 }, actuators: { type: 'array', value: ['servo'] } },
    checks: (r) => { expect(r.robot?.type).toBe('humanoid'); expect(r.robot?.dof).toBeGreaterThan(0); },
  },
  circuit: {
    genes: { circuitType: { type: 'categorical', value: 'digital' }, components: { type: 'array', value: ['resistor', 'IC'] }, layers: { type: 'scalar', value: 0.5 } },
    checks: (r) => { expect(r.circuit?.type).toBe('digital'); expect(r.circuit?.layers).toBeGreaterThan(0); },
  },
  food: {
    genes: { cuisine: { type: 'categorical', value: 'japanese' }, complexity: { type: 'scalar', value: 0.6 }, flavor_profile: { type: 'vector', value: [0.2, 0.6, 0.8, 0.15, 0.05] } },
    checks: (r) => { expect(r.recipe?.cuisine).toBe('japanese'); },
  },
  choreography: {
    genes: { style: { type: 'categorical', value: 'ballet' }, tempo: { type: 'scalar', value: 0.5 }, dancers: { type: 'scalar', value: 0.4 } },
    checks: (r) => { expect(r.choreography?.style).toBe('ballet'); },
  },
  agent: {
    genes: {
      persona: { type: 'categorical', value: 'architect' }, temperature: { type: 'scalar', value: 0.3 },
      reasoning_depth: { type: 'scalar', value: 0.8 }, domain_focus: { type: 'vector', value: new Array(27).fill(1/27) },
      gene_expertise: { type: 'vector', value: new Array(17).fill(1/17) },
      tool_permissions: { type: 'struct', value: { web_browse: false, file_write: false, fork_agent: false, delegate: false } },
    },
    checks: (r) => { expect(r.config?.persona).toBe('architect'); expect(r.config?.systemPrompt).toBeDefined(); expect(r.config?.systemPrompt.length).toBeGreaterThan(50); },
  },
};

for (const [domain, spec] of Object.entries(domainTests)) {
  describe(`${domain} engine`, () => {
    it('produces correct type field', () => {
      expect(growSeed(makeSeed(domain, spec.genes)).type).toBe(domain);
    });

    it('includes render_hints.mode', () => {
      const r = growSeed(makeSeed(domain, spec.genes));
      expect(r.render_hints).toBeDefined();
      expect(typeof r.render_hints.mode).toBe('string');
      expect(r.render_hints.mode.length).toBeGreaterThan(0);
    });

    it('responds to gene changes', () => {
      const a = growSeed(makeSeed(domain, spec.genes));
      const altGenes: Record<string, any> = {};
      for (const [k, v] of Object.entries(spec.genes)) {
        if (v.type === 'scalar') altGenes[k] = { ...v, value: Math.max(0, Math.min(1, (v.value || 0.5) + 0.3)) };
        else altGenes[k] = v;
      }
      const b = growSeed(makeSeed(domain, altGenes));
      expect(JSON.stringify(a)).not.toBe(JSON.stringify(b));
    });

    it('handles empty genes gracefully', () => {
      const r = growSeed(makeSeed(domain, {}));
      expect(r).toBeDefined();
      expect(r.type).toBe(domain);
    });

    it('produces domain-specific output fields', () => {
      spec.checks(growSeed(makeSeed(domain, spec.genes)));
    });
  });
}
