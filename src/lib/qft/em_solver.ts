export interface EMFieldSnapshot {
  time: number;
  Ex: Float32Array;
  Ey: Float32Array;
  Ez: Float32Array;
  Hx: Float32Array;
  Hy: Float32Array;
  Hz: Float32Array;
}

export class FDTDSolver {
  nx: number; ny: number; nz: number;
  dx: number; dt: number;
  pmlThickness: number; pmlStrength: number;
  
  Ex: Float32Array; Ey: Float32Array; Ez: Float32Array;
  Hx: Float32Array; Hy: Float32Array; Hz: Float32Array;
  Jx: Float32Array; Jy: Float32Array; Jz: Float32Array;
  
  sigmaX: Float32Array; sigmaY: Float32Array; sigmaZ: Float32Array;
  
  time: number = 0;
  stepCount: number = 0;
  
  sourceTimeFunc?: string;
  sourceCenter?: number;
  sourceWidth?: number;

  constructor(gridSize: [number, number, number] = [64, 64, 64], dx = 0.1, dt?: number, pmlThickness = 10, pmlStrength = 1e-3) {
    this.nx = gridSize[0]; this.ny = gridSize[1]; this.nz = gridSize[2];
    this.dx = dx;
    this.pmlThickness = pmlThickness;
    this.pmlStrength = pmlStrength;
    
    // Use natural units: c = 1, eps0 = 1, mu0 = 1
    const c = 1.0;
    this.dt = dt ?? (dx / (c * Math.sqrt(3)) * 0.99);
    
    const size = this.nx * this.ny * this.nz;
    this.Ex = new Float32Array(size); this.Ey = new Float32Array(size); this.Ez = new Float32Array(size);
    this.Hx = new Float32Array(size); this.Hy = new Float32Array(size); this.Hz = new Float32Array(size);
    this.Jx = new Float32Array(size); this.Jy = new Float32Array(size); this.Jz = new Float32Array(size);
    
    this.sigmaX = new Float32Array(this.nx);
    this.sigmaY = new Float32Array(this.ny);
    this.sigmaZ = new Float32Array(this.nz);
    this.initPML();
  }
  
  private idx(i: number, j: number, k: number): number {
    return i * this.ny * this.nz + j * this.nz + k;
  }
  
  private initPML() {
    for (let i = 0; i < this.pmlThickness; i++) {
      const x = (this.pmlThickness - i) / this.pmlThickness;
      const sigma = this.pmlStrength * Math.pow(x, 3);
      this.sigmaX[i] = sigma; this.sigmaX[this.nx - 1 - i] = sigma;
      this.sigmaY[i] = sigma; this.sigmaY[this.ny - 1 - i] = sigma;
      this.sigmaZ[i] = sigma; this.sigmaZ[this.nz - 1 - i] = sigma;
    }
  }
  
  setSourceDipole(pos: [number, number, number], moment: [number, number, number], timeFunc = "gaussian", centerTime = 50, width = 10) {
    const i = this.idx(pos[0], pos[1], pos[2]);
    this.Jx[i] = moment[0];
    this.Jy[i] = moment[1];
    this.Jz[i] = moment[2];
    this.sourceTimeFunc = timeFunc;
    this.sourceCenter = centerTime;
    this.sourceWidth = width;
  }
  
  private currentSourceValue(): number {
    if (!this.sourceTimeFunc) return 1.0;
    const t = this.time;
    if (this.sourceTimeFunc === "gaussian") {
      return Math.exp(-Math.pow(t - (this.sourceCenter || 0), 2) / (2 * Math.pow(this.sourceWidth || 1, 2)));
    } else if (this.sourceTimeFunc === "sinusoidal") {
      return Math.sin(2 * Math.PI * (this.sourceWidth || 1) * t);
    }
    return 1.0;
  }
  
  step() {
    // Natural units
    const eps0 = 1.0;
    const mu0 = 1.0;
    const dtMu0 = this.dt / mu0;
    const dtEps0 = this.dt / eps0;
    const dx = this.dx;
    
    // Update H fields
    for (let i = 0; i < this.nx - 1; i++) {
      for (let j = 0; j < this.ny; j++) {
        for (let k = 0; k < this.nz; k++) {
          const idx = this.idx(i, j, k);
          const idxy = this.idx(i, j+1, k);
          const idxz = this.idx(i, j, k+1);
          
          if (j < this.ny - 1 && k < this.nz - 1) {
            this.Hx[idx] += dtMu0 * (
              (this.Ey[idxz] - this.Ey[idx]) / dx -
              (this.Ez[idxy] - this.Ez[idx]) / dx -
              this.sigmaX[i] * this.Hx[idx]
            );
          }
        }
      }
    }
    
    for (let i = 0; i < this.nx; i++) {
      for (let j = 0; j < this.ny - 1; j++) {
        for (let k = 0; k < this.nz; k++) {
          const idx = this.idx(i, j, k);
          const idxx = this.idx(i+1, j, k);
          const idxz = this.idx(i, j, k+1);
          
          if (i < this.nx - 1 && k < this.nz - 1) {
            this.Hy[idx] += dtMu0 * (
              (this.Ez[idxx] - this.Ez[idx]) / dx -
              (this.Ex[idxz] - this.Ex[idx]) / dx -
              this.sigmaY[j] * this.Hy[idx]
            );
          }
        }
      }
    }
    
    for (let i = 0; i < this.nx; i++) {
      for (let j = 0; j < this.ny; j++) {
        for (let k = 0; k < this.nz - 1; k++) {
          const idx = this.idx(i, j, k);
          const idxx = this.idx(i+1, j, k);
          const idxy = this.idx(i, j+1, k);
          
          if (i < this.nx - 1 && j < this.ny - 1) {
            this.Hz[idx] += dtMu0 * (
              (this.Ex[idxy] - this.Ex[idx]) / dx -
              (this.Ey[idxx] - this.Ey[idx]) / dx -
              this.sigmaZ[k] * this.Hz[idx]
            );
          }
        }
      }
    }
    
    // Update E fields
    const jAmp = this.currentSourceValue();
    
    for (let i = 1; i < this.nx - 1; i++) {
      for (let j = 1; j < this.ny - 1; j++) {
        for (let k = 1; k < this.nz - 1; k++) {
          const idx = this.idx(i, j, k);
          const idxy_prev = this.idx(i, j-1, k);
          const idxz_prev = this.idx(i, j, k-1);
          const idxx_prev = this.idx(i-1, j, k);
          
          this.Ex[idx] += dtEps0 * (
            (this.Hz[idx] - this.Hz[idxy_prev]) / dx -
            (this.Hy[idx] - this.Hy[idxz_prev]) / dx -
            this.sigmaX[i] * this.Ex[idx] -
            this.Jx[idx] * jAmp
          );
          
          this.Ey[idx] += dtEps0 * (
            (this.Hx[idx] - this.Hx[idxz_prev]) / dx -
            (this.Hz[idx] - this.Hz[idxx_prev]) / dx -
            this.sigmaY[j] * this.Ey[idx] -
            this.Jy[idx] * jAmp
          );
          
          this.Ez[idx] += dtEps0 * (
            (this.Hy[idx] - this.Hy[idxx_prev]) / dx -
            (this.Hx[idx] - this.Hx[idxy_prev]) / dx -
            this.sigmaZ[k] * this.Ez[idx] -
            this.Jz[idx] * jAmp
          );
        }
      }
    }
    
    this.time += this.dt;
    this.stepCount++;
  }
  
  run(numSteps: number, captureEvery: number = 10): EMFieldSnapshot[] {
    const snapshots: EMFieldSnapshot[] = [];
    for (let step = 0; step < numSteps; step++) {
      this.step();
      if (step % captureEvery === 0) {
        snapshots.push(this.getSnapshot());
      }
    }
    return snapshots;
  }
  
  getSnapshot(): EMFieldSnapshot {
    return {
      time: this.time,
      Ex: new Float32Array(this.Ex),
      Ey: new Float32Array(this.Ey),
      Ez: new Float32Array(this.Ez),
      Hx: new Float32Array(this.Hx),
      Hy: new Float32Array(this.Hy),
      Hz: new Float32Array(this.Hz),
    };
  }
}

export function simulateEMField(initialConditions: any, gridSize: [number, number, number] = [64, 64, 64], numSteps = 200): EMFieldSnapshot[] {
  const solver = new FDTDSolver(gridSize);
  
  if (initialConditions.source) {
    const src = initialConditions.source;
    solver.setSourceDipole(
      src.position || [32, 32, 32],
      src.moment || [1, 0, 0],
      src.time_function || "gaussian",
      src.center_time || 50,
      src.width || 10
    );
  }
  
  const snapshots: EMFieldSnapshot[] = [];
  for (let step = 0; step < numSteps; step++) {
    solver.step();
    if (step % 10 === 0) {
      let maxEx = 0;
      for (let i = 0; i < solver.Ex.length; i++) {
        if (Math.abs(solver.Ex[i]) > maxEx) maxEx = Math.abs(solver.Ex[i]);
      }
      console.log(`Step ${step}, maxEx: ${maxEx}`);
    }
    if (isNaN(solver.Ex[solver.idx(16, 16, 16)])) {
      console.log(`NaN detected at step ${step}`);
      break;
    }
    if (step % 10 === 0) {
      snapshots.push(solver.getSnapshot());
    }
  }
  
  return snapshots;
}
