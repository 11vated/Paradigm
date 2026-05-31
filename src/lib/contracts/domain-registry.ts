/**
 * Paradigm Infinite — Domain Contract Registry
 * 
 * Central discovery point for all engineering-grade domain contracts.
 * This allows the kernel, engines, health surfaces, and agent system to use contracts uniformly.
 */

import { QualityContract } from './quality-contract';
import { characterContract } from './domains/character';
import { musicContract } from './domains/music';
import { fullGameContract } from './domains/fullgame';
import { narrativeContract } from './domains/narrative';
import { visual2DContract } from './domains/visual2d';
import { geometry3DContract } from './domains/geometry3d';
import { animationContract } from './domains/animation';
import { shaderContract } from './domains/shader';
import { agentContract } from './domains/agent';
import { proceduralContract } from './domains/procedural';
import { physicsContract } from './domains/physics';
import { ecosystemContract } from './domains/ecosystem';
import { gameMechanicsContract } from './domains/game';
import { alifeContract } from './domains/alife';
import { particleContract } from './domains/particle';
import { typographyContract } from './domains/typography';
import { architectureContract } from './domains/architecture';
import { vehicleContract } from './domains/vehicle';
import { furnitureContract } from './domains/furniture';
import { fashionContract } from './domains/fashion';
import { roboticsContract } from './domains/robotics';
import { circuitContract } from './domains/circuit';
import { foodContract } from './domains/food';
import { choreographyContract } from './domains/choreography';
import { audioContract } from './domains/audio';
import { uiContract } from './domains/ui';
import { spriteContract } from './domains/sprite';

export const ALL_DOMAIN_CONTRACTS: QualityContract<any, any>[] = [
  // Full 27 engineering-grade contracts (15_ spec)
  characterContract,
  spriteContract,
  musicContract,
  visual2DContract,
  proceduralContract,
  fullGameContract,
  animationContract,
  geometry3DContract,
  narrativeContract,
  uiContract,
  physicsContract,
  audioContract,
  ecosystemContract,
  gameMechanicsContract,
  alifeContract,
  shaderContract,
  particleContract,
  typographyContract,
  architectureContract,
  vehicleContract,
  furnitureContract,
  fashionContract,
  roboticsContract,
  circuitContract,
  foodContract,
  choreographyContract,
  agentContract,
];

export function getContractByDomain(domain: string) {
  return ALL_DOMAIN_CONTRACTS.find(c => c.domain === domain);
}

export function getAllDomains(): string[] {
  return ALL_DOMAIN_CONTRACTS.map(c => c.domain);
}

export function getContractsByStratum(stratum: string) {
  return ALL_DOMAIN_CONTRACTS.filter(c => c.strata.includes(stratum as any));
}
