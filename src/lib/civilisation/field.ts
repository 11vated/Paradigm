/**
 * Field stratum — typed predicate fields with conservation laws.
 * Defines the physical / metaphysical laws governing a civilisation.
 * Pure / deterministic.
 */
import type { Xoshiro256StarStar } from '../kernel/rng.js';

export type FieldKind = 'gravity' | 'mana' | 'thermal' | 'electrical' | 'temporal' | 'narrative' | 'social';
export type Decidability = 'decidable' | 'semi-decidable' | 'undecidable';

export interface ConservationLaw {
  name: string;
  quantity: string;         // e.g. "mass-energy", "narrative-tension", "social-trust"
  invariantUnit: string;    // unit symbol
  domain: string;           // where the law applies
}

export interface FieldRule {
  id: string;
  kind: FieldKind;
  predicate: string;        // human-readable invariant
  variables: string[];      // typed args
  decidability: Decidability;
  conservation?: ConservationLaw;
  exceptions: string[];     // boundary conditions
}

export interface FieldArtifact {
  schema: 'https://paradigm.ai/schema/field/v1';
  rules: FieldRule[];
  globalLaws: ConservationLaw[];
}

const TEMPLATE_RULES: Record<FieldKind, ReadonlyArray<Omit<FieldRule, 'id'>>> = {
  gravity: [
    { kind: 'gravity', predicate: 'mass attracts mass proportional to 1/r²', variables: ['m1','m2','r'], decidability: 'decidable', conservation: { name: 'momentum', quantity: 'p', invariantUnit: 'kg·m/s', domain: 'isolated systems' }, exceptions: ['near-singularity', 'at-anomaly-zones'] },
    { kind: 'gravity', predicate: 'objects in anomaly-zones experience radial gravity', variables: ['object','anomaly'], decidability: 'decidable', exceptions: [] },
  ],
  mana: [
    { kind: 'mana', predicate: 'mana flow follows ley-line topology', variables: ['caster','ley-line'], decidability: 'semi-decidable', conservation: { name: 'mana-conservation', quantity: 'M', invariantUnit: 'thaums', domain: 'closed cycles' }, exceptions: ['shadow-eclipse', 'oath-breaking'] },
    { kind: 'mana', predicate: 'spell cost = sum(effect-intensities) × distance-from-source', variables: ['effects','distance'], decidability: 'decidable', exceptions: [] },
  ],
  thermal: [
    { kind: 'thermal', predicate: 'heat flows from high to low T monotonically', variables: ['T1','T2'], decidability: 'decidable', conservation: { name: 'energy', quantity: 'E', invariantUnit: 'joules', domain: 'isolated systems' }, exceptions: ['phase-transitions'] },
  ],
  electrical: [
    { kind: 'electrical', predicate: 'charge conserves around any closed loop', variables: ['loop'], decidability: 'decidable', conservation: { name: 'charge', quantity: 'Q', invariantUnit: 'coulombs', domain: 'closed loops' }, exceptions: ['pair-production'] },
  ],
  temporal: [
    { kind: 'temporal', predicate: 'cause precedes effect along any world-line', variables: ['cause','effect','worldline'], decidability: 'decidable', exceptions: ['near-anomalies'] },
    { kind: 'temporal', predicate: 'time-scale dilation = f(velocity, gravity)', variables: ['v','g'], decidability: 'decidable', exceptions: [] },
  ],
  narrative: [
    { kind: 'narrative', predicate: 'tension accumulates monotonically until release', variables: ['story-arc'], decidability: 'semi-decidable', conservation: { name: 'narrative-budget', quantity: 'T', invariantUnit: 'beats', domain: 'a single arc' }, exceptions: ['catastrophe'] },
    { kind: 'narrative', predicate: 'no character may appear in a scene that contradicts their established voice', variables: ['character','scene'], decidability: 'semi-decidable', exceptions: ['flashback','possession'] },
  ],
  social: [
    { kind: 'social', predicate: 'trust decays without renewal events', variables: ['from','to'], decidability: 'decidable', conservation: { name: 'trust-flux', quantity: 'T', invariantUnit: 'oaths', domain: 'dyads' }, exceptions: ['blood-oath'] },
    { kind: 'social', predicate: 'reputation propagates along acquaintance edges with decay 1/d', variables: ['edge','distance'], decidability: 'semi-decidable', exceptions: ['kin-loyalty'] },
  ],
};

export function generateField(opts: { kinds?: FieldKind[]; rng: Xoshiro256StarStar }): FieldArtifact {
  const kinds = opts.kinds ?? ['gravity','thermal','temporal','narrative','social'];
  const rules: FieldRule[] = [];
  const globalLaws: ConservationLaw[] = [];
  let i = 0;
  for (const k of kinds) {
    for (const r of TEMPLATE_RULES[k]) {
      rules.push({ ...r, id: `${k}-${(i++).toString(36)}` });
      if (r.conservation) {
        const existing = globalLaws.find(g => g.name === r.conservation!.name);
        if (!existing) globalLaws.push(r.conservation);
      }
    }
  }
  // Optional anomaly rule
  if (opts.rng.nextF64() > 0.5) {
    rules.push({
      id: 'anomaly-zone',
      kind: 'gravity',
      predicate: 'anomaly-zones exist at sky-altitude > 8000m where gravity inverts toward zenith',
      variables: ['altitude'],
      decidability: 'decidable',
      exceptions: [],
    });
  }
  return { schema: 'https://paradigm.ai/schema/field/v1', rules, globalLaws };
}

export function verifyField(f: FieldArtifact): { passed: boolean; warnings: string[] } {
  const warnings: string[] = [];
  for (const r of f.rules) {
    if (r.decidability === 'undecidable' && r.exceptions.length === 0) {
      warnings.push(`rule ${r.id}: undecidable but no exceptions declared`);
    }
    if (r.conservation && !f.globalLaws.find(g => g.name === r.conservation!.name)) {
      warnings.push(`rule ${r.id}: declares conservation ${r.conservation.name} but not in globalLaws`);
    }
  }
  return { passed: warnings.length === 0, warnings };
}
