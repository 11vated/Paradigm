/**
 * Paradigm Infinite — Contracts Barrel
 * This is the single import point for all engineering-grade domain contracts.
 */

export * from './quality-contract';
export * from './strata/types';

// Domain contracts (engineering grade)
export * from './domains/character';
export * from './domains/music';
export * from './domains/fullgame';
export * from './domains/narrative';
export * from './domains/visual2d';
export * from './domains/geometry3d';
export * from './domains/animation';
export * from './domains/shader';
export * from './domains/agent';
export * from './domains/procedural';
export * from './domains/physics';
export * from './domains/ecosystem';
export * from './domains/game';
export * from './domains/alife';
export * from './domains/particle';
export * from './domains/typography';
export * from './domains/architecture';
export * from './domains/vehicle';
export * from './domains/furniture';
export * from './domains/fashion';
export * from './domains/robotics';
export * from './domains/circuit';
export * from './domains/food';
export * from './domains/choreography';
export * from './domains/audio';
export * from './domains/ui';
export * from './domains/sprite';

// Central registry
export * from './domain-registry';

// Part 6 cross-cutting
export * from './physical/bridge';
export * from './physical/full-bridge';
export * from './os-shell/hooks';
export * from './os-shell/recursive-closure';
export * from './manifest-27';
export * from './bootstrap';
export * from './economics/lineage-royalties';
export * from './economics/dividends';
export * from './economics/full-economics';
export * from './federation/signed-exchange';
export * from './federation/protocol';
export * from './os-shell/cli';
export * from './os-shell/full-cli';
export * from './governance/canon-stewardship';
export * from './governance/hooks';
export * from './physical/advanced-bridge';
export * from './physical/complete-bridge';
export * from './physical/materials';
export * from './physical/validation';
export * from './physical/full-validation';
export * from './os-shell/commands';
export * from './os-shell/full-command-set';
export * from './physical/validation';
export * from './os-shell/commands';
export * from './os-shell/command-router';
export * from './os-shell/full-implementation';

// (Remaining 24 domains will be added autonomously in subsequent waves)
