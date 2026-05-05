import { FDTDSolver } from './em_solver.js';
import { DiracSolver } from './dirac_solver.js';

export class QEDCoupling {
  emSolver: FDTDSolver;
  diracSolver: DiracSolver;
  couplingConstant: number;
  
  constructor(gridSize: [number, number, number] = [64, 64, 64], dx = 0.1, dt = 0.05, couplingConstant = 0.1) {
    this.emSolver = new FDTDSolver(gridSize, dx, dt);
    this.diracSolver = new DiracSolver(gridSize, dx, dt);
    this.couplingConstant = couplingConstant;
  }
  
  step() {
    // 1. Compute current density from Dirac field
    // J^mu = -e * psi_bar * gamma^mu * psi
    // For simplicity in this FDTD representation, we approximate the spatial current J
    // J_k ~ psi^dagger * alpha_k * psi
    
    const nx = this.diracSolver.nx;
    const ny = this.diracSolver.ny;
    const nz = this.diracSolver.nz;
    
    for (let i = 0; i < nx; i++) {
      for (let j = 0; j < ny; j++) {
        for (let k = 0; k < nz; k++) {
          const sIdx = i * ny * nz + j * nz + k;
          
          // Helper to get index
          const idx = (c: number) => c * (nx * ny * nz) + sIdx;
          
          const re0 = this.diracSolver.psiReal[idx(0)]; const im0 = this.diracSolver.psiImag[idx(0)];
          const re1 = this.diracSolver.psiReal[idx(1)]; const im1 = this.diracSolver.psiImag[idx(1)];
          const re2 = this.diracSolver.psiReal[idx(2)]; const im2 = this.diracSolver.psiImag[idx(2)];
          const re3 = this.diracSolver.psiReal[idx(3)]; const im3 = this.diracSolver.psiImag[idx(3)];
          
          // Jx ~ psi^dagger * alpha_x * psi
          // alpha_x = [0, sigma_x; sigma_x, 0]
          // psi^dagger * alpha_x * psi = 2 * Re(psi0* psi3 + psi1* psi2)
          const jx = 2 * (re0 * re3 + im0 * im3 + re1 * re2 + im1 * im2);
          
          // Jy ~ psi^dagger * alpha_y * psi
          // alpha_y = [0, -i sigma_y; i sigma_y, 0]
          // psi^dagger * alpha_y * psi = 2 * Im(psi0* psi3 - psi1* psi2)
          const jy = 2 * (re0 * im3 - im0 * re3 - re1 * im2 + im1 * re2);
          
          // Jz ~ psi^dagger * alpha_z * psi
          // alpha_z = [0, sigma_z; sigma_z, 0]
          // psi^dagger * alpha_z * psi = 2 * Re(psi0* psi2 - psi1* psi3)
          const jz = 2 * (re0 * re2 + im0 * im2 - re1 * re3 - im1 * im3);
          
          // Feed into EM solver
          this.emSolver.Jx[sIdx] = -this.couplingConstant * jx;
          this.emSolver.Jy[sIdx] = -this.couplingConstant * jy;
          this.emSolver.Jz[sIdx] = -this.couplingConstant * jz;
          
          // 2. Feed EM field back into Dirac solver as potential A
          // Minimal coupling: p -> p - eA
          // This modifies the Dirac Hamiltonian. For now, we approximate by adding the scalar potential phi
          // derived roughly from the E field, or directly coupling A to the alpha matrices.
          // In a full lattice gauge theory, we use gauge links U = exp(i e A).
          // Here, we just use the E field to create a scalar potential V for demonstration.
          const eMag = Math.sqrt(
            this.emSolver.Ex[sIdx]**2 + 
            this.emSolver.Ey[sIdx]**2 + 
            this.emSolver.Ez[sIdx]**2
          );
          this.diracSolver.V[sIdx] = -this.couplingConstant * eMag;
        }
      }
    }
    
    // Step both solvers
    this.emSolver.step();
    this.diracSolver.step();
    
    // Check for NaN
    if (isNaN(this.emSolver.Ex[0]) || isNaN(this.diracSolver.psiReal[0])) {
      console.error("NaN detected in QEDCoupling step!");
    }
  }
  
  run(numSteps: number, captureEvery: number = 10) {
    const snapshots: any[] = [];
    for (let step = 0; step < numSteps; step++) {
      this.step();
      if (step % captureEvery === 0) {
        snapshots.push({
          time: this.emSolver.time,
          em: this.emSolver.getSnapshot(),
          dirac: {
            probabilityDensity: this.diracSolver.getProbabilityDensity()
          }
        });
      }
    }
    return snapshots;
  }
}

export function simulateQED(initialConditions: any, gridSize: [number, number, number] = [64, 64, 64], numSteps = 200) {
  const solver = new QEDCoupling(gridSize);
  
  if (initialConditions.electron) {
    const wp = initialConditions.electron;
    solver.diracSolver.setGaussianWavepacket(
      wp.position || [32, 32, 32],
      wp.momentum || [1, 0, 0],
      wp.width || 5
    );
  } else {
    solver.diracSolver.setGaussianWavepacket([32, 32, 32], [1, 0, 0], 5);
  }
  
  return solver.run(numSteps, 10);
}
