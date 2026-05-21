/**
 * Friend × Sovereign-Agent bridge tests
 *
 * Pins:
 *   - createFriendFromAgent produces a typed FriendSeedData
 *   - agent overrides map to the correct Friend fields
 *   - deterministic: same intent → same seedHash + same overrides
 *   - evolveFriendFromAgent preserves parent identity while shifting traits
 *   - breedFriendFromAgent mixes both parents
 *   - friendFromAgent dispatches by intent.top
 */
import { describe, it, expect } from 'vitest';
import {
  createFriendFromAgent,
  evolveFriendFromAgent,
  breedFriendFromAgent,
  friendFromAgent,
} from '../../src/lib/friend/from-agent';
import type { ResolvedIntent } from '../../src/lib/intelligence/agent/types';

function intent(top: 'CREATE' | 'EVOLVE' | 'BREED' = 'CREATE', overrides: Array<[string, number | string]> = []): ResolvedIntent {
  return {
    intent: {
      raw: 'a melancholy ocean ally',
      top, sub: 'friend',
      domains: ['friend'],
      adjectives: [],
      entities: [{ kind: 'character', text: 'Aria' }],
      references: [],
      budget: {},
    },
    templateId: 'friend',
    geneSpecs: (() => {
      const base = [
        { path: 'body.bigFive.openness', value: 0.85, source: 'PersonalityAgent', confidence: 1 },
        { path: 'body.bigFive.agreeableness', value: 0.9, source: 'PersonalityAgent', confidence: 1 },
        { path: 'body.bigFive.neuroticism', value: 0.7, source: 'PersonalityAgent', confidence: 1 },
        { path: 'bond.warmth', value: 0.8, source: 'PersonalityAgent', confidence: 1 },
        { path: 'bond.trust', value: 0.75, source: 'PersonalityAgent', confidence: 1 },
        { path: 'bond.loyalty', value: 0.9, source: 'PersonalityAgent', confidence: 1 },
        { path: 'persona.archetype', value: 'caregiver', source: 'PersonalityAgent', confidence: 1 },
      ];
      // Later wins — drop any base entry whose path is in overrides.
      const overridePaths = new Set(overrides.map(([p]) => p));
      const survivors = base.filter((b) => !overridePaths.has(b.path));
      return [
        ...survivors,
        ...overrides.map(([p, v]) => ({ path: p, value: v, source: 'test', confidence: 1 })),
      ];
    })(),
    subAgentVotes: {},
  } as ResolvedIntent;
}

describe('Friend × Agent — createFriendFromAgent', () => {
  it('produces a typed FriendSeedData with overrides applied', () => {
    const f = createFriendFromAgent(intent());
    expect(f.id).toBeTypeOf('string');
    expect(f.seedHash).toMatch(/^[0-9a-f]{64}$/);
    expect(f.name).toBe('Aria');
    expect(f.genes.persona.bigFive.openness).toBeCloseTo(0.85, 5);
    expect(f.genes.persona.bigFive.agreeableness).toBeCloseTo(0.9, 5);
    expect(f.genes.bond.initialWarmth).toBeCloseTo(0.8, 5);
    expect(f.genes.bond.initialTrust).toBeCloseTo(0.75, 5);
    expect(f.genes.persona.values).toContain('loyalty');
    expect(f.genes.persona.values).toContain('caregiver');
  });

  it('uses the name override when provided', () => {
    const f = createFriendFromAgent(intent(), { name: 'Echo' });
    expect(f.name).toBe('Echo');
  });

  it('is deterministic — same intent → same seedHash', () => {
    const a = createFriendFromAgent(intent(), { name: 'X' });
    const b = createFriendFromAgent(intent(), { name: 'X' });
    expect(a.seedHash).toBe(b.seedHash);
    expect(a.genes.persona.bigFive).toEqual(b.genes.persona.bigFive);
  });

  it('different intent overrides → different seedHash', () => {
    const a = createFriendFromAgent(intent('CREATE', [['body.bigFive.openness', 0.1]]));
    const b = createFriendFromAgent(intent('CREATE', [['body.bigFive.openness', 0.9]]));
    expect(a.seedHash).not.toBe(b.seedHash);
  });
});

describe('Friend × Agent — evolveFriendFromAgent', () => {
  it('preserves parent lineage and applies new overrides', () => {
    const parent = createFriendFromAgent(intent());
    const child = evolveFriendFromAgent(parent, intent('EVOLVE', [['body.bigFive.openness', 0.2]]));
    expect(child.parents).toEqual([parent.id]);
    expect(child.derivation?.operator).toBe('mutate');
    expect(child.genes.persona.bigFive.openness).toBeCloseTo(0.2, 5);
    expect(child.seedHash).not.toBe(parent.seedHash);
  });

  it('evolution is deterministic', () => {
    const parent = createFriendFromAgent(intent());
    const a = evolveFriendFromAgent(parent, intent('EVOLVE'), { magnitude: 0.3, salt: 'fixed' });
    const b = evolveFriendFromAgent(parent, intent('EVOLVE'), { magnitude: 0.3, salt: 'fixed' });
    expect(a.seedHash).toBe(b.seedHash);
  });
});

describe('Friend × Agent — breedFriendFromAgent', () => {
  it('inherits from both parents and applies intent overrides', () => {
    const a = createFriendFromAgent(intent());
    const b = createFriendFromAgent(intent('CREATE', [['body.bigFive.openness', 0.1]]));
    const child = breedFriendFromAgent(a, b, intent('BREED'));
    expect(child.parents?.length).toBe(2);
    expect(child.parents).toContain(a.id);
    expect(child.parents).toContain(b.id);
    expect(child.derivation?.operator).toBe('breed');
  });
});

describe('Friend × Agent — dispatcher', () => {
  it('routes CREATE → create', () => {
    const f = friendFromAgent(intent('CREATE'));
    expect(f.derivation?.operator).toBe('genesis');
  });
  it('routes EVOLVE → evolve when parent supplied', () => {
    const parent = createFriendFromAgent(intent());
    const f = friendFromAgent(intent('EVOLVE'), { parent });
    expect(f.derivation?.operator).toBe('mutate');
  });
  it('routes BREED → breed when both parents supplied', () => {
    const parent = createFriendFromAgent(intent());
    const mate = createFriendFromAgent(intent('CREATE', [['body.bigFive.openness', 0.4]]));
    const f = friendFromAgent(intent('BREED'), { parent, mate });
    expect(f.derivation?.operator).toBe('breed');
  });
});
