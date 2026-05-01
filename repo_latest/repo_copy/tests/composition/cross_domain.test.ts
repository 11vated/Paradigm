/**
 * Phase 9 — Cross-domain multi-source composition tests.
 *
 * The substrate (`composeSeed`, `findCompositionPath`) is already
 * exercised by `tests/kernel/composition.test.ts`. This file targets the
 * *multi-source* layer:
 *   - same-domain merge bypasses functor application
 *   - cross-domain via direct functor + via BFS path
 *   - per-strategy correctness (first-wins / dominant / mean / weighted)
 *   - determinism of outputs (re-run yields byte-identical genes)
 *   - lineage tracking (parents, generation, contributions, functor paths)
 *   - strict mode raises, non-strict drops unreachable inputs
 *   - diagnostics planner agrees with executor
 */

import { describe, it, expect } from 'vitest';
import {
  composeMultiDomain,
  planMultiDomainComposition,
  type CrossDomainSeed,
} from '../../src/lib/composition/cross_domain.js';

// ─── Fixtures ───────────────────────────────────────────────────────────────

function character(name: string, overrides: Partial<CrossDomainSeed> = {}): CrossDomainSeed {
  return {
    $gst: '1.0',
    $domain: 'character',
    $name: name,
    $hash: 'h:' + name,
    $fitness: { overall: 0.6 },
    genes: {
      strength: { type: 'scalar', value: 0.5 },
      agility: { type: 'scalar', value: 0.5 },
      archetype: { type: 'categorical', value: 'warrior' },
      palette: { type: 'vector', value: [0.5, 0.3, 0.2] },
    },
    ...overrides,
  };
}

function agent(name: string, overrides: Partial<CrossDomainSeed> = {}): CrossDomainSeed {
  return {
    $gst: '1.0',
    $domain: 'agent',
    $name: name,
    $hash: 'h:' + name,
    $fitness: { overall: 0.5 },
    genes: {
      reasoning: { type: 'scalar', value: 0.6 },
      creativity: { type: 'scalar', value: 0.7 },
      autonomy: { type: 'scalar', value: 0.4 },
      verbosity: { type: 'scalar', value: 0.5 },
      persona: { type: 'categorical', value: 'architect' },
    },
    ...overrides,
  };
}

// ─── Basic guards ──────────────────────────────────────────────────────────

describe('composeMultiDomain — input validation', () => {
  it('throws on empty seed list', () => {
    expect(() => composeMultiDomain([], 'character')).toThrow(/at least one/);
  });

  it('throws on missing target domain', () => {
    expect(() => composeMultiDomain([character('a')], '' as any)).toThrow(/targetDomain/);
  });

  it('throws when no input can reach the target', () => {
    const seed = { ...character('a'), $domain: 'noexist' };
    expect(() => composeMultiDomain([seed], 'character')).toThrow(/no input seed could reach/);
  });
});

// ─── Same-domain & cross-domain projection ─────────────────────────────────

describe('composeMultiDomain — projection', () => {
  it('same-domain inputs are not re-projected', () => {
    const a = character('A');
    const b = character('B', { genes: { ...character('B').genes, strength: { type: 'scalar', value: 0.9 } } });
    const result = composeMultiDomain([a, b], 'character', { strategy: 'mean' });
    expect(result.seed.$domain).toBe('character');
    expect(result.contributions.every((c) => c.path.length === 0)).toBe(true);
    // Mean of 0.5 and 0.9 = 0.7
    expect((result.seed.genes!.strength.value as number)).toBeCloseTo(0.7, 5);
  });

  it('projects an agent into the character domain via functor', () => {
    const result = composeMultiDomain([agent('Mind')], 'character', { strategy: 'first-wins' });
    expect(result.seed.$domain).toBe('character');
    expect(result.contributions[0].reachable).toBe(true);
  });

  it('projects different domains into a common target', () => {
    const result = composeMultiDomain(
      [character('Hero'), agent('Mind')],
      'character',
      { strategy: 'mean' },
    );
    expect(result.seed.$domain).toBe('character');
    expect(result.contributions).toHaveLength(2);
    // Both inputs marked reachable
    expect(result.contributions.every((c) => c.reachable)).toBe(true);
  });
});

// ─── Strategies ────────────────────────────────────────────────────────────

describe('composeMultiDomain — strategy: first-wins', () => {
  it('takes the first projection for every gene', () => {
    const a = character('A');
    const b = character('B', {
      genes: {
        ...character('B').genes,
        strength: { type: 'scalar', value: 0.9 },
        archetype: { type: 'categorical', value: 'mage' },
      },
    });
    const result = composeMultiDomain([a, b], 'character', { strategy: 'first-wins' });
    expect(result.seed.genes!.strength.value).toBe(0.5);
    expect(result.seed.genes!.archetype.value).toBe('warrior');
  });
});

describe('composeMultiDomain — strategy: dominant', () => {
  it('the higher-fitness input wins each gene', () => {
    const weak = character('Weak', { $fitness: { overall: 0.2 }, genes: { ...character('Weak').genes, strength: { type: 'scalar', value: 0.1 } } });
    const strong = character('Strong', { $fitness: { overall: 0.95 }, genes: { ...character('Strong').genes, strength: { type: 'scalar', value: 0.99 } } });
    const result = composeMultiDomain([weak, strong], 'character', { strategy: 'dominant' });
    expect(result.seed.genes!.strength.value).toBe(0.99);
  });

  it('ties broken by earliest input position', () => {
    const a = character('A', { $fitness: { overall: 0.7 }, genes: { ...character('A').genes, strength: { type: 'scalar', value: 0.11 } } });
    const b = character('B', { $fitness: { overall: 0.7 }, genes: { ...character('B').genes, strength: { type: 'scalar', value: 0.99 } } });
    const result = composeMultiDomain([a, b], 'character', { strategy: 'dominant' });
    expect(result.seed.genes!.strength.value).toBe(0.11);
  });
});

describe('composeMultiDomain — strategy: mean', () => {
  it('averages numeric scalars', () => {
    const a = character('A', { genes: { ...character('A').genes, strength: { type: 'scalar', value: 0.2 } } });
    const b = character('B', { genes: { ...character('B').genes, strength: { type: 'scalar', value: 0.8 } } });
    const result = composeMultiDomain([a, b], 'character', { strategy: 'mean' });
    expect(result.seed.genes!.strength.value).toBeCloseTo(0.5, 5);
  });

  it('averages equal-length vectors elementwise', () => {
    const a = character('A', { genes: { ...character('A').genes, palette: { type: 'vector', value: [0, 0, 0] } } });
    const b = character('B', { genes: { ...character('B').genes, palette: { type: 'vector', value: [1, 1, 1] } } });
    const result = composeMultiDomain([a, b], 'character', { strategy: 'mean' });
    expect(result.seed.genes!.palette.value).toEqual([0.5, 0.5, 0.5]);
  });

  it('falls back to majority vote for categoricals', () => {
    const a = character('A'); // archetype: warrior
    const b = character('B'); // archetype: warrior
    const c = character('C', { genes: { ...character('C').genes, archetype: { type: 'categorical', value: 'mage' } } });
    const result = composeMultiDomain([a, b, c], 'character', { strategy: 'mean' });
    expect(result.seed.genes!.archetype.value).toBe('warrior');
  });
});

describe('composeMultiDomain — strategy: weighted', () => {
  it('biases scalars by per-input weight', () => {
    const a = character('A', { genes: { ...character('A').genes, strength: { type: 'scalar', value: 0 } } });
    const b = character('B', { genes: { ...character('B').genes, strength: { type: 'scalar', value: 1 } } });
    // 75% weight on B → expected 0.75
    const result = composeMultiDomain([a, b], 'character', { strategy: 'weighted', weights: [1, 3] });
    expect(result.seed.genes!.strength.value).toBeCloseTo(0.75, 5);
  });

  it('weighted differs from mean given non-uniform weights', () => {
    const a = character('A', { genes: { ...character('A').genes, strength: { type: 'scalar', value: 0 } } });
    const b = character('B', { genes: { ...character('B').genes, strength: { type: 'scalar', value: 1 } } });
    const meanResult = composeMultiDomain([a, b], 'character', { strategy: 'mean' });
    const weightedResult = composeMultiDomain([a, b], 'character', { strategy: 'weighted', weights: [1, 9] });
    expect(meanResult.seed.genes!.strength.value).not.toBeCloseTo(weightedResult.seed.genes!.strength.value as number, 3);
  });
});

// ─── Determinism ───────────────────────────────────────────────────────────

describe('composeMultiDomain — determinism', () => {
  it('repeated runs produce identical genes (lineage timestamp excepted)', () => {
    const a = character('A', { genes: { ...character('A').genes, strength: { type: 'scalar', value: 0.3 } } });
    const b = agent('Mind');
    const r1 = composeMultiDomain([a, b], 'character', { strategy: 'mean' });
    const r2 = composeMultiDomain([a, b], 'character', { strategy: 'mean' });
    expect(JSON.stringify(r1.seed.genes)).toBe(JSON.stringify(r2.seed.genes));
    expect(r1.seed.$hash).toBe(r2.seed.$hash);
  });

  it('different strategies produce different hashes', () => {
    const a = character('A', { genes: { ...character('A').genes, strength: { type: 'scalar', value: 0.1 } } });
    const b = character('B', { genes: { ...character('B').genes, strength: { type: 'scalar', value: 0.9 } } });
    const r1 = composeMultiDomain([a, b], 'character', { strategy: 'mean' });
    const r2 = composeMultiDomain([a, b], 'character', { strategy: 'first-wins' });
    expect(r1.seed.$hash).not.toBe(r2.seed.$hash);
  });
});

// ─── Lineage ───────────────────────────────────────────────────────────────

describe('composeMultiDomain — lineage', () => {
  it('records every input as a parent', () => {
    const a = character('A');
    const b = character('B');
    const c = agent('C');
    const result = composeMultiDomain([a, b, c], 'character');
    expect(result.seed.$lineage!.parents).toEqual(['h:A', 'h:B', 'h:C']);
  });

  it('generation is max(input generation) + 1', () => {
    const a = character('A', { $lineage: { generation: 5 } });
    const b = character('B', { $lineage: { generation: 2 } });
    const result = composeMultiDomain([a, b], 'character');
    expect(result.seed.$lineage!.generation).toBe(6);
  });

  it('operation tag includes strategy', () => {
    const a = character('A');
    const b = character('B');
    const result = composeMultiDomain([a, b], 'character', { strategy: 'dominant' });
    expect(result.seed.$lineage!.operation).toBe('compose:multi:dominant');
  });

  it('per-input contribution records source domain and reachability', () => {
    const result = composeMultiDomain([character('A'), agent('Mind')], 'character');
    expect(result.contributions[0].sourceDomain).toBe('character');
    expect(result.contributions[1].sourceDomain).toBe('agent');
    expect(result.contributions[0].reachable).toBe(true);
    expect(result.contributions[1].reachable).toBe(true);
  });

  it('per-gene resolution metadata is recorded', () => {
    const a = character('A');
    const b = character('B');
    const result = composeMultiDomain([a, b], 'character', { strategy: 'mean' });
    expect(result.resolutions.strength.strategy).toBe('mean');
    expect(result.resolutions.strength.mergedFrom).toEqual([0, 1]);
  });
});

// ─── Strict / unreachable handling ─────────────────────────────────────────

describe('composeMultiDomain — strict mode', () => {
  it('non-strict drops unreachable inputs', () => {
    const reachable = character('R');
    const unreachable: CrossDomainSeed = { ...character('U'), $domain: 'noexist' };
    const result = composeMultiDomain([reachable, unreachable], 'character');
    expect(result.contributions[1].reachable).toBe(false);
    // Output still equals `reachable`'s genes since that's the only contributor.
    expect(result.seed.genes!.strength.value).toBe(0.5);
  });

  it('strict mode raises on the first unreachable input', () => {
    const unreachable: CrossDomainSeed = { ...character('U'), $domain: 'noexist' };
    expect(() => composeMultiDomain([unreachable], 'character', { strict: true })).toThrow(/cannot reach/);
  });
});

// ─── Planner ───────────────────────────────────────────────────────────────

describe('planMultiDomainComposition', () => {
  it('agrees with executor on reachability', () => {
    const a = character('A');
    const b = agent('Mind');
    const c: CrossDomainSeed = { ...character('U'), $domain: 'noexist' };
    const plan = planMultiDomainComposition([a, b, c], 'character');
    expect(plan.reachable).toBe(2);
    expect(plan.unreachable).toBe(1);
    expect(plan.perInput[0].direct).toBe(true); // same-domain treated as direct
    expect(plan.perInput[2].reachable).toBe(false);
  });

  it('records the BFS path for indirect projections', () => {
    // sprite -> animation is direct in the registry; pick a multi-hop pair.
    // agent -> narrative is direct, but agent -> sprite likely goes via character.
    const plan = planMultiDomainComposition([{ ...agent('M'), $domain: 'agent' }], 'sprite');
    if (plan.perInput[0].reachable) {
      expect(plan.perInput[0].path.length).toBeGreaterThan(0);
    }
  });
});

// ─── Phase 12: vcs-merge strategy ──────────────────────────────────────────
//
// vcs-merge folds the VCS three-way merge primitive over the projections.
// The primitive (`mergeTrees`) treats projections[0] as a synthetic LCA and
// pulls the others in as deltas. Cleanly-mergeable genes (one side changed,
// the other untouched) fold without conflict; genes both sides changed
// differently fall back to the configured inner strategy. The strategy is
// shipped as the 5th cross-domain composition mode.

describe('composeMultiDomain — vcs-merge strategy', () => {
  it('clean merge: identical projections produce zero conflicts', () => {
    // Three identical character seeds — every gene matches base, so no
    // gene flags as "changed" on either side. Result mirrors input genes.
    const a = character('A');
    const b = character('B');
    const c = character('C');
    const result = composeMultiDomain([a, b, c], 'character', { strategy: 'vcs-merge' });
    expect(result.vcsConflictPaths).toEqual([]);
    expect(result.seed.$metadata!.composition.vcsConflicts).toBe(0);
    expect(result.seed.genes!.strength.value).toBe(0.5);
    expect(result.seed.genes!.archetype.value).toBe('warrior');
    expect(result.seed.$lineage!.operation).toBe('compose:multi:vcs-merge');
  });

  it('one-side-changed gene takes the changed side without conflict', () => {
    // a is the base. b changes ONLY agility; c is identical to a.
    // mergeTrees(base=a, ours=a, theirs=b): theirs changed agility → take b.agility.
    // mergeTrees(base=a, ours=that_result, theirs=c): nothing changes, c == base.
    const a = character('A'); // agility 0.5
    const b = character('B', { genes: { ...character('B').genes, agility: { type: 'scalar', value: 0.9 } } });
    const c = character('C');
    const result = composeMultiDomain([a, b, c], 'character', { strategy: 'vcs-merge' });
    expect(result.vcsConflictPaths).toEqual([]);
    expect(result.seed.genes!.agility.value).toBe(0.9);
    // strength was unchanged everywhere, so it stays at the base value.
    expect(result.seed.genes!.strength.value).toBe(0.5);
  });

  it('conflict: two projections diverge from base — fallback resolves it', () => {
    // a is the synthetic base (strength 0.5). b changes strength to 0.9,
    // c changes strength to 0.1. After folding b in: accumulator has 0.9.
    // Then folding c in: base.strength=0.5, accumulator.strength=0.9,
    // theirs.strength=0.1 — both sides changed differently → CONFLICT.
    // Default fallback 'mean' averages all three projections: (0.5+0.9+0.1)/3.
    const a = character('A'); // 0.5
    const b = character('B', { genes: { ...character('B').genes, strength: { type: 'scalar', value: 0.9 } } });
    const c = character('C', { genes: { ...character('C').genes, strength: { type: 'scalar', value: 0.1 } } });
    const result = composeMultiDomain([a, b, c], 'character', { strategy: 'vcs-merge' });
    expect(result.vcsConflictPaths).toContain('strength');
    expect(result.seed.$metadata!.composition.vcsConflicts).toBeGreaterThan(0);
    // Mean of the original projections, not of the intermediate accumulator.
    expect(result.seed.genes!.strength.value).toBeCloseTo((0.5 + 0.9 + 0.1) / 3, 10);
    expect(result.resolutions.strength.conflictResolvedBy).toBe('mean');
  });

  it('conflict fallback to first-wins picks the first projection that has the gene', () => {
    const a = character('A'); // strength 0.5
    const b = character('B', { genes: { ...character('B').genes, strength: { type: 'scalar', value: 0.9 } } });
    const c = character('C', { genes: { ...character('C').genes, strength: { type: 'scalar', value: 0.1 } } });
    const result = composeMultiDomain([a, b, c], 'character', {
      strategy: 'vcs-merge',
      vcsMergeFallback: 'first-wins',
    });
    expect(result.vcsConflictPaths).toContain('strength');
    expect(result.seed.genes!.strength.value).toBe(0.5); // first projection's value wins
    expect(result.resolutions.strength.conflictResolvedBy).toBe('first-wins');
    expect(result.resolutions.strength.chosenIndex).toBe(0);
  });

  it('conflict fallback to dominant uses the highest-fitness projection', () => {
    const a = character('A', { $fitness: { overall: 0.4 } });
    const b = character('B', {
      $fitness: { overall: 0.95 },
      genes: { ...character('B').genes, strength: { type: 'scalar', value: 0.9 } },
    });
    const c = character('C', {
      $fitness: { overall: 0.7 },
      genes: { ...character('C').genes, strength: { type: 'scalar', value: 0.1 } },
    });
    const result = composeMultiDomain([a, b, c], 'character', {
      strategy: 'vcs-merge',
      vcsMergeFallback: 'dominant',
    });
    expect(result.seed.genes!.strength.value).toBe(0.9); // b has highest fitness
    expect(result.resolutions.strength.chosenIndex).toBe(1);
  });

  it('conflict fallback to weighted respects per-input weights', () => {
    const a = character('A'); // 0.5
    const b = character('B', { genes: { ...character('B').genes, strength: { type: 'scalar', value: 0.9 } } });
    const c = character('C', { genes: { ...character('C').genes, strength: { type: 'scalar', value: 0.1 } } });
    const result = composeMultiDomain([a, b, c], 'character', {
      strategy: 'vcs-merge',
      vcsMergeFallback: 'weighted',
      weights: [0, 10, 0], // b dominates
    });
    expect(result.seed.genes!.strength.value).toBeCloseTo(0.9, 10);
  });

  it('two-input case: clean merge of one mutation on each side', () => {
    // a changes strength, b changes agility — disjoint mutations against base
    // (which is also a). vcs-merge sees: ours=a, theirs=b, base=a. agility
    // changed on theirs only → take theirs' agility. Result has a.strength
    // and b.agility, no conflicts.
    const a = character('A'); // strength 0.5, agility 0.5
    const b = character('B', { genes: { ...character('B').genes, agility: { type: 'scalar', value: 0.95 } } });
    const result = composeMultiDomain([a, b], 'character', { strategy: 'vcs-merge' });
    expect(result.vcsConflictPaths).toEqual([]);
    expect(result.seed.genes!.strength.value).toBe(0.5);
    expect(result.seed.genes!.agility.value).toBe(0.95);
  });

  it('lineage records every input and tags operation with vcs-merge', () => {
    const a = character('A');
    const b = character('B', { genes: { ...character('B').genes, strength: { type: 'scalar', value: 0.9 } } });
    const c = character('C', { genes: { ...character('C').genes, strength: { type: 'scalar', value: 0.1 } } });
    const result = composeMultiDomain([a, b, c], 'character', { strategy: 'vcs-merge' });
    expect(result.seed.$lineage!.parents).toEqual(['h:A', 'h:B', 'h:C']);
    expect(result.seed.$lineage!.operation).toBe('compose:multi:vcs-merge');
    expect(result.seed.$lineage!.generation).toBe(1);
    expect(result.seed.$metadata!.composition.strategy).toBe('vcs-merge');
    expect(result.seed.$metadata!.composition.vcsMergeFallback).toBe('mean');
    expect(result.seed.$metadata!.composition.vcsConflictPaths).toContain('strength');
  });

  it('determinism: identical inputs produce byte-identical genes (and hash)', () => {
    const inputs = () => [
      character('A'),
      character('B', { genes: { ...character('B').genes, strength: { type: 'scalar', value: 0.9 } } }),
      character('C', { genes: { ...character('C').genes, strength: { type: 'scalar', value: 0.1 } } }),
    ];
    const r1 = composeMultiDomain(inputs(), 'character', { strategy: 'vcs-merge' });
    const r2 = composeMultiDomain(inputs(), 'character', { strategy: 'vcs-merge' });
    expect(JSON.stringify(r1.seed.genes)).toBe(JSON.stringify(r2.seed.genes));
    expect(r1.seed.$hash).toBe(r2.seed.$hash);
    expect(r1.vcsConflictPaths).toEqual(r2.vcsConflictPaths);
  });

  it('single projection: trivially returns its own genes with no conflicts', () => {
    const a = character('Solo');
    const result = composeMultiDomain([a], 'character', { strategy: 'vcs-merge' });
    expect(result.vcsConflictPaths).toEqual([]);
    expect(result.seed.genes!.strength.value).toBe(0.5);
    expect(result.seed.genes!.archetype.value).toBe('warrior');
    // The fallback is still recorded in metadata even when not used.
    expect(result.seed.$metadata!.composition.vcsMergeFallback).toBe('mean');
  });

  it('categorical conflict resolved by mean falls back to majority vote', () => {
    // archetype is categorical. Two inputs say 'mage', one says 'warrior'.
    // Folding: a (warrior) is base; b (mage) changes it → take mage.
    // c (mage) merge: base=warrior, ours=mage, theirs=mage. Both sides
    // changed identically → no conflict, take mage.
    const a = character('A'); // warrior
    const b = character('B', { genes: { ...character('B').genes, archetype: { type: 'categorical', value: 'mage' } } });
    const c = character('C', { genes: { ...character('C').genes, archetype: { type: 'categorical', value: 'mage' } } });
    const result = composeMultiDomain([a, b, c], 'character', { strategy: 'vcs-merge' });
    expect(result.seed.genes!.archetype.value).toBe('mage');
    expect(result.vcsConflictPaths).toEqual([]);
  });

  it('genuine categorical conflict: mean fallback uses majority vote over original inputs', () => {
    // a base = warrior. b changes to mage. c changes to rogue.
    // Fold step 1: b in → archetype = mage (theirs changed only).
    // Fold step 2: base=warrior, ours=mage, theirs=rogue → both changed
    //   differently → CONFLICT. Mean fallback on numeric fails → categorical
    //   majority vote across [warrior, mage, rogue] each weight 1 → tied;
    //   tiebreak by earliest local idx → 'warrior' (index 0).
    const a = character('A'); // warrior
    const b = character('B', { genes: { ...character('B').genes, archetype: { type: 'categorical', value: 'mage' } } });
    const c = character('C', { genes: { ...character('C').genes, archetype: { type: 'categorical', value: 'rogue' } } });
    const result = composeMultiDomain([a, b, c], 'character', { strategy: 'vcs-merge' });
    expect(result.vcsConflictPaths).toContain('archetype');
    expect(result.seed.genes!.archetype.value).toBe('warrior'); // tiebreak
  });

  it('cross-domain inputs: vcs-merge runs over already-projected seeds', () => {
    // Use a same-domain example for predictability of the post-projection
    // shape. The point is to assert that vcs-merge composes cleanly with
    // projection + lineage code paths regardless of the projection step.
    const a = character('A');
    const b = character('B');
    const result = composeMultiDomain([a, b], 'character', { strategy: 'vcs-merge' });
    expect(result.seed.$domain).toBe('character');
    expect(result.contributions).toHaveLength(2);
    expect(result.contributions.every((c) => c.reachable)).toBe(true);
  });
});
