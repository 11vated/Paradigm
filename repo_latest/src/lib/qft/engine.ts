import { simulateEMField } from './em_solver.js';
import { simulateDiracField } from './dirac_solver.js';
import { simulateQED } from './qed_coupling.js';
import { simulateQCD, qcdRngFromHash } from './qcd_solver.js';
import { simulateGravity } from './gravity_solver.js';
import crypto from 'crypto';

export class QFTEngine {
  static engineName = "QFT-000";
  static version = "1.0.0";
  static capabilities = ["maxwell_solver", "dirac_solver", "qed_coupling", "qcd_solver", "gravity_solver", "field_visualization", "em_evolution", "dirac_evolution"];
  
  static async execute(inputSeeds: any[], parameters: any, jobId: string): Promise<any> {
    if (!inputSeeds || inputSeeds.length === 0) {
      throw new Error("QFT engine requires at least one input seed");
    }
    
    const seed = inputSeeds[0];
    const params = { ...(seed.parameters || {}), ...(parameters || {}) };
    const fieldType = (params.field_type || "EM").toUpperCase();
    
    if (fieldType === "EM") {
      return await this._runMaxwell(seed, params, jobId);
    } else if (fieldType === "DIRAC") {
      return await this._runDirac(seed, params, jobId);
    } else if (fieldType === "QED") {
      return await this._runQED(seed, params, jobId);
    } else if (fieldType === "QCD") {
      return await this._runQCD(seed, params, jobId);
    } else if (fieldType === "GRAVITY") {
      return await this._runGravity(seed, params, jobId);
    } else if (fieldType === "ALGORITHM") {
      return await this._runAlgorithm(seed, params, jobId);
    } else if (fieldType === "TOPOLOGY") {
      return await this._runTopology(seed, params, jobId);
    } else {
      throw new Error(`Unsupported field_type: ${fieldType}`);
    }
  }
  
  static async _runMaxwell(seed: any, params: any, jobId: string): Promise<any> {
    const gridSize = params.grid_size || [64, 64, 64];
    const numSteps = params.num_steps || 200;
    
    // In a real system, this would run in a worker thread.
    const snapshots = simulateEMField(params.initial_conditions || {}, gridSize, numSteps);
    
    // To avoid massive payloads, we only send back the final snapshot's energy density slice
    const finalSnap = snapshots[snapshots.length - 1];
    const midZ = Math.floor(gridSize[2] / 2);
    
    const energySlice = new Float32Array(gridSize[0] * gridSize[1]);
    for (let i = 0; i < gridSize[0]; i++) {
      for (let j = 0; j < gridSize[1]; j++) {
        const idx = i * gridSize[1] * gridSize[2] + j * gridSize[2] + midZ;
        const snapAny = finalSnap as any;
        const e = snapAny.em ? (snapAny.em.Ex[idx]**2 + snapAny.em.Ey[idx]**2 + snapAny.em.Ez[idx]**2 +
                  snapAny.em.Hx[idx]**2 + snapAny.em.Hy[idx]**2 + snapAny.em.Hz[idx]**2) : 
                  (snapAny.Ex[idx]**2 + snapAny.Ey[idx]**2 + snapAny.Ez[idx]**2 +
                  snapAny.Hx[idx]**2 + snapAny.Hy[idx]**2 + snapAny.Hz[idx]**2);
        energySlice[i * gridSize[1] + j] = e;
      }
    }
    
    // Create a new seed representing the evolved field
    const outputSeed = {
      id: crypto.randomUUID(),
      type: "field_evolution",
      field_type: "EM",
      grid_size: gridSize,
      num_steps: numSteps,
      created_at: new Date().toISOString(),
      parent_seeds: [seed.id],
      genes: seed.genes || {},
      $domain: "field",
      $name: `${seed.$name || 'Seed'} (Evolved EM)`,
      $hash: crypto.createHash('sha256').update(seed.id + "EM").digest('hex'),
      $lineage: { generation: (seed.$lineage?.generation || 0) + 1, operation: 'qft_evolve' }
    };
    
    const result: any = {
      status: "completed",
      result_seed: outputSeed,
      preview_slice: Array.from(energySlice), // Send the 2D slice for preview
      message: `EM field evolved for ${numSteps} steps on ${gridSize} grid.`
    };
    
    if (params.return_full_field) {
      // Calculate full 3D energy density
      const snapAny = finalSnap as any;
      const fullField = new Float32Array(gridSize[0] * gridSize[1] * gridSize[2]);
      for (let i = 0; i < fullField.length; i++) {
        fullField[i] = snapAny.em ? (snapAny.em.Ex[i]**2 + snapAny.em.Ey[i]**2 + snapAny.em.Ez[i]**2 +
                       snapAny.em.Hx[i]**2 + snapAny.em.Hy[i]**2 + snapAny.em.Hz[i]**2) :
                       (snapAny.Ex[i]**2 + snapAny.Ey[i]**2 + snapAny.Ez[i]**2 +
                       snapAny.Hx[i]**2 + snapAny.Hy[i]**2 + snapAny.Hz[i]**2);
      }
      result.full_field = fullField;
    }
    
    return result;
  }

  static async _runDirac(seed: any, params: any, jobId: string): Promise<any> {
    const gridSize = params.grid_size || [64, 64, 64];
    const numSteps = params.num_steps || 200;
    
    const snapshots = simulateDiracField(params.initial_conditions || {}, gridSize, numSteps);
    
    // Send back the final snapshot's probability density slice
    const finalSnap = snapshots[snapshots.length - 1];
    const midZ = Math.floor(gridSize[2] / 2);
    
    const densitySlice = new Float32Array(gridSize[0] * gridSize[1]);
    for (let i = 0; i < gridSize[0]; i++) {
      for (let j = 0; j < gridSize[1]; j++) {
        const idx = i * gridSize[1] * gridSize[2] + j * gridSize[2] + midZ;
        densitySlice[i * gridSize[1] + j] = finalSnap.probabilityDensity[idx];
      }
    }
    
    const outputSeed = {
      id: crypto.randomUUID(),
      type: "field_evolution",
      field_type: "DIRAC",
      grid_size: gridSize,
      num_steps: numSteps,
      created_at: new Date().toISOString(),
      parent_seeds: [seed.id],
      genes: seed.genes || {},
      $domain: "field",
      $name: `${seed.$name || 'Seed'} (Evolved Dirac)`,
      $hash: crypto.createHash('sha256').update(seed.id + "DIRAC").digest('hex'),
      $lineage: { generation: (seed.$lineage?.generation || 0) + 1, operation: 'qft_evolve' }
    };
    
    const result: any = {
      status: "completed",
      result_seed: outputSeed,
      preview_slice: Array.from(densitySlice),
      message: `Dirac field evolved for ${numSteps} steps on ${gridSize} grid.`
    };
    
    if (params.return_full_field) {
      result.full_field = finalSnap.probabilityDensity;
    }
    
    return result;
  }

  static async _runQED(seed: any, params: any, jobId: string): Promise<any> {
    const gridSize = params.grid_size || [64, 64, 64];
    const numSteps = params.num_steps || 200;
    
    const snapshots = simulateQED(params.initial_conditions || {}, gridSize, numSteps);
    
    const finalSnap = snapshots[snapshots.length - 1];
    const midZ = Math.floor(gridSize[2] / 2);
    
    const combinedSlice = new Float32Array(gridSize[0] * gridSize[1]);
    for (let i = 0; i < gridSize[0]; i++) {
      for (let j = 0; j < gridSize[1]; j++) {
        const idx = i * gridSize[1] * gridSize[2] + j * gridSize[2] + midZ;
        // Combine EM energy and Dirac probability for preview
        const e = finalSnap.em.Ex[idx]**2 + finalSnap.em.Ey[idx]**2 + finalSnap.em.Ez[idx]**2;
        const prob = finalSnap.dirac.probabilityDensity[idx];
        combinedSlice[i * gridSize[1] + j] = e + prob * 100; // Scale prob for visibility
      }
    }
    
    const outputSeed = {
      id: crypto.randomUUID(),
      type: "field_evolution",
      field_type: "QED",
      grid_size: gridSize,
      num_steps: numSteps,
      created_at: new Date().toISOString(),
      parent_seeds: [seed.id],
      genes: seed.genes || {},
      $domain: "field",
      $name: `${seed.$name || 'Seed'} (Evolved QED)`,
      $hash: crypto.createHash('sha256').update(seed.id + "QED").digest('hex'),
      $lineage: { generation: (seed.$lineage?.generation || 0) + 1, operation: 'qft_evolve' }
    };
    
    const result: any = {
      status: "completed",
      result_seed: outputSeed,
      preview_slice: Array.from(combinedSlice),
      message: `QED coupled field evolved for ${numSteps} steps on ${gridSize} grid.`
    };
    
    if (params.return_full_field) {
      const fullField = new Float32Array(gridSize[0] * gridSize[1] * gridSize[2]);
      let hasNaN = false;
      for (let i = 0; i < fullField.length; i++) {
        const e = finalSnap.em.Ex[i]**2 + finalSnap.em.Ey[i]**2 + finalSnap.em.Ez[i]**2;
        const prob = finalSnap.dirac.probabilityDensity[i];
        fullField[i] = e + prob * 100;
        if (isNaN(fullField[i])) hasNaN = true;
      }
      if (hasNaN) console.log("NaN detected in _runQED fullField!");
      result.full_field = fullField;
    }
    
    return result;
  }

  static async _runQCD(seed: any, params: any, jobId: string): Promise<any> {
    const gridSize = params.grid_size || [8, 8, 8, 8];
    const numSweeps = params.num_steps || 100;
    
    // Phase 0 / G-05: the QCD solver is now deterministic per seed. We key
    // the RNG stream off the input seed's $hash so repeated QCD runs on the
    // same seed are byte-identical.
    const qcdRng = seed.$hash ? qcdRngFromHash(String(seed.$hash), 'qcd') : undefined;
    const result = simulateQCD(params.initial_conditions || {}, gridSize, numSweeps, qcdRng);
    
    const outputSeed = {
      id: crypto.randomUUID(),
      type: "field_evolution",
      field_type: "QCD",
      grid_size: gridSize,
      num_steps: numSweeps,
      created_at: new Date().toISOString(),
      parent_seeds: [seed.id],
      genes: seed.genes || {},
      $domain: "field",
      $name: `${seed.$name || 'Seed'} (Evolved QCD)`,
      $hash: crypto.createHash('sha256').update(seed.id + "QCD").digest('hex'),
      $lineage: { generation: (seed.$lineage?.generation || 0) + 1, operation: 'qft_evolve' }
    };
    
    return {
      status: "completed",
      result_seed: outputSeed,
      preview_data: result.history,
      full_field: result.full_field,
      grid_size: result.grid_size,
      message: `QCD lattice gauge evolved for ${numSweeps} sweeps on ${gridSize} grid.`
    };
  }

  static async _runGravity(seed: any, params: any, jobId: string): Promise<any> {
    const gridSize = params.grid_size || [64, 64, 64];
    const numSteps = params.num_steps || 200;
    
    const snapshots = simulateGravity(params.initial_conditions || {}, gridSize, numSteps);
    
    const finalSnap = snapshots[snapshots.length - 1];
    const midZ = Math.floor(gridSize[2] / 2);
    
    const strainSlice = new Float32Array(gridSize[0] * gridSize[1]);
    for (let i = 0; i < gridSize[0]; i++) {
      for (let j = 0; j < gridSize[1]; j++) {
        const idx = i * gridSize[1] * gridSize[2] + j * gridSize[2] + midZ;
        // Simple scalar representation of strain for preview
        strainSlice[i * gridSize[1] + j] = finalSnap.h_xx[idx] + finalSnap.h_yy[idx];
      }
    }
    
    const outputSeed = {
      id: crypto.randomUUID(),
      type: "field_evolution",
      field_type: "GRAVITY",
      grid_size: gridSize,
      num_steps: numSteps,
      created_at: new Date().toISOString(),
      parent_seeds: [seed.id],
      genes: seed.genes || {},
      $domain: "field",
      $name: `${seed.$name || 'Seed'} (Evolved Gravity)`,
      $hash: crypto.createHash('sha256').update(seed.id + "GRAVITY").digest('hex'),
      $lineage: { generation: (seed.$lineage?.generation || 0) + 1, operation: 'qft_evolve' }
    };
    
    const result: any = {
      status: "completed",
      result_seed: outputSeed,
      preview_slice: Array.from(strainSlice),
      message: `Gravitational field evolved for ${numSteps} steps on ${gridSize} grid.`
    };
    
    if (params.return_full_field) {
      const fullField = new Float32Array(gridSize[0] * gridSize[1] * gridSize[2]);
      for (let i = 0; i < fullField.length; i++) {
        fullField[i] = finalSnap.h_xx[i] + finalSnap.h_yy[i];
      }
      result.full_field = fullField;
    }
    
    return result;
  }

  static async _runAlgorithm(seed: any, params: any, jobId: string): Promise<any> {
    const gridSize = params.grid_size || [32, 32, 32];
    const nX = gridSize[0], nY = gridSize[1], nZ = gridSize[2];
    const fullField = new Float32Array(nX * nY * nZ);
    const algName = (seed.$name || "").toLowerCase();

    // Generate terrain/surface representations based on algorithm name
    for (let x = 0; x < nX; x++) {
      for (let y = 0; y < nY; y++) {
        let height = 0;
        const u = x / nX;
        const v = y / nY;

        if (algName.includes("diamond_square") || algName.includes("heightmap")) {
          // Rough, fractaline landscape approximation
          height = 0.3 + 0.3 * Math.sin(u * Math.PI * 4) * Math.cos(v * Math.PI * 4);
          height += 0.15 * Math.sin(u * Math.PI * 8 + 1) * Math.cos(v * Math.PI * 9);
          height += 0.05 * Math.sin(u * Math.PI * 18) * Math.cos(v * Math.PI * 22);
        } else if (algName.includes("worley") || algName.includes("cellular")) {
          // Voronoi/cellular style structure
          const px = (u * 4) % 1, py = (v * 4) % 1;
          const dist1 = Math.sqrt(Math.pow(px - 0.2, 2) + Math.pow(py - 0.2, 2));
          const dist2 = Math.sqrt(Math.pow(px - 0.8, 2) + Math.pow(py - 0.7, 2));
          height = Math.min(dist1, dist2) * 1.5;
        } else if (algName.includes("perlin") || algName.includes("simplex")) {
          // Smooth noise heightmap
          height = 0.5 + 0.3 * Math.sin(u * Math.PI * 2 + v * Math.PI * 2);
          height += 0.2 * Math.cos(u * Math.PI * 4 - v * Math.PI * 4);
        } else if (algName.includes("wave_function")) {
          // Blocky, stepped heightmap
          const hMap = Math.floor((u + v) * 5) % 3;
          height = hMap * 0.3 + 0.2;
        } else {
          // Default algorithmic structure (concentric ridges)
          const dist = Math.sqrt(Math.pow(u - 0.5, 2) + Math.pow(v - 0.5, 2));
          height = 0.5 + 0.3 * Math.cos(dist * Math.PI * 10);
        }

        // Fill below height with solid density, dropping off sharply above it
        const cutoffZ = Math.floor(height * nZ);
        for (let z = 0; z < nZ; z++) {
          const idx = x * nY * nZ + y * nZ + z;
          if (z < cutoffZ) {
            fullField[idx] = 1.0;
          } else {
            // Smooth gradient dropoff for marching cubes to pick up isosurfaces predictably
            fullField[idx] = Math.max(0, 1.0 - (z - cutoffZ) / 3.0);
          }
        }
      }
    }

    // Capture 2D Slice
    const previewSlice = new Float32Array(nX * nY);
    const midZ = Math.floor(nZ / 2);
    for (let x = 0; x < nX; x++) {
      for (let y = 0; y < nY; y++) {
        previewSlice[x * nY + y] = fullField[x * nY * nZ + y * nZ + midZ];
      }
    }

    const outputSeed = {
      id: crypto.randomUUID(),
      type: "algorithmic_evaluation",
      field_type: "ALGORITHM",
      grid_size: gridSize,
      created_at: new Date().toISOString(),
      parent_seeds: [seed.id],
      genes: seed.genes || {},
      $domain: "algorithm",
      $name: `${seed.$name || 'Algorithm'} (Voxelized)`,
      $hash: crypto.createHash('sha256').update(seed.id + "ALGO").digest('hex'),
      $lineage: { generation: (seed.$lineage?.generation || 0) + 1, operation: 'evaluate' }
    };

    const result: any = {
      status: "completed",
      result_seed: outputSeed,
      preview_slice: Array.from(previewSlice),
      message: `Algorithmic topology mapped to ${gridSize} lattice.`
    };
    
    if (params.return_full_field) {
      result.full_field = fullField;
    }
    return result;
  }

  static async _runTopology(seed: any, params: any, jobId: string): Promise<any> {
    const gridSize = params.grid_size || [32, 32, 32];
    const nX = gridSize[0], nY = gridSize[1], nZ = gridSize[2];
    const fullField = new Float32Array(nX * nY * nZ);
    const domain = (seed.$domain || "").toLowerCase();
    
    // Geometric shape generator logic
    for (let x = 0; x < nX; x++) {
      for (let y = 0; y < nY; y++) {
        for (let z = 0; z < nZ; z++) {
          const idx = x * nY * nZ + y * nZ + z;
          
          // Normalized coordinates (-1 to 1)
          const nx = (x / nX) * 2 - 1;
          const ny = (y / nY) * 2 - 1;
          const nz = (z / nZ) * 2 - 1;
          
          let density = 0.0;
          
          if (domain === "character") {
            // Torso (cylinder) + Head (sphere) approximation
            const r2 = nx*nx + nz*nz;
            if (ny < 0.2 && ny > -0.6 && r2 < 0.2) density = 1.0; // Torso
            else if (ny >= 0.2 && Math.pow(nx, 2) + Math.pow(ny - 0.5, 2) + Math.pow(nz, 2) < 0.15) density = 1.0; // Head
            else if (ny < 0.2 && ny > -0.2 && Math.pow(Math.abs(nx) - 0.5, 2) + nz*nz < 0.05) density = 1.0; // Arms
            else if (ny <= -0.6 && Math.pow(Math.abs(nx) - 0.2, 2) + nz*nz < 0.08) density = 1.0; // Legs
          } else if (domain === "building" || domain === "architecture") {
            // Rectangular prism tower + optional spire logic
            const baseW = 0.4;
            const baseD = 0.4;
            if (Math.abs(nx) < baseW && Math.abs(nz) < baseD && ny < 0.6) {
              density = 1.0;
            } else if (ny >= 0.6) {
              // Pyramid/spire top
              const shrink = (1.0 - ny) / 0.4; // 1 at 0.6, 0 at 1.0
              if (shrink > 0 && Math.abs(nx) < baseW * shrink && Math.abs(nz) < baseD * shrink) {
                density = 1.0;
              }
            }
          } else if (domain === "vehicle") {
            // Basic chassis + wheels
            if (Math.abs(nx) < 0.4 && Math.abs(nz) < 0.8 && ny > -0.2 && ny < 0.3) {
              density = 1.0; // Chassis
            } else if (ny > 0.3 && Math.abs(nx) < 0.3 && Math.abs(nz) < 0.4 && nz > -0.2) {
              density = 1.0; // Cabin
            } else if (ny < -0.2 && (Math.abs(nz - 0.5) < 0.2 || Math.abs(nz + 0.5) < 0.2) && Math.abs(nx) > 0.3) {
              density = 1.0; // Wheels
            }
          } else if (domain === "furniture") {
            // Basic Chair/Table geometry
            if (Math.abs(nx) < 0.5 && Math.abs(nz) < 0.5 && ny > -0.1 && ny < 0.1) {
              density = 1.0; // Seat/Tabletop
            } else if (ny > 0.1 && Math.abs(nx) < 0.5 && nz < -0.4 && nz > -0.6) {
              density = 1.0; // Backrest
            } else if (ny < -0.1 && Math.abs(nx) > 0.4 && Math.abs(nz) > 0.4) {
              density = 1.0; // Legs
            }
          } else if (domain === "geometry3d") {
            const prim = seed.genes?.primitive?.value || "sphere";
            if (prim === "cube" || prim === "box") {
              if (Math.abs(nx) < 0.6 && Math.abs(ny) < 0.6 && Math.abs(nz) < 0.6) density = 1.0;
            } else if (prim === "torus") {
              const r_main = Math.sqrt(nx*nx + nz*nz) - 0.5;
              if (r_main*r_main + ny*ny < 0.04) density = 1.0;
            } else {
              // Default sphere
              if (nx*nx + ny*ny + nz*nz < 0.5) density = 1.0;
            }
          } else {
            // Default "Topology" fallback (capsule/pill shape)
            const r2 = nx*nx + nz*nz;
            if (Math.abs(ny) < 0.5) {
               if (r2 < 0.25) density = 1.0;
            } else if (ny >= 0.5) {
               if (r2 + Math.pow(ny - 0.5, 2) < 0.25) density = 1.0;
            } else {
               if (r2 + Math.pow(ny + 0.5, 2) < 0.25) density = 1.0;
            }
          }
          
          // Apply a tiny bit of noise based on complexity for organic domains
          if (["character", "organic", "creature"].includes(domain) && density > 0.5) {
            const noise = (Math.sin(nx * 10) * Math.cos(ny * 10) * Math.sin(nz * 10)) * 0.1;
            density += noise;
          }
          
          fullField[idx] = Math.max(0, Math.min(1.0, density));
        }
      }
    }

    // Capture 2D Slice
    const previewSlice = new Float32Array(nX * nY);
    const midZ = Math.floor(nZ / 2);
    for (let x = 0; x < nX; x++) {
      for (let y = 0; y < nY; y++) {
        previewSlice[x * nY + y] = fullField[x * nY * nZ + y * nZ + midZ];
      }
    }

    const outputSeed = {
      id: crypto.randomUUID(),
      type: "topology_evaluation",
      field_type: "TOPOLOGY",
      grid_size: gridSize,
      created_at: new Date().toISOString(),
      parent_seeds: [seed.id],
      genes: seed.genes || {},
      $domain: domain,
      $name: `${seed.$name || 'Topology'} (Solid)`,
      $hash: crypto.createHash('sha256').update(seed.id + "TOPO").digest('hex'),
      $lineage: { generation: (seed.$lineage?.generation || 0) + 1, operation: 'evaluate' }
    };

    const result: any = {
      status: "completed",
      result_seed: outputSeed,
      preview_slice: Array.from(previewSlice),
      message: `Geometric topology generated for ${domain} on ${gridSize} lattice.`
    };
    
    if (params.return_full_field) {
      result.full_field = fullField;
    }
    return result;
  }
}
