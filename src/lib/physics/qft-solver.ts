/**
 * QUANTUM FIELD THEORY PHYSICS SOLVER
 * 
 * Simulates and validates physics-based generative outputs:
 * - QFT field equations
 * - Particle system dynamics
 * - Wave function collapse
 * - Energy conservation validation
 * - Causal consistency checks
 */

import { Complex } from './complex';
import { rngFromHash } from '../kernel/rng';

export interface QuantumState {
  position: [number, number, number];
  momentum: [number, number, number];
  spin: number;
  charge: number;
  mass: number;
  waveFunction: Complex[];
}

export interface FieldConfiguration {
  fieldType: 'scalar' | 'vector' | 'spinor' | 'tensor';
  dimensions: number;
  coupling: number;
  potential: (x: number[]) => number;
}

export interface PhysicsValidationResult {
  valid: boolean;
  energyConservation: boolean;
  causalitySatisfied: boolean;
  constraints: {
    name: string;
    value: number;
    threshold: number;
    passed: boolean;
  }[];
  warnings: string[];
}

/**
 * Quantum Field Theory Solver
 */
export class QFTSolver {
  private fieldConfigs: Map<string, FieldConfiguration> = new Map();
  private quantumStates: Map<string, QuantumState> = new Map();
  
  constructor() {
    this.initializeDefaultFields();
  }
  
  private initializeDefaultFields(): void {
    // Electromagnetic field
    this.fieldConfigs.set('em', {
      fieldType: 'vector',
      dimensions: 4,
      coupling: 1 / 137, // Fine structure constant
      potential: (x) => -1 / Math.sqrt(x[0] ** 2 + x[1] ** 2 + x[2] ** 2 + 1e-10),
    });
    
    // Scalar field (Higgs-like)
    this.fieldConfigs.set('scalar', {
      fieldType: 'scalar',
      dimensions: 4,
      coupling: 0.5,
      potential: (x) => -0.5 * (x[0] ** 2 + x[1] ** 2 + x[2] ** 2) + 0.25 * (x[0] ** 2 + x[1] ** 2 + x[2] ** 2) ** 2,
    });
    
    // Gravitational field
    this.fieldConfigs.set('gravity', {
      fieldType: 'tensor',
      dimensions: 4,
      coupling: 6.674e-11, // G constant
      potential: (x) => -1 / (x[0] ** 2 + x[1] ** 2 + x[2] ** 2 + 1e-10),
    });
  }
  
  /**
   * Solve Schrödinger equation for quantum state evolution
   */
  solveSchrodinger(
    initialState: QuantumState,
    timeStep: number,
    steps: number
  ): QuantumState[] {
    const states: QuantumState[] = [];
    let currentState = { ...initialState };
    
    const hbar = 1.0545718e-34; // Planck constant
    const mass = currentState.mass || 1; // Normalized mass
    const rng = rngFromHash(`qft-schrodinger:${JSON.stringify(initialState)}:${timeStep}:${steps}`);
    
    for (let i = 0; i < steps; i++) {
      // Update position based on momentum (p = mv)
      const vx = currentState.momentum[0] / mass;
      const vy = currentState.momentum[1] / mass;
      const vz = currentState.momentum[2] / mass;
      
      currentState.position = [
        currentState.position[0] + vx * timeStep,
        currentState.position[1] + vy * timeStep,
        currentState.position[2] + vz * timeStep,
      ];
      
      // Quantum diffusion (simplified)
      const diffusion = Math.sqrt(hbar * timeStep / mass);
      currentState.momentum = [
        currentState.momentum[0] + (rng.nextF64() - 0.5) * diffusion,
        currentState.momentum[1] + (rng.nextF64() - 0.5) * diffusion,
        currentState.momentum[2] + (rng.nextF64() - 0.5) * diffusion,
      ];
      
      states.push({ ...currentState });
    }
    
    return states;
  }
  
  /**
   * Calculate wave function collapse
   */
  calculateWaveCollapse(
    state: QuantumState,
    measurementBasis: 'position' | 'momentum' | 'spin'
  ): { collapsedState: QuantumState; probability: number } {
    const hbar = 1.0545718e-34;
    const mass = state.mass || 1;
    const rng = rngFromHash(`qft-collapse:${JSON.stringify(state)}:${measurementBasis}`);
    
    if (measurementBasis === 'position') {
      // Collapse to position eigenstate
      const probability = Math.exp(
        -(
          state.momentum[0] ** 2 +
          state.momentum[1] ** 2 +
          state.momentum[2] ** 2
        ) / (2 * mass * hbar)
      );
      
      return {
        collapsedState: {
          ...state,
          momentum: [0, 0, 0], // Deterministic position
        },
        probability,
      };
    }
    
    if (measurementBasis === 'spin') {
      // Spin measurement
      const spinProb = 0.5 + state.spin / 2;
      const collapsedSpin = rng.nextF64() < spinProb ? 0.5 : -0.5;
      
      return {
        collapsedState: {
          ...state,
          spin: collapsedSpin,
        },
        probability: spinProb,
      };
    }
    
    return { collapsedState: state, probability: 1 };
  }
  
  /**
   * Compute field energy
   */
  computeFieldEnergy(
    fieldId: string,
    regionSize: number
  ): { kinetic: number; potential: number; total: number } {
    const field = this.fieldConfigs.get(fieldId);
    if (!field) throw new Error(`Field ${fieldId} not found`);
    
    let kinetic = 0;
    let potential = 0;
    
    // Integrate over region
    const steps = 10;
    const stepSize = regionSize / steps;
    
    for (let x = 0; x < steps; x++) {
      for (let y = 0; y < steps; y++) {
        for (let z = 0; z < steps; z++) {
          const pos = [x * stepSize, y * stepSize, z * stepSize];
          
          // Kinetic energy (gradient squared)
          const gradient = this.computeGradient(field, pos);
          kinetic += gradient ** 2;
          
          // Potential energy
          potential += field.potential(pos);
        }
      }
    }
    
    const total = kinetic + potential;
    
    return {
      kinetic,
      potential,
      total,
    };
  }
  
  private computeGradient(field: FieldConfiguration, pos: number[]): number {
    const eps = 0.01;
    const dx = (field.potential([pos[0] + eps, pos[1], pos[2]]) - field.potential(pos)) / eps;
    const dy = (field.potential([pos[0], pos[1] + eps, pos[2]]) - field.potential(pos)) / eps;
    const dz = (field.potential([pos[0], pos[1], pos[2] + eps]) - field.potential(pos)) / eps;
    return Math.sqrt(dx ** 2 + dy ** 2 + dz ** 2);
  }
  
  /**
   * Validate physics simulation
   */
  validateSimulation(
    initialState: QuantumState,
    finalState: QuantumState,
    config: {
      tolerance: number;
      checkEnergy: boolean;
      checkCausality: boolean;
    }
  ): PhysicsValidationResult {
    const constraints: PhysicsValidationResult['constraints'] = [];
    const warnings: string[] = [];
    let energyConservation = true;
    let causalitySatisfied = true;
    
    // 1. Energy conservation check
    if (config.checkEnergy) {
      const initialEnergy = this.calculateEnergy(initialState);
      const finalEnergy = this.calculateEnergy(finalState);
      const energyDelta = Math.abs(initialEnergy - finalEnergy);
      const threshold = config.tolerance * Math.abs(initialEnergy) || 1e-6;
      
      energyConservation = energyDelta < threshold;
      
      constraints.push({
        name: 'Energy Conservation',
        value: energyDelta,
        threshold,
        passed: energyConservation,
      });
      
      if (!energyConservation) {
        warnings.push(`Energy not conserved: ${energyDelta.toExponential(2)} J difference`);
      }
    }
    
    // 2. Momentum conservation
    const initialMomentum = Math.sqrt(
      initialState.momentum[0] ** 2 +
      initialState.momentum[1] ** 2 +
      initialState.momentum[2] ** 2
    );
    const finalMomentum = Math.sqrt(
      finalState.momentum[0] ** 2 +
      finalState.momentum[1] ** 2 +
      finalState.momentum[2] ** 2
    );
    const momentumDelta = Math.abs(initialMomentum - finalMomentum);
    const momentumThreshold = config.tolerance * initialMomentum || 1e-10;
    
    constraints.push({
      name: 'Momentum Conservation',
      value: momentumDelta,
      threshold: momentumThreshold,
      passed: momentumDelta < momentumThreshold,
    });
    
    // 3. Causality check (no faster-than-light travel)
    const spaceTimeInterval = this.computeSpaceTimeInterval(initialState.position, finalState.position);
    
    if (spaceTimeInterval < 0) {
      // Space-like separation - check if this violates causality
      const distance = Math.sqrt(
        (finalState.position[0] - initialState.position[0]) ** 2 +
        (finalState.position[1] - initialState.position[1]) ** 2 +
        (finalState.position[2] - initialState.position[2]) ** 2
      );
      
      if (distance > 0) {
        causalitySatisfied = false;
        warnings.push('Possible causality violation: space-like separation detected');
      }
    }
    
    constraints.push({
      name: 'Causality (No FTL)',
      value: spaceTimeInterval,
      threshold: 0,
      passed: causalitySatisfied,
    });
    
    // 4. Charge conservation
    if (initialState.charge !== finalState.charge) {
      constraints.push({
        name: 'Charge Conservation',
        value: Math.abs(initialState.charge - finalState.charge),
        threshold: 0,
        passed: false,
      });
      warnings.push('Charge not conserved');
    } else {
      constraints.push({
        name: 'Charge Conservation',
        value: 0,
        threshold: 0,
        passed: true,
      });
    }
    
    return {
      valid: energyConservation && causalitySatisfied && constraints.every(c => c.passed),
      energyConservation,
      causalitySatisfied,
      constraints,
      warnings,
    };
  }
  
  private calculateEnergy(state: QuantumState): number {
    const hbar = 1.0545718e-34;
    const mass = state.mass || 1;
    
    // Kinetic energy: E = p^2 / 2m
    const p2 =
      state.momentum[0] ** 2 +
      state.momentum[1] ** 2 +
      state.momentum[2] ** 2;
    const kinetic = p2 / (2 * mass);
    
    // Rest mass energy: E = mc^2
    const restMass = mass * 299792458 ** 2;
    
    // Spin energy (simplified)
    const spinEnergy = state.spin * hbar * 1e9;
    
    return kinetic + restMass + spinEnergy;
  }
  
  private computeSpaceTimeInterval(
    pos1: [number, number, number],
    pos2: [number, number, number]
  ): number {
    const dt = 1; // Assume unit time
    const dx = pos2[0] - pos1[0];
    const dy = pos2[1] - pos1[1];
    const dz = pos2[2] - pos1[2];
    
    // c = 1 (natural units)
    return dt ** 2 - (dx ** 2 + dy ** 2 + dz ** 2);
  }
  
  /**
   * Solve field equations (simplified)
   */
  solveFieldEquations(
    fieldId: string,
    initialConditions: number[]
  ): number[] {
    const field = this.fieldConfigs.get(fieldId);
    if (!field) throw new Error(`Field ${fieldId} not found`);
    
    // Simplified field evolution using finite differences
    const t = 0;
    const evolution: number[] = [...initialConditions];
    
    for (let i = 0; i < 100; i++) {
      const current = evolution[evolution.length - 1];
      const gradient = field.potential(evolution.slice(0, 3));
      const laplacian = this.computeLaplacian(evolution, field);
      
      // d²φ/dt² = ∇²φ - V'(φ)
      const acceleration = laplacian - gradient;
      evolution.push(current + acceleration * 0.01);
    }
    
    return evolution;
  }
  
  private computeLaplacian(state: number[], field: FieldConfiguration): number {
    const n = state.length;
    let sum = 0;
    
    for (let i = 0; i < n; i++) {
      const pos = [...state];
      pos[i] += 0.01;
      const forward = field.potential(pos);
      pos[i] -= 0.02;
      const backward = field.potential(pos);
      pos[i] = state[i];
      const center = field.potential(pos);
      
      sum += (forward + backward - 2 * center) / 0.0001;
    }
    
    return sum;
  }
  
  /**
   * Generate particle system from seed physics
   */
  generateParticleSystem(
    seedGenome: Record<string, any>,
    count: number
  ): QuantumState[] {
    const particles: QuantumState[] = [];
    const rng = rngFromHash(`qft-particles:${JSON.stringify(seedGenome)}:${count}`);
    
    for (let i = 0; i < count; i++) {
      const baseEnergy = seedGenome.energy || 1;
      const spin = seedGenome.spin || (rng.nextF64() > 0.5 ? 0.5 : -0.5);
      const charge = seedGenome.charge || (rng.nextF64() > 0.5 ? 1 : -1);
      const mass = seedGenome.mass || 1;
      
      particles.push({
        position: [
          (rng.nextF64() - 0.5) * 10,
          (rng.nextF64() - 0.5) * 10,
          (rng.nextF64() - 0.5) * 10,
        ],
        momentum: [
          (rng.nextF64() - 0.5) * baseEnergy,
          (rng.nextF64() - 0.5) * baseEnergy,
          (rng.nextF64() - 0.5) * baseEnergy,
        ],
        spin,
        charge,
        mass,
        waveFunction: [],
      });
    }
    
    return particles;
  }
  
  /**
   * Export field configuration for visualization
   */
  exportFieldData(fieldId: string): {
    fieldId: string;
    config: FieldConfiguration;
    samplePoints: Array<{ position: number[]; value: number }>;
  } {
    const field = this.fieldConfigs.get(fieldId);
    if (!field) throw new Error(`Field ${fieldId} not found`);
    
    const samplePoints: Array<{ position: number[]; value: number }> = [];
    
    // Sample field at grid points
    for (let x = -5; x <= 5; x += 1) {
      for (let y = -5; y <= 5; y += 1) {
        for (let z = -5; z <= 5; z += 1) {
          samplePoints.push({
            position: [x, y, z],
            value: field.potential([x, y, z]),
          });
        }
      }
    }
    
    return {
      fieldId,
      config: field,
      samplePoints,
    };
  }
}

export default QFTSolver;