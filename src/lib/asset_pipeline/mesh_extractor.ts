import { marchingCubes, type MarchingCubesOptions } from './marching_cubes.js';

export interface MeshData {
  vertices: Float32Array;
  indices: Uint32Array;
  normals: Float32Array;
  colors?: Float32Array;
}

/**
 * Transpose a field from "x-major" layout — `x*ny*nz + y*nz + z`, used by
 * the blocky `extractIsosurface` and the QFT solvers — into MC's layout
 * `x + y*nx + z*nx*ny`.
 *
 * Exported so the QFT pipeline (and tests) can adapt legacy fields in one
 * hop without reaching into MC internals.
 */
export function transposeFieldToMarchingCubes(
  field: Float32Array,
  dims: [number, number, number],
): Float32Array {
  const [nx, ny, nz] = dims;
  if (field.length !== nx * ny * nz) {
    throw new Error(`transposeFieldToMarchingCubes: length ${field.length} ≠ ${nx}*${ny}*${nz}`);
  }
  const out = new Float32Array(field.length);
  for (let x = 0; x < nx; x++) {
    for (let y = 0; y < ny; y++) {
      for (let z = 0; z < nz; z++) {
        const src = x * ny * nz + y * nz + z;
        const dst = x + y * nx + z * nx * ny;
        out[dst] = field[src];
      }
    }
  }
  return out;
}

export class MeshExtractor {
  /**
   * Smooth isosurface via Marching Cubes (Phase 4).
   *
   * Field indexing here is `x + y*nx + z*nx*ny` (MC's own convention, see
   * `marching_cubes.ts`). This differs from the blocky `extractIsosurface`
   * below which uses `x*ny*nz + y*nz + z` — pass your field in the order the
   * extractor expects, or use `extractSmoothIsosurfaceFromXMajor` for the
   * convention the QFT pipeline uses.
   *
   * Use this for seed previews, glTF exports, and any render path where
   * smooth normals matter. `extractIsosurface` (blocky) stays around for A/B.
   */
  static extractSmoothIsosurface(
    field: Float32Array,
    dims: [number, number, number],
    options: MarchingCubesOptions = {},
  ): MeshData {
    return marchingCubes(field, dims, options);
  }

  /**
   * Smooth isosurface from the QFT/blocky indexing convention
   * (`x*ny*nz + y*nz + z`). Transposes into MC layout, then extracts.
   * Added for the /export/glb pipeline so it can swap blocky → smooth
   * without rewriting every upstream field producer.
   */
  static extractSmoothIsosurfaceFromXMajor(
    field: Float32Array,
    dims: [number, number, number],
    options: MarchingCubesOptions = {},
  ): MeshData {
    const transposed = transposeFieldToMarchingCubes(field, dims);
    return marchingCubes(transposed, dims, options);
  }

  // Simple voxel-based isosurface extraction for field density
  static extractIsosurface(field: Float32Array, dims: [number, number, number], threshold: number): MeshData {
    const [nx, ny, nz] = dims;
    const vertices: number[] = [];
    const indices: number[] = [];
    const normals: number[] = [];
    
    let vertexCount = 0;
    
    // Helper to add a quad
    const addQuad = (p1: number[], p2: number[], p3: number[], p4: number[], normal: number[]) => {
      vertices.push(...p1, ...p2, ...p3, ...p4);
      normals.push(...normal, ...normal, ...normal, ...normal);
      
      indices.push(vertexCount, vertexCount + 1, vertexCount + 2);
      indices.push(vertexCount, vertexCount + 2, vertexCount + 3);
      
      vertexCount += 4;
    };
    
    for (let x = 0; x < nx; x++) {
      for (let y = 0; y < ny; y++) {
        for (let z = 0; z < nz; z++) {
          const idx = x * ny * nz + y * nz + z;
          if (field[idx] >= threshold) {
            // Check 6 neighbors
            const left   = x > 0      ? field[(x-1) * ny * nz + y * nz + z] : 0;
            const right  = x < nx - 1 ? field[(x+1) * ny * nz + y * nz + z] : 0;
            const bottom = y > 0      ? field[x * ny * nz + (y-1) * nz + z] : 0;
            const top    = y < ny - 1 ? field[x * ny * nz + (y+1) * nz + z] : 0;
            const back   = z > 0      ? field[x * ny * nz + y * nz + (z-1)] : 0;
            const front  = z < nz - 1 ? field[x * ny * nz + y * nz + (z+1)] : 0;
            
            const px = x - nx/2;
            const py = y - ny/2;
            const pz = z - nz/2;
            const s = 0.5;
            
            if (left < threshold)   addQuad([px-s, py-s, pz+s], [px-s, py+s, pz+s], [px-s, py+s, pz-s], [px-s, py-s, pz-s], [-1, 0, 0]);
            if (right < threshold)  addQuad([px+s, py-s, pz-s], [px+s, py+s, pz-s], [px+s, py+s, pz+s], [px+s, py-s, pz+s], [1, 0, 0]);
            if (bottom < threshold) addQuad([px-s, py-s, pz-s], [px+s, py-s, pz-s], [px+s, py-s, pz+s], [px-s, py-s, pz+s], [0, -1, 0]);
            if (top < threshold)    addQuad([px-s, py+s, pz+s], [px+s, py+s, pz+s], [px+s, py+s, pz-s], [px-s, py+s, pz-s], [0, 1, 0]);
            if (back < threshold)   addQuad([px-s, py-s, pz-s], [px-s, py+s, pz-s], [px+s, py+s, pz-s], [px+s, py-s, pz-s], [0, 0, -1]);
            if (front < threshold)  addQuad([px+s, py-s, pz+s], [px+s, py+s, pz+s], [px-s, py+s, pz+s], [px-s, py-s, pz+s], [0, 0, 1]);
          }
        }
      }
    }
    
    return {
      vertices: new Float32Array(vertices),
      indices: new Uint32Array(indices),
      normals: new Float32Array(normals)
    };
  }
}
