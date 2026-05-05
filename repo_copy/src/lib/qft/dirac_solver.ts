export interface DiracFieldSnapshot {
  time: number;
  psiReal: Float32Array;
  psiImag: Float32Array;
  probabilityDensity: Float32Array;
}

export class DiracSolver {
  nx: number; ny: number; nz: number;
  dx: number; dt: number;
  mass: number;
  
  // 4 components, real and imaginary parts
  // Stored as flat arrays of size 4 * nx * ny * nz
  psiReal: Float32Array;
  psiImag: Float32Array;
  
  // Potential field
  V: Float32Array;
  
  time: number = 0;
  stepCount: number = 0;

  constructor(gridSize: [number, number, number] = [64, 64, 64], dx = 0.1, dt = 0.05, mass = 1.0) {
    this.nx = gridSize[0]; this.ny = gridSize[1]; this.nz = gridSize[2];
    this.dx = dx;
    this.dt = dt;
    this.mass = mass;
    
    const size = 4 * this.nx * this.ny * this.nz;
    this.psiReal = new Float32Array(size);
    this.psiImag = new Float32Array(size);
    this.V = new Float32Array(this.nx * this.ny * this.nz);
  }
  
  private idx(c: number, i: number, j: number, k: number): number {
    return c * (this.nx * this.ny * this.nz) + i * this.ny * this.nz + j * this.nz + k;
  }
  
  private spatialIdx(i: number, j: number, k: number): number {
    return i * this.ny * this.nz + j * this.nz + k;
  }
  
  setGaussianWavepacket(pos: [number, number, number], momentum: [number, number, number], width: number) {
    for (let i = 0; i < this.nx; i++) {
      for (let j = 0; j < this.ny; j++) {
        for (let k = 0; k < this.nz; k++) {
          const x = (i - pos[0]) * this.dx;
          const y = (j - pos[1]) * this.dx;
          const z = (k - pos[2]) * this.dx;
          
          const r2 = x*x + y*y + z*z;
          const env = Math.exp(-r2 / (2 * width * width));
          const phase = momentum[0]*x + momentum[1]*y + momentum[2]*z;
          
          // Set only the first component (spin up, positive energy)
          const idx = this.idx(0, i, j, k);
          this.psiReal[idx] = env * Math.cos(phase);
          this.psiImag[idx] = env * Math.sin(phase);
        }
      }
    }
    this.normalize();
  }
  
  setCoulombPotential(pos: [number, number, number], charge: number) {
    for (let i = 0; i < this.nx; i++) {
      for (let j = 0; j < this.ny; j++) {
        for (let k = 0; k < this.nz; k++) {
          const x = (i - pos[0]) * this.dx;
          const y = (j - pos[1]) * this.dx;
          const z = (k - pos[2]) * this.dx;
          const r = Math.sqrt(x*x + y*y + z*z);
          const sIdx = this.spatialIdx(i, j, k);
          if (r > 0.1) {
            this.V[sIdx] = charge / r;
          } else {
            this.V[sIdx] = charge / 0.1; // Soften core
          }
        }
      }
    }
  }
  
  normalize() {
    let norm = 0;
    for (let i = 0; i < this.psiReal.length; i++) {
      norm += this.psiReal[i] * this.psiReal[i] + this.psiImag[i] * this.psiImag[i];
    }
    norm = Math.sqrt(norm * this.dx * this.dx * this.dx);
    if (norm > 0) {
      for (let i = 0; i < this.psiReal.length; i++) {
        this.psiReal[i] /= norm;
        this.psiImag[i] /= norm;
      }
    }
  }
  
  step() {
    // Leapfrog integration for i * d/dt psi = H * psi
    // H = -i * (alpha_x * d/dx + alpha_y * d/dy + alpha_z * d/dz) + beta * m + V
    
    const newPsiReal = new Float32Array(this.psiReal.length);
    const newPsiImag = new Float32Array(this.psiImag.length);
    
    const dx2 = 2 * this.dx;
    
    for (let i = 1; i < this.nx - 1; i++) {
      for (let j = 1; j < this.ny - 1; j++) {
        for (let k = 1; k < this.nz - 1; k++) {
          const sIdx = this.spatialIdx(i, j, k);
          const v = this.V[sIdx];
          
          for (let c = 0; c < 4; c++) {
            const idx = this.idx(c, i, j, k);
            
            // Central differences for derivatives
            // d/dx
            const dRe_dx = (this.psiReal[this.idx(c, i+1, j, k)] - this.psiReal[this.idx(c, i-1, j, k)]) / dx2;
            const dIm_dx = (this.psiImag[this.idx(c, i+1, j, k)] - this.psiImag[this.idx(c, i-1, j, k)]) / dx2;
            
            // d/dy
            const dRe_dy = (this.psiReal[this.idx(c, i, j+1, k)] - this.psiReal[this.idx(c, i, j-1, k)]) / dx2;
            const dIm_dy = (this.psiImag[this.idx(c, i, j+1, k)] - this.psiImag[this.idx(c, i, j-1, k)]) / dx2;
            
            // d/dz
            const dRe_dz = (this.psiReal[this.idx(c, i, j, k+1)] - this.psiReal[this.idx(c, i, j, k-1)]) / dx2;
            const dIm_dz = (this.psiImag[this.idx(c, i, j, k+1)] - this.psiImag[this.idx(c, i, j, k-1)]) / dx2;
            
            // Apply Hamiltonian (simplified Dirac-Dirac representation)
            // This is a placeholder for the full matrix multiplication
            // In a full implementation, alpha and beta matrices mix the components
            
            let H_psiRe = 0;
            let H_psiIm = 0;
            
            // Mass term (beta matrix: diag(1, 1, -1, -1))
            const sign = (c < 2) ? 1 : -1;
            H_psiRe += sign * this.mass * this.psiReal[idx];
            H_psiIm += sign * this.mass * this.psiImag[idx];
            
            // Potential term
            H_psiRe += v * this.psiReal[idx];
            H_psiIm += v * this.psiImag[idx];
            
            // Momentum terms (alpha matrices)
            // Alpha_x: [0, sigma_x; sigma_x, 0]
            // Alpha_y: [0, sigma_y; sigma_y, 0]
            // Alpha_z: [0, sigma_z; sigma_z, 0]
            
            let c_x = 0, c_y = 0, c_z = 0;
            let sign_y = 1;
            
            if (c === 0) { c_x = 3; c_y = 3; c_z = 2; sign_y = -1; }
            if (c === 1) { c_x = 2; c_y = 2; c_z = 3; sign_y = 1; }
            if (c === 2) { c_x = 1; c_y = 1; c_z = 0; sign_y = -1; }
            if (c === 3) { c_x = 0; c_y = 0; c_z = 1; sign_y = 1; }
            
            // -i * alpha_x * d/dx
            const idx_x = this.idx(c_x, i, j, k);
            const dRe_dx_c = (this.psiReal[this.idx(c_x, i+1, j, k)] - this.psiReal[this.idx(c_x, i-1, j, k)]) / dx2;
            const dIm_dx_c = (this.psiImag[this.idx(c_x, i+1, j, k)] - this.psiImag[this.idx(c_x, i-1, j, k)]) / dx2;
            H_psiRe += dIm_dx_c;
            H_psiIm -= dRe_dx_c;
            
            // -i * alpha_y * d/dy (sigma_y is [0, -i; i, 0])
            const dRe_dy_c = (this.psiReal[this.idx(c_y, i, j+1, k)] - this.psiReal[this.idx(c_y, i, j-1, k)]) / dx2;
            const dIm_dy_c = (this.psiImag[this.idx(c_y, i, j+1, k)] - this.psiImag[this.idx(c_y, i, j-1, k)]) / dx2;
            H_psiRe += sign_y * dRe_dy_c;
            H_psiIm += sign_y * dIm_dy_c;
            
            // -i * alpha_z * d/dz
            const sign_z = (c === 0 || c === 2) ? 1 : -1;
            const dRe_dz_c = (this.psiReal[this.idx(c_z, i, j, k+1)] - this.psiReal[this.idx(c_z, i, j, k-1)]) / dx2;
            const dIm_dz_c = (this.psiImag[this.idx(c_z, i, j, k+1)] - this.psiImag[this.idx(c_z, i, j, k-1)]) / dx2;
            H_psiRe += sign_z * dIm_dz_c;
            H_psiIm -= sign_z * dRe_dz_c;
            
            // Time evolution: psi(t+dt) = psi(t) - i * dt * H * psi(t)
            newPsiReal[idx] = this.psiReal[idx] + this.dt * H_psiIm;
            newPsiImag[idx] = this.psiImag[idx] - this.dt * H_psiRe;
          }
        }
      }
    }
    
    this.psiReal = newPsiReal;
    this.psiImag = newPsiImag;
    
    // Normalize to prevent blowup from explicit Euler
    this.normalize();
    
    this.time += this.dt;
    this.stepCount++;
  }
  
  getProbabilityDensity(): Float32Array {
    const density = new Float32Array(this.nx * this.ny * this.nz);
    for (let i = 0; i < this.nx; i++) {
      for (let j = 0; j < this.ny; j++) {
        for (let k = 0; k < this.nz; k++) {
          let prob = 0;
          for (let c = 0; c < 4; c++) {
            const idx = this.idx(c, i, j, k);
            prob += this.psiReal[idx] * this.psiReal[idx] + this.psiImag[idx] * this.psiImag[idx];
          }
          density[this.spatialIdx(i, j, k)] = prob;
        }
      }
    }
    return density;
  }
  
  run(numSteps: number, captureEvery: number = 10): DiracFieldSnapshot[] {
    const snapshots: DiracFieldSnapshot[] = [];
    for (let step = 0; step < numSteps; step++) {
      this.step();
      if (step % captureEvery === 0) {
        snapshots.push({
          time: this.time,
          psiReal: new Float32Array(this.psiReal),
          psiImag: new Float32Array(this.psiImag),
          probabilityDensity: this.getProbabilityDensity()
        });
      }
    }
    return snapshots;
  }
}

export function simulateDiracField(initialConditions: any, gridSize: [number, number, number] = [64, 64, 64], numSteps = 200): DiracFieldSnapshot[] {
  const solver = new DiracSolver(gridSize);
  
  if (initialConditions.wavepacket) {
    const wp = initialConditions.wavepacket;
    solver.setGaussianWavepacket(
      wp.position || [32, 32, 32],
      wp.momentum || [1, 0, 0],
      wp.width || 5
    );
  } else {
    solver.setGaussianWavepacket([32, 32, 32], [1, 0, 0], 5);
  }
  
  if (initialConditions.potential) {
    const pot = initialConditions.potential;
    if (pot.type === "coulomb") {
      solver.setCoulombPotential(pot.position || [32, 32, 32], pot.charge || -1.0);
    }
  }
  
  return solver.run(numSteps, 10);
}
