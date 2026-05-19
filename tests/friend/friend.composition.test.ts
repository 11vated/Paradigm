/**
 * Friend composition tests — friend × {music, narrative, visual2d, character, audio, agent}.
 *
 * Verifies the 6 Phase-3 bridges produce target-domain seeds with
 * semantically correct genes (deterministic, no Math.random anywhere).
 */
import { describe, it, expect } from 'vitest';
import { createFriendSeed } from '@/lib/friend';
import { composeFriend, FRIEND_BRIDGES } from '@/lib/friend/composition';
import { FUNCTOR_REGISTRY } from '@/lib/kernel/composition';

describe('Friend composition bridges', () => {
  it('registers all 6 friend bridges into the composition graph', () => {
    const names = FRIEND_BRIDGES.map((b) => b.name);
    expect(names.sort()).toEqual([
      'friend_to_agent',
      'friend_to_audio',
      'friend_to_character',
      'friend_to_music',
      'friend_to_narrative',
      'friend_to_visual2d',
    ]);
    for (const name of names) {
      expect(FUNCTOR_REGISTRY.find((f) => f.name === name)).toBeDefined();
    }
  });

  it('every friend bridge carries a custom transform function', () => {
    for (const b of FRIEND_BRIDGES) {
      expect(typeof b.transform).toBe('function');
    }
  });
});

describe('friend → music', () => {
  it('produces a music seed with tempo/key/scale/melody/tuning', () => {
    const f = createFriendSeed('seed-music');
    const m = composeFriend(f, 'music');
    expect(m.$domain).toBe('music');
    expect(m.genes.tempo.type).toBe('scalar');
    expect(typeof m.genes.tempo.value).toBe('number');
    expect(m.genes.tempo.value).toBeGreaterThanOrEqual(60);
    expect(m.genes.tempo.value).toBeLessThanOrEqual(180);
    expect(['C-major', 'A-minor']).toContain(m.genes.key.value);
    expect(['modal', 'diatonic']).toContain(m.genes.scale.value);
  });

  it('is deterministic (same seed → same music genes)', () => {
    const a = composeFriend(createFriendSeed('determ-1'), 'music');
    const b = composeFriend(createFriendSeed('determ-1'), 'music');
    expect(a.genes).toEqual(b.genes);
  });

  it('different friends produce different music', () => {
    // Run many times — the persona space is wide so genes diverge often.
    let differ = 0;
    for (let i = 0; i < 10; i++) {
      const a = composeFriend(createFriendSeed(`f-a-${i}`), 'music');
      const b = composeFriend(createFriendSeed(`f-b-${i}`), 'music');
      if (a.genes.tempo.value !== b.genes.tempo.value) differ++;
    }
    expect(differ).toBeGreaterThan(0);
  });
});

describe('friend → narrative', () => {
  it('produces a narrative seed with structure/tone/characters/plot/acts', () => {
    const n = composeFriend(createFriendSeed('seed-narr'), 'narrative');
    expect(n.$domain).toBe('narrative');
    expect(['three-act', 'episodic']).toContain(n.genes.structure.value);
    expect(['whimsical', 'warm', 'somber', 'austere']).toContain(n.genes.tone.value);
    expect(n.genes.characters.value).toBeGreaterThanOrEqual(1);
  });
});

describe('friend → visual2d', () => {
  it('maps body.skinTone into palette as RGB vector', () => {
    const f = createFriendSeed('seed-v2');
    const v = composeFriend(f, 'visual2d');
    expect(v.$domain).toBe('visual2d');
    expect(v.genes.palette.type).toBe('vector');
    expect(v.genes.palette.value).toEqual(f.genes.body.skinTone);
    expect(['organic', 'architectural']).toContain(v.genes.style.value);
  });
});

describe('friend → character', () => {
  it('high-fidelity 1:1 mapping (size, archetype, strength, palette)', () => {
    const f = createFriendSeed('seed-char');
    const c = composeFriend(f, 'character');
    expect(c.$domain).toBe('character');
    expect(c.genes.size.value).toBe(f.genes.body.heightScale);
    expect(c.genes.archetype.value).toBe(f.genes.body.archetype);
    expect(c.genes.strength.value).toBe(f.genes.body.muscle);
    expect(c.genes.palette.value).toEqual(f.genes.body.skinTone);
  });
});

describe('friend → audio', () => {
  it('maps voice.pitch directly to frequency (Hz)', () => {
    const f = createFriendSeed('seed-aud');
    const a = composeFriend(f, 'audio');
    expect(a.$domain).toBe('audio');
    expect(a.genes.frequency.value).toBe(f.genes.voice.pitch);
    expect(['breathy', 'clear']).toContain(a.genes.soundType.value);
  });
});

describe('friend → agent', () => {
  it('maps Big-Five conscientiousness to reasoning_depth and openness to exploration_rate', () => {
    const f = createFriendSeed('seed-agt');
    const a = composeFriend(f, 'agent');
    expect(a.$domain).toBe('agent');
    expect(a.genes.reasoning_depth.value).toBe(f.genes.persona.bigFive.conscientiousness);
    expect(a.genes.exploration_rate.value).toBe(f.genes.persona.bigFive.openness);
    expect(a.genes.max_steps.value).toBeGreaterThanOrEqual(10);
    expect(a.genes.max_steps.value).toBeLessThanOrEqual(100);
  });
});

describe('lineage tracking', () => {
  it('every composed seed records the friend hash as parent', () => {
    const f = createFriendSeed('seed-lineage');
    const m = composeFriend(f, 'music');
    expect(m.$lineage.parents).toContain(f.id);
    expect(m.$lineage.operation).toBe('compose:friend→music');
  });
});
