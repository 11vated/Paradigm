/**
 * World seed + Quest composition tests.
 */
import { describe, it, expect } from 'vitest';
import { createFriendSeed } from '@/lib/friend/genesis';
import {
  createWorldSeed, generateWorld, hashArtifact,
  composeQuest, questBrief,
} from '@/lib/world';
import type { QuestArchetype } from '@/lib/world';

describe('World genesis', () => {
  it('is deterministic by seed string', () => {
    const a = createWorldSeed('vellichor');
    const b = createWorldSeed('vellichor');
    expect(a.seedHash).toBe(b.seedHash);
    expect(a.id).toBe(b.id);
    expect(a.name).toBe(b.name);
    expect(JSON.stringify(a.genes)).toBe(JSON.stringify(b.genes));
  });

  it('produces different worlds for different seeds', () => {
    const a = createWorldSeed('vellichor');
    const b = createWorldSeed('iron-marsh');
    expect(a.seedHash).not.toBe(b.seedHash);
    expect(a.name).not.toBe(b.name);
  });

  it('all gene scalars in [0,1]', () => {
    const w = createWorldSeed('lyrelm');
    const scalars = [
      w.genes.setting.magic, w.genes.setting.tech, w.genes.setting.density,
      w.genes.physics.gravity, w.genes.physics.hostility,
      w.genes.society.order, w.genes.society.pluralism,
      w.genes.conflict.scale, w.genes.conflict.urgency, w.genes.conflict.clarity,
      w.genes.mood.brightness, w.genes.mood.warmth, w.genes.mood.pace,
    ];
    for (const s of scalars) {
      expect(s).toBeGreaterThanOrEqual(0);
      expect(s).toBeLessThanOrEqual(1);
    }
  });
});

describe('World generator', () => {
  it('hashes identically for same seed', () => {
    const w = createWorldSeed('thrice-fallen');
    const a = generateWorld(w);
    const b = generateWorld(w);
    expect(hashArtifact(a)).toBe(hashArtifact(b));
  });

  it('produces 3 locations and 3 factions', () => {
    const w = createWorldSeed('sun-quay');
    const a = generateWorld(w);
    expect(a.locations).toHaveLength(3);
    expect(a.factions).toHaveLength(3);
    expect(a.hook.length).toBeGreaterThan(20);
  });

  it('faction diversity: at least two alignments', () => {
    const w = createWorldSeed('vellichor');
    const a = generateWorld(w);
    const aligns = new Set(a.factions.map((f) => f.alignment));
    expect(aligns.size).toBeGreaterThanOrEqual(2);
  });
});

describe('Quest composition (friend × world)', () => {
  const nori = createFriendSeed('nori-the-curious');
  const atlas = createFriendSeed('atlas-the-bold');
  const vellichor = createWorldSeed('vellichor');
  const ironMarsh = createWorldSeed('iron-marsh');

  it('is deterministic by (friend, world, salt)', () => {
    const q1 = composeQuest(nori, vellichor);
    const q2 = composeQuest(nori, vellichor);
    expect(q1.seedHash).toBe(q2.seedHash);
    expect(q1.title).toBe(q2.title);
  });

  it('changes archetype across different worlds', () => {
    const q1 = composeQuest(nori, vellichor);
    const q2 = composeQuest(nori, ironMarsh);
    expect(q1.parents.world.id).not.toBe(q2.parents.world.id);
    // Hooks must explicitly name the friend
    expect(q1.genes.hook).toContain(nori.name);
    expect(q2.genes.hook).toContain(nori.name);
  });

  it('changes hook across different friends in the same world', () => {
    const q1 = composeQuest(nori, vellichor);
    const q2 = composeQuest(atlas, vellichor);
    expect(q1.genes.hook).not.toBe(q2.genes.hook);
    expect(q1.genes.hook).toContain(nori.name);
    expect(q2.genes.hook).toContain(atlas.name);
  });

  it('salt produces different quest seeds for same parents', () => {
    const a = composeQuest(nori, vellichor, { salt: 'morning' });
    const b = composeQuest(nori, vellichor, { salt: 'evening' });
    expect(a.seedHash).not.toBe(b.seedHash);
    // Same parents
    expect(a.parents.friend.id).toBe(b.parents.friend.id);
    expect(a.parents.world.id).toBe(b.parents.world.id);
  });

  it('all quest scalar genes in [0,1]', () => {
    const q = composeQuest(atlas, ironMarsh);
    const g = q.genes;
    for (const s of [g.stake, g.antagonist, g.moralComplexity, g.pacing, g.intensity]) {
      expect(s).toBeGreaterThanOrEqual(0);
      expect(s).toBeLessThanOrEqual(1);
    }
    expect(g.actCount).toBeGreaterThanOrEqual(3);
    expect(g.actCount).toBeLessThanOrEqual(5);
    expect(g.targetWordCount).toBeGreaterThan(0);
  });

  it('archetype is one of the known set', () => {
    const valid: QuestArchetype[] = [
      'heros-journey', 'mystery-investigation', 'survival-crawl',
      'political-intrigue', 'redemption-arc', 'discovery-expedition',
      'underdog-rebellion',
    ];
    for (const f of [nori, atlas]) {
      for (const w of [vellichor, ironMarsh]) {
        const q = composeQuest(f, w);
        expect(valid).toContain(q.genes.archetype);
      }
    }
  });

  it('quest brief includes all critical fields', () => {
    const q = composeQuest(nori, vellichor);
    const brief = questBrief(q);
    expect(brief).toContain(q.title);
    expect(brief).toContain(nori.name);
    expect(brief).toContain(vellichor.name);
    expect(brief).toContain('Archetype');
    expect(brief).toContain('Stake');
  });

  it('provenance is preserved (parents are linkable to source seeds)', () => {
    const q = composeQuest(nori, vellichor);
    expect(q.parents.friend.seedHash).toBe(nori.seedHash);
    expect(q.parents.world.seedHash).toBe(vellichor.seedHash);
  });
});
