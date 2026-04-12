import { GSPLCompiler } from '../gspl/compiler.js';
import { QFTEngine } from '../qft/engine.js';
import { MeshExtractor, TextureBaker, AnimationExtractor } from '../asset_pipeline/index.js';
import crypto from 'crypto';

export class ParadigmPipeline {
  /**
   * Executes the full Paradigm Absolute pipeline:
   * 1. GSPL Intent -> 2. QFT Compiler -> 3. Quantum Simulation -> 4. Asset Emergence
   */
  static async runEndToEnd(seed: any): Promise<any> {
    console.log(`[Pipeline] Initiating Absolute Pipeline for Seed: ${seed.$name || seed.id}`);
    
    // Phase 1 & 2: Compile GSPL to QFT Boundary Conditions
    const qftParams = GSPLCompiler.compileToQFT(seed);
    console.log(`[Pipeline] Compiled to QFT Parameters: Field=${qftParams.field_type}`);
    
    // Phase 3: Quantum Field Simulation
    const jobId = crypto.randomUUID();
    // We pass a flag to request the full 3D field data for the asset pipeline
    const simParams = { ...qftParams, return_full_field: true };
    const qftResult = await QFTEngine.execute([seed], simParams, jobId);
    console.log(`[Pipeline] QFT Simulation Complete. Status: ${qftResult.status}`);
    
    // Phase 4: Asset Emergence (Collapse waveform to digital matter)
    const assets: any = {};
    
    if (qftResult.full_field && (qftResult.grid_size || qftParams.grid_size).length === 3) {
      console.log(`[Pipeline] Extracting Isosurface Mesh...`);
      
      const actualGridSize = qftResult.grid_size || qftParams.grid_size;
      
      // Normalize the field to [0, 1] so the threshold works regardless of field intensity
      const field = qftResult.full_field;
      let maxVal = 0;
      let hasNaN = false;
      for (let i = 0; i < field.length; i++) {
        if (isNaN(field[i])) hasNaN = true;
        if (field[i] > maxVal) maxVal = field[i];
      }
      console.log(`[Pipeline] Field maxVal: ${maxVal}, hasNaN: ${hasNaN}`);
      if (maxVal > 0) {
        for (let i = 0; i < field.length; i++) {
          field[i] /= maxVal;
        }
      }
      
      // Extract 3D Mesh using Marching Cubes on the probability/energy density
      const threshold = 0.05; // Density threshold for matter boundary
      const meshData = MeshExtractor.extractIsosurface(
        field, 
        actualGridSize as [number, number, number], 
        threshold
      );
      
      console.log(`[Pipeline] Mesh Extracted: ${meshData.vertices.length / 3} vertices.`);
      
      // Bake pseudo-PBR colors based on field intensity gradients
      const coloredMesh = TextureBaker.bakeVertexColors(
        meshData, 
        field, 
        actualGridSize as [number, number, number],
        (val: number) => {
          // Map density to a heat map (blue -> red)
          const r = Math.min(1.0, val * 5);
          const g = Math.min(1.0, Math.max(0, val * 5 - 0.5));
          const b = Math.max(0, 1.0 - val * 2);
          return [r, g, b];
        }
      );
      
      // Convert Float32Arrays to standard arrays for JSON serialization
      assets.mesh = {
        vertices: Array.from(coloredMesh.vertices),
        indices: Array.from(coloredMesh.indices),
        normals: Array.from(coloredMesh.normals),
        colors: coloredMesh.colors ? Array.from(coloredMesh.colors) : undefined
      };
    } else {
      console.log(`[Pipeline] Skipping mesh extraction (No 3D field data returned or 4D lattice used).`);
    }
    
    // Return the Unified Seed and its emergent assets
    return {
      unified_seed: qftResult.result_seed,
      physics_summary: qftResult.message,
      preview_slice: qftResult.preview_slice,
      emergent_assets: assets
    };
  }
}
