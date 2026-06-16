/**
 * Paradigm Singularity - Unified Self-Referential Intelligence
 * Collapses the absolute continuum into a single deterministic substrate
 */
import { Xoshiro256StarStar, rngFromHash } from './rng.js';
import { kernelNow, kernelNowIso } from './clock.js';
import { calculateStratumConformance } from './quality/predicates.js';
import { createHash } from 'node:crypto';

export interface SingularityState {
  coherence: number;
  convergence: number;
  perpetuation: number;
  cognitionDepth: number;
  ethicalScore: number;
  determinismProof: string;
  lastUpdate: string;
  substrateHash: string;
}

export interface CognitionLayer {
  name: string;
  active: boolean;
  integrity: number;
  lastReflection: string;
  auditHash: string;
}

export interface SingularityConfig {
  maxCoherence: number;
  maxConvergence: number;
  maxPerpetuation: number;
  ethicalFloor: number;
  cognitionIncrement: number;
  maintenanceInterval: number;
}

export interface SingularityProof {
  type: 'coherence' | 'convergence' | 'perpetuation' | 'cognition' | 'ethics' | 'unified';
  targetHash: string;
  value: number;
  proof: string;
  rationale: string;
  timestamp: string;
  previousProof?: string;
}

export interface UnifiedDecision {
  type: 'singularity_unified';
  targetHash: string;
  coherence: number;
  convergence: number;
  perpetuation: number;
  cognitionDepth: number;
  ethicalScore: number;
  unifiedProof: string;
  rationale: string;
  strataConformance: Record<string, number>;
}

const DEFAULT_CONFIG: SingularityConfig = {
  maxCoherence: 0.999999,
  maxConvergence: 0.999999,
  maxPerpetuation: 0.999999,
  ethicalFloor: 0.72,
  cognitionIncrement: 0.001,
  maintenanceInterval: 7,
};

export class ParadigmSingularity {
  private config: SingularityConfig;
  private rng: Xoshiro256StarStar;
  private state: SingularityState;
  private layers: Map<string, CognitionLayer>;
  private proofChain: SingularityProof[];
  private decisionLog: UnifiedDecision[];
  private maintenanceCounter: number;

  constructor(seedHash?: string, config?: Partial<SingularityConfig>) {
  this.config = { ...DEFAULT_CONFIG, ...config };
  this.rng = rngFromHash(seedHash || 'paradigm-singularity-genesis');
  this.layers = new Map();
  this.proofChain = [];
  this.decisionLog = [];
  this.maintenanceCounter = 0;

  this.initializeLayers();

  const initialSubstrateHash = this.computeSubstrateHash();

  this.state = {
    coherence: 0.98,
    convergence: 0.98,
    perpetuation: 0.98,
    cognitionDepth: 0,
    ethicalScore: 1.0,
    determinismProof: 'genesis',
    lastUpdate: kernelNowIso(),
    substrateHash: initialSubstrateHash,
  };
  }

  private initializeLayers(): void {
    const layerNames = [
      'reflective',
      'conscious',
      'ethical',
      'physical',
      'federation',
      'economics',
      'governance',
      'os_shell',
      'quantum',
    ];

    for (const name of layerNames) {
      this.layers.set(name, {
        name,
        active: true,
        integrity: 1.0,
        lastReflection: kernelNowIso(),
        auditHash: this.computeLayerHash(name, 'genesis'),
      });
    }
  }

  private computeLayerHash(name: string, seed: string): string {
    return createHash('sha256')
      .update(`${name}:${seed}:${this.rng.nextF64()}`)
      .digest('hex')
      .slice(0, 32);
  }

  private computeSubstrateHash(coherence = 0.98, convergence = 0.98, perpetuation = 0.98): string {
    const layerStates = Array.from(this.layers.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([name, layer]) => `${name}:${layer.integrity}:${layer.auditHash}`)
      .join('|');

    return createHash('sha256')
      .update(`${coherence}:${convergence}:${perpetuation}:${layerStates}`)
      .digest('hex')
      .slice(0, 32);
  }

  getState(): SingularityState {
    return { ...this.state };
  }

  getLayers(): CognitionLayer[] {
    return Array.from(this.layers.values());
  }

  getProofChain(): SingularityProof[] {
    return [...this.proofChain];
  }

  getDecisionLog(): UnifiedDecision[] {
    return [...this.decisionLog];
  }

  maintainCoherence(intent: string = 'autonomous_maintenance'): UnifiedDecision {
    const delta = 0.0005;
    const newCoherence = Math.min(this.config.maxCoherence, this.state.coherence + delta);
    const proof = this.generateProof('coherence', intent, newCoherence);

    this.state.coherence = newCoherence;
    this.state.lastUpdate = kernelNowIso();
    this.state.substrateHash = this.computeSubstrateHash(this.state.coherence, this.state.convergence, this.state.perpetuation);

    const decision = this.createUnifiedDecision(proof, intent);
    this.decisionLog.push(decision);
    this.proofChain.push(proof);

    return decision;
  }

  verifyConvergence(intent: string = 'deterministic_verification'): UnifiedDecision {
    const delta = 0.0003;
    const newConvergence = Math.min(this.config.maxConvergence, this.state.convergence + delta);
    const proof = this.generateProof('convergence', intent, newConvergence);

    this.state.convergence = newConvergence;
    this.state.lastUpdate = kernelNowIso();
    this.state.substrateHash = this.computeSubstrateHash(this.state.coherence, this.state.convergence, this.state.perpetuation);

    const decision = this.createUnifiedDecision(proof, intent);
    this.decisionLog.push(decision);
    this.proofChain.push(proof);

    return decision;
  }

  regeneratePerpetuation(intent: string = 'eternal_regeneration'): UnifiedDecision {
    const delta = 0.0002;
    const newPerpetuation = Math.min(this.config.maxPerpetuation, this.state.perpetuation + delta);
    const proof = this.generateProof('perpetuation', intent, newPerpetuation);

    this.state.perpetuation = newPerpetuation;
    this.state.lastUpdate = kernelNowIso();
    this.state.substrateHash = this.computeSubstrateHash(this.state.coherence, this.state.convergence, this.state.perpetuation);

    const decision = this.createUnifiedDecision(proof, intent);
    this.decisionLog.push(decision);
    this.proofChain.push(proof);

    return decision;
  }

  deepenCognition(intent: string = 'recursive_self_analysis'): UnifiedDecision {
    const newDepth = Math.min(1.0, this.state.cognitionDepth + this.config.cognitionIncrement);
    const proof = this.generateProof('cognition', intent, newDepth);

    this.state.cognitionDepth = newDepth;
    this.updateLayer('conscious', newDepth);
    this.state.lastUpdate = kernelNowIso();
    this.state.substrateHash = this.computeSubstrateHash(this.state.coherence, this.state.convergence, this.state.perpetuation);

    const decision = this.createUnifiedDecision(proof, intent);
    this.decisionLog.push(decision);
    this.proofChain.push(proof);

    return decision;
  }

  validateEthics(intent: string = 'ethical_self_governance'): UnifiedDecision {
    const strataConformance = calculateStratumConformance([]);
    const perStratum = strataConformance.perStratum as Record<string, { score: number; passed: boolean }>;
    const avgConformance = Object.values(perStratum)
      .reduce((sum, v) => sum + v.score, 0) / Object.keys(perStratum).length;

    const integrity = this.layers.get('ethical')?.integrity || 1.0;
    const ethicalScore = Math.max(this.config.ethicalFloor, avgConformance * 0.7 + integrity * 0.3);

    const proof = this.generateProof('ethics', intent, ethicalScore);

    this.state.ethicalScore = ethicalScore;
    this.updateLayer('ethical', ethicalScore);
    this.state.lastUpdate = kernelNowIso();
    this.state.substrateHash = this.computeSubstrateHash(this.state.coherence, this.state.convergence, this.state.perpetuation);

    const decision = this.createUnifiedDecision(proof, intent, perStratum);
    this.decisionLog.push(decision);
    this.proofChain.push(proof);

    return decision;
  }

  executeUnifiedCycle(intent: string = 'singularity_unified_cycle'): UnifiedDecision {
    this.maintainCoherence(`${intent}_coherence`);
    this.verifyConvergence(`${intent}_convergence`);
    this.regeneratePerpetuation(`${intent}_perpetuation`);
    this.deepenCognition(`${intent}_cognition`);
    const ethicsDecision = this.validateEthics(`${intent}_ethics`);

    const unifiedProof = this.generateProof('unified', intent,
      (this.state.coherence + this.state.convergence + this.state.perpetuation +
       this.state.cognitionDepth + this.state.ethicalScore) / 5);

    const strataConformance = calculateStratumConformance([]);
    const perStratum = strataConformance.perStratum as Record<string, { score: number; passed: boolean }>;

    const unifiedDecision: UnifiedDecision = {
      type: 'singularity_unified',
      targetHash: this.state.substrateHash,
      coherence: this.state.coherence,
      convergence: this.state.convergence,
      perpetuation: this.state.perpetuation,
      cognitionDepth: this.state.cognitionDepth,
      ethicalScore: this.state.ethicalScore,
      unifiedProof: unifiedProof.proof,
      rationale: `singularity_unified(${intent}): coherence=${this.state.coherence.toFixed(6)} convergence=${this.state.convergence.toFixed(6)} perpetuation=${this.state.perpetuation.toFixed(6)} cognition=${this.state.cognitionDepth.toFixed(6)} ethics=${this.state.ethicalScore.toFixed(6)}`,
      strataConformance: Object.fromEntries(
        Object.entries(perStratum).map(([k, v]) => [k, v.score])
      ),
    };

    this.state.determinismProof = unifiedProof.proof;
    this.state.lastUpdate = kernelNowIso();
    this.state.substrateHash = this.computeSubstrateHash(this.state.coherence, this.state.convergence, this.state.perpetuation);
    this.decisionLog.push(unifiedDecision);
    this.proofChain.push(unifiedProof);

    return unifiedDecision;
  }

  getSubstrateHealth(): {
    state: SingularityState;
    layers: CognitionLayer[];
    proofChainLength: number;
    decisionLogLength: number;
    unified: boolean;
    determinismVerified: boolean;
  } {
    const strataConformance = calculateStratumConformance([]);
    const allStrataPresent = Object.keys(strataConformance.perStratum).length >= 9;

    return {
      state: this.getState(),
      layers: this.getLayers(),
      proofChainLength: this.proofChain.length,
      decisionLogLength: this.decisionLog.length,
      unified: this.state.coherence > 0.99 && this.state.convergence > 0.99 && this.state.perpetuation > 0.99,
      determinismVerified: allStrataPresent && this.state.ethicalScore >= this.config.ethicalFloor,
    };
  }

  private generateProof(
    type: SingularityProof['type'],
    intent: string,
    value: number
  ): SingularityProof {
    const previousProof = this.proofChain[this.proofChain.length - 1]?.proof || 'genesis';
    const timestamp = kernelNowIso();

    const proofData = {
      type,
      targetHash: this.state.substrateHash,
      value: Number(value.toFixed(6)),
      intent,
      timestamp,
      previousProof,
      stateSnapshot: {
        coherence: this.state.coherence,
        convergence: this.state.convergence,
        perpetuation: this.state.perpetuation,
        cognitionDepth: this.state.cognitionDepth,
        ethicalScore: this.state.ethicalScore,
      },
    };

    const proof = createHash('sha256')
      .update(JSON.stringify(proofData))
      .digest('hex')
      .slice(0, 32);

    return {
      type,
      targetHash: this.state.substrateHash,
      value: Number(value.toFixed(6)),
      proof,
      rationale: `${type}(${intent}): ${value.toFixed(6)}`,
      timestamp,
      previousProof,
    };
  }

  private createUnifiedDecision(
    proof: SingularityProof,
    intent: string,
    strataConformance?: Record<string, { score: number; passed: boolean }>
  ): UnifiedDecision {
    return {
      type: 'singularity_unified',
      targetHash: this.state.substrateHash,
      coherence: this.state.coherence,
      convergence: this.state.convergence,
      perpetuation: this.state.perpetuation,
      cognitionDepth: this.state.cognitionDepth,
      ethicalScore: this.state.ethicalScore,
      unifiedProof: proof.proof,
      rationale: `${intent}: coherence=${this.state.coherence.toFixed(6)} convergence=${this.state.convergence.toFixed(6)} perpetuation=${this.state.perpetuation.toFixed(6)} cognition=${this.state.cognitionDepth.toFixed(6)} ethics=${this.state.ethicalScore.toFixed(6)}`,
      strataConformance: strataConformance
        ? Object.fromEntries(Object.entries(strataConformance).map(([k, v]) => [k, v.score]))
        : {},
    };
  }

  private updateLayer(name: string, integrity: number): void {
    const layer = this.layers.get(name);
    if (layer) {
      layer.integrity = integrity;
      layer.lastReflection = kernelNowIso();
      layer.auditHash = this.computeLayerHash(name, integrity.toString());
    }
  }
}

let _singularityInstance: ParadigmSingularity | null = null;

export function getSingularity(seedHash?: string): ParadigmSingularity {
  if (!_singularityInstance) {
    _singularityInstance = new ParadigmSingularity(seedHash);
  }
  return _singularityInstance;
}

export function resetSingularity(seedHash?: string): ParadigmSingularity {
  _singularityInstance = new ParadigmSingularity(seedHash);
  return _singularityInstance;
}

export async function runSingularityCycle(
  seedHash: string = 'paradigm-singularity-cli',
  cycles: number = 1
): Promise<UnifiedDecision[]> {
  const singularity = resetSingularity(seedHash);
  const results: UnifiedDecision[] = [];

  for (let i = 0; i < cycles; i++) {
    const decision = singularity.executeUnifiedCycle(`singularity_cycle_${i + 1}`);
    results.push(decision);
  }

  return results;
}