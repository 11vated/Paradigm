/**
 * QFT → Game Engine Integration
 * Gap 9: Connects physics solvers (QFT) to game engines
 * 
 * Maps QFT simulation outputs to game physics for realistic simulations
 */

import type { Seed, Artifact } from '../kernel/types';

export interface PhysicsConfig {
  gravity: number;
  friction: number;
  restitution: number;
  airResistance: number;
}

export interface QFTGameConfig {
  simulationType: 'rigid_body' | 'particle' | 'fluid' | 'quantum';
  solver: 'em' | 'dirac' | 'gravity';
  parameters: PhysicsConfig;
}

const QFT_TO_GAME_MAPPING: Record<string, (seed: Seed) => PhysicsConfig> = {
  character: (seed) => ({
    gravity: seed.genes?.gravity?.value ?? 0.5,
    friction: seed.genes?.friction?.value ?? 0.3,
    restitution: seed.genes?.bounciness?.value ?? 0.5,
    airResistance: 0.01
  }),
  game: (seed) => ({
    gravity: seed.genes?.gravity?.value ?? 0.5,
    friction: seed.genes?.surface_friction?.value ?? 0.5,
    restitution: seed.genes?.bounce?.value ?? 0.5,
    airResistance: seed.genes?.air_density?.value ?? 0.01
  }),
  physics: (seed) => ({
    gravity: seed.genes?.gravity?.value ?? 0.5,
    friction: seed.genes?.coefficient?.value ?? 0.3,
    restitution: seed.genes?.restitution?.value ?? 0.5,
    airResistance: seed.genes?.drag?.value ?? 0.01
  }),
  particle: (seed) => ({
    gravity: (seed.genes?.mass?.value ?? 1) * 9.8,
    friction: 0,
    restitution: seed.genes?.elasticity?.value ?? 0.8,
    airResistance: seed.genes?.viscosity?.value ?? 0.1
  })
};

export function extractPhysicsFromSeed(seed: Seed): PhysicsConfig {
  const domain = seed.$domain || 'character';
  const mapper = QFT_TO_GAME_MAPPING[domain] || QFT_TO_GAME_MAPPING.character;
  return mapper(seed);
}

export function createPhysicsConfig(seed: Seed): QFTGameConfig {
  const domain = seed.$domain || 'character';
  const params = extractPhysicsFromSeed(seed);
  
  let simulationType: QFTGameConfig['simulationType'] = 'rigid_body';
  let solver: QFTGameConfig['solver'] = 'em';
  
  if (domain === 'particle') {
    simulationType = 'particle';
    solver = 'gravity';
  } else if (domain === 'physics') {
    const simType = seed.genes?.simulation_type?.value;
    if (simType === 'quantum') {
      simulationType = 'quantum';
      solver = 'dirac';
    }
  }
  
  return {
    simulationType,
    solver,
    parameters: params
  };
}

export function applyPhysicsToArtifact(
  artifact: Artifact,
  seed: Seed
): Artifact {
  const physics = createPhysicsConfig(seed);
  
  return {
    ...artifact,
    physics: {
      type: physics.simulationType,
      solver: physics.solver,
      gravity: physics.parameters.gravity,
      friction: physics.parameters.friction,
      restitution: physics.parameters.restitution,
      airResistance: physics.parameters.airResistance
    }
  };
}

export const QFT_PHYSICS_DEFAULTS: Record<string, PhysicsConfig> = {
  earth: { gravity: 9.8, friction: 0.3, restitution: 0.5, airResistance: 0.01 },
  moon: { gravity: 1.6, friction: 0.2, restitution: 0.5, airResistance: 0 },
  mars: { gravity: 3.7, friction: 0.4, restitution: 0.4, airResistance: 0.01 },
  space: { gravity: 0, friction: 0, restitution: 1, airResistance: 0 },
  water: { gravity: 9.8, friction: 0.05, restitution: 0.2, airResistance: 0.1 },
  quantum: { gravity: 0, friction: 0, restitution: 0.8, airResistance: 0 }
};

export function setEnvironment(seed: Seed, environment: string): PhysicsConfig {
  const preset = QFT_PHYSICS_DEFAULTS[environment] || QFT_PHYSICS_DEFAULTS.earth;
  
  seed.genes = {
    ...seed.genes,
    environment: { type: 'string', value: environment },
    gravity: { type: 'scalar', value: preset.gravity / 9.8 }
  };
  
  return preset;
}