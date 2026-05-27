/**
 * Field stratum contract — Doctrine v2 Part VI.7.
 *
 * - Rules expressible as typed predicates.
 * - Decidability declared (decidable / semi-decidable / undecidable).
 * - Conservation laws (energy, currency, resources) declared and enforced.
 */
import { defineStratum, todoPredicate, type StratumContract } from './types';

export interface FieldArtifact {
  /** Declared decidability class. */
  readonly decidability?: 'decidable' | 'semi-decidable' | 'undecidable';
  /** Conservation laws declared (e.g., 'energy', 'mass', 'currency'). */
  readonly conservedQuantities?: ReadonlyArray<string>;
  /** Rule predicate count. */
  readonly ruleCount?: number;
}

export const fieldContract: StratumContract<FieldArtifact> = defineStratum<FieldArtifact>(
  'field',
  '0.1.0',
  [
    todoPredicate('field.rulesTyped', 'Rules are typed predicates with declared arity and domain.'),
    todoPredicate('field.decidabilityDeclared', 'Decidability class is declared and enforced.'),
    todoPredicate('field.conservation', 'Declared conserved quantities are conserved under simulation steps.'),
  ],
);
