import { simulateEMField } from './em_solver.js';
import { simulateDiracField } from './dirac_solver.js';
import { simulateQED } from './qed_coupling.js';
import { simulateQCD } from './qcd_solver.js';
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
        const e = finalSnap.Ex[idx]**2 + finalSnap.Ey[idx]**2 + finalSnap.Ez[idx]**2 +
                  finalSnap.Hx[idx]**2 + finalSnap.Hy[idx]**2 + finalSnap.Hz[idx]**2;
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
      const fullField = new Float32Array(gridSize[0] * gridSize[1] * gridSize[2]);
      for (let i = 0; i < fullField.length; i++) {
        fullField[i] = finalSnap.Ex[i]**2 + finalSnap.Ey[i]**2 + finalSnap.Ez[i]**2 +
                       finalSnap.Hx[i]**2 + finalSnap.Hy[i]**2 + finalSnap.Hz[i]**2;
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
    
    const result = simulateQCD(params.initial_conditions || {}, gridSize, numSweeps);
    
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
}
