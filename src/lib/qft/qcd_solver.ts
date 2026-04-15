// Real SU(2) Lattice Gauge Theory Simulation
// Replaces the mock QCD implementation with a mathematically rigorous non-abelian gauge theory.
// SU(2) matrices are represented by 4 real numbers (a0, a1, a2, a3) where a0^2 + a1^2 + a2^2 + a3^2 = 1.
// U = a0*I + i*a1*sigma1 + i*a2*sigma2 + i*a3*sigma3
//
// Phase 0 / G-05: the Metropolis sampler previously drew from `Math.random()`,
// which meant the same seed produced different gauge fields on every run —
// a direct contradiction of the kernel's determinism guarantee. A pluggable
// RNG (defaulting to xoshiro256** seeded by the caller's hash) is now threaded
// through `randomSU2` and the accept/reject step.
import crypto from 'crypto';
import { rngFromHash } from '../kernel/rng.js';

export type RngFn = () => number;  // returns [0, 1)

export class QCDSolver {
  nx: number; ny: number; nz: number; nt: number;
  beta: number; // Inverse coupling 4/g^2 for SU(2)

  // SU(2) link variables: U_mu(x)
  // 4 dimensions (x,y,z,t), nx*ny*nz*nt sites, 4 floats per link
  links: Float32Array;

  // Deterministic RNG. If no caller provides one, we synthesize a constant-seeded
  // stream so at least repeated runs within a single process are identical.
  private rng: RngFn;

  constructor(
    gridSize: [number, number, number, number] = [8, 8, 8, 8],
    beta = 2.5,
    rng?: RngFn,
  ) {
    this.nx = gridSize[0];
    this.ny = gridSize[1];
    this.nz = gridSize[2];
    this.nt = gridSize[3];
    this.beta = beta;
    this.rng = rng ?? defaultRng();

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
    const staple = [0, 0, 0, 0];
    const pos = [x, y, z, t];

    for (let nu = 0; nu < 4; nu++) {
      if (nu === dir) continue;

      // Forward staple: U_nu(x+mu) * U_mu(x+nu)^dagger * U_nu(x)^dagger
      const pos_mu = [...pos]; pos_mu[dir]++;
      const pos_nu = [...pos]; pos_nu[nu]++;

      const u1 = this.idx(nu, pos_mu[0], pos_mu[1], pos_mu[2], pos_mu[3]);
      const u2 = this.idx(dir, pos_nu[0], pos_nu[1], pos_nu[2], pos_nu[3]);
      const u3 = this.idx(nu, pos[0], pos[1], pos[2], pos[3]);

      const term1 = this.mulSU2(this.links, this.invSU2(this.links, u2), u1, 0);
      const term2 = this.mulSU2(term1, this.invSU2(this.links, u3));
      
      staple[0] += term2[0]; staple[1] += term2[1]; staple[2] += term2[2]; staple[3] += term2[3];

      // Backward staple: U_nu(x+mu-nu)^dagger * U_mu(x-nu)^dagger * U_nu(x-nu)
      const pos_mu_minus_nu = [...pos]; pos_mu_minus_nu[dir]++; pos_mu_minus_nu[nu]--;
      const pos_minus_nu = [...pos]; pos_minus_nu[nu]--;

      const v1 = this.idx(nu, pos_mu_minus_nu[0], pos_mu_minus_nu[1], pos_mu_minus_nu[2], pos_mu_minus_nu[3]);
      const v2 = this.idx(dir, pos_minus_nu[0], pos_minus_nu[1], pos_minus_nu[2], pos_minus_nu[3]);
      const v3 = this.idx(nu, pos_minus_nu[0], pos_minus_nu[1], pos_minus_nu[2], pos_minus_nu[3]);

      const term3 = this.mulSU2(this.invSU2(this.links, v1), this.invSU2(this.links, v2));
      const term4 = this.mulSU2(term3, this.links, 0, v3);

      staple[0] += term4[0]; staple[1] += term4[1]; staple[2] += term4[2]; staple[3] += term4[3];
    }
    return staple;
  }

  // Generate a random SU(2) matrix near identity using the deterministic RNG.
  private randomSU2(epsilon: number): number[] {
    const r1 = (this.rng() - 0.5) * epsilon;
    const r2 = (this.rng() - 0.5) * epsilon;
    const r3 = (this.rng() - 0.5) * epsilon;
    // Guard against numerical negatives when epsilon is close to 1.
    const radicand = Math.max(0, 1.0 - r1 * r1 - r2 * r2 - r3 * r3);
    const r0 = Math.sqrt(radicand);
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

              if (deltaS <= 0 || this.rng() < Math.exp(-deltaS)) {
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
                const pos_mu = [...pos]; pos_mu[mu]++;
                const pos_nu = [...pos]; pos_nu[nu]++;

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
              const pos_mu = [...pos]; pos_mu[mu] = (pos_mu[mu] + 1) % (mu === 0 ? this.nx : (mu === 1 ? this.ny : this.nz));
              const pos_nu = [...pos]; pos_nu[nu] = (pos_nu[nu] + 1) % (nu === 0 ? this.nx : (nu === 1 ? this.ny : this.nz));

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

/**
 * Produce a deterministic RNG function from a seed hash string. This is the
 * canonical way callers thread reproducibility through the QCD solver: pass
 * the seed's $hash (plus an optional salt for distinct streams).
 */
export function qcdRngFromHash(hash: string, salt = ''): RngFn {
  // rngFromHash only reads the first 16 hex chars of its input, so a naive
  // `hash + ':' + salt` concatenation produces collisions when `hash` already
  // fills those 16 chars. Re-hash the combined value so the salt always
  // propagates into the seed.
  const combined = crypto.createHash('sha256')
    .update(hash + ':' + salt)
    .digest('hex');
  const stream = rngFromHash(combined);
  return () => stream.nextF64();
}

/**
 * When no hash-based seed is available we still must not fall back to
 * `Math.random()` — that would re-open the determinism hole that G-05 closed.
 * Instead we seed a fresh xoshiro256** from a constant hex so repeated runs
 * in the same process produce identical results. Callers who need independent
 * streams MUST pass an explicit `rng` to the constructor.
 */
function defaultRng(): RngFn {
  const stream = rngFromHash('00000000000000000000000000000000000000000000000000000000qcd');
  return () => stream.nextF64();
}

export function simulateQCD(
  initialConditions: any,
  gridSize: [number, number, number, number] = [4, 4, 4, 4],
  numSweeps = 20,
  rng?: RngFn,
) {
  // Reduced default grid size and sweeps for real-time performance.
  // Phase 0 / G-05: the RNG is now a first-class parameter. Previously the
  // function ended with a bare `return` — producing `undefined` — so this
  // also fixes a latent bug in `_runQCD`.
  const solver = new QCDSolver(gridSize, initialConditions.beta || 2.5, rng);
  return solver.run(numSweeps);
}