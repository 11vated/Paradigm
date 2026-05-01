export interface GravitySnapshot {
  time: number;
  h_xx: Float32Array;
  h_yy: Float32Array;
  h_zz: Float32Array;
  h_xy: Float32Array;
  h_xz: Float32Array;
  h_yz: Float32Array;
}

export class GravitySolver {
  nx: number; ny: number; nz: number;
  dx: number; dt: number;
  
  // Metric perturbations (spatial components only for transverse-traceless gauge)
  h_xx: Float32Array; h_yy: Float32Array; h_zz: Float32Array;
  h_xy: Float32Array; h_xz: Float32Array; h_yz: Float32Array;
  
  // Previous time step for wave equation leapfrog
  h_xx_prev: Float32Array; h_yy_prev: Float32Array; h_zz_prev: Float32Array;
  h_xy_prev: Float32Array; h_xz_prev: Float32Array; h_yz_prev: Float32Array;
  
  // Stress-energy tensor source
  T_xx: Float32Array; T_yy: Float32Array; T_zz: Float32Array;
  T_xy: Float32Array; T_xz: Float32Array; T_yz: Float32Array;
  
  time: number = 0;

  constructor(gridSize: [number, number, number] = [64, 64, 64], dx = 0.1, dt = 0.05) {
    this.nx = gridSize[0]; this.ny = gridSize[1]; this.nz = gridSize[2];
    this.dx = dx;
    this.dt = dt;
    
    const size = this.nx * this.ny * this.nz;
    this.h_xx = new Float32Array(size); this.h_yy = new Float32Array(size); this.h_zz = new Float32Array(size);
    this.h_xy = new Float32Array(size); this.h_xz = new Float32Array(size); this.h_yz = new Float32Array(size);
    
    this.h_xx_prev = new Float32Array(size); this.h_yy_prev = new Float32Array(size); this.h_zz_prev = new Float32Array(size);
    this.h_xy_prev = new Float32Array(size); this.h_xz_prev = new Float32Array(size); this.h_yz_prev = new Float32Array(size);
    
    this.T_xx = new Float32Array(size); this.T_yy = new Float32Array(size); this.T_zz = new Float32Array(size);
    this.T_xy = new Float32Array(size); this.T_xz = new Float32Array(size); this.T_yz = new Float32Array(size);
  }
  
  private idx(i: number, j: number, k: number): number {
    return i * this.ny * this.nz + j * this.nz + k;
  }
  
  setBinaryInspiralSource(pos: [number, number, number], mass: number, radius: number, frequency: number) {
    // Simplified quadrupole source for a binary system
    const cx = pos[0]; const cy = pos[1]; const cz = pos[2];
    const i = this.idx(cx, cy, cz);
    
    // We will update T_ij dynamically in step() based on time
    this.T_xx[i] = mass * radius * radius; // amplitude
    this.T_yy[i] = mass * radius * radius;
    this.T_xy[i] = mass * radius * radius;
  }
  
  step() {
    const c2 = 1.0; // Wave speed squared
    const dx2 = this.dx * this.dx;
    const dt2 = this.dt * this.dt;
    const kappa = 8 * Math.PI; // 8 pi G
    
    // Update source based on time (rotating quadrupole)
    const omega = 0.1; // frequency
    const phase = omega * this.time;
    const cx = Math.floor(this.nx / 2);
    const cy = Math.floor(this.ny / 2);
    const cz = Math.floor(this.nz / 2);
    const srcIdx = this.idx(cx, cy, cz);
    
    const amp = this.T_xx[srcIdx]; // use as base amplitude
    const t_xx = amp * Math.cos(2 * phase);
    const t_yy = -amp * Math.cos(2 * phase);
    const t_xy = amp * Math.sin(2 * phase);
    
    const next_xx = new Float32Array(this.nx * this.ny * this.nz);
    const next_xy = new Float32Array(this.nx * this.ny * this.nz);
    
    for (let i = 1; i < this.nx - 1; i++) {
      for (let j = 1; j < this.ny - 1; j++) {
        for (let k = 1; k < this.nz - 1; k++) {
          const idx = this.idx(i, j, k);
          
          // Laplacian for h_xx
          const lap_xx = (
            this.h_xx[this.idx(i+1, j, k)] + this.h_xx[this.idx(i-1, j, k)] +
            this.h_xx[this.idx(i, j+1, k)] + this.h_xx[this.idx(i, j-1, k)] +
            this.h_xx[this.idx(i, j, k+1)] + this.h_xx[this.idx(i, j, k-1)] -
            6 * this.h_xx[idx]
          ) / dx2;
          
          // Laplacian for h_xy
          const lap_xy = (
            this.h_xy[this.idx(i+1, j, k)] + this.h_xy[this.idx(i-1, j, k)] +
            this.h_xy[this.idx(i, j+1, k)] + this.h_xy[this.idx(i, j-1, k)] +
            this.h_xy[this.idx(i, j, k+1)] + this.h_xy[this.idx(i, j, k-1)] -
            6 * this.h_xy[idx]
          ) / dx2;
          
          let s_xx = 0; let s_xy = 0;
          if (i === cx && j === cy && k === cz) {
            s_xx = t_xx;
            s_xy = t_xy;
          }
          
          // Wave equation: h(t+dt) = 2h(t) - h(t-dt) + dt^2 * (c^2 * laplacian(h) + kappa * T)
          next_xx[idx] = 2 * this.h_xx[idx] - this.h_xx_prev[idx] + dt2 * (c2 * lap_xx + kappa * s_xx);
          next_xy[idx] = 2 * this.h_xy[idx] - this.h_xy_prev[idx] + dt2 * (c2 * lap_xy + kappa * s_xy);
        }
      }
    }
    
    this.h_xx_prev.set(this.h_xx);
    this.h_xx.set(next_xx);
    
    this.h_xy_prev.set(this.h_xy);
    this.h_xy.set(next_xy);
    
    this.time += this.dt;
  }
  
  run(numSteps: number, captureEvery: number = 10): GravitySnapshot[] {
    const snapshots: GravitySnapshot[] = [];
    for (let step = 0; step < numSteps; step++) {
      this.step();
      if (step % captureEvery === 0) {
        snapshots.push({
          time: this.time,
          h_xx: new Float32Array(this.h_xx),
          h_yy: new Float32Array(this.h_yy),
          h_zz: new Float32Array(this.h_zz),
          h_xy: new Float32Array(this.h_xy),
          h_xz: new Float32Array(this.h_xz),
          h_yz: new Float32Array(this.h_yz),
        });
      }
    }
    return snapshots;
  }
}

export function simulateGravity(initialConditions: any, gridSize: [number, number, number] = [64, 64, 64], numSteps = 200) {
  const solver = new GravitySolver(gridSize);
  
  if (initialConditions.source) {
    const src = initialConditions.source;
    solver.setBinaryInspiralSource(
      src.position || [32, 32, 32],
      src.mass || 1.0,
      src.radius || 2.0,
      src.frequency || 0.1
    );
  }
  
  return solver.run(numSteps, 10);
}
