// Real SU(2) Lattice Gauge Theory Simulation
// Replaces the mock QCD implementation with a mathematically rigorous non-abelian gauge theory.
// SU(2) matrices are represented by 4 real numbers (a0, a1, a2, a3) where a0^2 + a1^2 + a2^2 + a3^2 = 1.
// U = a0*I + i*a1*sigma1 + i*a2*sigma2 + i*a3*sigma3

export class QCDSolver {
  nx: number; ny: number; nz: number; nt: number;
  beta: number; // Inverse coupling 4/g^2 for SU(2)
  
  // SU(2) link variables: U_mu(x)
  // 4 dimensions (x,y,z,t), nx*ny*nz*nt sites, 4 floats per link
  links: Float32Array;
  
  constructor(gridSize: [number, number, number, number] = [8, 8, 8, 8], beta = 2.5) {
    this.nx = gridSize[0];
    this.ny = gridSize[1];
    this.nz = gridSize[2];
    this.nt = gridSize[3];
    this.beta = beta;
    
    const size = 4 * this.nx * this.ny * this.nz * this.nt * 4;
    this.links = new Float32Array(size);
    this.initCold();
  }
  
  private idx(dir: number, x: number, y: number, z: number, t: number): number {
    x = (x + this.nx) % this.nx;
    y = (y + this.ny) % this.ny;
    z = (z + this.nz) % this.nz;
    t = (t + this.nt) % this.nt;
    return (dir * (this.nx * this.ny * this.nz * this.nt) + 
            x * (this.ny * this.nz * this.nt) + 
            y * (this.nz * this.nt) + 
            z * this.nt + 
            t) * 4;
  }
  
  private initCold() {
    for (let i = 0; i < this.links.length; i += 4) {
      this.links[i] = 1;     // a0
      this.links[i + 1] = 0; // a1
      this.links[i + 2] = 0; // a2
      this.links[i + 3] = 0; // a3
    }
  }

  // Multiply two SU(2) matrices: C = A * B
  private mulSU2(A: Float32Array | number[], B: Float32Array | number[], offsetA = 0, offsetB = 0): number[] {
    const a0 = A[offsetA], a1 = A[offsetA+1], a2 = A[offsetA+2], a3 = A[offsetA+3];
    const b0 = B[offsetB], b1 = B[offsetB+1], b2 = B[offsetB+2], b3 = B[offsetB+3];
    return [
      a0*b0 - a1*b1 - a2*b2 - a3*b3,
      a0*b1 + a1*b0 + a2*b3 - a3*b2,
      a0*b2 - a1*b3 + a2*b0 + a3*b1,
      a0*b3 + a1*b2 - a2*b1 + a3*b0
    ];
  }

  // Inverse (conjugate) of SU(2) matrix
  private invSU2(A: Float32Array | number[], offset = 0): number[] {
    return [A[offset], -A[offset+1], -A[offset+2], -A[offset+3]];
  }

  // Trace of SU(2) matrix
  private trSU2(A: number[]): number {
    return 2 * A[0];
  }

  // Calculate the staple for a given link U_mu(x)
  private calculateStaple(dir: number, x: number, y: number, z: number, t: number): number[] {
    let staple = [0, 0, 0, 0];
    const pos = [x, y, z, t];

    for (let nu = 0; nu < 4; nu++) {
      if (nu === dir) continue;

      // Forward staple: U_nu(x+mu) * U_mu(x+nu)^dagger * U_nu(x)^dagger
      let pos_mu = [...pos]; pos_mu[dir]++;
      let pos_nu = [...pos]; pos_nu[nu]++;

      const u1 = this.idx(nu, pos_mu[0], pos_mu[1], pos_mu[2], pos_mu[3]);
      const u2 = this.idx(dir, pos_nu[0], pos_nu[1], pos_nu[2], pos_nu[3]);
      const u3 = this.idx(nu, pos[0], pos[1], pos[2], pos[3]);

      let term1 = this.mulSU2(this.links, this.invSU2(this.links, u2), u1, 0);
      let term2 = this.mulSU2(term1, this.invSU2(this.links, u3));
      
      staple[0] += term2[0]; staple[1] += term2[1]; staple[2] += term2[2]; staple[3] += term2[3];

      // Backward staple: U_nu(x+mu-nu)^dagger * U_mu(x-nu)^dagger * U_nu(x-nu)
      let pos_mu_minus_nu = [...pos]; pos_mu_minus_nu[dir]++; pos_mu_minus_nu[nu]--;
      let pos_minus_nu = [...pos]; pos_minus_nu[nu]--;

      const v1 = this.idx(nu, pos_mu_minus_nu[0], pos_mu_minus_nu[1], pos_mu_minus_nu[2], pos_mu_minus_nu[3]);
      const v2 = this.idx(dir, pos_minus_nu[0], pos_minus_nu[1], pos_minus_nu[2], pos_minus_nu[3]);
      const v3 = this.idx(nu, pos_minus_nu[0], pos_minus_nu[1], pos_minus_nu[2], pos_minus_nu[3]);

      let term3 = this.mulSU2(this.invSU2(this.links, v1), this.invSU2(this.links, v2));
      let term4 = this.mulSU2(term3, this.links, 0, v3);

      staple[0] += term4[0]; staple[1] += term4[1]; staple[2] += term4[2]; staple[3] += term4[3];
    }
    return staple;
  }

  // Generate a random SU(2) matrix near identity
  private randomSU2(epsilon: number): number[] {
    const r1 = (Math.random() - 0.5) * epsilon;
    const r2 = (Math.random() - 0.5) * epsilon;
    const r3 = (Math.random() - 0.5) * epsilon;
    const r0 = Math.sqrt(1.0 - r1*r1 - r2*r2 - r3*r3);
    return [r0, r1, r2, r3];
  }

  // Real Metropolis update step
  step() {
    let accepted = 0;
    let total = 0;
    const epsilon = 0.2; // Step size

    for (let dir = 0; dir < 4; dir++) {
      for (let x = 0; x < this.nx; x++) {
        for (let y = 0; y < this.ny; y++) {
          for (let z = 0; z < this.nz; z++) {
            for (let t = 0; t < this.nt; t++) {
              const i = this.idx(dir, x, y, z, t);
              const staple = this.calculateStaple(dir, x, y, z, t);
              
              const currentU = [this.links[i], this.links[i+1], this.links[i+2], this.links[i+3]];
              const proposedUpdate = this.randomSU2(epsilon);
              const newU = this.mulSU2(proposedUpdate, currentU);

              // Action S = - (beta/2) * ReTr(U * staple)
              const currentAction = - (this.beta / 2) * this.trSU2(this.mulSU2(currentU, staple));
              const newAction = - (this.beta / 2) * this.trSU2(this.mulSU2(newU, staple));
              
              const deltaS = newAction - currentAction;

              if (deltaS <= 0 || Math.random() < Math.exp(-deltaS)) {
                this.links[i] = newU[0];
                this.links[i+1] = newU[1];
                this.links[i+2] = newU[2];
                this.links[i+3] = newU[3];
                accepted++;
              }
              total++;
            }
          }
        }
      }
    }
  }
  
  // Calculate average plaquette (gauge invariant observable)
  calculatePlaquette(): number {
    let sum = 0;
    let count = 0;
    for (let x = 0; x < this.nx; x++) {
      for (let y = 0; y < this.ny; y++) {
        for (let z = 0; z < this.nz; z++) {
          for (let t = 0; t < this.nt; t++) {
            const pos = [x, y, z, t];
            for (let mu = 0; mu < 3; mu++) {
              for (let nu = mu + 1; nu < 4; nu++) {
                let pos_mu = [...pos]; pos_mu[mu]++;
                let pos_nu = [...pos]; pos_nu[nu]++;

                const u1 = this.idx(mu, pos[0], pos[1], pos[2], pos[3]);
                const u2 = this.idx(nu, pos_mu[0], pos_mu[1], pos_mu[2], pos_mu[3]);
                const u3 = this.idx(mu, pos_nu[0], pos_nu[1], pos_nu[2], pos_nu[3]);
                const u4 = this.idx(nu, pos[0], pos[1], pos[2], pos[3]);

                const p1 = this.mulSU2(this.links, this.links, u1, u2);
                const p2 = this.mulSU2(p1, this.invSU2(this.links, u3));
                const p3 = this.mulSU2(p2, this.invSU2(this.links, u4));

                sum += p3[0]; // ReTr(U)/2 = a0
                count++;
              }
            }
          }
        }
      }
    }
    return sum / count;
  }
  
  getActionDensity3D(t_slice: number): Float32Array {
    const density = new Float32Array(this.nx * this.ny * this.nz);
    for (let x = 0; x < this.nx; x++) {
      for (let y = 0; y < this.ny; y++) {
        for (let z = 0; z < this.nz; z++) {
          let sum = 0;
          const pos = [x, y, z, t_slice];
          // Sum over spatial plaquettes
          for (let mu = 0; mu < 2; mu++) {
            for (let nu = mu + 1; nu < 3; nu++) {
              let pos_mu = [...pos]; pos_mu[mu] = (pos_mu[mu] + 1) % (mu === 0 ? this.nx : (mu === 1 ? this.ny : this.nz));
              let pos_nu = [...pos]; pos_nu[nu] = (pos_nu[nu] + 1) % (nu === 0 ? this.nx : (nu === 1 ? this.ny : this.nz));

              const u1 = this.idx(mu, pos[0], pos[1], pos[2], pos[3]);
              const u2 = this.idx(nu, pos_mu[0], pos_mu[1], pos_mu[2], pos_mu[3]);
              const u3 = this.idx(mu, pos_nu[0], pos_nu[1], pos_nu[2], pos_nu[3]);
              const u4 = this.idx(nu, pos[0], pos[1], pos[2], pos[3]);

              const p1 = this.mulSU2(this.links, this.links, u1, u2);
              const p2 = this.mulSU2(p1, this.invSU2(this.links, u3));
              const p3 = this.mulSU2(p2, this.invSU2(this.links, u4));

              sum += (1.0 - p3[0]); // Action density ~ 1 - ReTr(U)/2
            }
          }
          density[x * this.ny * this.nz + y * this.nz + z] = sum;
        }
      }
    }
    return density;
  }
  
  run(numSweeps: number) {
    const history = [];
    for (let i = 0; i < numSweeps; i++) {
      this.step();
      if (i % 2 === 0) {
        history.push({
          sweep: i,
          plaquette: this.calculatePlaquette()
        });
      }
    }
    return {
      history,
      full_field: this.getActionDensity3D(0),
      grid_size: [this.nx, this.ny, this.nz]
    };
  }
}

export function simulateQCD(initialConditions: any, gridSize: [number, number, number, number] = [4, 4, 4, 4], numSweeps = 20) {
  // Reduced default grid size and sweeps for real-time performance
  const solver = new QCDSolver(gridSize, initialConditions.beta || 2.5);
  return solver.run(numSweeps);
}
